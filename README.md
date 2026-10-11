# RedDrop

A real-time blood donation platform connecting **Guest Users**, **Registered Donors**, and **Hospitals/Facilities** — built to match Chapter 5 (System Analysis and Design) of the RedDrop project report, SWE3090.

This is the start of the implementation phase (Chapter 6). It's a working scaffold: the three-actor model, auth, data layer, routing, and the highest-priority functional requirements are wired up end-to-end against Firebase. Lower-priority items and some hardening are flagged below as next steps.

## Tech stack

React.js (Vite) · Firebase (Authentication, Cloud Firestore, Cloud Functions, Cloud Messaging) · Google Maps API · Tailwind CSS v4 · React Router

This matches the three-tier architecture from Section 5.3.1: Client Tier (React SPA) → Logic Tier (Auth, Functions, FCM, Chatbot API) → Data Tier (Firestore, Maps API).

## Setup

### 1. Create a Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com) → Add project.
2. Enable **Authentication** → Email/Password sign-in method.
3. Enable **Cloud Firestore** (start in production mode — the rules in `firestore.rules` handle access control).
4. Register a Web App and copy the config object it gives you.
5. (Optional, for push notifications) Cloud Messaging → generate a Web Push certificate (VAPID key).

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in your Firebase config values, plus (when you're ready) a Google Maps API key and a chatbot backend URL. The app will show a setup screen instead of crashing if these are missing.

### 3. Install and run

```bash
npm install
npm run dev
```

### 4. Run the test suite

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with a coverage report (NFR-009)
```

### 5. Deploy Firestore rules and indexes

```bash
npm install -g firebase-tools   # if you don't have it
firebase login
firebase use --add              # link this folder to your Firebase project
firebase deploy --only firestore:rules,firestore:indexes
```

### 6. (Optional) Deploy Cloud Functions

The `functions/` directory contains the server-side notification fan-out for FR-008 and FR-009. It requires the Blaze (pay-as-you-go) plan, since outbound calls for FCM aren't available on the free Spark plan.

```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

Without this deployed, appeals and responses still get created in Firestore correctly — donors and facilities just won't receive push notifications, and the in-app notification feed on the donor dashboard will stay empty.

## Adapting the ERD to Firestore

The ERD in Section 5.3.3 models `User` as a base entity with `Donor` and `Facility` extending it through one-to-one relationships, and `DonationFacilityListing` as a separate entity with a one-to-one link to `Facility`. Firestore is document-oriented, not relational, so this is implemented as:

- `users/{uid}` — base record (`email`, `role`, `createdAt`)
- `donors/{uid}` — keyed by the same `uid`, acting as the one-to-one extension
- `facilities/{uid}` — same pattern; `DonationFacilityListing`'s `lat`/`lng` fields are folded directly onto the facility document rather than kept as a separate collection, since they're always read together

This keeps reads cheap (no joins) while preserving the same logical relationships the ERD describes.

## What's implemented vs. what's next

| Area | Status |
|---|---|
| FR-001, FR-002, FR-003 (registration, auth) | Done |
| FR-004, FR-005 (post appeal, public feed) | Done |
| FR-006, FR-007, FR-013 (guest response, urgency logic, compatibility check) | Done |
| FR-008 (facility acceptance notification) | In-app done: facility dashboard has a "Donor responses" section (`listenFacilityResponses` in `src/services/responses.js`) showing donor name/phone/blood type/scheduled time per response. Push notification (FCM) still needs Cloud Functions deployed. |
| FR-009 (push to donors) | Done server-side (Cloud Functions) — needs deployment + FCM token registration wired into the UI to fully test end-to-end |
| FR-010 (donor dashboard) | Done. Core stats + availability + notification feed, plus an "Upcoming confirmed appointments" list (`listenDonorResponses` in `src/services/responses.js`) showing the donor's own confirmed Standard-appeal responses with a future arrival time. |
| FR-011 (facilities directory + map) | Done. Directory + map, plus a "set my location" map-pin control (`src/components/facilities/LocationPicker.jsx`) on the facility dashboard — click/drag the pin or use device geolocation, no more manual Firestore-console editing. Reverse-geocodes the pin via `google.maps.Geocoder` and overwrites the facility's text address on save, so the displayed address and "Get directions" link always match the pin (requires the Geocoding API enabled on the same Google Cloud project as the Maps key). |
| FR-012 (blood drive events) | Done |
| FR-014 (AI chatbot) | Widget done; needs `VITE_CHATBOT_API_URL` pointed at a real backend |
| FR-015 (manage posted appeals) | Done |
| NFR-004 (security/RBAC) | `firestore.rules` enforces facility-only posting server-side. `responses` reads are scoped so a facility can only read responses to its own appeals (fixed an operator-precedence bug that had let any signed-in facility read any donor's phone number). |
| NFR-002, NFR-003 (scale, uptime) | Inherited from Firebase's managed infrastructure — nothing custom needed |
| NFR-009 (test coverage ≥ 60%) | Done — 96%+ statement coverage via Vitest + React Testing Library (`npm test`, `npm run test:coverage`). 161 tests across utils, services (Firestore domain logic, Firebase mocked), and all pages/components (Auth/Maps/router mocked). |
| Donor self-service geolocation for FR-009's radius matching | Currently matches by blood type only; needs lat/lng + geohash query, see comment in `functions/index.js` |

## Project structure

```
src/
  firebase/config.js        Firebase init (guarded against missing .env)
  context/AuthContext.jsx   Tracks user, role, and live profile doc
  routes/guards.jsx         RequireAuth / RequireDonor / RequireFacility
  services/                 One file per Firestore "domain" (appeals, responses, events, ...)
  utils/                    Pure logic: blood compatibility, urgency/time rules, maps loader
  components/               Reusable UI (layout, appeal cards, chatbot widget, map)
  pages/                    One file per route
functions/                  Cloud Functions (notification fan-out)
firestore.rules             Server-side access control
firestore.indexes.json      Composite indexes the queries above need
```

Each service/util file has a comment at the top citing which FR/NFR it implements, so Chapter 6 write-ups can cite specific files and line ranges directly.
