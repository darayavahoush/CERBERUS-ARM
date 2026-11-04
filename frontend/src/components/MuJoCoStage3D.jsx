import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Box, Eye, Layers, Maximize2, RotateCcw, Video, Compass, Sparkles } from 'lucide-react';
import { radToDeg, RECEPTACLES, STAGE_COLORS } from '../utils/kinematics';

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

  const [cameraMode, setCameraMode] = useState('iso'); // 'iso' | 'top' | 'side' | 'gripper'
  const [showAnnotations, setShowAnnotations] = useState(true);

  // Extract kinematic angles and gripper status
  const theta1 = obs?.theta1 ?? 0.52;
  const theta2 = obs?.theta2 ?? 1.05;
  const gripperClosed = obs?.gripper_closed ?? false;
  const isGrasped = obs && obs.grasped_idx !== null && obs.grasped_idx !== undefined;
  const targetIdx = obs?.target_idx ?? 0;
  const goalKey = obs?.goal_key || 'blue_bin';

  // 1. Initialize High-Detail Three.js PBR Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 480;

    // Scene setup with atmospheric fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1017);
    scene.fog = new THREE.FogExp2(0x0c1017, 0.12);
    sceneRef.current = scene;

    // Perspective Camera (Z-up coordinate frame convention)
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.up.set(0, 0, 1);
    camera.position.set(0, -3.2, 2.4);
    camera.lookAt(0, 0.7, 0.15);
    cameraRef.current = camera;

    // WebGL Renderer with ACES ToneMapping & Soft Shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Lighting setup
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
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

    const blueRimLight = new THREE.PointLight(0x38bdf8, 1.2, 8);
    blueRimLight.position.set(-2.5, 1.5, 2.0);
    scene.add(blueRimLight);

    const warmFill = new THREE.PointLight(0xf5c518, 0.8, 6);
    warmFill.position.set(2.5, 2.5, 1.8);
    scene.add(warmFill);

    // Laboratory Surface Plane
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x141a24,
      metalness: 0.2,
      roughness: 0.75,
    });
    const tableGeo = new THREE.CircleGeometry(2.4, 64);
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.receiveShadow = true;
    scene.add(table);

    // Laboratory Circular Grid
    const grid = new THREE.GridHelper(4.8, 24, 0x1e3a8a, 0x1e293b);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = 0.002;
    scene.add(grid);

    // Receptacle Bins (3D Acrylic Cylinders)
    Object.entries(RECEPTACLES).forEach(([key, rec]) => {
      const col = STAGE_COLORS[rec.color] || '#3b82f6';
      const colHex = new THREE.Color(col);

      const bayGroup = new THREE.Group();
      bayGroup.position.set(rec.pos[0], rec.pos[1], 0);

      // Outer rim
      const rim = new THREE.Mesh(
        new THREE.RingGeometry(rec.radius - 0.02, rec.radius + 0.02, 32),
        new THREE.MeshBasicMaterial({ color: colHex, side: THREE.DoubleSide })
      );
      bayGroup.add(rim);

      // Translucent dock pad
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(rec.radius, rec.radius, 0.03, 32),
        new THREE.MeshStandardMaterial({
          color: colHex,
          transparent: true,
          opacity: 0.35,
          roughness: 0.3,
        })
      );
      pad.rotation.x = Math.PI / 2;
      pad.position.z = 0.015;
      bayGroup.add(pad);

      scene.add(bayGroup);
    });

    // Central Hazard Pillar (MuJoCo obstacle zone)
    const hazardGroup = new THREE.Group();
    hazardGroup.position.set(0.0, 0.85, 0);

    const pillarMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.45, 32),
      new THREE.MeshStandardMaterial({
        color: 0xe11d48,
        transparent: true,
        opacity: 0.45,
        roughness: 0.2,
        metalness: 0.1,
      })
    );
    pillarMesh.rotation.x = Math.PI / 2;
    pillarMesh.position.z = 0.225;
    hazardGroup.add(pillarMesh);

    // Safety ring
    const hazardRing = new THREE.Mesh(
      new THREE.RingGeometry(0.23, 0.25, 32),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide })
    );
    hazardGroup.add(hazardRing);
    scene.add(hazardGroup);

    // ========================================================
    // BUILD DETAILED 3D ARTICULATED ROBOT ARM (MUJOCO RR SPEC)
    // ========================================================
    const armRoot = new THREE.Group();
    scene.add(armRoot);

    // 1. Cast-Iron Base Pedestal
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.85, roughness: 0.25 });
    const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.24, 0.08, 36), baseMat);
    baseCyl.rotation.x = Math.PI / 2;
    baseCyl.position.z = 0.04;
    baseCyl.castShadow = true;
    baseCyl.receiveShadow = true;
    armRoot.add(baseCyl);

    // Status Indicator Halo around base
    const baseHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.21, 0.008, 16, 48),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.6 })
    );
    baseHalo.position.z = 0.06;
    armRoot.add(baseHalo);

    // 2. Shoulder Turntable (Joint 1 rotates around Z)
    const shoulderGroup = new THREE.Group();
    shoulderGroup.position.set(0, 0, 0.08);
    armRoot.add(shoulderGroup);

    const shoulderHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.1, 32), baseMat);
    shoulderHousing.rotation.x = Math.PI / 2;
    shoulderHousing.castShadow = true;
    shoulderGroup.add(shoulderHousing);

    // 3. Link 1 (Shoulder -> Elbow, Length L1 = 1.0)
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.3 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });

    const link1Cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 1.0, 24), carbonMat);
    link1Cyl.position.set(0.5, 0, 0.02);
    link1Cyl.rotation.z = Math.PI / 2;
    link1Cyl.castShadow = true;
    shoulderGroup.add(link1Cyl);

    // Link 1 Reinforcement Ribs & Braided Cable Conduit
    const cable1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.96, 16), chromeMat);
    cable1.position.set(0.5, 0.045, 0.02);
    cable1.rotation.z = Math.PI / 2;
    shoulderGroup.add(cable1);

    // 4. Elbow Joint (Joint 2 rotates around Z at local x = 1.0)
    const elbowGroup = new THREE.Group();
    elbowGroup.position.set(1.0, 0, 0.02);
    shoulderGroup.add(elbowGroup);

    const elbowHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.09, 32), baseMat);
    elbowHousing.rotation.x = Math.PI / 2;
    elbowHousing.castShadow = true;
    elbowGroup.add(elbowHousing);

    // Elbow Brass Bushing / Degree Indicator Needle
    const elbowDial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.095, 16),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 })
    );
    elbowDial.rotation.x = Math.PI / 2;
    elbowGroup.add(elbowDial);

    // 5. Link 2 (Elbow -> Wrist, Length L2 = 0.8)
    const link2Cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.8, 24), carbonMat);
    link2Cyl.position.set(0.4, 0, 0);
    link2Cyl.rotation.z = Math.PI / 2;
    link2Cyl.castShadow = true;
    elbowGroup.add(link2Cyl);

    // 6. Wrist & Two-Finger Industrial Gripper at x = 0.8 of Link 2
    const gripperGroup = new THREE.Group();
    gripperGroup.position.set(0.8, 0, 0);
    elbowGroup.add(gripperGroup);

    const wristMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.065), baseMat);
    wristMesh.castShadow = true;
    gripperGroup.add(wristMesh);

    // Gripper Jaws (Left & Right fingers that slide)
    const jawMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.15 });
    const fingerLeft = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.016, 0.035), jawMat);
    fingerLeft.position.set(0.055, 0.038, 0);
    fingerLeft.castShadow = true;
    gripperGroup.add(fingerLeft);

    const fingerRight = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.016, 0.035), jawMat);
    fingerRight.position.set(0.055, -0.038, 0);
    fingerRight.castShadow = true;
    gripperGroup.add(fingerRight);

    // Rubber Grip Pads on the inner jaw face
    const padMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const padL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.005, 0.03), padMat);
    padL.position.set(0.055, -0.008, 0);
    fingerLeft.add(padL);

    const padR = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.005, 0.03), padMat);
    padR.position.set(0.055, 0.008, 0);
    fingerRight.add(padR);

    // Magnetic Grasp Alignment Emitter
    const laserTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x0ea5e9 })
    );
    laserTip.position.set(0.07, 0, 0);
    gripperGroup.add(laserTip);

    // Save references
    armPartsRef.current = {
      shoulderGroup,
      elbowGroup,
      fingerLeft,
      fingerRight,
      laserTip,
      gripperGroup,
    };

    // Trajectory Polyline
    const maxTrail = 40;
    const trailGeo = new THREE.BufferGeometry();
    const trailPos = new Float32Array(maxTrail * 3);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    const trailMat = new THREE.LineBasicMaterial({
      color: 0xf5c518,
      linewidth: 3,
      transparent: true,
      opacity: 0.75,
    });
    const trailMesh = new THREE.Line(trailGeo, trailMat);
    scene.add(trailMesh);
    trailLineRef.current = trailMesh;

    // Interactive Drag Orbit Controls
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let spherical = { radius: 3.6, theta: -Math.PI / 2, phi: Math.PI / 3.8 };

    const updateCamera = () => {
      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.position.z = Math.max(0.15, spherical.radius * Math.cos(spherical.phi));
      camera.lookAt(0, 0.7, 0.15);
    };
    updateCamera();

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse = { x: e.clientX, y: e.clientY };

      spherical.theta -= dx * 0.007;
      spherical.phi = Math.max(0.05, Math.min(Math.PI / 2 - 0.02, spherical.phi + dy * 0.007));
      updateCamera();
    };

    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e) => {
      e.preventDefault();
      spherical.radius = Math.max(1.4, Math.min(6.5, spherical.radius + e.deltaY * 0.003));
      updateCamera();
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Render loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Joint Rotations, Fingers, and Trajectory in real-time
  useEffect(() => {
    const parts = armPartsRef.current;
    if (!parts.shoulderGroup || !parts.elbowGroup) return;

    // Apply joint rotations
    parts.shoulderGroup.rotation.z = theta1;
    parts.elbowGroup.rotation.z = theta2;

    // Slide fingers
    if (parts.fingerLeft && parts.fingerRight) {
      const offset = gripperClosed ? 0.016 : 0.038;
      parts.fingerLeft.position.y = offset;
      parts.fingerRight.position.y = -offset;
    }

    // Laser tip color
    if (parts.laserTip) {
      parts.laserTip.material.color.setHex(isGrasped ? 0x10b981 : gripperClosed ? 0xf43f5e : 0x0ea5e9);
    }

    // Update Trajectory
    if (trailLineRef.current && trail.length > 1) {
      const pts = trail.slice(-40);
      const positions = trailLineRef.current.geometry.attributes.position.array;
      for (let i = 0; i < pts.length; i++) {
        positions[i * 3] = pts[i][0];
        positions[i * 3 + 1] = pts[i][1];
        positions[i * 3 + 2] = 0.12;
      }
      trailLineRef.current.geometry.setDrawRange(0, pts.length);
      trailLineRef.current.geometry.attributes.position.needsUpdate = true;
    }
  }, [theta1, theta2, gripperClosed, isGrasped, trail]);

  // Synchronize 3D Workspace Objects with observation
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !obs?.objects) return;

    const currentMap = objects3DRef.current;
    const currentKeys = new Set(Object.keys(currentMap));

    obs.objects.forEach((o, i) => {
      const key = `obj_${i}`;
      currentKeys.delete(key);
      const col = STAGE_COLORS[o.color] || '#ffffff';
      const colHex = new THREE.Color(col);

      let mesh = currentMap[key];
      if (!mesh) {
        // Create 3D geometry based on shape
        let geo;
        if (o.shape === 'cube') {
          geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        } else if (o.shape === 'sphere') {
          geo = new THREE.SphereGeometry(0.07, 24, 24);
        } else if (o.shape === 'triangle') {
          geo = new THREE.CylinderGeometry(0.07, 0.07, 0.12, 3);
        } else {
          geo = new THREE.DodecahedronGeometry(0.07);
        }

        const mat = new THREE.MeshStandardMaterial({
          color: colHex,
          roughness: 0.25,
          metalness: 0.15,
        });

        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        currentMap[key] = mesh;
      }

      mesh.position.set(o.x, o.y, 0.06);
      if (i === targetIdx) {
        mesh.material.emissive = colHex;
        mesh.material.emissiveIntensity = 0.4;
      } else {
        mesh.material.emissive.setHex(0x000000);
      }
    });

    // Remove stale meshes
    currentKeys.forEach((k) => {
      scene.remove(currentMap[k]);
      delete currentMap[k];
    });
  }, [obs?.objects, targetIdx]);

  // Camera preset handler
  const setPreset = (mode) => {
    setCameraMode(mode);
    const camera = cameraRef.current;
    if (!camera) return;

    if (mode === 'top') {
      camera.position.set(0, 0.8, 4.2);
      camera.lookAt(0, 0.8, 0);
    } else if (mode === 'side') {
      camera.position.set(3.8, 0.8, 0.3);
      camera.lookAt(0, 0.8, 0.2);
    } else {
      camera.position.set(0, -3.2, 2.4);
      camera.lookAt(0, 0.7, 0.15);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[440px] rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl flex flex-col">
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="w-full h-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Top Floating Engineering Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        <span className="px-3 py-1 text-xs font-mono font-bold rounded-lg bg-slate-900/90 text-cyan-300 border border-cyan-500/30 backdrop-blur-md flex items-center gap-2 shadow-lg">
          <Box className="w-3.5 h-3.5 text-cyan-400" />
          MUJOCO 3D DIGITAL TWIN
        </span>
        <span className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-900/85 text-slate-300 border border-slate-700/60 backdrop-blur-md">
          RK4 (5ms) · 60 FPS
        </span>
      </div>

      {/* Camera View Switcher Buttons */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 font-mono text-xs">
        <button
          onClick={() => setPreset('iso')}
          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
            cameraMode === 'iso' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          Perspective
        </button>
        <button
          onClick={() => setPreset('top')}
          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
            cameraMode === 'top' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          Top-Down
        </button>
        <button
          onClick={() => setPreset('side')}
          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
            cameraMode === 'side' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          Side Profile
        </button>
      </div>

      {/* 3D Dynamic Joint Callouts (Clarifies exactly what the robot is doing!) */}
      {showAnnotations && obs && (
        <div className="absolute bottom-11 left-3 right-3 z-10 flex flex-wrap items-center justify-between pointer-events-none gap-2 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-slate-900/90 text-amber-300 border border-amber-500/30 backdrop-blur-md">
              J1 (Shoulder): {radToDeg(obs.theta1)}°
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-900/90 text-amber-300 border border-amber-500/30 backdrop-blur-md">
              J2 (Elbow): {radToDeg(obs.theta2)}°
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-md border backdrop-blur-md font-semibold ${
                isGrasped
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : gripperClosed
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/50'
                  : 'bg-slate-900/90 text-cyan-300 border-cyan-500/30'
              }`}
            >
              {isGrasped
                ? 'MAGNETIC LOCK ENGAGED'
                : gripperClosed
                ? 'GRIPPER CLAMPED'
                : 'SEEKING TARGET'}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Explanatory Bar */}
      <div className="px-4 py-2 bg-slate-950/95 border-t border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400">
            Manipulability w(q): {(obs?.manipulability ?? 0.707).toFixed(3)}
          </span>
          <span className="text-slate-600">|</span>
          <span>Target Bay: {(goalKey || 'blue_bin').replace('_', ' ').toUpperCase()}</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Left Drag: Rotate · Scroll: Zoom · Synchronized with MuJoCo
        </div>
      </div>
    </div>
  );
}
