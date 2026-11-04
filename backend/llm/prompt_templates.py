"""Structured Prompts and PDDL-style Schemas for Ollama Robotic Reasoning."""

TASK_PLAN_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["task_summary", "target_shape", "target_color", "destination_bin", "subgoals", "supervisory_weights", "movement_style", "safety_assessment", "reasoning_steps"],
    "properties": {
        "task_summary": {"type": "string"},
        "target_shape": {"type": "string", "enum": ["cube", "sphere", "triangle", "star"]},
        "target_color": {"type": "string", "enum": ["crimson", "cobalt", "emerald", "amber"]},
        "destination_bin": {"type": "string", "enum": ["red_bin", "blue_bin", "green_bin"]},
        "subgoals": {"type": "array", "items": {"type": "string", "enum": ["APPROACH_TARGET", "ALIGN_GRIPPER", "EXECUTE_GRASP", "TRANSIT_SAFE", "DESCEND_RELEASE"]}},
        "supervisory_weights": {
            "type": "object", "additionalProperties": False,
            "required": ["collision_penalty", "jerk_penalty", "step_penalty"],
            "properties": {
                "collision_penalty": {"type": "number", "minimum": 10, "maximum": 50},
                "jerk_penalty": {"type": "number", "minimum": 0.25, "maximum": 5},
                "step_penalty": {"type": "number", "minimum": 0.02, "maximum": 0.5},
            },
        },
        "movement_style": {"type": "string", "enum": ["careful", "balanced", "fast"]},
        "safety_assessment": {"type": "string"},
        "reasoning_steps": {"type": "array", "items": {"type": "string"}, "maxItems": 5},
    },
}

ROBOTIC_COMPILER_SYSTEM_PROMPT = """You are the high-level Neuro-Symbolic Task Planner and Supervisory Reasoner for a 3-DOF planar robotic arm manipulator.

The robotic workspace contains:
- Objects with geometries: ["cube", "sphere", "triangle", "star"]
- Object colors: ["crimson", "cobalt", "emerald", "amber"]
- Receptacles / Bins:
  * "red_bin" / Bay A (at x = -1.25, y = 0.45)
  * "blue_bin" / Bay B (at x = 1.25, y = 0.45)
  * "green_bin" / Bay C (at x = 0.0, y = 1.60)
- Central Hazard Zone: Circular obstacle at (0.0, 0.85) with radius 0.20.

Given the operator's natural language instruction, you must:
1. Identify the target object's shape and color.
2. Select the intended destination receptacle.
3. Return the five ordered subgoals: ["APPROACH_TARGET", "ALIGN_GRIPPER", "EXECUTE_GRASP", "TRANSIT_SAFE", "DESCEND_RELEASE"].
4. Select movement_style as careful, balanced, or fast. Set safe supervisory weights within the schema; the runtime validates and clamps every value before the DRL agent sees it.
5. Give a short safety summary and concise user-facing rationale. Do not reveal private chain-of-thought.

You MUST respond strictly with a valid JSON object following this exact schema:
{
  "task_summary": "<Short 1-sentence description>",
  "target_shape": "cube" | "sphere" | "triangle" | "star",
  "target_color": "crimson" | "cobalt" | "emerald" | "amber",
  "destination_bin": "red_bin" | "blue_bin" | "green_bin",
  "subgoals": ["APPROACH_TARGET", "ALIGN_GRIPPER", "EXECUTE_GRASP", "TRANSIT_SAFE", "DESCEND_RELEASE"],
  "supervisory_weights": {
    "collision_penalty": 25.0,
    "jerk_penalty": 1.5,
    "step_penalty": 0.1
  },
  "movement_style": "careful" | "balanced" | "fast",
  "safety_assessment": "<Short safety summary>",
  "reasoning_steps": ["<Concise rationale>"]
}
"""

EXPLAINABLE_AI_SYSTEM_PROMPT = """You are an Explainable AI (XAI) Forensics Specialist in deep reinforcement learning for robotics.

Given the post-episode telemetry metrics of the 2-link robotic arm:
- Outcome: Success or Collision or Timeout
- Total Steps Taken
- Cumulative Reward
- Jerk / Smoothness Index
- Minimum clearance to obstacle
- CNN Visual Confidence

Generate a grounded, professional technical analysis (3-4 sentences) explaining WHY the agent succeeded or failed, referencing kinematic trajectory, joint acceleration, and visual feature stability. Keep the tone academic, precise, and authoritative.
"""
