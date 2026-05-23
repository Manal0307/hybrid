const INTRO_KEY = "hybrid_home_intro_done";

function isHardReload() {
  try {
    const [nav] = performance.getEntriesByType("navigation");
    return nav?.type === "reload";
  } catch {
    return false;
  }
}

export function markHomeIntroDone() {
  try {
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* private mode / storage blocked */
  }
}

/** Skip loading + text slides when returning home in-app (not on refresh). */
export function shouldSkipHomeIntro(location) {
  /* F5 garde location.state dans l'historique — on rejoue l'intro au reload */
  if (isHardReload()) return false;

  if (!location?.state?.skipIntro) return false;
  try {
    return sessionStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

/** Logo / back-to-home from other pages — skip intro if already seen this session. */
export const homeBagLink = {
  pathname: "/",
  state: { skipIntro: true },
};
