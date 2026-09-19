import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { isStandalonePWA as detectStandaloneMode } from "../../utils/pwaMode";
import { setConnected as reportConnectivity } from "../../utils/networkManager";
import NetworkStatusIndicator from "../NetworkStatus/NetworkStatusIndicator";

const API_URL = import.meta.env.VITE_BASE_URL;

const CHECK_INTERVAL = 15000; // 15 seconds
const REQUEST_TIMEOUT = 8000; // 8 seconds

// A single slow/timed-out health check shouldn't immediately
// flip the UI to "not connected" - require this many consecutive
// failures first so a transient timeout doesn't cause a flash of
// the offline screen.
const FAILURE_THRESHOLD = 2;

// ========================================
// INTERNET CHECKER COMPONENT
// ========================================

const InternetChecker = ({ children }) => {
  // Detect whether the app is running as an installed PWA
  const [isStandalone, setIsStandalone] = useState(
    detectStandaloneMode
  );

  // Connection states
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  // Whether the very first connectivity check (on mount) has
  // finished. `isConnected` defaults to true so we don't flash
  // an "offline" state before we've checked anything - but that
  // means we can't use `isConnected` to decide whether to show
  // the initial loading screen. This flag is the real signal.
  const [hasCheckedOnce, setHasCheckedOnce] = useState(false);

  // References
  const isMounted = useRef(true);
  const checkingRef = useRef(false);
  const consecutiveFailures = useRef(0);

  // Update local state + the shared network manager together, and
  // require a few consecutive failures before reporting "offline"
  // so a single transient timeout doesn't flash the offline screen.
  const applyConnectionResult = useCallback((ok) => {
    if (ok) {
      consecutiveFailures.current = 0;
    } else {
      consecutiveFailures.current += 1;

      if (consecutiveFailures.current < FAILURE_THRESHOLD) {
        return;
      }
    }

    if (isMounted.current) {
      setIsConnected(ok);
    }

    reportConnectivity(ok);
  }, []);

  // ========================================
  // DETECT DISPLAY MODE CHANGES
  // ========================================

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(display-mode: standalone)"
    );

    const handleDisplayModeChange = () => {
      setIsStandalone(
        mediaQuery.matches ||
          window.navigator.standalone === true
      );
    };

    // Listen for display-mode changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener(
        "change",
        handleDisplayModeChange
      );
    } else {
      // Compatibility with older browsers
      mediaQuery.addListener(handleDisplayModeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener(
          "change",
          handleDisplayModeChange
        );
      } else {
        mediaQuery.removeListener(handleDisplayModeChange);
      }
    };
  }, []);

  // ========================================
  // CHECK BACKEND CONNECTION
  // ========================================

  const checkConnection = useCallback(async () => {
    // Do not check the internet in a normal browser
    if (!isStandalone) {
      return true;
    }

    // Prevent duplicate requests
    if (checkingRef.current) {
      return false;
    }

    checkingRef.current = true;

    let controller;
    let timeoutId;

    try {
      // Check device network status. This is a definitive signal
      // (not a fluky timeout), so report it immediately rather
      // than waiting on the failure threshold.
      if (!navigator.onLine) {
        consecutiveFailures.current = FAILURE_THRESHOLD;
        applyConnectionResult(false);

        return false;
      }

      // Check API URL configuration
      if (!API_URL) {
        console.error(
          "VITE_API_URL is not configured."
        );

        consecutiveFailures.current = FAILURE_THRESHOLD;
        applyConnectionResult(false);

        return false;
      }

      // Create request timeout controller
      controller = new AbortController();

      timeoutId = setTimeout(() => {
        controller.abort();
      }, REQUEST_TIMEOUT);

      // Check backend health endpoint
      const response = await fetch(
        `${API_URL}/health`,
        {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        }
      );

      applyConnectionResult(response.ok);

      return response.ok;
    } catch (error) {
      if (error.name !== "AbortError") {
        console.warn(
          "Connection check failed:",
          error.message
        );
      }

      // Includes timeouts (AbortError) - these go through the
      // failure threshold instead of failing instantly.
      applyConnectionResult(false);

      return false;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      checkingRef.current = false;
    }
  }, [isStandalone, applyConnectionResult]);

  // ========================================
  // INITIAL CONNECTION CHECK
  // ========================================

  useEffect(() => {
    isMounted.current = true;

    // Bypass connection check in a normal browser
    if (!isStandalone) {
      setIsConnected(true);
      setIsChecking(false);
      setHasCheckedOnce(true);

      return () => {
        isMounted.current = false;
      };
    }

    const initialCheck = async () => {
      setIsChecking(true);

      await checkConnection();

      if (isMounted.current) {
        setIsChecking(false);
        setHasCheckedOnce(true);
      }
    };

    initialCheck();

    return () => {
      isMounted.current = false;
    };
  }, [isStandalone, checkConnection]);

  // ========================================
  // MONITOR NETWORK STATUS
  // ========================================

  useEffect(() => {
    // No monitoring in normal browser mode
    if (!isStandalone) {
      return;
    }

    const handleOnline = () => {
      checkConnection();
    };

    const handleOffline = () => {
      // The browser's own 'offline' event is a definitive
      // signal, so report it immediately.
      consecutiveFailures.current = FAILURE_THRESHOLD;
      applyConnectionResult(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isStandalone, checkConnection]);

  // ========================================
  // PERIODIC BACKEND CHECK
  // ========================================

  useEffect(() => {
    // Do not run the interval in browser mode
    if (!isStandalone) {
      return;
    }

    const interval = setInterval(() => {
      checkConnection();
    }, CHECK_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [isStandalone, checkConnection]);

  // ========================================
  // RETRY BUTTON
  // ========================================

  const handleRetry = async () => {
    if (!isStandalone) {
      return;
    }

    setIsChecking(true);

    const connected = await checkConnection();

    // A manual retry click should reflect the result right away,
    // regardless of the automatic failure threshold.
    consecutiveFailures.current = connected
      ? 0
      : FAILURE_THRESHOLD;

    if (isMounted.current) {
      setIsConnected(connected);
      setIsChecking(false);
    }

    reportConnectivity(connected);
  };

  // ========================================
  // NORMAL BROWSER MODE
  // ========================================

  // No internet check, no loading screen, no blocking
  if (!isStandalone) {
    return children;
  }

  // ========================================
  // INITIAL LOADING SCREEN
  // ========================================

  if (!hasCheckedOnce) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500" />

          <h2 className="text-xl font-semibold">
            Checking Internet Connection
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Please wait...
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // OFFLINE SCREEN
  // ========================================

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-white">
        <div className="w-full max-w-md px-4 text-center">

          {/* ICON */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="h-10 w-10 text-red-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 9.75v4.5m0 3h.008"
              />
            </svg>
          </div>

          {/* TITLE */}
          <h1 className="text-3xl font-bold">
            Internet Not Connected
          </h1>

          {/* DESCRIPTION */}
          <p className="mt-4 text-gray-400">
            Please connect to the internet to use
            this application.
          </p>

          {/* STATUS */}
          <p className="mt-3 text-sm text-gray-500">
            Your connection to the Expense Tracker
            server could not be established.
          </p>

          {/* RETRY BUTTON */}
          <button
            onClick={handleRetry}
            disabled={isChecking}
            className="mt-8 rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isChecking
              ? "Checking..."
              : "Retry Connection"}
          </button>

          {/* HINT */}
          <p className="mt-5 text-xs text-gray-600">
            Check your Wi-Fi or mobile data connection.
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER APPLICATION
  // ========================================

  return (
    <>
      {children}
      <NetworkStatusIndicator />
    </>
  );
};

export default InternetChecker;
