import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import MenuOverlay from "../components/MenuOverlay";
import SoundButton from "../components/SoundButton";
import { homeBagLink } from "../utils/homeNav";
import { revealClass, useScrollReveal } from "../utils/useScrollReveal";
import { cloneGltfScene, preloadGltf } from "../utils/gltfCache";
import { applyHdrEnvironment } from "../utils/hdrEnvironment";
import "./Materials.css";

const HDRI_PATH = new URL(
  "../map/hdri/table_mountain_1_puresky_2k.hdr",
  import.meta.url,
).href;

const BAG_MODEL_PATH = "/models/finalbag.glb";
const FILAMENT_MODEL_PATH = "/models/filament.glb";
const INNERBAG_MODEL_PATH = "/models/innerbag.glb";
const TEXTIEL_MODEL_PATH = "/models/textiel.glb";
const FLOWERS_MODEL_PATH = "/models/flowers.glb";
const MATERIAL_VIEWER_TARGET = 1.58;
/** GLB + maquettes matière dans le viewer */
const MATERIAL_GLB_VIEWER_TARGET = 1.88;
const MATERIAL_FLOWERS_VIEWER_TARGET = 1.28;
/** Même orientation que BagScene : face caméra (évite l’effet « de dos »). */
const BAG_FRONT_ROTATION_Y = -Math.PI / 2;

function getViewerLayout(viewWidth, viewHeight) {
  const aspect = viewWidth / viewHeight;
  const narrow = 1 - THREE.MathUtils.smoothstep(aspect, 0.58, 0.92);
  return {
    cameraZ: THREE.MathUtils.lerp(3.28, 3.52, narrow),
    fov: THREE.MathUtils.lerp(38, 41, narrow),
    bagTarget: THREE.MathUtils.lerp(1.52, 1.38, narrow),
  };
}

function centerGroupAtOrigin(group) {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());

  if (group.parent) {
    group.parent.updateMatrixWorld(true);
    group.position.sub(group.parent.worldToLocal(center));
  } else {
    group.position.sub(center);
  }
}

/** Index matière → GLB (4 couches du sac) */
const MATERIAL_GLB = {
  0: FILAMENT_MODEL_PATH,
  1: INNERBAG_MODEL_PATH,
  2: TEXTIEL_MODEL_PATH,
  3: FLOWERS_MODEL_PATH,
};

/** Rotation initiale par matière (textiel exporté à plat → dressé face caméra) */
const MATERIAL_MODEL_ROTATION = {
  2: { x: -Math.PI / 2, y: Math.PI, z: 0 },
};

const MATERIALS = [
  {
    id: "oyster-filament",
    num: "01",
    name: "Oyster shell PLA",
    role: "3D-printed structure",
    description:
      "The outer structure takes its shape from ocean corals: an open, organic lattice 3D-printed in oyster-shell filament. The material has a natural, pleasant feel and forms the rigid frame of the bag without virgin plastic.",
    specs: [
      { label: "Inspiration", value: "Ocean corals" },
      { label: "Filament", value: "Oyster shell PLA" },
      { label: "Texture", value: "Organic, soft touch" },
      { label: "Process", value: "FDM 3D printing" },
    ],
    accent: "#d4c4a0",
  },
  {
    id: "bioplastic-lining",
    num: "02",
    name: "Red cabbage bioplastic",
    role: "Inner bag",
    description:
      "The inner bag is made from red cabbage bioplastic: solid, translucent, and plant-based. I sewed it on my sewing machine, a simple, sturdy lining that holds the bag together efficiently.",
    specs: [
      { label: "Source", value: "Red cabbage" },
      { label: "Type", value: "Bioplastic" },
      { label: "Finish", value: "Solid, translucent" },
      { label: "Made", value: "Sewn on sewing machine" },
    ],
    accent: "#7a3a8a",
  },
  {
    id: "recycled-fabric",
    num: "03",
    name: "Recycled textiles",
    role: "Woven trims",
    description:
      "The fabric trims come from textile I recovered at R-use Fabric in Ixelles: offcuts and reclaimed yardage given a second life on the bag as woven surface details.",
    specs: [
      { label: "Source", value: "R-use Fabric, Ixelles" },
      { label: "Recovered", value: "Shop offcuts" },
      { label: "Finish", value: "Hand-applied" },
      { label: "Care", value: "Spot clean" },
    ],
    accent: "#8a5c38",
  },
  {
    id: "flower-biomaterial",
    num: "04",
    name: "Handmade flowers",
    role: "Biomaterial florals",
    description:
      "The flowers on the bag were made by hand, built from recycled textile offcuts and several red cabbage bioplastics, each cast with a slightly different tone. A few pearls were salvaged from an old broken necklace and sewn into the centres.",
    specs: [
      { label: "Textile", value: "Recycled offcuts" },
      { label: "Bioplastic", value: "Red cabbage (varied casts)" },
      { label: "Pearls", value: "From a broken necklace" },
      { label: "Made", value: "By hand" },
    ],
    accent: "#e8a8c4",
  },
];

