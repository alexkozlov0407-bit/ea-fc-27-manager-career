# EA Sports FC 27 - Visual Reference & Screenshot Map

This document catalogs all authentic EA FC 27 Career Mode screenshots located in `inputs/screenshots/` and `inputs/screenshotspart2/`.
Use this map when building 1:1 pixel-accurate screens for the project.

---

## 1. Landing Carousels (Primary Navigation Tabs)

| Tab | Status | Reference Screenshot | Implementing Component | Key Visual Characteristics |
| :--- | :--- | :--- | :--- | :--- |
| **Club Select** | ✅ 1:1 Done | `inputs/screenshotspart2/image (9).png` | `src/components/ClubSelectScreen.tsx` | Full-screen stadium arena, marquee kit/trophies, club badge, stats & history. |
| **Central Hub** | ✅ 1:1 Done | `inputs/screenshotspart2/image (2).png` | `src/components/CentralHub.tsx` | Next match card (authentic badges, kickoff time), 6-task routine list, broadcast news card with likes & comments, WASD spatial navigation. |
| **Squad Landing** | ✅ 1:1 Done | `inputs/screenshots/image (11).png` | `src/components/SquadView.tsx` (`HubCarousel`) | 3 frosted carousel cards ("Ideal Quality", "Team Management", "Team Sheets") with 4th card peeking ("Squad Hub"), glowing border on focused card, `✕ Enter ...` pill. |
| **Scouting Landing** | ✅ 1:1 Done | `inputs/screenshots/image (6).png` | `src/components/landings/ScoutingLanding.tsx` | Carousel cards: "Scout Report" (player busts, ST/age, diamond OVR), "Scouts" (scout stars, flag, donut breakdown), "Search Players". |
| **Academy Landing** | ✅ 1:1 Done | `inputs/screenshotspart2/image.png` & `inputs/screenshots/image (8).png` | `src/components/landings/AcademyLanding.tsx` | Carousel cards: "Youth Squad" (top potential, OVR), "Youth Scouts" (scout network status, flag, donut), "Youth Development Plan" (growth progress bars, ETA in weeks). |
| **Office Finances** | ✅ 1:1 Done | `inputs/screenshots/image (9).png` | `src/components/landings/FinancesScreen.tsx` | Full-screen overlay, sub-tabs (Overview, Transactions, Budget), donut chart with green Profit/Earnings and red Expenses pointer lines, Club Worth & Projection. |

---

## 2. In-Depth Sub-Screens Requiring 1:1 Parity

### Screen A: Team Management / Starting XI Pitch View
- **Trigger:** Selected "Team Management" card on Squad Landing (press `Space` / `Enter` or click).
- **Reference Screenshots:**
  - `inputs/screenshotspart2/image (5).png` (Main Team Management Starting XI)
  - `inputs/screenshotspart2/image (6).png` (Edit Tactic - Team Tactics & Without Ball/With Ball)
  - `inputs/screenshotspart2/image (7).png` (Edit Tactic - Player Roles & Familiarity)
  - `inputs/screenshotspart2/image (8).png` (Team Sheets Manager)
- **Key Elements:**
  - Top header: Sub-tabs `Squad` | `Tactics` | `Assignments` (`L1/R1` or `Q/E` navigation).
  - Tactic Preset bar: `CLUB TIGRES DEFAULT`, tactic share code (`SYq8wc1YsaoP`), Active badge.
  - Interactive 2D Pitch: Green angled turf with authentic player tokens showing jersey number, player name, position token, OVR diamond, and FC IQ Role badge (e.g., `Advanced Forward +`, `Attack`).
  - Without Ball / With Ball tactical toggle with fluid transition.
  - Horizontal Bench & Reserves ribbon at the bottom with quick swap functionality (`Space` / `Enter` to select source player, move to target player, press `Space` to swap).
  - Bottom controls bar: `✕ Select / Swap`, `◯ Back`, `▢ Tactic Details`, `△ Formation List`.

### Screen B: Coaching Staff / Team Strategy & Ideal Quality
- **Trigger:** Selected "Ideal Quality" card on Squad Landing (press `Space` / `Enter` or click).
- **Reference Screenshot:**
  - `inputs/screenshotspart2/image (4).png`
