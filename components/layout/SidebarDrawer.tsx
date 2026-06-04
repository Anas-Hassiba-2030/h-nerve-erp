"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";

export const DRAWER_OPEN_EVENT = "h-nerve-drawer-open";

type SidebarProps = React.ComponentProps<typeof Sidebar>;
type DrawerProps = Omit<SidebarProps, "collapsed" | "variant">;

export function SidebarDrawer(props: DrawerProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const lastPathRef = useRef(pathname);
  const ar = props.locale === "ar";

  const close = useCallback(() => setOpen(false), []);

  // Listen for hamburger trigger.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(DRAWER_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(DRAWER_OPEN_EVENT, onOpen);
  }, []);

  // Close on route change.
  useEffect(() => {
    if (pathname !== lastPathRef.current) {
      lastPathRef.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  // Close on Esc + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={ar ? "القائمة الجانبية" : "Sidebar"}
    >
      <div
        className="sidebar-drawer-backdrop absolute inset-0"
        onClick={close}
        aria-hidden
      />
      <div className="sidebar-drawer-panel absolute inset-y-0 end-0 flex">
        <button
          type="button"
          onClick={close}
          className="sidebar-drawer-close"
          aria-label={ar ? "إغلاق" : "Close"}
        >
          <X className="h-4 w-4" />
        </button>
        <Sidebar {...props} variant="drawer" collapsed={false} />
      </div>
    </div>
  );
}

// Hamburger button to embed in PageHeader. Visible only on mobile.
export function SidebarHamburger({ locale }: { locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const onClick = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(DRAWER_OPEN_EVENT));
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-icon md:hidden"
      title={ar ? "فتح القائمة" : "Open menu"}
      aria-label={ar ? "فتح القائمة" : "Open menu"}
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
