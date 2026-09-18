// =========================================================
// PWA / STANDALONE MODE DETECTION
// =========================================================
//
// Shared by InternetChecker, the network manager, the API
// client, and the network status indicator so that every
// piece of the new offline/retry/queueing behavior is gated
// to the installed PWA experience only.
//
// Regular browser tabs are intentionally left untouched -
// everything in this file returns `false` there.
//

export const isStandalonePWA = () => {
  if (typeof window === "undefined") {
    return false;
  }

  // Standard PWA detection (Chrome, Edge, Android, etc.)
  const standaloneMediaQuery = window.matchMedia(
    "(display-mode: standalone)"
  ).matches;

  // iOS Safari standalone detection
  const iosStandalone =
    window.navigator.standalone === true;

  return standaloneMediaQuery || iosStandalone;
};

// Notify a callback whenever the display mode flips between
// "installed app" and "browser tab" (e.g. install/uninstall
// while the app is open).
export const subscribeToDisplayModeChange = (callback) => {
  const mediaQuery = window.matchMedia(
    "(display-mode: standalone)"
  );

  const handler = () => callback(isStandalonePWA());

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", handler);
  } else {
    // Compatibility with older browsers
    mediaQuery.addListener(handler);
  }

  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener("change", handler);
    } else {
      mediaQuery.removeListener(handler);
    }
  };
};
