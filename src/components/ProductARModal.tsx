import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  X,
  Camera,
  RotateCw,
  Move,
  Box,
  Layers,
  Ruler,
  SwitchCamera,
  Lock,
  Unlock,
  Download,
  AlertTriangle,
  Sparkles,
  ShoppingCart,
  Eye,
  Maximize2,
  CheckCircle2,
  SunMedium,
  Rotate3d,
  ChevronDown,
  ChevronUp,
  Palette,
  Grid3x3,
  Armchair,
  MonitorSmartphone,
} from 'lucide-react';
import { Product, ProductVariant, StoreSettings } from '../types';
import { formatPrice } from '../utils/currency';
import { useLanguage } from '../contexts/LanguageContext';
import { getLocalizedProductName } from '../utils/i18n';
import {
  AR_FINISH_PRESETS,
  AR_REFERENCE_ITEMS,
  ArFinishPreset,
  ArReferenceItemId,
  clampRoomPlacement,
  computeRoomFitAnalysis,
  getProductDimensions,
  isFloorFurnitureModel,
} from '../utils/arCalibration';
import {
  buildArProductGroup,
  buildDimensionGuidesGroup,
  buildReferenceObjectGroup,
  disposeObject3D,
} from '../utils/arModels';

export { getProductDimensions };

interface ProductARModalProps {
  isOpen: boolean;
  product: Product | null;
  allProducts?: Product[];
  initialVariant?: ProductVariant;
  onClose: () => void;
  onAddToCart?: (product: Product, variant?: ProductVariant) => void;
  settings?: StoreSettings;
}

type CameraStatus = 'requesting' | 'active' | 'denied' | 'unavailable' | 'simulated';
type RoomBackdropPreset = 'living_room' | 'workspace_desk';
type InteractionMode = 'place' | 'orbit';

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const ProductARModal: React.FC<ProductARModalProps> = ({
  isOpen,
  product,
  allProducts,
  initialVariant,
  onClose,
  onAddToCart,
  settings,
}) => {
  if (!isOpen || !product) return null;

  return (
    <ProductARContent
      key={product.id}
      initialProduct={product}
      allProducts={allProducts}
      initialVariant={initialVariant}
      onClose={onClose}
      onAddToCart={onAddToCart}
      settings={settings}
    />
  );
};

interface ProductARContentProps {
  initialProduct: Product;
  allProducts?: Product[];
  initialVariant?: ProductVariant;
  onClose: () => void;
  onAddToCart?: (product: Product, variant?: ProductVariant) => void;
  settings?: StoreSettings;
}

const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _hitPoint = new THREE.Vector3();

