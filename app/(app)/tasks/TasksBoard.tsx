"use client";

// Interactive tasks board — the client-side behaviour ported from
// docs/design/system/sections/tasks.js (CRUD-ish UI: filters, search, inline
// composer, status cycle, bulk toolbar, confetti, chess-rank gamification).
//
// The HTML structure & class names match the reference exactly. Real data is
// fed in from the server page (app/(app)/tasks/page.tsx); persistence runs
// through the existing server actions in ./actions.ts. Status changes,
// deletes and bulk ops call those actions and refresh the route, so the look
// is the design while the data stays real.

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTask,
  setTaskStatus,
  deleteTask,
  bulkSetTaskStatus,
  bulkDeleteTasks,
} from "./actions";

export type BoardPrio = "high" | "med" | "low";
export type BoardStatus = "todo" | "doing" | "done";

export type BoardTask = {
  id: string;
  title: string;
  prio: BoardPrio;
  owner: string;
  ownerGlyph: string;
  due: string;
  status: BoardStatus;
  xp: number;
  mine: boolean;
};

export type BoardRank = {
  name: string; // "فارس · فضي" / "Knight · Silver"
  symbol: string; // unicode chess piece
  xp: number;
  pct: number; // 0..100 toward next rank
  nextLabel: string; // "التالي: ١٥١" or "أعلى رتبة"
};

type Labels = {
  prio: Record<BoardPrio, string>;
  stat: Record<BoardStatus, string>;
  searchPlaceholder: string;
  add: string;
  selected: (n: string) => string;
  bulkDone: string;
  bulkDoing: string;
  bulkDel: string;
  congrats: string;
  rankUp: (name: string) => string;
  composer: { title: string };
  newHref: string;
};

// Domain status <-> board status
const TO_DOMAIN: Record<BoardStatus, string> = {
  todo: "TODO",
  doing: "IN_PROGRESS",
  done: "DONE",
};

