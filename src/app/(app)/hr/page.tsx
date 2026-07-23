// /hr has no console of its own — the suite lives in its children
// (employees, attendance, leave, payroll). Without this index, hitting
// /hr directly 404s (caught by e2e/nav.spec.ts). Land on the roster.
import { redirect } from "next/navigation";

export default function HrIndexPage() {
  redirect("/hr/employees");
}
