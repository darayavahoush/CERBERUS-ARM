"""Matched-scene evaluation for the random, geometric-reference, and shielded DQfD policies."""

from __future__ import annotations

import copy
import random
from typing import Any, Dict, List

import numpy as np

from backend.agent.d3qn_agent import D3QNAgent
from backend.env.robotic_arm_env import RoboticArmEnv
from scripts.train_d3qn import demonstration_action


class PolicyComparator:
    """Run all policies on the same deterministic, task-balanced scenes."""

    def __init__(self, env: RoboticArmEnv, trained_agent: D3QNAgent):
        self.env = env
        self.agent = trained_agent

    def _scenarios(self, episodes_per_task: int = 20, seed: int = 2027) -> List[Dict[str, Any]]:
        random.seed(seed)
        np.random.seed(seed)
        source_env = RoboticArmEnv(
            delta_theta=self.env.delta_theta,
            max_steps=self.env.max_steps,
            seed=seed,
        )
        scenarios = []
        for task_id in (1, 2, 3):
            for episode in range(episodes_per_task):
                source_env.reset(task_id=task_id)
                scenarios.append({
                    "scenario_id": f"task{task_id}_{episode + 1:03d}",
                    "task_id": task_id,
                    "objects": copy.deepcopy(source_env.objects),
                    "target_object_idx": source_env.target_object_idx,
                    "target_receptacle_key": source_env.target_receptacle_key,
                    "goal_pos": tuple(source_env.goal_pos),
                })
        return scenarios

    def _episode(self, scenario: Dict[str, Any], policy: str, seed: int) -> Dict[str, Any]:
        env = RoboticArmEnv(
            delta_theta=self.env.delta_theta,
            max_steps=self.env.max_steps,
            seed=seed,
        )
        env.reset(task_id=scenario["task_id"])
        env.objects = copy.deepcopy(scenario["objects"])
        env.target_object_idx = scenario["target_object_idx"]
        env.target_receptacle_key = scenario["target_receptacle_key"]
        env.goal_pos = scenario["goal_pos"]
        obs = env.get_observation()
        rng = random.Random(seed)
        total_reward = 0.0
        total_jerk = 0.0
        done = False
        info: Dict[str, Any] = {}

        while not done:
            if policy == "random":
                action = rng.randrange(env.action_space_size)
            elif policy == "geometric_reference":
                action = demonstration_action(env, obs)
            else:
                context = env.build_drl_action_context()
                action, _ = self.agent.select_action(
                    obs["vector"], evaluate=True,
                    action_mask=context["action_mask"],
                    action_bias=context["action_bias"],
                )
            obs, reward, terminated, truncated, info = env.step(action)
            total_reward += reward
            total_jerk += float(info.get("jerk", 0.0))
            done = terminated or truncated

        return {
            "success": int(bool(info.get("is_success", False))),
            "collision": int(bool(info.get("is_collision", False))),
            "return": total_reward,
            "steps": env.current_step,
            "jerk": total_jerk,
        }

    def run_full_benchmark_suite(self, episodes_per_task: int = 20, seed: int = 2027) -> List[Dict[str, Any]]:
        """Return aggregate results from 20 matched scenes for each of 3 tasks."""
        scenarios = self._scenarios(episodes_per_task=episodes_per_task, seed=seed)
        rows = []
        for policy, label in (
            ("random", "Random"),
            ("geometric_reference", "Geometric reference"),
            ("trained_d3qn", "Trained DQfD + safety shield"),
        ):
            results = [self._episode(scenario, policy, seed + index + 10_000) for index, scenario in enumerate(scenarios)]
            rows.append({
                "policy_name": label,
                "episodes": len(results),
                "success_rate": round(float(np.mean([row["success"] for row in results]) * 100), 1),
                "collision_rate": round(float(np.mean([row["collision"] for row in results]) * 100), 1),
                "mean_reward": round(float(np.mean([row["return"] for row in results])), 2),
                "mean_steps": round(float(np.mean([row["steps"] for row in results])), 1),
                "mean_jerk": round(float(np.mean([row["jerk"] for row in results])), 3),
            })
        return rows
