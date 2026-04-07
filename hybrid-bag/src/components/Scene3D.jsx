import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// OrbitControls retiré : on fait tourner le sac directement, pas la caméra
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { createWaterNormalsTexture } from "../utils/waterNormalsTexture";
import { loadWaterNormals } from "../utils/loadWaterNormals";

const SUN_ELEVATION = 20;
const SUN_AZIMUTH = 180;

const HDRI_PATH = new URL(
  "../map/hdri/table_mountain_1_puresky_2k.hdr",
  import.meta.url,
).href;

/* Scroll thresholds (multiples of window.innerHeight) */
const DESCENT_END = 1.8;
/** Fin de la descente auto (Home) : sac juste au-dessus de l’eau, face avant visible */
export const AUTO_DESCENT_SCROLL_END = 0.52;
/** Rotation Y du devant (face aux trous) — ajuster 0 / PI / PI/2 si besoin */
const BAG_FRONT_ROTATION_Y = Math.PI;
const EMERGENCE_START = 7.5;
const EMERGENCE_END = 9.0;
const PEARL_MODEL_PATH = "/models/pearl.glb";
/** Plan d’eau y=0 — perles à l’équilibre à la surface */
const PEARL_SURFACE_Y = 0;
/** Décalage vertical initial : centre de la sphère pour ~moitié immergée (rayon ≈ size) */
function pearlHalfSubmergedY(size) {
  return -size * 0.5;
}
/** Plus bas que le 50/50 surface : perles un peu plus immergées au repos */
const PEARL_REST_EXTRA_DEPTH = 0.045;
/** Lissage max par frame vers la cible scroll (évite les sauts si scroll brutal) */
const PEARL_EMERGE_MAX_STEP = 0.012;
/** Bien cachées sous l’eau au début de la scène 2 */
const PEARL_HIDDEN_EXTRA_DEPTH = 0.14;
const PEARL_COUNT = 9;

/** Rotation Y ajoutée pendant la descente (scroll) — ~1 tour */
const DESCENT_SPIN_Y = Math.PI * 2;
/** Petit extra de rotation pendant la ré-émergence */
const EMERGENCE_SPIN_Y = Math.PI * 0.25;

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 9 perles, positions pseudo-aléatoires (seed fixe).
 * z est ajouté à bagGroup.position.z (-1.2). Écart minimum entre perles + exclusion du sac.
 */
function buildPearlLayout() {
  const rnd = createRandom(7421);
  const layout = [];
  const minDist = 0.48;
  const bagExcl = 0.92;
  for (let i = 0; i < PEARL_COUNT; i++) {
    let x = 0;
    let zz = 0;
    let ok = false;
    for (let attempt = 0; attempt < 220; attempt++) {
      x = -3.25 + rnd() * 6.5;
      zz = -1.05 + rnd() * 3.55;
      if (Math.hypot(x, zz + 0.35) <= bagExcl) continue;
      ok = layout.every((p) => Math.hypot(p.x - x, p.z - zz) > minDist);
      if (ok) break;
    }
    layout.push({
      x,
      z: zz,
      size: 0.03 + rnd() * 0.028,
      delay: 0.015 + i * 0.014 + rnd() * 0.02,
    });
  }
  return layout;
}

const PEARL_LAYOUT = buildPearlLayout();

/**
 * Points en espace local du bagGroup (origine ≈ centre du modèle).
 * Ajustables si le mesh GLB change.
 */
const BAG_HOTSPOTS = [
  {
    title: "Anse & structure",
    body: "Structure légère et renforcée pour une portée confortable au quotidien.",
    local: { x: 0, y: 0.44, z: 0.14 },
  },
  {
    title: "Façade avant",
    body: "Accès rapide aux essentiels et volumes pensés pour la modularité.",
    local: { x: 0.22, y: 0.06, z: 0.2 },
  },
  {
    title: "Panneau latéral",
    body: "Zone de personnalisation et détails techniques du programme Hybrid.",
    local: { x: -0.26, y: 0.02, z: 0.16 },
  },
  {
    title: "Base & finitions",
    body: "Stabilité au posé et protection des contenus par une base soignée.",
    local: { x: 0, y: -0.28, z: 0.14 },
  },
];

