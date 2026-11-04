"""LangGraph Autonomous Orchestration Agent for CERBERUS-ARM.

Orchestrates the Tri-Modal pipeline:
1. Head 1 (Perception): CoordConv CNN Feature Extraction & Object Grounding.
2. Head 3 (Cognition): Local Qwen 2.5 (Ollama) Neuro-Symbolic PDDL Task Planner.
3. Pre-flight Kinematics & Singularity Validator (Yoshikawa Manipulability).
4. Head 2 (Execution): Goal-Conditioned Dueling Double-DQN (D3QN + HER).
5. Post-Hoc Forensics: Explainable AI (XAI) Debrief with Qwen 2.5.
"""

from typing import Dict, Any, List, Optional, TypedDict, Annotated
import numpy as np
import torch
import math

from langgraph.graph import StateGraph, START, END

from backend.env.robotic_arm_env import RoboticArmEnv, RECEPTACLES
from backend.env.generator import WorkspaceRenderer
from backend.models.perception_cnn import MultiTaskPerceptionCNN
from backend.agent.d3qn_agent import D3QNAgent
from backend.llm.ollama_client import OllamaRoboticClient


class CerberusAgentState(TypedDict):
    """LangGraph State representation for the robotic manipulation lifecycle."""
    instruction: str
    model_name: str
    task_id: int
    max_execution_steps: int

    # Perception outputs
    perception: Dict[str, Any]
    detected_objects: List[Dict[str, Any]]

    # PDDL Task Plan
    plan: Dict[str, Any]
    supervisory_weights: Dict[str, float]
    policy_guidance: Dict[str, Any]
    target_grounding: Dict[str, Any]
    policy_learning: Dict[str, Any]
    replay_episode: List[Dict[str, Any]]
    safety_interventions: int

    # Pre-flight Kinematics & Safety
    safety_assessment: Dict[str, Any]
    is_safe: bool

    # DRL Execution
    execution_status: str  # "pending", "success", "collision", "timeout"
    steps_taken: int
    cumulative_reward: float
    jerk_index: float
    trajectory: List[Dict[str, Any]]
    final_observation: Dict[str, Any]

    # Post-hoc Forensics
    xai_debrief: str
    trace_logs: List[str]