const MAT_HERO_REVEAL_KEYS = ["intro-eyebrow", "intro-title", "intro-lead"];

function setGroupOpacity(group, opacity) {
  group.traverse((child) => {
    if ((child.isMesh || child.isLine) && child.material) {
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const m of mats) {
        if (m && "opacity" in m) {
          m.transparent = opacity < 1;
          m.opacity = opacity;
        }
      }
    }
  });
}

function prepareMeshForViewer(root) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });
}

function fitModelInViewer(model, targetSize = MATERIAL_VIEWER_TARGET) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const s = targetSize / maxDim;
  model.scale.setScalar(s);
  model.position.set(-center.x * s, -center.y * s, -center.z * s);
  prepareMeshForViewer(model);
  return model;
}

function createMaterialRoot() {
  const g = new THREE.Group();
  g.visible = false;
  setGroupOpacity(g, 0);
  return g;
}

/** Viewer central : sac (aucune sélection) ou maquette matière + clic pour détail */
function MaterialsViewer({ focusMaterial, onOpenDetail, onBagReady }) {
  const mountRef = useRef(null);
  const focusRef = useRef(focusMaterial);
  const onOpenDetailRef = useRef(onOpenDetail);
  const onBagReadyRef = useRef(onBagReady);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    focusRef.current = focusMaterial;
  }, [focusMaterial]);
  useEffect(() => {
    onOpenDetailRef.current = onOpenDetail;
  }, [onOpenDetail]);
  useEffect(() => {
    onBagReadyRef.current = onBagReady;
  }, [onBagReady]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      38,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );

    function updateCameraLayout() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const layout = getViewerLayout(w, h);
      camera.aspect = w / h;
      camera.fov = layout.fov;
      camera.position.set(0, 0, layout.cameraZ);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      return layout;
    }

    updateCameraLayout();

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    void applyHdrEnvironment(scene, pmrem, HDRI_PATH).catch((err) => {
      console.error("HDRI load:", err);
    });

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(3, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xb8a0c8, 0.35);
    fill.position.set(-3, 2, 2);
    scene.add(fill);

    const spin = new THREE.Group();
    scene.add(spin);

    const bagWrapper = new THREE.Group();
    bagWrapper.visible = true;
    bagWrapper.rotation.y = BAG_FRONT_ROTATION_Y;
    spin.add(bagWrapper);

    let viewerLayout = getViewerLayout(
      container.clientWidth,
      container.clientHeight,
    );

    const materialRoots = [0, 1, 2, 3].map(() => {
      const g = createMaterialRoot();
      spin.add(g);
      return g;
    });

    let cancelled = false;

    function attachMaterialModel(index, gltf) {
      const root = materialRoots[index];
      root.clear();
      const orient = new THREE.Group();
      orient.add(cloneGltfScene(gltf));
      const rot = MATERIAL_MODEL_ROTATION[index];
      if (rot) orient.rotation.set(rot.x ?? 0, rot.y ?? 0, rot.z ?? 0);
      root.add(
        fitModelInViewer(
          orient,
          index === 3
            ? MATERIAL_FLOWERS_VIEWER_TARGET
            : MATERIAL_GLB_VIEWER_TARGET,
        ),
      );
      centerGroupAtOrigin(root);
      if (focusRef.current === index) {
        setGroupOpacity(root, 1);
        root.visible = true;
      }
    }

    void preloadGltf(BAG_MODEL_PATH)
      .then((gltf) => {
        if (cancelled) return;
        bagWrapper.add(
          fitModelInViewer(
            cloneGltfScene(gltf),
            viewerLayout.bagTarget,
          ),
        );
        centerGroupAtOrigin(bagWrapper);
        setLoading(false);
        onBagReadyRef.current?.();

        const stagger = window.matchMedia("(max-width: 820px)").matches
          ? 180
          : 0;

        for (const [index, path] of Object.entries(MATERIAL_GLB)) {
          const i = Number(index);
          window.setTimeout(() => {
            if (cancelled) return;
            preloadGltf(path)
              .then((materialGltf) => {
                if (cancelled) return;
                attachMaterialModel(i, materialGltf);
              })
              .catch((err) => console.error(`GLB ${path}:`, err));
          }, stagger * i);
        }
      })
      .catch((err) => {
        console.error("finalbag.glb:", err);
        if (!cancelled) setLoading(false);
      });

    const matOpacities = [0, 0, 0, 0];
    let bagOpacity = 1;
    let prevFocus = focusRef.current;

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let pointerDown = false;
    let prevX = 0;
    let prevY = 0;
    let velY = 0;
    let velX = 0;

    const DRAG_THRESH = 6;

    let lastCX = 0;
    let lastCY = 0;

    const onDown = (e) => {
      pointerDown = true;
      isDragging = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      prevX = e.clientX;
      prevY = e.clientY;
      velY = 0;
      velX = 0;
      lastCX = e.clientX;
      lastCY = e.clientY;
    };
    const onPointerMove = (e) => {
      lastCX = e.clientX;
      lastCY = e.clientY;
      if (!pointerDown) return;

      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (
        !isDragging &&
        (Math.abs(dx) > DRAG_THRESH || Math.abs(dy) > DRAG_THRESH)
      ) {
        isDragging = true;
        renderer.domElement.classList.add("is-grabbing");
      }
      if (isDragging) {
        velY = (e.clientX - prevX) * 0.01;
        velX = (e.clientY - prevY) * 0.01;
        prevX = e.clientX;
        prevY = e.clientY;
      }
    };

    const onPointerLeave = () => {
      renderer.domElement.classList.remove("is-grabbing");
      if (pointerDown) finishPointerUp(lastCX, lastCY);
    };

    const finishPointerUp = (clientX, clientY) => {
      if (!pointerDown) return;
      const wasDragging = isDragging;
      pointerDown = false;

      const rect = renderer.domElement.getBoundingClientRect();
      const fx = focusRef.current;

      if (!wasDragging && fx !== null && materialRoots[fx]) {
        ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObject(materialRoots[fx], true);
        if (hits.length > 0) {
          onOpenDetailRef.current?.(fx);
        }
      }
      isDragging = false;
      renderer.domElement.classList.remove("is-grabbing");
    };

    const onUp = (e) => finishPointerUp(e.clientX, e.clientY);

    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    const onResize = () => {
      viewerLayout = updateCameraLayout();
    };
    window.addEventListener("resize", onResize);

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (!isDragging) {
        velY *= 0.92;
        velX *= 0.92;
      }

      const f = focusRef.current;
      const showBag = f === null;

      if (showBag) {
        bagOpacity += (1 - bagOpacity) * 0.09;
        bagWrapper.visible = bagOpacity > 0.01;
      } else {
        bagOpacity = 0;
        bagWrapper.visible = false;
      }

      if (bagWrapper.visible) {
        bagWrapper.traverse((child) => {
          if ((child.isMesh || child.isLine) && child.material) {
            const mats = Array.isArray(child.material)
              ? child.material
              : [child.material];
            for (const m of mats) {
              if (m && "opacity" in m) {
                m.transparent = bagOpacity < 1;
                m.opacity = bagOpacity;
              }
            }
          }
        });
      }

      if (f !== prevFocus) {
        if (f !== null && prevFocus !== null) {
          for (let i = 0; i < 4; i++) {
            if (i !== f) {
              matOpacities[i] = 0;
              materialRoots[i].visible = false;
              setGroupOpacity(materialRoots[i], 0);
            }
          }
        }
        prevFocus = f;
      }

      for (let i = 0; i < 4; i++) {
        const target = f === i ? 1 : 0;
        const rate = target === 1 ? 0.2 : f === null ? 0.14 : 0.55;
        matOpacities[i] += (target - matOpacities[i]) * rate;
        setGroupOpacity(materialRoots[i], matOpacities[i]);
        materialRoots[i].visible = matOpacities[i] > 0.02;
      }

      const idleSpin = isDragging ? 0 : f === null ? 0.0022 : 0.0028;
      const spinY = (f === null ? velY * 0.85 : velY * 0.9) + idleSpin;
      const spinX = f === null ? velX * 0.85 : velX * 0.9;
      spin.rotation.y += spinY;
      spin.rotation.x += spinX;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      materialRoots.forEach((g) => {
        g.traverse((child) => {
          if (child.isMesh || child.isLine) {
            child.geometry?.dispose();
            const mats = Array.isArray(child.material)
              ? child.material
              : [child.material];
            mats.forEach((m) => m?.dispose?.());
          }
        });
      });
      bagWrapper.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];
          mats.forEach((m) => m?.dispose?.());
        }
      });
      pmrem.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="mat-viewer-canvas-wrap">
      {loading && (
        <div className="mat-viewer-loading" aria-live="polite">
          <span className="mat-viewer-loading__ring" aria-hidden />
          <span className="mat-viewer-loading__label">Loading 3D model…</span>
        </div>
      )}
      <div ref={mountRef} className="mat-viewer-canvas" />
    </div>
  );
}

