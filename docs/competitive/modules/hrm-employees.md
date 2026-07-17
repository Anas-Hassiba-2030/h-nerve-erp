# HRM / Employees + Payroll Module

**Revised 2026-07-17** — the authenticated base tenant showed only staff+roles,
but Daftra's public `/en/hrm/` + `/en/payroll/` reveal a **full HR + Payroll
suite** (available as modules/apps, not all lit up in the sample tenant). Far
deeper than the earlier "lightweight" read.

## HRM

### Employee records & org structure
- Employee records (manual add + Excel import/export).
- **Organizational structure** (departments, hierarchy).
- Roles → permission sets (the part visible in the base tenant).

### Attendance & leave
- Automatic attendance logs; calculate overtime and shifts.
- Auto-apply lateness policies; leave/attendance/overtime deductions.

### Contracts
- **Contract management with automatic renewals** + renewal notifications.
- Templatized contracts.

### Requests & ESS
- Employee requests (leave, claims, advances).
- **ESS mobile app** (Employee Self-Service) — employees act on their own records.

### Reports
- Employee/performance reports.

## Payroll

### Salary structures
- **Templatized salary structures**; dynamic calculations.
- Built-in **smart salary components**; clearances & allowances.

### Compensation & benefits
- Social benefits; compliance with labor laws.
- **Commissions based on targets**.
- **Loans management** + pay-advance requests.
- Travel & expense reimbursement; financial claims.

### Pay runs
- **Pay runs in multiple currencies**; automatic payslips.
- Contractors & temporary staffing.
- **Track journals & assign cost centers** → posts straight to Accounting.
- Regional compliance: **compatible with Mudad** (Saudi wage-protection system).

## Workflows
1. Role + org structure defined → employee created & assigned → scoped access.
2. Attendance logged → overtime/lateness computed → feeds payroll.
3. Salary structure + components → pay run → payslips → **auto-journal to
   accounting with cost centers**.
4. Contract nears expiry → auto-renewal + notification.

## H-Nerve mapping
- **Auth/RBAC/org**: strong parity — `SessionUser` roles, route RBAC, admin users.
  Gap: granular per-module permissions.
- **Payroll + attendance + contracts + loans + ESS**: **all missing** (🔴). Large
  build if H-Nerve targets HR. The payroll→cost-center→journal chain depends on
  the Accounting engine landing first. See [hnerve-gap-map](../hnerve-gap-map.md).
