"use client";

// Hosts the Orrery hub (public/orrery/index.html) full-screen. A dive arrives as a
// postMessage and navigates to the matching Claude Design page served under /design.
// Real identity + locale are pushed into the hub after load.
import { useEffect, useRef } from "react";

export type OrreryIdentity = {
  lang: "ar" | "en";
  userName: string;
  roleLabel: string;
  iq?: string;
};

export function OrreryFrame({ identity }: { identity: OrreryIdentity }) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e?.data as { __orreryNav?: string } | undefined;
      if (data && typeof data.__orreryNav === "string") {
        // A dive opens the ACTUAL Claude Design page, served under /design
        // (e.g. "sections/arena.html" -> /design/sections/arena.html). Each
        // designed page's "back to orbit" returns here to /orrery.
        const href = data.__orreryNav.replace(/^\/+/, "");
        window.location.assign("/design/" + href);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function pushIdentity() {
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ __orrerySet: 1, ...identity }, "*");
  }

  return (
    <iframe
      ref={frameRef}
      src="/orrery/index.html"
      title="H-Nerve · Orrery"
      onLoad={pushIdentity}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        border: "0",
        margin: 0,
        padding: 0,
        display: "block",
        background: "#0D1F1A",
      }}
    />
  );
}
