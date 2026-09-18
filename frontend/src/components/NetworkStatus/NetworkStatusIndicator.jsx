import { useEffect, useState } from "react";
import { isStandalonePWA } from "../../utils/pwaMode";
import { subscribe } from "../../utils/networkManager";

// =========================================================
// NETWORK STATUS INDICATOR
// =========================================================
//
// Small fixed badge reflecting the four states:
//
//   Connected               - device is online, nothing queued
//   Offline                 - genuinely disconnected
//   Syncing…                - queued requests are being sent
//   Waiting for connection… - requests are queued, still offline
//
// Only rendered inside the installed PWA - normal browser tabs
// never see this.
//

const STATUS_CONFIG = {
  connected: {
    label: "Connected",
    dot: "bg-green-500",
    text: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  offline: {
    label: "Offline",
    dot: "bg-red-500",
    text: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
  syncing: {
    label: "Syncing…",
    dot: "bg-blue-500 animate-pulse",
    text: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  waiting: {
    label: "Waiting for connection…",
    dot: "bg-amber-500 animate-pulse",
    text: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
};

const NetworkStatusIndicator = () => {
  const [state, setState] = useState({
    status: "connected",
    pendingCount: 0,
  });

  useEffect(() => {
    if (!isStandalonePWA()) return undefined;

    return subscribe(setState);
  }, []);

  if (!isStandalonePWA()) {
    return null;
  }

  const config =
    STATUS_CONFIG[state.status] || STATUS_CONFIG.connected;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-md ${config.bg} ${config.text}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`h-2 w-2 rounded-full ${config.dot}`}
      />

      <span>{config.label}</span>

      {state.pendingCount > 0 && (
        <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">
          {state.pendingCount}
        </span>
      )}
    </div>
  );
};

export default NetworkStatusIndicator;
