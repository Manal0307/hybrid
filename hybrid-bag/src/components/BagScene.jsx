import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Water } from "../lib/Water.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { createWaterNormalsTexture } from "../utils/waterNormalsTexture";
import { loadWaterNormals } from "../utils/loadWaterNormals";

/** Durée (en vh) du track de textes affichés sur fond mauve avant l’apparition du sac. */
export const TEXT_TRACK_BEFORE_BAG_VH = 4;
/** Scroll (en vh) auquel le sac commence à émerger. */
export const BAG_START_VH = TEXT_TRACK_BEFORE_BAG_VH;

/** RAF + canvas avant BAG_START_VH pour éviter un « pop » quand le voile se lève */
const BAG_RAF_START_VH = BAG_START_VH - 1.35;

const SUN_ELEVATION = 11;
const SUN_AZIMUTH = 180;

/** finalbag.glb : face avant (fleurs + trous) vers la caméra */
const BAG_FRONT_ROTATION_Y = -Math.PI / 2;
const CAMERA_LOOK = new THREE.Vector3(0, 0.52, -1.85);

/** Sac + caméra : plus petits / reculés sur écrans étroits (iPhone portrait). */
function getViewportLayout(viewWidth, viewHeight) {
  const aspect = viewWidth / viewHeight;
  const narrow = 1 - THREE.MathUtils.smoothstep(aspect, 0.58, 0.92);
  return {
    bagTargetDim: THREE.MathUtils.lerp(1.45, 1.12, narrow),
    cameraZ: THREE.MathUtils.lerp(2.35, 2.62, narrow),
    cameraFov: THREE.MathUtils.lerp(42, 44, narrow),
  };
}

const EMERGENCE_START = 0.28; // localY en vh — début de la montée
const EMERGENCE_END = 1.95; // scroll plus long = sortie plus lente
const EMERGENCE_PRE_VISIBLE = 0.22; // vh avant EMERGENCE_START : sac visible sous l'eau
const EMERGENCE_SPIN_Y = 0;
/** Scroll local après l’émergence (fleurs, snap produit). */
const BAG_SCENE_TAIL_VH = 0.45;

/** Scroll absolu (vh) : voile levé, sac en surface, fleurs en place */
export const BAG_SCENE_FULL_VH =
  BAG_START_VH + EMERGENCE_END + BAG_SCENE_TAIL_VH;
/** Scroll absolu où le CTA « Discover Materials » apparaît. */
export const PRODUCT_REVEAL_VH =
  BAG_START_VH + EMERGENCE_END + BAG_SCENE_TAIL_VH + 0.75;
/** Scroll max : pastilles + CTA visibles, puis on ne scroll plus. */
export const SCROLL_LOCK_VH = PRODUCT_REVEAL_VH + 0.12;

export { EMERGENCE_START, EMERGENCE_END };

/**
 * Taille du render target miroir (pixels), alignée sur le drawing buffer WebGL.
 * Plafonnée pour la perf; sinon la réflexion peut être trop basse ou ne pas correspondre au rendu final.
 */
function getWaterMirrorBufferSize(renderer, maxDimension = 4096) {
  const buf = new THREE.Vector2();
  renderer.getDrawingBufferSize(buf);
  let w = Math.floor(buf.x);
  let h = Math.floor(buf.y);
  const m = Math.max(w, h);
  const scale = m > maxDimension ? maxDimension / m : 1;
  w = Math.max(256, Math.floor(w * scale));
  h = Math.max(256, Math.floor(h * scale));
  return { w, h };
}

/** Drag sac : dès ~45 % de la montée (souvent en même temps que le CTA « Discover »). */
const BAG_DRAG_START_LOCAL_VH =
  EMERGENCE_START + (EMERGENCE_END - EMERGENCE_START) * 0.45;

/** Pastilles : fondu après la fin de l’émergence (évite le pop + saut visuel). */
const HOTSPOT_REVEAL_START_VH = EMERGENCE_END + 0.15;
const HOTSPOT_REVEAL_END_VH = EMERGENCE_END + 0.55;

// Hotspots autour du sac — `side` ±1, `heightT` 0→bas / 1→haut.
// Position calculée depuis la bbox du modèle pour épouser la silhouette (arc, pas colonne droite).
const BAG_HOTSPOTS = [
  {
    title: "Oyster shell structure",
    body: "Coral-inspired lattice 3D-printed in oyster-shell filament, organic and pleasant to the touch.",
    side: -1,
    heightT: 0.97,
    radialIn: 0.15,
    screenOffset: { x: -18, y: 0 },
  },
  {
    title: "Red cabbage bioplastic",
    body: "Inner bag in solid, translucent red cabbage bioplastic, sewn on a sewing machine.",
    side: -1,
    heightT: 0.5,
    screenOffset: { x: -46, y: 0 },
  },
  {
    title: "Recycled textiles",
    body: "Fabric recovered at R-use Fabric in Ixelles, applied as trims on the bag.",
    side: 1,
    heightT: 0.97,
    radialIn: 0.15,
    screenOffset: { x: 18, y: 0 },
  },
  {
    title: "Handmade flowers",
    body: "Flowers made by hand from recycled textile, red cabbage bioplastics and pearls from an old broken necklace.",
    side: 1,
    heightT: 0.5,
    screenOffset: { x: 46, y: 0 },
  },
];

