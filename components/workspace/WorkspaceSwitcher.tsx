// components/workspace/WorkspaceSwitcher.tsx — W5: jump between
// company workspaces without exiting the shell. Pure <details>
// disclosure (no client state lib); each row is a form posting to
// the existing enterWorkspace action, which sets the cookie and
// redirects back into /workspace for the chosen unit.

import { enterWorkspace } from "@/app/actions/workspace";

const SECTOR_GLYPH: Record<string, string> = {
  HOSPITALITY: "🏨",
  DAIRY: "❄",
  AGRICULTURE: "🌿",
  EDUCATION: "🎓",
  INVESTMENT: "◆",
  TRADE: "⇄",
};

type Co = {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  sector: string;
};

export function WorkspaceSwitcher({
  ar,
  currentId,
  companies,
}: {
  ar: boolean;
  currentId: string;
  companies: Co[];
}) {
  if (companies.length < 2) return null;

  return (
    <details className="ws-switch">
      <summary className="ws-switch-btn">
        <span>{ar ? "تبديل الوحدة" : "Switch unit"}</span>
        <span aria-hidden className="ws-switch-caret">
          ▾
        </span>
      </summary>
      <div className="ws-switch-menu" role="menu">
        <div className="ws-switch-head">
          {ar ? "اقفز إلى وحدة أخرى" : "Jump to another unit"}
        </div>
        {companies.map((c) => {
          const active = c.id === currentId;
          return (
            <form
              key={c.id}
              action={enterWorkspace}
              className="ws-switch-item-form"
            >
              <input type="hidden" name="companyId" value={c.id} />
              <button
                type="submit"
                className="ws-switch-item"
                data-active={active ? "true" : undefined}
                disabled={active}
                role="menuitem"
              >
                <span className="ws-switch-glyph" aria-hidden>
                  {SECTOR_GLYPH[c.sector] ?? "■"}
                </span>
                <span className="ws-switch-name">
                  {ar ? c.name : c.nameEn}
                </span>
                <span className="ws-switch-code ws-mono">{c.code}</span>
                {active ? (
                  <span className="ws-switch-here">
                    {ar ? "هنا" : "here"}
                  </span>
                ) : (
                  <span className="ws-switch-go" aria-hidden>
                    {ar ? "←" : "→"}
                  </span>
                )}
              </button>
            </form>
          );
        })}
      </div>
    </details>
  );
}
