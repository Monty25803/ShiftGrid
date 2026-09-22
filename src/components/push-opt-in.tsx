"use client";

import { useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function supportsPush() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function PushOptIn() {
  const [status, setStatus] = useState<"idle" | "on" | "unsupported">("idle");

  async function enable() {
    if (!supportsPush()) {
      setStatus("unsupported");
      return;
    }
    await navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const keyRes = await fetch("/api/push");
    const { publicKey } = (await keyRes.json()) as { publicKey: string | null };
    if (!publicKey) {
      alert("Web Push is not configured (missing VAPID keys).");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    const json = sub.toJSON();
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
      }),
    });
    setStatus("on");
  }

  if (status === "unsupported") return null;

  return (
    <button
      type="button"
      onClick={enable}
      className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--surface-2)]"
    >
      {status === "on" ? "Push on" : "Enable push"}
    </button>
  );
}
