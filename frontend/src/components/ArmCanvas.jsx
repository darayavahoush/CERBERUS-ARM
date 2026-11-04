import React, { useRef, useEffect, useState } from 'react';
import { worldToCanvas, canvasToWorld, COLORS, RECEPTACLES, radToDeg } from '../utils/kinematics';
import { Crosshair, ShieldAlert, Sparkles, Navigation } from 'lucide-react';

export default function ArmCanvas({
  observation,
  obstacles = [],
  onObjectClick,
  onCanvasClick,
  interactive = true,
}) {
  const canvasRef = useRef(null);
  const [trail, setTrail] = useState([]);
  const [hoveredEntity, setHoveredEntity] = useState(null);

  // Maintain end-effector trajectory trail
  useEffect(() => {
    if (observation?.fk?.ee) {
      setTrail((prev) => {
        const next = [...prev, observation.fk.ee];
        return next.length > 35 ? next.slice(next.length - 35) : next;
      });
    }
  }, [observation?.fk?.ee]);

  // Main high-DPI rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 1. Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw subtle polar workspace grid
    const basePx = worldToCanvas(0, 0, width, height);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
    ctx.lineWidth = 1;

    // Reachable workspace limit circles
    const scaleFactor = width / 4.4;
    [0.2, 0.6, 1.0, 1.4, 1.8].forEach((r) => {
      ctx.beginPath();
      ctx.arc(basePx.x, basePx.y, r * scaleFactor, Math.PI, 0, false);
      ctx.stroke();
    });

    // 3. Draw Trajectory Trail
    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        const p1 = worldToCanvas(trail[i - 1][0], trail[i - 1][1], width, height);
        const p2 = worldToCanvas(trail[i][0], trail[i][1], width, height);
        const alpha = (i / trail.length) * 0.7;
        ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
        ctx.lineWidth = (i / trail.length) * 4;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // 4. Draw Receptacles / Bins
    const currentGoalKey = observation?.goal_key || 'blue_bin';
    Object.entries(RECEPTACLES).forEach(([key, rec]) => {
      const p = worldToCanvas(rec.pos[0], rec.pos[1], width, height);
      const radPx = rec.radius * scaleFactor;
      const isTarget = key === currentGoalKey;

      // Glow if target
      if (isTarget) {
        ctx.shadowColor = COLORS[rec.color];
        ctx.shadowBlur = 18;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, radPx, 0, Math.PI * 2);
      ctx.fillStyle = isTarget ? `${COLORS[rec.color]}22` : '#1e293b55';
      ctx.fill();
      ctx.strokeStyle = isTarget ? COLORS[rec.color] : '#475569';
      ctx.lineWidth = isTarget ? 2.5 : 1.5;
      ctx.setLineDash(isTarget ? [5, 3] : []);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = isTarget ? '#f8fafc' : '#94a3b8';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(rec.label, p.x, p.y + radPx + 14);
    });

    // 5. Draw Obstacles (Hazard Zone)
    (obstacles.length ? obstacles : [{ x: 0.0, y: 0.85, radius: 0.22 }]).forEach((obs) => {
      const p = worldToCanvas(obs.x, obs.y, width, height);
      const radPx = obs.radius * scaleFactor;

      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radPx, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Danger stripes or label
      ctx.fillStyle = '#fca5a5';
      ctx.font = '9px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('HAZARD ZONE', p.x, p.y + 3);
    });

    // 6. Draw Objects
    const objects = observation?.objects || [];
    const targetIdx = observation?.target_idx ?? 0;

    objects.forEach((obj, idx) => {
      const p = worldToCanvas(obj.x, obj.y, width, height);
      const isTarget = idx === targetIdx;
      const sizePx = (obj.radius || 0.08) * scaleFactor;
      const col = COLORS[obj.color] || '#ffffff';

      if (isTarget) {
        ctx.shadowColor = col;
        ctx.shadowBlur = 15;
      }

      ctx.fillStyle = col;
      ctx.strokeStyle = isTarget ? '#ffffff' : '#000000';
      ctx.lineWidth = isTarget ? 2 : 1;

      if (obj.shape === 'cube') {
        ctx.fillRect(p.x - sizePx, p.y - sizePx, sizePx * 2, sizePx * 2);
        ctx.strokeRect(p.x - sizePx, p.y - sizePx, sizePx * 2, sizePx * 2);
      } else if (obj.shape === 'sphere') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, sizePx, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (obj.shape === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - sizePx);
        ctx.lineTo(p.x - sizePx, p.y + sizePx);
        ctx.lineTo(p.x + sizePx, p.y + sizePx);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (obj.shape === 'star') {
        ctx.beginPath();
        for (let s = 0; s < 5; s++) {
          ctx.lineTo(
            p.x + sizePx * Math.cos(((18 + s * 72) * Math.PI) / 180),
            p.y - sizePx * Math.sin(((18 + s * 72) * Math.PI) / 180)
          );
          ctx.lineTo(
            p.x + (sizePx / 2) * Math.cos(((54 + s * 72) * Math.PI) / 180),
            p.y - (sizePx / 2) * Math.sin(((54 + s * 72) * Math.PI) / 180)
          );
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // Target pointer
      if (isTarget) {
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sizePx + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // 7. Draw Robotic Arm (Base, Links, Joints, Gripper)
    if (observation?.fk) {
      const b = worldToCanvas(observation.fk.base[0], observation.fk.base[1], width, height);
      const e = worldToCanvas(observation.fk.elbow[0], observation.fk.elbow[1], width, height);
      const t = worldToCanvas(observation.fk.ee[0], observation.fk.ee[1], width, height);

      // Base Pedestal
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Link 1 (Base -> Elbow)
      const gradLink1 = ctx.createLinearGradient(b.x, b.y, e.x, e.y);
      gradLink1.addColorStop(0, '#0284c7');
      gradLink1.addColorStop(1, '#38bdf8');
      ctx.strokeStyle = gradLink1;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();

      // Link 2 (Elbow -> EE)
      const gradLink2 = ctx.createLinearGradient(e.x, e.y, t.x, t.y);
      gradLink2.addColorStop(0, '#38bdf8');
      gradLink2.addColorStop(1, '#06b6d4');
      ctx.strokeStyle = gradLink2;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();

      // Joints
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      // Base joint
      ctx.beginPath();
      ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Elbow joint
      ctx.beginPath();
      ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Gripper
      const isGripperClosed = observation.gripper_closed;
      const isGrasped = observation.grasped_idx !== null && observation.grasped_idx !== undefined;
      ctx.shadowColor = isGrasped ? '#10b981' : isGripperClosed ? '#f43f5e' : '#06b6d4';
      ctx.shadowBlur = 14;

      ctx.fillStyle = isGrasped ? '#10b981' : isGripperClosed ? '#f43f5e' : '#06b6d4';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Magnetic grasp aura
      if (isGrasped) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 16, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [observation, obstacles, trail]);

  const handleCanvasClick = (e) => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const world = canvasToWorld(px, py, canvas.clientWidth, canvas.clientHeight);

    // Check if clicked an object
    const objects = observation?.objects || [];
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      const dist = Math.hypot(world.wx - obj.x, world.wy - obj.y);
      if (dist < 0.2) {
        if (onObjectClick) onObjectClick(i, obj);
        return;
      }
    }

    if (onCanvasClick) onCanvasClick(world);
  };

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-xl overflow-hidden glass-panel border border-cyan-500/20 shadow-2xl flex flex-col">
      {/* Top Overlay Telemetry Chips */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-slate-900/90 text-cyan-400 border border-cyan-500/30 backdrop-blur-md flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            2-DOF RR KINEMATICS
          </span>
          <span className="px-2 py-1 text-xs font-mono rounded-md bg-slate-900/80 text-slate-300 border border-slate-700/50">
            θ₁: {observation?.theta1 ? radToDeg(observation.theta1) : '60.0'}°
          </span>
          <span className="px-2 py-1 text-xs font-mono rounded-md bg-slate-900/80 text-slate-300 border border-slate-700/50">
            θ₂: {observation?.theta2 ? radToDeg(observation.theta2) : '60.0'}°
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md backdrop-blur-md border ${
              observation?.grasped_idx !== null && observation?.grasped_idx !== undefined
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                : observation?.gripper_closed
                ? 'bg-rose-950/80 text-rose-400 border-rose-500/40'
                : 'bg-slate-900/80 text-slate-400 border-slate-700/50'
            }`}
          >
            {observation?.grasped_idx !== null && observation?.grasped_idx !== undefined
              ? 'OBJECT LOCKED (MAGNETIC)'
              : observation?.gripper_closed
              ? 'GRIPPER CLOSED'
              : 'GRIPPER OPEN'}
          </span>
        </div>
      </div>

      {/* Main HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full flex-1 cursor-crosshair"
      />

      {/* Bottom Status bar */}
      <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-400">
            <Navigation className="w-3 h-3 text-cyan-400" />
            EE: ({observation?.fk?.ee ? observation.fk.ee[0].toFixed(2) : '0.00'},{' '}
            {observation?.fk?.ee ? observation.fk.ee[1].toFixed(2) : '0.00'})m
          </span>
          <span className="text-slate-500">|</span>
          <span>
            Manipulability w(q):{' '}
            <span
              className={
                (observation?.manipulability ?? 1) < 0.08 ? 'text-amber-400' : 'text-emerald-400'
              }
            >
              {(observation?.manipulability ?? 0.707).toFixed(3)}
            </span>
          </span>
        </div>
        <div className="text-slate-500 text-[11px]">
          Target: {observation?.objects?.[observation?.target_idx || 0]?.color}{' '}
          {observation?.objects?.[observation?.target_idx || 0]?.shape}
        </div>
      </div>
    </div>
  );
}
