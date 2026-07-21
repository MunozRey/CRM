# Propel CRM, Engineering Guide

AI-native, multi-tenant B2B CRM for outbound sales teams. Commercial SaaS in
production. Read this before changing anything, it encodes the architecture, the
security model, and the hard rules that keep prod safe.

- **Repo:** `github.com/Davmunrey/CRM-Project` · default branch **`production`** (live, Vercel deploys only this to propeltech.es) · integration branch **`staging`** (renamed from the historical misspelled `stagging` on 2026-07-17; update any stale local refs)
- **Frontend host:** Vercel · **Backend:** Supabase (Postgres + Edge Functions)
- **Supabase project ref:** `fhugkidzcojrnalvqvln` · **Domain:** propeltech.es
- **Brand:** green `#0C8A68`, ink `#0C1F1A`, mint `#44C2A0`; display font Schibsted Grotesk

---

## 1. Golden rules (read first)

1. **Never commit secrets, `.env`, or `sbp_`/`SUPABASE_ACCESS_TOKEN` values.** The
   `sbp_` token is for the Supabase CLI only, never echo it. Rotate any token pasted in chat.
2. **Selective git staging only, never `git add .`.** Stage the exact paths you changed.
3. **Do NOT edit i18n locale files** unless the task is explicitly about copy:
   `i18n/{en,es,pt,de,fr,it}.ts` and `i18n/workflowLibrary/*`. New UI text must reuse
   existing keys; adding a key means touching every locale (6-locale parity is enforced
   by `tsc` via the `Translations` type — a missing key is a type error).
   (The **marketing** site copy is a SEPARATE module, `i18n/marketing/`, with tsc-enforced
   6-locale parity, not the app dictionary; see §6.)
4. **Keep files under ~500 lines.** Prefer editing existing files over creating new ones;
   never create docs unless asked. (Oversized screens get split into sub-modules, e.g. Calendar
   → `views/calendar/*` and Admin → `views/admin/*`.)
5. **Read a file before editing it.** Match the surrounding style.
6. **One prod Supabase, treat every change as prod.** There is no database staging (Supabase
   free tier, 2-project cap): Vercel Preview, `staging`, and `production` all point at the same
   prod Supabase, so preview/`staging` data IS prod data. The `staging`→`production` split is a
   **git + Vercel** promotion flow (`production` = the live site), NOT a separate backend, don't
   conflate them (§8).
7. **Validate input at system boundaries** (edge functions, public API). RLS is the last
   line of defense, not the only one, see §4.
8. **Run the full check suite before pushing** (§7). `tsc` + `lint` alone is not enough.

---

## 2. Stack & layout

- **Frontend:** Next.js 15 (App Router). The app is a client SPA: `app/[[...slug]]`
  renders `ClientApp` (`ssr: false`) which mounts `react-router`. `/` is the marketing
  `PropelLanding`; `/about|blog|careers|contact|privacy|terms|gdpr` are static pages.
  React 18, TypeScript, Zustand stores, Tailwind. Vitest for tests.
- **Backend:** Supabase Postgres with Row-Level Security; Deno Edge Functions.
- **CRM CRUD goes DIRECT to PostgREST** via `lib/supabase/crmApi.ts`, not through an
  edge function. Edge functions handle everything PostgREST can't (auth-context logic,
  third-party APIs, webhooks, AI, billing, the public API).

```
app/                 Next routes (SPA shell + marketing pages)
components/          UI; components/integrations, components/ai, components/billing, components/layout
views/               Route-level screens (react-router)
store/               Zustand stores (aiStore, billingStore, settingsStore, ticketsStore, …)
lib/                 api.ts (edge client), supabase/crmApi.ts (PostgREST), integrationsCatalog.ts
i18n/                Locale files, DO NOT EDIT casually (see rule 3)
services/            Client-side integration/service helpers
supabase/functions/  Deno edge functions (see §5)
supabase/migrations/ SQL migrations (apply via CLI --file, see §6)
tests/               Vitest unit/component + tests/e2e (node runner) + tests/rls
scripts/             check-branding, ui-lint, i18n-lint, backup-prod
docs/                Reference docs (api-public.md, RELEASES.md, integration-logos.md, reviews/)
```

---

## 3. Multi-tenancy & auth

- Every user belongs to one organization. Tenancy rides on **JWT claims** `org_id` and
  `app_role`, injected by the `custom_access_token_hook` Postgres function (also supports
  a super-admin **impersonation** override).
- **Onboarding:** new user → `handle_new_user` trigger creates a `profiles` row → the user
  calls the `create_organization()` RPC (sets role `owner`) → refresh the session to pick
  up the new claims.
