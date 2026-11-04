"""Dueling Double-DQN Agent with Hindsight Experience Replay for Robotic Arm Control.

Implements:
- Polyak soft target network synchronization
- Epsilon-greedy exploration with exponential decay
- Full action Q-value extraction for telemetry monitoring
- Model checkpointing and evaluation modes
"""

import math
import random
from typing import Dict, Any, Tuple, Optional, List
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

from backend.models.d3qn import DuelingDQN
from backend.models.replay_buffer import HindsightReplayBuffer


class D3QNAgent:
    """Full-featured Dueling Double-DQN Agent with HER."""

    def __init__(
        self,
        state_dim: int = 15,
        action_dim: int = 7,
        lr: float = 5e-4,
        gamma: float = 0.98,
        tau: float = 0.005,
        buffer_capacity: int = 50000,
        batch_size: int = 64,
        epsilon_start: float = 1.0,
        epsilon_end: float = 0.05,
        epsilon_decay: float = 0.995,
        device: Optional[str] = None,
    ):
        self.state_dim = state_dim
        self.action_dim = action_dim
        self.gamma = gamma
        self.tau = tau
        self.batch_size = batch_size

        if device is None:
            self.device = torch.device("mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu"))
        else:
            self.device = torch.device(device)

        # Policy & Target Networks
        self.q_net = DuelingDQN(state_dim, action_dim).to(self.device)
        self.target_net = DuelingDQN(state_dim, action_dim).to(self.device)
        self.target_net.load_state_dict(self.q_net.state_dict())
        self.target_net.eval()

        self.optimizer = optim.Adam(self.q_net.parameters(), lr=lr)
        self.loss_fn = nn.SmoothL1Loss()  # Huber loss for gradient clipping stability

        self.replay_buffer = HindsightReplayBuffer(capacity=buffer_capacity, k_future=4)

        # Exploration parameters
        self.epsilon = epsilon_start
        self.epsilon_min = epsilon_end
        self.epsilon_decay = epsilon_decay

        # Training telemetry tracking
        self.total_steps = 0
        self.training_losses: List[float] = []

    def select_action(
        self, state_vector: np.ndarray, evaluate: bool = False
    ) -> Tuple[int, List[float]]:
        """Select action via epsilon-greedy policy and return Q-value distribution.

        Returns:
            (selected_action, list_of_q_values_for_all_actions)
        """
        state_tensor = torch.as_tensor(
            state_vector, dtype=torch.float32, device=self.device
        ).unsqueeze(0)

        with torch.no_grad():
            q_values = self.q_net(state_tensor).squeeze(0).cpu().numpy().tolist()

        if not evaluate and random.random() < self.epsilon:
            action = random.randrange(self.action_dim)
        else:
            action = int(np.argmax(q_values))

        return action, q_values

    def update(self) -> Optional[float]:
        """Perform one Double-DQN gradient descent step from the replay buffer."""
        if len(self.replay_buffer) < self.batch_size:
            return None

        states, actions, rewards, next_states, dones = self.replay_buffer.sample(
            self.batch_size, self.device
        )

        # Current Q-values: Q(s, a)
        q_eval = self.q_net(states).gather(1, actions)

        # Double DQN Target:
        # y = r + gamma * Q_target(s', argmax_a' Q_online(s', a'))
        with torch.no_grad():
            next_actions = self.q_net(next_states).max(1)[1].unsqueeze(1)
            next_q_targets = self.target_net(next_states).gather(1, next_actions)
            q_target = rewards + (1.0 - dones) * self.gamma * next_q_targets

        loss = self.loss_fn(q_eval, q_target)

        self.optimizer.zero_grad()
        loss.backward()
        # Gradient clipping for robust training
        torch.nn.utils.clip_grad_norm_(self.q_net.parameters(), max_norm=10.0)
        self.optimizer.step()

        # Polyak soft update of target network: theta_target = tau * theta_online + (1-tau) * theta_target
        for param, target_param in zip(self.q_net.parameters(), self.target_net.parameters()):
            target_param.data.copy_(
                self.tau * param.data + (1.0 - self.tau) * target_param.data
            )

        self.total_steps += 1
        loss_val = float(loss.item())
        self.training_losses.append(loss_val)
        return loss_val

    def decay_epsilon(self):
        """Decay exploration rate."""
        self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)

    def save_checkpoint(self, path: str):
        """Save model checkpoint."""
        torch.save(
            {
                "q_net": self.q_net.state_dict(),
                "target_net": self.target_net.state_dict(),
                "optimizer": self.optimizer.state_dict(),
                "epsilon": self.epsilon,
                "total_steps": self.total_steps,
            },
            path,
        )

    def load_checkpoint(self, path: str):
        """Load model checkpoint."""
        checkpoint = torch.load(path, map_location=self.device)
        self.q_net.load_state_dict(checkpoint["q_net"])
        self.target_net.load_state_dict(checkpoint["target_net"])
        self.optimizer.load_state_dict(checkpoint["optimizer"])
        self.epsilon = checkpoint.get("epsilon", self.epsilon_min)
        self.total_steps = checkpoint.get("total_steps", 0)
