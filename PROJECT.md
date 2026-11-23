# EA Sports FC 27 — Manager Career Prototype

A high-fidelity **EA Sports FC 27 Manager Career Mode** simulation prototype (menu, tactics, scouting, transfers, academy, and match sim without 3D pitch gameplay). Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Zustand**.

---

## 1. Quick Start & Run Commands

```bash
# 1. Install dependencies
npm install

# 2. Run local development server (http://localhost:3000)
npm run dev

# 3. Type check & production build
npm run build

# 4. Run test suite
npm test
```

- **Dev Server URL**: `http://localhost:3000/`
- **Visual Assets Contact Sheet**: `http://localhost:3000/contact_sheet.html`
- **Official Specification Blueprint**: [`BLUEPRINT.md`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/BLUEPRINT.md) (PS5 Title Update v1.2.0 Architecture & Backlog)
- **Git Baseline Tag**: `baseline-pre-ai-studio` (Commit: `a8ee9dc`)

---

## 2. Architecture & Screen State Machine

The entire application runs on a reactive Zustand state machine (`src/store/careerStore.ts`). There are two primary phases:

### Phase A: Club Selection Screen (`career === null`)
- **Component**: [`src/components/ClubSelectScreen.tsx`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/components/ClubSelectScreen.tsx)
- **Visual Reference**: `screenshotspart2/image (9).png`
- **Features**:
  - Men's / Women's league toggle (`[1]` / `[2]`).
  - Active country/league selector (England, Spain, Germany, Italy, France).
  - Main Frosted Club Card with crest, star rating, and ATK/MID/DEF sectors.
  - 2x2 data quadrants:
    1. Kit preview (2D jersey with stripes/sponsors + `[R]` cycle carousel).
    2. Foundation year, domestic leagues/cups trophies, club worth, transfer budget.
    3. City name with stylized stadium icon and 50,000+ capacity tag.
    4. Club Stature text and Tactical Vision badge.
  - 3 Glowing Club DNA cards on the right:
    - **Fanbase Devotion**: `VERY HIGH` / `HIGH` / `MEDIUM` (amber glow)
    - **Youth Facilities**: `VERY HIGH` / `HIGH` / `MEDIUM` (orange glow, e.g., FC Barcelona *La Masia*, Real Madrid *La Fábrica*, Athletic Club *Lezama*, Arsenal *Hale End*)
    - **Financial Stability**: `VERY HIGH` / `HIGH` / `MODERATE` / `LOW` (cyan/sky glow)
  - Bottom bumper & action bar (`✕ Advance`, `○ Back/Resume`, `□ Browse All 96 Clubs`, `△ Swap Teams`).
  - 2D WASD spatial focus selector with neon cyan corner brackets.

### Phase B: Active Career Hub (`career !== null`)
- **Header**: [`src/components/TopNavBar.tsx`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/components/TopNavBar.tsx) (MC Emblem, `Home [L2]`, L1/R1 bumpers, transfer budget, club badge, 4-segment manager rating bar, FC Hub profile).
- **Navigation Tabs** (`activeTab` in `careerStore.ts`):
  1. **Central**: [`src/components/CentralHub.tsx`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/components/CentralHub.tsx) — Hero matchday face-off, date banner, 7-day calendar advance, action tasks stack, dynamic news stories, compact league table.
  2. **Notifications**: [`src/components/NotificationsView.tsx`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/components/NotificationsView.tsx) — Email inbox, board directives, press questions.
  3. **Squad**: [`src/components/SquadView.tsx`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/components/SquadView.tsx) — Pitch team sheet, formation picker, FC IQ tactical vision, role familiarity, energy/stamina bars.
  4. **Scouting**: [`src/components/ScoutingView.tsx`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/components/ScoutingView.tsx) — Global GTN scout network, search filters, player scouting reports.
  5. **Transfers**: [`src/components/TransfersView.tsx`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/components/TransfersView.tsx) — Transfer hub, TransferRoom valuations, active bids, deadline day countdown, interactive 2D cutscene negotiation modal.
  6. **Academy**: [`src/components/AcademyView.tsx`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/components/AcademyView.tsx) — Youth recruitment network, wonderkid generation, promotion to senior squad.
  7. **Office**: [`src/components/OfficeView.tsx`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/components/OfficeView.tsx) — Financial balance sheets, board expectations, full league standings, manager contracts.
  8. **Customise**: [`src/components/CustomiseView.tsx`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/components/CustomiseView.tsx) — Currency settings, match half lengths, energy recovery policy, save/export manager career save.

---

## 3. Controls (Full 60% Keyboard & Controller Support)

No arrow keys or numpad are required. The entire UI is mapped for 60% compact keyboards:

