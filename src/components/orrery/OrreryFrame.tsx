"use client";

// Hosts the Orrery hub (public/orrery/index.html) full-screen. A dive arrives as a
// postMessage and navigates to the matching real app route via the single,
// unit-tested resolver in lib/orrery/routeMap. Real identity + locale are pushed
// into the hub after load.
import { useEffect, useRef } from "react";
import { mapOrreryHref } from "@/lib/orrery/routeMap";

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
      const data = e?.data as { __orreryNav?: string; __orreryLang?: string } | undefined;
      // Language toggle inside the hub iframe → persist the real h_nerve_locale
      // cookie + reload, so the choice applies to the WHOLE app (the iframe's
      // setLang only flips its own visuals). This is the real bilingual switch
      // from the Orrery.
      if (data && (data.__orreryLang === "ar" || data.__orreryLang === "en")) {
        const lang = data.__orreryLang;
        try {
          if (document.documentElement.lang === lang) return; // already set, avoid loops
          document.cookie = `h_nerve_locale=${lang}; path=/; max-age=31536000; samesite=lax`;
          document.documentElement.lang = lang;
          document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
          window.location.reload();
        } catch {
          /* ignore */
        }
        return;
      }
      if (data && typeof data.__orreryNav === "string") {
        const nav = data.__orreryNav.trim();
        // Logout is special: it MUST always be a real top-level browser
        // navigation to the /logout route handler (which destroys the session
        // then 303s to /login). Route it directly — never through the resolver
        // or a client-side router push — so a future routeMap change can't
        // silently strip the session-destroy and leave the user "logged out"
        // but still authenticated. (A stale build once did exactly this.)
        if (nav === "/logout") {
          window.location.assign("/logout");
          return;
        }
        // Every other dive resolves through the single, unit-tested source of
        // truth (lib/orrery/routeMap): explicit section files, the dashboard
        // kit, and generated kids (?s=<name>) all map to real app routes.
        window.location.assign(mapOrreryHref(nav));
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
        // Explicit low z-index: the iframe must always sit BELOW the separate
        // .orrery-fab-layer (which carries the brain/time/quick-add panels).
        zIndex: 0,
      }}
    />
  );
}
