"""Asynchronous Local Ollama Client with Resilient Neuro-Symbolic Fallback."""

import json
from typing import Dict, Any, List, Optional
import httpx

from backend.llm.prompt_templates import (
    ROBOTIC_COMPILER_SYSTEM_PROMPT,
    EXPLAINABLE_AI_SYSTEM_PROMPT,
)
from backend.llm.neuro_symbolic import NeuroSymbolicReasoningEngine


class OllamaRoboticClient:
    """Interface to locally deployed Ollama LLMs with automatic neuro-symbolic failover."""

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        default_model: str = "llama3.2",
        timeout_seconds: float = 8.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model
        self.timeout = timeout_seconds

    async def check_status(self) -> Dict[str, Any]:
        """Check if local Ollama daemon is reachable and list downloaded models."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    return {
                        "online": True,
                        "models": models,
                        "active_model": models[0] if models else self.default_model,
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
                    "format": "json",
                }
                res = await client.post(f"{self.base_url}/api/generate", json=payload)
                if res.status_code == 200:
                    raw_response = res.json().get("response", "{}")
                    parsed = json.loads(raw_response)
                    # Verify required keys
                    if "target_shape" in parsed and "destination_bin" in parsed:
                        parsed["source"] = f"ollama_{model}"
                        return parsed
        except Exception:
            # Automatic graceful failover to deterministic neuro-symbolic engine
            pass

        fallback = NeuroSymbolicReasoningEngine.parse_instruction(instruction)
        fallback["source"] = "neuro_symbolic_grounded_engine"
        return fallback

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
