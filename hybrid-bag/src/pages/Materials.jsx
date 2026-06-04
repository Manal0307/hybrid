import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import MenuOverlay from "../components/MenuOverlay";
import SoundButton from "../components/SoundButton";
import { homeBagLink } from "../utils/homeNav";
import "./Materials.css";

const HDRI_PATH = new URL(
  "../map/hdri/table_mountain_1_puresky_2k.hdr",
  import.meta.url,
).href;

const BAG_MODEL_PATH = "/models/codebag.glb";
/** Même orientation que BagScene : face caméra (évite l’effet « de dos »). */
const BAG_FRONT_ROTATION_Y = Math.PI;

const MATERIALS = [
  {
    id: "oyster-filament",
    num: "01",
    name: "Oyster shell PLA",
    role: "3D-printed structure",
    description:
      "The bag’s outer shell is 3D-printed from a filament made of crushed oyster shells recovered from coastal waste. Rigid, lightweight, it forms the structural frame of Hybrid without virgin plastic.",
    specs: [
      { label: "Source", value: "Oyster shells" },
      { label: "Process", value: "FDM 3D printing" },
      { label: "Role", value: "Outer structure" },
      { label: "End of life", value: "Circular" },
    ],
    accent: "#d4c4a0",
  },
  {
    id: "bioplastic-lining",
    num: "02",
    name: "Red cabbage bioplastic",
    role: "Inner bag",
    description:
      "The inner pouch is cast from a home-grown bioplastic based on red cabbage extract — soft, plant-based, and biodegradable. It replaces a conventional synthetic liner.",
    specs: [
      { label: "Source", value: "Red cabbage" },
      { label: "Type", value: "Gelatin bioplastic" },
      { label: "Feel", value: "Soft, flexible" },
      { label: "Biodegradable", value: "Yes" },
    ],
    accent: "#7a3a8a",
  },
  {
    id: "recycled-fabric",
    num: "03",
    name: "Recycled textiles",
    role: "Woven trims",
    description:
      "Trims and woven surface details are made from upcycled textile offcuts — reclaimed fabric waste given a second life on the bag.",
    specs: [
      { label: "Origin", value: "Textile waste" },
      { label: "Recycled", value: "100%" },
      { label: "Finish", value: "Hand-applied" },
      { label: "Care", value: "Spot clean" },
    ],
    accent: "#8a5c38",
  },
  {
    id: "flower-biomaterial",
    num: "04",
    name: "Flower bioplastic",
    role: "Biomaterial florals",
    description:
      "Decorative florals are set in a gelatin bioplastic with dried petals — the same family of kitchen-made biomaterials as the inner lining, grown and cast by hand.",
    specs: [
      { label: "Source", value: "Dried flower petals" },
      { label: "Binder", value: "Food gelatin" },
      { label: "Process", value: "Home-cast film" },
      { label: "Biodegradable", value: "Yes" },
    ],
    accent: "#e8a8c4",
  },
];

function setGroupOpacity(group, opacity) {
  group.traverse((child) => {
    if ((child.isMesh || child.isLine) && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (m && "opacity" in m) {
          m.transparent = opacity < 1;
          m.opacity = opacity;
        }
      }
    }
  });
}

function buildOyster() {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xf0e0cc,
    metalness: 0.02,
    roughness: 0.08,
    iridescence: 1.0,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: [100, 400],
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 1,
  });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.62, 64, 64), mat));
  for (let i = 0; i < 12; i++) {
    const base = (i / 12) * Math.PI * 2;
    const pts = [];
    for (let t = 0; t <= 1; t += 0.04) {
      const a = base + t * Math.PI * 3.5;
      const r = 0.72 + t * 0.42;
      pts.push(
        new THREE.Vector3(
          Math.cos(a) * r * 0.4,
          (t - 0.5) * 2.3,
          Math.sin(a) * r * 0.4,
        ),
      );
    }
    const tube = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts),
      30,
      0.012,
      5,
    );
    const m = mat.clone();
    m.transparent = true;
    g.add(new THREE.Mesh(tube, m));
  }
  return g;
}

/** Doublure — film souple violet (chou rouge / bioplastique) */
function buildCabbageLining() {
  const g = new THREE.Group();
  const pouchMat = new THREE.MeshPhysicalMaterial({
    color: 0x6a2878,
    metalness: 0,
    roughness: 0.35,
    transmission: 0.55,
    thickness: 0.65,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
  });
  const pouch = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 48, 48),
    pouchMat,
  );
  pouch.scale.set(1.05, 0.72, 0.88);
  g.add(pouch);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const geo = new THREE.PlaneGeometry(0.42, 1.85, 4, 28);
    const pos = geo.attributes.position;
    for (let j = 0; j < pos.count; j++) {
      const y = pos.getY(j);
      const wobble = Math.sin(y * 3.2 + i) * 0.06;
      pos.setX(j, pos.getX(j) + wobble);
    }
    geo.computeVertexNormals();
    const t = i / 6;
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x4a1848).lerp(new THREE.Color(0xb868c8), t),
      metalness: 0,
      roughness: 0.4,
      transmission: 0.42,
      thickness: 0.35,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
    });
    const sheet = new THREE.Mesh(geo, mat);
    sheet.rotation.y = angle;
    sheet.position.set(Math.sin(angle) * 0.22, 0.05, Math.cos(angle) * 0.22);
    g.add(sheet);
  }
  return g;
}

