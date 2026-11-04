"""Hindsight Experience Replay (HER) Buffer for Goal-Conditioned Robotic Manipulation.

Implements the 'future' HER sampling strategy (Andrychowicz et al., NeurIPS 2017)
to solve sparse-reward pick-and-place manipulation tasks efficiently.
"""

import random
from collections import deque
from typing import List, Dict, Any, Tuple
import numpy as np
import torch


class HindsightReplayBuffer:
    """Experience Replay Buffer with Hindsight Goal Relabeling."""

    def __init__(self, capacity: int = 50000, k_future: int = 4):
        self.capacity = capacity
        self.k_future = k_future
        self.buffer = deque(maxlen=capacity)

    def __len__(self) -> int:
        return len(self.buffer)

    def push(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool,
    ):
        """Store standard experience tuple."""
        self.buffer.append((state, action, reward, next_state, done))

    def store_episode_with_her(
        self,
        episode_transitions: List[Dict[str, Any]],
        reward_fn,
    ):
        """Store an entire episode trajectory and augment it with Hindsight Experience Replay.

        Args:
            episode_transitions: List of dicts with keys:
                'state', 'action', 'reward', 'next_state', 'done',
                'achieved_goal', 'desired_goal'
            reward_fn: Callable (achieved_pos, desired_pos) -> float
        """
        T = len(episode_transitions)
        if T == 0:
            return

        for t in range(T):
            trans = episode_transitions[t]
            # Store original transition
            self.push(
                trans["state"],
                trans["action"],
                trans["reward"],
                trans["next_state"],
                trans["done"],
            )

            # Sample k future achieved goals from same episode
            for _ in range(self.k_future):
                if t >= T - 1:
                    break
                future_idx = random.randint(t + 1, T - 1)
                future_goal = episode_transitions[future_idx]["achieved_goal"]

                # Relabel state with future goal coordinates (indices 10, 11)
                relabeled_state = trans["state"].copy()
                relabeled_next_state = trans["next_state"].copy()
                relabeled_state[10] = future_goal[0]
                relabeled_state[11] = future_goal[1]
                relabeled_next_state[10] = future_goal[0]
                relabeled_next_state[11] = future_goal[1]

                # Compute new reward under the retroactively achieved goal
                relabeled_reward = reward_fn(
                    trans["achieved_goal"], future_goal
                )
                relabeled_done = (future_idx == t + 1)

                self.push(
                    relabeled_state,
                    trans["action"],
                    relabeled_reward,
                    relabeled_next_state,
                    relabeled_done,
                )

    def sample(
        self, batch_size: int, device: torch.device
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        """Sample a batch of transitions as PyTorch Tensors."""
        batch = random.sample(self.buffer, batch_size)
        states, actions, rewards, next_states, dones = zip(*batch)

        return (
            torch.as_tensor(np.array(states), dtype=torch.float32, device=device),
            torch.as_tensor(np.array(actions), dtype=torch.long, device=device).unsqueeze(1),
            torch.as_tensor(np.array(rewards), dtype=torch.float32, device=device).unsqueeze(1),
            torch.as_tensor(np.array(next_states), dtype=torch.float32, device=device),
            torch.as_tensor(np.array(dones), dtype=torch.float32, device=device).unsqueeze(1),
        )
