import * as THREE from 'three';
import { ArModelType, Product, ProductDimensions } from '../types';
import {
  ArFinishPreset,
  ArReferenceItemId,
  AR_REFERENCE_ITEMS,
  getProductDimensions,
} from './arCalibration';

export interface BuildArModelOptions {
  finishPreset?: ArFinishPreset;
  maxAnisotropy?: number;
  isSoftwareGl?: boolean;
}

function makeRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const s = new THREE.Shape();
  const r = Math.min(radius, width * 0.45, height * 0.45);
  const hw = width / 2;
  const hh = height / 2;
  s.moveTo(-hw + r, -hh);
  s.lineTo(hw - r, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + r);
  s.lineTo(hw, hh - r);
  s.quadraticCurveTo(hw, hh, hw - r, hh);
  s.lineTo(-hw + r, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - r);
  s.lineTo(-hw, -hh + r);
  s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return s;
}

function createWoodTexture(baseHex: string, maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseHex || '#b67d4b';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 160; i++) {
    const y = (i / 160) * 512;
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(65, 34, 12, 0.14)' : 'rgba(245, 210, 175, 0.08)';
    ctx.lineWidth = 1 + (i % 4);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(
      170,
      y + Math.sin(i * 0.4) * 6,
      340,
      y - Math.cos(i * 0.35) * 6,
      512,
      y + Math.sin(i * 0.2) * 3
    );
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createScreenTexture(variant: 'laptop' | 'monitor' | 'watch' | 'keypad', maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = variant === 'watch' ? 512 : 320;
  const ctx = canvas.getContext('2d')!;

  if (variant === 'keypad') {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 512, 320);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 120px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('75.0', 256, 160);
  } else if (variant === 'watch') {
    const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 250);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(256, 256, 188, -Math.PI / 2, Math.PI * 1.15);
    ctx.stroke();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(256, 256, 156, -Math.PI / 2, Math.PI * 0.85);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 92px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('10:09', 256, 265);
    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('72 BPM · ULTRA', 256, 330);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 512, 320);
    grad.addColorStop(0, '#1e0b2e');
    grad.addColorStop(0.45, '#4c1d95');
    grad.addColorStop(0.78, '#7e22ce');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 320);

    // Architectural light waves
    ctx.fillStyle = 'rgba(232, 121, 249, 0.25)';
    ctx.beginPath();
    ctx.ellipse(340, 150, 150, 95, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.beginPath();
    ctx.ellipse(160, 210, 140, 75, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Clean OS dock bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(120, 276, 272, 26);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createKeyboardTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, 512, 256);

  ctx.fillStyle = '#09090b';
  const rows = 5;
  const cols = 14;
  const padX = 18;
  const padY = 16;
  const keyW = (512 - padX * 2) / cols;
  const keyH = (256 - padY * 2) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillRect(padX + c * keyW + 3, padY + r * keyH + 3, keyW - 6, keyH - 6);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createMeshFabricTexture(hex = '#27272a', maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let y = 0; y < 256; y += 6) {
    for (let x = 0; x < 256; x += 6) {
      if (((x + y) / 6) % 2 === 0) ctx.fillRect(x, y, 3, 3);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function enableShadows(group: THREE.Object3D): void {
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

function normalizeAndGroundGroup(group: THREE.Group, targetW: number, targetH: number, targetD: number): THREE.Group {
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);

  if (size.x > 0 && size.y > 0 && size.z > 0) {
    const sx = targetW / size.x;
    const sy = targetH / size.y;
    const sz = targetD / size.z;
    group.scale.set(sx, sy, sz);
    group.updateMatrixWorld(true);
  }

  // Recompute bounding box after scaling to anchor strictly at bottom-center (x=0, y=0, z=0)
  const scaledBox = new THREE.Box3().setFromObject(group);
  scaledBox.getCenter(center);
  group.position.set(-center.x, -scaledBox.min.y, -center.z);
  group.updateMatrixWorld(true);

  const wrapper = new THREE.Group();
  wrapper.name = 'ProductRoot';
  wrapper.add(group);
  enableShadows(wrapper);
  return wrapper;
}

function buildStandingDesk(w: number, h: number, d: number, finish: ArFinishPreset | undefined, maxAnisotropy: number): THREE.Group {
  const g = new THREE.Group();
  const isCustomFinish = Boolean(finish?.primaryHex);
  const woodHex = finish?.id === 'obsidian' ? '#27272a' : finish?.id === 'silver' ? '#e2e8f0' : finish?.primaryHex || '#c58c55';
  const frameHex = finish?.accentHex || '#1e293b';

  const woodTex = createWoodTexture(woodHex, maxAnisotropy);
  const topMat = new THREE.MeshStandardMaterial({
    color: isCustomFinish && finish?.id !== 'oak' ? woodHex : '#ffffff',
    map: finish?.id === 'silver' || finish?.id === 'obsidian' ? null : woodTex,
    roughness: finish?.roughness ?? 0.55,
    metalness: finish?.metalness ?? 0.06,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: frameHex,
    roughness: 0.34,
    metalness: 0.84,
  });
  const padMat = new THREE.MeshStandardMaterial({
    color: '#09090b',
    roughness: 0.9,
    metalness: 0.05,
  });

  // Tabletop with smooth beveled ExtrudeGeometry
  const topThickness = 0.032;
  const shape = makeRoundedRectShape(w, d, 0.028);
  const topGeo = new THREE.ExtrudeGeometry(shape, {
    depth: topThickness - 0.008,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  topGeo.rotateX(Math.PI / 2);
  const tabletop = new THREE.Mesh(topGeo, topMat);
  tabletop.position.y = h;
  g.add(tabletop);

  // Under-frame rails
  const railGeo = new THREE.BoxGeometry(w * 0.84, 0.035, 0.045);
  const railFront = new THREE.Mesh(railGeo, steelMat);
  railFront.position.set(0, h - topThickness - 0.02, d * 0.28);
  const railBack = new THREE.Mesh(railGeo, steelMat);
  railBack.position.set(0, h - topThickness - 0.02, -d * 0.28);
  g.add(railFront, railBack);

  // Dual telescoping legs & feet
  const legX = w * 0.38;
  const colH = h - topThickness - 0.04;
  [-legX, legX].forEach((xPos) => {
    const outerCol = new THREE.Mesh(new THREE.BoxGeometry(0.065, colH * 0.62, 0.085), steelMat);
    outerCol.position.set(xPos, colH * 0.31 + 0.035, 0);
    g.add(outerCol);

    const innerCol = new THREE.Mesh(new THREE.BoxGeometry(0.052, colH * 0.55, 0.068), steelMat);
    innerCol.position.set(xPos, h - topThickness - colH * 0.25, 0);
    g.add(innerCol);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.026, d * 0.86), steelMat);
    foot.position.set(xPos, 0.02, 0);
    g.add(foot);

    // Rubber leveling feet at ends
    [-d * 0.36, d * 0.36].forEach((zFoot) => {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 16), padMat);
      pad.position.set(xPos, 0.005, zFoot);
      g.add(pad);
    });
  });

  // Cable management tray
  const tray = new THREE.Mesh(new THREE.BoxGeometry(w * 0.58, 0.06, 0.09), steelMat);
  tray.position.set(0, h - topThickness - 0.055, -d * 0.32);
  g.add(tray);

  // Digital Height OLED Keypad on right front edge
  const keypadHousing = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.024, 0.06), padMat);
  keypadHousing.position.set(w * 0.34, h - topThickness - 0.012, d * 0.48);
  g.add(keypadHousing);

  const keypadTex = createScreenTexture('keypad', maxAnisotropy);
  const oledMat = new THREE.MeshStandardMaterial({
    map: keypadTex,
    emissive: '#38bdf8',
    emissiveMap: keypadTex,
    emissiveIntensity: 0.7,
    roughness: 0.2,
  });
  const oledFace = new THREE.Mesh(new THREE.PlaneGeometry(0.055, 0.018), oledMat);
  oledFace.position.set(w * 0.34, h - topThickness - 0.012, d * 0.48 + 0.031);
  g.add(oledFace);

  return normalizeAndGroundGroup(g, w, h, d);
}

