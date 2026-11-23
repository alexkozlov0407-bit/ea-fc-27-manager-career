# EA SPORTS FC 27 — Manager Career UI Blueprint (PS5 Title Update v1.2.0)

> **Platform Anchor**: PlayStation 5 (PS5 DualSense Glyph Taxonomy)  
> **Patch Baseline**: Title Update v1.2.0 (November 9–10, 2026)  
> **Simulation Scope**: Authentic 1:1 Manager Career Mode without 3D pitch gameplay  

---

## 1. Executive Summary & Design Anchor

This blueprint defines the architecture, design tokens, navigation routes, and state model for replicating **EA SPORTS FC 27 Manager Career Mode** in the browser.

### Key Architectural Anchors:
1. **PS5 Current-Gen Baseline**: Avoids legacy PS4/Xbox One performance constraints and PC mouse discrepancies. Every HUD footer button prompt strictly follows PlayStation DualSense taxonomy (`✕`, `◯`, `▢`, `△`, `L1`/`R1`, `L2`/`R2`, `D-Pad`/`L-Stick`, `R3`/`L3`, `Options`/`Touchpad`).
2. **Title Update v1.2.0 Patch Line**: Incorporates EA's November 9–10, 2026 patch revisions:
   - Overhauled Team Management & Squad Hub layout.
   - High-contrast green/grey/red stat badges in Player Profile.
   - Centralized **Player Actions Menu (Action List)** overlay.
   - Press Conference morale-impact preview mechanics.
   - Scenario Objectives tile in the Office tab (Live Challenges).
   - Polished Central Hub simulation inputs (*Hold to Advance*).
   - Removed post-match Season Pass popups.
3. **No 3D Pitch Matches**: Omits 3D Play Match and 3D Practice Arena, focusing 100% on off-pitch management, tactical planning, 2D live tactical sim, GTN scouting, and 2D live-call negotiations.

---

## 2. PlayStation 5 DualSense Controller & 60% Keyboard Mapping

| PS5 DualSense Prompt | Suggested Browser Keybind | 60% Keyboard Mapping | Functional Role & Behavior |
|---|---|---|---|
| **`✕` (Cross)** | `Enter` / `Space` / Left-Click | `Space` / `Enter` | Confirm / Open / Select / Activate focused tile |
| **`◯` (Circle)** | `Escape` / Right-Click | `Esc` / `B` | Back / Close Overlay / Exit to parent view |
| **`▢` (Square)** | `F` | `F` | Secondary Context Action / Sort / Filter / Browse All Clubs |
| **`△` (Triangle)** | `T` | `T` / `Y` | Context Action / Swap Teams / Alternate view |
| **`L1` / `R1`** | `Q` / `E` | `Q` / `E` | Top-Level Hub Tabs cycling (`Central` ↔ `Squad` ↔ `Transfers` etc.) |
| **`L2` / `R2`** | `[` / `]` or `1` / `2` | `1` / `2` | Sub-Tabs cycling / Global shortcuts (`L2 Home`, `R2 FC Hub`) |
| **`D-Pad` / `L-Stick`** | Arrow Keys / `WASD` | `W` `A` `S` `D` | 2D Spatial Focus Grid movement (neon cyan selection cursor) |
| **`R-Stick` / `R3` / `L3`** | `R` / Scroll | `R` | Quick action / Cycle kit / Scroll story feed / Toggle details |
| **`Options` / `Touchpad`**| `Tab` / `M` | `M` | Advance Customisation / Save / Settings modal |

---

## 3. Core Engine: Dynamic OVR Data Model

At the core of FC 27 is the **Dynamic OVR** engine, which continuously computes each player's live overall rating based on three interconnected pillars:

```
                          +------------------------+
                          |   Base FIFA Attribute  |
                          |      Attributes col    |
                          +-----------+------------+
                                      |
       +------------------------------+------------------------------+
       |                              |                              |
+------v-------+              +-------v------+               +-------v------+
|     FORM     |              |    MORALE    |               | MATCH FITNESS|
| Last 5 games |              | Happy / Ok / |               | Energy: 0-100|
| ratings avg  |              |  Discontent  |               | Peak -> Unfit|
+------+-------+              +-------+------+               +-------+------+
       |                              |                              |
       +------------------------------+------------------------------+
                                      |
                               +------v-------+
                               |  Dynamic OVR |
                               | Delta: ±1..5 |
                               +--------------+
```

1. **Form**: Rolling match rating average over the past 5 appearances (+1 to +3 for excellent form, -1 to -2 for poor form).
2. **Morale**: Influenced by team results, playing time promises, contract satisfaction, and Press Conference morale answers.
3. **Match Fitness (Energy & Injury Status)**: Combines minute fatigue, natural recovery (Energy Recovery setting), and physical status (Peak, Match Ready, Tired, Exhausted, Unfit, Injured).
4. **Transparency**: Dynamic OVR and underlying attribute changes are exposed across Team Management, Squad Hub, Development Plans, Player Profile, and GTN Scout Reports.

