"use client";

// Client forms for /admin/users (Phase 4). Plain named inputs the
// server actions read from FormData. Sleek Operator classes only.
// ROLES comes from ./roles (a plain module — never from the
// "use server" actions file).

import { Plus, Save, KeyRound, UserCheck, UserX } from "lucide-react";
import { createUser, updateUser, resetPassword, setActive } from "./actions";
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

export function CreateUserForm({ ar }: { ar: boolean }) {
  return (
    <details className="admin-section">
      <summary className="admin-h2" style={{ cursor: "pointer", listStyle: "none" }}>
        <Plus className="h-4 w-4" strokeWidth={1.5} style={{ display: "inline", verticalAlign: "-2px", marginInlineEnd: 6 }} />
        {ar ? "مستخدم جديد" : "New user"}
      </summary>
      <form action={createUser} className="admin-form">
        <div className="admin-grid-2">
          <label className="admin-field">
            <span className="admin-label">{ar ? "الاسم" : "Name"}</span>
            <input name="name" required className="admin-input" />
          </label>
          <label className="admin-field">
            <span className="admin-label">{ar ? "البريد الإلكتروني" : "Email"}</span>
            <input name="email" type="email" required className="admin-input" />
          </label>
          <label className="admin-field">
            <span className="admin-label">{ar ? "الدور" : "Role"}</span>
            <RoleSelect ar={ar} />
          </label>
          <label className="admin-field">
            <span className="admin-label">
              {ar ? "كلمة المرور (٨ أحرف على الأقل)" : "Password (min 8)"}
            </span>
            <input name="password" type="password" minLength={8} required className="admin-input" />
          </label>
        </div>
        <button type="submit" className="admin-cta-primary">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          {ar ? "إنشاء المستخدم" : "Create user"}
        </button>
      </form>
    </details>
  );
}

type Row = { id: string; name: string; title: string | null; role: string };

export function EditUserForm({ u, ar }: { u: Row; ar: boolean }) {
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
      </div>
      <button type="submit" className="admin-btn-ghost">
        <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
        {ar ? "حفظ" : "Save"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ id, ar }: { id: string; ar: boolean }) {
  return (
    <form action={resetPassword} className="admin-form">
      <input type="hidden" name="id" value={id} />
      <label className="admin-field">
        <span className="admin-label">
          {ar ? "كلمة مرور جديدة (٨ أحرف على الأقل)" : "New password (min 8)"}
        </span>
        <input name="password" type="password" minLength={8} required className="admin-input" />
      </label>
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
