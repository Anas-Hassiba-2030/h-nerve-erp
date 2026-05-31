"use client";

// Hosts the ported Orrery hub (public/orrery/index.html) full-screen and bridges it
// into the real app: dives arrive as postMessage and are pushed through the Next
// router; real identity + locale are pushed into the frame after load.
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { mapOrreryHref } from "@/lib/orrery/routeMap";

export type OrreryIdentity = {
  lang: "ar" | "en";
  userName: string;
  roleLabel: string;
  iq?: string;
};

export function OrreryFrame({ identity }: { identity: OrreryIdentity }) {
  const router = useRouter();
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const targets = new Set<string>([
      "/hotels",
      "/dairy",
      "/farms",
      "/education",
      "/supply-chain",
    ]);
    // prefetch the most common dives so the work surface appears instantly
    targets.forEach((r) => {
      try {
        router.prefetch(r);
      } catch {
        /* noop */
      }
    });

    function onMessage(e: MessageEvent) {
      const data = e?.data as { __orreryNav?: string } | undefined;
      if (data && typeof data.__orreryNav === "string") {
        // mark the navigation so the (app) shell plays the planet-dive landing
        try {
          sessionStorage.setItem("hn-dived", "1");
        } catch {
          /* ignore */
        }
        router.push(mapOrreryHref(data.__orreryNav));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

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