function buildErgonomicChair(w: number, h: number, d: number, finish: ArFinishPreset | undefined, maxAnisotropy: number): THREE.Group {
  const g = new THREE.Group();
  const meshHex = finish?.primaryHex || '#1f2937';
  const alumHex = finish?.accentHex || '#cbd5e1';

  const fabricTex = createMeshFabricTexture(meshHex, maxAnisotropy);
  const fabricMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: fabricTex,
    roughness: 0.85,
    metalness: 0.05,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: '#18181b',
    roughness: 0.45,
    metalness: 0.3,
  });
  const alumMat = new THREE.MeshStandardMaterial({
    color: alumHex,
    roughness: 0.22,
    metalness: 0.9,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: '#09090b',
    roughness: 0.75,
    metalness: 0.1,
  });

  const baseRadius = w * 0.48;
  const seatHeight = h * 0.4;

  // 5-Star aluminum base + casters
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.05, 24), alumMat);
  hub.position.y = 0.09;
  g.add(hub);

  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    const arm = new THREE.Group();
    arm.rotation.y = angle;

    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.028, baseRadius), alumMat);
    spoke.position.set(0, 0.075, baseRadius * 0.5);
    spoke.rotation.x = 0.06;
    arm.add(spoke);

    const casterStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 12), alumMat);
    casterStem.position.set(0, 0.052, baseRadius * 0.92);
    arm.add(casterStem);

    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.042, 16), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, 0.028, baseRadius * 0.92);
    arm.add(wheel);

    g.add(arm);
  }

  // Pneumatic gas cylinder
  const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, seatHeight - 0.1, 20), alumMat);
  piston.position.y = (seatHeight - 0.04) * 0.5 + 0.07;
  g.add(piston);

  // Under-seat tilt housing
  const tiltBox = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.2), frameMat);
  tiltBox.position.set(0, seatHeight - 0.03, 0);
  g.add(tiltBox);

  // Contoured Seat Cushion
  const seatShape = makeRoundedRectShape(w * 0.78, d * 0.78, 0.07);
  const seatGeo = new THREE.ExtrudeGeometry(seatShape, {
    depth: 0.065,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 3,
  });
  seatGeo.rotateX(Math.PI / 2);
  const seat = new THREE.Mesh(seatGeo, fabricMat);
  seat.position.set(0, seatHeight + 0.05, 0.02);
  g.add(seat);

  // Dual 4D Armrests
  [-w * 0.44, w * 0.44].forEach((ax) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.22, 0.045), alumMat);
    post.position.set(ax, seatHeight + 0.11, 0);
    g.add(post);

    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.03, 0.26), frameMat);
    pad.position.set(ax, seatHeight + 0.22, 0.03);
    g.add(pad);
  });

  // Backrest Spine + Contoured Ergonomic Frame
  const backHeight = h * 0.48;
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.08, backHeight * 0.72, 0.04), alumMat);
  spine.position.set(0, seatHeight + backHeight * 0.34, -d * 0.38);
  spine.rotation.x = -0.1;
  g.add(spine);

  const backShape = makeRoundedRectShape(w * 0.72, backHeight, 0.09);
  const backGeo = new THREE.ExtrudeGeometry(backShape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 3,
  });
  const backMesh = new THREE.Mesh(backGeo, fabricMat);
  backMesh.position.set(0, seatHeight + backHeight * 0.56, -d * 0.34);
  backMesh.rotation.x = -0.09;
  g.add(backMesh);

  // Lumbar support pillow
  const lumbar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.56, 0.12, 0.055), frameMat);
  lumbar.position.set(0, seatHeight + 0.19, -d * 0.29);
  lumbar.rotation.x = -0.08;
  g.add(lumbar);

  // Adjustable Headrest
  const headrest = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.14, 0.06), fabricMat);
  headrest.position.set(0, h - 0.09, -d * 0.33);
  headrest.rotation.x = 0.08;
  g.add(headrest);

  return normalizeAndGroundGroup(g, w, h, d);
}

