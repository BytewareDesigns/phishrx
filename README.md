# PhishRx

**Multi-channel phishing simulation and security awareness training platform built for healthcare organizations.**

PhishRx is developed by [Medcurity](https://medcurity.com) to help healthcare IT and compliance teams measure and reduce employee susceptibility to phishing attacks across four attack vectors.

---

## Channels

| Channel | Name | Provider |
|---|---|---|
| 📧 Email | Phishing | SendGrid |
| 💬 SMS | Smishing | Twilio |
| 📞 Voice | Vishing | Retell AI |
| 📬 Direct Mail | Dishing | Lob |

---

## Features

- **Multi-tenant** — platform admins manage multiple healthcare organizations; training admins manage their own org
- **Campaign wizard** — 6-step guided setup (details → channels → templates → targets → schedule → launch)
- **Employee management** — add individually or bulk-import via CSV
- **Template library** — phishing/smishing/vishing/dishing templates with difficulty ratings and merge tags
- **Event tracking** — immutable audit log of sent, opened, clicked, reported events per employee per channel
- **Analytics** — catch rate trends, department risk scores, per-campaign breakdowns
- **SSO** — JWT-based single sign-on from the Medcurity platform
- **HIPAA-grade auth** — two-step login, 12-character password policy, 30-minute inactivity timeout

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite 5 |
| UI | Tailwind CSS + shadcn/ui (Radix UI) |
| State | TanStack React Query 5 + Zustand |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions + RLS) |
| Hosting | Azure Static Web Apps |
| CI/CD | GitHub Actions |

---

## Environments

| Environment | Branch | Frontend | Supabase |
|---|---|---|---|
| Staging | `staging` | [orange-cliff-09a77cb10.7.azurestaticapps.net](https://orange-cliff-09a77cb10.7.azurestaticapps.net) | `medcurity-phishrx-staging` |
| Production | `main` | [wonderful-forest-004d79f10.7.azurestaticapps.net](https://wonderful-forest-004d79f10.7.azurestaticapps.net) | `medcurity-phishrx` |

---

## Roles

| Role | Access |
|---|---|
| `master_admin` | Full platform access — all orgs, users, settings |
| `global_admin` | Platform access — all orgs and campaigns |
| `training_admin` | Scoped to their assigned organization |

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Preview production build locally (http://localhost:4173)
npm run preview
```

Requires a `.env` file at the project root:

```env
VITE_SUPABASE_URL=https://zkbrrlbwwckgqepeozjd.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
```