function smoothStep(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Elastic spring overshoot — effet "myrtille qui sort de la crème" */
function elasticOut(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c4 = (2 * Math.PI) / 3.2;
  return Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function createSkyGradientTexture() {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "#161d6a");
  gradient.addColorStop(0.22, "#232d85");
  gradient.addColorStop(0.38, "#33419a");
  gradient.addColorStop(0.44, "#505eb5");
  gradient.addColorStop(0.48, "#9e8b8a");
  gradient.addColorStop(0.5, "#c9a9a0");
  gradient.addColorStop(0.505, "#d0ccd8");
  gradient.addColorStop(0.51, "#d5d3de");
  gradient.addColorStop(0.52, "#d5d3de");
  gradient.addColorStop(0.56, "#c8cada");
  gradient.addColorStop(0.62, "#a8b4c8");
  gradient.addColorStop(0.72, "#5a7aad");
  gradient.addColorStop(0.84, "#1a4580");
  gradient.addColorStop(1, "#04182e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

export default function Scene3D() {
  const containerRef = useRef(null);
  const hotspotRefs = useRef([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ─── Renderer ─────────────────────────────────────────────────────────
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

    // ─── Scene & Camera ───────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.05,
      20000,
    );
    camera.position.set(0, 0.28, 2.35);
    camera.lookAt(0, 0.52, -1.85);

    // ─── Post-processing (Bloom) ──────────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.18,
      0.35,
      0.88,
    );
    composer.addPass(bloomPass);

    // ─── Drag-to-rotate (sac uniquement, caméra fixe) ──────────────────────
    const drag = { active: false, prevX: 0, velocityY: 0, productPhase: false };
    const worldHotspot = new THREE.Vector3();
    const localHotspot = new THREE.Vector3();
    const toPointVec = new THREE.Vector3();
    const camDir = new THREE.Vector3();

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

    // ─── Sky ──────────────────────────────────────────────────────────────
    scene.background = createSkyGradientTexture();

    // Pas de fog global — le fondu horizon est géré dans le shader eau

    // ─── HDRI environment ─────────────────────────────────────────────────
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new RGBELoader().load(
      HDRI_PATH,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = pmremGenerator.fromEquirectangular(texture).texture;
        scene.environmentIntensity = 0.45;
      },
      undefined,
      () => console.warn("HDRI non chargé — reflets réduits."),
    );

    // ─── Eau ──────────────────────────────────────────────────────────────
    const sun = new THREE.Vector3();
    const phi = THREE.MathUtils.degToRad(90 - SUN_ELEVATION);
    const theta = THREE.MathUtils.degToRad(SUN_AZIMUTH);
    sun.setFromSphericalCoords(1, phi, theta);

    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    const water = new Water(waterGeometry, {
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

    loadWaterNormals((texture) => {
      water.material.uniforms["normalSampler"].value = texture;
    });

    // ─── Lumières ─────────────────────────────────────────────────────────
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

    // ─── Sac GLB ──────────────────────────────────────────────────────────
    const bagGroup = new THREE.Group();
    bagGroup.position.z = -1.2;
    scene.add(bagGroup);

    const bagAnim = {
      yTop: 2.8,
      yBottom: -1.8,
      ySurface: 0.05,
      yHover: 0.14,
      loaded: false,
    };

    const pearlGroup = new THREE.Group();
    pearlGroup.renderOrder = 2;
    scene.add(pearlGroup);

    const pearlGeometry = new THREE.SphereGeometry(1, 40, 40);
    const pearlMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf8f1ea,
      roughness: 0.12,
      metalness: 0.02,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      reflectivity: 0.9,
      envMapIntensity: 1.5,
    });
    let pearlPrototype = null;

    const random = createRandom(1229);
    const pearlData = PEARL_LAYOUT.map((layout) => {
      const size = layout.size;
      const mesh = new THREE.Mesh(pearlGeometry, pearlMaterial);
      mesh.scale.setScalar(size);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      pearlGroup.add(mesh);

      return {
        node: mesh,
        size,
        baseX: layout.x,
        baseZ: bagGroup.position.z + layout.z,
        driftPhase: random() * Math.PI * 2,
        surfaceOffset: (random() - 0.5) * 0.002,
      };
    });

    function createPearlClone(size) {
      if (!pearlPrototype) {
        const mesh = new THREE.Mesh(pearlGeometry, pearlMaterial);
        mesh.scale.setScalar(size);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        return mesh;
      }

      const clone = pearlPrototype.clone(true);
      clone.scale.setScalar(size * 1.2);
      clone.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });
      return clone;
    }

    new GLTFLoader().load(
      PEARL_MODEL_PATH,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        model.scale.setScalar(1 / maxDim);
        model.position.set(
          -center.x / maxDim,
          -center.y / maxDim,
          -center.z / maxDim,
        );
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
          }
        });
        pearlPrototype = model;

        for (const pearl of pearlData) {
          pearlGroup.remove(pearl.node);
          pearl.node = createPearlClone(pearl.size);
          pearlGroup.add(pearl.node);
        }
      },
      undefined,
      () =>
        console.warn(
          "pearl.glb introuvable dans public/models — fallback sur sphères.",
        ),
    );

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
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = false;
          }
        });
        bagGroup.add(model);

        const h = size.y * s;
        bagAnim.yTop = Math.max(2.8, h * 2.5);
        bagAnim.yBottom = -(h + 0.5);
        bagAnim.ySurface = 0.05;
        bagAnim.yHover = Math.max(0.1, bagAnim.ySurface + 0.12);
        bagAnim.loaded = true;
        bagGroup.rotation.y = BAG_FRONT_ROTATION_Y;
      },
      undefined,
      (err) => console.error("Erreur chargement GLB :", err),
    );

    // ─── Boucle d'animation ───────────────────────────────────────────────
    const timer = new THREE.Timer();
    let animationId;
    let wasProduct = false;
    /** Suit le scroll avec inertie pour éviter le « pop » si le scroll saute */
    let pearlEmergeSmooth = 0;
    let pearlMaterialsReset = false;

    function animate() {
      animationId = requestAnimationFrame(animate);
      timer.update(performance.now());
      water.material.uniforms["time"].value = timer.getElapsed() * 0.25;

      if (bagAnim.loaded) {
        const vh = window.innerHeight;
        const y = window.scrollY;
        const elapsed = timer.getElapsed();

        if (y <= AUTO_DESCENT_SCROLL_END * vh) {
          const p = y / (AUTO_DESCENT_SCROLL_END * vh);
          const e = smoothStep(0, 1, p);
          bagGroup.position.y = THREE.MathUtils.lerp(
            bagAnim.yTop,
            bagAnim.yHover,
            e,
          );
          bagGroup.rotation.y = BAG_FRONT_ROTATION_Y;
        } else if (y <= DESCENT_END * vh) {
          const p =
            (y - AUTO_DESCENT_SCROLL_END * vh) /
            ((DESCENT_END - AUTO_DESCENT_SCROLL_END) * vh);
          bagGroup.position.y = THREE.MathUtils.lerp(
            bagAnim.yHover,
            bagAnim.yBottom,
            p,
          );
          bagGroup.rotation.y = BAG_FRONT_ROTATION_Y + p * DESCENT_SPIN_Y;
        } else if (y <= EMERGENCE_START * vh) {
          bagGroup.position.y = bagAnim.yBottom;
          bagGroup.rotation.y = BAG_FRONT_ROTATION_Y + DESCENT_SPIN_Y;
        } else if (y <= EMERGENCE_END * vh) {
          const p =
            (y - EMERGENCE_START * vh) /
            ((EMERGENCE_END - EMERGENCE_START) * vh);
          bagGroup.position.y = THREE.MathUtils.lerp(
            bagAnim.yBottom,
            bagAnim.ySurface,
            p,
          );
          bagGroup.rotation.y =
            BAG_FRONT_ROTATION_Y + DESCENT_SPIN_Y + p * EMERGENCE_SPIN_Y;
        } else {
          const floatAmplitude = 0.06;
          const floatSpeed = 1.2;
          bagGroup.position.y =
            bagAnim.ySurface +
            Math.sin(performance.now() * 0.001 * floatSpeed) * floatAmplitude;
        }

        const isProduct = y >= EMERGENCE_END * vh;
        if (isProduct !== wasProduct) {
          container.style.pointerEvents = isProduct ? "auto" : "none";
          drag.productPhase = isProduct;
          wasProduct = isProduct;
        }

        bagGroup.updateMatrixWorld(true);
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.getWorldDirection(camDir);

        BAG_HOTSPOTS.forEach((spot, i) => {
          const el = hotspotRefs.current[i];
          if (!el) return;

          if (!isProduct || !bagAnim.loaded) {
            el.style.opacity = "0";
            el.style.visibility = "hidden";
            el.style.pointerEvents = "none";
            el.setAttribute("aria-hidden", "true");
            return;
          }

          localHotspot.set(spot.local.x, spot.local.y, spot.local.z);
          worldHotspot.copy(localHotspot).applyMatrix4(bagGroup.matrixWorld);

          toPointVec.copy(worldHotspot).sub(camera.position);
          const inFront = toPointVec.dot(camDir) > 0.02;
          if (!inFront) {
            el.style.opacity = "0";
            el.style.visibility = "hidden";
            el.style.pointerEvents = "none";
            el.setAttribute("aria-hidden", "true");
            return;
          }

          worldHotspot.copy(localHotspot).applyMatrix4(bagGroup.matrixWorld);
          worldHotspot.project(camera);

          const onScreen =
            worldHotspot.z > -1 &&
            worldHotspot.z < 1 &&
            Math.abs(worldHotspot.x) < 1.15 &&
            Math.abs(worldHotspot.y) < 1.15;

          if (!onScreen) {
            el.style.opacity = "0";
            el.style.visibility = "hidden";
            el.style.pointerEvents = "none";
            el.setAttribute("aria-hidden", "true");
            return;
          }

          const px = (worldHotspot.x * 0.5 + 0.5) * w;
          const py = (-worldHotspot.y * 0.5 + 0.5) * h;

          el.style.left = `${px}px`;
          el.style.top = `${py}px`;
          el.style.opacity = "1";
          el.style.visibility = "visible";
          el.style.pointerEvents = "auto";
          el.setAttribute("aria-hidden", "false");
        });

        // Inertie : le sac continue de tourner doucement après le drag
        if (
          drag.productPhase &&
          !drag.active &&
          Math.abs(drag.velocityY) > 0.0001
        ) {
          bagGroup.rotation.y += drag.velocityY;
          drag.velocityY *= 0.95;
        }

        // Perles: pas en scene 1; scene 2 = cachees sous l’eau puis montent avec le scroll
        const inScene2 = y >= EMERGENCE_START * vh;

        if (!inScene2) {
          pearlGroup.visible = false;
          pearlEmergeSmooth = 0;
          pearlMaterialsReset = false;
        } else {
          pearlGroup.visible = true;

          const emergeTarget = THREE.MathUtils.clamp(
            (y - EMERGENCE_START * vh) /
              ((EMERGENCE_END - EMERGENCE_START) * vh),
            0,
            1,
          );
          if (emergeTarget > pearlEmergeSmooth) {
            pearlEmergeSmooth = Math.min(
              pearlEmergeSmooth + PEARL_EMERGE_MAX_STEP,
              emergeTarget,
            );
          } else {
            pearlEmergeSmooth = emergeTarget;
          }

          const t = pearlEmergeSmooth;

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
            const driftX = Math.sin(elapsed * 0.5 + pearl.driftPhase) * 0.012;
            const driftZ = Math.cos(elapsed * 0.4 + pearl.driftPhase) * 0.008;

            const yDeep =
              pearlHalfSubmergedY(pearl.size) - PEARL_HIDDEN_EXTRA_DEPTH;
            const yFloat =
              -pearl.size * 0.5 -
              PEARL_REST_EXTRA_DEPTH +
              pearl.surfaceOffset +
              bobY;
            const currentY = THREE.MathUtils.lerp(yDeep, yFloat, t);

            pearl.node.position.set(
              pearl.baseX + driftX,
              currentY,
              pearl.baseZ + driftZ,
            );
            pearl.node.rotation.y = elapsed * 0.4;
          }
          pearlMaterialsReset = true;
        }
      }

      composer.render();
    }
    animate();

    // ─── Resize ───────────────────────────────────────────────────────────
    function onResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
    }
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationId);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerUp);
      pmremGenerator.dispose();
      pearlGeometry.dispose();
      pearlMaterial.dispose();
      composer.dispose();
      renderer.dispose();
      if (container && renderer.domElement)
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
