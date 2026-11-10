# ClubRudder migration roadmap

## Eclipse 2010 ECNL showcase
- [x] Set up club-scoped May 2027 demo tryouts and all 16 returning-player registrations, complete development examples, and current/next-season team plans
- [x] Add player-accessible tryout cards and published feedback to player views; use each club's branding on players and teams
- [x] Database coverage verifies 16/16 players with all four development categories and tryout registrations; isolated browser fixtures verify card, logo, feedback and dashboard link; 21 season/tenant/dues tests pass and compilation passes
- [ ] Verify the real signed-in player/team flow (blocked: external unmanaged Supabase has no available authenticated browser session; isolated fixtures do not verify live account access)

## Role dashboard design
- [x] Redesign club admin, club director, bookkeeper, branch director and coach dashboards with command metrics, focused action areas and operational tabs; preserve existing data and permissions
- [x] Verify all five layouts and 16 operational tabs with isolated sample data, branch detail expansion and coach roster search; desktop and phone captures have no overflow or page errors; 24 existing regressions pass and compilation passes
- [ ] Verify dashboards with real signed-in accounts (blocked: external unmanaged Supabase has no available authenticated browser session; sample-data checks do not verify live account access)

## Returning-player review
- [x] Add private club-scoped season reviews, per-coach placement advice, manager-only follow-up and protected manager-granted coach access
- [x] Add club-customizable intent, recommendations and team roles; display in scoring, quick evaluation, director results and roster board
- [x] Pass 15 retention/terminology tests and five tryout-isolation regressions; isolated browser flow verifies coach advice save, contacted/resolved readback and queue reduction, phone width has no overflow; compilation passes
- [ ] Verify real signed-in club/coach saves and database authorization end-to-end (blocked: external unmanaged Supabase has no available authenticated browser session; isolated harness checks do not verify production persistence)

## Guided tryout workflow
- [x] Group tryout work into setup, tryout day, and rosters/offers with URL-backed navigation and an actionable setup checklist
- [x] Show club-specific team-plan readiness on roster teams, open the existing dues wizard directly, preserve explicit team identity and expose offers in the dashboard
- [x] Run 19 tenant-readiness/dues/identity/search regressions; isolated-data browser checks verify checklist → roster → prefilled wizard, offers, history navigation and phone layout with no page errors
- [ ] Verify real signed-in tryout saves, offer delivery and payment completion (blocked: external unmanaged Supabase has no authenticated browser session; sample-data checks do not verify these operations)

## Itemized team dues
- [x] Build club-specific six-step wizard with base dues, included services, required/optional team fees and family review; expose plan editing on team detail
- [x] Add missing club-scoped plan/offer/order storage, manager-only writes and cross-club reference triggers; validate checkout amounts from saved fees, restrict guest checkout to dues and scope Stripe requests to stored account
- [x] Verify pricing/foreign-fee rules and isolated wizard submission; existing plan identity regressions pass
- [ ] Verify real-club saves and live checkout (blocked: external Supabase browser session unavailable; provider onboarding and webhook payment completion still need verification)
- [ ] Implement fixed-term installments and split-guardian billing (not available in this initial build; only pay in full is offered)
- [ ] Enable Echelon transactions (blocked: confirmed gateway API contract is not available)

## Onboarding and Features presentation
- [x] Replace textual onboarding icon names with shared graphical fallback; improve overlay scrolling and club-admin branch fields; all seven role highlight screens checked at phone width
- [x] Replace eight Features screenshot placeholders with actual app captures using isolated demo data; all eight images loaded and no overflow at desktop and phone widths
- [ ] Verify personalized tutorial completion with a real signed-in session (external Supabase session unavailable; isolated automatic tutorial mounting was inconsistent)

## Tenant module authorization
- [x] Wire core plus six canonical add-ons to tenant-specific console grants and page/menu guards; JWT-validated mapped actions and legacy add-on CRUD enforce membership and entitlement before privileged access; 24 regressions pass and synthetic preview verifies six denials, facility grant and live revocation
- [x] Apply reviewed owner-only entitlement writes and restrictive module policies on 51 existing tables; invoker helper clears the new security warning; rollback-only database tests pass for tenant self-grant denial, owner activation, cross-tenant isolation and core revocation
- [ ] Verify activation through a real System Console browser session (blocked: external Supabase session unavailable); missing tournament/marketing/storefront/booking tables need module policies when their separate schema migration is reviewed