/** Offset local (espace sac) : arc autour du sac, marge plus large pour le nouveau modèle. */
function computeHotspotLocalOffset(
  side,
  heightT,
  halfW,
  bagH,
  radialIn = 0,
  radialOut = 0,
) {
  const yLocal = bagH * THREE.MathUtils.lerp(0.3, 0.95, heightT);
  const curve = Math.pow(1 - heightT, 1.28);
  const margin = Math.max(0.06, 0.17 + curve * 0.22 - radialIn + radialOut);
  const xLocal = side * (halfW + margin);
  const zLocal = 0.02 + curve * 0.05;
  return new THREE.Vector3(xLocal, yLocal, zLocal);
}

function getHotspotViewportAdjust(viewWidth, viewHeight) {
  const aspect = viewWidth / viewHeight;
  const narrow = 1 - THREE.MathUtils.smoothstep(aspect, 0.58, 0.92);
  return {
    narrow,
    radialIn: 0,
    radialOut: narrow * 0.1,
    offsetScale: THREE.MathUtils.lerp(1, 0.85, narrow),
    edgePadX: 28,
    edgePadY: 96,
  };
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────
/** Montée lente au début, sans overshoot (évite l'effet « pop »). */
function emergeEase(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const smooth = t * t * (3 - 2 * t);
  return Math.pow(smooth, 2.35);
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ciel équirect : bande rose pâle à l'horizon (milieu) ; mauve au zénith et partout hors horizon. */
function createBagSkyEnvironmentTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  const g = ctx.createLinearGradient(0, 0, 0, 1024);
  /* Transition mauve ↔ rose très longue et douce (plus de « bord » net). */
  g.addColorStop(0.0, "#2a2428");
  g.addColorStop(0.1, "#2e282c");
  g.addColorStop(0.2, "#363038");
  g.addColorStop(0.26, "#3e363c");
  g.addColorStop(0.32, "#483c44");
  g.addColorStop(0.36, "#51424c");
  g.addColorStop(0.4, "#5a4a54");
  g.addColorStop(0.42, "#64525c");
  g.addColorStop(0.43, "#6a565f");
  g.addColorStop(0.44, "#6f5a64");
  g.addColorStop(0.45, "#775e6a");
  g.addColorStop(0.46, "#806672");
  g.addColorStop(0.47, "#8a7079");
  g.addColorStop(0.475, "#937a82");
  g.addColorStop(0.48, "#9d848a");
  g.addColorStop(0.485, "#a78c92");
  g.addColorStop(0.49, "#b0989c");
  g.addColorStop(0.492, "#b8a0a4");
  g.addColorStop(0.494, "#c0a8ac");
  g.addColorStop(0.496, "#c8b2b6");
  g.addColorStop(0.4975, "#d4c0c4");
  g.addColorStop(0.499, "#e0ccd0");
  g.addColorStop(0.5, "#ead6da");
  g.addColorStop(0.501, "#f0e0e6");
  g.addColorStop(0.502, "#f6e8ee");
  g.addColorStop(0.5035, "#faedf2");
  g.addColorStop(0.505, "#fce8f0");
  g.addColorStop(0.507, "#fdf2f6");
  g.addColorStop(0.509, "#fff6f9");
  g.addColorStop(0.511, "#fff9fb");
  g.addColorStop(0.513, "#fffbfc");
  g.addColorStop(0.515, "#fff9fb");
  g.addColorStop(0.517, "#fff6f9");
  g.addColorStop(0.519, "#fdf2f6");
  g.addColorStop(0.521, "#fce8f0");
  g.addColorStop(0.523, "#f2e6ec");
  g.addColorStop(0.525, "#e8d8e2");
  g.addColorStop(0.527, "#dccad6");
  g.addColorStop(0.53, "#ceb8c6");
  g.addColorStop(0.534, "#bea8b6");
  g.addColorStop(0.538, "#b098a8");
  g.addColorStop(0.542, "#a68a9c");
  g.addColorStop(0.546, "#9e8294");
  g.addColorStop(0.55, "#987c8e");
  g.addColorStop(0.555, "#a78699");
  g.addColorStop(0.56, "#937c8a");
  g.addColorStop(0.62, "#8a6c7e");
  g.addColorStop(0.68, "#806472");
  g.addColorStop(0.75, "#705866");
  g.addColorStop(0.82, "#64505c");
  g.addColorStop(0.88, "#574450");
  g.addColorStop(0.94, "#4a3a44");
  g.addColorStop(1.0, "#40323c");

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2048, 1024);

  /* Bande lumineuse large (pas un filet) — plateau doux au centre */
  const horizonBand = ctx.createLinearGradient(0, 380, 0, 660);
  horizonBand.addColorStop(0.0, "rgba(255, 252, 254, 0)");
  horizonBand.addColorStop(0.28, "rgba(255, 248, 252, 0.05)");
  horizonBand.addColorStop(0.42, "rgba(255, 250, 253, 0.1)");
  horizonBand.addColorStop(0.5, "rgba(255, 252, 254, 0.11)");
  horizonBand.addColorStop(0.58, "rgba(255, 248, 252, 0.1)");
  horizonBand.addColorStop(0.72, "rgba(255, 246, 250, 0.05)");
  horizonBand.addColorStop(1.0, "rgba(255, 252, 254, 0)");
  ctx.fillStyle = horizonBand;
  ctx.fillRect(0, 0, 2048, 1024);

  /* Particules / étoiles sur tout le dôme — plus visibles sur le mauve, plus discrètes sur l'horizon. */
  let seed = 90210;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 4294967296;
  };
  const particleAlpha = (y) => {
    const dist = Math.abs(y - 512) / 512;
    return 0.12 + dist * 0.68;
  };

  for (let i = 0; i < 900; i++) {
    const x = rnd() * 2048;
    const y = rnd() * 1024;
    const r = rnd() * 1.35 + 0.22;
    const a = particleAlpha(y) * (0.48 + rnd() * 0.52);
    ctx.fillStyle = `rgba(255,252,255,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 680; i++) {
    const x = rnd() * 2048;
    const y = rnd() * 1024;
    const a = particleAlpha(y) * (0.32 + rnd() * 0.55);
    ctx.fillStyle = `rgba(252,246,255,${a})`;
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }

  for (let i = 0; i < 36; i++) {
    const x = rnd() * 2048;
    const y = rnd() * 1024;
    const r = rnd() * 1.05 + 0.62;
    const a = particleAlpha(y) * (0.62 + rnd() * 0.38);
    ctx.fillStyle = `rgba(255,250,255,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

const HERO_TITLE_TEXT = "Hybrid Handbag";
const HERO_TITLE_VIEW_MARGIN = 0.04;
const HERO_TITLE_SCALE = 1.16;

function createHeroTitleMesh() {
  const canvas = document.createElement("canvas");
  canvas.width = 4096;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const textureAspect = canvas.width / canvas.height;

  function draw() {
    const padding = 96;
    const maxWidth = canvas.width - padding * 2;
    const upper = HERO_TITLE_TEXT.toUpperCase();
    let fontSize = 300;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ebe6e1";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    do {
      ctx.font = `300 ${fontSize}px CaligulaDodgy, Telma, Georgia, serif`;
      fontSize -= 4;
    } while (fontSize > 24 && ctx.measureText(upper).width > maxWidth);
    ctx.font = `300 ${fontSize + 4}px CaligulaDodgy, Telma, Georgia, serif`;
    ctx.fillText(upper, canvas.width / 2, canvas.height / 2);
  }

  draw();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  // Derrière le sac (bagGroup z ≈ -1.2), face caméra
  mesh.position.set(0, 0.52, -1.88);
  mesh.renderOrder = 1;

  function fitToView(camera, viewWidth, viewHeight) {
    const dist = camera.position.distanceTo(mesh.position);
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const frustumHeight = 2 * Math.tan(vFov / 2) * dist;
    const frustumWidth = frustumHeight * (viewWidth / viewHeight);
    const targetWidth =
      frustumWidth * (1 - HERO_TITLE_VIEW_MARGIN * 2) * HERO_TITLE_SCALE;
    const targetHeight = targetWidth / textureAspect;
    mesh.scale.set(targetWidth, targetHeight, 1);
  }

  return { mesh, texture, draw, fitToView };
}

// ─── Composant ───────────────────────────────────────────────────────────────
export default function BagScene({
  onReady,
  phase = "loading",
  snapToProduct = false,
  heroTitleOpacity = 0,
}) {
  const containerRef = useRef(null);
  const hotspotRefs = useRef([]);
  const rotateHintRef = useRef(null);
  const [activeHotspot, setActiveHotspot] = useState(null);
  const onReadyRef = useRef(onReady);
  const phaseRef = useRef(phase);
  const snapRef = useRef(snapToProduct);
  const heroTitleOpacityRef = useRef(heroTitleOpacity);
  onReadyRef.current = onReady;
  phaseRef.current = phase;
  snapRef.current = snapToProduct;
  heroTitleOpacityRef.current = heroTitleOpacity;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      outputBufferType: THREE.HalfFloatType,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x120818, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    // Caché par défaut — le RAF démarre un peu avant BAG_START_VH (sac déjà rendu sous le voile)
    renderer.domElement.style.display = "none";
    container.style.pointerEvents = "none";

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    const skyTex = createBagSkyEnvironmentTexture();
    scene.background = skyTex;
    scene.environment = pmrem.fromEquirectangular(skyTex).texture;
    scene.environmentIntensity = 0.52;
    // Brume sombre type crépuscule — profondeur, contraste avec l'horizon lumineux
    scene.fog = new THREE.FogExp2(0x1e1428, 0.00155);

    const viewport = getViewportLayout(
      container.clientWidth,
      container.clientHeight,
    );

    const camera = new THREE.PerspectiveCamera(
      viewport.cameraFov,
      container.clientWidth / container.clientHeight,
      0.05,
      20000,
    );
    camera.position.set(0, 0.28, viewport.cameraZ);
    camera.lookAt(CAMERA_LOOK);

    let currentLayout = viewport;

    function applyViewportLayout(w, h) {
      currentLayout = getViewportLayout(w, h);
      camera.fov = currentLayout.cameraFov;
      camera.aspect = w / h;
      camera.position.set(0, 0.28, currentLayout.cameraZ);
      camera.updateProjectionMatrix();
      camera.lookAt(CAMERA_LOOK);
      heroTitle.fitToView(camera, w, h);

      if (bagModel && bagAnim.loaded && bagAnim.baseSize) {
        const s = currentLayout.bagTargetDim / bagMaxDim;
        bagModel.scale.setScalar(s);
        bagAnim.halfW = (bagAnim.baseSize.x * s) / 2;
        bagAnim.height = bagAnim.baseSize.y * s;
        bagAnim.yBottom = -(bagAnim.baseSize.y * s + 0.5);
      }
    }

    const heroTitle = createHeroTitleMesh();
    scene.add(heroTitle.mesh);
    heroTitle.fitToView(camera, container.clientWidth, container.clientHeight);
    document.fonts?.ready?.then(() => {
      heroTitle.draw();
      heroTitle.texture.needsUpdate = true;
    });

    // ── Post-processing ───────────────────────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        0.038,
        0.24,
        0.96,
      ),
    );

    // ── Eau ───────────────────────────────────────────────────────────────────
    const phi = THREE.MathUtils.degToRad(90 - SUN_ELEVATION);
    const theta = THREE.MathUtils.degToRad(SUN_AZIMUTH);
    const sun = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

    const mirrorBuf = getWaterMirrorBufferSize(renderer);

    const water = new Water(new THREE.PlaneGeometry(10000, 10000), {
      textureWidth: mirrorBuf.w,
      textureHeight: mirrorBuf.h,
      clipBias: 0.002,
      waterNormals: createWaterNormalsTexture(512, maxAnisotropy),
      sunDirection: sun.clone().normalize(),
      sunColor: 0xffe0d8,
      waterColor: 0x142a52,
      distortionScale: 0.14,
      alpha: 1.0,
      fog: false,
    });
    water.rotation.x = -Math.PI / 2;
    water.material.uniforms["alpha"].value = 1.0;
    // Motif de vagues plus large (= moins détaillé, plus smooth)
    water.material.uniforms["size"].value = 90;
    water.material.transparent = true;
    water.material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "noise.xzy * vec3( 1.5, 1.0, 1.5 )",
        "noise.xzy * vec3( 1.15, 1.0, 1.15 )",
      );
      // Plus de spiegel : Fresnel renforcé, scatter atténué, reflets plus nets.
      shader.fragmentShader = shader.fragmentShader.replace(
        "float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );",
        "float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 2.8 ); reflectance = min( reflectance * 1.22 + 0.12, 1.0 );",
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), reflectionSample + specularLight, reflectance );",
        "vec3 albedo = mix( ( sunColor * diffuseLight * 0.12 + scatter * 0.4 ) * getShadowMask(), reflectionSample + specularLight * 1.15, reflectance );",
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "gl_FragColor = vec4( outgoingLight, alpha );",
        [
          "float dist = length(worldToEye);",
          "float horizonFade = smoothstep(95.0, 240.0, dist);",
          "gl_FragColor = vec4( outgoingLight, alpha * (1.0 - horizonFade * 0.3) );",
        ].join("\n"),
      );
    };
    scene.add(water);
    loadWaterNormals((tex) => {
      water.material.uniforms["normalSampler"].value = tex;
    }, maxAnisotropy);

    // ── Lumières ─────────────────────────────────────────────────────────────
    // Ambient minimal + hémisphère : ombrage lié aux normales → volume du sac
    scene.add(new THREE.AmbientLight(0x584878, 0.08));
    scene.add(new THREE.HemisphereLight(0x504090, 0xf8e0d8, 0.34));

    const keyLight = new THREE.DirectionalLight(0xffe8c8, 4.0);
    keyLight.position.set(2.4, 5.8, 3.6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(4096, 4096);
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.camera.left = -2.0;
    keyLight.shadow.camera.right = 2.0;
    keyLight.shadow.camera.top = 2.0;
    keyLight.shadow.camera.bottom = -2.0;
    keyLight.shadow.bias = -0.00008;
    keyLight.shadow.radius = 3;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x7868c8, 0.36);
    fillLight.position.set(-5, 2.8, 0.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffb890, 1.2);
    rimLight.position.set(0.2, 0.6, -8);
    scene.add(rimLight);

    const topLight = new THREE.DirectionalLight(0xa898e8, 0.38);
    topLight.position.set(0, 9, 0);
    scene.add(topLight);

    const bounceLight = new THREE.DirectionalLight(0xffa898, 0.22);
    bounceLight.position.set(0, -1.0, 0.4);
    scene.add(bounceLight);

    const frontLight = new THREE.DirectionalLight(0xf0e8ff, 0.18);
    frontLight.position.set(0.9, 1.0, 4.0);
    scene.add(frontLight);

    const bagAccent = new THREE.PointLight(0xffd8c0, 0.42, 8, 1.7);
    bagAccent.position.set(1.6, 1.7, 1.0);
    scene.add(bagAccent);

    // ── Sac GLB ───────────────────────────────────────────────────────────────
    const bagGroup = new THREE.Group();
    bagGroup.position.z = -1.2;
    bagGroup.renderOrder = 10;
    bagGroup.visible = false;
    scene.add(bagGroup);

    const bagAnim = {
      yBottom: -1.8,
      ySurface: 0.05,
      loaded: false,
      halfW: 0.42,
      height: 1.2,
      baseSize: null,
    };

    let bagModel = null;
    let bagMaxDim = 1;

    new GLTFLoader().load(
      "/models/finalbag.glb",
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        bagModel = model;
        bagMaxDim = maxDim;
        bagAnim.baseSize = size.clone();
        const layout = getViewportLayout(
          container.clientWidth,
          container.clientHeight,
        );
        const s = layout.bagTargetDim / maxDim;
        model.scale.setScalar(s);
        model.position.set(
          -center.x * s,
          -center.y * s + (size.y * s) / 2,
          -center.z * s,
        );
        model.traverse((c) => {
          if (!c.isMesh) return;
          c.castShadow = true;
          c.receiveShadow = false;
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          for (const m of mats) {
            if (!m) continue;
            if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
              // Modèle texturé : ne rien modifier (couleurs/textures du GLB telles quelles).
              if (!m.map) {
                // Meshes sans texture (palette) : léger tint pour l'intégration scène
                m.color.set(0xe4dadf);
                m.roughness = 0.72;
                m.metalness = 0.0;
                m.envMapIntensity = 0.28;
                if (m.isMeshPhysicalMaterial) {
                  m.clearcoat = 0.0;
                  m.clearcoatRoughness = 1.0;
                  m.sheen = 0.05;
                  m.sheenRoughness = 0.88;
                  m.sheenColor = new THREE.Color(0xc898b0);
                  m.specularIntensity = 0.08;
                }
                m.needsUpdate = true;
              }
            }
          }
        });
        bagGroup.add(model);
        bagAnim.halfW = (size.x * s) / 2;
        bagAnim.height = size.y * s;
        bagAnim.yBottom = -(size.y * s + 0.5);
        // Légèrement au-dessus de l’eau : le sac flotte sans toucher la surface
        // (amplitude de lévitation = 0.06 → bas de l’oscillation reste à ~0.02 > 0).
        bagAnim.ySurface = 0.08;
        bagAnim.loaded = true;
        bagGroup.rotation.y = BAG_FRONT_ROTATION_Y;
        onReadyRef.current?.();
      },
      undefined,
      (err) => {
        console.error("finalbag.glb error:", err);
        onReadyRef.current?.();
      },
    );

    // ── Sakura flottants ──────────────────────────────────────────────────────
    const sakuraGroup = new THREE.Group();
    sakuraGroup.visible = false;
    sakuraGroup.renderOrder = 3; // au-dessus de l'eau et des perles
    scene.add(sakuraGroup);

    const sakuraData = []; // rempli après chargement du GLB
    // Caméra en (0, 0.28, 2.35) → look (0, 0.52, -1.85), FOV 42°.
    // |x| max visible : ~0.9 à z=+0.5 ; ~1.6 à z=0 ; ~2.6 à z=-1.5 ; ~3.3 à z=-2.5.
    // 5 à gauche, 5 à droite, tailles & profondeurs variées, toutes dans le frustum.
    const SAKURA_LAYOUT = [
      // ── Gauche ──
      { x: -3.15, z: -3.05, size: 3.4 },
      { x: -0.85, z: -2.05, size: 2.4 },
      { x: -2.55, z: -0.55, size: 2.8 },
      { x: -0.48, z: 0.58, size: 2.0 },
      { x: -0.88, z: 0.75, size: 1.7 },
      // ── Droite ──
      { x: 3.05, z: -2.95, size: 3.1 },
      { x: 0.82, z: -1.95, size: 2.3 },
      { x: 2.5, z: -0.45, size: 2.9 },
      { x: 0.45, z: 0.62, size: 2.0 },
      { x: 0.85, z: 0.78, size: 1.7 },
    ];

    new GLTFLoader().load(
      "/models/sakura.glb",
      (gltf) => {
        const proto = gltf.scene;
        const box = new THREE.Box3().setFromObject(proto);
        const sz = box.getSize(new THREE.Vector3());
        const ct = box.getCenter(new THREE.Vector3());
        const md = Math.max(sz.x, sz.y, sz.z) || 1;
        // Re-centre sur l'origine
        proto.position.set(-ct.x / md, -ct.y / md, -ct.z / md);
        proto.scale.setScalar(1 / md);
        proto.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = false;
            c.receiveShadow = false;
          }
        });

        const rndS = createRandom(9981);
        SAKURA_LAYOUT.forEach((pos, i) => {
          const wrapper = new THREE.Group();
          const baseX = pos.x + (rndS() - 0.5) * 0.22;
          const baseZ = pos.z + (rndS() - 0.5) * 0.18;
          wrapper.position.set(baseX, 0.08, baseZ);
          wrapper.rotation.y = rndS() * Math.PI * 2;

          const inst = proto.clone(true);
          const sizeJitter = 0.82 + rndS() * 0.36;
          inst.scale.setScalar(pos.size * sizeJitter);
          // Render order pour passer par-dessus l'eau
          inst.traverse((c) => {
            if (c.isMesh) {
              c.renderOrder = 3;
              if (c.material) {
                c.material.depthWrite = true;
                c.material.transparent = false;
              }
            }
          });
          wrapper.add(inst);
          sakuraGroup.add(wrapper);

          // Delay propre à chaque fleur pour qu'elles n'arrivent pas toutes ensemble
          const enterDelay = (i % 7) * 0.05 + rndS() * 0.028;

          sakuraData.push({
            node: wrapper,
            baseX,
            baseZ,
            offscreenX: baseX + (baseX < 0 ? -6.5 : 6.5), // entrée latérale
            enterDelay,
            yOffset: 0.015 + rndS() * 0.012,
            spinSpeed: (rndS() - 0.5) * 0.18,
            phase: rndS() * Math.PI * 2,
            driftAmpX: 0.05 + rndS() * 0.06,
            driftAmpZ: 0.04 + rndS() * 0.05,
            driftSpeed: 0.2 + rndS() * 0.25,
          });
        });
      },
      undefined,
      (err) => console.warn("sakura.glb erreur:", err),
    );

    // ── Drag to rotate ────────────────────────────────────────────────────────
    const drag = { active: false, prevX: 0, velocityY: 0, productPhase: false };
    let hasRotated = false;
    const worldHotspot = new THREE.Vector3();

    function updateRotateHint(show) {
      const el = rotateHintRef.current;
      if (!el) return;
      el.style.opacity = show ? "1" : "0";
      el.style.visibility = show ? "visible" : "hidden";
    }

    function onPointerDown(e) {
      if (!drag.productPhase) return;
      drag.active = true;
      drag.prevX = e.clientX;
      drag.velocityY = 0;
      if (!hasRotated) {
        hasRotated = true;
        updateRotateHint(false);
      }
    }
    function onPointerMove(e) {
      if (!drag.active) return;
      const dx = e.clientX - drag.prevX;
      drag.velocityY = dx * 0.006;
      bagGroup.rotation.y += drag.velocityY;
      drag.prevX = e.clientX;
    }
    function onPointerUp() {
      drag.active = false;
    }
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerUp);

    // ── Boucle d'animation ────────────────────────────────────────────────────
    const timer = new THREE.Timer();
    let animId;
    let wasDragEnabled = false;
    let productFloatAnchor = null;

    function hideAllHotspots() {
      for (let i = 0; i < BAG_HOTSPOTS.length; i++) {
        const el = hotspotRefs.current[i];
        if (!el) continue;
        el.style.opacity = "0";
        el.style.visibility = "hidden";
        el.style.pointerEvents = "none";
        el.setAttribute("aria-hidden", "true");
      }
    }

    function animate() {
      animId = requestAnimationFrame(animate);
      timer.update(performance.now());

      const introLocked = phaseRef.current !== "scene";
      if (introLocked) {
        renderer.domElement.style.display = "none";
        container.style.pointerEvents = "none";
        hideAllHotspots();
        return;
      }

      const yVh = window.scrollY / window.innerHeight;
      const snapped = snapRef.current;
      const active = snapped || yVh >= BAG_RAF_START_VH;

      renderer.domElement.style.display = active ? "block" : "none";
      container.style.pointerEvents =
        snapped || yVh >= BAG_START_VH ? "auto" : "none";
      if (!active) {
        hideAllHotspots();
        return;
      }

      const elapsed = timer.getElapsed();
      const vh = window.innerHeight;
      const scrollLocalY = window.scrollY - BAG_START_VH * vh;
      const snapLocalY = (EMERGENCE_END + BAG_SCENE_TAIL_VH) * vh;
      const localY = snapRef.current
        ? Math.max(scrollLocalY, snapLocalY)
        : scrollLocalY;

      water.material.uniforms["time"].value = elapsed * 0.25;

      // Sakura flottants — entrée latérale en cascade pendant le scroll
      const SAKURA_ENTER_START = EMERGENCE_START;
      const SAKURA_ENTER_END = EMERGENCE_END + BAG_SCENE_TAIL_VH + 0.55;
      const FLOWER_DURATION = 0.58;
      const enterT = THREE.MathUtils.clamp(
        (localY / vh - SAKURA_ENTER_START) /
          (SAKURA_ENTER_END - SAKURA_ENTER_START),
        0,
        1,
      );
      sakuraGroup.visible = enterT > 0;
      if (enterT > 0 && sakuraData.length > 0) {
        for (const s of sakuraData) {
          // Progression individuelle : decalée par enterDelay, lissée
          const raw = (enterT - s.enterDelay) / FLOWER_DURATION;
          const p = THREE.MathUtils.clamp(raw, 0, 1);
          // easeOutCubic pour une arrivée qui décélère
          const eased = 1 - Math.pow(1 - p, 3);

          const t = elapsed * s.driftSpeed + s.phase;
          // La dérive flottante n'apparaît qu'une fois la fleur en place
          const driftX = Math.sin(t) * s.driftAmpX * eased;
          const driftZ = Math.cos(t * 0.8) * s.driftAmpZ * eased;
          const driftY = Math.sin(t * 1.4) * 0.012 * eased;

          const targetX = s.baseX + driftX;
          s.node.position.x = THREE.MathUtils.lerp(
            s.offscreenX,
            targetX,
            eased,
          );
          s.node.position.z = s.baseZ + driftZ;
          s.node.position.y = 0.08 + s.yOffset + driftY;
          // Rotation lente autour de l'axe vertical (commence dès qu'elle arrive)
          if (eased > 0) s.node.rotation.y += s.spinSpeed * 0.005 * eased;
        }
      }

      camera.position.set(0, 0.28, currentLayout.cameraZ);
      camera.lookAt(CAMERA_LOOK);

      if (bagAnim.loaded) {
        const preEmergencePx = (EMERGENCE_START - EMERGENCE_PRE_VISIBLE) * vh;
        const emergeStartPx = EMERGENCE_START * vh;
        const emergeEndPx = EMERGENCE_END * vh;

        if (localY < preEmergencePx) {
          bagGroup.visible = false;
          bagGroup.position.y = bagAnim.yBottom;
          bagGroup.rotation.y = BAG_FRONT_ROTATION_Y;
          productFloatAnchor = null;
        } else if (localY < emergeStartPx) {
          bagGroup.visible = true;
          bagGroup.position.y = bagAnim.yBottom;
          bagGroup.rotation.y = BAG_FRONT_ROTATION_Y;
          productFloatAnchor = null;
        } else {
          bagGroup.visible = true;

          if (localY <= emergeEndPx) {
            productFloatAnchor = null;
            const p = THREE.MathUtils.clamp(
              (localY - emergeStartPx) / (emergeEndPx - emergeStartPx),
              0,
              1,
            );
            bagGroup.position.y = THREE.MathUtils.lerp(
              bagAnim.yBottom,
              bagAnim.ySurface,
              emergeEase(p),
            );
            bagGroup.rotation.y = BAG_FRONT_ROTATION_Y + p * EMERGENCE_SPIN_Y;
          } else {
            if (productFloatAnchor === null) {
              productFloatAnchor = performance.now();
            }
            const floatT = (performance.now() - productFloatAnchor) * 0.0012;
            bagGroup.position.y = bagAnim.ySurface + Math.sin(floatT) * 0.06;
          }
        }

        const canDragBag = localY >= BAG_DRAG_START_LOCAL_VH * vh;
        if (canDragBag !== wasDragEnabled) {
          drag.productPhase = canDragBag;
          wasDragEnabled = canDragBag;
        }
        updateRotateHint(canDragBag && !hasRotated);

        const isProduct = localY >= emergeEndPx;
        const localYVh = localY / vh;
        const hotspotReveal = THREE.MathUtils.clamp(
          (localYVh - HOTSPOT_REVEAL_START_VH) /
            (HOTSPOT_REVEAL_END_VH - HOTSPOT_REVEAL_START_VH),
          0,
          1,
        );
        const hotspotOpacity =
          hotspotReveal * hotspotReveal * (3 - 2 * hotspotReveal);

        if (
          drag.productPhase &&
          !drag.active &&
          Math.abs(drag.velocityY) > 0.0001
        ) {
          bagGroup.rotation.y += drag.velocityY;
          drag.velocityY *= 0.95;
        }

        // Hotspots — ancrés à la position du sac (sans sa rotation), donc fixes
        // autour de lui même quand on le fait tourner au drag.
        const w = container.clientWidth;
        const h = container.clientHeight;
        const hotspotAdjust = getHotspotViewportAdjust(w, h);

        BAG_HOTSPOTS.forEach((spot, i) => {
          const el = hotspotRefs.current[i];
          if (!el) return;

          const hide = () => {
            el.style.opacity = "0";
            el.style.visibility = "hidden";
            el.style.pointerEvents = "none";
            el.setAttribute("aria-hidden", "true");
            el.removeAttribute("data-panel-above");
          };

          if (!isProduct || hotspotOpacity <= 0) {
            hide();
            return;
          }

          worldHotspot.copy(
            computeHotspotLocalOffset(
              spot.side,
              spot.heightT,
              bagAnim.halfW,
              bagAnim.height,
              spot.radialIn ?? 0,
              hotspotAdjust.radialOut,
            ),
          );
          worldHotspot.x += bagGroup.position.x;
          worldHotspot.y += bagGroup.position.y;
          worldHotspot.z += bagGroup.position.z;
          worldHotspot.project(camera);
          if (
            worldHotspot.z < -1 ||
            worldHotspot.z > 1 ||
            Math.abs(worldHotspot.x) > 1.15 ||
            Math.abs(worldHotspot.y) > 1.15
          ) {
            hide();
            return;
          }

          const sx = (spot.screenOffset?.x ?? 0) * hotspotAdjust.offsetScale;
          const sy = (spot.screenOffset?.y ?? 0) * hotspotAdjust.offsetScale;
          let pinX = (worldHotspot.x * 0.5 + 0.5) * w + sx;
          let pinY = (-worldHotspot.y * 0.5 + 0.5) * h + sy;

          if (hotspotAdjust.narrow > 0.05) {
            pinX = THREE.MathUtils.clamp(
              pinX,
              hotspotAdjust.edgePadX,
              w - hotspotAdjust.edgePadX,
            );
            pinY = THREE.MathUtils.clamp(
              pinY,
              hotspotAdjust.edgePadY,
              h - hotspotAdjust.edgePadY - 120,
            );
          } else {
            el.removeAttribute("data-panel-above");
          }

          el.style.left = `${pinX}px`;
          el.style.top = `${pinY}px`;
          el.style.opacity = String(hotspotOpacity);
          el.style.setProperty(
            "--hotspot-scale",
            String(0.82 + 0.18 * hotspotOpacity),
          );
          el.style.visibility = hotspotOpacity > 0.03 ? "visible" : "hidden";
          el.style.pointerEvents = hotspotOpacity > 0.45 ? "auto" : "none";
          el.setAttribute(
            "aria-hidden",
            hotspotOpacity > 0.45 ? "false" : "true",
          );
        });
      }

      const heroOp = heroTitleOpacityRef.current;
      heroTitle.mesh.visible = heroOp > 0.02;
      heroTitle.mesh.material.opacity = heroOp;

      composer.render();
    }

    animate();

    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      const mb = getWaterMirrorBufferSize(renderer);
      water.setMirrorRenderTargetSize(mb.w, mb.h);
      heroTitle.draw();
      heroTitle.texture.needsUpdate = true;
      applyViewportLayout(w, h);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerUp);
      scene.background = null;
      if (scene.environment) scene.environment.dispose();
      skyTex.dispose();
      heroTitle.texture.dispose();
      heroTitle.mesh.geometry.dispose();
      heroTitle.mesh.material.dispose();
      water.disposeMirrorRenderTarget();
      pmrem.dispose();
      composer.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <>
      <div ref={containerRef} className="scene-container" />
      {phase === "scene" && (
        <>
          <p ref={rotateHintRef} className="bag-rotate-hint" aria-hidden="true">
            Drag to rotate
          </p>
          <div className="product-hotspots-layer">
            {BAG_HOTSPOTS.map((spot, i) => (
              <div
                key={spot.title}
                ref={(el) => {
                  hotspotRefs.current[i] = el;
                }}
                className={`product-hotspot${spot.side < 0 ? " product-hotspot--left" : " product-hotspot--right"}${activeHotspot === i ? " product-hotspot--active" : ""}`}
              >
                <div className="product-hotspot__anchor">
                  <button
                    type="button"
                    className="product-hotspot__pin"
                    aria-label={spot.title}
                    aria-expanded={activeHotspot === i}
                    onClick={() =>
                      setActiveHotspot((prev) => (prev === i ? null : i))
                    }
                  />
                  <div className="product-hotspot__panel">
                    <h3 className="product-hotspot__title">{spot.title}</h3>
                    <p className="product-hotspot__body">{spot.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {activeHotspot !== null && (
            <div
              className="product-hotspot-mobile-card"
              role="dialog"
              aria-labelledby="hotspot-mobile-title"
            >
              <button
                type="button"
                className="product-hotspot-mobile-card__close"
                aria-label="Close"
                onClick={() => setActiveHotspot(null)}
              />
              <h3
                id="hotspot-mobile-title"
                className="product-hotspot-mobile-card__title"
              >
                {BAG_HOTSPOTS[activeHotspot].title}
              </h3>
              <p className="product-hotspot-mobile-card__body">
                {BAG_HOTSPOTS[activeHotspot].body}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
