import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Box, Eye, Layers, Maximize2, Minimize2, RotateCcw, Video, Compass, Sparkles, ShieldCheck } from 'lucide-react';
import { radToDeg, RECEPTACLES, STAGE_COLORS, COMPONENT_LABELS } from '../utils/kinematics';

export default function MuJoCoStage3D({
  observation: obs,
  obstacles = [],
  trail = [],
  onSelect,
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const armPartsRef = useRef({});
  const objects3DRef = useRef({});
  const trailLineRef = useRef(null);

  const [cameraMode, setCameraMode] = useState('iso'); // 'iso' | 'top' | 'side'
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract kinematic angles for 3-DOF arm
  const theta1 = obs?.theta1 ?? 0.52;
  const theta2 = obs?.theta2 ?? 0.95;
  const theta3 = obs?.theta3 ?? -0.42;
  const gripperClosed = obs?.gripper_closed ?? false;
  const isGrasped = obs && obs.grasped_idx !== null && obs.grasped_idx !== undefined;
  const targetIdx = obs?.target_idx ?? 0;
  const goalKey = obs?.goal_key || 'blue_bin';

  // 1. Initialize High-Detail Three.js PBR Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || (isExpanded ? 640 : 480);

    // Scene setup with atmospheric industrial lighting
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e17);
    scene.fog = new THREE.FogExp2(0x0a0e17, 0.08);
    sceneRef.current = scene;

    // Perspective Camera (Z-up coordinate frame convention)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.up.set(0, 0, 1);
    camera.position.set(0, -3.4, 2.5);
    camera.lookAt(0, 0.75, 0.15);
    cameraRef.current = camera;

    // WebGL Renderer with ACES ToneMapping & Soft Shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Lighting setup
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(2.5, -2.5, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.camera.left = -2.5;
    keyLight.shadow.camera.right = 2.5;
    keyLight.shadow.camera.top = 2.5;
    keyLight.shadow.camera.bottom = -2.5;
    scene.add(keyLight);

    const blueRimLight = new THREE.PointLight(0x38bdf8, 1.4, 8);
    blueRimLight.position.set(-2.5, 1.5, 2.0);
    scene.add(blueRimLight);

    const yellowAccentLight = new THREE.PointLight(0xf5c518, 0.9, 6);
    yellowAccentLight.position.set(2.5, 2.5, 1.8);
    scene.add(yellowAccentLight);

    // Optical Breadboard Surface (Realistic brushed stainless table with grid)
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x111622,
      metalness: 0.35,
      roughness: 0.65,
    });
    const tableGeo = new THREE.CircleGeometry(2.5, 64);
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.receiveShadow = true;
    scene.add(table);

    // Industrial Metric Coordinate Grid
    const grid = new THREE.GridHelper(5.0, 25, 0x2563eb, 0x1e293b);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = 0.002;
    scene.add(grid);

    // Industrial Sorting Bays (Bay A, Bay B, Bay C)
    Object.entries(RECEPTACLES).forEach(([key, rec]) => {
      const col = STAGE_COLORS[rec.color] || '#3b82f6';
      const colHex = new THREE.Color(col);

      const bayGroup = new THREE.Group();
      bayGroup.position.set(rec.pos[0], rec.pos[1], 0);

      // Outer chamfered rim
      const rim = new THREE.Mesh(
        new THREE.RingGeometry(rec.radius - 0.02, rec.radius + 0.025, 48),
        new THREE.MeshBasicMaterial({ color: colHex, side: THREE.DoubleSide })
      );
      bayGroup.add(rim);

      // Translucent dock pad with glowing inner boundary
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(rec.radius, rec.radius, 0.025, 36),
        new THREE.MeshStandardMaterial({
          color: colHex,
          transparent: true,
          opacity: 0.32,
          roughness: 0.25,
          metalness: 0.2,
        })
      );
      pad.rotation.x = Math.PI / 2;
      pad.position.z = 0.012;
      bayGroup.add(pad);

      // Inner fiducial target ring
      const innerTarget = new THREE.Mesh(
        new THREE.RingGeometry(rec.radius * 0.45, rec.radius * 0.52, 32),
        new THREE.MeshBasicMaterial({ color: colHex, side: THREE.DoubleSide })
      );
      innerTarget.position.z = 0.026;
      bayGroup.add(innerTarget);

      scene.add(bayGroup);
    });

    // Central Optical Inspection Spindle & Laser Safety Light Barrier
    const hazardGroup = new THREE.Group();
    hazardGroup.position.set(0.0, 0.85, 0);

    const pillarMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.20, 0.20, 0.50, 36),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.35,
        roughness: 0.15,
        metalness: 0.3,
      })
    );
    pillarMesh.rotation.x = Math.PI / 2;
    pillarMesh.position.z = 0.25;
    hazardGroup.add(pillarMesh);

    // Glowing laser scanner ring
    const laserScannerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.205, 0.225, 36),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide })
    );
    laserScannerRing.position.z = 0.26;
    hazardGroup.add(laserScannerRing);

    // Optical tower base collar
    const pillarBaseCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.24, 0.06, 36),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9, roughness: 0.2 })
    );
    pillarBaseCollar.rotation.x = Math.PI / 2;
    pillarBaseCollar.position.z = 0.03;
    hazardGroup.add(pillarBaseCollar);

    scene.add(hazardGroup);

    // ========================================================
    // BUILD HIGH-PRECISION 3-DOF INDUSTRIAL ROBOTIC ARM
    // ========================================================
    const armRoot = new THREE.Group();
    scene.add(armRoot);

    // Base Turret Pedestal
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.88, roughness: 0.2 });
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.28 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.96, roughness: 0.1 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.7, roughness: 0.2, emission: 0x0284c7 });

    const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.25, 0.08, 40), baseMat);
    baseCyl.rotation.x = Math.PI / 2;
    baseCyl.position.z = 0.04;
    baseCyl.castShadow = true;
    baseCyl.receiveShadow = true;
    armRoot.add(baseCyl);

    // Glowing Cyan Turret Ring
    const baseHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.009, 16, 48),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.8 })
    );
    baseHalo.position.z = 0.06;
    armRoot.add(baseHalo);

    // 1. Shoulder Turntable (Joint 1 rotates around Z)
    const shoulderGroup = new THREE.Group();
    shoulderGroup.position.set(0, 0, 0.09);
    armRoot.add(shoulderGroup);

    const shoulderHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.11, 32), baseMat);
    shoulderHousing.rotation.x = Math.PI / 2;
    shoulderHousing.castShadow = true;
    shoulderGroup.add(shoulderHousing);

    // Link 1 (Length L1 = 0.90m)
    const link1Cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.90, 24), carbonMat);
    link1Cyl.position.set(0.45, 0, 0.02);
    link1Cyl.rotation.z = Math.PI / 2;
    link1Cyl.castShadow = true;
    shoulderGroup.add(link1Cyl);

    // Hydraulic piston line on Link 1
    const piston1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.85, 16), chromeMat);
    piston1.position.set(0.45, 0.045, 0.02);
    piston1.rotation.z = Math.PI / 2;
    shoulderGroup.add(piston1);

    // 2. Elbow Joint (Joint 2 at local x = 0.90m of Link 1)
    const elbowGroup = new THREE.Group();
    elbowGroup.position.set(0.90, 0, 0.02);
    shoulderGroup.add(elbowGroup);

    const elbowHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.095, 32), baseMat);
    elbowHousing.rotation.x = Math.PI / 2;
    elbowHousing.castShadow = true;
    elbowGroup.add(elbowHousing);

    const elbowPivotDial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.10, 20),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 })
    );
    elbowPivotDial.rotation.x = Math.PI / 2;
    elbowGroup.add(elbowPivotDial);

    // Link 2 (Forearm, Length L2 = 0.70m)
    const link2Cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.70, 24), carbonMat);
    link2Cyl.position.set(0.35, 0, 0);
    link2Cyl.rotation.z = Math.PI / 2;
    link2Cyl.castShadow = true;
    elbowGroup.add(link2Cyl);

    // 3. Wrist Joint (Joint 3 at local x = 0.70m of Link 2)
    const wristGroup = new THREE.Group();
    wristGroup.position.set(0.70, 0, 0);
    elbowGroup.add(wristGroup);

    const wristHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 28), baseMat);
    wristHousing.rotation.x = Math.PI / 2;
    wristHousing.castShadow = true;
    wristGroup.add(wristHousing);

    // Link 3 (Tool Wrist Neck, Length L3 = 0.35m)
    const link3Cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.35, 20), chromeMat);
    link3Cyl.position.set(0.175, 0, 0);
    link3Cyl.rotation.z = Math.PI / 2;
    link3Cyl.castShadow = true;
    wristGroup.add(link3Cyl);

    // 4. Tool Head & Precision Dual-Jaw Servo Gripper at x = 0.35m of Link 3
    const gripperGroup = new THREE.Group();
    gripperGroup.position.set(0.35, 0, 0);
    wristGroup.add(gripperGroup);

    const handBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.05), baseMat);
    handBase.castShadow = true;
    gripperGroup.add(handBase);

    // Sliding Gripper Finger Jaws
    const jawMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.15 });
    const fingerLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.03), jawMat);
    fingerLeft.position.set(0.05, 0.035, 0);
    fingerLeft.castShadow = true;
    gripperGroup.add(fingerLeft);

    const fingerRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.03), jawMat);
    fingerRight.position.set(0.05, -0.035, 0);
    fingerRight.castShadow = true;
    gripperGroup.add(fingerRight);

    // Orange High-Friction Grip Pads
    const padMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.95 });
    const padL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.005, 0.025), padMat);
    padL.position.set(0.05, -0.007, 0);
    fingerLeft.add(padL);

    const padR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.005, 0.025), padMat);
    padR.position.set(0.05, 0.007, 0);
    fingerRight.add(padR);

    // Laser Aim Pointer Emitter
    const laserTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.014, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    laserTip.position.set(0.065, 0, 0);
    gripperGroup.add(laserTip);

    // Save references
    armPartsRef.current = {
      shoulderGroup,
      elbowGroup,
      wristGroup,
      gripperGroup,
      fingerLeft,
      fingerRight,
    };

    // 5. Ghost Trajectory Ribbon
    const maxTrailPts = 60;
    const trailPositions = new Float32Array(maxTrailPts * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75, linewidth: 2 });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLine);
    trailLineRef.current = trailLine;

    // Interactive Drag Controls (Mouse Orbit)
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let spherical = { radius: 4.2, theta: 0.0, phi: 0.65 };

    const updateCameraFromSpherical = () => {
      const x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      const y = -spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      const z = spherical.radius * Math.cos(spherical.phi);
      camera.position.set(x, y, z);
      camera.lookAt(0, 0.75, 0.15);
    };

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = (e.clientX - prevMouse.x) * 0.006;
      const dy = (e.clientY - prevMouse.y) * 0.006;
      prevMouse = { x: e.clientX, y: e.clientY };

      spherical.theta -= dx;
      spherical.phi = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, spherical.phi - dy));
      updateCameraFromSpherical();
    };
    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e) => {
      e.preventDefault();
      spherical.radius = Math.max(1.8, Math.min(7.0, spherical.radius + e.deltaY * 0.003));
      updateCameraFromSpherical();
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Animation Loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || (isExpanded ? 640 : 480);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [isExpanded]);

  // 2. Animate 3-DOF Arm Kinematics & Dynamic Gripper Jaw Spacing
  useEffect(() => {
    const parts = armPartsRef.current;
    if (!parts.shoulderGroup) return;

    // Joint 1: Shoulder Yaw
    parts.shoulderGroup.rotation.z = theta1;
    // Joint 2: Elbow Pitch
    if (parts.elbowGroup) parts.elbowGroup.rotation.z = theta2;
    // Joint 3: Active Wrist Pitch
    if (parts.wristGroup) parts.wristGroup.rotation.z = theta3;

    // Prismatic Gripper Jaws Animation
    if (parts.fingerLeft && parts.fingerRight) {
      const clampOffset = gripperClosed ? 0.012 : 0.038;
      parts.fingerLeft.position.y = clampOffset;
      parts.fingerRight.position.y = -clampOffset;
    }
  }, [theta1, theta2, theta3, gripperClosed]);

  // 3. Render & Synchronize Randomized 3D Workspace Components
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const objects = obs?.objects || [];
    const current3D = objects3DRef.current;

    // Remove old meshes that no longer exist
    Object.keys(current3D).forEach((id) => {
      if (!objects.find((o) => (o.id || `comp_${o.x}`) === id)) {
        scene.remove(current3D[id]);
        delete current3D[id];
      }
    });

    objects.forEach((obj, idx) => {
      const id = obj.id || `comp_${idx}`;
      let meshGroup = current3D[id];

      const colHex = new THREE.Color(STAGE_COLORS[obj.color] || '#38bdf8');
      const isTarget = idx === targetIdx;

      if (!meshGroup) {
        meshGroup = new THREE.Group();
        let geom;
        const mat = new THREE.MeshStandardMaterial({
          color: colHex,
          metalness: 0.7,
          roughness: 0.2,
        });

        if (obj.shape === 'cube') {
          geom = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        } else if (obj.shape === 'sphere') {
          geom = new THREE.SphereGeometry(0.048, 24, 24);
        } else if (obj.shape === 'triangle') {
          geom = new THREE.ConeGeometry(0.052, 0.085, 3);
        } else {
          geom = new THREE.CylinderGeometry(0.05, 0.05, 0.07, 6);
        }

        const componentMesh = new THREE.Mesh(geom, mat);
        componentMesh.castShadow = true;
        componentMesh.receiveShadow = true;
        meshGroup.add(componentMesh);

        // Target Brackets
        const bracketGeo = new THREE.RingGeometry(0.09, 0.105, 16);
        const bracketMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        const bracket = new THREE.Mesh(bracketGeo, bracketMat);
        bracket.name = 'targetBracket';
        bracket.position.z = -0.038;
        meshGroup.add(bracket);

        scene.add(meshGroup);
        current3D[id] = meshGroup;
      }

      // Synchronize Cartesian position & rotation
      meshGroup.position.set(obj.x, obj.y, 0.04);
      if (obj.rotation) meshGroup.rotation.z = obj.rotation;

      // Highlight target with active fiducial pulse
      const bracket = meshGroup.getObjectByName('targetBracket');
      if (bracket) bracket.visible = isTarget;
    });
  }, [obs?.objects, targetIdx]);

  // 4. Update Trajectory Ribbon
  useEffect(() => {
    const line = trailLineRef.current;
    if (!line || !trail.length) return;

    const positions = line.geometry.attributes.position.array;
    for (let i = 0; i < trail.length && i < 60; i++) {
      positions[i * 3] = trail[i][0];
      positions[i * 3 + 1] = trail[i][1];
      positions[i * 3 + 2] = 0.08;
    }
    line.geometry.setDrawRange(0, Math.min(trail.length, 60));
    line.geometry.attributes.position.needsUpdate = true;
  }, [trail]);

  // Camera Presets
  const setPreset = (mode) => {
    setCameraMode(mode);
    const camera = cameraRef.current;
    if (!camera) return;

    if (mode === 'top') {
      camera.position.set(0, 0.6, 3.8);
      camera.lookAt(0, 0.7, 0.0);
    } else if (mode === 'side') {
      camera.position.set(3.4, 0.2, 0.8);
      camera.lookAt(0, 0.8, 0.2);
    } else {
      camera.position.set(0, -3.4, 2.5);
      camera.lookAt(0, 0.75, 0.15);
    }
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl flex flex-col transition-all duration-300 ${isExpanded ? 'h-[640px]' : 'h-[500px]'}`}>
      {/* 1. TOP HEADER BAR: Zero text collision! Dedicated Flex Row */}
      <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex items-center justify-between gap-3 z-20 flex-wrap">
        {/* Left Side: Clean Engineering Badge */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 shadow-sm">
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            CERBERUS 3-DOF
          </span>
          <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-slate-800/90 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            500Hz RK4
          </span>
        </div>

        {/* Right Side: Camera Mode Pills + Maximize Viewport Toggle */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <button
            onClick={() => setPreset('iso')}
            className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
              cameraMode === 'iso' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            Perspective
          </button>
          <button
            onClick={() => setPreset('top')}
            className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
              cameraMode === 'top' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            Top-Down
          </button>
          <button
            onClick={() => setPreset('side')}
            className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
              cameraMode === 'side' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            Side
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all ml-1 cursor-pointer"
            title={isExpanded ? "Collapse Viewport" : "Maximize Widescreen Viewport"}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* 2. 3D WebGL CANVAS (Clean, Uncongested Centerpiece) */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating Minimalist Telemetry Pill (Top-Right of Canvas) */}
        {obs && (
          <div className="absolute top-2.5 right-3 z-10 pointer-events-none flex items-center gap-2 font-mono text-[11.5px]">
            <span className="px-2.5 py-1 rounded-md bg-slate-900/85 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow-md">
              J1: {radToDeg(obs.theta1)}° · J2: {radToDeg(obs.theta2)}° · J3: {radToDeg(obs.theta3 ?? -0.42)}°
            </span>
            <span
              className={`px-2.5 py-1 rounded-md border backdrop-blur-md font-semibold text-[11px] ${
                isGrasped
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : gripperClosed
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/50'
                  : 'bg-slate-900/90 text-cyan-300 border-cyan-500/30'
              }`}
            >
              {isGrasped ? 'PARALLEL CLAMP LOCKED' : gripperClosed ? 'JAWS CLOSED' : 'SEEKING'}
            </span>
          </div>
        )}
      </div>

      {/* 3. DEDICATED BOTTOM WORKCELL BAR (Completely outside the 3D canvas so nothing is covered!) */}
      <div className="px-4 py-2 bg-slate-900/95 border-t border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between flex-wrap gap-2 z-20">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400">
            Manipulability w(q): {(obs?.manipulability ?? 0.76).toFixed(3)}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 font-semibold">
            Target Bay: {RECEPTACLES[goalKey]?.label || goalKey}
          </span>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-2">
          <span>Rotate: Drag</span>
          <span>·</span>
          <span>Zoom: Scroll</span>
          <span>·</span>
          <span className="text-cyan-400/80">MuJoCo 3D Physics Synced</span>
        </div>
      </div>
    </div>
  );
}
