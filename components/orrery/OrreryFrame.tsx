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
        const href = data.__orreryNav.replace(/^\/+/, "");
        // Sections rebuilt with REAL data live as real app routes (the design
        // + the live numbers + working CRUD). Everything not yet rebuilt opens
        // the designed mock under /design so the dive always lands on the
        // design — real data fills in section by section as each is rebuilt.
        const REAL_DATA_PAGES: Record<string, string> = {
          "sections/arena.html": "/hotels",
          "sections/maha.html": "/dairy",
          "sections/loran.html": "/farms",
          "sections/ahliyya.html": "/education",
          "sections/finance.html": "/finance",
          "sections/reports.html": "/reports",
          "sections/analytics.html": "/analytics",
          "sections/markets.html": "/markets",
          "sections/compare.html": "/compare",
        };
        window.location.assign(REAL_DATA_PAGES[href] ?? "/design/" + href);
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