- **Key Elements:**
  - Header: Sub-tabs `Team Strategy` | `Coach Management`.
  - Tactical Vision Banner: Displays current vision (e.g. `Standard`, `Gegenpressing`, `Tiki-Taka`) with description.
  - Department Cards (4 vertical rows or grid):
    - **Attack**: Players count, potential determined, Development Boost meter, Achieved Stars vs Ideal Stars (gold stars).
    - **Midfield**: Players count, potential determined, Development Boost meter, Achieved Stars vs Ideal Stars.
    - **Defence**: Players count, potential determined, Development Boost meter, Achieved Stars vs Ideal Stars.
    - **Goalkeeping**: Players count, potential determined, Development Boost meter, Achieved Stars vs Ideal Stars.
  - Interactive Coach Slots: 3 coach slots per department showing coach name, Tactical Vision affinity, rating, and weekly wage, with `▢ Hire Coach` action.

### Screen C: Transfers Hub - Active Negotiations & 2D Live Negotiation Call
- **Trigger:** Navigating to `Transfers` tab or selecting a transfer task from Central Hub.
- **Reference Screenshots:**
  - `inputs/screenshots/3ef1e889-e957-4e6d-a7f0-a7af92684207.png` (Active Negotiations Table)
  - `inputs/screenshots/411fdc61-90ba-4d6c-ab3d-16c4647d9a2f.png` (2D Live Negotiation Call)
  - `inputs/screenshots/image (1).png` (Transfer Action Dialog)
- **Key Elements:**
  - **Negotiations Table:**
    - Sub-tabs: `Active Negotiations`, `Incoming Loans`, `Outgoing Loans`, `Contract Renewals`.
    - Columns: Player / Club, Status, OVR / Age, Value (xTV), Action.
  - **2D Live Negotiation Call:**
    - Split-screen cinematic layout:
      - Left: Counter-party manager portrait (e.g., Andoni Iraola - Liverpool Manager), live Tension Meter ("Low Tension", "Moderate", "High" with colored arc indicator), and dialogue bubble.
      - Right: Deal Terms breakdown: Transfer Fee (`$71,200,000`), Installments (`1 INSTALMENTS`), Sell-on Clause (`%`), Weekly Wage.
      - Dual-action controls: `✕ Submit Offer`, `◯ Walk Away`, `▢ Edit Terms`.
  - **Transfer Action Dialog:**
    - Popup options: "Negotiate with Club", "Delegate to Buy", "Decline Offer", "Accept Contract Demands".

### Screen D: Office - Monthly Calendar & League Standings
- **Trigger:** Navigating to `Office` tab and selecting Calendar or Standings.
- **Reference Screenshots:**
  - `inputs/screenshotspart2/image (11).png` (Calendar)
  - `inputs/screenshotspart2/image (12).png` (Standings & Competition Picker)
  - `inputs/screenshots/image (10).png` (Financial Transactions Ledger)
- **Key Elements:**
  - **Monthly Calendar:**
    - Horizontal ribbon of month tabs (`L2/R2` or `Q/E` to cycle July, August, September, October, November...).
    - 7-column calendar grid (Monday–Sunday) showing match fixtures with competition logo, home/away indicator, opponent crest, kickoff time or final match score, and rest/recovery days.
  - **Standings & Competition Picker:**
    - Tabs: `My Competition` | `Other Leagues`.
    - List of available competitions: Domestic League (e.g., Premier League, LaLiga, PKO BP Ekstraklasa), National Cup, UEFA Champions League, UEFA Europa League, UEFA Conference League.
    - League Table: Position, Club Crest, Club Name, Played, Won, Drawn, Lost, GD, Points, and Form indicator dots (W/D/L).

---

## 3. Keyboard & Console Controller Taxonomy

All screens must support the uniform console input taxonomy:
- `WASD` / `Arrow Keys`: Move cursor / spatial navigation between cards and table rows.
- `Space` / `Enter` (`✕` on PlayStation / `A` on Xbox): Primary selection / Enter sub-screen.
- `Escape` / `B` (`◯` on PlayStation / `B` on Xbox): Back / Return to parent landing screen.
- `Q` / `E` (`L1` / `R1`): Cycle sub-tabs or months.
- `1` through `8`: Instant jump to top-level tabs (1: Central, 2: Notifications, 3: Squad, 4: Scouting, 5: Transfers, 6: Academy, 7: Office, 8: Customise).
- `F` (`▢` on PlayStation / `X` on Xbox): Contextual action (e.g., "View Instruction", "Edit Tactic", "Hire Coach").
- `R` (`R3`): Cycle instructions/scouts or advance carousel.