function MaterialDetailModal({ material, open, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => closeRef.current?.focus(), 50);
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !material) return null;

  return (
    <div className="mat-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="mat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mat-modal-sheet-label mat-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{ "--accent": material.accent }}
      >
        <header className="mat-modal__head">
          <span className="mat-modal__sheet-label" id="mat-modal-sheet-label">
            Material sheet
          </span>
          <button
            ref={closeRef}
            type="button"
            className="mat-modal-close"
            aria-label="Close sheet"
            onClick={onClose}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <div className="mat-modal__body">
          <span
            className="mat-modal-num"
            aria-describedby="mat-modal-sheet-label"
          >
            {material.num}
          </span>
          <h2 id="mat-modal-title" className="mat-modal-title">
            {material.name}
          </h2>
          <p className="mat-modal-role">{material.role}</p>
          <p className="mat-modal-desc">{material.description}</p>
          <dl className="mat-modal-specs">
            {material.specs.map((s) => (
              <div key={s.label} className="mat-modal-spec">
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

export default function Materials() {
  /** null = vue sac (accueil viewer) ; 0..3 = uniquement la maquette matière — le sac est entièrement masqué */
  const [focusMaterial, setFocusMaterial] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailIndex, setDetailIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuOverlayRef = useRef(null);
  const mainRef = useRef(null);
  const revealed = useScrollReveal(mainRef, {
    heroKeys: MAT_HERO_REVEAL_KEYS,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    preloadGltf(BAG_MODEL_PATH);
  }, []);

  const openDetail = useCallback((idx) => {
    setDetailIndex(idx);
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => setDetailOpen(false), []);

  const leftOrbs = MATERIALS.slice(0, 2);
  const rightOrbs = MATERIALS.slice(2, 4);

  return (
    <div
      className="mat-page"
      style={{
        "--accent":
          focusMaterial != null ? MATERIALS[focusMaterial].accent : "#c9a0b8",
      }}
    >
      <header
        className={`top-nav top-nav--visible${menuOpen ? " top-nav--menu-open" : ""}`}
      >
        <Link
          to={homeBagLink.pathname}
          state={homeBagLink.state}
          className="brand-mark"
          aria-label="Hybrid home"
        >
          Hybrid
        </Link>
        <div className="nav-actions">
          <SoundButton />

          <button
            type="button"
            className={`menu-button ${menuOpen ? "menu-button--open" : ""}`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => {
              if (menuOpen) menuOverlayRef.current?.requestClose?.();
              else setMenuOpen(true);
            }}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <main ref={mainRef} className="mat-main">
        <header className="mat-intro">
          <p
            data-reveal="intro-eyebrow"
            className={revealClass(
              "intro-eyebrow",
              revealed,
              "mat-reveal",
              "mat-intro__eyebrow",
            )}
          >
            Hybrid bag
          </p>
          <h1
            data-reveal="intro-title"
            className={revealClass(
              "intro-title",
              revealed,
              "mat-reveal",
              "mat-intro__title",
              "mat-reveal--d1",
            )}
          >
            How it&apos;s made
          </h1>
          <p
            data-reveal="intro-lead"
            className={revealClass(
              "intro-lead",
              revealed,
              "mat-reveal",
              "mat-lead",
              "mat-reveal--d2",
            )}
          >
            Oyster-shell structure, red-cabbage inner bag, recycled textiles and
            flower bioplastics. Pick a layer to explore it in 3D.
          </p>
        </header>

        <section
          aria-label="Material selector"
          data-reveal="stage"
          className={revealClass("stage", revealed, "mat-reveal", "mat-stage", "mat-reveal--d1")}
        >
          <div className="mat-orb-col mat-orb-col--left">
            {leftOrbs.map((m, i) => {
              const idx = i;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`mat-orb ${focusMaterial === idx ? "is-active" : ""}`}
                  style={{ "--orb": m.accent }}
                  onClick={() =>
                    setFocusMaterial((prev) => (prev === idx ? null : idx))
                  }
                  aria-pressed={focusMaterial === idx}
                >
                  <span className="mat-orb__inner" />
                  <span className="mat-orb__label">{m.num}</span>
                  <span className="mat-orb__name">{m.name}</span>
                </button>
              );
            })}
          </div>

          <div
            className={`mat-viewer-wrap${focusMaterial != null ? " mat-viewer-wrap--detail" : ""}`}
          >
            <div className="mat-viewer-glow" aria-hidden />
            <MaterialsViewer
              focusMaterial={focusMaterial}
              onOpenDetail={openDetail}
            />
            {focusMaterial != null && (
              <div className="mat-viewer-click-badge" role="status">
                <svg
                  className="mat-viewer-click-badge__icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M15 15l-2 5L9 9l11 4-5 2z" />
                  <path d="M9 9V6a3 3 0 016 0v3" opacity="0.55" />
                </svg>
                <span>Click the 3D shape for the full material sheet</span>
              </div>
            )}
            <p
              className={`mat-viewer-hint${focusMaterial != null ? " mat-viewer-hint--detail" : ""}`}
            >
              {focusMaterial == null
                ? "Drag to rotate the bag in 3D, or pick a material on the sides"
                : "Drag to rotate · tap the shape for the full sheet"}
            </p>
            {focusMaterial != null && (
              <button
                type="button"
                className="mat-reset-bag"
                onClick={() => setFocusMaterial(null)}
              >
                Back to bag view
              </button>
            )}
          </div>

          <div className="mat-orb-col mat-orb-col--right">
            {rightOrbs.map((m, i) => {
              const idx = i + 2;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`mat-orb ${focusMaterial === idx ? "is-active" : ""}`}
                  style={{ "--orb": m.accent }}
                  onClick={() =>
                    setFocusMaterial((prev) => (prev === idx ? null : idx))
                  }
                  aria-pressed={focusMaterial === idx}
                >
                  <span className="mat-orb__inner" />
                  <span className="mat-orb__label">{m.num}</span>
                  <span className="mat-orb__name">{m.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mat-showcase" aria-label="Material details">
          <header className="mat-section-head">
            <p
              data-reveal="showcase-eyebrow"
              className={revealClass(
                "showcase-eyebrow",
                revealed,
                "mat-reveal",
                "mat-section-eyebrow",
              )}
            >
              Up close
            </p>
            <h2
              data-reveal="showcase-title"
              className={revealClass(
                "showcase-title",
                revealed,
                "mat-reveal",
                "mat-section-title",
                "mat-reveal--d1",
              )}
            >
              Each material, in detail
            </h2>
          </header>

          <div className="mat-showcase__grid">
            {MATERIALS.map((m, i) => (
              <article
                key={m.id}
                data-reveal={`showcase-${m.id}`}
                className={revealClass(
                  `showcase-${m.id}`,
                  revealed,
                  "mat-reveal",
                  `mat-showcase__card${i % 2 === 1 ? " mat-showcase__card--flip" : ""}`,
                  i % 2 === 0 ? "mat-reveal--d1" : "mat-reveal--d2",
                )}
                style={{ "--accent": m.accent }}
              >
                <figure className="mat-showcase__media">
                  <img
                    src={`/materials/${m.id}.jpg`}
                    alt={`${m.name}, ${m.role}`}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="mat-showcase__media-tag">{m.num}</span>
                </figure>
                <div className="mat-showcase__text">
                  <p className="mat-showcase__role">{m.role}</p>
                  <h3 className="mat-showcase__name">{m.name}</h3>
                  <p className="mat-showcase__desc">{m.description}</p>
                  <button
                    type="button"
                    className="mat-showcase__cta"
                    onClick={() => openDetail(i)}
                  >
                    Open material sheet
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M3 8h10M8 3l5 5-5 5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mat-final" aria-label="The final piece">
          <div
            data-reveal="final"
            className={revealClass(
              "final",
              revealed,
              "mat-reveal",
              "mat-final__inner",
            )}
          >
            <div className="mat-final__media">
              <img
                src="/materials/bag-final.png"
                alt="Hybrid bag with 3D-printed lattice shell, fabric flowers and pearl trims"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="mat-final__text">
              <p className="mat-section-eyebrow">The result</p>
              <h2 className="mat-section-title">Structure, lining & florals</h2>
              <p className="mat-section-lead">
                The shell is inspired by ocean corals, 3D-printed in oyster
                filament with an open organic lattice, light and pleasant to the
                touch, pierced so the translucent inner bag shows through. The
                lining is red cabbage bioplastic, sewn on a sewing machine.
                Handmade flowers, recycled textile, varied red cabbage
                bioplastics and pearls from a broken necklace, sit on the shell
                alongside other reclaimed trims.
              </p>
            </div>
          </div>
        </section>

        <footer className="mat-footer">
          <p
            data-reveal="footer-eyebrow"
            className={revealClass(
              "footer-eyebrow",
              revealed,
              "mat-reveal",
              "mat-footer__eyebrow",
            )}
          >
            The story
          </p>
          <h2
            data-reveal="footer-title"
            className={revealClass(
              "footer-title",
              revealed,
              "mat-reveal",
              "mat-footer__title",
              "mat-reveal--d1",
            )}
          >
            Meet the maker
          </h2>
          <p
            data-reveal="footer-lead"
            className={revealClass(
              "footer-lead",
              revealed,
              "mat-reveal",
              "mat-footer__lead",
              "mat-reveal--d2",
            )}
          >
            Learn about the Hybrid project, the lab in Brussels, and the
            thinking behind this bag — from food waste to finished object.
          </p>
          <Link to="/about" className="cta-button cta-button--inline visible">
            About
          </Link>
        </footer>
      </main>

      <MaterialDetailModal
        material={MATERIALS[detailIndex]}
        open={detailOpen}
        onClose={closeDetail}
      />

      {menuOpen && (
        <MenuOverlay ref={menuOverlayRef} onClose={() => setMenuOpen(false)} />
      )}
    </div>
  );
}