- **Roles:** `owner`, `admin`, `manager`, `sales_rep`, `viewer`. Super-admin is a separate
  `profiles.is_super_admin` flag (read from the verified profile, never client input) that
  gates the entire `/admin/*` surface.
- Edge functions get auth via `getAuthContext(req)` → `{ userId, orgId, role, isSuperAdmin, supabase }`.
  `ctx.supabase` is an **RLS-scoped** client (the caller's JWT). `serviceClient()` bypasses
  RLS, use it only when you must, and always scope by `organization_id` yourself.

---

## 4. Row-Level Security (the security boundary)

RLS policies use SQL helpers: `jwt_org_id()`, `jwt_role()`, `jwt_can_write()`,
`jwt_is_admin()`, and `jwt_has_permission(perm)` (reads
`organizations.settings->'app'->'permissionProfiles'` for RBAC). Every tenant table is
org-scoped. Server-side RBAC enforcement backs the permission-profile UI.

**Defense in depth is required, not optional:**
- When using `serviceClient()` (RLS bypassed), you MUST filter by `organization_id`.
- **Support sessions are WRITE-ENABLED + audited (2026-07-15, reverses the earlier
  read-only stance).** An operator impersonating an org has admin-level write over it
  (`ctx.orgId` = the impersonated org; the RLS write gates `jwt_can_write`/`jwt_is_admin`/
  `jwt_has_permission` no longer block impersonation, see `20260715120000`). Every change is
  attributed by `audit_row_change()` (writes, flagged with the operator + target org) and
  every edge-routed request by `support_access_log` (access). `assertNotImpersonating(ctx)`
  is now a documented **no-op** (kept as the single choke point if read-only is ever
  reinstated). **Two categories stay blocked mid-session:** (1) irreversible destruction —
  `assertNotImpersonatingIrreversible(ctx)` gates GDPR erase (anonymize + permanent ban) in
  `privacy.ts`; (2) **contacting third parties** (2026-07-16) — an operator must not reach the
  org's external contacts/leads on its behalf. `assertNotImpersonatingOutbound(ctx)` gates the
  edge send paths (`/email/send`, `/smtp/test`, `/sequences/enrollments`, `POST/PATCH/DELETE
  /calendar/`), and a DB backstop (RESTRICTIVE INSERT policies on `scheduled_emails` +
  `sequence_enrollments`, migration `20260716191630`) blocks the PostgREST + `email-runner`
  paths (manual compose, bulk email, campaigns, sequence enroll) that never hit an edge fn —
  including the browser-direct Gmail send, which enqueues to `scheduled_emails` first. The
  client mirrors this (`useImpersonation()` disables compose send + the bulk/campaign/enroll/
  calendar triggers). Exit the session to contact anyone.
- Set protected columns (`organization_id`, `user_id`, ids) **after** any client-body
  spread so a payload can't override ownership.
- Validate ownership of referenced ids at the boundary; don't rely on RLS alone for authz.
- Never surface raw Postgres/PostgREST error text to public clients (leaks schema).
- Client-writable privilege/billing surfaces are locked: `profiles` has no client
  INSERT/DELETE (created by `handle_new_user`, deleted via auth cascade), `subscriptions` is
  read-only to clients (Stripe-webhook writes only), `organizations.status`/`plan` are
  pinned by trigger, and `email_suppressions` is read-only to members (all writes go through
  service-role edge paths: unsubscribe route, Resend webhook, runner), don't "restore" client
  writes to these.
- **Realtime** (`lib/realtimeSubscriptions.ts`) subscribes per-table with a server-side
  `filter: organization_id=eq.<orgId>`, keep any new realtime binding org-filtered (a
  schema-wide binding leaks every tenant's payloads to every socket).

---

## 5. Edge functions (`supabase/functions/`)

| Function | Purpose |
|---|---|
| `propel-api` | Internal API router → `_shared/handlers.ts`. Auth via `getAuthContext`, per-user rate limit, `/health`, request-id. |
| `public-api` | Public REST API v1. API-key auth (`x-api-key`), scopes, IP+key rate limits, OpenAPI at `/openapi.json`. Config-driven CRUD in `_shared/publicApiResources.ts`. |
| `public-forms` / `public-booking` | Unauthenticated lead-capture forms and booking pages (token-based). |
| `email-runner` | pg_cron drains `scheduled_emails` + sequence steps server-side (works app-closed). Gmail/Resend/SMTP. Enforces marketing compliance on marketing sends (suppression check + per-org daily cap `MARKETING_DAILY_CAP`=500 + unsubscribe footer/`List-Unsubscribe` headers). Stays `verify_jwt=true` (see below). |
| `automation-runner` | pg_cron evaluates the time-based `follow_up_overdue` automation trigger server-side (idempotent, capped, additive-only), so automations don't need an open browser tab. Stays `verify_jwt=true` (same story as email-runner). |
| `email-track` | Open/click tracking pixel + link redirects for sent email. Also `/unsubscribe` (RFC 8058 one-click opt-out, HMAC-signed self-verifying token, GET confirm page + POST one-click) and `/resend-webhook` (Resend bounce/complaint → suppression; Svix-verified via `RESEND_WEBHOOK_SECRET`, accept-and-log until set). Unauthenticated (`verify_jwt=false`); the token/signature is the credential. |
| `stripe-webhook` / `zoom-webhook` | Provider webhooks. Signature-verified; `verify_jwt=false`. |
| `meeting-webhook` | Notetaker-bot ingest (one global endpoint; tenant resolved from the globally-unique `external_bot_id`, NOT the URL). HMAC over the raw body via `MEETING_BOT_WEBHOOK_SECRET`, **accept-and-log until set**. `verify_jwt=false`. Vendor-neutral adapters in `_shared/meetingBot/` (Attendee wired). |
| `meeting-runner` | pg_cron auto-dispatch: sends a notetaker bot to `calendar_events` with a video link for users who opted in (`profiles.meeting_auto_dispatch`, per-USER since #484). Service-role, `verify_jwt=true` (same story as email-runner). Dark until the bot API is configured. |

11 functions total; `_shared/` is a library, not a deployed function. Deploy all: `supabase functions deploy --use-api --project-ref fhugkidzcojrnalvqvln` (`--use-api` bundles server-side, no Docker; `functions deploy` rejects `--linked`).

Shared modules in `_shared/`: `auth.ts` (`getAuthContext`, memoised `serviceClient`,
`toSnake`), `handlers.ts` (internal API domains), `aiAgent.ts` (agentic AI, §6),
`entitlements.ts` (plan features/limits), `google.ts` / `slack.ts` / `zoom.ts` (OAuth +
APIs), `emailOutbound.ts`, `crypto.ts` (AES-GCM secret box, HMAC), `ssrf.ts`
(`assertPublicHttpsUrl`, always guard outbound URLs), `rateLimit.ts`, `http.ts`
(`fetchWithTimeout`, wrap EVERY external fetch), `cors.ts`, `dispatch.ts`,
`publicApiResources.ts` / `publicApiOpenApi.ts`, `privacy.ts`, `integrations.ts`,
`emailCompliance.ts` (suppression list + one-click unsubscribe tokens/headers/footer, §6).

### The `verify_jwt=false` pattern (critical)

The Supabase gateway pre-validates the JWT before a function runs **if `verify_jwt=true`**.
An expired token then gets a **CORS-less 401**, which the browser surfaces as
`Failed to fetch`. Any **browser-facing** function that does its OWN auth (`getAuthContext`)
or is called unauthenticated MUST set `verify_jwt = false` in `supabase/config.toml` AND
deploy with `--no-verify-jwt`. This applies to `propel-api`, `public-api`, `stripe-webhook`,
`zoom-webhook`, `public-forms`, `public-booking`, `email-track`.

**Exception, `email-runner` AND `automation-runner` must stay `verify_jwt = true`.** Both are
invoked server-to-server by pg_cron (no browser, so no CORS-less-401 problem) carrying the
service_role key, and their auth check decodes the `role` claim WITHOUT verifying the
signature, it relies on the gateway having validated it. Flipping either to `false` would let
anyone forge `{"role":"service_role"}` and drive the runner. See the comments on
`[functions.email-runner]` / `[functions.automation-runner]` in `config.toml`.

---

## 6. Notable subsystems

- **Agentic AI** (`_shared/aiAgent.ts`, `/ai/agent`): Gemini function-calling loop over an
  RLS-scoped toolset. Read tools (`find_deals`, `find_contacts`, plus the `get_deal` /
  `get_contact` depth tools) always on; write tools (`create_task`, `update_deal_stage`,
  `create_lead`) only when the user enables "allow actions" (`allowWrites`) AND `ctx.role`
  can write. Proposed writes surface as an **editable draft** the user can tweak before
  approving. Mutations go through `ctx.supabase` (RLS = final gate). Requires
  `GEMINI_API_KEY` (or `OPENAI_API_KEY`) edge secret; the OpenAI-compat path accounts for
  token usage like the Gemini path. **Governance + personalization:** org-level policy in
  **Settings → AI** (`views/settings/AiSection.tsx`); **per-user instructions** persisted
  server-side on `profiles.ai_instructions` (migration `20260718140000`) so they follow the
  user cross-device and thread into the agent as `userInstructions`; conversations persist
  and are browsable via **history** (`/ai/conversations`). Assistant replies render as
  sanitized markdown (`utils/assistantMarkdown`, aria-live); stale results are dropped when
  the user switches record/context mid-request; empty-state suggestions are role-aware.
- **Boneyard / keep-alive nav** (`components/layout/KeepAliveOutlet.tsx`,
  `contexts/KeepAliveContext.ts`): the AppShell renders route panes through a keep-alive
  outlet instead of a plain `<Outlet/>`. Param-less list routes (dashboard, contacts, leads,
  companies, deals, activities, inbox, campaigns, calendar, analytics, sequences, products,
  tickets, timeline, goals) are cached in a **5-entry LRU** and parked with `display:none`
  instead of unmounting, so revisiting is instant (no refetch/re-render, scroll restored on
  `#main-content`). Parked panes get a **frozen react-router `LocationContext`** (a stable
  tree shape — every pane wrapped in the Provider — prevents remount; freezing stops parked
  panes reading the wrong params / reacting to unrelated nav). A live `KeepAliveActiveContext`
  carries the active pathname so `ProtectedPage` re-sets the page title on return and
  `Modal`'s `OverlayPortal` **suppresses body portals of parked panes** (else a parked
  screen's modal would leak over the active one). Both contexts are `null` outside the
  router, so the primitives stay backward-compatible. Add a new cacheable route only if it's
  param-less and safe to keep mounted.
- **Observability (Sentry):** browser error tracking + session replay + web vitals via
  `@sentry/react`, booted once in `components/SentryBoot.tsx` → `lib/sentry.ts`, only when
  `NEXT_PUBLIC_SENTRY_DSN` is set (inlined at build, so set it in **Vercel** env + redeploy; the
  DSN is public by design, it ships in the client bundle). Envelopes are **tunneled same-origin**
  through the route handler `app/monitoring/route.ts` (`tunnel: '/monitoring'`) so ad/tracker
  blockers can't drop them (`net::ERR_BLOCKED_BY_CLIENT`); that route validates each envelope's DSN
  against our own project before forwarding (never an open relay), so **don't delete it**. Vercel
  `@vercel/analytics` + `@vercel/speed-insights` are also mounted in the root layout (cookieless
  pageviews + real-user Web Vitals).
- **Product analytics (PostHog):** `lib/posthog.ts` + `components/PostHogBoot.tsx`, gated on
  `NEXT_PUBLIC_POSTHOG_KEY` (EU host `NEXT_PUBLIC_POSTHOG_HOST`, default `eu.i.posthog.com`).
  **Consent-gated by design (LSSI-CE):** posthog-js is dynamic-imported and initialised ONLY after
  the visitor accepts analytics in `CookieConsent` (`localStorage propel_cookie_consent === 'all'`),
  so the ~73KB posthog-js chunk is never even downloaded for an essential-only choice; accepting
  live-boots it with no reload. Web Vitals via PostHog's `capture_performance.web_vitals`. No-op
  when the key is unset. Note: the consent banner only renders on the marketing site, so in-app-only
  visitors stay un-tracked until an in-app consent control exists (deliberate, compliant default).
  **Traffic is reverse-proxied same-origin** (`api_host: '/ingest'`, `ui_host` = real host; the
  `/ingest` rewrites live in `next.config.ts`) to dodge ad-blockers. Business events go through
  `safeCapture`/`safeIdentify` (in `store/authStore.ts` + the Campaigns/ChoosePlan/Leads/OrgSetup/
  Sequences/DealsPage views), which **no-op until `initialized`** (i.e. until consent), so they're
  consent-gated too. `lib/posthog-server.ts` (posthog-node) exists but is currently **unused**
  (defined, never called). This landed via the PostHog wizard's PR #375 on top of the hand-rolled
  base; it was validated + its 2 broken tests fixed before promotion (don't re-break the
  `api_host='/ingest'` / `ui_host` split the `posthog.test.ts` assertions now expect).
- **Integrations marketplace** (`/integrations`, also the Settings **Connections** tab): 38
  connectors in `lib/integrationsCatalog.ts` (inline copy, no locale edits), of which **13
  are functionally wired** (the `WIRED` map in `IntegrationsMarketplace.tsx`): Gmail/Calendar/
  Contacts + Zoom + Slack/Discord/Telegram/Teams + the outbound-webhook set Zapier/Make/n8n/
  Pipedream/Custom Webhook. Each card carries an **honest status badge**, *Available now* /
  *Setup required* (e.g. the Google trio until OAuth creds are set) / *On the roadmap*, with a
  Todas|Disponibles filter (see `connectorState`). Real logos map by id in
  `components/integrations/IntegrationLogos.tsx`: add a component to `BrandIcons.tsx` OR
  paste the vendor's official `<svg>` into `RAW_LOGOS` (DOMPurify-sanitised). Unmapped ids
  render a brand-colour monogram. Do NOT hand-fabricate trademarked logos.
- **Billing:** Stripe (`stripe@17.7.0`, API `2025-03-31.basil`). **No free tier**. Endpoints
  503 gracefully without `STRIPE_SECRET_KEY`. Exactly **4 active plans** (monthly, the 3 legacy
  plans were deleted from prod): Starter €39, Growth €79, Business €149, Enterprise €299.
  **Trial lifecycle (2026-07-15):** `create_organization()` grants every new org a **14-day
  `trialing` Growth subscription at birth** (own BEGIN/EXCEPTION, can't break onboarding), the
  hourly `expire_trials()` pg_cron (`propel-expire-trials`) flips lapsed trials to `expired`,
  and `entitlements.ts` ALSO enforces `trial_ends_at` at read time, so signup works without
  Stripe and Stripe only converts trials to paid. Don't reintroduce "null plan = stuck at
  /choose-plan" assumptions.
  **Pricing v3 (per-seat + AI-usage metered, shipped DARK 2026-07-20, `docs/pricing-model-v3.md`):**
  the `plans` table gained `billing_model`(`flat`|`per_seat`)/`price_per_seat_*`/`min_seats`/
  `ai_credits_per_seat`/`ai_overage_per_credit`/`is_public`; `subscriptions` gained `seats`/
  `billing_interval`/`overage_*`/`unit_amount_override`/`feature_overrides`; `organizations`
  gained tax/VAT fields (migration `20260720130000`). `entitlements.getEntitlements()` now also
  returns `billingModel`/`seats`/`aiCreditsPerPeriod` and unions `feature_overrides`
  (flat/`{}` defaults = today's behavior, so existing orgs are unchanged/grandfathered — Business
  is kept as a hidden flat plan). Checkout bills `quantity = max(active members, min_seats)`;
  the webhook persists `seats`+`billing_interval`; `ChoosePlan` renders per-seat pricing + a seat
  picker for `is_public` plans. **DARK**: nothing reprices until per-seat Stripe prices are seeded
  + the model is turned on. **Deploy ordering: apply the migration BEFORE deploying edge functions**
  (entitlements/billing select the new columns). Open follow-ups (see the doc): AI metering per-seat
  rewire + overage/report-only, Stripe metered overage + membership seat re-sync + `invoice.*` +
  Stripe Tax/VIES, BillingSection/PlanModal UI, acceptance tests.
- **Email:** Resend/SMTP/Gmail. `denomailer@1.6.0` (1.6.1 does not exist, do not bump blindly).
  Outbound Gmail can send **from a chosen verified send-as alias**: the composer shows a "From"
  picker for accounts with 2+ verified identities, and the alias is threaded end-to-end as the
  MIME From across the browser-direct Gmail send, the `scheduled_emails` payload, and the
  server-side `email-runner` (sanitized against header injection). *Sending* from a verified alias
  needs no extra scope; *listing* aliases (Gmail `settings/sendAs`) needs the `gmail.settings.basic`
  scope, so a Gmail reconnect is required to populate the picker. Recipient-address splitting is
  centralized in `splitAddressTokens` (`utils/outboundEmailIdentity`, splits on comma OR semicolon),
  reuse it in every send/save/chip path — don't re-split on `,` only.
- **Destructive confirms** go through the promise-based `useConfirm()` hook (`hooks/useConfirm.tsx`)
  → branded, focus-trapped, i18n `ConfirmDialog` rendered in a `document.body` portal (so a
  transformed/overflow-hidden ancestor like the composer can't clip it). Do NOT reintroduce native
  `window.confirm`/`confirm()`.
- **`utils/formatters.ts` caches `Intl.NumberFormat`/`DateTimeFormat`** instances behind a keyed
  Map (formatters run per-row across deals/kanban/activities/detail views); reuse the exported
  helpers, don't construct a fresh `Intl.*` formatter per call.
- **Email marketing compliance** (`_shared/emailCompliance.ts`): every marketing send goes
  through opt-in/opt-out enforcement. A send is "marketing" when its `scheduled_emails`
  `payload.marketing` is true (bulk blasts) OR it's a sequence step, both consult the
  `email_suppressions` list (org-scoped opt-out/bounce/complaint table) BEFORE sending, get a
  `List-Unsubscribe` (RFC 8058) header pair + a sender-identity/opt-out footer, and count
  against the per-org daily cap (`MARKETING_DAILY_CAP`, default 500; over-cap rows are deferred,
  not dropped). The unsubscribe token is HMAC-signed and self-verifying (no storage) so the
  public `email-track/unsubscribe` route can honor it with no auth; `email-track/resend-webhook`
  ingests Resend bounces/complaints into the suppression list (Svix-verified via
  `RESEND_WEBHOOK_SECRET`, **accept-and-log until that secret is set**). Consent is **opt-in
  only, never defaulted on**, captured in ContactForm, CSV import, public web forms, and the
  bulk-send audience filter; `marketing_opt_in{,_at,_source}` columns live on `contacts`
  (pre-existing) and `leads` (new). Writes to `email_suppressions` are service-role only.
- **Campaigns / Newsletter** (`/campaigns`, `views/Campaigns.tsx`, `store/campaignsStore.ts`,
  `components/campaigns/`): a marketing broadcast to a filtered, marketing-opted-in contact
  audience. Reuses `enqueueBulkEmailJobs(…, { marketingOnly: true })` so it flows through the
  same compliance pipeline (suppression + footer/headers + daily cap). **v2:** the body renders
  as branded, responsive HTML via `renderCampaignEmail()` (wraps the XSS-safe
  `formatPlainToHtml`; the runner still appends the compliance footer, don't duplicate it),
  campaigns can be **scheduled** (`campaigns.scheduled_at` → `scheduled_emails.run_at`; cancel
  flips pending rows to `'canceled'` and reverts to draft) and each card shows **delivery
  metrics** aggregated from `scheduled_emails` by `payload.campaignId`
  (`email_tracking_messages.campaign_id` exists but is NOT populated yet, open/click per
  campaign is scaffold-only). `campaigns` table is org-scoped with tier-1 RBAC (writes gated by
  `jwt_can_write()`); sidebar nav + route gated on `email:read` (compose/send gated on
  `email:send`).
- **Docs portal** (`/docs`, `views/DocsPortal.tsx` + `views/docs/{primitives,apiReference,apiGuides}.tsx`):
  login-gated developer documentation, the complete public-API reference (auth, **10 resources**
  — contacts, companies, deals, leads, activities, tickets, products, pipelines, templates, lists —
  writable/filterable fields, pagination, filtering, scopes, limits, errors) + the signed-webhook
  guide (real `X-Propel-Signature: sha256=<hex HMAC>` format). Access is per account:
  super-admins always in; others request via `POST /docs/request-access`
  (`profiles.docs_access_requested_at`) and a super-admin grants from Admin → Users
  (`profiles.docs_access`, privilege column, never client-writable). Reference content is
  **English by design** (not app chrome); only the chrome uses `t.docs.*`. Content mirrors
  `docs/api-public.md` / the live `openapi.json`, keep all three in sync when the API changes.
  Linked from Settings → API & capture.
- **Public API surface (v1.4)** (`public-api`, `_shared/publicApiResources.ts` +
  `publicApiQuery.ts` + `publicApiOpenApi.ts`): config-driven CRUD over the 10 resources above,
  with bulk writes + bulk delete, nested reads (`?expand=`/sub-resource paths per the
  `contacts.deals` / `companies.contacts` etc. relation map), cursor pagination + incremental
  sync, rate-limit response headers, and **`Idempotency-Key` on POST** (dedup table, migration
  `20260718120000`). A zero-dep ESM **TypeScript SDK** ships from `sdk/propel.ts` (packaged with
  `sdk/package.json` for publishing; covered by `tests/sdk/propel.test.ts`).
- **Sales Intelligence** (`features/intelligence/`, `components/dashboard/SalesIntelligence.tsx`):
  pure client-side engine ranking next-best-actions (deals/tasks/leads) + a deals-at-risk
  roll-up on the Dashboard. Deal health MUST come from the shared `utils/dealHealth`
  (`computeDealHealth`), do not grow a parallel health model (that bug was already fixed once,
  #360).
- **Deal stakeholders** (`components/deals/DealContacts.tsx`, table `deal_contacts`,
  migration `20260720120000`): a deal keeps its single **primary** contact on `deals.contact_id`
  (unchanged — every query/analytic still reads it) and layers **additional** stakeholders on
  top via the `deal_contacts` junction, each with an optional role key (decision_maker/champion/
  influencer/technical/procurement/end_user/other, rendered via `t.deals.stakeholderRoles`).
  Managed in the deal detail panel; PostgREST-direct via the nested `crmApi` route
  `/deals/{id}/contacts[/{contactId}]` (sub-id is the CONTACT id). GET **degrades to `[]`** if
  the table isn't migrated yet, so the panel never breaks in the frontend-deploy-before-migration
  window. Writes gated on `deals:update` + `jwt_can_write` RLS. Don't duplicate the primary into
  the junction.
- **Meeting Notetaker** (`views/MeetingNotes.tsx`, `store/meetingsStore.ts`, edge
  `meeting-webhook` + `meeting-runner` + `_shared/meetingBot/*` + `handlers/meetings.ts`, tables
  `meeting_sessions`/`meeting_transcripts`): a **visibly-named self-hosted bot** (Attendee) joins a
  Zoom/Meet/Teams call, records+transcribes, and Propel turns the transcript into a **meeting
  activity auto-attached to the matched deal** (attendee email → contact → open deal) with an AI
  summary (via the existing `/ai/meeting-notes` pipeline) + action-item tasks. Auto-dispatch is
  **per-USER** (`profiles.meeting_auto_dispatch`, #484). Vendor-neutral boundary (one adapter file
  per provider). **Ships dark**: no-op until `MEETING_BOT_*` secrets are set + edge deployed +
  migrations applied. Spec: `docs/specs/meeting-notetaker.md`; runbook:
  `docs/runbooks/meeting-notetaker-attendee.md`.
- **Marketing site & its own i18n** (`components/marketing/`): the redesigned `PropelLanding.tsx`
  (hero, bento features, dark security set piece, pricing) + subcomponents in
  `components/marketing/landing/`; motion is gated by `prefers-reduced-motion`, zero new deps.
  Copy lives in a **standalone `i18n/marketing/` module**, SEPARATE from the app dictionary,
  with **tsc-enforced 6-locale parity** (`types.ts`, `useMarketingCopy.ts`), localizing the
  landing + all 11 marketing subpages into en/es/pt/fr/de/it. `i18n/marketing/legal/` holds
  **courtesy translations** of the 7 legal pages with a prevailing-language notice (English
  authoritative except `/aviso-legal` → Spanish/LSSI-CE). `LocaleSwitcher` (nav + footer) writes
  the SAME persisted `useI18nStore` preference the app uses, so a language picked on the landing
  carries into login/app; `useMarketingCopy()` mirrors it onto `<html lang>`.

---

## 7. Build, test & CI

```bash
npm run typecheck     # tsc --noEmit
npm run lint:ci       # next lint --max-warnings 200
npm run test:run      # vitest run (~2855 tests across 317 files)
npm run build         # next build
npm run coverage      # vitest run --coverage (v8), ~80% lines/statements
npm run i18n:lint     # no hardcoded setError strings (parity itself is tsc-enforced); in CI
npm run check:branding && npm run ui:lint
npm run e2e           # node tests/e2e/run.mjs
```

Views and components carry render + interaction tests (`tests/views/`, `tests/components/`)
seeding stores + mocking the api boundary; pure logic (`tests/utils/`, `tests/lib/`,
`tests/stores/`, `tests/hooks/`, `tests/services/`) is unit-tested directly. Shared render
helpers live in `tests/helpers/render.tsx`.

Run `typecheck + lint:ci + test:run + build` before every push. Edge-function TypeScript
is **not** covered by the frontend `tsc`, it is typechecked at `supabase functions deploy`
(no local Deno). CI jobs on each PR: **`ci`**, **`e2e`**, **`lighthouse`**, plus **Vercel**.
Merge only when all are green.

---

## 8. Deploy reality

- **Branch model:** two long-lived branches. **`production`** is the GitHub default (HEAD) and
  the ONLY branch Vercel deploys to the live site (propeltech.es); **`staging`** is the
  integration branch. Flow: feature branch → PR into `staging` → promote `staging`→`production`
  (fast-forward) **only on the user's explicit OK**. Both branches are currently in sync. Only git
  + Vercel differ across the two, the backend is one prod Supabase for all of them (rule #6).
- **GitHub repo secrets are the source of truth.** `deploy.yml` (push to `production` touching
  `supabase/functions/**`) deploys all edge functions and syncs runtime secrets;
  `vercel-env-sync.yml` (manual) upserts Vercel env; `backup.yml` runs nightly.
- **Migrations (history reconciled 2026-07-10):** `supabase db push --linked` is now the
  primary path and works, the 07-02→07-10 migrations were applied with it. Earlier the prod
  `schema_migrations` table diverged from repo filenames (out-of-band MCP/dashboard applies
  created remote-only entries); that was cleaned up with
  `supabase migration repair --status reverted <versions>` (bookkeeping only, no DDL). If the
  divergence recurs, repair the remote-only versions the same way, then push.
  **Write every migration idempotently** (`create ... if not exists`, `add column if not
  exists`, `drop constraint if exists` before re-add), prod already carries partial state from
  those out-of-band applies, so a plain `create`/`add` will hard-error instead of skipping.
  Fallbacks: `supabase db query --file <migration>.sql --linked` (Management API, runs but does
  not record in `schema_migrations`); ad-hoc SQL: `supabase db query "..." --linked`. CLI auth:
  `SUPABASE_ACCESS_TOKEN` in `.env` or the macOS keychain. Prod Postgres is **17.6**, the
  Homebrew `pg_dump`/`db diff`/`db pull` (v16, or Docker-only) won't dump it; `psql` still
  connects for queries.
- **Manual edge deploy** (verification gate, it typechecks the bundle):
  `supabase functions deploy <fn> --no-verify-jwt --project-ref fhugkidzcojrnalvqvln`.
  Smoke-test after: `curl .../functions/v1/propel-api/health` → 200.
- **Cloud-session edge deploy (works now):** a cloud session with the Supabase MCP can deploy
  via the `deploy_edge_function` tool, bundle the entrypoint + the full transitive `_shared`
  closure, and **preserve each function's `verify_jwt`** (email-runner stays `true`; browser-facing
  fns stay `false`). Migrations apply via MCP `execute_sql`. This session used it to ship
  **email-track v12, email-runner v59 (`verify_jwt=true`), public-forms v75** and to apply the
  `email_suppressions`/`leads`/`campaigns` migrations. (Supersedes the "not viable from cloud"
  note in `docs/reviews/2026-07-09-pending-edge-deploy.md`.)
- **Filled & working secrets:** SUPABASE_ACCESS_TOKEN, Supabase URL/anon/service_role/db_url,
  GEMINI_API_KEY, WEBHOOK/INTEGRATION_TOKEN_ENC_KEY, SITE_URL, VERCEL_*.
- **Empty (feature off until filled):** GOOGLE_CLIENT_ID/SECRET (Gmail/Calendar),
  STRIPE_* (billing), OPENAI_API_KEY, BACKUP_ENCRYPTION_KEY, AWS_*, RESEND_WEBHOOK_SECRET
  (Resend bounce/complaint webhook, accept-and-log until set).

---

## 9. Environment gotchas

- The dev Mac runs chronically near-full disk; `ENOSPC` can truncate command output. Prefer
  targeted commands; if `rm` is auto-denied, hand the user a `! <cmd>` to run.
- Work on `staging`-derived feature branches; open a PR **into `staging`** per change (branches
  auto-delete on merge). Promote `staging`→`production` (fast-forward) only on the user's explicit
  OK, `production` is the live site.
- Do not set up autonomous/self-scheduling agents for this repo.
- **Delete-user / delete-org needs cascading FKs.** New tables that reference `profiles(id)` or
  `organizations(id)` must use `on delete cascade` (or `set null` on a nullable column), a
  `no action`/`restrict` FK silently blocks deleting the user/org and the UI delete button (and
  `auth.admin.deleteUser`) fails with a 500 / "Failed to fetch". This bit `impersonation_logs`
  (audit table, `not null` FKs), fixed to CASCADE in `20260710000000`. Audit rows for a
  deleted org/user are expected to go with them.

## 10. Demo data

`scripts/seed-demo.mjs` builds the **"Propel HQ"** org (slug `propel-hq`), ~150 companies,
400 contacts, 50 deals, 100 leads, activities, tickets, products, goals, templates, sequences,
so every screen has data. Writes to **prod** with the service_role key (bypasses RLS). Owner
defaults to the `DEMO_EMAIL` account defined in the script, which it moves into Propel HQ and
reactivates (other teammates already in a different org abort, no hijack).

```bash
export SUPABASE_URL="https://fhugkidzcojrnalvqvln.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service_role, Supabase secret / Management API>"
RESET=1 node scripts/seed-demo.mjs   # plain run aborts if the org exists; RESET rebuilds it
```

Flags: `RESET=1` cascade-deletes the org's data first (auth accounts kept); `DELETE_USERS=1`
removes two hard-coded stale test emails; `DEMO_PASSWORD=…` sets the owner password (else
auto-generated and printed). The service_role key isn't in `.env`; pull it from the Management
API: `curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
"https://api.supabase.com/v1/projects/fhugkidzcojrnalvqvln/api-keys?reveal=true"`.
