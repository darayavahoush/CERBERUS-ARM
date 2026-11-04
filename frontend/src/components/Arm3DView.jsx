import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Box, Layers, RotateCw, ZoomIn, Eye, Sparkles } from 'lucide-react';

export default function Arm3DView({
  theta1 = Math.PI / 4,
  theta2 = Math.PI / 3,
  gripperClosed = false,
  objects = [],
  targetIdx = 0,
  obstacles = [],
  receptacles = {},
  isGrasped = false,
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const armMeshesRef = useRef({});
  const trajectoryLineRef = useRef(null);
  const trajectoryPointsRef = useRef([]);

  const [cameraPreset, setCameraPreset] = useState('perspective');

  // Setup Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090e);
    scene.fog = new THREE.FogExp2(0x07090e, 0.15);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, -2.6, 2.2);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0.6, 0.2);
    cameraRef.current = camera;

    // 2. Renderer with soft shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xdbeafe, 1.4);
    dirLight.position.set(2, -2, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 10;
    dirLight.shadow.camera.left = -2.5;
    dirLight.shadow.camera.right = 2.5;
    dirLight.shadow.camera.top = 2.5;
    dirLight.shadow.camera.bottom = -2.5;
    scene.add(dirLight);

    const blueFill = new THREE.PointLight(0x06b6d4, 1.2, 8);
    blueFill.position.set(-2, 1, 1.5);
    scene.add(blueFill);

    const amberFill = new THREE.PointLight(0xf59e0b, 0.8, 6);
    amberFill.position.set(2, 2, 1.5);
    scene.add(amberFill);

    // 4. Circular Laboratory Floor
    const floorGeo = new THREE.CircleGeometry(2.4, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid Overlay
    const grid = new THREE.GridHelper(4.8, 24, 0x0284c7, 0x1e293b);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = 0.002;
    scene.add(grid);

    // 5. Build 3D Robotic Manipulator Structure
    // Root group at base (0, 0, 0)
    const armGroup = new THREE.Group();
    scene.add(armGroup);

    // Base Pedestal
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
    const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 32), baseMat);
    baseCyl.rotation.x = Math.PI / 2;
    baseCyl.position.z = 0.04;
    baseCyl.castShadow = true;
    baseCyl.receiveShadow = true;
    armGroup.add(baseCyl);

    // Base Motor Ring
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.5 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.008, 16, 48), ringMat);
    ring.position.z = 0.05;
    armGroup.add(ring);

    // Joint 1 Turntable (Rotates around Z by theta1)
    const joint1Group = new THREE.Group();
    joint1Group.position.set(0, 0, 0.08);
    armGroup.add(joint1Group);

    const joint1Housing = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.09, 32), baseMat);
    joint1Housing.rotation.x = Math.PI / 2;
    joint1Housing.castShadow = true;
    joint1Group.add(joint1Housing);

    // Link 1 (Length L1 = 1.0 along its local X axis)
    const link1Mat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.25 });
    const link1Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 24), link1Mat);
    link1Mesh.position.set(0.5, 0, 0.02);
    link1Mesh.rotation.z = Math.PI / 2;
    link1Mesh.castShadow = true;
    joint1Group.add(link1Mesh);

    // Link 1 Accent Trim
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.3 });
    const trim1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.015, 0.015), trimMat);
    trim1.position.set(0.5, 0, 0.065);
    joint1Group.add(trim1);

    // Joint 2 (Elbow at local x = 1.0, rotates by theta2)
    const joint2Group = new THREE.Group();
    joint2Group.position.set(1.0, 0, 0.02);
    joint1Group.add(joint2Group);

    const elbowHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 24), baseMat);
    elbowHousing.rotation.x = Math.PI / 2;
    elbowHousing.castShadow = true;
    joint2Group.add(elbowHousing);

    // Link 2 (Length L2 = 0.8 along local X axis)
    const link2Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.8, 24), link1Mat);
    link2Mesh.position.set(0.4, 0, 0);
    link2Mesh.rotation.z = Math.PI / 2;
    link2Mesh.castShadow = true;
    joint2Group.add(link2Mesh);

    // Link 2 Accent Trim
    const trim2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.012, 0.012), trimMat);
    trim2.position.set(0.4, 0, 0.04);
    joint2Group.add(trim2);

    // End-Effector / Gripper Assembly at x = 0.8 of Link 2
    const gripperGroup = new THREE.Group();
    gripperGroup.position.set(0.8, 0, 0);
    joint2Group.add(gripperGroup);

    const wristMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.06), baseMat);
    wristMesh.castShadow = true;
    gripperGroup.add(wristMesh);

    // Gripper Fingers (Left and Right)
    const fingerMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.1 });
    const fingerLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.04), fingerMat);
    fingerLeft.position.set(0.05, 0.035, 0);
    fingerLeft.castShadow = true;
    gripperGroup.add(fingerLeft);

    const fingerRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.04), fingerMat);
    fingerRight.position.set(0.05, -0.035, 0);
    fingerRight.castShadow = true;
    gripperGroup.add(fingerRight);

    // Gripper Magnetic Laser / Emitter
    const laserMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const laserTip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 16), laserMat);
    laserTip.position.set(0.06, 0, 0);
    gripperGroup.add(laserTip);

    // Save mesh references
    armMeshesRef.current = {
      joint1Group,
      joint2Group,
      fingerLeft,
      fingerRight,
      laserTip,
      gripperGroup,
    };

    // 6. Interactive Mouse Drag Orbit Controls
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let spherical = { radius: 3.4, theta: -Math.PI / 2, phi: Math.PI / 4 };

    const updateCameraPos = () => {
      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.position.z = Math.max(0.2, spherical.radius * Math.cos(spherical.phi));
      camera.lookAt(0, 0.6, 0.2);
    };
    updateCameraPos();

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse = { x: e.clientX, y: e.clientY };

      spherical.theta -= dx * 0.008;
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.02, spherical.phi + dy * 0.008));
      updateCameraPos();
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      spherical.radius = Math.max(1.5, Math.min(6.0, spherical.radius + e.deltaY * 0.003));
      updateCameraPos();
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // 7. Trajectory Line
    const maxTrail = 40;
    const trailPositions = new Float32Array(maxTrail * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.6,
      linewidth: 2,
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLine);
    trajectoryLineRef.current = trailLine;

    // 8. Animation Render Loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
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

  // Update Joint Angles and Gripper in real-time
  useEffect(() => {
    const { joint1Group, joint2Group, fingerLeft, fingerRight, laserTip } = armMeshesRef.current;
    if (!joint1Group || !joint2Group) return;

    // Smoothly apply joint rotations around local Z
    joint1Group.rotation.z = theta1;
    joint2Group.rotation.z = theta2;

    // Finger clamp dynamics
    if (fingerLeft && fingerRight) {
      const targetOffset = gripperClosed ? 0.015 : 0.035;
      fingerLeft.position.y = targetOffset;
      fingerRight.position.y = -targetOffset;
    }

    if (laserTip) {
      laserTip.material.color.setHex(isGrasped ? 0x10b981 : gripperClosed ? 0xf43f5e : 0x06b6d4);
    }

    // Compute end-effector world position for 3D trajectory
    const l1 = 1.0, l2 = 0.8;
    const eeX = l1 * Math.cos(theta1) + l2 * Math.cos(theta1 + theta2);
    const eeY = l1 * Math.sin(theta1) + l2 * Math.sin(theta1 + theta2);
    const eeZ = 0.1;

    const trailPts = trajectoryPointsRef.current;
    trailPts.push(new THREE.Vector3(eeX, eeY, eeZ));
    if (trailPts.length > 35) trailPts.shift();

    if (trajectoryLineRef.current) {
      const positions = trajectoryLineRef.current.geometry.attributes.position.array;
      for (let i = 0; i < trailPts.length; i++) {
        positions[i * 3] = trailPts[i].x;
        positions[i * 3 + 1] = trailPts[i].y;
        positions[i * 3 + 2] = trailPts[i].z;
      }
      trajectoryLineRef.current.geometry.setDrawRange(0, trailPts.length);
      trajectoryLineRef.current.geometry.attributes.position.needsUpdate = true;
    }
  }, [theta1, theta2, gripperClosed, isGrasped]);

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden glass-panel border border-slate-800 shadow-2xl flex flex-col">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Floating 3D HUD Badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-slate-900/90 text-cyan-300 border border-cyan-500/30 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
          <Box className="w-3.5 h-3.5 text-cyan-400" />
          MUJOCO 3D DIGITAL TWIN (PBR)
        </span>
        <span className="px-2 py-1 text-xs font-mono rounded-md bg-slate-900/80 text-slate-300 border border-slate-700/50">
          60 FPS · ORBIT / ZOOM / PAN
        </span>
      </div>

      {/* Camera View Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <button
          onClick={() => {
            if (cameraRef.current) {
              cameraRef.current.position.set(0, -2.8, 2.2);
              cameraRef.current.lookAt(0, 0.6, 0.2);
            }
          }}
          className="px-2 py-1 text-[11px] font-mono rounded bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all cursor-pointer"
        >
          Perspective
        </button>
        <button
          onClick={() => {
            if (cameraRef.current) {
              cameraRef.current.position.set(0, 0.01, 3.8);
              cameraRef.current.lookAt(0, 0.8, 0);
            }
          }}
          className="px-2 py-1 text-[11px] font-mono rounded bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all cursor-pointer"
        >
          Top-Down
        </button>
      </div>

      {/* Bottom Physics Telemetry */}
      <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800/80 text-xs font-mono text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Integrator: RK4 (5ms)
          </span>
          <span className="text-slate-600">|</span>
          <span>Gravity: [0, 0, -9.81] m/s²</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Left Drag: Rotate · Scroll: Zoom · Synchronized with D3QN-HER
        </div>
      </div>
    </div>
  );
}
