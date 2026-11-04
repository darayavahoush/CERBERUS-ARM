"""Asynchronous Local Ollama Client with Resilient Neuro-Symbolic Fallback."""

import json
import math
from typing import Dict, Any, List, Optional
import httpx

from backend.llm.prompt_templates import (
    ROBOTIC_COMPILER_SYSTEM_PROMPT,
    EXPLAINABLE_AI_SYSTEM_PROMPT,
    TASK_PLAN_SCHEMA,
)
from backend.llm.neuro_symbolic import NeuroSymbolicReasoningEngine


class OllamaRoboticClient:
    """Interface to locally deployed Ollama LLMs with automatic neuro-symbolic failover."""

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        default_model: str = "qwen2.5:3b-instruct",
        timeout_seconds: float = 45.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model
        self.timeout = timeout_seconds

    @staticmethod
    def validate_task_plan(plan: Dict[str, Any], instruction: str, source: str = "ollama") -> Dict[str, Any]:
        """Validate the model's symbolic goals and derive bounded DRL constraints."""
        fallback = NeuroSymbolicReasoningEngine.parse_instruction(instruction)
        shapes = {"cube", "sphere", "triangle", "star"}
        colors = {"crimson", "cobalt", "emerald", "amber"}
        bins = {"red_bin", "blue_bin", "green_bin"}
        if plan.get("target_shape") not in shapes or plan.get("target_color") not in colors or plan.get("destination_bin") not in bins:
            plan = dict(fallback)

        incoming_weights = plan.get("supervisory_weights", {})
        default_weights = fallback["supervisory_weights"]
        limits = {"collision_penalty": (10.0, 50.0), "jerk_penalty": (0.25, 5.0), "step_penalty": (0.02, 0.5)}
        weights = {}
        for key, (minimum, maximum) in limits.items():
            value = incoming_weights.get(key, default_weights[key])
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                value = default_weights[key]
            weights[key] = float(max(minimum, min(maximum, value)))

        style = plan.get("movement_style", fallback.get("movement_style", "balanced"))
        if style not in {"careful", "balanced", "fast"}:
            style = "balanced"
        constraints_by_style = {
            "careful": {"minimum_clearance_m": 0.075, "minimum_manipulability": 0.10, "max_steps": 120, "micro_alignment_bias": 0.035},
            "balanced": {"minimum_clearance_m": 0.045, "minimum_manipulability": 0.05, "max_steps": 120, "micro_alignment_bias": 0.015},
            "fast": {"minimum_clearance_m": 0.025, "minimum_manipulability": 0.03, "max_steps": 120, "micro_alignment_bias": 0.0},
        }
        result = dict(plan)
        result.update({
            "source": source,
            "target_shape": plan["target_shape"],
            "target_color": plan["target_color"],
            "destination_bin": plan["destination_bin"],
            "subgoals": ["APPROACH_TARGET", "ALIGN_GRIPPER", "EXECUTE_GRASP", "TRANSIT_SAFE", "DESCEND_RELEASE"],
            "supervisory_weights": weights,
            "movement_style": style,
            "execution_constraints": constraints_by_style[style],
            "reasoning_steps": [str(item)[:240] for item in plan.get("reasoning_steps", [])[:5] if isinstance(item, str)],
            "safety_assessment": str(plan.get("safety_assessment", "Runtime action shielding enabled."))[:400],
        })
        return result

    async def check_status(self) -> Dict[str, Any]:
        """Check if local Ollama daemon is reachable and list downloaded models."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    # Select Qwen if available, otherwise default or first model
                    active = next(
                        (m for m in models if "qwen" in m.lower()),
                        self.default_model if self.default_model in models else (models[0] if models else self.default_model),
                    )
                    return {
                        "online": True,
                        "models": models,
                        "active_model": active,
                        "backend": "local_ollama",
                    }
        except Exception:
            pass

        return {
            "online": False,
            "models": [],
            "active_model": "neuro_symbolic_engine",
            "backend": "neuro_symbolic_fallback",
        }

    async def compile_task(
        self, instruction: str, model_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Compile natural language task into validated PDDL-style goal representation."""
        model = model_name or self.default_model
        prompt = f"Natural Language Operator Instruction: \"{instruction}\"\nGenerate the structured JSON plan according to instructions."

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "model": model,
                    "prompt": prompt,
                    "system": ROBOTIC_COMPILER_SYSTEM_PROMPT,
                    "stream": False,
                    "format": TASK_PLAN_SCHEMA,
                }
                res = await client.post(f"{self.base_url}/api/generate", json=payload)
                if res.status_code == 200:
                    raw_response = res.json().get("response", "{}")
                    parsed = json.loads(raw_response)
                    return self.validate_task_plan(parsed, instruction, source=f"ollama_{model}")
        except Exception:
            # Automatic graceful failover to deterministic neuro-symbolic engine
            pass

        fallback = NeuroSymbolicReasoningEngine.parse_instruction(instruction)
        return self.validate_task_plan(fallback, instruction, source="neuro_symbolic_grounded_engine")

    async def explain_telemetry(
        self, telemetry: Dict[str, Any], model_name: Optional[str] = None
    ) -> str:
        """Generate grounded post-episode forensic debrief."""
        model = model_name or self.default_model
        prompt = (
            f"Episode Telemetry:\n"
            f"- Status: {'SUCCESS' if telemetry.get('is_success') else ('COLLISION' if telemetry.get('is_collision') else 'TIMEOUT')}\n"
            f"- Steps: {telemetry.get('steps', 0)}\n"
            f"- Cumulative Return: {telemetry.get('reward', 0.0):.2f}\n"
            f"- Jerk Index: {telemetry.get('jerk', 0.0):.2f}\n"
            f"- Perception Confidence: {telemetry.get('cnn_confidence', 0.95):.2f}\n\n"
            f"Provide an authoritative forensic debrief:"
        )

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "model": model,
                    "prompt": prompt,
                    "system": EXPLAINABLE_AI_SYSTEM_PROMPT,
                    "stream": False,
                }
                res = await client.post(f"{self.base_url}/api/generate", json=payload)
                if res.status_code == 200:
                    text = res.json().get("response", "").strip()
                    if len(text) > 20:
                        return text
        except Exception:
            pass

        return NeuroSymbolicReasoningEngine.generate_xai_explanation(telemetry)
