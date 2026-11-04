"""Dueling Double Deep Q-Network (D3QN) for Robotic Arm Control.

Decouples the state-value function V(s) from the action-advantage function A(s, a)
to enhance policy stability and sample efficiency in multi-stage manipulation.
"""

from typing import Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F


class DuelingDQN(nn.Module):
    """Dueling Network Architecture with Advantage-Value Stream Decoupling."""

    def __init__(self, state_dim: int = 15, action_dim: int = 7, hidden_dim: int = 256):
        super().__init__()
        self.state_dim = state_dim
        self.action_dim = action_dim

        # Common feature representation trunk
        self.feature_trunk = nn.Sequential(
            nn.Linear(state_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
        )

        # Value stream V(s)
        self.value_stream = nn.Sequential(
            nn.Linear(hidden_dim, 128),
            nn.ReLU(),
            nn.Linear(128, 1),
        )

        # Advantage stream A(s, a)
        self.advantage_stream = nn.Sequential(
            nn.Linear(hidden_dim, 128),
            nn.ReLU(),
            nn.Linear(128, action_dim),
        )

    def forward(self, state: torch.Tensor) -> torch.Tensor:
        """Args:

        state: (Batch, state_dim)

        Returns:
            Q-values: (Batch, action_dim)
        """
        features = self.feature_trunk(state)

        values = self.value_stream(features)  # (Batch, 1)
        advantages = self.advantage_stream(features)  # (Batch, action_dim)

        # Mean-centered advantage aggregation:
        # Q(s, a) = V(s) + (A(s, a) - mean_a(A(s, a)))
        q_values = values + (advantages - advantages.mean(dim=-1, keepdim=True))
        return q_values
