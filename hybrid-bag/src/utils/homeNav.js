export const HOME_INTRO_KEY = "hybrid-intro-done";

export function markHomeIntroDone() {
  try {
    sessionStorage.setItem(HOME_INTRO_KEY, "1");
  } catch {
    /* private mode / blocked storage */
  }
}

export function shouldSkipHomeIntro(location) {
  if (location.state?.skipIntro === true) return true;
  try {
    return sessionStorage.getItem(HOME_INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

/** Link target — home bag scene, sans re-jouer loading / textes */
export const homeBagLink = {
  pathname: "/",
  state: { skipIntro: true },
};