---

## 4. Four-Layer Navigation Stack

The UI router operates as a 4-layer navigation hierarchy with focus memory and stack preservation:

```
Layer 1: Top-Level Tab Router (Horizontal Bar)
  ├── Central (Central Hub)
  ├── Notifications (Inbox & Board Directives)
  ├── Squad (Team Management, Squad Hub, Tactics, Coach Mgmt)
  ├── Scouting (GTN Search, Scout Network, Scout Reports)
  ├── Transfers (Active Negotiations, Shortlist, Transfer History)
  ├── Academy (Youth Staff, Scout Network, Youth Squad)
  ├── Office (Finances, Objectives, Scenario Objectives, Season Calendar)
  └── Customise (Settings, Game Options, Save/Load)

Layer 2: Tab Sub-Grid / Hub Surface
  └── E.g., Squad Tab -> [Team Management] [Tactical Preset] [Squad Hub]

Layer 3: Detail View / Full Table
  └── E.g., Squad Hub Roster Table with sub-tabs [Overview | Stats | Financial]

Layer 4: Modal / Context Overlay Drawer
  ├── Player Actions (Action List: Dev Plan, Contract, Listing, Kit #)
  ├── 2D Live-Call Negotiation Modal (Tension Meter, Installments, Swaps)
  ├── Live Match Tactical Sim Modal (2D radar pitch, events, quick sub)
  └── Press Conference Modal (Identity choice, morale impact preview)
```

### Complete Route: Central ➔ Squad Hub ➔ Player Profile ➔ Back

1. **Central Hub**: Default focus on Task List or *Hold to Advance* tile. Press `R1` (`E`).
2. **Squad Tab**: Focus moves onto `Squad Hub` tile. Press `✕` (`Space`/`Enter`).
3. **Squad Hub Table**: Full roster view. Sub-tabs: `Overview`, `Attributes`, `Form/Morale`, `Financial` (with *open to contract talks* icon). Press `D-Pad Down` (`S`) to select player.
4. **Player Actions (Action List)**: Pressing `✕` opens the context action drawer:
   - *View Player Profile*
   - *Development Plan*
   - *Contract Renewal*
   - *Add to Transfer / Loan List*
   - *Block Offers*
   - *Change Kit Number*
5. **Player Profile**: Overview card with v1.1.0 high-contrast green/grey/red stat badges, Dynamic OVR breakdown, up to 7 secondary positions, PlayStyles, and contract value.
6. **Return (◯ / `Esc`)**: Pops Player Profile, restores previous Squad Hub scroll position and row index, pops Squad Hub to restore Squad Tab tile focus, and returns to Central Hub with intact state.

---

## 5. Screen Backlog by Flow (No 3D Pitch Gameplay)

### Flow 1: Transfers & Scouting
- **Scouting Hub**:
  - Global Player Search (position, age, contract expiry, playstyle tags).
  - 4-Stage Progressive Scouting: Stage 1 Base Attributes ➔ Stage 2 Tactical Fit ➔ Stage 3 Future Potential ➔ Stage 4 Financial & Status.
  - TransferRoom estimated transfer value (xTV).
- **Transfers Hub**:
  - Sub-tabs: Active Negotiations (Buying / Selling / Renewals), Lists (Shortlist, Transfer List, Loan List, Blocked Offers), Contracts & Clauses, Transfer History.
- **Interactive 2D Live-Call Negotiation Screen**:
  - Split phone-call visual layout (Manager vs Agent / Sporting Director).
  - Real-time **Tension Meter** (calm green ➔ cautious amber ➔ volatile red).
  - Dynamic deal terms: Base Fee, Installments, Sell-On Clause, Buy-Back Clause, Player Swap, Performance Add-ons, Wage & Signing Bonus.
- **Player Reveal Showcase**:
  - Press presentation graphic replacing old transfer grade letter cards.

### Flow 2: Tactics, Coaching & Development
- **Team Management (v1.1.0 Overhaul)**:
  - Starting XI pitch view + Substitutes & Reserves list.
  - Inline player summary card with Dynamic OVR, morale, fitness, and tactical role familiarity.
- **Tactical Presets & Edit Tactics**:
  - Tactical Vision: *Tiki-Taka*, *Gegenpressing*, *Park the Bus*, *Counter Attack*, *Wing Play*, *Kick & Rush*, *Custom*.
  - Formation, Build-Up Style, Defensive Approach, Line Height, Player Roles.
- **Coach Management**:
  - 12 coaches across 4 departments (Attack, Midfield, Defence, Goalkeeping).
  - Coaches drive squad development rate and potential estimates.
- **Development Plans**:
  - Target up to 7 playable positions.
  - 6 Growth Profiles (Balanced, Specialist roles, Physical/Pace, Technical).
- **Youth Academy**:
  - Scouting Missions (3, 6, 9 months by country & profile).
  - Youth Squad recruitment roster with potential ranges (e.g., 74–94).
  - Promotion to senior squad.

