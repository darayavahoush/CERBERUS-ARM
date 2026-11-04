"""Matched-seed evaluation for the random, geometric reference, and trained D3QN policies."""

import argparse
import csv
import copy
import json
import os
import random

import numpy as np
import torch

from backend.env.robotic_arm_env import RoboticArmEnv
from backend.agent.d3qn_agent import D3QNAgent
from scripts.train_d3qn import demonstration_action


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=2026)
    parser.add_argument("--episodes-per-task", type=int, default=30)
    parser.add_argument("--checkpoint", default="backend/data/checkpoints/d3qn_weights.pth")
    parser.add_argument("--output-prefix", default=None)
    return parser.parse_args()


def build_scenarios(seed, episodes_per_task):
    random.seed(seed)
    np.random.seed(seed)
    env = RoboticArmEnv(seed=seed)
    scenarios = []
    for task_id in (1, 2, 3):
        for episode in range(episodes_per_task):
            env.reset(task_id=task_id)
            scenarios.append({
                "scenario_id": f"task{task_id}_{episode + 1:03d}",
                "task_id": task_id,
                "objects": copy.deepcopy(env.objects),
                "target_object_idx": env.target_object_idx,
                "target_receptacle_key": env.target_receptacle_key,
                "goal_pos": tuple(env.goal_pos),
            })
    return scenarios


def run_episode(scenario, policy, agent, seed):
    env = RoboticArmEnv(seed=seed)
    env.reset(task_id=scenario["task_id"])
    env.objects = copy.deepcopy(scenario["objects"])
    env.target_object_idx = scenario["target_object_idx"]
    env.target_receptacle_key = scenario["target_receptacle_key"]
    env.goal_pos = scenario["goal_pos"]
    obs = env.get_observation()
    local_rng = random.Random(seed)
    total_reward = 0.0
    total_jerk = 0.0
    done = False
    info = {}

    while not done:
        if policy == "random":
            action = local_rng.randrange(env.action_space_size)
        elif policy == "geometric_reference":
            action = demonstration_action(env, obs)
        else:
            context = env.build_drl_action_context()
            action, _ = agent.select_action(
                obs["vector"], evaluate=True,
                action_mask=context["action_mask"],
                action_bias=context["action_bias"],
            )
        obs, reward, terminated, truncated, info = env.step(action)
        total_reward += reward
        total_jerk += float(info.get("jerk", 0.0))
        done = terminated or truncated

    return {
        "scenario_id": scenario["scenario_id"],
        "task_id": scenario["task_id"],
        "policy": policy,
        "success": int(bool(info.get("is_success", False))),
        "collision": int(bool(info.get("is_collision", False))),
        "return": round(total_reward, 6),
        "steps": env.current_step,
        "jerk_sum": round(total_jerk, 6),
    }


def main():
    args = parse_args()
    if args.episodes_per_task < 1:
        raise SystemExit("--episodes-per-task must be positive")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    agent = D3QNAgent(state_dim=18, action_dim=9, device=device)
    if not os.path.exists(args.checkpoint):
        raise SystemExit(f"Missing trained checkpoint: {args.checkpoint}. Run scripts/train_d3qn.py first.")
    agent.load_checkpoint(args.checkpoint)
    agent.epsilon = 0.0
    scenarios = build_scenarios(args.seed, args.episodes_per_task)
    rows = []
    policies = ("random", "geometric_reference", "trained_d3qn")
    for policy in policies:
        for index, scenario in enumerate(scenarios):
            rows.append(run_episode(scenario, policy, agent, args.seed + index + 10_000))

    aggregates = []
    for policy in policies:
        for task_id in (1, 2, 3):
            subset = [row for row in rows if row["policy"] == policy and row["task_id"] == task_id]
            aggregates.append({
                "policy": policy,
                "task_id": task_id,
                "episodes": len(subset),
                "success_rate_pct": round(float(np.mean([x["success"] for x in subset]) * 100), 2),
                "collision_rate_pct": round(float(np.mean([x["collision"] for x in subset]) * 100), 2),
                "mean_return": round(float(np.mean([x["return"] for x in subset])), 4),
                "mean_steps": round(float(np.mean([x["steps"] for x in subset])), 2),
                "mean_jerk": round(float(np.mean([x["jerk_sum"] for x in subset])), 6),
            })

    prefix = args.output_prefix or f"docs/training/results/evaluation_seed_{args.seed}"
    os.makedirs(os.path.dirname(os.path.abspath(prefix)), exist_ok=True)
    with open(prefix + "_episodes.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    with open(prefix + "_summary.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(aggregates[0].keys()))
        writer.writeheader()
        writer.writerows(aggregates)
    with open(prefix + ".json", "w", encoding="utf-8") as f:
        json.dump({
            "seed": args.seed,
            "episodes_per_task": args.episodes_per_task,
            "matched_scenarios": len(scenarios),
            "policies": list(policies),
            "checkpoint": args.checkpoint,
            "device": device,
            "metrics": aggregates,
        }, f, indent=2)
    print(f"Evaluation uses {len(scenarios)} matched scenarios per policy ({args.episodes_per_task} per task).")
    for metric in aggregates:
        print(f"{metric['policy']:20s} task={metric['task_id']} success={metric['success_rate_pct']:5.1f}% collision={metric['collision_rate_pct']:5.1f}% return={metric['mean_return']:7.2f} steps={metric['mean_steps']:5.1f}")
    print(f"Saved results under {prefix}*")


if __name__ == "__main__":
    main()