function buildCurvedMonitor(w: number, h: number, d: number, finish: ArFinishPreset | undefined, maxAnisotropy: number): THREE.Group {
  const g = new THREE.Group();
  const metalHex = finish?.primaryHex || '#1e293b';
  const metalMat = new THREE.MeshStandardMaterial({
    color: metalHex,
    roughness: finish?.roughness ?? 0.3,
    metalness: finish?.metalness ?? 0.8,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: finish?.accentHex || '#a855f7',
    emissive: finish?.accentHex || '#9333ea',
    emissiveIntensity: 0.45,
    roughness: 0.25,
  });

  const panelW = w;
  const panelH = h * 0.74;
  const standY = h - panelH * 0.5 - 0.02;

  // Curved OLED display arc segment
  const radius = 1.8;
  const thetaLen = Math.min(0.65, panelW / radius);
  const screenGeo = new THREE.CylinderGeometry(
    radius,
    radius,
    panelH,
    36,
    1,
    true,
    Math.PI - thetaLen / 2,
    thetaLen
  );
  const screenTex = createScreenTexture('monitor', maxAnisotropy);
  const screenMat = new THREE.MeshStandardMaterial({
    map: screenTex,
    emissive: '#ffffff',
    emissiveMap: screenTex,
    emissiveIntensity: 0.52,
    roughness: 0.15,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(0, standY, radius - 0.03);
  g.add(screenMesh);

  // Curved Rear Backing Shell
  const backGeo = new THREE.CylinderGeometry(
    radius + 0.016,
    radius + 0.016,
    panelH + 0.016,
    36,
    1,
    true,
    Math.PI - thetaLen / 2 - 0.004,
    thetaLen + 0.008
  );
  const backMesh = new THREE.Mesh(backGeo, metalMat);
  backMesh.position.set(0, standY, radius - 0.03);
  g.add(backMesh);

  // Rear RGB Ring Accent
  const rgbRing = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.008, 12, 32), trimMat);
  rgbRing.position.set(0, standY, -0.045);
  g.add(rgbRing);

  // Vertical Arm Stand & Y-Shaped Desk Foot
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.055, standY + 0.05, 0.045), metalMat);
  neck.position.set(0, (standY + 0.05) * 0.5, -0.075);
  neck.rotation.x = -0.08;
  g.add(neck);

  const footStem = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.12), metalMat);
  footStem.position.set(0, 0.009, -0.06);
  g.add(footStem);

  [-0.36, 0.36].forEach((rot) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.014, d * 0.85), metalMat);
    leg.position.set(Math.sin(rot) * w * 0.16, 0.007, 0.02);
    leg.rotation.y = rot;
    g.add(leg);
  });

  return normalizeAndGroundGroup(g, w, h, d);
}

