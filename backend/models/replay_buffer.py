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
        expert: bool = False,
    ):
        """Store standard experience tuple."""
        self.buffer.append((state, action, reward, next_state, done, expert))

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

        # HER goals must represent object locations reached during manipulation.
        # Before the object is picked up its unchanged spawn position is not a
        # useful hindsight goal, since that goal is already satisfied at reset.
        future_goal_indices = [
            i for i, item in enumerate(episode_transitions)
            if item.get("her_valid", False)
        ]

        for t in range(T):
            trans = episode_transitions[t]
            # Store original transition
            self.push(
                trans["state"],
                trans["action"],
                trans["reward"],
                trans["next_state"],
                trans["done"],
                trans.get("expert", False),
            )

            # Sample only future locations reached while carrying/after moving
            # the object. A collision transition cannot be relabeled as success.
            candidates = [i for i in future_goal_indices if i > t]
            if trans.get("is_collision", False):
                continue
            for _ in range(min(self.k_future, len(candidates))):
                future_idx = random.choice(candidates)
                future_goal = episode_transitions[future_idx]["achieved_goal"]

                # State layout: object xy at 11:13, goal xy at 13:15,
                # object-to-goal distance at 16.
                relabeled_state = trans["state"].copy()
                relabeled_next_state = trans["next_state"].copy()
                goal_scale = float(trans.get("goal_scale", 1.95))
                for state in (relabeled_state, relabeled_next_state):
                    state[13] = future_goal[0] / goal_scale
                    state[14] = future_goal[1] / goal_scale
                    state[16] = float(np.hypot(
                        state[11] * goal_scale - future_goal[0],
                        state[12] * goal_scale - future_goal[1],
                    ))

                # Compute new reward under the retroactively achieved goal
                relabeled_reward = reward_fn(
                    trans["achieved_goal"], future_goal
                )
                relabeled_done = relabeled_reward > 0.0

                self.push(
                    relabeled_state,
                    trans["action"],
                    relabeled_reward,
                    relabeled_next_state,
                    relabeled_done,
                    False,
                )

    def sample(
        self, batch_size: int, device: torch.device, include_expert: bool = False
    ) -> Tuple[torch.Tensor, ...]:
        """Sample a batch of transitions as PyTorch Tensors."""
        batch = random.sample(self.buffer, batch_size)
        states, actions, rewards, next_states, dones, expert = zip(*batch)

        tensors = (
            torch.as_tensor(np.array(states), dtype=torch.float32, device=device),
            torch.as_tensor(np.array(actions), dtype=torch.long, device=device).unsqueeze(1),
            torch.as_tensor(np.array(rewards), dtype=torch.float32, device=device).unsqueeze(1),
            torch.as_tensor(np.array(next_states), dtype=torch.float32, device=device),
            torch.as_tensor(np.array(dones), dtype=torch.float32, device=device).unsqueeze(1),
        )
        if include_expert:
            return tensors + (torch.as_tensor(np.array(expert), dtype=torch.bool, device=device),)
        return tensors
