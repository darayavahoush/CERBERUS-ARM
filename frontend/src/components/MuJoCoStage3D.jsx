import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Box, Eye, Layers, Maximize2, Minimize2, RotateCcw, Video, Compass, Sparkles, ShieldCheck, Target } from 'lucide-react';
import { radToDeg, RECEPTACLES, STAGE_COLORS, COMPONENT_LABELS, L1, L2, L3, MAX_REACH, MIN_REACH } from '../utils/kinematics';

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
  const controlsRef = useRef(null);
  const armPartsRef = useRef({});
  const objects3DRef = useRef({});
  const trailLineRef = useRef(null);
  const laserBeamRef = useRef(null);
  const laserFloorTargetRef = useRef(null);
  const graspSparksRef = useRef(null);
  const targetReticleRef = useRef(null);

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

  // Helper to create high-contrast canvas text sprite for 3D bay labels
  const createTextSprite = (text, colorHex, bgColor = 'rgba(10, 15, 30, 0.85)') => {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    // Rounded pill background
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(8, 8, 368, 80, 24);
    ctx.fill();
    ctx.stroke();

    // Text label
    ctx.font = 'bold 30px "JetBrains Mono", "IBM Plex Sans", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 192, 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(0.68, 0.17, 1);
    return sprite;
  };

  // 1. Initialize High-Detail Three.js PBR Scene with OrbitControls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || (isExpanded ? 640 : 490);

    // Scene setup with atmospheric industrial lighting
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e17);
    scene.fog = new THREE.FogExp2(0x0a0e17, 0.07);
    sceneRef.current = scene;

    // Perspective Camera (Z-up coordinate frame convention)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.up.set(0, 0, 1);
    camera.position.set(0, -3.5, 2.6);
    camera.lookAt(0, 0.75, 0.15);
    cameraRef.current = camera;

    // WebGL Renderer with ACES ToneMapping & Soft Shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // OrbitControls for smooth, professional camera navigation
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't dip below optical breadboard floor
    controls.minDistance = 1.3;
    controls.maxDistance = 6.5;
    controls.target.set(0, 0.75, 0.15);
    controlsRef.current = controls;

    // Studio Lighting Setup (PBR Key, Rim, and Fill Lights)
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(2.8, -2.8, 4.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.camera.left = -2.6;
    keyLight.shadow.camera.right = 2.6;
    keyLight.shadow.camera.top = 2.6;
    keyLight.shadow.camera.bottom = -2.6;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const blueRimLight = new THREE.PointLight(0x38bdf8, 1.8, 8);
    blueRimLight.position.set(-2.6, 1.6, 2.2);
    scene.add(blueRimLight);

    const amberFillLight = new THREE.PointLight(0xf59e0b, 1.1, 7);
    amberFillLight.position.set(2.4, 2.2, 1.8);
    scene.add(amberFillLight);

    // ========================================================
    // OPTICAL BREADBOARD TABLE SURFACE
    // ========================================================
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x0f1522,
      metalness: 0.5,
      roughness: 0.55,
    });
    const tableGeo = new THREE.CircleGeometry(2.6, 64);
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.receiveShadow = true;
    scene.add(table);

    // Industrial Metric Coordinate Grid (M6 tapped mounting hole matrix)
    const grid = new THREE.GridHelper(5.2, 26, 0x1d4ed8, 0x1e293b);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = 0.002;
    scene.add(grid);

    // Reachable Workspace Envelope Rings
    // 1. Outer Maximum Reach (L1 + L2 + L3 = 1.95m)
    const outerReachGeo = new THREE.RingGeometry(MAX_REACH - 0.012, MAX_REACH + 0.012, 64);
    const outerReachMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const outerReachMesh = new THREE.Mesh(outerReachGeo, outerReachMat);
    outerReachMesh.position.z = 0.004;
    scene.add(outerReachMesh);

    // 2. Inner Singularity Deadzone (R = 0.20m)
    const innerDeadzoneGeo = new THREE.RingGeometry(0.18, 0.21, 36);
    const innerDeadzoneMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const innerDeadzoneMesh = new THREE.Mesh(innerDeadzoneGeo, innerDeadzoneMat);
    innerDeadzoneMesh.position.z = 0.004;
    scene.add(innerDeadzoneMesh);

    // ========================================================
    // INDUSTRIAL SORTING BAYS (A: SMT, B: AOI, C: Cleanroom)
    // ========================================================
    Object.entries(RECEPTACLES).forEach(([key, rec]) => {
      const col = STAGE_COLORS[rec.color] || '#3b82f6';
      const colHex = new THREE.Color(col);

      const bayGroup = new THREE.Group();
      bayGroup.position.set(rec.pos[0], rec.pos[1], 0);

      // Outer chamfered dock rim
      const rim = new THREE.Mesh(
        new THREE.RingGeometry(rec.radius - 0.025, rec.radius + 0.025, 48),
        new THREE.MeshBasicMaterial({ color: colHex, side: THREE.DoubleSide })
      );
      bayGroup.add(rim);

      // Translucent dock pad with glowing inner boundary
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(rec.radius, rec.radius, 0.028, 40),
        new THREE.MeshStandardMaterial({
          color: colHex,
          transparent: true,
          opacity: 0.35,
          roughness: 0.2,
          metalness: 0.3,
        })
      );
      pad.rotation.x = Math.PI / 2;
      pad.position.z = 0.014;
      bayGroup.add(pad);

      // Inner fiducial target ring
      const innerTarget = new THREE.Mesh(
        new THREE.RingGeometry(rec.radius * 0.42, rec.radius * 0.50, 36),
        new THREE.MeshBasicMaterial({ color: colHex, side: THREE.DoubleSide })
      );
      innerTarget.position.z = 0.028;
      bayGroup.add(innerTarget);

      // Floating 3D Bay Label Billboard
      const bayShortName = key === 'red_bin' ? 'BAY A · SMT' : key === 'blue_bin' ? 'BAY B · AOI' : 'BAY C · QA';
      const sprite = createTextSprite(bayShortName, col);
      sprite.position.set(0, rec.radius + 0.14, 0.18);
      bayGroup.add(sprite);

      scene.add(bayGroup);
    });

    // ========================================================
    // CENTRAL OPTICAL INSPECTION SPINDLE (HAZARD OBSTACLE)
    // ========================================================
    const hazardGroup = new THREE.Group();
    hazardGroup.position.set(0.0, 0.85, 0);

    const pillarMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.20, 0.20, 0.56, 36),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.38,
        roughness: 0.15,
        metalness: 0.4,
      })
    );
    pillarMesh.rotation.x = Math.PI / 2;
    pillarMesh.position.z = 0.28;
    pillarMesh.castShadow = true;
    hazardGroup.add(pillarMesh);

    // Glowing laser scanner ring
    const laserScannerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.205, 0.23, 36),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide })
    );
    laserScannerRing.position.z = 0.30;
    hazardGroup.add(laserScannerRing);

    // Tower Base Collar with Warning Chamfer
    const pillarBaseCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.25, 0.07, 36),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9, roughness: 0.2 })
    );
    pillarBaseCollar.rotation.x = Math.PI / 2;
    pillarBaseCollar.position.z = 0.035;
    hazardGroup.add(pillarBaseCollar);

    // Spindle Warning Label Sprite
    const hazardSprite = createTextSprite('⚠ LASER SPINDLE', '#f59e0b', 'rgba(30, 20, 5, 0.9)');
    hazardSprite.position.set(0, 0, 0.64);
    hazardGroup.add(hazardSprite);

    scene.add(hazardGroup);

    // ========================================================
    // BUILD 3-DOF ARTICULATED INDUSTRIAL MANIPULATOR
    // ========================================================
    const armRoot = new THREE.Group();
    scene.add(armRoot);

    // 1. Base Pedestal with Perimeter Bolt Flange
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.3 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.98, roughness: 0.08 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.92, roughness: 0.25 });

    const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.26, 0.09, 40), baseMat);
    baseCyl.rotation.x = Math.PI / 2;
    baseCyl.position.z = 0.045;
    baseCyl.castShadow = true;
    baseCyl.receiveShadow = true;
    armRoot.add(baseCyl);

    // Perimeter Hex Mounting Bolts (8 bolts around base)
    const boltGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.02, 6);
    const boltMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 });
    for (let b = 0; b < 8; b++) {
      const bAngle = (b / 8) * Math.PI * 2;
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(0.235 * Math.cos(bAngle), 0.235 * Math.sin(bAngle), 0.09);
      armRoot.add(bolt);
    }

    // Glowing Cyan Turret Status Ring
    const baseHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.01, 16, 48),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.85 })
    );
    baseHalo.position.z = 0.07;
    armRoot.add(baseHalo);

    // ========================================================
    // JOINT 1: SHOULDER TURNTABLE (Rotates around Z)
    // ========================================================
    const shoulderGroup = new THREE.Group();
    shoulderGroup.position.set(0, 0, 0.10);
    armRoot.add(shoulderGroup);

    const shoulderHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 32), baseMat);
    shoulderHousing.rotation.x = Math.PI / 2;
    shoulderHousing.castShadow = true;
    shoulderGroup.add(shoulderHousing);

    // Link 1 (Shoulder Arm, L1 = 0.90m)
    const link1Cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, L1, 24), carbonMat);
    link1Cyl.position.set(L1 / 2, 0, 0.02);
    link1Cyl.rotation.z = Math.PI / 2;
    link1Cyl.castShadow = true;
    shoulderGroup.add(link1Cyl);

    // Dual Hydraulic Actuator Cylinders on Link 1
    const piston1 = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, L1 * 0.92, 16), chromeMat);
    piston1.position.set(L1 / 2, 0.048, 0.02);
    piston1.rotation.z = Math.PI / 2;
    shoulderGroup.add(piston1);

    const piston2 = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, L1 * 0.92, 16), chromeMat);
    piston2.position.set(L1 / 2, -0.048, 0.02);
    piston2.rotation.z = Math.PI / 2;
    shoulderGroup.add(piston2);

    // ========================================================
    // JOINT 2: ELBOW ARTICULATION (at local x = L1)
    // ========================================================
    const elbowGroup = new THREE.Group();
    elbowGroup.position.set(L1, 0, 0.02);
    shoulderGroup.add(elbowGroup);

    const elbowHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.10, 32), baseMat);
    elbowHousing.rotation.x = Math.PI / 2;
    elbowHousing.castShadow = true;
    elbowGroup.add(elbowHousing);

    // Brass Joint Pivot Dial with tick markings
    const elbowPivotDial = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.105, 20), brassMat);
    elbowPivotDial.rotation.x = Math.PI / 2;
    elbowGroup.add(elbowPivotDial);

    // Link 2 (Forearm, L2 = 0.70m)
    const link2Cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, L2, 24), carbonMat);
    link2Cyl.position.set(L2 / 2, 0, 0);
    link2Cyl.rotation.z = Math.PI / 2;
    link2Cyl.castShadow = true;
    elbowGroup.add(link2Cyl);

    // Forearm Cable Conduit Line
    const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, L2 * 0.88, 16), chromeMat);
    conduit.position.set(L2 / 2, 0.038, 0);
    conduit.rotation.z = Math.PI / 2;
    elbowGroup.add(conduit);

    // ========================================================
    // JOINT 3: ACTIVE WRIST PITCH (at local x = L2)
    // ========================================================
    const wristGroup = new THREE.Group();
    wristGroup.position.set(L2, 0, 0);
    elbowGroup.add(wristGroup);

    const wristHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.085, 28), baseMat);
    wristHousing.rotation.x = Math.PI / 2;
    wristHousing.castShadow = true;
    wristGroup.add(wristHousing);

    // Wrist Servo Pivot Disc
    const wristDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.09, 20), brassMat);
    wristDisc.rotation.x = Math.PI / 2;
    wristGroup.add(wristDisc);

    // Link 3 (Tool Wrist Flange Neck, L3 = 0.35m)
    const link3Cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.030, L3, 20), chromeMat);
    link3Cyl.position.set(L3 / 2, 0, 0);
    link3Cyl.rotation.z = Math.PI / 2;
    link3Cyl.castShadow = true;
    wristGroup.add(link3Cyl);

    // Wrist Alignment Camera (Eye on tool)
    const wristCamera = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.02, 0.03, 16),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 })
    );
    wristCamera.rotation.z = Math.PI / 2;
    wristCamera.position.set(L3 * 0.65, 0.034, 0);
    wristGroup.add(wristCamera);

    // ========================================================
    // TOOL HEAD: DUAL-FINGER PARALLEL SERVO GRIPPER (at x = L3)
    // ========================================================
    const gripperGroup = new THREE.Group();
    gripperGroup.position.set(L3, 0, 0);
    wristGroup.add(gripperGroup);

    const handBase = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.09, 0.055), baseMat);
    handBase.castShadow = true;
    gripperGroup.add(handBase);

    // Sliding Prismatic Jaws (Anodized Aluminum)
    const jawMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.92, roughness: 0.15 });
    const fingerLeft = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.016, 0.032), jawMat);
    fingerLeft.position.set(0.055, 0.038, 0);
    fingerLeft.castShadow = true;
    gripperGroup.add(fingerLeft);

    const fingerRight = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.016, 0.032), jawMat);
    fingerRight.position.set(0.055, -0.038, 0);
    fingerRight.castShadow = true;
    gripperGroup.add(fingerRight);

    // High-Friction Orange Silicone Grip Pads
    const padMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.95 });
    const padL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.006, 0.028), padMat);
    padL.position.set(0.055, -0.008, 0);
    fingerLeft.add(padL);

    const padR = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.006, 0.028), padMat);
    padR.position.set(0.055, 0.008, 0);
    fingerRight.add(padR);

    // Grasp Contact Spark Ring (Pulsing energetic glow on clamp)
    const sparkGeo = new THREE.TorusGeometry(0.045, 0.006, 12, 24);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.0 });
    const graspSparks = new THREE.Mesh(sparkGeo, sparkMat);
    graspSparks.position.set(0.07, 0, 0);
    graspSparks.rotation.y = Math.PI / 2;
    gripperGroup.add(graspSparks);
    graspSparksRef.current = graspSparks;

    // Laser Emitter Tip
    const laserTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    laserTip.position.set(0.072, 0, 0);
    gripperGroup.add(laserTip);

    // Save references to animated joint groups
    armPartsRef.current = {
      shoulderGroup,
      elbowGroup,
      wristGroup,
      gripperGroup,
      fingerLeft,
      fingerRight,
    };

    // ========================================================
    // DOWNWARD TACTICAL AIM LASER & TARGET RETICLE
    // ========================================================
    // Laser Beam from Tool to Floor
    const laserBeamGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0.15),
      new THREE.Vector3(0, 0, 0.005),
    ]);
    const laserBeamMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.65, linewidth: 2 });
    const laserBeam = new THREE.Line(laserBeamGeo, laserBeamMat);
    scene.add(laserBeam);
    laserBeamRef.current = laserBeam;

    // Floor Target Crosshair Reticle
    const floorReticleGeo = new THREE.RingGeometry(0.038, 0.046, 24);
    const floorReticleMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
    const floorReticle = new THREE.Mesh(floorReticleGeo, floorReticleMat);
    floorReticle.position.z = 0.006;
    scene.add(floorReticle);
    laserFloorTargetRef.current = floorReticle;

    // Floating Target Reticle (Hovers over the active target component)
    const targetReticleGroup = new THREE.Group();
    const reticleRing = new THREE.Mesh(
      new THREE.RingGeometry(0.095, 0.11, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    reticleRing.rotation.x = Math.PI / 2;
    targetReticleGroup.add(reticleRing);

    // Downward Pointer Dart
    const dart = new THREE.Mesh(
      new THREE.ConeGeometry(0.024, 0.06, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    dart.rotation.x = Math.PI;
    dart.position.z = 0.05;
    targetReticleGroup.add(dart);

    scene.add(targetReticleGroup);
    targetReticleRef.current = targetReticleGroup;

    // ========================================================
    // 5. GHOST TRAJECTORY RIBBON (Historical Motion Trail)
    // ========================================================
    const maxTrailPts = 60;
    const trailPositions = new Float32Array(maxTrailPts * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8, linewidth: 2.5 });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLine);
    trailLineRef.current = trailLine;

    // Animation Loop
    let animId;
    let clock = new THREE.Clock();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Update OrbitControls
      if (controlsRef.current) controlsRef.current.update();

      // Spin & pulse the target reticle
      if (targetReticleRef.current) {
        targetReticleRef.current.rotation.z = elapsed * 1.8;
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || (isExpanded ? 640 : 490);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
    };
  }, [isExpanded]);

  // 2. Animate 3-DOF Arm Kinematics & Dynamic Gripper Jaws
  useEffect(() => {
    const parts = armPartsRef.current;
    if (!parts.shoulderGroup) return;

    // Joint 1: Shoulder Yaw (Z rotation)
    parts.shoulderGroup.rotation.z = theta1;
    // Joint 2: Elbow Pitch (Z rotation)
    if (parts.elbowGroup) parts.elbowGroup.rotation.z = theta2;
    // Joint 3: Active Wrist Pitch (Z rotation)
    if (parts.wristGroup) parts.wristGroup.rotation.z = theta3;

    // Prismatic Gripper Jaws Physical Clamp Animation
    if (parts.fingerLeft && parts.fingerRight) {
      const clampOffset = gripperClosed ? 0.011 : 0.038;
      parts.fingerLeft.position.y = clampOffset;
      parts.fingerRight.position.y = -clampOffset;
    }

    // Grasp Sparks Glow
    if (graspSparksRef.current) {
      graspSparksRef.current.material.opacity = isGrasped ? 0.95 : 0.0;
    }

    // Update End-Effector Downward Laser Beam & Reticle
    const ee = obs?.fk?.ee;
    if (ee && laserBeamRef.current && laserFloorTargetRef.current) {
      const positions = laserBeamRef.current.geometry.attributes.position.array;
      positions[0] = ee[0];
      positions[1] = ee[1];
      positions[2] = 0.14; // Tool height
      positions[3] = ee[0];
      positions[4] = ee[1];
      positions[5] = 0.005; // Floor height
      laserBeamRef.current.geometry.attributes.position.needsUpdate = true;

      laserFloorTargetRef.current.position.set(ee[0], ee[1], 0.006);
    }
  }, [theta1, theta2, theta3, gripperClosed, isGrasped, obs?.fk?.ee]);

  // 3. Render & Synchronize Randomized Cleanroom Components
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
        let mat;

        if (obj.shape === 'cube') {
          // Micro-Module IC Package (Matte graphite body with gold leads)
          geom = new THREE.BoxGeometry(0.082, 0.082, 0.075);
          mat = new THREE.MeshStandardMaterial({
            color: 0x1f2937,
            metalness: 0.85,
            roughness: 0.25,
          });
        } else if (obj.shape === 'sphere') {
          // High-Purity Quartz Lens (Refractive crystal sphere)
          geom = new THREE.SphereGeometry(0.050, 28, 28);
          mat = new THREE.MeshPhysicalMaterial({
            color: colHex,
            metalness: 0.1,
            roughness: 0.08,
            transmission: 0.75,
            ior: 1.52,
            clearcoat: 1.0,
          });
        } else if (obj.shape === 'triangle') {
          // Dispersive Optical Prism (Triangular glass prism)
          geom = new THREE.CylinderGeometry(0.055, 0.055, 0.08, 3);
          mat = new THREE.MeshPhysicalMaterial({
            color: colHex,
            metalness: 0.2,
            roughness: 0.1,
            transmission: 0.65,
            clearcoat: 0.9,
          });
        } else {
          // Multi-Axis Sensor Hub (Hexagonal sensor pod)
          geom = new THREE.CylinderGeometry(0.052, 0.052, 0.075, 6);
          mat = new THREE.MeshStandardMaterial({
            color: colHex,
            metalness: 0.8,
            roughness: 0.2,
          });
        }

        const componentMesh = new THREE.Mesh(geom, mat);
        componentMesh.castShadow = true;
        componentMesh.receiveShadow = true;
        meshGroup.add(componentMesh);

        // Component Base Ring Fiducial
        const baseRing = new THREE.Mesh(
          new THREE.RingGeometry(0.075, 0.088, 20),
          new THREE.MeshBasicMaterial({ color: colHex, side: THREE.DoubleSide })
        );
        baseRing.position.z = -0.036;
        meshGroup.add(baseRing);

        scene.add(meshGroup);
        current3D[id] = meshGroup;
      }

      // Synchronize Cartesian position & rotation
      meshGroup.position.set(obj.x, obj.y, 0.04);
      if (obj.rotation) meshGroup.rotation.z = obj.rotation;

      // Position floating target reticle above active target component
      if (isTarget && targetReticleRef.current) {
        targetReticleRef.current.position.set(obj.x, obj.y, 0.18);
        targetReticleRef.current.visible = true;
      }
    });

    if (objects.length === 0 && targetReticleRef.current) {
      targetReticleRef.current.visible = false;
    }
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
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (mode === 'top') {
      camera.position.set(0, 0.75, 3.8);
      controls.target.set(0, 0.75, 0.0);
    } else if (mode === 'side') {
      camera.position.set(3.5, 0.2, 0.9);
      controls.target.set(0, 0.75, 0.2);
    } else {
      camera.position.set(0, -3.5, 2.6);
      controls.target.set(0, 0.75, 0.15);
    }
    controls.update();
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl flex flex-col transition-all duration-300 ${isExpanded ? 'h-[640px]' : 'h-[500px]'}`}>
      {/* 1. TOP HEADER BAR: Dedicated Flex Row with Zero Text Collision */}
      <div className="px-3.5 py-2.5 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md flex items-center justify-between gap-3 z-20 flex-wrap">
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
          <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-slate-800/90 text-slate-400 border border-slate-700 hidden sm:inline-flex items-center gap-1">
            <Target className="w-3 h-3 text-cyan-400" />
            Cleanroom Sort
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

      {/* 2. 3D WebGL CANVAS (With OrbitControls & PBR Rendering) */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating Minimalist Telemetry Chip (Top-Right of Canvas) */}
        {obs && (
          <div className="absolute top-2.5 right-3 z-10 pointer-events-none flex items-center gap-2 font-mono text-[11.5px]">
            <span className="px-2.5 py-1 rounded-md bg-slate-900/90 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow-md">
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

      {/* 3. DEDICATED BOTTOM WORKCELL BAR (Completely outside the canvas) */}
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
          <span>Rotate: Left Drag</span>
          <span>·</span>
          <span>Pan: Right Drag</span>
          <span>·</span>
          <span>Zoom: Scroll</span>
          <span>·</span>
          <span className="text-cyan-400/80">MuJoCo 3.17 RK4 Synced</span>
        </div>
      </div>
    </div>
  );
}