function buildLaptop(w: number, h: number, d: number, finish: ArFinishPreset | undefined, maxAnisotropy: number): THREE.Group {
  const g = new THREE.Group();
  const bodyHex = finish?.primaryHex || '#94a3b8';
  const alumMat = new THREE.MeshStandardMaterial({
    color: bodyHex,
    roughness: finish?.roughness ?? 0.24,
    metalness: finish?.metalness ?? 0.88,
  });
  const kbTex = createKeyboardTexture(maxAnisotropy);
  const kbMat = new THREE.MeshStandardMaterial({
    map: kbTex,
    roughness: 0.72,
    metalness: 0.15,
  });
  const trackpadMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.18,
    metalness: 0.4,
  });

  const baseH = Math.max(0.011, Math.min(0.018, h * 0.65));

  // Unibody Lower Chassis
  const baseShape = makeRoundedRectShape(w, d, 0.014);
  const baseGeo = new THREE.ExtrudeGeometry(baseShape, {
    depth: baseH,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 2,
  });
  baseGeo.rotateX(Math.PI / 2);
  const base = new THREE.Mesh(baseGeo, alumMat);
  base.position.y = baseH + 0.003;
  g.add(base);

  // Rubber Feet
  [
    [-w * 0.42, -d * 0.4],
    [w * 0.42, -d * 0.4],
    [-w * 0.42, d * 0.4],
    [w * 0.42, d * 0.4],
  ].forEach(([fx, fz]) => {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.003, 12), trackpadMat);
    foot.position.set(fx, 0.0015, fz);
    g.add(foot);
  });

  // Keyboard & Trackpad Deck
  const keyboard = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.84, d * 0.42), kbMat);
  keyboard.rotation.x = -Math.PI / 2;
  keyboard.position.set(0, baseH + 0.0055, -d * 0.14);
  g.add(keyboard);

  const trackpad = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.36, d * 0.28), trackpadMat);
  trackpad.rotation.x = -Math.PI / 2;
  trackpad.position.set(0, baseH + 0.0055, d * 0.26);
  g.add(trackpad);

  // Open Hinged Retina Display Lid
  const lidGroup = new THREE.Group();
  lidGroup.position.set(0, baseH + 0.003, -d * 0.48);
  lidGroup.rotation.x = -0.26; // Open ~105 deg

  const lidBack = new THREE.Mesh(new THREE.BoxGeometry(w, d * 0.94, 0.006), alumMat);
  lidBack.position.set(0, d * 0.47, 0);
  lidGroup.add(lidBack);

  const bezel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.97, d * 0.9, 0.002), trackpadMat);
  bezel.position.set(0, d * 0.47, 0.0035);
  lidGroup.add(bezel);

  const scrTex = createScreenTexture('laptop', maxAnisotropy);
  const scrMat = new THREE.MeshStandardMaterial({
    map: scrTex,
    emissive: '#ffffff',
    emissiveMap: scrTex,
    emissiveIntensity: 0.48,
    roughness: 0.1,
  });
  const scrMesh = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, d * 0.82), scrMat);
  scrMesh.position.set(0, d * 0.48, 0.005);
  lidGroup.add(scrMesh);

  g.add(lidGroup);
  // Keep authentic open-laptop height relative to real footprint
  const scaledHeight = Math.max(h * 11, d * 0.85);
  return normalizeAndGroundGroup(g, w, scaledHeight, d * 1.15);
}

function buildConsole(w: number, h: number, d: number, finish: ArFinishPreset | undefined): THREE.Group {
  const g = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({
    color: finish?.primaryHex || '#f8fafc',
    roughness: finish?.roughness ?? 0.32,
    metalness: finish?.metalness ?? 0.12,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: '#09090b',
    roughness: 0.12,
    metalness: 0.55,
  });
  const ledMat = new THREE.MeshStandardMaterial({
    color: finish?.accentHex || '#38bdf8',
    emissive: finish?.accentHex || '#38bdf8',
    emissiveIntensity: 1.4,
  });

  // Note: console can stand vertically on room/desk shelf -> height > width visually or horizontal footprint
  const bodyH = Math.max(h * 2.2, 0.32);
  const standBase = new THREE.Mesh(new THREE.CylinderGeometry(d * 0.42, d * 0.45, 0.018, 28), coreMat);
  standBase.position.y = 0.009;
  g.add(standBase);

  const core = new THREE.Mesh(new THREE.BoxGeometry(w * 0.22, bodyH, d * 0.86), coreMat);
  core.position.y = bodyH * 0.5 + 0.018;
  g.add(core);

  // Twin flared faceplates
  [-w * 0.14, w * 0.14].forEach((sx) => {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.014, bodyH * 1.03, d * 0.95), shellMat);
    plate.position.set(sx, bodyH * 0.5 + 0.02, 0);
    plate.rotation.z = sx < 0 ? 0.04 : -0.04;
    g.add(plate);
  });

  // Glowing side LED channels
  [-w * 0.115, w * 0.115].forEach((lx) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.006, bodyH * 0.82, 0.012), ledMat);
    strip.position.set(lx, bodyH * 0.52, d * 0.42);
    g.add(strip);
  });

  return normalizeAndGroundGroup(g, Math.max(w * 0.45, 0.14), bodyH, d);
}