class LangGraphCerberusOrchestrator:
    """End-to-end LangGraph StateGraph Orchestration Engine."""

    def __init__(
        self,
        env: RoboticArmEnv,
        agent: D3QNAgent,
        cnn_model: MultiTaskPerceptionCNN,
        renderer: WorkspaceRenderer,
        ollama_client: Optional[OllamaRoboticClient] = None,
        device: str = "cpu",
    ):
        self.env = env
        self.agent = agent
        self.cnn_model = cnn_model
        self.renderer = renderer
        self.ollama = ollama_client or OllamaRoboticClient(default_model="qwen2.5:3b-instruct")
        self.device = device

        # Compile the LangGraph
        self.graph = self._build_graph()

    def _build_graph(self) -> Any:
        workflow = StateGraph(CerberusAgentState)

        # Register nodes
        workflow.add_node("perceive_workspace", self.node_perceive)
        workflow.add_node("plan_task_qwen", self.node_plan)
        workflow.add_node("validate_task_plan", self.node_validate_plan)
        workflow.add_node("ground_target_and_goal", self.node_ground_goal)
        workflow.add_node("validate_safety", self.node_validate_safety)
        workflow.add_node("replan_with_caution", self.node_replan_with_caution)
        workflow.add_node("execute_d3qn_policy", self.node_execute)
        workflow.add_node("explain_forensics_xai", self.node_explain)

        # Define graph edges
        workflow.add_edge(START, "perceive_workspace")
        workflow.add_edge("perceive_workspace", "plan_task_qwen")
        workflow.add_edge("plan_task_qwen", "validate_task_plan")
        workflow.add_edge("validate_task_plan", "ground_target_and_goal")
        workflow.add_edge("ground_target_and_goal", "validate_safety")

        # Conditional branching based on safety & singularity pre-flight check
        workflow.add_conditional_edges(
            "validate_safety",
            self.route_safety,
            {
                "safe": "execute_d3qn_policy",
                "unsafe": "replan_with_caution",
            },
        )

        workflow.add_edge("replan_with_caution", "execute_d3qn_policy")
        workflow.add_node("learn_from_episode", self.node_learn_from_episode)
        workflow.add_edge("execute_d3qn_policy", "learn_from_episode")
        workflow.add_edge("learn_from_episode", "explain_forensics_xai")
        workflow.add_edge("explain_forensics_xai", END)

        return workflow.compile()

    # --- Node Implementations ---

    async def node_perceive(self, state: CerberusAgentState) -> Dict[str, Any]:
        """Node 1: Run CoordConv Multi-Task CNN to ground workspace perception."""
        if not self.env.objects:
            self.env.reset(task_id=state.get("task_id", 1))
        obs = self.env.get_observation()
        pil_img = self.renderer.render_scene(
            obs["fk"], obs["objects"], self.env.obstacles, RECEPTACLES, obs["gripper_closed"]
        )

        arr = np.array(pil_img, dtype=np.float32) / 255.0
        tensor = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0).to(self.device)

        self.cnn_model.eval()
        with torch.no_grad():
            _, shape_logits, color_logits, coords = self.cnn_model(tensor)
            shape_probs = torch.softmax(shape_logits, dim=-1)
            color_probs = torch.softmax(color_logits, dim=-1)
            pred_s = int(torch.argmax(shape_probs, dim=-1).item())
            pred_c = int(torch.argmax(color_probs, dim=-1).item())
            confidence = float(torch.minimum(shape_probs.max(), color_probs.max()).item())
            pred_xy = coords.squeeze().cpu().numpy().tolist()

        logs = list(state.get("trace_logs", []))
        logs.append(
            f"[Head 1: Perception] Processed 2D workspace tensor. Predicted Primary Object: "
            f"ShapeIdx={pred_s}, ColorIdx={pred_c}, NormalizedXY={pred_xy}"
        )

        return {
            "perception": {
                "pred_shape_idx": pred_s,
                "pred_color_idx": pred_c,
                "pred_coordinates": pred_xy,
                "shape_confidence": float(shape_probs.max().item()),
                "color_confidence": float(color_probs.max().item()),
                "confidence": confidence,
            },
            "detected_objects": obs.get("objects", []),
            "trace_logs": logs,
        }

    async def node_plan(self, state: CerberusAgentState) -> Dict[str, Any]:
        """Node 2: High-Level Task Decomposition via Local Qwen 2.5 (Ollama)."""
        instruction = state["instruction"]
        model = state.get("model_name", "qwen2.5:3b-instruct")

        plan = await self.ollama.compile_task(instruction, model_name=model)

        logs = list(state.get("trace_logs", []))
        logs.append(
            f"[Head 3: Cognition] Qwen plan compiled via {plan.get('source')}: "
            f"Goal={plan.get('target_color')} {plan.get('target_shape')} -> {plan.get('destination_bin')}. "
            f"Subgoals: {plan.get('subgoals', [])}"
        )

        return {
            "plan": plan,
            "supervisory_weights": plan.get("supervisory_weights", {}),
            "trace_logs": logs,
        }

    async def node_validate_plan(self, state: CerberusAgentState) -> Dict[str, Any]:
        """Validate target ontology, bins, reward bounds, and DRL constraints before use."""
        try:
            plan = self.ollama.validate_task_plan(
                state.get("plan", {}),
                state["instruction"],
                source=state.get("plan", {}).get("source", "validated_fallback"),
            )
        except (TypeError, ValueError):
            fallback = self.ollama.validate_task_plan(
                {}, state["instruction"], source="neuro_symbolic_validated_fallback"
            )
            plan = fallback
        weights = plan["supervisory_weights"]
        for key, value in weights.items():
            self.env.supervisory_weights[key] = float(value)
        guidance = {
            "movement_style": plan["movement_style"],
            **plan["execution_constraints"],
            "subgoals": list(plan["subgoals"]),
            "action_shield": "swept_collision_and_singularity_mask",
        }
        logs = list(state.get("trace_logs", []))
        logs.append(
            f"[Plan Validator] Accepted {plan['target_color']} {plan['target_shape']} -> {plan['destination_bin']}; "
            f"style={plan['movement_style']}, collision={weights['collision_penalty']:.1f}, "
            f"clearance>={guidance['minimum_clearance_m']:.3f}m, w(q)>={guidance['minimum_manipulability']:.2f}."
        )
        return {"plan": plan, "supervisory_weights": weights, "policy_guidance": guidance, "trace_logs": logs}

    async def node_ground_goal(self, state: CerberusAgentState) -> Dict[str, Any]:
        """Ground the validated symbolic target into the simulator's object registry."""
        plan = state["plan"]
        obs = self.env.reset(
            task_id=state.get("task_id", 1),
            target_shape=plan["target_shape"],
            target_color=plan["target_color"],
            target_bin=plan["destination_bin"],
        )
        target = obs["target_object"]
        matched = target["shape"] == plan["target_shape"] and target["color"] == plan["target_color"]
        if not matched:
            raise ValueError("Validated target could not be grounded in the simulated scene")
        grounding = {
            "object_id": target["id"],
            "shape": target["shape"],
            "color": target["color"],
            "object_position": [target["x"], target["y"]],
            "destination_bin": self.env.target_receptacle_key,
            "destination_position": list(self.env.goal_pos),
            "phase": "approach_target",
        }
        logs = list(state.get("trace_logs", []))
        logs.append(
            f"[Goal Grounding] {grounding['object_id']} resolved at ({target['x']:.3f}, {target['y']:.3f})m; "
            f"destination {grounding['destination_bin']} at ({self.env.goal_pos[0]:.2f}, {self.env.goal_pos[1]:.2f})m."
        )
        return {"target_grounding": grounding, "trace_logs": logs}

    async def node_validate_safety(self, state: CerberusAgentState) -> Dict[str, Any]:
        """Node 3: Kinematic Singularity (Yoshikawa) and Obstacle Clearance Check."""
        theta1, theta2 = self.env.theta1, self.env.theta2
        w = self.env.kinematics.manipulability(theta2, self.env.theta3)

        # Check the full arm footprint and the actual DRL action mask.
        guidance = state.get("policy_guidance", {})
        obstacle = self.env.obstacles[0]
        clearance = self.env.kinematics.circle_clearance(
            theta1, theta2, self.env.theta3,
            obstacle["x"], obstacle["y"], obstacle["radius"],
        )
        action_context = self.env.build_drl_action_context(
            minimum_clearance_m=float(guidance.get("minimum_clearance_m", 0.045)),
            minimum_manipulability=float(guidance.get("minimum_manipulability", 0.05)),
            supervisory_weights=state.get("supervisory_weights", {}),
            micro_alignment_bias=float(guidance.get("micro_alignment_bias", 0.015)),
        )
        safe_action_count = sum(action_context["action_mask"])
        is_safe = (
            w >= float(guidance.get("minimum_manipulability", 0.05))
            and clearance >= 0.0
            and safe_action_count > 0
        )

        logs = list(state.get("trace_logs", []))
        logs.append(
            f"[Pre-Flight Kinematics] Yoshikawa Manipulability w(q)={w:.4f} (threshold=0.05). "
            f"Link Clearance={clearance:.3f}m; {safe_action_count} DRL actions pass the shield. "
            f"Safety Status={'SAFE' if is_safe else 'RISK_DETECTED'}"
        )

        return {
            "safety_assessment": {
                "manipulability": round(w, 4),
                "hazard_clearance": round(clearance, 3),
                "is_safe": is_safe,
                "safe_action_count": safe_action_count,
            },
            "is_safe": is_safe,
            "trace_logs": logs,
        }

    def route_safety(self, state: CerberusAgentState) -> str:
        """Conditional routing based on kinematic safety evaluation."""
        return "safe" if state.get("is_safe", True) else "unsafe"

    async def node_replan_with_caution(self, state: CerberusAgentState) -> Dict[str, Any]:
        """Contingency Node: Elevate supervisory safety weights if risk was flagged."""
        weights = dict(state.get("supervisory_weights", {}))
        weights["collision_penalty"] = min(50.0, max(weights.get("collision_penalty", 25.0) * 1.5, 40.0))
        weights["jerk_penalty"] = min(5.0, max(weights.get("jerk_penalty", 1.5) * 1.5, 3.0))

        for k, v in weights.items():
            if k in self.env.supervisory_weights:
                self.env.supervisory_weights[k] = float(v)

        guidance = dict(state.get("policy_guidance", {}))
        guidance["minimum_clearance_m"] = min(0.12, float(guidance.get("minimum_clearance_m", 0.045)) + 0.025)
        guidance["minimum_manipulability"] = min(0.20, float(guidance.get("minimum_manipulability", 0.05)) + 0.025)
        guidance["micro_alignment_bias"] = max(float(guidance.get("micro_alignment_bias", 0.015)), 0.04)

        logs = list(state.get("trace_logs", []))
        logs.append(
            f"[Supervisory Modulation] Kinematic risk intercepted! Auto-elevated "
            f"collision_penalty={weights['collision_penalty']:.1f}, jerk_penalty={weights['jerk_penalty']:.1f}"
        )

        return {
            "supervisory_weights": weights,
            "policy_guidance": guidance,
            "trace_logs": logs,
        }

    async def node_execute(self, state: CerberusAgentState) -> Dict[str, Any]:
        """Execute DQN-selected actions under the validated language safety shield."""
        max_steps = min(int(state.get("max_execution_steps", self.env.max_steps)), self.env.max_steps)
        obs = self.env.get_observation()
        spawn = dict(obs["target_object"])
        total_reward = 0.0
        trajectory = []
        replay_episode = []
        status = "timeout"
        jerk_acc = 0.0
        safety_interventions = 0
        masked_action_total = 0
        guidance = state.get("policy_guidance", {})

        for step in range(1, max_steps + 1):
            action_context = self.env.build_drl_action_context(
                minimum_clearance_m=float(guidance.get("minimum_clearance_m", 0.045)),
                minimum_manipulability=float(guidance.get("minimum_manipulability", 0.05)),
                supervisory_weights=state.get("supervisory_weights", {}),
                micro_alignment_bias=float(guidance.get("micro_alignment_bias", 0.015)),
            )
            action_mask = action_context["action_mask"]
            action, q_vals = self.agent.select_action(
                obs["vector"], evaluate=True,
                action_mask=action_mask,
                action_bias=action_context["action_bias"],
            )
            raw_action = int(np.argmax(q_vals))
            masked_action_total += len(action_mask) - sum(action_mask)
            if not action_mask[raw_action]:
                safety_interventions += 1

            obs_next, r, term, trunc, info = self.env.step(action)
            total_reward += r
            jerk_acc += info.get("jerk", 0.0)
            target_object = obs_next["target_object"]
            object_xy = (float(target_object["x"]), float(target_object["y"]))
            moved = math.hypot(object_xy[0] - spawn["x"], object_xy[1] - spawn["y"]) > 1e-4
            replay_episode.append({
                "state": list(obs["vector"]),
                "action": action,
                "reward": r,
                "next_state": list(obs_next["vector"]),
                "done": bool(term or trunc),
                "achieved_goal": object_xy,
                "desired_goal": tuple(self.env.goal_pos),
                "goal_scale": float(self.env.kinematics.max_reach),
                "her_valid": bool(target_object.get("is_grasped", False) or moved),
                "is_collision": bool(info.get("is_collision", False)),
                "expert": False,
            })

            trajectory.append({
                "step": step,
                "action": action,
                "policy_phase": "transit_safe" if self.env.grasped_object_idx is not None else "approach_target",
                "reward": round(r, 3),
                "ee_pos": obs_next["fk"]["ee"],
                "safe_action_count": sum(action_mask),
                "q_values": [round(float(value), 4) for value in q_vals],
                "supervisory_bias": [round(float(value), 4) for value in action_context["action_bias"]],
            })

            obs = obs_next

            if info.get("is_collision"):
                status = "collision"
                break
            if info.get("is_success"):
                status = "success"
                break
            if term or trunc:
                break

        avg_jerk = round(jerk_acc / max(len(trajectory), 1), 3)

        logs = list(state.get("trace_logs", []))
        logs.append(
            f"[Head 2: D3QN Policy] Execution completed in {len(trajectory)} steps. "
            f"Status={status.upper()}. Return={total_reward:.2f}; avg jerk={avg_jerk}; "
            f"safety interventions={safety_interventions}; masked actions={masked_action_total}."
        )

        return {
            "execution_status": status,
            "steps_taken": len(trajectory),
            "cumulative_reward": round(total_reward, 2),
            "jerk_index": avg_jerk,
            "trajectory": trajectory,
            "final_observation": obs,
            "replay_episode": replay_episode,
            "safety_interventions": safety_interventions,
            "policy_guidance": {**guidance, "masked_action_total": masked_action_total},
            "trace_logs": logs,
        }

    async def node_learn_from_episode(self, state: CerberusAgentState) -> Dict[str, Any]:
        """Feed real outcomes through HER and bounded online DQN updates."""
        transitions = state.get("replay_episode", [])
        if transitions:
            self.agent.replay_buffer.store_episode_with_her(transitions, self.env.compute_her_reward)
        losses = []
        for _ in range(min(4, max(1, len(transitions) // 16))):
            loss = self.agent.update()
            if loss is not None:
                losses.append(loss)
        feedback = {
            "transitions_added": len(transitions),
            "replay_size": len(self.agent.replay_buffer),
            "updates": len(losses),
            "mean_loss": round(float(np.mean(losses)), 6) if losses else None,
            "last_update_step": self.agent.total_steps,
        }
        logs = list(state.get("trace_logs", []))
        logs.append(
            f"[DRL Feedback] Added {feedback['transitions_added']} outcome transitions and HER relabels; "
            f"replay={feedback['replay_size']}, gradient updates={feedback['updates']}, loss={feedback['mean_loss']}."
        )
        return {"policy_learning": feedback, "replay_episode": [], "trace_logs": logs}

    async def node_explain(self, state: CerberusAgentState) -> Dict[str, Any]:
        """Node 5: Post-Hoc Explainable AI (XAI) Forensics Debrief with Qwen 2.5."""
        model = state.get("model_name", "qwen2.5:3b-instruct")
        telemetry = {
            "is_success": state.get("execution_status") == "success",
            "is_collision": state.get("execution_status") == "collision",
            "steps": state.get("steps_taken", 0),
            "reward": state.get("cumulative_reward", 0.0),
            "jerk": state.get("jerk_index", 0.0),
            "cnn_confidence": state.get("perception", {}).get("confidence", 0.0),
            "safety_interventions": state.get("safety_interventions", 0),
            "minimum_clearance_m": state.get("safety_assessment", {}).get("hazard_clearance"),
        }

        explanation = await self.ollama.explain_telemetry(telemetry, model_name=model)

        logs = list(state.get("trace_logs", []))
        logs.append(f"[XAI Forensics] Grounded post-hoc debrief generated by {model}.")

        return {
            "xai_debrief": explanation,
            "trace_logs": logs,
        }

    async def run(
        self,
        instruction: str,
        task_id: int = 1,
        model_name: str = "qwen2.5:3b-instruct",
        max_steps: int = 120,
    ) -> Dict[str, Any]:
        """Execute full autonomous LangGraph lifecycle for a given user prompt."""
        initial_state: CerberusAgentState = {
            "instruction": instruction,
            "model_name": model_name,
            "task_id": task_id,
            "max_execution_steps": max_steps,
            "perception": {},
            "detected_objects": [],
            "plan": {},
            "supervisory_weights": {},
            "policy_guidance": {},
            "target_grounding": {},
            "policy_learning": {},
            "replay_episode": [],
            "safety_interventions": 0,
            "safety_assessment": {},
            "is_safe": True,
            "execution_status": "pending",
            "steps_taken": 0,
            "cumulative_reward": 0.0,
            "jerk_index": 0.0,
            "trajectory": [],
            "final_observation": {},
            "xai_debrief": "",
            "trace_logs": [],
        }

        result = await self.graph.ainvoke(initial_state)
        return result
