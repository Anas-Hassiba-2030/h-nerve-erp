"use client";

// Client forms for /admin/users. Plain named inputs the server actions
// read from FormData. Sleek Operator classes only.
// ROLES comes from ./roles (a plain module — never from the
// "use server" actions file).
//
// CreateUserForm + ResetPasswordForm thread server-action errors back
// to the UI via useFormState so the real password-policy message shows
// inline (the (admin) console has no ToastProvider).

import { useFormState } from "react-dom";
import { useId, useState } from "react";
import {
  Plus,
  Save,
  KeyRound,
  UserCheck,
  UserX,
  Trash2,
  Wand2,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  createUser,
  updateUser,
  resetPassword,
  setActive,
  deleteUser,
} from "./actions";
import { initialFormState } from "@/lib/utils/formState";
import { ROLES, roleLabel } from "./roles";

function RoleSelect({ value, ar }: { value?: string; ar: boolean }) {
  return (
    <select name="role" defaultValue={value ?? "STAFF"} className="admin-input">
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {roleLabel(r, ar)}
        </option>
      ))}
    </select>
  );
}

// Phase F-UX — Company picker. Maps to User.companyId. Empty string =
// "no company assigned" (cross-tenant roamer / admin). The submitting
// action treats "" as null.
export type CompanyOption = { id: string; code: string; name: string; nameEn: string };
function CompanySelect({
  value,
  ar,
  companies,
}: {
  value?: string | null;
  ar: boolean;
  companies: CompanyOption[];
}) {
  return (
    <select
      name="companyId"
      defaultValue={value ?? ""}
      className="admin-input"
    >
      <option value="">
        {ar ? "بدون شركة (مدير عابر)" : "None (cross-tenant / admin)"}
      </option>
      {companies.map((c) => (
        <option key={c.id} value={c.id}>
          {ar ? c.name : c.nameEn} · {c.code}
        </option>
      ))}
    </select>
  );
}

