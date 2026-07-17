# Templates + Settings (cross-cutting)

Platform-level configuration and document tooling. Grouped under "Global &
Settings".

## Templates
| Item | Purpose | H-Nerve analog |
|------|---------|----------------|
| Printable Templates | Print layouts for invoices/docs | Export/print layer (`lib/export/`) |
| Prefilled Templates | Reusable invoice presets | none |
| Email Templates | Transactional email bodies | none (no outbound email yet) |
| Terms & Conditions | Reusable T&C blocks on documents | none |
| Manage Files/Documents | Central document store | Document Intelligence (`lib/docintel/`), Documents ledger |
| Auto Reminder Rules | Automated overdue/payment reminders | Workflow templates (`lib/workflows/`) |

## Settings
| Item | Purpose | H-Nerve analog |
|------|---------|----------------|
| Account Information | Company profile | Tenant/Account settings |
| Account Settings | Global preferences | theme/i18n cookies + settings |
| SMTP Settings | Outbound mail server | none |
| Payment Methods | Gateways / manual methods | none |
| Auto Number Settings | Document numbering schemes | `generateNumber()` util |
| Tax Settings | Tax definitions + rates | none (no tax engine) |
| Apps Manager | Plugin/app marketplace toggles | industry packs + integrations hub (`lib/integrations/`) |
| System Logo & Color | White-label branding | tenant theming (`lib/brand/themes.ts`) |
| API | API keys / developer access | Living Protocol (`lib/protocol/`), OpenAPI |

## Takeaways for H-Nerve
- **Numbering, tax, and payment-method config** are missing and are prerequisites
  for real invoicing.
- **Email/SMTP + reminder rules** would make Workflows actually notify.
- Branding, apps/plugins, and API surface already have strong H-Nerve analogs —
  parity or better.