/** Fleurs — pétales en bioplastique (gelatin + pétales séchés) */
function buildFlowers() {
  const g = new THREE.Group();
  const petalColors = [0xf0c8d8, 0xe8a8c4, 0xf8e0ec, 0xd890b0];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const tilt = 0.35 + (i % 3) * 0.15;
    const geo = new THREE.SphereGeometry(0.38, 20, 16);
    geo.scale(1.15, 0.18, 0.55);
    const mat = new THREE.MeshPhysicalMaterial({
      color: petalColors[i % petalColors.length],
      metalness: 0,
      roughness: 0.45,
      transmission: 0.28,
      thickness: 0.25,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const petal = new THREE.Mesh(geo, mat);
    petal.rotation.set(tilt, angle, Math.sin(angle) * 0.25);
    petal.position.set(
      Math.cos(angle) * 0.55,
      (i % 4) * 0.12 - 0.18,
      Math.sin(angle) * 0.55,
    );
    g.add(petal);
  }
  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 24, 24),
    new THREE.MeshPhysicalMaterial({
      color: 0xfff4e8,
      roughness: 0.5,
      transmission: 0.15,
      transparent: true,
      opacity: 0.95,
    }),
  );
  g.add(center);
  return g;
}

function buildTextile() {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(1.05, 96, 96);
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const nx = nrm.getX(i),
      ny = nrm.getY(i),
      nz = nrm.getZ(i);
    const u = Math.atan2(nz, nx) / (Math.PI * 2) + 0.5;
    const v = Math.acos(Math.max(-1, Math.min(1, ny))) / Math.PI;
    const weave = Math.sin(u * 36) * Math.cos(v * 18) * 0.048;
    pos.setXYZ(
      i,
      pos.getX(i) + nx * weave,
      pos.getY(i) + ny * weave,
      pos.getZ(i) + nz * weave,
    );
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x8a5c38,
    metalness: 0.05,
    roughness: 0.9,
    transparent: true,
    opacity: 1,
  });
  g.add(new THREE.Mesh(geo, mat));
  return g;
}

const BUILDERS = [
  buildOyster,
  buildCabbageLining,
  buildTextile,
  buildFlowers,
];

