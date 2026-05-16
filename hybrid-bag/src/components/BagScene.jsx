import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { createWaterNormalsTexture } from "../utils/waterNormalsTexture";
import { loadWaterNormals } from "../utils/loadWaterNormals";

import { BOTTLE_SCROLL_VH } from "./BottleScene";

export const TEXT_TRACK_BEFORE_BAG_VH = 4;
export const BAG_START_VH = BOTTLE_SCROLL_VH + TEXT_TRACK_BEFORE_BAG_VH;

/** RAF + canvas avant BAG_START_VH pour éviter un « pop » quand le voile se lève */
const BAG_RAF_START_VH = BAG_START_VH - 1.35;

const SUN_ELEVATION = 11;
const SUN_AZIMUTH = 180;

const BAG_FRONT_ROTATION_Y = Math.PI;
const CAMERA_POS = new THREE.Vector3(0, 0.28, 2.35);
const CAMERA_LOOK = new THREE.Vector3(0, 0.52, -1.85);
const CAMERA_FOV = 42;

const EMERGENCE_START = 0.5; // localY en vh
const EMERGENCE_END = 2.0;
const EMERGENCE_SPIN_Y = Math.PI * 0.25;

/** Drag sac : dès ~45 % de la montée (souvent en même temps que le CTA « Discover »). */
const BAG_DRAG_START_LOCAL_VH =
  EMERGENCE_START + (EMERGENCE_END - EMERGENCE_START) * 0.45;

const PEARL_MODEL_PATH = "/models/pearl.glb";
const PEARL_REST_EXTRA_DEPTH = 0.045;
const PEARL_EMERGE_MAX_STEP = 0.012;
const PEARL_HIDDEN_EXTRA_DEPTH = 0.14;
const PEARL_COUNT = 9;

// normal = direction outward de la surface en espace LOCAL du bagGroup.
// Avec rotation.y = PI (vue front par défaut) :
//   local (0,0,-1) → world (0,0,+1) = face caméra  ✓
//   local (-1,0,0) → world (+1,0,0) = côté droit    visible en tournant
//   local (0,1,0)  → world (0,1,+0) = dessus         toujours visible
//   local (0,-1,0) → world (0,-1,0) = dessous         visible en tournant
const BAG_HOTSPOTS = [
  {
    title: "Anse & structure",
    body: "Structure légère et renforcée pour une portée confortable au quotidien.",
    local: { x: 0, y: 0.52, z: 0.0 },
    // Dessus / embouchure — point le plus haut
    normal: new THREE.Vector3(0, 1, 0),
  },
  {
    title: "Façade avant",
    body: "Accès rapide aux essentiels et volumes pensés pour la modularité.",
    local: { x: 0.11, y: 0.32, z: 0.24 },
    // Face avant, zone haute–moyenne (vue caméra)
    normal: new THREE.Vector3(0, 0, -1),
  },
  {
    title: "Panneau latéral",
    body: "Zone de personnalisation et détails techniques du programme Hybrid.",
    local: { x: -0.29, y: 0.22, z: 0.05 },
    // Côté gauche, hauteur milieu de corps (plus lisible que collé à la base)
    normal: new THREE.Vector3(-1, 0, 0),
  },
  {
    title: "Base & finitions",
    body: "Stabilité au posé et protection des contenus par une base soignée.",
    local: { x: 0.02, y: 0.06, z: 0.22 },
    // Bas de la silhouette mais sur la façade — évite les plots sous le sac au niveau de l’eau
    normal: new THREE.Vector3(0, 0, -1),
  },
];