export function TasksBoard({
  initialTasks,
  rank,
  todayXp,
  ar,
  labels,
}: {
  initialTasks: BoardTask[];
  rank: BoardRank;
  todayXp: number;
  ar: boolean;
  labels: Labels;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const toLocale = useMemo(
    () => (n: number | string) =>
      ar ? String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]) : String(n),
    [ar],
  );

  const [tasks, setTasks] = useState<BoardTask[]>(initialTasks);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [composerOpen, setComposerOpen] = useState(false);

  // keep local state in sync when the server sends fresh data after a revalidate
  useEffect(() => {
    setTasks(initialTasks);
    setSelected(new Set());
  }, [initialTasks]);

  // ── rank card animation state ──
  const [rankPulse, setRankPulse] = useState(false);
  const [rankFlip, setRankFlip] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const [toast, setToast] = useState<{ pc: string; msg: string } | null>(null);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    // animate the bar in on mount, like the reference's renderRank()
    const id = requestAnimationFrame(() =>
      setBarWidth(Math.max(3, Math.min(100, rank.pct))),
    );
    return () => cancelAnimationFrame(id);
  }, [rank.pct]);

  // ── confetti ──
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const partsRef = useRef<
    {
      x: number;
      y: number;
      vx: number;
      vy: number;
      g: number;
      r: number;
      col: string;
      life: number;
      rot: number;
      vr: number;
    }[]
  >([]);
  const rafRef = useRef(0);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const resize = () => {
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const COLORS = ["#DCC38A", "#C2A35A", "#7E9B86", "#2E6B57", "#FBF3DC"];
  function confetti(x: number, y: number, n = 46) {
    if (reduce.current) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const parts = partsRef.current;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Math.random() * 7 + 3;
      parts.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 4,
        g: 0.22,
        r: Math.random() * 4 + 2,
        col: COLORS[i % COLORS.length],
        life: 1,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4,
      });
    }
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
  }
  function tick() {
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) {
      rafRef.current = 0;
      return;
    }
    ctx.clearRect(0, 0, cv.width, cv.height);
    const parts = partsRef.current;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.012;
      p.rot += p.vr;
      if (p.life <= 0 || p.y > cv.height + 20) {
        parts.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.col;
      ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
      ctx.restore();
    }
    rafRef.current = parts.length ? requestAnimationFrame(tick) : 0;
  }

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  function celebrate(row?: HTMLElement | null) {
    setRankPulse(true);
    setTimeout(() => setRankPulse(false), 700);
    if (row) {
      const r = row.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top + r.height / 2);
    } else if (!reduce.current) {
      confetti(window.innerWidth / 2, window.innerHeight / 2, 80);
    }
  }

  // ── filters + search ──
  function visible(t: BoardTask) {
    if (filter === "doing" && t.status !== "doing") return false;
    if (filter === "done" && t.status !== "done") return false;
    if (filter === "urgent" && t.prio !== "high") return false;
    if (filter === "mine" && !t.mine) return false;
    if (query && t.title.toLowerCase().indexOf(query.toLowerCase()) < 0) return false;
    return true;
  }
  const shown = tasks.filter(visible);

  // ── persistence helpers (existing server actions) ──
  function persistStatus(id: string, status: BoardStatus) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", TO_DOMAIN[status]);
    startTransition(async () => {
      await setTaskStatus(fd);
      router.refresh();
    });
  }
  function persistDelete(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await deleteTask(fd);
      router.refresh();
    });
  }

  // ── per-row interactions ──
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function cycleStatus(t: BoardTask, row: HTMLElement | null) {
    const order: BoardStatus[] = ["todo", "doing", "done"];
    const ni = (order.indexOf(t.status) + 1) % 3;
    const was = t.status;
    const nextStatus = order[ni];
    // optimistic
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: nextStatus } : x)));
    if (nextStatus === "done" && was !== "done") celebrate(row);
    persistStatus(t.id, nextStatus);
  }

  // ── bulk ──
  const ids = Array.from(selected);
  function bulkAction(act: "done" | "doing" | "del") {
    if (!ids.length) return;
    if (act === "del") {
      setTasks((prev) => prev.filter((t) => !selected.has(t.id)));
      startTransition(async () => {
        await bulkDeleteTasks(ids);
        router.refresh();
      });
    } else {
      const status: BoardStatus = act === "done" ? "done" : "doing";
      setTasks((prev) =>
        prev.map((t) => (selected.has(t.id) ? { ...t, status } : t)),
      );
      if (act === "done") celebrate(null);
      startTransition(async () => {
        await bulkSetTaskStatus(ids, TO_DOMAIN[status]);
        router.refresh();
      });
    }
    setSelected(new Set());
  }

  return (
    <>
      <div className="tk-controls">
        <div className="tk-pills">
          {(
            [
              ["all", ar ? "الكل" : "All"],
              ["doing", labels.stat.doing],
              ["done", ar ? "مكتمل" : "Done"],
              ["urgent", ar ? "عاجل" : "Urgent"],
              ["mine", ar ? "مهامي" : "Mine"],
            ] as [string, string][]
          ).map(([f, lbl]) => (
            <button
              key={f}
              type="button"
              className={"pill" + (filter === f ? " on" : "")}
              onClick={() => setFilter(f)}
            >
              {lbl}
            </button>
          ))}
        </div>
        <div className="tk-right">
          <input
            className="tk-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
          />
          <button
            type="button"
            className="tk-add"
            onClick={() => setComposerOpen((v) => !v)}
          >
            {labels.add}
          </button>
        </div>
      </div>

      <div className="tk-table">
        <div className="tk-head">
          <span></span>
          <span>{ar ? "العنوان" : "Title"}</span>
          <span>{ar ? "الأولوية" : "Priority"}</span>
          <span>{ar ? "المالك" : "Owner"}</span>
          <span className="h-due">{ar ? "الاستحقاق" : "Due"}</span>
          <span className="h-stat">{ar ? "الحالة" : "Status"}</span>
          <span className="h-xp">XP</span>
        </div>

        {/* inline composer — opens the existing create flow */}
        <form action={labels.newHref} className={"tk-composer" + (composerOpen ? " show" : "")}>
          <span></span>
          <input name="title" className="c-title" placeholder={labels.composer.title} autoFocus={composerOpen} />
          <select name="priority" className="c-prio" defaultValue="MEDIUM">
            <option value="HIGH">{labels.prio.high}</option>
            <option value="MEDIUM">{labels.prio.med}</option>
            <option value="LOW">{labels.prio.low}</option>
          </select>
          <input name="owner" className="c-owner" placeholder={ar ? "المالك" : "Owner"} />
          <input name="due" className="c-due" placeholder={ar ? "غداً" : "Tomorrow"} />
          <span className="c-stat"></span>
          <input name="points" className="c-xp" type="number" defaultValue={40} min={10} max={200} />
        </form>

        <div id="rows">
          {shown.map((t) => (
            <div
              key={t.id}
              className={"tk-row" + (t.status === "done" ? " done" : "")}
              data-id={t.id}
            >
              <button
                type="button"
                className={"chk" + (selected.has(t.id) ? " on" : "")}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(t.id);
                }}
              >
                {selected.has(t.id) ? "✓" : ""}
              </button>
              <span className="t-title">{t.title}</span>
              <span>
                <span className={"prio " + t.prio}>{labels.prio[t.prio]}</span>
              </span>
              <span className="owner">
                <span className="oav">{t.ownerGlyph}</span>
                {t.owner}
              </span>
              <span className="due">{t.due}</span>
              <span>
                <button
                  type="button"
                  className={"stat " + t.status}
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleStatus(t, (e.currentTarget as HTMLElement).closest(".tk-row"));
                  }}
                >
                  {labels.stat[t.status]}
                </button>
              </span>
              <span className="xp">{toLocale(t.xp)}</span>
              <button
                type="button"
                className="t-del"
                title={ar ? "حذف" : "Delete"}
                onClick={(e) => {
                  e.stopPropagation();
                  persistDelete(t.id);
                }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={"tk-bulk" + (selected.size ? " show" : "")} id="bulk">
        <span className="cnt">{labels.selected(toLocale(selected.size))}</span>
        <button type="button" data-act="done" onClick={() => bulkAction("done")}>
          {labels.bulkDone}
        </button>
        <button type="button" data-act="doing" onClick={() => bulkAction("doing")}>
          {labels.bulkDoing}
        </button>
        <button type="button" data-act="del" onClick={() => bulkAction("del")}>
          {labels.bulkDel}
        </button>
      </div>

      <canvas id="confetti" ref={canvasRef}></canvas>
      <div className={"ru-toast" + (toast ? " show" : "")} id="ruToast">
        <span className="pc">{toast?.pc ?? rank.symbol}</span>
        <div className="tx">
          <b>{labels.congrats}</b>
          <span>{toast?.msg ?? labels.rankUp(rank.name)}</span>
        </div>
      </div>

      {/* live rank-card animation classes are toggled via the elements rendered
          in the server page; we mirror their state here through a portal-free
          approach: the server renders the static card, and these spans/effects
          drive the bar + pulse + flip + toast. */}
      <RankAnimator
        pulse={rankPulse}
        flip={rankFlip}
        barWidth={barWidth}
        setFlip={setRankFlip}
      />
    </>
  );
}

// Applies the live animation classes/inline-width to the server-rendered rank
// card (#rankCard, #rankPiece, #rankBar) without re-rendering its markup, so
// the visual treatment matches the reference's renderRank()/pulse/flip.
function RankAnimator({
  pulse,
  flip,
  barWidth,
  setFlip,
}: {
  pulse: boolean;
  flip: boolean;
  barWidth: number;
  setFlip: (v: boolean) => void;
}) {
  useEffect(() => {
    const card = document.getElementById("rankCard");
    if (card) card.classList.toggle("pulse", pulse);
  }, [pulse]);
  useEffect(() => {
    const piece = document.getElementById("rankPiece");
    if (piece && flip) {
      piece.classList.add("flip");
      const id = setTimeout(() => {
        piece.classList.remove("flip");
        setFlip(false);
      }, 600);
      return () => clearTimeout(id);
    }
  }, [flip, setFlip]);
  useEffect(() => {
    const bar = document.getElementById("rankBar");
    if (bar) bar.style.width = barWidth + "%";
  }, [barWidth]);
  return null;
}