### Flow 3: Calendar, Office & Competitions
- **Office Tab**:
  - Finances (Shirt Sales, Matchday Revenue, Wage Bill, Scout/Coach Expenses, Net Profit/Loss).
  - Board Objectives (Youth, Brand Exposure, Financial, Domestic Success, Continental Success).
  - **Scenario Objectives Tile (v1.2.0)**: Live Challenges and mid-season management scenarios.
  - Manager Market & Job Offers.
- **Season Calendar**:
  - Month-by-month fixture grid.
  - *Sim to Date* background fast-forward.
- **Deeper Simulation**:
  - 10-League live table tracking (Premier League, LaLiga, Bundesliga, Serie A, Ligue 1, Liga MX Apertura/Clausura, etc.).
- **Interactive Media**:
  - Press Conferences with 2 managerial identity response paths and v1.2.0 morale impact feedback.
  - Unexpected Events engine (player discipline, home sickness, transfer rumors).

### Flow 4: Match Simulation Engine
- **Match Day Screen**:
  - Face-off hero banner with weather, venue, team ratings, and rival manager.
  - Pre-match team sheet & kit selection.
- **Quick Sim**:
  - Instant outcome calculation with goalscorers, cards, fitness decay, and injuries.
- **2D Tactical Sim Match**:
  - Top-down 2D radar pitch representation with real-time minute ticker.
  - In-match tactical adjustments (Mentality: Ultra Defensive to Ultra Attacking).
  - Live tactical substitutions and injury stoppages.
- **Post-Match Summary**:
  - Match stats (possession, xG, shots, fouls).
  - Dynamic OVR updates (+/- based on individual match ratings).
  - Clean exit with no Season Pass level-up popups (v1.2.0 compliance).

### Flow 5: Career Setup, Saves & Settings
- **Save Management**:
  - 15-season save lifecycle with local storage persistence.
  - Checkpoint autosaves prior to major transfer deadlines and cup finals.
- **Career Setup Wizard**:
  - Database selection (2,600+ real players).
  - Club Selection Screen (1:1 with authentic `inputs/screenshotspart2/image (9).png`).
  - Simulation Depth selector (up to 10 simulated leagues).
  - Manager customization & difficulty settings (Board Expectations, Negotiation Strictness, Energy Recovery, Press Conference Frequency).

---

## 6. Official Authentic Visual References in Repository

All primary reference assets are verified and cataloged in the local project environment:

| Screen Flow | Local Authentic Asset Path | Reference Note |
|---|---|---|
| **Central Career Hub** | [`/inputs/screenshotspart2/image (2).png`](file:///Users/alex-k/Documents/eafc27%20players/game/inputs/screenshotspart2/image%20(2).png) | Club Tigres Central Hub (Date, Match card, Tasks, Goal feed) |
| **Club Selection** | [`/inputs/screenshotspart2/image (9).png`](file:///Users/alex-k/Documents/eafc27%20players/game/inputs/screenshotspart2/image%20(9).png) | MSV Duisburg 2x2 quadrants, kit preview, DNA cards |
| **Top Navigation Bar** | [`/inputs/screenshotspart2/image.png`](file:///Users/alex-k/Documents/eafc27%20players/game/inputs/screenshotspart2/image.png) | MC Emblem, Home [L2], Central, Squad, Scouting, Transfers |
| **Squad / Team Sheet** | [`/inputs/screenshots/image (11).png`](file:///Users/alex-k/Documents/eafc27%20players/game/inputs/screenshots/image%20(11).png) | Coventry City Team Management & Team Sheets |
| **Tactics / Preset** | [`/inputs/screenshotspart2/image (6).png`](file:///Users/alex-k/Documents/eafc27%20players/game/inputs/screenshotspart2/image%20(6).png) | 4-2-3-1 WIDE Tactical Preset & Player Roles |
| **Contract Offer** | [`/inputs/screenshotspart2/image (10).png`](file:///Users/alex-k/Documents/eafc27%20players/game/inputs/screenshotspart2/image%20(10).png) | Legia Warszawa Manager Contract Terms & Objectives |
| **Office Calendar** | [`/inputs/screenshotspart2/image (11).png`](file:///Users/alex-k/Documents/eafc27%20players/game/inputs/screenshotspart2/image%20(11).png) | Monthly Calendar & Fixture browser |
| **Transfer Demands** | [`/inputs/screenshots/image (1).png`](file:///Users/alex-k/Documents/eafc27%20players/game/inputs/screenshots/image%20(1).png) | Elliot Anderson Transfer Negotiations & Budget Impact |
| **Office Finances** | [`/inputs/screenshots/image (9).png`](file:///Users/alex-k/Documents/eafc27%20players/game/inputs/screenshots/image%20(9).png) | Coventry City Profit/Loss, Earnings & Expenses |
| **Contact Sheet** | [`/public/contact_sheet.html`](file:///Users/alex-k/Downloads/ea-fc-27-manager-career/public/contact_sheet.html) | Interactive 111-asset contact sheet on `http://localhost:3000/contact_sheet.html` |
