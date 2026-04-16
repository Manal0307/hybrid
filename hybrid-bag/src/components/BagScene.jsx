import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { createWaterNormalsTexture } from "../utils/waterNormalsTexture";
import { loadWaterNormals } from "../utils/loadWaterNormals";

// ─── Constantes ──────────────────────────────────────────────────────────────
export const BAG_START_VH = 8; // commence après bottle (4vh) + textes (4vh)

const SUN_ELEVATION = 20;
const SUN_AZIMUTH = 180;
const HDRI_PATH = new URL(
  "../map/hdri/table_mountain_1_puresky_2k.hdr",
  import.meta.url,
).href;

const BAG_FRONT_ROTATION_Y = Math.PI;
const CAMERA_POS = new THREE.Vector3(0, 0.28, 2.35);
const CAMERA_LOOK = new THREE.Vector3(0, 0.52, -1.85);
const CAMERA_FOV = 42;

const EMERGENCE_START = 0.5; // localY en vh
const EMERGENCE_END = 2.0;
const EMERGENCE_SPIN_Y = Math.PI * 0.25;

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
    local: { x: 0, y: 0.46, z: 0.0 },
    // Dessus du sac — visible dès qu'on regarde de face ou de haut
    normal: new THREE.Vector3(0, 1, 0),
  },
  {
    title: "Façade avant",
    body: "Accès rapide aux essentiels et volumes pensés pour la modularité.",
    local: { x: 0.13, y: 0.04, z: 0.24 },
    // Face avant (local -z → world +z = face caméra au repos)
    normal: new THREE.Vector3(0, 0, -1),
  },
  {
    title: "Panneau latéral",
    body: "Zone de personnalisation et détails techniques du programme Hybrid.",
    local: { x: -0.3, y: 0.06, z: 0.0 },
    // Côté gauche — visible uniquement quand le sac est tourné
    normal: new THREE.Vector3(-1, 0, 0),
  },
  {
    title: "Base & finitions",
    body: "Stabilité au posé et protection des contenus par une base soignée.",
    local: { x: 0, y: -0.32, z: 0.0 },
    // Dessous — visible en tournant le sac vers le bas
    normal: new THREE.Vector3(0, -1, 0),
  },
];

