"""Reproducible Dueling Double-DQN + HER training with per-episode telemetry."""

import argparse
import csv
import json
import math
import os
import platform
import random
from datetime import datetime, timezone

import numpy as np
import torch

from backend.env.robotic_arm_env import RoboticArmEnv
from backend.agent.d3qn_agent import D3QNAgent


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--episodes", type=int, default=120)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--expert-mix", type=float, default=0.55,
                        help="Initial fraction of actions supplied by the geometric demonstration policy")
    parser.add_argument("--checkpoint", default="backend/data/checkpoints/d3qn_weights.pth")
    parser.add_argument("--metrics", default=None, help="CSV path (defaults to docs/training/results/d3qn_seed_<seed>.csv)")
    return parser.parse_args()


def plan_collision_free_joint_path(env, target, tolerance):
    """Find a short, collision-free discrete route using analytical IK waypoints."""
    step = env.delta_theta
    start = tuple(int(round(angle / step)) for angle in (env.theta1, env.theta2, env.theta3))
    start_angles = tuple(value * step for value in start)
    obstacle = env.obstacles[0]
    if env.kinematics.check_collision_circle(*start_angles, obstacle["x"], obstacle["y"], obstacle["radius"]):
        return None

    # If the exact point is outside the joint-limited workspace, try nearby
    # reachable points that remain inside the gripper's success radius.
    target_points = [tuple(target)]
    for radius in (tolerance * 0.45, tolerance * 0.8):
        for index in range(8):
            angle = index * math.pi / 4
            target_points.append((target[0] + radius * math.cos(angle), target[1] + radius * math.sin(angle)))

    candidates = []
    for point in target_points:
        for phi_step in range(-6, 7):
            phi = phi_step * math.pi / 6
            for elbow_up in (False, True):
                solution = env.kinematics.inverse_kinematics(point[0], point[1], target_phi=phi, elbow_up=elbow_up)
                if solution is None:
                    continue
                end_key = tuple(int(round(angle / step)) for angle in solution)
                end_angles = tuple(value * step for value in end_key)
                actual = env.kinematics.forward_kinematics(*end_angles)["ee"]
                if math.hypot(actual[0] - target[0], actual[1] - target[1]) > tolerance:
                    continue
                distance = sum(abs(end_key[i] - start[i]) for i in range(3))
                candidates.append((distance, end_key))

    candidates.sort(key=lambda item: item[0])
    seen = set()
    for _, end_key in candidates:
        if end_key in seen:
            continue
        seen.add(end_key)
        for order in ((0, 1, 2), (0, 2, 1), (1, 0, 2), (1, 2, 0), (2, 0, 1), (2, 1, 0)):
            current = list(start)
            actions = []
            safe = True
            for axis in order:
                direction = 1 if end_key[axis] > current[axis] else -1
                while current[axis] != end_key[axis]:
                    current[axis] += direction
                    angles = tuple(value * step for value in current)
                    if env.kinematics.check_collision_circle(*angles, obstacle["x"], obstacle["y"], obstacle["radius"]):
                        safe = False
                        break
                    actions.append(axis * 2 if direction > 0 else axis * 2 + 1)
                if not safe:
                    break
            if safe:
                return actions
    return None


