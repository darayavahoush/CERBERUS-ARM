"""Training script for Dueling Double-DQN (D3QN) with Hindsight Experience Replay (HER)."""

import os
import torch
import numpy as np

from backend.env.robotic_arm_env import RoboticArmEnv
from backend.agent.d3qn_agent import D3QNAgent


def main():
    device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Training D3QN + HER on device: {device}")

    env = RoboticArmEnv()
    agent = D3QNAgent(
        state_dim=15,
        action_dim=7,
        lr=7e-4,
        gamma=0.98,
        tau=0.01,
        batch_size=64,
        buffer_capacity=40000,
        epsilon_start=1.0,
        epsilon_end=0.05,
        epsilon_decay=0.985,
        device=device,
    )

    num_episodes = 120
    print(f"[*] Training across {num_episodes} episodes with Hindsight Experience Replay...")

    window_rewards = []
    window_success = []

    for ep in range(1, num_episodes + 1):
        obs = env.reset(task_id=(ep % 3) + 1)
        ep_transitions = []
        ep_reward = 0.0
        done = False

        while not done:
            action, _ = agent.select_action(obs["vector"], evaluate=False)
            obs_next, r, term, trunc, info = env.step(action)
            ep_reward += r

            achieved_goal = (obs_next["fk"]["ee"][0], obs_next["fk"]["ee"][1])
            desired_goal = env.goal_pos

            ep_transitions.append(
                {
                    "state": obs["vector"],
                    "action": action,
                    "reward": r,
                    "next_state": obs_next["vector"],
                    "done": term,
                    "achieved_goal": achieved_goal,
                    "desired_goal": desired_goal,
                }
            )

            obs = obs_next
            done = term or trunc

            # Optimize network
            agent.update()

        # Store trajectory with HER hindsight goal relabeling
        agent.replay_buffer.store_episode_with_her(
            ep_transitions, env.compute_her_reward
        )
        agent.decay_epsilon()

        is_succ = 1 if info.get("is_success", False) else 0
        window_rewards.append(ep_reward)
        window_success.append(is_succ)

        if ep % 15 == 0 or ep == num_episodes:
            mean_r = np.mean(window_rewards[-15:])
            succ_rate = np.mean(window_success[-15:]) * 100
            print(
                f"Episode [{ep:03d}/{num_episodes:03d}] "
                f"Reward (last 15): {mean_r:6.2f} | "
                f"Success Rate: {succ_rate:5.1f}% | "
                f"Epsilon: {agent.epsilon:.3f} | "
                f"Buffer Size: {len(agent.replay_buffer)}"
            )

    os.makedirs("backend/data/checkpoints", exist_ok=True)
    save_path = "backend/data/checkpoints/d3qn_weights.pth"
    agent.save_checkpoint(save_path)
    print(f"[+] D3QN Agent successfully trained and saved to: {save_path}")


if __name__ == "__main__":
    main()