function buildCoffeeMaker(w: number, h: number, d: number, finish: ArFinishPreset | undefined): THREE.Group {
  const g = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({
    color: finish?.primaryHex || '#d4d4d8',
    roughness: finish?.roughness ?? 0.22,
    metalness: finish?.metalness ?? 0.88,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: '#18181b',
    roughness: 0.48,
    metalness: 0.25,
  });
  const hopperMat = new THREE.MeshPhysicalMaterial({
    color: '#451a03',
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.78,
  });

  // Base & Drip Tray
  const dripTray = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.045, d * 0.92), steelMat);
  dripTray.position.set(0, 0.0225, 0);
  g.add(dripTray);

  // Main Tower
  const tower = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h * 0.74, d * 0.62), steelMat);
  tower.position.set(0, h * 0.37 + 0.04, -d * 0.15);
  g.add(tower);

  // Upper Brew Head Canopy
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, h * 0.22, d * 0.86), steelMat);
  canopy.position.set(0, h * 0.68, 0.02);
  g.add(canopy);

  // Touch Display
  const touchScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.48, h * 0.14),
    new THREE.MeshStandardMaterial({ color: '#0f172a', emissive: '#6d28d9', emissiveIntensity: 0.55 })
  );
  touchScreen.position.set(0, h * 0.7, d * 0.452);
  g.add(touchScreen);

  // Bean Hopper on top
  const hopper = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.25, w * 0.19, h * 0.2, 24), hopperMat);
  hopper.position.set(0, h * 0.89, -d * 0.06);
  g.add(hopper);

  // Portafilter Group + Handle
  const groupHead = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.042, 0.05, 20), steelMat);
  groupHead.position.set(0, h * 0.54, d * 0.22);
  g.add(groupHead);

  const pfHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.14, 16), darkMat);
  pfHandle.rotation.x = Math.PI / 2;
  pfHandle.position.set(0, h * 0.52, d * 0.34);
  g.add(pfHandle);

  // Steam Wand Tube
  const wandCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(w * 0.28, h * 0.56, d * 0.18),
    new THREE.Vector3(w * 0.32, h * 0.42, d * 0.25),
    new THREE.Vector3(w * 0.34, h * 0.26, d * 0.29),
  ]);
  const wand = new THREE.Mesh(new THREE.TubeGeometry(wandCurve, 12, 0.008, 8, false), steelMat);
  g.add(wand);

  return normalizeAndGroundGroup(g, w, h, d);
}

function buildHeadphones(w: number, h: number, d: number, finish: ArFinishPreset | undefined): THREE.Group {
  const g = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: finish?.primaryHex || '#64748b',
    roughness: finish?.roughness ?? 0.22,
    metalness: finish?.metalness ?? 0.88,
  });
  const cushionMat = new THREE.MeshStandardMaterial({
    color: finish?.accentHex || '#1e293b',
    roughness: 0.78,
    metalness: 0.08,
  });

  // Curved headband arc
  const band = new THREE.Mesh(new THREE.TorusGeometry(w * 0.42, 0.014, 14, 36, Math.PI), cushionMat);
  band.position.y = h * 0.56;
  g.add(band);

  // Dual Earcups + Cushions + Arms
  [-w * 0.42, w * 0.42].forEach((ex) => {
    const slider = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, h * 0.34, 12), metalMat);
    slider.position.set(ex, h * 0.42, 0);
    g.add(slider);

    const cup = new THREE.Mesh(new THREE.CylinderGeometry(d * 0.48, d * 0.44, 0.032, 28), metalMat);
    cup.rotation.z = Math.PI / 2;
    cup.position.set(ex * 0.94, h * 0.28, 0);
    g.add(cup);

    const pad = new THREE.Mesh(new THREE.TorusGeometry(d * 0.42, 0.018, 12, 28), cushionMat);
    pad.rotation.y = Math.PI / 2;
    pad.position.set(ex * 0.82, h * 0.28, 0);
    g.add(pad);
  });

  return normalizeAndGroundGroup(g, w, h, d);
}

