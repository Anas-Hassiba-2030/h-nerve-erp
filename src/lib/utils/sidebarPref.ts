// Lives outside `app/actions/` because Next.js forbids non-async exports from
// `"use server"` files. Both the preferences action and the layout import this
// constant.
export const SIDEBAR_COOKIE = "h_nerve_sidebar";

export type SidebarState = "collapsed" | "expanded";
