import { useCallback, useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const CHECK_INTERVAL = 15000; // 15 seconds

const InternetChecker = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const isMounted = useRef(true);
  const checkingRef = useRef(false);

  // ========================================
  // CHECK BACKEND CONNECTION
  // ========================================

  const checkConnection = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (checkingRef.current) {
      return false;
    }

    checkingRef.current = true;

    try {
      // First check browser network status
      if (!navigator.onLine) {
        if (isMounted.current) {
          setIsConnected(false);
        }

        return false;
      }

      // Ensure API URL is configured
      if (!API_URL) {
        console.error("VITE_API_URL is not configured.");

        if (isMounted.current) {
          setIsConnected(false);
        }

        return false;
      }

      // Abort request if server takes too long
      const controller = new AbortController();

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 8000);

      try {
        const response = await fetch(`${API_URL}/health`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (isMounted.current) {
          setIsConnected(response.ok);
        }

        return response.ok;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.warn("Connection check failed:", error.message);
      }

      if (isMounted.current) {
        setIsConnected(false);
      }

      return false;
    } finally {
      checkingRef.current = false;
    }
  }, []);

  // ========================================
  // INITIAL CHECK
  // ========================================

  useEffect(() => {
    isMounted.current = true;

    const initialCheck = async () => {
      setIsChecking(true);

      await checkConnection();

      if (isMounted.current) {
        setIsChecking(false);
      }
    };

    initialCheck();

    return () => {
      isMounted.current = false;
    };
  }, [checkConnection]);

  // ========================================
  // MONITOR NETWORK STATUS
  // ========================================

  useEffect(() => {
    const handleOnline = () => {
      checkConnection();
    };

    const handleOffline = () => {
      setIsConnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkConnection]);

  // ========================================
  // PERIODIC BACKEND CHECK
  // ========================================

  useEffect(() => {
    const interval = setInterval(() => {
      checkConnection();
    }, CHECK_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [checkConnection]);

  // ========================================
  // RETRY BUTTON HANDLER
  // ========================================

  const handleRetry = async () => {
    setIsChecking(true);

    const connected = await checkConnection();

    if (isMounted.current) {
      setIsConnected(connected);
      setIsChecking(false);
    }
  };

  // ========================================
  // INITIAL LOADING SCREEN
  // ========================================

  if (isChecking && !isConnected) {
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
        <div className="w-full max-w-md text-center">

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
            {isChecking ? "Checking..." : "Retry Connection"}
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

  return children;
};

export default InternetChecker;