function buildSmartwatch(w: number, h: number, d: number, finish: ArFinishPreset | undefined, maxAnisotropy: number): THREE.Group {
  const g = new THREE.Group();
  const titaniumMat = new THREE.MeshStandardMaterial({
    color: finish?.primaryHex || '#cbd5e1',
    roughness: finish?.roughness ?? 0.26,
    metalness: finish?.metalness ?? 0.9,
  });
  const strapMat = new THREE.MeshStandardMaterial({
    color: finish?.accentHex || '#ea580c',
    roughness: 0.68,
    metalness: 0.05,
  });

  // Curved Sport Strap Loop
  const bandLoop = new THREE.Mesh(new THREE.TorusGeometry(d * 0.72, 0.012, 12, 32), strapMat);
  bandLoop.rotation.y = Math.PI / 2;
  bandLoop.position.set(0, d * 0.72, 0);
  g.add(bandLoop);

  // Titanium Watch Case sitting upright
  const caseShape = makeRoundedRectShape(w, d * 0.9, 0.01);
  const caseGeo = new THREE.ExtrudeGeometry(caseShape, {
    depth: h,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 2,
  });
  const watchCase = new THREE.Mesh(caseGeo, titaniumMat);
  watchCase.position.set(0, d * 1.44, -h * 0.5);
  g.add(watchCase);

  const watchTex = createScreenTexture('watch', maxAnisotropy);
  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.78, d * 0.74),
    new THREE.MeshStandardMaterial({
      map: watchTex,
      emissive: '#ffffff',
      emissiveMap: watchTex,
      emissiveIntensity: 0.65,
      roughness: 0.08,
    })
  );
  screenMesh.position.set(0, d * 1.44, h * 0.52);
  g.add(screenMesh);

  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.006, 16), titaniumMat);
  crown.rotation.z = Math.PI / 2;
  crown.position.set(w * 0.54, d * 1.44, 0);
  g.add(crown);

  return normalizeAndGroundGroup(g, Math.max(w, 0.06), Math.max(d * 1.9, 0.085), Math.max(d * 1.5, 0.07));
}

function buildCinemaCamera(w: number, h: number, d: number, finish: ArFinishPreset | undefined): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: finish?.primaryHex || '#18181b',
    roughness: finish?.roughness ?? 0.55,
    metalness: finish?.metalness ?? 0.38,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: finish?.accentHex || '#71717a',
    roughness: 0.25,
    metalness: 0.85,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#1e1b4b',
    roughness: 0.05,
    metalness: 0.2,
    clearcoat: 1.0,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.78, d * 0.48), bodyMat);
  body.position.set(0, h * 0.39, -d * 0.24);
  g.add(body);

  const evf = new THREE.Mesh(new THREE.BoxGeometry(w * 0.36, h * 0.22, d * 0.24), bodyMat);
  evf.position.set(0, h * 0.86, -d * 0.22);
  g.add(evf);

  const lensBarrel = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.32, h * 0.34, d * 0.56, 28), metalMat);
  lensBarrel.rotation.x = Math.PI / 2;
  lensBarrel.position.set(0, h * 0.38, d * 0.22);
  g.add(lensBarrel);

  const focusRing = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.345, h * 0.345, d * 0.16, 28), bodyMat);
  focusRing.rotation.x = Math.PI / 2;
  focusRing.position.set(0, h * 0.38, d * 0.24);
  g.add(focusRing);

  const glassElement = new THREE.Mesh(new THREE.CircleGeometry(h * 0.26, 28), glassMat);
  glassElement.position.set(0, h * 0.38, d * 0.505);
  g.add(glassElement);

  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.015, 18), metalMat);
  dial.position.set(w * 0.32, h * 0.82, -d * 0.24);
  g.add(dial);

  return normalizeAndGroundGroup(g, w, h, d);
}

function buildLuggage(w: number, h: number, d: number, finish: ArFinishPreset | undefined): THREE.Group {
  const g = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({
    color: finish?.primaryHex || '#1e293b',
    roughness: finish?.roughness ?? 0.38,
    metalness: finish?.metalness ?? 0.42,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: finish?.accentHex || '#cbd5e1',
    roughness: 0.25,
    metalness: 0.85,
  });
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.8 });

  const caseH = h * 0.78;
  const shape = makeRoundedRectShape(w, caseH, 0.045);
  const caseGeo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 3,
  });
  const body = new THREE.Mesh(caseGeo, shellMat);
  body.position.set(0, caseH * 0.5 + 0.06, -d * 0.5);
  g.add(body);

  // Vertical ribbed armor lines
  [-w * 0.28, 0, w * 0.28].forEach((rx) => {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.016, caseH * 0.82, d + 0.036), metalMat);
    rib.position.set(rx, caseH * 0.5 + 0.06, 0);
    g.add(rib);
  });

  // Telescoping Handle
  [-w * 0.16, w * 0.16].forEach((hx) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, h * 0.26, 12), metalMat);
    rod.position.set(hx, caseH + h * 0.14, -d * 0.25);
    g.add(rod);
  });
  const grip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.025, 0.035), wheelMat);
  grip.position.set(0, h - 0.015, -d * 0.25);
  g.add(grip);

  // 4 Spinner Wheels
  [
    [-w * 0.36, -d * 0.32],
    [w * 0.36, -d * 0.32],
    [-w * 0.36, d * 0.32],
    [w * 0.36, d * 0.32],
  ].forEach(([wx, wz]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.032, 16), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.026, wz);
    g.add(wheel);
  });

  return normalizeAndGroundGroup(g, w, h, d);
}

