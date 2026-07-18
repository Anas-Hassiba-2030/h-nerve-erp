"use client";

import { grantPortalAccess, revokePortalAccess } from "./portalActions";

type Account = { email: string; active: boolean; lastLoginAt: Date | null } | null;

export function PortalAccessCard({
  customerId,
  account,
  ar,
}: {
  customerId: string;
  account: Account;
  ar: boolean;
}) {
  return (
    <div className="card card-pad space-y-4">
      <h2 className="font-semibold">{ar ? "بوابة العميل" : "Client portal"}</h2>

      {account ? (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            {account.email} —{" "}
            <span className={account.active ? "badge-emerald" : "badge-red"}>
              {account.active ? (ar ? "مفعّل" : "Active") : ar ? "معطّل" : "Revoked"}
            </span>
          </p>
          {account.active ? (
            <form action={revokePortalAccess}>
              <input type="hidden" name="customerId" value={customerId} />
              <button type="submit" className="btn-ghost text-sm">
                {ar ? "إلغاء الوصول" : "Revoke access"}
              </button>
            </form>
          ) : null}
          <details>
            <summary className="text-sm cursor-pointer" style={{ color: "var(--ink-muted)" }}>
              {ar ? "إعادة تعيين / إعادة تفعيل" : "Reset / re-enable"}
            </summary>
            <form action={grantPortalAccess} className="grid gap-2 sm:grid-cols-2 mt-2">
              <input type="hidden" name="customerId" value={customerId} />
              <input name="email" type="email" defaultValue={account.email} required className="input" placeholder={ar ? "البريد الإلكتروني" : "Email"} />
              <input name="password" type="password" required minLength={8} className="input" placeholder={ar ? "كلمة مرور جديدة" : "New password"} />
              <button type="submit" className="btn btn-primary sm:col-span-2">
                {ar ? "حفظ" : "Save"}
              </button>
            </form>
          </details>
        </div>
      ) : (
        <form action={grantPortalAccess} className="grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="customerId" value={customerId} />
          <input name="email" type="email" required className="input" placeholder={ar ? "البريد الإلكتروني" : "Email"} />
          <input name="password" type="password" required minLength={8} className="input" placeholder={ar ? "كلمة المرور" : "Password"} />
          <button type="submit" className="btn btn-primary sm:col-span-2">
            {ar ? "تفعيل بوابة العميل" : "Grant portal access"}
          </button>
        </form>
      )}
    </div>
  );
}
