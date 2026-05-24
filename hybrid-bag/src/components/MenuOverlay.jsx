import {
  useEffect,
  useState,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { homeBagLink } from "../utils/homeNav";

const EXIT_MS = 300;

/* Accents glow — palette proche du ciel sac (mauve A78699, rose pâle, lavande) */
const ITEMS = [
  {
    num: "01",
    label: "Home",
    sub: "The bag experience",
    to: "/",
    color: "#c9a0b8",
  },
  {
    num: "02",
    label: "About",
    sub: "Mission & contact",
    to: "/about",
    color: "#b8a8dc",
  },
  {
    num: "03",
    label: "Process",
    sub: "How it's made",
    to: "/process",
    color: "#dba8c4",
  },
  {
    num: "04",
    label: "Materials",
    sub: "What it's made of",
    to: "/materials",
    color: "#a894cc",
  },
];

const MenuOverlay = forwardRef(function MenuOverlay({ onClose }, ref) {
  const [exiting, setExiting] = useState(false);
  const pendingNav = useRef(null);
  const navigate = useNavigate();

  const beginClose = useCallback((to) => {
    setExiting((v) => {
      if (v) return v;
      if (to) pendingNav.current = to;
      return true;
    });
  }, []);

  useImperativeHandle(ref, () => ({ requestClose: () => beginClose() }), [beginClose]);

  useEffect(() => {
    if (!exiting) return;
    const id = window.setTimeout(() => {
      if (pendingNav.current) {
        if (pendingNav.current === homeBagLink.pathname) {
          navigate(homeBagLink.pathname, { state: homeBagLink.state });
        } else {
          navigate(pendingNav.current);
        }
        pendingNav.current = null;
      }
      onClose();
    }, EXIT_MS);
    return () => clearTimeout(id);
  }, [exiting, onClose, navigate]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") beginClose();
    };
    window.addEventListener("keydown", onKey);

    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [beginClose]);

  return (
    <div
      className={`mo-overlay${exiting ? " mo-overlay--exiting" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Menu principal"
    >
      <div className="mo-backdrop" onClick={beginClose} />

      <div className="mo-panel">
        {/* Grid 3 col — 4 cartes */}
        <div className="mo-grid">
          {ITEMS.map((item, i) => (
            <Link
              key={item.num}
              to={item.to}
              className="mo-card"
              style={{ "--c": item.color, animationDelay: `${0.04 + i * 0.055}s` }}
              onClick={(e) => {
                e.preventDefault();
                beginClose(item.to);
              }}
            >
              <span className="mo-card-num">{item.num}</span>
              <div className="mo-card-body">
                <span className="mo-card-label">
                  {item.label.split("\n").map((l, j) => <span key={j}>{l}</span>)}
                </span>
                <span className="mo-card-sub">{item.sub}</span>
              </div>
              {/* Glow orb */}
              <div className="mo-card-glow" />
            </Link>
          ))}
        </div>

        {/* Footer */}
        <p className="mo-footer">© 2026 Hybrid</p>
      </div>
    </div>
  );
});

MenuOverlay.displayName = "MenuOverlay";

export default MenuOverlay;