def demonstration_action(env, observation):
    """Collision-aware A* demonstrator; DQN remains the deployed action policy."""
    ee = env.kinematics.forward_kinematics(env.theta1, env.theta2, env.theta3)["ee"]
    if env.grasped_object_idx is None:
        if env.gripper_closed:
            env.__dict__.pop("_demo_route", None)
            return 6  # recover from a missed close before approaching again
        target_object = env.objects[env.target_object_idx]
        target = (target_object["x"], target_object["y"])
        tolerance = 0.13
        phase = ("pick", env.target_object_idx)
        if math.hypot(ee[0] - target[0], ee[1] - target[1]) <= tolerance:
            env.__dict__.pop("_demo_route", None)
            return 6
    else:
        target = env.goal_pos
        tolerance = 0.18
        phase = ("place", env.target_receptacle_key)
        if math.hypot(ee[0] - target[0], ee[1] - target[1]) <= tolerance:
            env.__dict__.pop("_demo_route", None)
            return 6

    angles = (env.theta1, env.theta2, env.theta3)
    route = env.__dict__.get("_demo_route")
    if route and route["phase"] == phase and route["target"] == tuple(target) and route["expected"] == tuple(int(round(v / env.delta_theta)) for v in angles):
        actions = route["actions"]
    else:
        actions = plan_collision_free_joint_path(env, target, tolerance)
    if actions is None or not actions:
        env.__dict__.pop("_demo_route", None)
        # Greedy fallback handles locally reachable states when A* exhausts its cap.
        best_distance = math.hypot(ee[0] - target[0], ee[1] - target[1])
        best_action = 8
        for action in range(6):
            candidate = [env.theta1, env.theta2, env.theta3]
            candidate[action // 2] += env.delta_theta * (1 if action % 2 == 0 else -1)
            candidate = env.kinematics.clamp_angles(*candidate)
            if env.kinematics.check_collision_circle(*candidate, 0.0, 0.85, 0.20):
                continue
            point = env.kinematics.forward_kinematics(*candidate)["ee"]
            d = math.hypot(point[0] - target[0], point[1] - target[1])
            if d < best_distance:
                best_distance, best_action = d, action
        return best_action

    action = actions.pop(0)
    candidate = [env.theta1, env.theta2, env.theta3]
    candidate[action // 2] += env.delta_theta * (1 if action % 2 == 0 else -1)
    candidate = env.kinematics.clamp_angles(*candidate)
    env.__dict__["_demo_route"] = {
        "phase": phase,
        "target": tuple(target),
        "actions": actions,
        "expected": tuple(int(round(v / env.delta_theta)) for v in candidate),
    }
    return action


def main():
    args = parse_args()
    if args.episodes < 1 or not 0.0 <= args.expert_mix <= 1.0:
        raise SystemExit("--episodes must be positive")
    started_at = datetime.now(timezone.utc).isoformat()

    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(args.seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False

    device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Training D3QN + HER | device={device} | seed={args.seed} | episodes={args.episodes}")

    env = RoboticArmEnv(seed=args.seed)
    agent = D3QNAgent(
        state_dim=18,
        action_dim=9,
        lr=7e-4,
        gamma=0.98,
        tau=0.01,
        batch_size=64,
        buffer_capacity=40000,
        epsilon_start=1.0,
        epsilon_end=0.05,
        epsilon_decay=0.995,
        device=device,
    )

    metrics_path = args.metrics or f"docs/training/results/d3qn_seed_{args.seed}.csv"
    os.makedirs(os.path.dirname(os.path.abspath(metrics_path)), exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(args.checkpoint)), exist_ok=True)
    rows = []
    demonstration_actions = 0
    total_actions = 0

    for ep in range(1, args.episodes + 1):
        task_id = ((ep - 1) % 3) + 1
        obs = env.reset(task_id=task_id)
        spawn = dict(obs["target_object"])
        progress = (ep - 1) / max(1, args.episodes - 1)
        expert_probability = args.expert_mix * (1.0 - 0.6 * progress)
        use_demonstration = random.random() < expert_probability
        ep_transitions = []
        ep_reward = 0.0
        ep_jerk = 0.0
        ep_losses = []
        done = False
        info = {}

        while not done:
            # Demonstration-guided exploration supplies successful trajectories
            # to the same replay buffer; deployed actions still come from DQN.
            if use_demonstration:
                action = demonstration_action(env, obs)
                demonstration_actions += 1
            else:
                context = env.build_drl_action_context()
                action, _ = agent.select_action(
                    obs["vector"], evaluate=False,
                    action_mask=context["action_mask"],
                    action_bias=context["action_bias"],
                )
            total_actions += 1
            obs_next, reward, terminated, truncated, info = env.step(action)
            ep_reward += reward
            ep_jerk += float(info.get("jerk", 0.0))
            obj = obs_next["target_object"]
            obj_xy = (float(obj["x"]), float(obj["y"]))
            moved = np.hypot(obj_xy[0] - spawn["x"], obj_xy[1] - spawn["y"]) > 1e-4
            ep_transitions.append({
                "state": np.asarray(obs["vector"], dtype=np.float32),
                "action": action,
                "reward": reward,
                "next_state": np.asarray(obs_next["vector"], dtype=np.float32),
                "done": bool(terminated or truncated),
                "achieved_goal": obj_xy,
                "desired_goal": tuple(env.goal_pos),
                "goal_scale": float(env.kinematics.max_reach),
                "her_valid": bool(obj.get("is_grasped", False) or moved),
                "is_collision": bool(info.get("is_collision", False)),
                "expert": use_demonstration,
            })
            obs = obs_next
            done = terminated or truncated

        # Insert the complete trajectory (including valid future-goal relabels)
        # before optimization, so this episode can train the policy immediately.
        agent.replay_buffer.store_episode_with_her(ep_transitions, env.compute_her_reward)
        for _ in range(len(ep_transitions)):
            loss = agent.update()
            if loss is not None:
                ep_losses.append(loss)
        agent.decay_epsilon()

        row = {
            "episode": ep,
            "task_id": task_id,
            "reward": round(float(ep_reward), 5),
            "success": int(bool(info.get("is_success", False))),
            "collision": int(bool(info.get("is_collision", False))),
            "steps": int(env.current_step),
            "jerk_sum": round(ep_jerk, 6),
            "mean_loss": round(float(np.mean(ep_losses)), 8) if ep_losses else "",
            "epsilon": round(float(agent.epsilon), 6),
            "replay_size": len(agent.replay_buffer),
        }
        rows.append(row)

        if ep % 15 == 0 or ep == args.episodes:
            window = rows[-15:]
            print(
                f"Episode [{ep:03d}/{args.episodes:03d}] "
                f"reward={np.mean([x['reward'] for x in window]):.2f} "
                f"success={100*np.mean([x['success'] for x in window]):.1f}% "
                f"collision={100*np.mean([x['collision'] for x in window]):.1f}% "
                f"epsilon={agent.epsilon:.3f} updates={agent.total_steps}"
            )

    with open(metrics_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    agent.save_checkpoint(args.checkpoint)
    summary_path = os.path.splitext(metrics_path)[0] + ".json"
    summary = {
        "started_at_utc": started_at,
        "seed": args.seed,
        "episodes": args.episodes,
        "expert_mix_start": args.expert_mix,
        "demonstration_action_fraction": round(demonstration_actions / max(1, total_actions), 4),
        "device": device,
        "python": platform.python_version(),
        "pytorch": torch.__version__,
        "learner": "DQfD (Double DQN + expert large-margin loss) with HER",
        "environment": {
            "delta_theta_degrees": round(float(np.degrees(env.delta_theta)), 3),
            "max_steps": env.max_steps,
            "tasks": [1, 2, 3],
            "swept_collision_resolution_degrees": 0.5,
        },
        "checkpoint": args.checkpoint,
        "metrics_csv": metrics_path,
        "final_15_mean_reward": round(float(np.mean([x["reward"] for x in rows[-15:]])), 5),
        "final_15_success_rate": round(float(np.mean([x["success"] for x in rows[-15:]]) * 100), 2),
        "final_15_collision_rate": round(float(np.mean([x["collision"] for x in rows[-15:]]) * 100), 2),
        "gradient_updates": agent.total_steps,
        "final_epsilon": agent.epsilon,
    }
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"[+] Checkpoint: {args.checkpoint}")
    print(f"[+] Episode metrics: {metrics_path}")
    print(f"[+] Run summary: {summary_path}")


if __name__ == "__main__":
    main()