/** Viewer central : sac (aucune sélection) ou maquette matière + clic pour détail */
function MaterialsViewer({ focusMaterial, onOpenDetail }) {
  const mountRef = useRef(null);
  const focusRef = useRef(focusMaterial);
  const onOpenDetailRef = useRef(onOpenDetail);

  useEffect(() => {
    focusRef.current = focusMaterial;
  }, [focusMaterial]);
  useEffect(() => {
    onOpenDetailRef.current = onOpenDetail;
  }, [onOpenDetail]);

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
      40,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0.06, 3.65);

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    new RGBELoader().load(HDRI_PATH, (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = pmrem.fromEquirectangular(tex).texture;
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
    bagWrapper.position.set(0, -0.07, 0);
    spin.add(bagWrapper);

    const materialRoots = BUILDERS.map((build) => {
      const g = build();
      g.visible = false;
      setGroupOpacity(g, 0);
      spin.add(g);
      return g;
    });

    new GLTFLoader().load(
      BAG_MODEL_PATH,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const s = 1.42 / maxDim;
        model.scale.setScalar(s);
        model.position.set(
          -center.x * s,
          -center.y * s + (size.y * s) * 0.5,
          -center.z * s,
        );
        model.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = false;
            c.receiveShadow = false;
          }
        });
        bagWrapper.add(model);
      },
      undefined,
      () => console.warn("codebag.glb introuvable sur /materials"),
    );

    const matOpacities = [0, 0, 0, 0];
    let bagOpacity = 1;

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let pointerDown = false;
    let prevX = 0;
    let velY = 0;

    const DRAG_THRESH = 6;

    let lastCX = 0;
    let lastCY = 0;

    const onDown = (e) => {
      pointerDown = true;
      isDragging = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      prevX = e.clientX;
      velY = 0;
      lastCX = e.clientX;
      lastCY = e.clientY;
    };
    const onPointerMove = (e) => {
      lastCX = e.clientX;
      lastCY = e.clientY;
      const rect = renderer.domElement.getBoundingClientRect();

      if (pointerDown) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (!isDragging && (Math.abs(dx) > DRAG_THRESH || Math.abs(dy) > DRAG_THRESH)) {
          isDragging = true;
        }
        if (isDragging) {
          renderer.domElement.style.cursor = "grabbing";
          velY = (e.clientX - prevX) * 0.01;
          prevX = e.clientX;
        }
        return;
      }

      const fx = focusRef.current;
      if (fx !== null && materialRoots[fx]?.visible) {
        ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObject(materialRoots[fx], true);
        renderer.domElement.style.cursor =
          hits.length > 0 ? "pointer" : "grab";
      } else if (focusRef.current === null && bagWrapper.visible) {
        renderer.domElement.style.cursor = "grab";
      } else {
        renderer.domElement.style.cursor = "default";
      }
    };

    const onPointerLeave = () => {
      renderer.domElement.style.cursor = "";
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
    };

    const onUp = (e) => finishPointerUp(e.clientX, e.clientY);

    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (!isDragging) velY *= 0.92;

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
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            for (const m of mats) {
              if (m && "opacity" in m) {
                m.transparent = bagOpacity < 1;
                m.opacity = bagOpacity;
              }
            }
          }
        });
      }

      for (let i = 0; i < 4; i++) {
        const target = f === i ? 1 : 0;
        matOpacities[i] += (target - matOpacities[i]) * 0.1;
        setGroupOpacity(materialRoots[i], matOpacities[i]);
        materialRoots[i].visible = matOpacities[i] > 0.02;
      }

      const activeSpin =
        f === null ? velY * 0.85 + 0.0022 : velY + 0.003;
      spin.rotation.y += activeSpin;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
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
          const mats = Array.isArray(child.material) ? child.material : [child.material];
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

  return <div ref={mountRef} className="mat-viewer-canvas" />;
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
    <div
      className="mat-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
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
          <span className="mat-modal-num" aria-describedby="mat-modal-sheet-label">
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

  useEffect(() => {
    window.scrollTo(0, 0);
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
        "--accent": focusMaterial != null ? MATERIALS[focusMaterial].accent : "#c9a0b8",
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

      <main className="mat-main">
        <header className="mat-intro">
          <p className="mat-intro__eyebrow">Hybrid bag</p>
          <h1 className="mat-intro__title">How it&apos;s made</h1>
          <p className="mat-lead">
            Oyster-shell structure, red-cabbage inner bag, recycled textiles and
            flower bioplastics — pick a layer to explore it in 3D.
          </p>
        </header>

        <section className="mat-stage" aria-label="Material selector">
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

          <div className="mat-viewer-wrap">
            <div className="mat-viewer-glow" aria-hidden />
            <MaterialsViewer focusMaterial={focusMaterial} onOpenDetail={openDetail} />
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
                ? "Drag to rotate the bag, or pick a material on the sides"
                : "Click the shape without dragging to open the full sheet"}
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
            <p className="mat-section-eyebrow">Up close</p>
            <h2 className="mat-section-title">Each material, in detail</h2>
          </header>

          <div className="mat-showcase__grid">
            {MATERIALS.map((m, i) => (
              <article
                key={m.id}
                className={`mat-showcase__card${i % 2 === 1 ? " mat-showcase__card--flip" : ""}`}
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

        <section className="mat-process" aria-label="Behind the scenes">
          <header className="mat-section-head">
            <p className="mat-section-eyebrow">Behind the scenes</p>
            <h2 className="mat-section-title">From matter to bag</h2>
            <p className="mat-section-lead">
              From sourcing reclaimed shells to printing the outer shell, every
              step of Hybrid was designed to keep waste, water and energy to a
              minimum.
            </p>
          </header>

          <div className="mat-process__grid">
            {[
              { num: "01", title: "Sourcing", caption: "Oyster shells, red cabbage, textile offcuts and dried petals collected for the bag." },
              { num: "02", title: "3D printing", caption: "The oyster-shell structure is printed layer by layer — no virgin plastic." },
              { num: "03", title: "Hand-finishing", caption: "Red-cabbage lining, recycled textiles and flower bioplastics applied by hand." },
            ].map((step) => (
              <article key={step.num} className="mat-process__card">
                <figure className="mat-process__media">
                  <img
                    src={`/materials/process-${step.num}.jpg`}
                    alt={step.title}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </figure>
                <div className="mat-process__text">
                  <p className="mat-process__num">{step.num}</p>
                  <h3 className="mat-process__title">{step.title}</h3>
                  <p className="mat-process__caption">{step.caption}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mat-final" aria-label="The final piece">
          <div className="mat-final__inner">
            <div className="mat-final__media">
              <img
                src="/materials/bag-final.jpg"
                alt="The finished Hybrid bag"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="mat-final__text">
              <p className="mat-section-eyebrow">The result</p>
              <h2 className="mat-section-title">A bag that carries its story</h2>
              <p className="mat-section-lead">
                Every Hybrid bag is one of a kind. Its texture, its trims, its
                tones change with the matter it&apos;s made of. Built to be used,
                designed to come back to the earth.
              </p>
            </div>
          </div>
        </section>

        <footer className="mat-footer">
          <Link
            to={homeBagLink.pathname}
            state={homeBagLink.state}
            className="mat-footer-link"
          >
            Back to home
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3 8h10M8 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </footer>
      </main>

      <MaterialDetailModal
        material={MATERIALS[detailIndex]}
        open={detailOpen}
        onClose={closeDetail}
      />

      {menuOpen && (
        <MenuOverlay
          ref={menuOverlayRef}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