## Per-club integration security revamp
- [x] Write Deno contract suite for all eight assertions with real password JWT setup, disposable fixtures, fake-only provider requirement and teardown; execute runner (eight steps blocked at localhost safety prerequisite, zero security passes; no data created)
- [ ] Execute eight assertions against an isolated deployment (blocked: no disposable localhost Supabase/Edge deployment with reviewed UUID/Vault schema and egress-denied fake adapters)
- [x] Restrict module catalog reads to system owner after policy review/approval; protected owner grants and invoker check applied, ALL read bypass removed; rollback-only owner/non-owner/self-grant regression passed
- [x] Build six-provider owner/admin settings with direct RLS connection reads and password-only Resend dialog; verify six cards, cleared key input, member denial and phone width with isolated data; 12 security tests pass
- [ ] Activate Connect/Reconnect/Disconnect and Stripe OAuth; webhook signature/account lookup and stripeAccount helper prepared but live operation blocked on reviewed UUID/Vault schema, declined platform credentials and Stripe webhook signing secret
- [ ] Prepare JWT-authenticated Resend/disconnect/OAuth actions (authorization/secret-free response/10-minute random-state helpers prepared; handlers blocked on declined platform credential form and reviewed UUID/Vault migrations; installed Vault has no delete_secret function)
- [ ] Review complete UUID conversion migration and every affected RLS policy before applying (preparation plan approved; 268 existing policies/66 reference columns inventoried; blocked on ownership of 2,812 unmatched club references)
- [ ] Apply approved connections, Vault-reference and OAuth-state storage; migrate all legacy plaintext credential paths and verify isolation/service-only functions (blocked on orphan ownership, separate migration approval and hosted Vault exposure verification)

## Current menu updates
- [x] Restore missing tenant_modules, module_catalogs and entitlement_events with club-isolated reads/admin-only writes; direct storage reads verified and eight module switches checked with isolated preview data
- [ ] Verify Modules saving through the real system-owner session (external Supabase browser session unavailable to automated checks)
- [x] Test all 8 club admin Tryout Dashboard tabs; fix player search, approval/check-in failure handling, duplicate plan edits, template mode, and mobile selector/dialog crashes; 10 regression tests pass and sample-data check-in/undo/search/approval/edit flows verified
- [ ] Verify real-club registration, session moves, bib assignment, evaluation saves and team-plan persistence (blocked: external Supabase has no available authenticated test session; preview reports missing `team_plans`, requiring remaining schema migration)
- [x] Connect the complete System Console sidebar, preserving the selected club and active tab
- [x] Add Tryout Dashboard to the club admin menu and verify preview navigation (13 console links and 8 tryout tabs checked with dev impersonation; real signed-in data remains unverified)

- [x] Use latest GitHub main (125385a) as inspected migration baseline; port its tenant-directory console without replacing Supabase or club connections
- [ ] Adapt remaining newer GitHub pages, 168-entity schema and 165 backend services (requires staged migration and provider verification)

- [x] Bring Base44 pages into project, point data at Supabase
- [x] Multi-club structure: club_members, user_roles, club_integrations, locked secrets table
- [x] Club connections portal (/settings/integrations): Stripe, QuickBooks, Resend
- [x] Add Stripe + QuickBooks keys
- [ ] Register QuickBooks redirect URL in Intuit app (waiting on user)
- [ ] Move remaining 52 backend actions (email, invites, sync to QuickBooks, checkout, AI…)
- [x] Rewrite older table rules to use club_members (currently one-club-per-user + global "admin")
- [x] Lock down payment_processors secret columns, app_configs/leagues open writes
- [x] Link portal from the app sidebar
- [x] Invite emails via each club's Resend (auto-join on sign-in)