function buildGenericModel(
  modelType: ArModelType,
  w: number,
  h: number,
  d: number,
  finish: ArFinishPreset | undefined
): THREE.Group {
  const g = new THREE.Group();
  const mainMat = new THREE.MeshStandardMaterial({
    color: finish?.primaryHex || (modelType === 'generic_furniture' ? '#92400e' : '#334155'),
    roughness: finish?.roughness ?? (modelType === 'generic_furniture' ? 0.68 : 0.32),
    metalness: finish?.metalness ?? (modelType === 'generic_furniture' ? 0.08 : 0.72),
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: finish?.accentHex || '#a855f7',
    roughness: 0.25,
    metalness: 0.7,
  });

  const shape = makeRoundedRectShape(w, d, Math.min(w, d) * 0.08);
  const bodyGeo = new THREE.ExtrudeGeometry(shape, {
    depth: h * 0.86,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, mainMat);
  body.position.y = h * 0.94;
  g.add(body);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, h * 0.05, d * 0.92), accentMat);
  trim.position.y = h * 0.05;
  g.add(trim);

  const topAccent = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, 0.008, d * 0.65), accentMat);
  topAccent.position.y = h * 0.96;
  g.add(topAccent);

  return normalizeAndGroundGroup(g, w, h, d);
}

export function buildArProductGroup(
  product: Product,
  options: BuildArModelOptions = {}
): { group: THREE.Group; dims: ProductDimensions & { arModelType: ArModelType } } {
  const dims = getProductDimensions(product);
  const maxAnisotropy = options.maxAnisotropy ?? 4;
  const finish = options.finishPreset && options.finishPreset.id !== 'default' ? options.finishPreset : undefined;

  // Convert real dimensions from cm to meters (1 Three.js unit = 1 meter)
  const w = Math.max(0.04, dims.widthCm / 100);
  const h = Math.max(0.015, dims.heightCm / 100);
  const d = Math.max(0.04, dims.depthCm / 100);

  let group: THREE.Group;
  switch (dims.arModelType) {
    case 'desk':
      group = buildStandingDesk(w, h, d, finish, maxAnisotropy);
      break;
    case 'chair':
      group = buildErgonomicChair(w, h, d, finish, maxAnisotropy);
      break;
    case 'monitor':
      group = buildCurvedMonitor(w, h, d, finish, maxAnisotropy);
      break;
    case 'laptop':
      group = buildLaptop(w, h, d, finish, maxAnisotropy);
      break;
    case 'console':
      group = buildConsole(w, h, d, finish);
      break;
    case 'coffee_maker':
      group = buildCoffeeMaker(w, h, d, finish);
      break;
    case 'headphones':
      group = buildHeadphones(w, h, d, finish);
      break;
    case 'smartwatch':
      group = buildSmartwatch(w, h, d, finish, maxAnisotropy);
      break;
    case 'camera':
      group = buildCinemaCamera(w, h, d, finish);
      break;
    case 'luggage':
      group = buildLuggage(w, h, d, finish);
      break;
    default:
      group = buildGenericModel(dims.arModelType, w, h, d, finish);
  }

  return { group, dims };
}

