<div align="center">

# ⚡ Propel

### The AI-native CRM for outbound sales teams
**Fully managed · enterprise-secure · your data, isolated by design.**

Contacts · Companies · Deals · Pipelines · Sequences · Gmail & Calendar · Automations · Lead scoring · Campaigns · Analytics, **plus a multi-provider, tool-using AI sales assistant.**

<br/>

[![CI](https://img.shields.io/badge/CI-ci%20·%20e2e%20·%20lighthouse-0C8A68?style=flat-square)](.github/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-2688%20·%20~80%25%20cov-0C8A68?style=flat-square)](#-testing--quality-gates)
[![Audit](https://img.shields.io/badge/npm%20audit-critical%20clean-0C8A68?style=flat-square)](#-security-at-a-glance)
[![License](https://img.shields.io/badge/license-Proprietary-555?style=flat-square)](#-license--ownership)

<br/>

![Next.js](https://img.shields.io/badge/Next.js%2015-000000?style=flat-square&logo=next.js&logoColor=white)
![React 18](https://img.shields.io/badge/React%2018-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![PostgreSQL 17](https://img.shields.io/badge/PostgreSQL%2017-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![Gemini](https://img.shields.io/badge/AI-Gemini%20·%20OpenAI%20·%20Anthropic-8E75FF?style=flat-square&logo=googlegemini&logoColor=white)

</div>

---

> **© Propel, proprietary & confidential.** A **commercial SaaS product**, sold by subscription and run as a fully-managed service. This repository is **private and proprietary to Propel; it is not open source.** Access is limited to authorized Propel personnel; no license is granted to copy, distribute, or reuse this code. See [License & Ownership](#-license--ownership).

## ✨ Why Propel

|  |  |
|---|---|
| 🤖 **AI that acts on your data** | A tool-using agent over your **own** CRM, finds contacts/deals, drafts replies, logs activities, suggests the next best move. Multi-provider (**Gemini free by default**, or OpenAI / Anthropic / Mistral); degrades gracefully with no key. |
| 🧠 **Tells you what to do next** | Dashboard **Sales Intelligence**: a ranked next-best-actions list (overdue / closing-soon / stalled deals, hot leads, overdue tasks) + a deals-at-risk roll-up, all from one shared deal-health model. |
| 🏢 **True multi-tenant** | Every row scoped to `organization_id` via JWT claims (`org_id` + `app_role`). **Role-aware Row-Level Security** on ~40 tenant tables (write gated by role at the DB) + server-side RBAC in Edge Functions. |
| 🔐 **Security-first, pentested** | Supabase Auth, **MFA (TOTP)**, AES-256-GCM field encryption, SSRF-hardened webhooks, tamper-evident audit log, **write-enabled + fully-audited** support impersonation. Every CRITICAL/HIGH from a live pentest closed. |
| 📬 **Outbound-native** | Gmail thread sync + send/reply, Google Calendar CRUD, A/B email sequences, lead scoring, no-code automations, multi-pipeline deals with a quote builder, and **compliant marketing campaigns**. |
| 🌍 **6 languages, end to end** | Full app i18n **and** a separately-localized marketing site (landing + 11 subpages) across English · Spanish · Portuguese · French · German · Italian. |

---

## 📑 Contents

[Highlights](#-highlights) · [CRM modules](#-crm-modules) · [Architecture](#-architecture) · [Tech stack](#-tech-stack) · [Security](#-security-at-a-glance) · [Billing](#-billing--plans) · [Observability & analytics](#-observability--analytics) · [Public API & docs](#-public-api--docs-portal) · [Internal setup](#-internal-setup) · [Deploy](#-deploy--environments) · [Testing](#-testing--quality-gates) · [Roadmap](#-roadmap) · [License](#-license--ownership)

---

## 🚀 Highlights

Propel runs on a managed, serverless stack, **Next.js 15 (Vercel) + Supabase (Postgres 17 + Deno Edge Functions)**, with a client-side React SPA shell and a static-rendered marketing site at `/`.

**Recently shipped** (full history in [`CHANGELOG.md`](CHANGELOG.md) · human-readable notes in [`docs/RELEASES.md`](docs/RELEASES.md)):

- 📚 **Developer docs portal** (`/docs`), login-gated, per-account-granted, the complete public-API reference (resources, fields, pagination, filtering, scopes, limits, errors) + a signed-webhook guide, with the live `openapi.json` one click away.
- 📈 **Product analytics + Web Vitals**, PostHog, **consent-gated** (loads only after the visitor accepts analytics), reverse-proxied same-origin; alongside Sentry error tracking and Vercel Speed Insights.
- 🧠 **Sales Intelligence** on the Dashboard, next-best-actions + deals-at-risk, fully client-side.
- 📣 **Campaigns v2**, branded HTML email, scheduling, per-campaign delivery metrics, through the same email-compliance pipeline.
- 🤝 **Support impersonation, write-enabled + audited**, operators can fix customer data; every change is attributed and every request logged to an org-readable access log; GDPR erase stays blocked mid-session; AAL2 required to start.
- ⏳ **Trial lifecycle**, every new org is born with a 14-day Growth trial (Stripe-independent); an hourly job auto-expires lapsed trials.
- 🛡️ **Heavy pentest remediation**, self-signup takeover, plan self-upgrade, bulk-insert limit bypass, tenant self-unsuspend, cross-tenant Realtime leak, SSRF, all closed and live-validated.
- ⚡ **Performance pass for scale**, `React.memo` list rows, incremental Realtime, -185 KB Sentry off the critical path, column-trimmed list payloads, DB index hygiene.

---

## 🧩 CRM modules

| Module | What it does |
|--------|--------------|
| 📊 **Dashboard** | KPI cards, revenue chart, deal funnel, activity heatmap, composable drag-and-drop widgets, **Sales Intelligence** (next-best-actions + deals at risk) |
| 👤 **Contacts** | Table/grid, CSV export, duplicate **detection + merge**, bulk actions, smart views, distribution lists, LinkedIn enrichment |
| 🏢 **Companies** | Grouped LinkedIn industry taxonomy, status/size filters, domain dedup, owner + bulk-assign, revenue tracking |
| 💼 **Deals** | Kanban + list + Calendar + Timeline (Gantt) board views, multi-pipeline, **multiple contacts/stakeholders per deal** (roles), labeled quote builder (save/export/email), deal-rotting + next-activity flags, won/lost reasons |
| ✅ **Activities / Tasks** | Unified feed (Tasks folded in), overdue highlighting, quick complete/delete, RBAC-gated |
| 🧹 **Duplicates** | Real merge for contacts & companies, re-points linked records to a survivor, archives losers (reversible, manager+) |
| 🔎 **Explore** | Ad-hoc report builder (month/source group-by, avg/min/max), single-currency scoping |
| 🎯 **Leads** | Configurable scoring engine, score snapshots, events timeline, bulk actions, **web-to-lead public forms** |
| 🎫 **Tickets** | Help-desk queue (status/priority/assignee, contact/company links), kanban board, photo attachments, threaded discussion |
| 📆 **Booking links** | Calendly-style **branded** public pages (org logo + accent), timezone-correct availability; confirmed bookings create calendar events + activities and send confirmation/reminder emails with a real `.ics` invite |
| 💬 **Updates & @mentions** | Threaded activity updates with teammate @mentions on contacts / companies / deals / leads |
| ⚙️ **Automations** | No-code recipe center (trigger → condition → action); event triggers fire client-side, `follow_up_overdue` runs **server-side** via `automation-runner` |
| ✉️ **Sequences** | A/B email sequences, enrollment management, a Metrics tab (reply/completion funnel + per-step distribution), quiet-hours window |
| 📣 **Campaigns** | Marketing broadcast to a filtered, opted-in audience, branded HTML, scheduling, delivery metrics, through the compliance pipeline |
| 🤖 **AI Assistant** | Multi-provider agent drawer · next-best-action · Inbox summarize + draft reply · **AI Meeting Notes** (transcript → summary/decisions/tasks) · graceful no-key fallback |
| 🎙️ **Meeting Notetaker** | Visibly-named **self-hosted bot** (Attendee) joins Zoom/Meet/Teams, live transcription + talk-time, AI summary + action-item tasks **auto-attached to the matched deal**; per-user auto-dispatch (ships dark until the bot is provisioned) |
| 📥 **Inbox** | Gmail OAuth, thread sync, send/reply/compose, **send-from verified send-as alias**, **rule-based follow-up suggestions**, recipient chips, labels, keyboard shortcuts, snooze, redesigned to Gmail-caliber |
| 📅 **Calendar** | Google Calendar sync, event create/edit/delete (Meet links), month/week/day/agenda |
| 📈 **Analytics** (`/analytics`) | One hub with tabs: **Reports** (revenue, Won/Lost, funnel, email open/click), **Forecast** (weighted pipeline + health), **Manager** dashboard |
| 🛡️ **Admin** | Super-admin console: org & plan management, suspend/unsuspend, CSV export, server-side search, per-user docs grants, security + impersonation audit logs, **audited impersonation** |
| 🔌 **Public API & Docs** | API-key REST API (scopes, org-scoped, rate-limited), signed webhooks, and the login-gated `/docs` portal |
| ⚙️ **Settings** | Team/roles + email invites, MFA, API keys, connections marketplace, branding, custom fields, permission profiles, pipelines |

---

## 🏗️ Architecture

```
Browser
  │
  ├── Next.js 15 (Vercel)
  │     ├─ /                    → marketing landing + subpages (static, localized)
  │     └─ /login /contacts …   → ClientApp (React-Router SPA shell, ssr:false)
  │
  ├── CRM CRUD ──→ Supabase PostgREST         (direct; RLS = organization_id + role)
  │     └─ contacts · companies · deals · leads · activities · tickets · updates
  │        sequences · automations · products · pipelines · booking-pages · campaigns
  │
  ├── Integrations ──→ Edge Functions (propel-api)
  │     └─ /ai · /gmail · /calendar · /automations · /pipelines · /billing
  │        /privacy (GDPR) · /custom-fields · /goals · /audit · /webhooks · /admin · /docs
  │
  ├── Public routes ──→ Edge Functions
  │     └─ public-api (/v1) · public-forms (/forms/<token>) · public-booking (/book/<token>)
  │
  ├── Webhooks & jobs ──→ Edge Functions
  │     └─ stripe-webhook · zoom-webhook · email-track (open/click + unsubscribe + resend-webhook)
  │        email-runner (pg_cron sends) · automation-runner (pg_cron triggers)
  │
  └── Realtime ──→ Supabase Realtime (postgres_changes, per-table organization_id filter)
```

**Tenant isolation** rides on the **session JWT** (`org_id` + `app_role` claims injected by the `custom_access_token_hook`), not on subdomains, all tenants share `propeltech.es`, and RLS keeps their data apart. **9 Edge Functions**; `_shared/` is a library. See [`CLAUDE.md`](CLAUDE.md) for the full engineering guide and [ADR 0002](docs/adr/0002-rls-enforcement-post-migration.md) for the RLS enforcement model.

---

## 🧱 Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | **Next.js 15** App Router · React 18 · TypeScript 5 · Tailwind 3 · Zustand · React Hook Form + Zod |
| Charts / Icons | Recharts · lucide-react |
| Auth | **Supabase Auth**, email/password · MFA (TOTP) · custom JWT claims |
| Database | **Supabase PostgreSQL 17**, PostgREST · 76 migrations · role-aware RLS |
| Realtime | **Supabase Realtime**, per-table, org-filtered channels |
| Serverless | **Supabase Edge Functions** (Deno), integrations, AI, public routes, cron jobs |
| Deploy | **Vercel**, preview URLs · env vars · CSP (`vercel.json`) |
| Encryption | AES-256-GCM (field-level OAuth/webhook secrets) |
| 🤖 AI | Google Gemini (free default) · OpenAI · Anthropic · Mistral |
| Email / Payments | Gmail API · Resend / SMTP · Stripe |
| Observability | **Sentry** (errors + replay, same-origin tunnel) · **PostHog** (product analytics + Web Vitals, consent-gated) · Vercel Speed Insights |
| Testing | Vitest (**2,688** unit + component tests, ~80% cov) · live RLS test · Playwright e2e crawl |

---

## 🔐 Security at a glance

| Concern | Implementation |
|---------|---------------|
| Authentication | Supabase Auth, email/password, refresh tokens, optional **TOTP MFA** (enforced at aal2 in the JWT hook) |
| Multi-tenant isolation | **Role-aware RLS** on ~40 tenant tables (`organization_id = jwt_org_id()`, write gated by `jwt_role()`); Edge Functions use the same JWT-scoped client, `service_role` reserved for admin/webhook/token paths ([ADR 0002](docs/adr/0002-rls-enforcement-post-migration.md)) |
| RBAC | owner / admin / manager / sales_rep / viewer, enforced in Edge Functions **and** at the DB (3-tier write policies + a `profiles` privilege-lock trigger blocking self-escalation) |
| Audited impersonation | Support sessions are **write-enabled + fully audited** (2026-07-15): admin-level write over the target org, every change attributed to the operator, every edge request logged to an org-readable `support_access_log`; GDPR erase blocked mid-session; AAL2 required to start |
| Realtime isolation | `postgres_changes` bound **per table** with a server-side `organization_id` filter, no cross-tenant wire leak |
| Plan-limit integrity | contacts/deals/pipelines caps enforced by per-row **and** AFTER-STATEMENT triggers (bulk-INSERT-proof) |
| Rate limiting | Per-IP fixed-window limits on public Edge Functions (`public-api` 60/min, forms/booking 30/min), **fail-open** |
| SSRF | Outbound webhook targets validated against private ranges at save **and** before each delivery; **fails closed** on unresolvable hosts |
| Secrets / crypto | AES-256-GCM for every integration secret at rest; constant-time compare on inbound webhook signatures; service-role key server-only |
| Payments | Stripe webhook idempotent (`stripe_webhook_events` ledger dedupes at-least-once) |
| Compliance | Tamper-evident security-event + audit logs · admin-gated **GDPR** export/erasure (`/privacy`) |
| Supply chain | `npm audit --omit=dev --audit-level=critical` in CI |

📄 [Disaster-recovery runbook](docs/disaster-recovery.md) · 🪪 [SSO/SCIM design intent](docs/sso-and-scim.md) · 📋 [Backlog](docs/BACKLOG.md) · 🗺️ [Maturity map](docs/MASTER_PLAN.md) · ⚖️ [Legal & privacy docs](docs/legal/README.md)

---

## 💳 Billing & plans

Stripe (`stripe@17.7.0`, API `2025-03-31.basil`). **No free tier.** Exactly **4 active monthly plans**: **Starter €39 · Growth €79 · Business €149 · Enterprise €299**.

- **Trial lifecycle:** `create_organization()` grants every new org a **14-day `trialing` Growth subscription at birth** (Stripe-independent), an hourly `expire_trials()` pg_cron flips lapsed trials to `expired`, and `entitlements.ts` also enforces expiry at read time. Self-service signup works with **no Stripe configured**; Stripe only converts trials to paid.
- **Entitlements** resolve live feature/seat gates (`GET /billing/entitlements`, `/billing/usage`), enforced server-side for Gmail/Calendar/Slack/Zoom/webhooks/seats and in the UI.
- Endpoints **503 gracefully** without `STRIPE_SECRET_KEY`.

---

## 📊 Observability & analytics

| Tool | Purpose | Gating |
|------|---------|--------|
| **Sentry** | Browser error tracking + session replay + Web Vitals breadcrumbs | On when `NEXT_PUBLIC_SENTRY_DSN` is set; envelopes **tunneled same-origin** through `app/monitoring/route.ts` so ad-blockers can't drop them |
| **PostHog** | Product analytics (pageviews, business events, funnels) + Web Vitals | On when `NEXT_PUBLIC_POSTHOG_KEY` is set **and** the visitor accepts analytics in the cookie banner, posthog-js isn't even downloaded otherwise. EU region, reverse-proxied via `/ingest` |
| **Vercel** | Cookieless pageviews + real-user Speed Insights | Always on (mounted in the root layout) |

PostHog captures consent-gated business events (`user_logged_in`, `user_signed_up`, `checkout_started`, `campaign_sent`, `lead_created`, …) via `safeCapture`/`safeIdentify`, which no-op until the consent gate passes. **Consent is opt-in only** (LSSI-CE / ePrivacy).

---

## 🔌 Public API & docs portal

- **Public REST API v1.4** (`public-api` Edge Function): API-key auth (`x-api-key`), per-resource **scopes** (fail-closed), **10 resources** with bulk writes + bulk delete, nested reads, cursor pagination + incremental sync, `Idempotency-Key` on POST, filtering + sorting, plan-limit enforcement on create (writes 402 for a billing-locked org, reads stay open), IP + key rate limits (with response headers), and a live **OpenAPI 3.1** document at `GET /openapi.json`. A zero-dep **TypeScript SDK** ships from `sdk/propel.ts`. Full reference: [`docs/api-public.md`](docs/api-public.md).
- **Signed webhooks:** `X-Propel-Signature: sha256=<hex HMAC>` + `X-Propel-Event`, configured under Settings → Connections.
- **`/docs` portal:** the same reference rendered in-app, login-gated, granted per account (super-admins always in; others request access, a super-admin approves from Admin → Users).

> **Not implemented yet:** `/auth/sso` (OIDC) and `/scim/v2` are **design intent only** ([`docs/sso-and-scim.md`](docs/sso-and-scim.md), [`docs/BACKLOG.md`](docs/BACKLOG.md)).

---

## 🛠️ Internal setup

> **Propel is sold as a fully-managed, subscription SaaS**, there is nothing to self-host and the source is **not distributed**. The steps below are **internal engineering setup** for authorized Propel developers, not a public "get started" guide.

**Requirements:** Node 22+, a Supabase project.

```bash
# 1. Install
git clone https://github.com/Davmunrey/CRM-Project.git && cd CRM-Project && npm ci

# 2. Env
cp .env.example .env.local          # fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Database
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push

# 4. Run
npm run dev                          # → http://localhost:3000

# 5. (optional) Deploy the 9 Edge Functions
npx supabase functions deploy --use-api --project-ref YOUR_PROJECT_REF
```

**Key env vars** (`.env.local` for the app; Supabase secrets for Edge Functions, see [`.env.example`](.env.example)):

| Variable | Req | Description |
|----------|-----|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | ✅ | Supabase project URL + browser-safe anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | – | Server-only; never expose to the browser |
| `NEXT_PUBLIC_SENTRY_DSN` | – | Sentry (public by design; tunneled same-origin) |
| `NEXT_PUBLIC_POSTHOG_KEY` / `_HOST` | – | PostHog (public key; consent-gated; EU host default) |
| `GEMINI_API_KEY` | – | AI (free default provider), Edge Function secret |
| `GOOGLE_CLIENT_ID` / `_SECRET` | – | Gmail + Calendar OAuth, Edge Function secret |
| `STRIPE_SECRET_KEY` / `_WEBHOOK_SECRET` | – | Billing, Edge Function secret |
| `RESEND_API_KEY` / `_FROM` / `_WEBHOOK_SECRET` | – | Email send + bounce/complaint webhook, Edge Function secret |

---

## ☁️ Deploy & environments

Two long-lived branches, both pointing at **one production Supabase** (there is no separate DB staging):

| Environment | Branch | Domain |
|-------------|--------|--------|
| **Production** | `production` (GitHub default) | `propeltech.es`, the only branch Vercel deploys live |
| **Preview / integration** | `staging` · any push / PR | immutable `*.vercel.app` build |

Ship by opening a PR **into `staging`**, then promote `staging` → `production` (fast-forward) **on the maintainer's explicit OK**. `production` is the live site.

**Automation** (GitHub repo secrets are the source of truth):
- [`deploy.yml`](.github/workflows/deploy.yml), on push to `production` touching `supabase/functions/**`, deploys Edge Functions + syncs their runtime secrets.
- [`vercel-env-sync.yml`](.github/workflows/vercel-env-sync.yml), manual, upserts `NEXT_PUBLIC_*` + service-role key into Vercel.
- [`backup.yml`](.github/workflows/backup.yml), nightly encrypted `pg_dump`.

---

## 🧪 Testing & quality gates

```bash
npm run check:branding    # no legacy product names in source
npm run typecheck         # tsc --noEmit
npm run lint:ci           # ESLint (max-warnings 200)
npm run test:run          # Vitest, 2,688 tests / 306 files, ~80% coverage
npm run build             # production build
npm audit --omit=dev --audit-level=critical
npm run e2e               # Playwright crawl (build + serve + crash/nav/route-protection fatal)
```

The suite spans **pure logic** (utils/lib), **stores** (optimistic-write + rollback), **row mappers**, **entitlements/RBAC**, and **render + interaction tests for every view and component**, plus a **live RLS test** ([`tests/rls/run.sh`](tests/rls/run.sh)) that exercises the role-aware policies against a real project.

**CI jobs** on each PR: `ci`, `e2e`, `lighthouse`, plus **Vercel**. Merge only when green.

---

## 🗺️ Roadmap

**Maturity by pillar** (full map in [`docs/MASTER_PLAN.md`](docs/MASTER_PLAN.md)): platform, multi-tenancy/security, billing, compliance, AI, integrations and design are all at **L3** (hardened, verified against code). The open fronts:

- [ ] **Enterprise SSO (OIDC) + SCIM 2.0**, the biggest gap (**L0**, design intent only); the key enterprise unlock ([`docs/specs/sso-oidc-scim.md`](docs/specs/sso-oidc-scim.md))
- [ ] **Scale**, currently Supabase **free tier** (~200-concurrent ceiling); Pro + compute add-on, then list virtualization + true server-side pagination
- [ ] **Reliability / DR (L1 → L3)**, nightly encrypted backups run; full HA + automated restore drills still open
- [ ] **Testing (L2 → L3)**, cross-tenant RLS assertions + e2e as CI merge gates
- [x] Role-aware RLS, GDPR DSAR, MFA, super-admin console, audited impersonation, billing tiers v2 + trials, email-marketing compliance, campaigns, docs portal, product analytics

---

## 🌍 Internationalization

Fully translated UI in **6 locales** (en · es · pt · fr · de · it). `en` is the typed source of truth; `es`/`pt` are full catalogs; `de`/`fr`/`it` inherit via spread ([`i18n/`](i18n/)). The **marketing site** has its own separate copy module ([`i18n/marketing/`](i18n/marketing/)) with tsc-enforced 6-locale parity, plus a nav/footer language switcher sharing the app's saved preference.

---

## 📄 License & ownership

Propel is **proprietary, closed-source software**. **© 2026 Propel** ([propeltech.es](https://propeltech.es)), **all rights reserved**.

This repository and everything in it are the confidential property of Propel. **No license, open source or otherwise, is granted.** You may not copy, modify, distribute, sublicense, sell, publish, or create derivative works from any part of this codebase without Propel's prior written permission. Access is limited to authorized Propel personnel and contractors bound by confidentiality.

Propel is delivered **exclusively as a hosted, subscription SaaS** at [propeltech.es](https://propeltech.es), no self-hosted, community, or free-tier distribution, and the source is never shipped to customers.

---

<div align="center">

**Propel** · Commercial SaaS · **© 2026 Propel, proprietary & confidential, all rights reserved** · _Last updated: 2026-07-16_

</div>