// ─── Utilitaires ─────────────────────────────────────────────────────────────
/** Émergence souple : monte vite, petit dépassement, se stabilise */
function emergeEase(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  // easeOutBack avec overshoot réduit (~5% au-dessus de la surface au max)
  const c1 = 0.4; // overshoot — standard easeOutBack = 1.70158
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
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

function buildPearlLayout() {
  const rnd = createRandom(7421);
  const layout = [];
  const minDist = 0.48;
  const bagExcl = 0.92;
  for (let i = 0; i < PEARL_COUNT; i++) {
    let x = 0,
      zz = 0,
      ok = false;
    for (let attempt = 0; attempt < 220; attempt++) {
      x = -3.25 + rnd() * 6.5;
      zz = -1.05 + rnd() * 3.55;
      if (Math.hypot(x, zz + 0.35) <= bagExcl) continue;
      ok = layout.every((p) => Math.hypot(p.x - x, p.z - zz) > minDist);
      if (ok) break;
    }
    layout.push({ x, z: zz, size: 0.03 + rnd() * 0.028 });
  }
  return layout;
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

  let seed = 90210;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 4294967296;
  };
  /* Étoiles sur le dôme mauve uniquement — évite la bande claire horizon (y ~ 400–630 px). */
  const starY = () => (rnd() < 0.72 ? rnd() * 395 : 635 + rnd() * 389);

  for (let i = 0; i < 1650; i++) {
    const x = rnd() * 2048;
    const y = starY();
    const r = rnd() * 1.35 + 0.22;
    ctx.fillStyle = `rgba(255,252,255,${0.22 + rnd() * 0.58})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  /* Points très fins pour densité « voie lactée » légère */
  for (let i = 0; i < 920; i++) {
    const x = rnd() * 2048;
    const y = rnd() < 0.78 ? rnd() * 380 : 640 + rnd() * 384;
    ctx.fillStyle = `rgba(252,248,255,${0.1 + rnd() * 0.3})`;
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

const PEARL_LAYOUT = buildPearlLayout();

// ─── Composant ───────────────────────────────────────────────────────────────
export default function BagScene() {
  const containerRef = useRef(null);
  const hotspotRefs = useRef([]);

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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

    const camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      container.clientWidth / container.clientHeight,
      0.05,
      20000,
    );
    camera.position.copy(CAMERA_POS);
    camera.lookAt(CAMERA_LOOK);

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

    const water = new Water(new THREE.PlaneGeometry(10000, 10000), {
      textureWidth: 2048,
      textureHeight: 2048,
      clipBias: 0.002,
      waterNormals: createWaterNormalsTexture(512, maxAnisotropy),
      sunDirection: sun.clone().normalize(),
      sunColor: 0xffe0d8,
      waterColor: 0x1c3a6e,
      distortionScale: 0.26,
      alpha: 1.0,
      fog: false,
    });
    water.rotation.x = -Math.PI / 2;
    water.material.uniforms["alpha"].value = 1.0;
    water.material.uniforms["size"].value = 165;
    water.material.transparent = true;
    water.material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "noise.xzy * vec3( 1.5, 1.0, 1.5 )",
        "noise.xzy * vec3( 1.4, 1.0, 1.4 )",
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
    bagGroup.visible = false;
    scene.add(bagGroup);

    const bagAnim = { yBottom: -1.8, ySurface: 0.05, loaded: false };

    new GLTFLoader().load(
      "/models/codebag.glb",
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const s = 1.5 / maxDim;
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
              // Sac clair qui tranche sur l'eau sombre + reflets colorés du ciel crépusculaire
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
        });
        bagGroup.add(model);
        bagAnim.yBottom = -(size.y * s + 0.5);
        bagAnim.ySurface = 0.05;
        bagAnim.loaded = true;
        bagGroup.rotation.y = BAG_FRONT_ROTATION_Y;
      },
      undefined,
      (err) => console.error("codebag.glb error:", err),
    );

    // ── Perles ────────────────────────────────────────────────────────────────
    const pearlGroup = new THREE.Group();
    pearlGroup.renderOrder = 2;
    pearlGroup.visible = false;
    scene.add(pearlGroup);

    const pearlGeo = new THREE.SphereGeometry(1, 40, 40);
    const pearlMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8f1ea,
      roughness: 0.12,
      metalness: 0.02,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      reflectivity: 0.9,
      envMapIntensity: 1.5,
    });

    const rndDrift = createRandom(1229);
    const pearlData = PEARL_LAYOUT.map((layout) => {
      const mesh = new THREE.Mesh(pearlGeo, pearlMat);
      mesh.scale.setScalar(layout.size);
      pearlGroup.add(mesh);
      return {
        node: mesh,
        size: layout.size,
        baseX: layout.x,
        baseZ: bagGroup.position.z + layout.z,
        driftPhase: rndDrift() * Math.PI * 2,
        surfaceOffset: (rndDrift() - 0.5) * 0.002,
      };
    });

    // Optionnel : remplace les sphères par le pearl.glb si disponible
    new GLTFLoader().load(
      PEARL_MODEL_PATH,
      (gltf) => {
        const proto = gltf.scene;
        const box = new THREE.Box3().setFromObject(proto);
        const sz = box.getSize(new THREE.Vector3());
        const ct = box.getCenter(new THREE.Vector3());
        const md = Math.max(sz.x, sz.y, sz.z) || 1;
        proto.scale.setScalar(1 / md);
        proto.position.set(-ct.x / md, -ct.y / md, -ct.z / md);
        proto.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = false;
            c.receiveShadow = false;
          }
        });
        for (const pearl of pearlData) {
          pearlGroup.remove(pearl.node);
          const clone = proto.clone(true);
          clone.scale.setScalar(pearl.size * 1.2);
          pearlGroup.add(clone);
          pearl.node = clone;
        }
      },
      undefined,
      () => console.warn("pearl.glb introuvable — fallback sphères"),
    );

    // ── Sakura flottants ──────────────────────────────────────────────────────
    const sakuraGroup = new THREE.Group();
    sakuraGroup.visible = false;
    sakuraGroup.renderOrder = 3; // au-dessus de l'eau et des perles
    scene.add(sakuraGroup);

    const sakuraData = []; // rempli après chargement du GLB
    // 10 fleurs : 5 à gauche du sac (x négatif), 5 à droite (x positif)
    const SAKURA_LAYOUT = [
      // Gauche
      { x: -2.6, z: -2.4 },
      { x: -1.8, z: -1.0 },
      { x: -2.9, z: 0.4 },
      { x: -1.5, z: 1.2 },
      { x: -2.3, z: 2.3 },
      // Droite
      { x: 2.6, z: -2.4 },
      { x: 1.8, z: -1.0 },
      { x: 2.9, z: 0.4 },
      { x: 1.5, z: 1.2 },
      { x: 2.3, z: 2.3 },
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
        // Chaque côté reçoit ses propres delays (de 0 à ~0.7) pour un effet en cascade
        const sideStaggers = { left: 0, right: 0 };
        SAKURA_LAYOUT.forEach((pos) => {
          const wrapper = new THREE.Group();
          const baseX = pos.x + (rndS() - 0.5) * 0.4;
          const baseZ = bagGroup.position.z + pos.z + (rndS() - 0.5) * 0.4;
          wrapper.position.set(baseX, 0.08, baseZ);
          wrapper.rotation.y = rndS() * Math.PI * 2;

          const inst = proto.clone(true);
          // Taille très grande — fleurs bien visibles à la surface
          const size = 3.0 + rndS() * 1.0;
          inst.scale.setScalar(size);
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
          const sideKey = baseX < 0 ? "left" : "right";
          const enterDelay = sideStaggers[sideKey];
          sideStaggers[sideKey] += 0.14 + rndS() * 0.06;

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
    const worldHotspot = new THREE.Vector3();
    const localHotspot = new THREE.Vector3();
    const toPointVec = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    const worldNormal = new THREE.Vector3();
    const toCamVec = new THREE.Vector3();

    function onPointerDown(e) {
      if (!drag.productPhase) return;
      drag.active = true;
      drag.prevX = e.clientX;
      drag.velocityY = 0;
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
    let pearlEmergeSmooth = 0;
    let pearlMaterialsReset = false;

    function animate() {
      animId = requestAnimationFrame(animate);
      timer.update(performance.now());

      const yVh = window.scrollY / window.innerHeight;
      const active = yVh >= BAG_RAF_START_VH;

      renderer.domElement.style.display = active ? "block" : "none";
      container.style.pointerEvents = yVh >= BAG_START_VH ? "auto" : "none";
      if (!active) return;

      const elapsed = timer.getElapsed();
      const vh = window.innerHeight;
      const localY = window.scrollY - BAG_START_VH * vh;

      water.material.uniforms["time"].value = elapsed * 0.25;

      // Sakura flottants — entrée latérale en cascade pendant le scroll
      // Phase d'entrée pilotée par le scroll : les fleurs glissent depuis les côtés
      const SAKURA_ENTER_START = EMERGENCE_START; // début entrée
      const SAKURA_ENTER_END = EMERGENCE_END + 1.2; // fin entrée (toutes en place)
      const FLOWER_DURATION = 0.42; // durée d'arrivée d'une fleur
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

      camera.position.copy(CAMERA_POS);
      camera.lookAt(CAMERA_LOOK);

      if (bagAnim.loaded) {
        if (localY < EMERGENCE_START * vh) {
          bagGroup.visible = false;
          bagGroup.position.y = bagAnim.yBottom;
          bagGroup.rotation.y = BAG_FRONT_ROTATION_Y;
        } else if (localY <= EMERGENCE_END * vh) {
          bagGroup.visible = true;
          const p =
            (localY - EMERGENCE_START * vh) /
            ((EMERGENCE_END - EMERGENCE_START) * vh);
          bagGroup.position.y = THREE.MathUtils.lerp(
            bagAnim.yBottom,
            bagAnim.ySurface,
            emergeEase(p),
          );
          bagGroup.rotation.y = BAG_FRONT_ROTATION_Y + p * EMERGENCE_SPIN_Y;
        } else {
          bagGroup.visible = true;
          bagGroup.position.y =
            bagAnim.ySurface + Math.sin(performance.now() * 0.0012) * 0.06;
        }

        const canDragBag = localY >= BAG_DRAG_START_LOCAL_VH * vh;
        if (canDragBag !== wasDragEnabled) {
          drag.productPhase = canDragBag;
          wasDragEnabled = canDragBag;
        }

        const isProduct = localY >= EMERGENCE_END * vh;

        if (
          drag.productPhase &&
          !drag.active &&
          Math.abs(drag.velocityY) > 0.0001
        ) {
          bagGroup.rotation.y += drag.velocityY;
          drag.velocityY *= 0.95;
        }

        // Hotspots
        bagGroup.updateMatrixWorld(true);
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.getWorldDirection(camDir);

        BAG_HOTSPOTS.forEach((spot, i) => {
          const el = hotspotRefs.current[i];
          if (!el) return;

          const hide = () => {
            el.style.opacity = "0";
            el.style.visibility = "hidden";
            el.style.pointerEvents = "none";
            el.setAttribute("aria-hidden", "true");
          };

          if (!isProduct) {
            hide();
            return;
          }

          // Position monde du hotspot
          localHotspot.set(spot.local.x, spot.local.y, spot.local.z);
          worldHotspot.copy(localHotspot).applyMatrix4(bagGroup.matrixWorld);

          // Culling par normale : transforme la normale locale en espace monde
          worldNormal.copy(spot.normal).applyQuaternion(bagGroup.quaternion);
          toCamVec.copy(camera.position).sub(worldHotspot).normalize();
          // Si la surface est dos à la caméra → cacher
          if (worldNormal.dot(toCamVec) < 0.15) {
            hide();
            return;
          }

          // Projection écran
          worldHotspot.project(camera);
          if (
            worldHotspot.z < -1 ||
            worldHotspot.z > 1 ||
            Math.abs(worldHotspot.x) > 1.1 ||
            Math.abs(worldHotspot.y) > 1.1
          ) {
            hide();
            return;
          }

          el.style.left = `${(worldHotspot.x * 0.5 + 0.5) * w}px`;
          el.style.top = `${(-worldHotspot.y * 0.5 + 0.5) * h}px`;
          el.style.opacity = "1";
          el.style.visibility = "visible";
          el.style.pointerEvents = "auto";
          el.setAttribute("aria-hidden", "false");
        });

        // Perles
        const inScene2 = localY >= EMERGENCE_START * vh;
        if (!inScene2) {
          pearlGroup.visible = false;
          pearlEmergeSmooth = 0;
          pearlMaterialsReset = false;
        } else {
          pearlGroup.visible = true;
          const emergeTarget = THREE.MathUtils.clamp(
            (localY - EMERGENCE_START * vh) /
              ((EMERGENCE_END - EMERGENCE_START) * vh),
            0,
            1,
          );
          pearlEmergeSmooth =
            emergeTarget > pearlEmergeSmooth
              ? Math.min(
                  pearlEmergeSmooth + PEARL_EMERGE_MAX_STEP,
                  emergeTarget,
                )
              : emergeTarget;

          for (const pearl of pearlData) {
            pearl.node.visible = true;
            if (!pearlMaterialsReset) {
              pearl.node.traverse((child) => {
                if (!child.isMesh || !child.material) return;
                const mats = Array.isArray(child.material)
                  ? child.material
                  : [child.material];
                for (const m of mats) {
                  m.transparent = false;
                  m.opacity = 1;
                  m.depthWrite = true;
                }
              });
            }
            const bobY = Math.sin(elapsed * 0.8 + pearl.driftPhase) * 0.0032;
            const yDeep = -pearl.size * 0.5 - PEARL_HIDDEN_EXTRA_DEPTH;
            const yFloat =
              -pearl.size * 0.5 -
              PEARL_REST_EXTRA_DEPTH +
              pearl.surfaceOffset +
              bobY;
            pearl.node.position.set(
              pearl.baseX + Math.sin(elapsed * 0.5 + pearl.driftPhase) * 0.012,
              THREE.MathUtils.lerp(yDeep, yFloat, pearlEmergeSmooth),
              pearl.baseZ + Math.cos(elapsed * 0.4 + pearl.driftPhase) * 0.008,
            );
            pearl.node.rotation.y = elapsed * 0.4;
          }
          pearlMaterialsReset = true;
        }
      }

      composer.render();
    }

    animate();

    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
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
      pmrem.dispose();
      pearlGeo.dispose();
      pearlMat.dispose();
      composer.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <>
      <div ref={containerRef} className="scene-container" />
      <div className="product-hotspots-layer">
        {BAG_HOTSPOTS.map((spot, i) => (
          <div
            key={spot.title}
            ref={(el) => {
              hotspotRefs.current[i] = el;
            }}
            className="product-hotspot"
          >
            <button
              type="button"
              className="product-hotspot__pin"
              aria-label={spot.title}
            />
            <div className="product-hotspot__panel">
              <h3 className="product-hotspot__title">{spot.title}</h3>
              <p className="product-hotspot__body">{spot.body}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