// Crypto-strong random password matching lib/password.ts (≥12, lower+
// upper+digit). 16 chars, includes symbols, ambiguous chars (O/0, l/1)
// stripped to keep the value typeable from the once-visible reveal.
function generateStrongPassword(): string {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%&*?";
  const all = lower + upper + digits + symbols;
  const rand = new Uint32Array(20);
  crypto.getRandomValues(rand);
  const out: string[] = [
    lower[rand[0] % lower.length],
    upper[rand[1] % upper.length],
    digits[rand[2] % digits.length],
    symbols[rand[3] % symbols.length],
  ];
  for (let i = 4; i < 16; i++) out.push(all[rand[i] % all.length]);
  for (let i = out.length - 1; i > 0; i--) {
    const j = rand[i] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}

function PasswordFieldWithGenerator({
  ar,
  fieldId,
  inputName = "password",
  error,
}: {
  ar: boolean;
  fieldId: string;
  inputName?: string;
  error?: string;
}) {
  const [value, setValue] = useState("");
  const [reveal, setReveal] = useState(false);

  return (
    <label className="admin-field" htmlFor={fieldId}>
      <span className="admin-label">
        {ar
          ? "كلمة المرور (١٢ حرفاً على الأقل، تشمل حرفاً كبيراً وصغيراً ورقماً)"
          : "Password (min 12 chars, must include uppercase, lowercase, and a digit)"}
      </span>
      <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
        <input
          id={fieldId}
          name={inputName}
          type={reveal ? "text" : "password"}
          minLength={12}
          required
          className="admin-input"
          style={{ flex: 1 }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${fieldId}-err` : undefined}
        />
        <button
          type="button"
          className="admin-btn-ghost"
          onClick={() => setReveal((r) => !r)}
          title={ar ? "إظهار/إخفاء" : "Show/hide"}
          aria-label={ar ? "إظهار أو إخفاء كلمة المرور" : "Show or hide password"}
        >
          {reveal ? (
            <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} />
          ) : (
            <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
          )}
        </button>
        <button
          type="button"
          className="admin-btn-ghost"
          onClick={() => {
            const pw = generateStrongPassword();
            setValue(pw);
            setReveal(true);
          }}
          title={ar ? "توليد كلمة مرور قوية" : "Generate strong password"}
        >
          <Wand2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          {ar ? "توليد" : "Generate"}
        </button>
      </div>
      {error ? (
        <span
          id={`${fieldId}-err`}
          role="alert"
          style={{
            display: "block",
            marginTop: 4,
            color: "var(--admin-amber)",
            fontSize: 12,
          }}
        >
          {error}
        </span>
      ) : null}
      {reveal && value ? (
        <span
          style={{
            display: "block",
            marginTop: 4,
            color: "var(--admin-text-muted)",
            fontSize: 12,
            fontFamily: "JetBrains Mono, ui-monospace, monospace",
          }}
        >
          {ar
            ? "احفظ كلمة المرور الآن — لن تُعرض مرة أخرى."
            : "Save this password now — it won't be shown again."}
        </span>
      ) : null}
    </label>
  );
}

export function CreateUserForm({ ar, companies }: { ar: boolean; companies: CompanyOption[] }) {
  const [state, formAction] = useFormState(createUser, initialFormState);
  const errs = state.errors ?? {};
  const fieldId = useId();

  return (
    <details className="admin-section" open={Boolean(state.formError || Object.keys(errs).length)}>
      <summary className="admin-h2" style={{ cursor: "pointer", listStyle: "none" }}>
        <Plus
          className="h-4 w-4"
          strokeWidth={1.5}
          style={{ display: "inline", verticalAlign: "-2px", marginInlineEnd: 6 }}
        />
        {ar ? "مستخدم جديد" : "New user"}
      </summary>
      <form action={formAction} className="admin-form" noValidate>
        <input type="hidden" name="__locale" value={ar ? "ar" : "en"} />
        {state.formError ? (
          <div
            role="alert"
            style={{
              padding: "8px 12px",
              border: "1px solid var(--admin-amber)",
              color: "var(--admin-amber)",
              fontSize: 12,
            }}
          >
            {state.formError}
          </div>
        ) : null}
        {state.ok && state.message ? (
          <div
            role="status"
            style={{
              padding: "8px 12px",
              border: "1px solid var(--admin-cyan-dim)",
              color: "var(--admin-cyan)",
              fontSize: 12,
            }}
          >
            {state.message}
          </div>
        ) : null}
        <div className="admin-grid-2">
          <label className="admin-field">
            <span className="admin-label">{ar ? "الاسم" : "Name"}</span>
            <input name="name" required className="admin-input" aria-invalid={errs.name ? "true" : undefined} />
            {errs.name ? <FieldError msg={errs.name} /> : null}
          </label>
          <label className="admin-field">
            <span className="admin-label">{ar ? "البريد الإلكتروني" : "Email"}</span>
            <input
              name="email"
              type="email"
              required
              className="admin-input"
              aria-invalid={errs.email ? "true" : undefined}
            />
            {errs.email ? <FieldError msg={errs.email} /> : null}
          </label>
          <label className="admin-field">
            <span className="admin-label">{ar ? "الدور" : "Role"}</span>
            <RoleSelect ar={ar} />
            {errs.role ? <FieldError msg={errs.role} /> : null}
          </label>
          <label className="admin-field">
            <span className="admin-label">{ar ? "الشركة (المستأجر)" : "Company (tenant)"}</span>
            <CompanySelect ar={ar} companies={companies} />
            {errs.companyId ? <FieldError msg={errs.companyId} /> : null}
          </label>
          <PasswordFieldWithGenerator ar={ar} fieldId={fieldId} error={errs.password} />
        </div>
        <button type="submit" className="admin-cta-primary">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          {ar ? "إنشاء المستخدم" : "Create user"}
        </button>
      </form>
    </details>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <span
      role="alert"
      style={{
        display: "block",
        marginTop: 4,
        color: "var(--admin-amber)",
        fontSize: 12,
      }}
    >
      {msg}
    </span>
  );
}

type Row = { id: string; name: string; title: string | null; role: string; companyId?: string | null; reportsToId?: string | null };
type ManagerOption = { id: string; name: string; role: string };

export function EditUserForm({ u, ar, companies, managers }: { u: Row; ar: boolean; companies: CompanyOption[]; managers?: ManagerOption[] }) {
  return (
    <form action={updateUser} className="admin-form">
      <input type="hidden" name="id" value={u.id} />
      <div className="admin-grid-2">
        <label className="admin-field">
          <span className="admin-label">{ar ? "الاسم" : "Name"}</span>
          <input name="name" defaultValue={u.name} required className="admin-input" />
        </label>
        <label className="admin-field">
          <span className="admin-label">{ar ? "المسمى الوظيفي" : "Title"}</span>
          <input name="title" defaultValue={u.title ?? ""} className="admin-input" />
        </label>
        <label className="admin-field">
          <span className="admin-label">{ar ? "الدور" : "Role"}</span>
          <RoleSelect value={u.role} ar={ar} />
        </label>
        <label className="admin-field">
          <span className="admin-label">{ar ? "الشركة (المستأجر)" : "Company (tenant)"}</span>
          <CompanySelect value={u.companyId ?? null} ar={ar} companies={companies} />
        </label>
        {/* Always render the picker (passed the FULL roster, not the page
            slice) so the user's current manager is always a selectable option
            — otherwise the select falls back to "None" and Save silently wipes
            the org-chart link. */}
        <label className="admin-field">
          <span className="admin-label">{ar ? "يتبع لـ" : "Reports to"}</span>
          <select
            name="reportsToId"
            defaultValue={u.reportsToId ?? ""}
            className="admin-input"
          >
            <option value="">{ar ? "بدون (جذر الهيكل)" : "None (org root)"}</option>
            {(managers ?? [])
              .filter((m) => m.id !== u.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.role}
                </option>
              ))}
          </select>
        </label>
      </div>
      <button type="submit" className="admin-btn-ghost">
        <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
        {ar ? "حفظ" : "Save"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ id, ar }: { id: string; ar: boolean }) {
  const [state, formAction] = useFormState(resetPassword, initialFormState);
  const errs = state.errors ?? {};
  const fieldId = useId();

  return (
    <form action={formAction} className="admin-form" noValidate>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="__locale" value={ar ? "ar" : "en"} />
      {state.formError ? <FieldError msg={state.formError} /> : null}
      {state.ok && state.message ? (
        <span
          role="status"
          style={{ color: "var(--admin-cyan)", fontSize: 12 }}
        >
          {state.message}
        </span>
      ) : null}
      <PasswordFieldWithGenerator ar={ar} fieldId={fieldId} error={errs.password} />
      <button type="submit" className="admin-btn-ghost">
        <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
        {ar ? "إعادة تعيين" : "Reset"}
      </button>
    </form>
  );
}

export function ActiveToggle({
  id,
  active,
  ar,
}: {
  id: string;
  active: boolean;
  ar: boolean;
}) {
  return (
    <form action={setActive}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <button type="submit" className="admin-btn-ghost">
        {active ? (
          <>
            <UserX className="h-3.5 w-3.5" strokeWidth={1.5} />
            {ar ? "تعطيل" : "Deactivate"}
          </>
        ) : (
          <>
            <UserCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
            {ar ? "تفعيل" : "Activate"}
          </>
        )}
      </button>
    </form>
  );
}

// Hard-delete with a typed confirm. Native window.confirm() is enough
// — Sleek Operator has no modal primitive and the action already
// rejects self-delete / last-admin-stranding on the server.
export function DeleteUserForm({
  id,
  email,
  ar,
}: {
  id: string;
  email: string;
  ar: boolean;
}) {
  return (
    <form
      action={deleteUser}
      onSubmit={(e) => {
        const msg = ar
          ? `حذف المستخدم ${email} نهائياً؟ لا يمكن التراجع.`
          : `Permanently delete ${email}? This cannot be undone.`;
        if (!window.confirm(msg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="admin-btn-danger">
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        {ar ? "حذف المستخدم" : "Delete user"}
      </button>
    </form>
  );
}