| Key | Function |
|---|---|
| **`W` / `A` / `S` / `D`** | 2D Spatial Focus Selector (moves glowing cursor across screen tiles) |
| **`Space` / `Enter` / `X`** | Activate currently selected tile (Advance / Open / Confirm) |
| **`Q` / `E`** | L1 / R1 Bumpers (Cycle clubs on club select / Cycle tabs in career) |
| **`R`** | Cycle kit (Home ➔ Away ➔ Third) |
| **`1` – `8`** | Direct jump to Career Tabs (`1` Central, `2` Inbox, `3` Squad, `4` Scout, `5` Transfer, `6` Academy, `7` Office, `8` Customise) |
| **`B` / `Esc`** | Back / Close Modal / Resume Career |
| **`F`** | Browse All 96 Clubs Modal |
| **`T` / `Y`** | Swap Teams (Random European Club) |

---

## 4. Reusable UI Components

- **`ClubCrest`** ([`src/components/PlayerAvatar.tsx`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/components/PlayerAvatar.tsx)): Official football-data.org CDN crest with dynamic vector shield fallback.
- **`PlayerAvatar`** ([`src/components/PlayerAvatar.tsx`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/components/PlayerAvatar.tsx)): Headshot loader with SVG player bust silhouette fallback and initials.
- **`MarqueePlayerCutout`** ([`src/components/PlayerAvatar.tsx`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/components/PlayerAvatar.tsx)): Transparent cutouts for marquee stars (KDB, Eze, Raphinha, Doué, Vlahović).
- **`OvrDiamond`** ([`src/components/PlayerAvatar.tsx`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/components/PlayerAvatar.tsx)): 45° diamond OVR rating badge with green/red dynamic growth delta styling.
- **`TileFocusIndicator`** ([`src/components/ClubSelectScreen.tsx`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/components/ClubSelectScreen.tsx)): EA FC 27 HUD corner brackets + glowing cyan border + floating `SELECT [SPACE]` badge.
- **`ClubKitJersey`** ([`src/components/ClubSelectScreen.tsx`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/components/ClubSelectScreen.tsx)): 2D vector jersey matching club colors, collar accents, chest stripes, and FC 27 chest branding.

---

## 5. Data & Simulation Engine

- **`src/engine/types.ts`**: Complete TypeScript definitions for `Club`, `Player`, `Fixture`, `StandingsEntry`, `Negotiation`, `CareerState`.
- **`src/engine/csvParser.ts`**: Loads top 5 European league CSVs (`public/players/{england1,spain1,germany1,italy1,france1}.csv`) with 2,624 distinct real players and 130 clubs.
- **`src/engine/clubCrests.json`**: Official CDN crest URLs mapped by club ID and club name (100% coverage for LaLiga, Premier League, etc.).
- **`src/engine/ratings.ts`**: FIFA attribute formulas, role familiarity, market value, weekly wage algorithms.
- **`src/engine/matchSim.ts`**: Sector-based match simulation calculating match fitness, goal probability, yellow/red cards, injuries.
- **`src/engine/transfers.ts`**: Transfer AI evaluation, club negotiations, delegation, player wage demands, deadline day hourly clock.
- **`src/engine/growth.ts`**: Dynamic potential and form-driven attribute deltas.
- **`src/engine/season.ts`**: Fixture calendar generator, European competition qualification, season transitions, and regen creation.

---

## 6. Official Fonts & Styling

- **Typography**: Official EA Sports `Cruyff Sans` (Regular, Medium, Bold, Condensed, Mono) configured via `@font-face` in [`src/index.css`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/src/index.css).
- **Color Palette**:
  - Deep Stadium Blue/Teal: `#050d12`, `#07131a`, `#081720`, `#0d2830`
  - EA Sports Hyper-Cyan Accent: `#38f2c8`
  - Boardroom Turf Green: `#10c482`
  - Rating Amber: `#f59e0b`, `#fbbf24`
  - Danger Rose: `#f05252`

---

## 7. Exact Files Needed for Google AI Studio Context

When prompting Google AI Studio to work on specific screens:

### For the Central Career Hub:
1. `src/components/CentralHub.tsx` (Current layout and state)
2. `src/components/TopNavBar.tsx` (Persistent top bar)
3. `src/store/careerStore.ts` (Active career state, dates, fixtures, tasks)
4. `src/components/PlayerAvatar.tsx` (Cutouts, crests, OVR diamond)
5. `public/assets/art/tunnel.png` & `public/assets/art/goal-celebration.png` (Backgrounds)
6. UI Reference Screenshot: `public/assets/aistudio/image_06994e3e.png` or `r1-central-hub.png`

### For Club Selection Screen:
1. `src/components/ClubSelectScreen.tsx`
2. `src/engine/csvParser.ts`
3. `src/engine/clubCrests.json`
4. UI Reference Screenshot: `/Users/alex-k/Documents/eafc27 players/game/inputs/screenshotspart2/image (9).png`