// ─── Utilitaires ─────────────────────────────────────────────────────────────
function elasticOut(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c4 = (2 * Math.PI) / 3.2;
  return Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
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
    let x = 0, zz = 0, ok = false;
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

function createOceanBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0,     "#161d6a");
  g.addColorStop(0.22,  "#232d85");
  g.addColorStop(0.38,  "#33419a");
  g.addColorStop(0.44,  "#505eb5");
  g.addColorStop(0.48,  "#9e8b8a");
  g.addColorStop(0.5,   "#c9a9a0");
  g.addColorStop(0.505, "#d0ccd8");
  g.addColorStop(0.51,  "#d5d3de");
  g.addColorStop(0.52,  "#d5d3de");
  g.addColorStop(0.56,  "#c8cada");
  g.addColorStop(0.62,  "#a8b4c8");
  g.addColorStop(0.72,  "#5a7aad");
  g.addColorStop(0.84,  "#1a4580");
  g.addColorStop(1,     "#04182e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
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
    renderer.toneMappingExposure = 0.85;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x050508, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    // Caché par défaut — le RAF l'affiche uniquement quand y >= BAG_START_VH
    renderer.domElement.style.display = "none";
    container.style.pointerEvents = "none";

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = createOceanBackground();

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
        0.18, 0.35, 0.88,
      ),
    );

    // ── HDRI ──────────────────────────────────────────────────────────────────
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    new RGBELoader().load(
      HDRI_PATH,
      (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = pmrem.fromEquirectangular(tex).texture;
        scene.environmentIntensity = 0.45;
      },
      undefined,
      () => console.warn("HDRI non chargé"),
    );

    // ── Eau ───────────────────────────────────────────────────────────────────
    const phi = THREE.MathUtils.degToRad(90 - SUN_ELEVATION);
    const theta = THREE.MathUtils.degToRad(SUN_AZIMUTH);
    const sun = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

    const water = new Water(new THREE.PlaneGeometry(10000, 10000), {
      textureWidth: 2048,
      textureHeight: 2048,
      clipBias: 0.002,
      waterNormals: createWaterNormalsTexture(512),
      sunDirection: sun.clone().normalize(),
      sunColor: 0xffffff,
      waterColor: 0x3d7eb8,
      distortionScale: 0.26,
      alpha: 1.0,
      fog: false,
    });
    water.rotation.x = -Math.PI / 2;
    water.material.uniforms["alpha"].value = 1.0;
    water.material.uniforms["size"].value = 150;
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
          "float horizonFade = smoothstep(40.0, 120.0, dist);",
          "gl_FragColor = vec4( outgoingLight, alpha * (1.0 - horizonFade) );",
        ].join("\n"),
      );
    };
    scene.add(water);
    loadWaterNormals((tex) => {
      water.material.uniforms["normalSampler"].value = tex;
    });

    // ── Lumières ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x8899cc, 0.3));

    const keyLight = new THREE.DirectionalLight(0xfff0e0, 1.0);
    keyLight.position.set(2, 4, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xaabfff, 0.35);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffd0a0, 0.08);
    rimLight.position.set(0, 3, -5);
    scene.add(rimLight);

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
        model.position.set(-center.x * s, -center.y * s + (size.y * s) / 2, -center.z * s);
        model.traverse((c) => {
          if (c.isMesh) { c.castShadow = true; c.receiveShadow = false; }
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
      color: 0xf8f1ea, roughness: 0.12, metalness: 0.02,
      clearcoat: 1, clearcoatRoughness: 0.08,
      reflectivity: 0.9, envMapIntensity: 1.5,
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
          if (c.isMesh) { c.castShadow = false; c.receiveShadow = false; }
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

    // ── Drag to rotate ────────────────────────────────────────────────────────
    const drag = { active: false, prevX: 0, velocityY: 0, productPhase: false };
    const worldHotspot = new THREE.Vector3();
    const localHotspot = new THREE.Vector3();
    const toPointVec = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    const worldNormal = new THREE.Vector3();
    const toCamVec = new THREE.Vector3();

    function onPointerDown(e) { if (!drag.productPhase) return; drag.active = true; drag.prevX = e.clientX; drag.velocityY = 0; }
    function onPointerMove(e) { if (!drag.active) return; const dx = e.clientX - drag.prevX; drag.velocityY = dx * 0.006; bagGroup.rotation.y += drag.velocityY; drag.prevX = e.clientX; }
    function onPointerUp() { drag.active = false; }
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerUp);

    // ── Boucle d'animation ────────────────────────────────────────────────────
    const timer = new THREE.Timer();
    let animId;
    let wasProduct = false;
    let pearlEmergeSmooth = 0;
    let pearlMaterialsReset = false;

    function animate() {
      animId = requestAnimationFrame(animate);
      timer.update(performance.now());

      const yVh = window.scrollY / window.innerHeight;
      const active = yVh >= BAG_START_VH;

      renderer.domElement.style.display = active ? "block" : "none";
      container.style.pointerEvents = active ? "auto" : "none";
      if (!active) return;

      const elapsed = timer.getElapsed();
      const vh = window.innerHeight;
      const localY = window.scrollY - BAG_START_VH * vh;

      water.material.uniforms["time"].value = elapsed * 0.25;

      camera.position.copy(CAMERA_POS);
      camera.lookAt(CAMERA_LOOK);

      if (bagAnim.loaded) {
        if (localY < EMERGENCE_START * vh) {
          bagGroup.visible = false;
          bagGroup.position.y = bagAnim.yBottom;
          bagGroup.rotation.y = BAG_FRONT_ROTATION_Y;
        } else if (localY <= EMERGENCE_END * vh) {
          bagGroup.visible = true;
          const p = (localY - EMERGENCE_START * vh) / ((EMERGENCE_END - EMERGENCE_START) * vh);
          bagGroup.position.y = THREE.MathUtils.lerp(bagAnim.yBottom, bagAnim.ySurface, elasticOut(p));
          bagGroup.rotation.y = BAG_FRONT_ROTATION_Y + p * EMERGENCE_SPIN_Y;
        } else {
          bagGroup.visible = true;
          bagGroup.position.y = bagAnim.ySurface + Math.sin(performance.now() * 0.0012) * 0.06;
        }

        const isProduct = localY >= EMERGENCE_END * vh;
        if (isProduct !== wasProduct) {
          drag.productPhase = isProduct;
          wasProduct = isProduct;
        }

        if (drag.productPhase && !drag.active && Math.abs(drag.velocityY) > 0.0001) {
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

          if (!isProduct) { hide(); return; }

          // Position monde du hotspot
          localHotspot.set(spot.local.x, spot.local.y, spot.local.z);
          worldHotspot.copy(localHotspot).applyMatrix4(bagGroup.matrixWorld);

          // Culling par normale : transforme la normale locale en espace monde
          worldNormal.copy(spot.normal).applyQuaternion(bagGroup.quaternion);
          toCamVec.copy(camera.position).sub(worldHotspot).normalize();
          // Si la surface est dos à la caméra → cacher
          if (worldNormal.dot(toCamVec) < 0.15) { hide(); return; }

          // Projection écran
          worldHotspot.project(camera);
          if (
            worldHotspot.z < -1 || worldHotspot.z > 1 ||
            Math.abs(worldHotspot.x) > 1.1 || Math.abs(worldHotspot.y) > 1.1
          ) { hide(); return; }

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
            (localY - EMERGENCE_START * vh) / ((EMERGENCE_END - EMERGENCE_START) * vh), 0, 1,
          );
          pearlEmergeSmooth = emergeTarget > pearlEmergeSmooth
            ? Math.min(pearlEmergeSmooth + PEARL_EMERGE_MAX_STEP, emergeTarget)
            : emergeTarget;

          for (const pearl of pearlData) {
            pearl.node.visible = true;
            if (!pearlMaterialsReset) {
              pearl.node.traverse((child) => {
                if (!child.isMesh || !child.material) return;
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                for (const m of mats) { m.transparent = false; m.opacity = 1; m.depthWrite = true; }
              });
            }
            const bobY = Math.sin(elapsed * 0.8 + pearl.driftPhase) * 0.0032;
            const yDeep = -pearl.size * 0.5 - PEARL_HIDDEN_EXTRA_DEPTH;
            const yFloat = -pearl.size * 0.5 - PEARL_REST_EXTRA_DEPTH + pearl.surfaceOffset + bobY;
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
      pmrem.dispose();
      pearlGeo.dispose();
      pearlMat.dispose();
      composer.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <>
      <div ref={containerRef} className="scene-container" />
      <div className="product-hotspots-layer">
        {BAG_HOTSPOTS.map((spot, i) => (
          <div
            key={spot.title}
            ref={(el) => { hotspotRefs.current[i] = el; }}
            className="product-hotspot"
          >
            <button type="button" className="product-hotspot__pin" aria-label={spot.title} />
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