export function buildReferenceObjectGroup(refId: ArReferenceItemId): THREE.Group | null {
  if (refId === 'none') return null;
  const spec = AR_REFERENCE_ITEMS.find((r) => r.id === refId);
  if (!spec) return null;

  const w = spec.widthCm / 100;
  const h = spec.heightCm / 100;
  const d = spec.depthCm / 100;

  const group = new THREE.Group();
  group.name = 'ReferenceObject';

  const bodyMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    roughness: 0.35,
    metalness: 0.35,
    transparent: true,
    opacity: 0.85,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.25,
    metalness: 0.6,
  });

  if (refId === 'mug') {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.45, h, 24), bodyMat);
    cup.position.y = h * 0.5;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(h * 0.28, 0.006, 10, 20, Math.PI), bodyMat);
    handle.rotation.z = -Math.PI / 2;
    handle.position.set(w * 0.48, h * 0.5, 0);
    group.add(cup, handle);
  } else if (refId === 'dining_chair') {
    const legH = 0.45;
    [
      [-w * 0.42, -d * 0.42],
      [w * 0.42, -d * 0.42],
      [-w * 0.42, d * 0.42],
      [w * 0.42, d * 0.42],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, legH, 12), bodyMat);
      leg.position.set(lx, legH * 0.5, lz);
      group.add(leg);
    });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), bodyMat);
    seat.position.set(0, legH + 0.02, 0);
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h - legH, 0.035), bodyMat);
    back.position.set(0, legH + (h - legH) * 0.5, -d * 0.46);
    group.add(seat, back);
  } else {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), refId === 'smartphone' ? darkMat : bodyMat);
    mesh.position.y = h * 0.5;
    group.add(mesh);

    if (refId === 'smartphone') {
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.88, h * 0.9),
        new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.45 })
      );
      screen.position.set(0, h * 0.5, d * 0.52);
      group.add(screen);
    }
  }

  // Subtle floor ring under reference object
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(Math.max(w, d) * 0.52, Math.max(w, d) * 0.56, 32),
    new THREE.MeshBasicMaterial({ color: '#38bdf8', side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.002;
  group.add(ring);

  enableShadows(group);
  return group;
}

export function buildDimensionGuidesGroup(
  productBoxSize: THREE.Vector3,
  options: {
    showDimensions: boolean;
    fitCheckEnabled: boolean;
    availableWidthCm: number;
    availableDepthCm: number;
    fits: boolean;
  }
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'DimensionGuides';

  const w = productBoxSize.x;
  const h = productBoxSize.y;
  const d = productBoxSize.z;

  if (options.showDimensions) {
    // 1. Floor footprint bounding rectangle at y = 0.003
    const footprintColor = options.fitCheckEnabled
      ? options.fits
        ? '#10b981'
        : '#f43f5e'
      : '#e879f9';

    const fpPts = [
      new THREE.Vector3(-w / 2, 0.003, -d / 2),
      new THREE.Vector3(w / 2, 0.003, -d / 2),
      new THREE.Vector3(w / 2, 0.003, d / 2),
      new THREE.Vector3(-w / 2, 0.003, d / 2),
      new THREE.Vector3(-w / 2, 0.003, -d / 2),
    ];
    const fpLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(fpPts),
      new THREE.LineBasicMaterial({ color: footprintColor, transparent: true, opacity: 0.92 })
    );
    group.add(fpLine);

    // Subtle translucent base fill
    const fpFill = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({
        color: footprintColor,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    fpFill.rotation.x = -Math.PI / 2;
    fpFill.position.y = 0.002;
    group.add(fpFill);

    // 2. Caliper Dimension Rails (Width on front floor, Height on left edge, Depth on right edge)
    const offset = 0.045;
    const widthRail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-w / 2, 0.005, d / 2 + offset),
        new THREE.Vector3(w / 2, 0.005, d / 2 + offset),
      ]),
      new THREE.LineBasicMaterial({ color: '#c084fc' })
    );
    const heightRail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-w / 2 - offset, 0, d / 2),
        new THREE.Vector3(-w / 2 - offset, h, d / 2),
      ]),
      new THREE.LineBasicMaterial({ color: '#fbbf24' })
    );
    const depthRail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(w / 2 + offset, 0.005, -d / 2),
        new THREE.Vector3(w / 2 + offset, 0.005, d / 2),
      ]),
      new THREE.LineBasicMaterial({ color: '#34d399' })
    );
    group.add(widthRail, heightRail, depthRail);
  }

  // 3. Target User Room/Table Boundary Rectangle (when Room Fit Tester is enabled)
  if (options.fitCheckEnabled) {
    const aw = Math.max(0.1, options.availableWidthCm / 100);
    const ad = Math.max(0.1, options.availableDepthCm / 100);
    const boundColor = options.fits ? '#10b981' : '#f43f5e';
    const boundaryPts = [
      new THREE.Vector3(-aw / 2, 0.004, -ad / 2),
      new THREE.Vector3(aw / 2, 0.004, -ad / 2),
      new THREE.Vector3(aw / 2, 0.004, ad / 2),
      new THREE.Vector3(-aw / 2, 0.004, ad / 2),
      new THREE.Vector3(-aw / 2, 0.004, -ad / 2),
    ];
    const boundaryGeo = new THREE.BufferGeometry().setFromPoints(boundaryPts);
    const boundaryMat = new THREE.LineDashedMaterial({
      color: boundColor,
      dashSize: 0.06,
      gapSize: 0.03,
    });
    const boundaryLine = new THREE.Line(boundaryGeo, boundaryMat);
    boundaryLine.computeLineDistances();
    group.add(boundaryLine);
  }

  return group;
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = mesh.material;
    if (mat) {
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial;
        std.map?.dispose();
        std.emissiveMap?.dispose();
        std.roughnessMap?.dispose();
        std.normalMap?.dispose();
        m.dispose();
      }
    }
  });
}
