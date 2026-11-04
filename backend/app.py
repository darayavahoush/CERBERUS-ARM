"""FastAPI Application Server for NEURO-ARM Manipulation Cockpit.

Provides:
- Real-time REST endpoints for perception, DRL inference, and Ollama reasoning.
- LangGraph Autonomous Multi-Agent Orchestrator endpoint (/api/orchestrator/run).
- WebSocket bi-directional streaming for 60fps kinematics visualization.
- Interactive training and benchmark execution APIs.
"""

import io
import base64
import math
import time
from typing import Dict, Any, Optional, List
import numpy as np
import torch
from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os

from backend.env.robotic_arm_env import RoboticArmEnv, SHAPES, COLORS, RECEPTACLES
from backend.env.generator import WorkspaceRenderer
from backend.env.mujoco_env import CerberusMuJoCoEnv
from backend.models.perception_cnn import MultiTaskPerceptionCNN
from backend.agent.d3qn_agent import D3QNAgent
from backend.agent.policy_comparator import PolicyComparator
from backend.llm.ollama_client import OllamaRoboticClient
from backend.agent.orchestrator import LangGraphCerberusOrchestrator


app = FastAPI(title="CERBERUS-ARM Manipulation Cockpit", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Component Instantiations
env = RoboticArmEnv()
renderer = WorkspaceRenderer(width=256, height=256)
mujoco_env = CerberusMuJoCoEnv()
mujoco_env.set_joints(env.theta1, env.theta2, env.theta3, env.gripper_closed, env.objects)

# Hardware device
device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")

# Multi-Task Perception CNN
cnn_model = MultiTaskPerceptionCNN(num_shapes=len(SHAPES), num_colors=len(COLORS)).to(device)
cnn_model.register_gradcam_hooks()
cnn_weights_path = "backend/data/checkpoints/cnn_weights.pth"
if os.path.exists(cnn_weights_path):
    try:
        cnn_model.load_state_dict(torch.load(cnn_weights_path, map_location=device))
        print(f"[+] Loaded pre-trained CNN weights from {cnn_weights_path}")
    except Exception as e:
        print(f"[!] Warning loading CNN weights: {e}")
cnn_model.eval()

# D3QN Agent for 3-DOF Arm (18 state features, 9 discrete actions)
agent = D3QNAgent(state_dim=18, action_dim=9, device=device)
d3qn_weights_path = "backend/data/checkpoints/d3qn_weights.pth"
if os.path.exists(d3qn_weights_path):
    try:
        agent.load_checkpoint(d3qn_weights_path)
        print(f"[+] Loaded pre-trained D3QN agent weights from {d3qn_weights_path}")
    except Exception as e:
        print(f"[!] Re-initializing fresh D3QN weights for 3-DOF workcell: {e}")

# Benchmark Suite
comparator = PolicyComparator(env, agent)

# Ollama Client (defaults to qwen2.5:3b-instruct)
ollama = OllamaRoboticClient(default_model="qwen2.5:3b-instruct", timeout_seconds=45.0)

# LangGraph Autonomous Orchestrator Agent
orchestrator = LangGraphCerberusOrchestrator(
    env=env,
    agent=agent,
    cnn_model=cnn_model,
    renderer=renderer,
    ollama_client=ollama,
    device=device,
)

# Checkpoint directory
os.makedirs("backend/data/checkpoints", exist_ok=True)


# --- Pydantic Request Models ---
class TaskPlanRequest(BaseModel):
    instruction: str
    model_name: Optional[str] = None


class ResetRequest(BaseModel):
    task_id: int = 1
    target_shape: Optional[str] = None
    target_color: Optional[str] = None
    target_bin: Optional[str] = None


class StepRequest(BaseModel):
    action: Optional[int] = None  # If None, use trained agent's policy


class ExplainRequest(BaseModel):
    telemetry: Dict[str, Any]
    model_name: Optional[str] = None


class SupervisoryWeightsRequest(BaseModel):
    collision_penalty: Optional[float] = None
    jerk_penalty: Optional[float] = None
    step_penalty: Optional[float] = None


class OrchestratorRunRequest(BaseModel):
    instruction: str
    task_id: int = 1
    model_name: Optional[str] = "qwen2.5:3b-instruct"
    max_steps: int = 120


class EpisodeRecord(BaseModel):
    id: str
    ts: int
    mode: str = "live"
    instruction: str
    target: str
    bin: str
    success: bool
    collision: bool
    steps: int
    reward: float
    jerk: float = 0.0
    source: str = "policy"


# In-memory history stores
EPISODES_LOG: List[Dict[str, Any]] = []
TRAIN_RUNS_LOG: List[Dict[str, Any]] = []


# Helper to encode PIL image as Base64 string
def image_to_base64(img) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")


@app.get("/api/mujoco/state")
async def get_mujoco_state():
    """Retrieve real-time MuJoCo 3D physics state."""
    mujoco_env.set_joints(env.theta1, env.theta2, env.theta3, env.gripper_closed, env.objects)
    return mujoco_env.get_3d_state()


@app.get("/api/status")
async def get_system_status():
    """Return health and readiness metrics for all system tiers."""
    ollama_info = await ollama.check_status()
    mujoco_info = mujoco_env.get_3d_state()
    return {
        "status": "online",
        "device": device,
        "physics_engine": "MuJoCo model · synchronized joint-state digital twin (actions remain discrete kinematic steps)" if mujoco_info.get("available") else "Analytical kinematics fallback",
        "mujoco": mujoco_info,
        "cnn": {
            "architecture": "CoordConv + Multi-Task Backbone",
            "gradcam_enabled": True,
            "classes": {"shapes": SHAPES, "colors": list(COLORS.keys())},
        },
        "drl": {
            "algorithm": "DQfD (Dueling Double-DQN + HER + expert margin loss)",
            "state_dim": agent.state_dim,
            "action_dim": agent.action_dim,
            "epsilon": round(agent.epsilon, 4),
            "total_steps": agent.total_steps,
            "buffer_size": len(agent.replay_buffer),
        },
        "ollama": ollama_info,
        "orchestrator": {
            "engine": "LangGraph",
            "state": "active",
            "nodes": [
                "perceive_workspace",
                "plan_task_qwen",
                "validate_task_plan",
                "ground_target_and_goal",
                "validate_safety",
                "replan_with_caution",
                "execute_d3qn_policy",
                "learn_from_episode",
                "explain_forensics_xai",
            ],
        },
        "receptacles": RECEPTACLES,
    }


@app.post("/api/orchestrator/run")
async def run_langgraph_orchestration(req: OrchestratorRunRequest):
    """Run end-to-end autonomous robotic manipulation via LangGraph."""
    result = await orchestrator.run(
        instruction=req.instruction,
        task_id=req.task_id,
        model_name=req.model_name or "qwen2.5:3b-instruct",
        max_steps=req.max_steps,
    )
    obs = result.get("final_observation") or env.get_observation()
    img = renderer.render_scene(
        obs["fk"], obs["objects"], env.obstacles, RECEPTACLES, obs["gripper_closed"]
    )
    return {
        "execution_status": result.get("execution_status"),
        "steps_taken": result.get("steps_taken"),
        "cumulative_reward": result.get("cumulative_reward"),
        "jerk_index": result.get("jerk_index"),
        "plan": result.get("plan"),
        "target_grounding": result.get("target_grounding"),
        "policy_guidance": result.get("policy_guidance"),
        "policy_learning": result.get("policy_learning"),
        "safety_interventions": result.get("safety_interventions", 0),
        "perception": result.get("perception"),
        "safety_assessment": result.get("safety_assessment"),
        "xai_debrief": result.get("xai_debrief"),
        "trace_logs": result.get("trace_logs"),
        "observation": obs,
        "rendered_image": image_to_base64(img),
    }


@app.post("/api/task/plan")
async def plan_task_with_llm(req: TaskPlanRequest):
    """Compile natural language instruction via Ollama or Neuro-Symbolic fallback."""
    plan = await ollama.compile_task(req.instruction, req.model_name)

    # Synchronize supervisory reward weights with the environment
    if "supervisory_weights" in plan:
        for k, v in plan["supervisory_weights"].items():
            if k in env.supervisory_weights and isinstance(v, (int, float)):
                env.supervisory_weights[k] = float(v)

    # Auto-reset environment to reflect the compiled plan
    obs = env.reset(
        target_shape=plan.get("target_shape"),
        target_color=plan.get("target_color"),
        target_bin=plan.get("destination_bin"),
    )

    img = renderer.render_scene(
        obs["fk"], obs["objects"], env.obstacles, RECEPTACLES, obs["gripper_closed"]
    )
    mujoco_env.set_joints(obs["theta1"], obs["theta2"], obs["theta3"], obs["gripper_closed"], obs["objects"])

    return {
        "plan": plan,
        "observation": obs,
        "mujoco": mujoco_env.get_3d_state(),
        "rendered_image": image_to_base64(img),
    }


@app.post("/api/env/reset")
async def reset_environment(req: ResetRequest):
    """Reset the 2D robotic arm environment."""
    obs = env.reset(
        task_id=req.task_id,
        target_shape=req.target_shape,
        target_color=req.target_color,
        target_bin=req.target_bin,
    )
    img = renderer.render_scene(
        obs["fk"], obs["objects"], env.obstacles, RECEPTACLES, obs["gripper_closed"]
    )
    mujoco_env.set_joints(obs["theta1"], obs["theta2"], obs["theta3"], obs["gripper_closed"], obs["objects"])
    return {
        "observation": obs,
        "mujoco": mujoco_env.get_3d_state(),
        "rendered_image": image_to_base64(img),
        "target_object": env.objects[env.target_object_idx],
        "receptacles": RECEPTACLES,
        "obstacles": env.obstacles,
    }


@app.post("/api/env/step")
async def step_environment(req: StepRequest):
    """Execute one environment step (manual or policy-driven)."""
    obs_before = env.get_observation()

    # Determine action
    if req.action is not None and 0 <= req.action < env.action_space_size:
        action = req.action
        _, q_values = agent.select_action(obs_before["vector"], evaluate=True)
    else:
        action, q_values = agent.select_action(obs_before["vector"], evaluate=False)

    obs_after, reward, terminated, truncated, info = env.step(action)

    # Store experience in HER replay buffer
    agent.replay_buffer.push(
        obs_before["vector"],
        action,
        reward,
        obs_after["vector"],
        terminated,
    )

    img = renderer.render_scene(
        obs_after["fk"], obs_after["objects"], env.obstacles, RECEPTACLES, obs_after["gripper_closed"]
    )

    # Sync MuJoCo physics state
    mujoco_env.set_joints(obs_after["theta1"], obs_after["theta2"], obs_after["theta3"], obs_after["gripper_closed"], obs_after["objects"])
    mujoco_state = mujoco_env.get_3d_state()

    return {
        "observation": obs_after,
        "reward": round(reward, 3),
        "terminated": terminated,
        "truncated": truncated,
        "info": info,
        "action": action,
        "q_values": [round(q, 4) for q in q_values],
        "rendered_image": image_to_base64(img),
        "mujoco": mujoco_state,
    }


@app.post("/api/perception/inspect")
async def inspect_perception():
    """Run CoordConv CNN perception on current workspace frame and generate Grad-CAM."""
    obs = env.get_observation()
    pil_img = renderer.render_scene(
        obs["fk"], obs["objects"], env.obstacles, RECEPTACLES, obs["gripper_closed"]
    )

    # Convert to PyTorch Tensor (B, 3, H, W)
    arr = np.array(pil_img, dtype=np.float32) / 255.0
    tensor = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0).to(device)

    # CNN inference
    latent, shape_logits, color_logits, coords = cnn_model(tensor)

    pred_shape_idx = int(torch.argmax(shape_logits, dim=-1).item())
    pred_color_idx = int(torch.argmax(color_logits, dim=-1).item())
    pred_coords = coords.squeeze().cpu().detach().numpy().tolist()

    # Generate Grad-CAM attention heatmap for predicted shape
    cam_map = cnn_model.generate_gradcam_heatmap(tensor, target_class=pred_shape_idx)
    # Downsample heatmap for JSON transmission efficiency (32x32)
    cam_small = []
    if cam_map is not None:
        step = max(cam_map.shape[0] // 32, 1)
        cam_small = [[round(float(v), 2) for v in row[::step]] for row in cam_map[::step]]

    return {
        "predicted_shape": SHAPES[pred_shape_idx],
        "predicted_color": list(COLORS.keys())[pred_color_idx],
        "predicted_coords": [round(c, 3) for c in pred_coords],
        "gradcam_heatmap": cam_small,
        "confidence": round(float(torch.max(torch.softmax(shape_logits, dim=-1)).item()), 3),
    }


@app.post("/api/train/step")
async def train_step(episodes: int = 5):
    """Run rapid training episodes with D3QN + HER."""
    recent_losses = []
    rewards_history = []
    success_count = 0

    for ep in range(episodes):
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

            # Train network
            loss = agent.update()
            if loss is not None:
                recent_losses.append(loss)

        # Store with HER
        agent.replay_buffer.store_episode_with_her(
            ep_transitions, env.compute_her_reward
        )
        agent.decay_epsilon()

        rewards_history.append(round(ep_reward, 2))
        if info.get("is_success", False):
            success_count += 1

    summary = {
        "episodes_trained": episodes,
        "mean_reward": round(float(np.mean(rewards_history)), 2) if rewards_history else 0.0,
        "success_rate": round((success_count / episodes) * 100, 1),
        "mean_loss": round(float(np.mean(recent_losses)), 4) if recent_losses else 0.0,
        "current_epsilon": round(agent.epsilon, 4),
        "total_steps": agent.total_steps,
        "buffer_size": len(agent.replay_buffer),
    }

    # Record batch to server training history
    batch_record = {
        "ts": int(time.time() * 1000),
        "mode": "live",
        "batch": len(TRAIN_RUNS_LOG) + 1,
        "episodes": episodes,
        "success": summary["success_rate"],
        "reward": summary["mean_reward"],
        "loss": summary["mean_loss"],
        "epsilon": summary["current_epsilon"],
        "steps": summary["total_steps"],
    }
    TRAIN_RUNS_LOG.append(batch_record)

    return summary


@app.get("/api/train/history")
async def get_train_history():
    """Retrieve persisted training run history."""
    return TRAIN_RUNS_LOG


@app.get("/api/episodes")
async def get_episodes():
    """Retrieve recorded episodes history."""
    return EPISODES_LOG


@app.post("/api/episodes")
async def record_episode(ep: EpisodeRecord):
    """Record an episode outcome from frontend or automated execution."""
    rec = ep.model_dump()
    EPISODES_LOG.append(rec)
    if len(EPISODES_LOG) > 300:
        EPISODES_LOG.pop(0)
    return {"status": "recorded", "id": ep.id}


@app.delete("/api/episodes")
async def clear_episodes():
    """Clear recorded episodes."""
    EPISODES_LOG.clear()
    return {"status": "cleared"}


@app.get("/api/benchmark")
async def run_benchmark(episodes_per_task: int = Query(default=20, ge=1, le=100), seed: int = Query(default=2027, ge=0)):
    """Compare all policies on a shared, task-balanced scene set."""
    results = comparator.run_full_benchmark_suite(episodes_per_task=episodes_per_task, seed=seed)
    return {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "seed": seed,
        "episodes_per_task": episodes_per_task,
        "matched_scenarios": episodes_per_task * 3,
        "benchmark_results": results,
    }


@app.post("/api/explain")
async def explain_telemetry(req: ExplainRequest):
    """Generate grounded XAI forensic debrief for latest episode."""
    explanation = await ollama.explain_telemetry(req.telemetry, req.model_name)
    return {
        "explanation": explanation,
        "telemetry_evaluated": req.telemetry,
    }


# WebSocket for 60 FPS live simulation stream
@app.websocket("/ws/simulate")
async def websocket_simulation(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            cmd = data.get("command")

            if cmd == "reset":
                task_id = data.get("task_id", 1)
                obs = env.reset(task_id=task_id)
                img = renderer.render_scene(
                    obs["fk"], obs["objects"], env.obstacles, RECEPTACLES, obs["gripper_closed"]
                )
                await websocket.send_json({
                    "event": "state",
                    "observation": obs,
                    "rendered_image": image_to_base64(img),
                })

            elif cmd == "step":
                action = data.get("action")
                obs_before = env.get_observation()
                if action is None:
                    action, q_vals = agent.select_action(obs_before["vector"], evaluate=True)
                else:
                    _, q_vals = agent.select_action(obs_before["vector"], evaluate=True)

                obs_after, reward, term, trunc, info = env.step(action)
                img = renderer.render_scene(
                    obs_after["fk"], obs_after["objects"], env.obstacles, RECEPTACLES, obs_after["gripper_closed"]
                )
                await websocket.send_json({
                    "event": "step_result",
                    "observation": obs_after,
                    "reward": round(reward, 3),
                    "terminated": term,
                    "truncated": trunc,
                    "info": info,
                    "action": action,
                    "q_values": [round(q, 4) for q in q_vals],
                    "rendered_image": image_to_base64(img),
                })
    except WebSocketDisconnect:
        pass


# Static React Frontend hosting if built
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
