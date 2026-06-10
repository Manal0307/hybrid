import { useState, useEffect } from "react";

export function revealClass(id, revealed, revealBase, ...extra) {
  return [revealBase, revealed.has(id) && "is-visible", ...extra.filter(Boolean)]
    .filter(Boolean)
    .join(" ");
}

export function useScrollReveal(containerRef, { heroKeys = [] } = {}) {
  const [revealed, setRevealed] = useState(() => new Set(heroKeys));

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const items = root.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    const revealAll = () => {
      const keys = new Set();
      items.forEach((el) => {
        if (el.dataset.reveal) keys.add(el.dataset.reveal);
      });
      setRevealed(keys);
    };

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      revealAll();
      return;
    }

    const mobile = window.matchMedia("(max-width: 700px)").matches;

    const revealInView = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const keys = [];

      items.forEach((el) => {
        const key = el.dataset.reveal;
        if (!key) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < vh * 0.96 && rect.bottom > vh * 0.02) keys.push(key);
      });

      if (!keys.length) return;

      setRevealed((prev) => {
        const next = new Set(prev);
        let changed = false;
        keys.forEach((key) => {
          if (!next.has(key)) {
            next.add(key);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    };

    revealInView();
    requestAnimationFrame(revealInView);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const key = entry.target.dataset.reveal;
          if (key) {
            setRevealed((prev) => {
              if (prev.has(key)) return prev;
              const next = new Set(prev);
              next.add(key);
              return next;
            });
          }
          observer.unobserve(entry.target);
        });
      },
      mobile
        ? { threshold: 0.06, rootMargin: "0px 0px 12% 0px" }
        : { threshold: 0.12, rootMargin: "0px 0px 8% 0px" },
    );

    items.forEach((el) => observer.observe(el));
    window.addEventListener("resize", revealInView, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", revealInView);
    };
  }, []);

  return revealed;
}