## Base44 export (Oct 27)
- [x] All new pages + components copied, auto-registered
- [x] Email (club Resend) + AI assistant wired
- [ ] Port ~170 backend actions (~24k lines) in batches: outreach, migration/imports, compliance, tryouts, journeys, QuickBooks sync, tournaments, expenses

## Backend actions batch (Oct 27)
- [x] Outreach, data import/migration, compliance, tryouts, member journeys, QuickBooks sync, tournaments, expenses — 46 actions converted and connected (untested while signed in)
- [ ] Outreach email webhook + old QuickBooks OAuth callbacks — not moved (existing Club Connections handles QuickBooks sign-in)
- [ ] Scheduled jobs (reminders, digests) — run only when triggered from a page; no timer yet
- [x] Remaining actions converted (161 total connected, untested signed in)
- [ ] Payment/Stripe/module webhooks + Stripe Connect callback — need public signed endpoints
- [ ] Email-template file editor action — relied on server files; not available
- [x] Tryout redesign: check-in desk, coach scoring, Rosters tab (pool → teams)

## Beacon next level
- [x] Storage for channels/messages/settings/reports with club and team isolation, safe-edit trigger, live updates
- [x] Real-time posts, typing indicator, read receipts; Info/Important/Urgent levels; email + text fan-out and "follow up with who hasn't seen it"
- [x] Safety: safe-channel notice, private reports (two reports hide a post), edit history kept, soft removal only
- [x] Game-day cards with RSVP, field pins with directions, one-tap sideline updates
- [ ] Texting needs a Twilio connection and a sending number (TWILIO_FROM_NUMBER); phone lock-screen push needs Firebase setup
- [ ] Verify with a real signed-in club session (external Supabase session unavailable)

## Beacon mobile app
- [x] Phone app shell at /beacon: Home, Messages, Schedule, Develop (only when module on), Pay, Me
- [ ] Coach: create/save own training sessions in-app
- [ ] App store packaging (Capacitor) + lock-screen push

## Beacon player development parity
- [x] Add Skills and Physical segments with default basic/advanced tests, diagrams, four physical metrics, history and coach entry sheets
- [x] Enforce assigned-staff writes and family-only shared reads for evaluations, notes, feedback, skill scores and physical assessments in RLS
- [x] Verify scoring and entry validation with 184 shared-rule tests; isolated phone workflows cover skill/diagram views, both save types, readback, parent read-only access, five tabs and no overflow; build passes
- [ ] Verify real signed-in coach and family accounts (blocked: external unmanaged Supabase has no authenticated browser session; isolated fixtures do not verify live account access)

## Beacon coaching voice, feedback and contrast
- [x] Add mobile dictation, selectable notes, AI feedback generation and editable draft review while preserving staff/family visibility
- [x] Make tenant primary/accent foreground pairs WCAG-AA readable and remove faded text on filled brand surfaces; use separate page-text adjustments for bright/dark palettes
- [x] Verify both generation paths, review/send/readback, private audio fallback and parent privacy with isolated phone workflows; 200 shared-rule tests and automated light/dark contrast scans pass with no overflow or page errors

## Financial command center
- [x] Wire every bookkeeper card and quick action to a matching tab (summary, ledger, invoices, overdue, expenses/staff pay, offline & refunds)
- [x] Overdue queue: add resolution storage, accept older late statuses, group by family, auto-lapse unpaid scheduled charges; Eclipse has 36 aged cases (12 in progress)
- [x] Expenses & staff pay page on the real bill and staff-pay records; invoice generation with print/email statements; financial summary with cash flow, budgets and CSV export
- [ ] Verify these screens with a real signed-in session (blocked: external Supabase has no browser session for checks)
- [ ] Coach expense-report submission still uses the old report records that don't exist yet

## Beacon store readiness
- [x] Cloud build configs (Codemagic + GitHub Actions), public /beacon/support, privacy policy COPPA/push/deletion sections
- [x] Reviewer coach + parent accounts in Eclipse Select SC; iPhone 6.7" and Android screenshots saved to Files
- [x] Push token storage + registration from the native app
- [ ] Send pushes to stored tokens (blocked: Firebase/APNs keys not connected yet)
- [ ] Build and submit binaries (blocked: Apple/Google developer accounts and signing keys)