const ProductARContent: React.FC<ProductARContentProps> = ({
  initialProduct,
  allProducts,
  initialVariant,
  onClose,
  onAddToCart,
  settings,
}) => {
  const { lang, isRtl } = useLanguage();

  const [activeProduct, setActiveProduct] = useState<Product>(initialProduct);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    initialVariant || initialProduct.variants?.[0]
  );

  const dims = useMemo(() => getProductDimensions(activeProduct), [activeProduct]);
  const isFurniture = useMemo(() => isFloorFurnitureModel(dims.arModelType), [dims.arModelType]);
  const maxDimCm = Math.max(dims.widthCm, dims.heightCm, dims.depthCm);

  const defaultDistanceMeters = useMemo(() => {
    if (maxDimCm >= 110) return 2.35;
    if (maxDimCm >= 50) return 1.55;
    if (maxDimCm >= 25) return 1.05;
    return 0.6;
  }, [maxDimCm]);

  const minDistance = maxDimCm < 20 ? 0.32 : 0.65;
  const maxDistance = maxDimCm >= 100 ? 4.2 : 2.8;

  // Refs for WebRTC Video & Isolated Three.js Mount
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  // Camera & Environment State
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('requesting');
  const [cameraErrorText, setCameraErrorText] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [roomPreset, setRoomPreset] = useState<RoomBackdropPreset>(
    isFurniture ? 'living_room' : 'workspace_desk'
  );

  // Spatial AR Placement State
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('place');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [distanceMeters, setDistanceMeters] = useState<number>(defaultDistanceMeters);
  const [yawDeg, setYawDeg] = useState<number>(22);
  const [cameraPitchDeg, setCameraPitchDeg] = useState<number>(isFurniture ? 24 : 28);
  const [placementOffset, setPlacementOffset] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [showDimensionGuides, setShowDimensionGuides] = useState<boolean>(true);
  const [roomLightIntensity, setRoomLightIntensity] = useState<number>(1.15);
  const [finishId, setFinishId] = useState<string>('default');
  const [referenceId, setReferenceId] = useState<ArReferenceItemId>(
    isFurniture ? 'none' : 'smartphone'
  );

  // Room/Space Fit Tester State
  const [fitCheckEnabled, setFitCheckEnabled] = useState<boolean>(false);
  const [availableWidthCm, setAvailableWidthCm] = useState<number>(() =>
    Math.round(dims.widthCm + 40)
  );
  const [availableDepthCm, setAvailableDepthCm] = useState<number>(() =>
    Math.round(dims.depthCm + 35)
  );

  // Collapsible Bottom HUD & Snapshot
  const [hudExpanded, setHudExpanded] = useState<boolean>(true);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [webglReady, setWebglReady] = useState<boolean>(false);

  const rotated90 = useMemo(() => {
    const mod = ((Math.abs(yawDeg) % 180) + 180) % 180;
    return mod >= 45 && mod <= 135;
  }, [yawDeg]);

  const roomFit = useMemo(
    () => computeRoomFitAnalysis(dims, availableWidthCm, availableDepthCm, rotated90),
    [dims, availableWidthCm, availableDepthCm, rotated90]
  );

  // Switch active product cleanly inside AR studio
  const handleSelectProductInAr = (nextProd: Product) => {
    const nextDims = getProductDimensions(nextProd);
    const nextFurn = isFloorFurnitureModel(nextDims.arModelType);
    const nextMax = Math.max(nextDims.widthCm, nextDims.heightCm, nextDims.depthCm);
    setActiveProduct(nextProd);
    setSelectedVariant(nextProd.variants?.[0]);
    setPlacementOffset({ x: 0, z: 0 });
    setYawDeg(22);
    setIsLocked(false);
    setFinishId('default');
    setAvailableWidthCm(Math.round(nextDims.widthCm + 40));
    setAvailableDepthCm(Math.round(nextDims.depthCm + 35));
    setDistanceMeters(
      nextMax >= 110 ? 2.35 : nextMax >= 50 ? 1.55 : nextMax >= 25 ? 1.05 : 0.6
    );
    setRoomPreset(nextFurn ? 'living_room' : 'workspace_desk');
    setReferenceId(nextFurn ? 'none' : 'smartphone');
  };

  // Three.js Engine Refs
  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    keyLight: THREE.DirectionalLight;
    fillLight: THREE.HemisphereLight;
    productPivot: THREE.Group;
    guidesGroup: THREE.Group;
    refGroup: THREE.Group;
    shadowFloor: THREE.Mesh;
    gridHelper: THREE.GridHelper;
    targetCamSpherical: { dist: number; pitchRad: number; orbitAzimuthRad: number };
    currentCamSpherical: { dist: number; pitchRad: number; orbitAzimuthRad: number };
    targetProductPos: { x: number; z: number; yawRad: number };
    currentProductPos: { x: number; z: number; yawRad: number };
    isSoftwareGl: boolean;
    requestRender: () => void;
  } | null>(null);

  // Live Pointer Drag Ref
  const pointerStateRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    dragOffset: { dx: number; dz: number };
  }>({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    dragOffset: { dx: 0, dz: 0 },
  });

  // WebRTC Camera Controls
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (requestedFacing: 'environment' | 'user') => {
      stopCameraStream();
      setCameraStatus('requesting');
      setCameraErrorText('');

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraStatus('unavailable');
        setCameraErrorText(
          isRtl
            ? 'المتصفح الحالي لا يدعم الوصول المباشر للكاميرا. يمكنك المعاينة فوراً في الغرفة الافتراضية المعايرة.'
            : 'Live camera access is unavailable in this browser. Switch to the calibrated virtual room.'
        );
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: requestedFacing },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (err) {
          const errName = err instanceof DOMException ? err.name : '';
          if (errName === 'OverconstrainedError' || errName === 'ConstraintNotSatisfiedError') {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } else {
            throw err;
          }
        }

        streamRef.current = stream;
        setCameraStatus('active');
      } catch (err) {
        const errName = err instanceof DOMException ? err.name : '';
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          setCameraStatus('denied');
          setCameraErrorText(
            isRtl
              ? 'تم رفض صلاحية الكاميرا. اسمح بالوصول للكاميرا من إعدادات المتصفح أو جرّب الغرفة الافتراضية التفاعلية.'
              : 'Camera permission was denied. Enable camera access or use the interactive virtual room.'
          );
        } else {
          setCameraStatus('unavailable');
          setCameraErrorText(
            isRtl
              ? 'لم يتم العثور على كاميرا متصلة حالياً. يمكنك وضع المنتج وتحريكه ثلاثي الأبعاد داخل الغرفة الافتراضية.'
              : 'No camera detected. Continue placing and scaling the 3D model inside the calibrated room.'
          );
        }
      }
    },
    [isRtl, stopCameraStream]
  );

  useEffect(() => {
    if (cameraStatus === 'active' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStatus]);

  useEffect(() => {
    startCamera('environment');
    return () => {
      stopCameraStream();
    };
  }, [startCamera, stopCameraStream]);

  // Escape Key Close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'h' || e.key === 'H') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') {
          setHudExpanded((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Initialize Three.js Transparent AR WebGL Renderer Once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
    } catch {
      setWebglReady(false);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const rect = mount.getBoundingClientRect();
    const initW = Math.max(320, Math.round(rect.width) || 720);
    const initH = Math.max(260, Math.round(rect.height) || 480);
    renderer.setSize(initW, initH);

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Generate Studio Environment Reflection Map cleanly
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(52, initW / initH, 0.04, 40);

    // 3-Point Warm/Cool Studio Rig over Camera Feed
    const fillLight = new THREE.HemisphereLight(0xf1f5f9, 0x334155, 0.95);
    scene.add(fillLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 1.85);
    keyLight.position.set(2.4, 4.2, 2.6);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.2;
      keyLight.shadow.camera.far = 14;
      const d = 2.6;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd8b4fe, 0.55);
    rimLight.position.set(-2.5, 2.1, -2.8);
    scene.add(rimLight);

    // Transparent Shadow-Catching Room Plane directly over live camera feed
    const shadowFloorGeo = new THREE.PlaneGeometry(12, 12);
    shadowFloorGeo.rotateX(-Math.PI / 2);
    const shadowFloorMat = new THREE.ShadowMaterial({ opacity: 0.42 });
    const shadowFloor = new THREE.Mesh(shadowFloorGeo, shadowFloorMat);
    shadowFloor.receiveShadow = true;
    scene.add(shadowFloor);

    // Subtle AR calibration surface grid (0.25m squares)
    const gridHelper = new THREE.GridHelper(6, 24, 0xc084fc, 0x64748b);
    gridHelper.position.y = 0.001;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.28;
    scene.add(gridHelper);

    const productPivot = new THREE.Group();
    const guidesGroup = new THREE.Group();
    const refGroup = new THREE.Group();
    scene.add(productPivot, guidesGroup, refGroup);

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;
    let lastTime = performance.now();

    const targetCamSpherical = {
      dist: defaultDistanceMeters,
      pitchRad: THREE.MathUtils.degToRad(cameraPitchDeg),
      orbitAzimuthRad: 0,
    };
    const currentCamSpherical = { ...targetCamSpherical };

    const targetProductPos = {
      x: 0,
      z: 0,
      yawRad: THREE.MathUtils.degToRad(yawDeg),
    };
    const currentProductPos = { ...targetProductPos };

    const updateTransforms = (dt: number) => {
      const smooth = isSoftwareGl ? 1 : 1 - Math.exp(-12 * dt);

      currentCamSpherical.dist = THREE.MathUtils.lerp(
        currentCamSpherical.dist,
        targetCamSpherical.dist,
        smooth
      );
      currentCamSpherical.pitchRad = THREE.MathUtils.lerp(
        currentCamSpherical.pitchRad,
        targetCamSpherical.pitchRad,
        smooth
      );
      currentCamSpherical.orbitAzimuthRad = THREE.MathUtils.lerp(
        currentCamSpherical.orbitAzimuthRad,
        targetCamSpherical.orbitAzimuthRad,
        smooth
      );

      currentProductPos.x = THREE.MathUtils.lerp(
        currentProductPos.x,
        targetProductPos.x,
        smooth
      );
      currentProductPos.z = THREE.MathUtils.lerp(
        currentProductPos.z,
        targetProductPos.z,
        smooth
      );
      currentProductPos.yawRad = THREE.MathUtils.lerp(
        currentProductPos.yawRad,
        targetProductPos.yawRad,
        smooth
      );

      productPivot.position.set(currentProductPos.x, 0, currentProductPos.z);
      productPivot.rotation.y = currentProductPos.yawRad;

      guidesGroup.position.set(currentProductPos.x, 0, currentProductPos.z);
      guidesGroup.rotation.y = currentProductPos.yawRad;

      const box = new THREE.Box3().setFromObject(productPivot);
      const centerH = box.isEmpty() ? 0.25 : Math.max(0.12, (box.max.y + box.min.y) * 0.48);

      const cosP = Math.cos(currentCamSpherical.pitchRad);
      const sinP = Math.sin(currentCamSpherical.pitchRad);
      const r = currentCamSpherical.dist;
      camera.position.set(
        Math.sin(currentCamSpherical.orbitAzimuthRad) * cosP * r,
        centerH + sinP * r,
        Math.cos(currentCamSpherical.orbitAzimuthRad) * cosP * r
      );
      camera.lookAt(0, centerH * 0.85, 0);

      const stillMoving =
        Math.abs(currentCamSpherical.dist - targetCamSpherical.dist) > 0.001 ||
        Math.abs(currentCamSpherical.pitchRad - targetCamSpherical.pitchRad) > 0.001 ||
        Math.abs(currentCamSpherical.orbitAzimuthRad - targetCamSpherical.orbitAzimuthRad) > 0.001 ||
        Math.abs(currentProductPos.x - targetProductPos.x) > 0.001 ||
        Math.abs(currentProductPos.z - targetProductPos.z) > 0.001 ||
        Math.abs(currentProductPos.yawRad - targetProductPos.yawRad) > 0.001;

      return stillMoving;
    };

    const afterDraw = (cb: () => void) => {
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (gl && typeof gl.fenceSync === 'function') {
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          const poll = () => {
            if (disposed) {
              if (sync) gl.deleteSync(sync);
              return;
            }
            const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
            if (state === gl.UNSIGNALED) {
              frameId = window.setTimeout(poll, 5);
            } else {
              if (sync) gl.deleteSync(sync);
              frameId = window.setTimeout(cb, 80);
            }
          };
          frameId = window.setTimeout(poll, 5);
          return;
        }
      } catch {
        // Fallback below
      }
      frameId = window.setTimeout(cb, 80);
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        const now = performance.now();
        const dt = Math.min(0.08, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;

        renderDirty = false;
        const moving = updateTransforms(dt);
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (!disposed && (renderDirty || moving)) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    if (!isSoftwareGl) {
      try {
        renderer.compile(scene, camera);
      } catch {
        // Non-blocking
      }
    }

    engineRef.current = {
      renderer,
      scene,
      camera,
      keyLight,
      fillLight,
      productPivot,
      guidesGroup,
      refGroup,
      shadowFloor,
      gridHelper,
      targetCamSpherical,
      currentCamSpherical,
      targetProductPos,
      currentProductPos,
      isSoftwareGl,
      requestRender,
    };

    setWebglReady(true);
    requestRender();

    const handleResize = () => {
      if (!mount || disposed) return;
      const r = mount.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        camera.aspect = r.width / r.height;
        camera.updateProjectionMatrix();
        renderer.setSize(r.width, r.height);
        requestRender();
      }
    };

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(handleResize);
      ro.observe(mount);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', handleResize);

      disposeObject3D(productPivot);
      disposeObject3D(guidesGroup);
      disposeObject3D(refGroup);
      shadowFloor.geometry.dispose();
      (shadowFloor.material as THREE.Material).dispose();
      gridHelper.geometry.dispose();
      (gridHelper.material as THREE.Material).dispose();
      envTarget.dispose();
      renderer.dispose();
      engineRef.current = null;
    };
  }, []);

  // Rebuild 3D Product Mesh whenever active product or finish swatch changes
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    while (engine.productPivot.children.length > 0) {
      const child = engine.productPivot.children[0];
      engine.productPivot.remove(child);
      disposeObject3D(child);
    }

    const finishPreset: ArFinishPreset | undefined =
      AR_FINISH_PRESETS.find((f) => f.id === finishId) || undefined;

    const { group } = buildArProductGroup(activeProduct, {
      finishPreset,
      maxAnisotropy: engine.renderer.capabilities.getMaxAnisotropy(),
      isSoftwareGl: engine.isSoftwareGl,
    });

    engine.productPivot.add(group);
    engine.requestRender();
  }, [activeProduct, finishId, webglReady]);

  // Rebuild Dimension Calipers & Room Fit Boundary Guides cleanly
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    while (engine.guidesGroup.children.length > 0) {
      const child = engine.guidesGroup.children[0];
      engine.guidesGroup.remove(child);
      disposeObject3D(child);
    }

    const box = new THREE.Box3().setFromObject(engine.productPivot);
    const size = new THREE.Vector3(dims.widthCm / 100, dims.heightCm / 100, dims.depthCm / 100);
    if (!box.isEmpty()) {
      box.getSize(size);
    }

    const guides = buildDimensionGuidesGroup(size, {
      showDimensions: showDimensionGuides,
      fitCheckEnabled,
      availableWidthCm,
      availableDepthCm,
      fits: roomFit.fits,
    });
    engine.guidesGroup.add(guides);
    engine.requestRender();
  }, [
    activeProduct,
    finishId,
    dims.widthCm,
    dims.heightCm,
    dims.depthCm,
    showDimensionGuides,
    fitCheckEnabled,
    availableWidthCm,
    availableDepthCm,
    roomFit.fits,
    webglReady,
  ]);

  // Rebuild Side-by-Side 3D Reference Comparison Prop
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    while (engine.refGroup.children.length > 0) {
      const child = engine.refGroup.children[0];
      engine.refGroup.remove(child);
      disposeObject3D(child);
    }

    const refObj = buildReferenceObjectGroup(referenceId);
    if (refObj) {
      const offsetX = Math.max(0.28, dims.widthCm / 200 + 0.24);
      refObj.position.set(offsetX, 0, 0.08);
      engine.refGroup.add(refObj);
    }
    engine.requestRender();
  }, [referenceId, dims.widthCm, webglReady]);

  // Sync Camera Distance, Pitch, Light Intensity, Placement & Yaw cleanly
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.targetCamSpherical.dist = distanceMeters;
    engine.targetCamSpherical.pitchRad = THREE.MathUtils.degToRad(cameraPitchDeg);
    engine.targetProductPos.x = placementOffset.x;
    engine.targetProductPos.z = placementOffset.z;
    engine.targetProductPos.yawRad = THREE.MathUtils.degToRad(yawDeg);
    engine.keyLight.intensity = roomLightIntensity * 1.6;
    engine.fillLight.intensity = roomLightIntensity * 0.85;
    engine.gridHelper.visible = cameraStatus === 'simulated' || showDimensionGuides;
    engine.requestRender();
  }, [
    distanceMeters,
    cameraPitchDeg,
    placementOffset,
    yawDeg,
    roomLightIntensity,
    cameraStatus,
    showDimensionGuides,
    webglReady,
  ]);

  const handleToggleCameraDirection = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleEnableSimulatedRoom = () => {
    stopCameraStream();
    setCameraStatus('simulated');
  };

  const handleResetPlacement = () => {
    setPlacementOffset({ x: 0, z: 0 });
    setDistanceMeters(defaultDistanceMeters);
    setYawDeg(22);
    setCameraPitchDeg(isFurniture ? 24 : 28);
    if (engineRef.current) {
      engineRef.current.targetCamSpherical.orbitAzimuthRad = 0;
      engineRef.current.requestRender();
    }
    setIsLocked(false);
  };

  // Ray-Plane 3D Floor Placement & Camera Orbit Pointer Handlers
  const getGroundIntersection = (clientX: number, clientY: number): THREE.Vector3 | null => {
    const engine = engineRef.current;
    const mount = canvasMountRef.current;
    if (!engine || !mount) return null;
    const rect = mount.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    _raycaster.setFromCamera(_ndc, engine.camera);
    const hit = _raycaster.ray.intersectPlane(GROUND_PLANE, _hitPoint);
    return hit ? hit : null;
  };

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked && interactionMode === 'place') return;
    e.currentTarget.setPointerCapture(e.pointerId);

    let dragOffset = { dx: 0, dz: 0 };
    if (interactionMode === 'place') {
      const hit = getGroundIntersection(e.clientX, e.clientY);
      if (hit) {
        dragOffset = {
          dx: placementOffset.x - hit.x,
          dz: placementOffset.z - hit.z,
        };
      }
    }

    pointerStateRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      dragOffset,
    };
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStateRef.current.active) return;

    if (interactionMode === 'place' && !isLocked) {
      const hit = getGroundIntersection(e.clientX, e.clientY);
      if (hit) {
        const clamped = clampRoomPlacement(
          hit.x + pointerStateRef.current.dragOffset.dx,
          hit.z + pointerStateRef.current.dragOffset.dz,
          2.0
        );
        setPlacementOffset(clamped);
      }
    } else if (interactionMode === 'orbit') {
      const dx = e.clientX - pointerStateRef.current.lastX;
      const dy = e.clientY - pointerStateRef.current.lastY;
      pointerStateRef.current.lastX = e.clientX;
      pointerStateRef.current.lastY = e.clientY;

      setYawDeg((prev) => {
        const next = (prev + dx * 0.7) % 360;
        return next < -180 ? next + 360 : next > 180 ? next - 360 : Math.round(next);
      });
      setCameraPitchDeg((prev) => Math.max(8, Math.min(68, Math.round(prev + dy * 0.25))));
    }
  };

  const handleStagePointerUp = () => {
    pointerStateRef.current.active = false;
  };

  const handleStageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.12 : -0.12;
    setDistanceMeters((prev) =>
      Number(Math.max(minDistance, Math.min(maxDistance, prev + delta)).toFixed(2))
    );
  };

  // Capture Real Composite AR Photo (Camera Frame / Simulated Room + 3D WebGL Canvas)
  const handleCaptureSnapshot = () => {
    const stageEl = stageRef.current;
    const engine = engineRef.current;
    if (!stageEl || !engine) return;

    const width = Math.round(stageEl.clientWidth) || 840;
    const height = Math.round(stageEl.clientHeight) || 520;

    // Guarantee fresh WebGL frame right before compositing
    engine.renderer.render(engine.scene, engine.camera);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    // Layer 1: Camera Feed OR Studio Room Backdrop
    if (cameraStatus === 'active' && videoRef.current && videoRef.current.readyState >= 2) {
      const vid = videoRef.current;
      const vidRatio = vid.videoWidth / Math.max(1, vid.videoHeight);
      const canvasRatio = width / height;
      let drawW = width;
      let drawH = height;
      let drawX = 0;
      let drawY = 0;
      if (vidRatio > canvasRatio) {
        drawW = height * vidRatio;
        drawX = (width - drawW) / 2;
      } else {
        drawH = width / vidRatio;
        drawY = (height - drawH) / 2;
      }
      ctx.drawImage(vid, drawX, drawY, drawW, drawH);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.55, '#1e293b');
      grad.addColorStop(0.56, roomPreset === 'living_room' ? '#3f2e21' : '#1e293b');
      grad.addColorStop(1, roomPreset === 'living_room' ? '#241a13' : '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Layer 2: Live Transparent Three.js 3D Render
    ctx.drawImage(engine.renderer.domElement, 0, 0, width, height);

    // Layer 3: Crisp Calibration Stamp
    const stampW = Math.min(width - 32, 480);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(16, height - 64, stampW, 48);
    ctx.strokeStyle = 'rgba(203, 109, 229, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(16, height - 64, stampW, 48);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(
      `${getLocalizedProductName(activeProduct, lang)} · ${dims.widthCm}×${dims.heightCm}×${dims.depthCm} سم · ${distanceMeters.toFixed(2)}م`,
      26,
      height - 35
    );

    try {
      setSnapshotUrl(outCanvas.toDataURL('image/png'));
    } catch {
      // Ignore restricted canvas environments
    }
  };

  // Curated switcher items (prefer furniture + electronics for quick room pairing)
  const switcherProducts = useMemo(() => {
    if (!allProducts || allProducts.length <= 1) return [];
    return allProducts.slice(0, 10);
  }, [allProducts]);

  const effectivePrice = activeProduct.price + (selectedVariant?.priceOffset || 0);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-950/92 overflow-y-auto"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col my-auto">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#551465]/25 border border-[#551465]/60 flex items-center justify-center text-brand-300 shrink-0">
              <Box className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-white truncate flex items-center gap-2">
                <span>
                  {isRtl
                    ? 'تجربة المنتجات بالواقع المعزز (AR 3D) عبر الكاميرا'
                    : 'Live 3D Camera AR Product Try-On'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 truncate tabular-nums">
                {getLocalizedProductName(activeProduct, lang)} · {dims.widthCm} × {dims.heightCm} ×{' '}
                {dims.depthCm} {isRtl ? 'سم' : 'cm'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isRtl ? 'إغلاق المعاينة بالواقع المعزز' : 'Close AR preview'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main AR Stage + Side Measurement & Checkout Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 sm:p-5">
          {/* Left/Primary Column: Unobstructed AR Camera & Three.js 3D Stage */}
          <div className="lg:col-span-8 space-y-3">
            <div
              ref={stageRef}
              onPointerDown={handleStagePointerDown}
              onPointerMove={handleStagePointerMove}
              onPointerUp={handleStagePointerUp}
              onPointerCancel={handleStagePointerUp}
              onWheel={handleStageWheel}
              className={`rawaj-dark-surface relative w-full h-[400px] sm:h-[500px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 select-none touch-none shadow-inner ${
                interactionMode === 'place' && !isLocked
                  ? 'cursor-grab active:cursor-grabbing'
                  : 'cursor-move'
              }`}
            >
              {/* Layer 1: Real Live Device Camera Stream */}
              {cameraStatus === 'active' && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              )}

              {/* Layer 1B: Calibrated Virtual Room / Desk Backdrop (Fallback or Mode Choice) */}
              {cameraStatus === 'simulated' && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Room Wall */}
                  <div
                    className={`absolute inset-x-0 top-0 h-[54%] border-b ${
                      roomPreset === 'living_room'
                        ? 'bg-gradient-to-b from-slate-900 via-stone-900/95 to-stone-800/90 border-amber-900/40'
                        : 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 border-slate-700/70'
                    }`}
                  />
                  {/* Perspective Floor / Oak Tabletop */}
                  <div
                    className={`absolute inset-x-0 bottom-0 h-[46%] ${
                      roomPreset === 'living_room'
                        ? 'bg-gradient-to-b from-[#3b2c20] via-[#2b1f16] to-[#1a120d]'
                        : 'bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950'
                    }`}
                  />
                </div>
              )}

              {/* Layer 2: Dedicated Empty WebGL Container (No CSS blur over this canvas!) */}
              <div
                ref={canvasMountRef}
                aria-label={isRtl ? 'منطقة عرض النموذج ثلاثي الأبعاد' : '3D AR Product Viewport'}
                className="absolute inset-0 w-full h-full z-10 pointer-events-none"
              />

              {/* Camera Requesting / Permission / Unavailable Overlay */}
              {(cameraStatus === 'requesting' ||
                cameraStatus === 'denied' ||
                cameraStatus === 'unavailable') && (
                <div className="absolute inset-0 z-30 bg-slate-950/92 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  {cameraStatus === 'requesting' ? (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-[#551465]/30 border border-[#551465]/60 flex items-center justify-center text-brand-300">
                        <Camera className="w-7 h-7" />
                      </div>
                      <div className="space-y-1 max-w-sm">
                        <h4 className="text-sm font-extrabold text-white">
                          {isRtl
                            ? 'جاري تشغيل الكاميرا للمعاينة الحية ثلاثية الأبعاد...'
                            : 'Starting Live Camera AR Session...'}
                        </h4>
                        <p className="text-xs text-slate-300">
                          {isRtl
                            ? 'اسمح للمتصفح بالوصول إلى الكاميرا لوضع الأثاث والإلكترونيات داخل غرفتك بأبعادها الحقيقية.'
                            : 'Grant camera permission to place 3D furniture & electronics inside your room.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleEnableSimulatedRoom}
                        className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#551465] hover:bg-brand-700 text-white text-xs font-extrabold transition shadow-lg"
                      >
                        {isRtl
                          ? 'أو افتح الغرفة التفاعلية الافتراضية فوراً'
                          : 'Launch Calibrated Virtual Room'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5 max-w-md">
                        <h4 className="text-sm font-extrabold text-white">
                          {isRtl ? 'تعذر تشغيل الكاميرا مباشرة' : 'Direct Camera Unavailable'}
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{cameraErrorText}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => startCamera(facingMode)}
                          className="min-h-[44px] bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>{isRtl ? 'إعادة طلب الكاميرا' : 'Retry Camera'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleEnableSimulatedRoom}
                          className="min-h-[44px] bg-[#551465] hover:bg-brand-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 transition"
                        >
                          <Box className="w-4 h-4" />
                          <span>
                            {isRtl ? 'تجربة 3D داخل الغرفة الافتراضية' : 'Open 3D Virtual Room'}
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Top Solid HUD Bar (No backdrop-blur over WebGL!) */}
              {(cameraStatus === 'active' || cameraStatus === 'simulated') && (
                <>
                  <div className="absolute top-3 inset-x-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                    <div className="pointer-events-auto bg-slate-950/90 border border-slate-700/90 rounded-xl px-3 py-1.5 text-[11px] font-bold text-white flex items-center gap-2 tabular-nums">
                      <Ruler className="w-3.5 h-3.5 text-brand-300 shrink-0" />
                      <span>
                        {isRtl
                          ? `المسافة: ${distanceMeters.toFixed(2)} م · (${dims.widthCm}×${dims.heightCm}×${dims.depthCm} سم)`
                          : `Dist: ${distanceMeters.toFixed(2)}m · (${dims.widthCm}×${dims.heightCm}×${dims.depthCm} cm)`}
                      </span>
                    </div>

                    <div className="pointer-events-auto flex items-center gap-1.5">
                      {cameraStatus === 'active' && (
                        <button
                          type="button"
                          onClick={handleToggleCameraDirection}
                          title={isRtl ? 'تبديل الكاميرا' : 'Switch Camera'}
                          className="min-w-[38px] min-h-[38px] bg-slate-950/90 hover:bg-slate-900 text-white p-2 rounded-xl border border-slate-700 transition flex items-center justify-center"
                        >
                          <SwitchCamera className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsLocked((v) => !v)}
                        title={
                          isLocked
                            ? isRtl
                              ? 'فك التثبيت'
                              : 'Unlock'
                            : isRtl
                            ? 'تثبيت في الغرفة'
                            : 'Anchor in Room'
                        }
                        className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition ${
                          isLocked
                            ? 'bg-emerald-700 border-emerald-400 text-white'
                            : 'bg-slate-950/90 hover:bg-slate-900 border-slate-700 text-white'
                        }`}
                      >
                        {isLocked ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {isLocked ? (isRtl ? 'مثبّت' : 'Anchored') : isRtl ? 'تثبيت' : 'Anchor'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCaptureSnapshot}
                        title={isRtl ? 'التقاط صورة للمعاينة' : 'Capture AR Snapshot'}
                        className="min-h-[38px] bg-[#551465] hover:bg-brand-700 text-white px-3 py-1.5 rounded-xl border border-brand-400/50 text-[11px] font-bold flex items-center gap-1 transition"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{isRtl ? 'التقاط صورة' : 'Snapshot'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Bottom Control Dock (Zero Center Occlusion!) */}
                  <div className="absolute bottom-2.5 inset-x-3 z-20 flex flex-col items-center pointer-events-none">
                    <button
                      type="button"
                      onClick={() => setHudExpanded((v) => !v)}
                      className="pointer-events-auto mb-1.5 px-3 py-1 rounded-t-xl bg-slate-950/92 border border-slate-700 text-[10px] font-bold text-slate-200 hover:text-white flex items-center gap-1.5 transition"
                    >
                      {hudExpanded ? (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>{isRtl ? 'إخفاء شريط التحكم (معاينة كاملة)' : 'Hide Controls'}</span>
                        </>
                      ) : (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>{isRtl ? 'إظهار أدوات التحريك والقياس' : 'Show AR Controls'}</span>
                        </>
                      )}
                    </button>

                    {hudExpanded && (
                      <div className="pointer-events-auto w-full max-w-2xl bg-slate-950/92 border border-slate-700/90 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        {/* Mode Toggle: Place on Surface vs Orbit 360 */}
                        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                          <button
                            type="button"
                            onClick={() => setInteractionMode('place')}
                            className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition ${
                              interactionMode === 'place'
                                ? 'bg-[#551465] text-white'
                                : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            <Move className="w-3.5 h-3.5" />
                            <span>{isRtl ? 'تحريك على الأرضية' : 'Place & Slide'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setInteractionMode('orbit')}
                            className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition ${
                              interactionMode === 'orbit'
                                ? 'bg-[#551465] text-white'
                                : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            <Rotate3d className="w-3.5 h-3.5" />
                            <span>{isRtl ? 'تدوير 360°' : 'Orbit 360°'}</span>
                          </button>
                        </div>

                        {/* Room Backdrop Preset Switch when Simulated */}
                        {cameraStatus === 'simulated' && (
                          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                            <button
                              type="button"
                              onClick={() => setRoomPreset('living_room')}
                              className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${
                                roomPreset === 'living_room'
                                  ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Armchair className="w-3 h-3" />
                              <span>{isRtl ? 'غرفة' : 'Room'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRoomPreset('workspace_desk')}
                              className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${
                                roomPreset === 'workspace_desk'
                                  ? 'bg-sky-500/20 text-sky-200 border border-sky-500/40'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <MonitorSmartphone className="w-3 h-3" />
                              <span>{isRtl ? 'مكتب' : 'Desk'}</span>
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setShowDimensionGuides((v) => !v)}
                            className={`px-2.5 py-1.5 rounded-xl border font-bold flex items-center gap-1 transition ${
                              showDimensionGuides
                                ? 'bg-brand-500/20 border-brand-400/50 text-brand-200'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <Grid3x3 className="w-3.5 h-3.5" />
                            <span>{isRtl ? 'أدلة الأبعاد' : 'Guides'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleResetPlacement}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold transition"
                          >
                            {isRtl ? 'إعادة ضبط' : 'Reset'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Quick Furniture & Electronics Catalog Switcher inside AR */}
            {switcherProducts.length > 1 && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-brand-300" />
                    <span>
                      {isRtl
                        ? 'بدّل بين أثاث وإلكترونيات المتجر داخل غرفتك مباشرة:'
                        : 'Switch Store Furniture & Electronics in Your Room:'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {switcherProducts.map((item) => {
                    const isActive = item.id === activeProduct.id;
                    const itemDims = getProductDimensions(item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectProductInAr(item)}
                        className={`shrink-0 px-3 py-2 rounded-xl border text-start transition min-w-[148px] ${
                          isActive
                            ? 'bg-[#551465] border-brand-400/70 text-white shadow'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <span className="text-[11px] font-bold block truncate max-w-[150px]">
                          {getLocalizedProductName(item, lang)}
                        </span>
                        <span className="text-[10px] opacity-80 font-mono tabular-nums block mt-0.5">
                          {itemDims.widthCm}×{itemDims.heightCm}×{itemDims.depthCm} سم
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Captured Snapshot Bar */}
            {snapshotUrl && (
              <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={snapshotUrl}
                    alt={isRtl ? 'لقطة معاينة الأبعاد بالواقع المعزز' : 'AR Snapshot Preview'}
                    className="w-16 h-11 rounded-lg object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {isRtl ? 'تم التقاط صورة الواقع المعزز بنجاح' : 'AR Snapshot Captured'}
                      </span>
                    </span>
                    <p className="text-[11px] text-slate-400 truncate">
                      {isRtl
                        ? 'احفظ الصورة للتحقق من تناسق المقاس والألوان في مساحتك.'
                        : 'Download the composite photo to verify size and fit.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={snapshotUrl}
                    download={`rawaj-ar-${activeProduct.id}.png`}
                    className="min-h-[38px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'حفظ الصورة' : 'Download'}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setSnapshotUrl(null)}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1"
                  >
                    {isRtl ? 'إخفاء' : 'Hide'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Physical Dimensions, Room-Fit Tester, Lighting, Finishes, & Cart */}
          <div className="lg:col-span-4 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Real-World Dimensions Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <Ruler className="w-4 h-4 text-brand-300" />
                    <span>{isRtl ? 'الأبعاد الفعلية بالمقاس (1:1)' : 'True-to-Scale Dimensions'}</span>
                  </span>
                  {dims.weightKg && (
                    <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                      {dims.weightKg} {isRtl ? 'كجم' : 'kg'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                    <span className="text-[10px] text-slate-400 block">
                      {isRtl ? 'العرض (W)' : 'Width'}
                    </span>
                    <strong className="text-xs text-white font-mono tabular-nums">
                      {dims.widthCm} {isRtl ? 'سم' : 'cm'}
                    </strong>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                    <span className="text-[10px] text-slate-400 block">
                      {isRtl ? 'الارتفاع (H)' : 'Height'}
                    </span>
                    <strong className="text-xs text-white font-mono tabular-nums">
                      {dims.heightCm} {isRtl ? 'سم' : 'cm'}
                    </strong>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                    <span className="text-[10px] text-slate-400 block">
                      {isRtl ? 'العمق (D)' : 'Depth'}
                    </span>
                    <strong className="text-xs text-white font-mono tabular-nums">
                      {dims.depthCm} {isRtl ? 'سم' : 'cm'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Room / Surface Fit Verification Calculator */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {isRtl ? 'اختبار ملاءمة الغرفة / الطاولة' : 'Space Fit Verification'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFitCheckEnabled((v) => !v)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                      fitCheckEnabled
                        ? 'bg-emerald-600/20 border-emerald-400/60 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {fitCheckEnabled
                      ? isRtl
                        ? 'مفعّل في 3D'
                        : 'Active'
                      : isRtl
                      ? 'تفعيل الفحص'
                      : 'Check Fit'}
                  </button>
                </div>

                {fitCheckEnabled && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <label className="block space-y-1">
                        <span className="text-slate-400 block">
                          {isRtl ? 'العرض المتاح (سم)' : 'Avail. Width (cm)'}
                        </span>
                        <input
                          type="number"
                          min={10}
                          max={800}
                          value={availableWidthCm}
                          onChange={(e) => setAvailableWidthCm(Number(e.target.value) || 10)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono text-xs tabular-nums focus:outline-none focus:border-emerald-400"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-slate-400 block">
                          {isRtl ? 'العمق المتاح (سم)' : 'Avail. Depth (cm)'}
                        </span>
                        <input
                          type="number"
                          min={10}
                          max={800}
                          value={availableDepthCm}
                          onChange={(e) => setAvailableDepthCm(Number(e.target.value) || 10)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono text-xs tabular-nums focus:outline-none focus:border-emerald-400"
                        />
                      </label>
                    </div>

                    <div
                      className={`p-2.5 rounded-xl border text-[11px] font-bold leading-relaxed ${
                        roomFit.fits
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      {isRtl ? roomFit.verdictAr : roomFit.verdictEn}
                    </div>
                  </div>
                )}
              </div>

              {/* Distance, 360 Rotation & Room Lighting Controls */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">
                      {isRtl ? 'بعد الكاميرا عن المنتج' : 'Camera Distance'}
                    </span>
                    <span className="text-brand-300 font-mono font-bold tabular-nums">
                      {distanceMeters.toFixed(2)} {isRtl ? 'م' : 'm'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={minDistance}
                    max={maxDistance}
                    step={0.05}
                    value={distanceMeters}
                    aria-label={isRtl ? 'بعد الكاميرا بالمتر' : 'Camera distance in meters'}
                    onChange={(e) => setDistanceMeters(Number(e.target.value))}
                    className="w-full h-1.5 accent-[#af3fd2] cursor-pointer bg-slate-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">
                      {isRtl ? 'تدوير المنتج داخل الغرفة' : 'Rotate in Room'}
                    </span>
                    <span className="text-slate-300 font-mono tabular-nums">{yawDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={yawDeg}
                    aria-label={isRtl ? 'تدوير المنتج 360 درجة' : 'Rotate product 360 degrees'}
                    onChange={(e) => setYawDeg(Number(e.target.value))}
                    className="w-full h-1.5 accent-[#af3fd2] cursor-pointer bg-slate-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <SunMedium className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isRtl ? 'توافق إضاءة الغرفة' : 'Room Lighting'}</span>
                    </span>
                    <span className="text-amber-300 font-mono tabular-nums">
                      {Math.round(roomLightIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={2.0}
                    step={0.05}
                    value={roomLightIntensity}
                    aria-label={isRtl ? 'شدة إضاءة النموذج' : 'Room lighting intensity'}
                    onChange={(e) => setRoomLightIntensity(Number(e.target.value))}
                    className="w-full h-1.5 accent-amber-400 cursor-pointer bg-slate-800 rounded-lg"
                  />
                </div>
              </div>

              {/* Color Finish Swatches + 3D Comparison Object + Variant */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3 text-xs">
                <div className="space-y-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-brand-300" />
                    <span>{isRtl ? 'تبديل الخامة / اللون في الغرفة' : 'Material Finish'}</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {AR_FINISH_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setFinishId(preset.id)}
                        title={isRtl ? preset.labelAr : preset.labelEn}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border flex items-center gap-1.5 transition ${
                          finishId === preset.id
                            ? 'bg-[#551465] border-brand-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {preset.primaryHex && (
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
                            style={{ backgroundColor: preset.primaryHex }}
                          />
                        )}
                        <span>{isRtl ? preset.labelAr : preset.labelEn}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reference 3D Prop */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <label className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isRtl ? 'عنصر مقارنة 3D بجانب المنتج' : '3D Scale Reference'}</span>
                  </label>
                  <select
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value as ArReferenceItemId)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#551465]"
                  >
                    {AR_REFERENCE_ITEMS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {isRtl ? item.labelAr : item.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Variant Selector if Product Has Options */}
                {activeProduct.variants && activeProduct.variants.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <span className="font-bold text-slate-200 block">
                      {isRtl ? 'الخيار المختار للطلب:' : 'Selected Variant:'}
                    </span>
                    <select
                      value={selectedVariant?.id || ''}
                      onChange={(e) => {
                        const found = activeProduct.variants?.find((v) => v.id === e.target.value);
                        setSelectedVariant(found);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#551465]"
                    >
                      {activeProduct.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      cameraStatus === 'active'
                        ? handleEnableSimulatedRoom()
                        : startCamera(facingMode)
                    }
                    className="text-[11px] font-bold text-brand-300 hover:underline flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>
                      {cameraStatus === 'active'
                        ? isRtl
                          ? 'التبديل للغرفة الافتراضية'
                          : 'Switch to Virtual Room'
                        : isRtl
                        ? 'تشغيل الكاميرا الحقيقية (AR)'
                        : 'Enable Live Camera AR'}
                    </span>
                  </button>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>WebGL 3D</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Add to Cart CTA */}
            {onAddToCart && (
              <button
                type="button"
                onClick={() => {
                  onAddToCart(activeProduct, selectedVariant);
                  onClose();
                }}
                disabled={activeProduct.stock === 0}
                className="w-full min-h-[46px] bg-[#551465] hover:bg-brand-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg text-xs transition"
              >
                <ShoppingCart className="w-4 h-4 text-brand-200" />
                <span>
                  {isRtl ? 'إضافة للسلة بعد اختبار الأبعاد' : 'Add to Cart After Fit Check'} (
                  {formatPrice(effectivePrice, settings?.activeCurrency, settings?.yerExchangeRate)}
                  )
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
