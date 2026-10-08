# Hub Calendar Forecast & Volunteer Attendance Rating Guide

This document details the calculations, confidence forecasting models, avatar border color ratings, and CSV export rules powering the **Hub Calendar Service Schedules** (`/admin/hub-calendar`) and volunteer attendance indicators across the application.

---

## 1. Overview & Architecture

The Hub Calendar provides administrative teams with visibility into upcoming Sunday volunteer assignments, milestones (birthdays & anniversaries), and expected service attendance.

To help service coordinators plan realistically for upcoming Sundays, the system computes:

1. **Attendance Rating Scores & Avatar Borders**: Visual ring indicators based on historical attendance fidelity.
2. **Turnup Rate & Slot Confidence Forecasts**: Mathematical turnup expectation per Sunday time slot (`9AM`, `12NN`, `3PM`).
3. **Volunteer Reliability Segmentation**: Categorization of scheduled volunteers into **Solid**, **Moderate**, **At Risk**, or **Excused**.
4. **Curated CSV Export**: Schedule exports containing volunteer contact and confidence tier data without exposing raw internal scores.

```
┌────────────────────────────────────────────────────────────────────────┐
│               Hub Calendar Service Schedules View                      │
│                  (/admin/hub-calendar)                                 │
│  - Sunday Schedule Matrix (9AM | 12NN | 3PM)                           │
│  - Slot Confidence Forecast Banner (Expected turnup & breakdown)       │
│  - Interactive Filter Badges: All | Solid | Moderate | At Risk | Excused│
│  - Volunteer Schedule List with Attendance Avatar Borders              │
│  - CSV Export (service-schedules-YYYY-MM-DD.csv)                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│     Domain Hooks & APIs                                                │
│  - useSundayServiceSchedulesQuery: Sunday schedules & excused lookup   │
│  - getMemberAttendanceStatsMap: YTD attendance & turnup metrics        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
       ┌────────────────────────┐      ┌────────────────────────┐
       │   Attendance Scores    │      │  Slot Confidence Model │
       │  - Point computation   │      │  - Expected turnup (E) │
       │  - Avatar ring colors  │      │  - Active pool ratio   │
       └────────────────────────┘      └────────────────────────┘
```

---

## 2. Attendance Rating Score & Avatar Border Colors

Volunteer avatar border rings visually indicate recent service fidelity throughout the Hub Calendar and member profiles.

### Point Computation Formula

The attendance rating score is calculated from the volunteer's service history in the active evaluation window (e.g., Year-to-Date):

$$\text{Attendance Score} = (1.0 \times \text{Attended Commitments}) + (0.5 \times \text{Late Overrides}) - (1.0 \times \text{Unexcused Absences})$$

| Service Status          | Condition                                                                | Point Value                |
| :---------------------- | :----------------------------------------------------------------------- | :------------------------- |
| **Attended Commitment** | Scheduled and checked in on time                                         | `+1.0`                     |
| **Late Override**       | Scheduled and checked in via manual/late override (`is_override = true`) | `+0.5`                     |
| **Unexcused Absence**   | Scheduled commitment with no check-in and no approved excuse             | `-1.0`                     |
| **Excused Absence**     | Approved excuse submitted for the scheduled Sunday                       | `0.0` (Neutral)            |
| **Walk-in Support**     | Checked in without prior commitment                                      | `0.0` (Tracked separately) |

### Avatar Border Ring Color Thresholds

The avatar rings in the volunteer schedule view map directly to the volunteer's **Turnup Rate Confidence Tier**:

| Turnup Rate Range                        | Confidence Tier    | Ring Class                       | Visual Indication                                |
| :--------------------------------------- | :----------------- | :------------------------------- | :----------------------------------------------- |
| **$\text{Turnup Rate} \ge 70\%$**        | **Solid**          | `ring-emerald-500`               | High reliability volunteer ($\ge 70\%$ turnup)   |
| **$40\% \le \text{Turnup Rate} < 70\%$** | **Moderate**       | `ring-amber-500`                 | Fairly regular attendance ($40\% - 69\%$ turnup) |
| **$\text{Turnup Rate} < 40\%$**          | **At Risk**        | `ring-rose-500` / `ring-red-600` | Low attendance frequency ($< 40\%$ turnup)       |
| _Excused / No history_                   | **Default / None** | `ring-none`                      | Neutral baseline                                 |

---

## 3. Sunday Service Forecast & Confidence Calculations

On any upcoming Sunday, the number of volunteers committed does not always match actual physical attendance. The Hub Calendar provides an automated statistical projection of realistic turnup.

### Definitions

For a given time slot ($S \in \{\text{9AM}, \text{12NN}, \text{3PM}\}$):

- $N_{\text{total}}$: Total number of volunteers scheduled for slot $S$.
- $N_{\text{excused}}$: Number of volunteers with confirmed excused requests for slot $S$.
- $N_{\text{active}} = N_{\text{total}} - N_{\text{excused}}$: Active volunteer pool expected to serve.
- $\text{TurnupRate}_i$: Historical attendance fidelity ratio of volunteer $i$ ($\text{attended} / \max(1, \text{committed} - \text{excused})$, default $0.80$ if no prior history).

### Expected Turnup Computation

The mathematical expectation ($E$) of turnup for the slot is the sum of individual historical probabilities among non-excused volunteers:

$$E = \sum_{i \in \text{Active Pool}} \text{TurnupRate}_i$$

$$\text{Expected Turnup \%} = \begin{cases} \mathrm{round}\left(\frac{E}{N_{\text{active}}} \times 100\right)\% & \text{if } N_{\text{active}} > 0 \\ 0\% & \text{if } N_{\text{active}} = 0 \end{cases}$$

### Individual Volunteer Confidence Tiers

Every volunteer scheduled in the slot is classified into one of four mutually exclusive confidence tiers:

| Tier         | Criteria                                            | Meaning & Action                                                                      |
| :----------- | :-------------------------------------------------- | :------------------------------------------------------------------------------------ |
| **Solid**    | Non-excused AND $\text{TurnupRate} \ge 70\%$        | Highly reliable volunteer; very likely to turn up.                                    |
| **Moderate** | Non-excused AND $40\% \le \text{TurnupRate} < 70\%$ | Fairly reliable; may occasionally miss.                                               |
| **At Risk**  | Non-excused AND $\text{TurnupRate} < 40\%$          | Low historical attendance; high chance of absence. Coordinator should prepare backup. |
| **Excused**  | Formally excused for that date & time slot          | Not expected to serve; excluded from turnup expectation calculations.                 |

---

## 4. Volunteer Staffing Needs & Deficit Modeling

To help ministry coordinators determine if additional volunteers must be recruited or assigned for an upcoming Sunday, the system provides a **Volunteer Staffing Forecast & Deficit Model**.

### Default Role Quotas (Per Time Slot)

Standard default target quantities are defined per service slot (`9AM`, `12NN`, `3PM`):

- **Usher**: `25`
- **Backroom Support**: `10`
- **Prayer Coach**: `50`
- **IMT Support**: `4`
- **VMT Support**: `2`

Coordinators can customize target quotas individually per service slot (`9:00 AM`, `12:00 NN`, `3:00 PM`) or copy active quotas across slots via the **Targets** configuration modal. Configurations are persisted in local storage (`wc:hub-calendar:volunteer-targets`). In the **All Sunday Slots** view, targets and expectations are automatically aggregated across all three slots.

### Realistic Deficit Formula

For each volunteer role $R$ and slot $S$:

$$\text{Expected Turnup}_{R, S} = \sum_{i \in \text{Role } R \text{ Active Pool for Slot } S} \text{TurnupRate}_i$$

$$\text{Volunteers Still Needed}_{R, S} = \max(0, \text{Target Quota}_{R, S} - \mathrm{round}(\text{Expected Turnup}_{R, S}))$$

$$\text{Fulfillment \%}_{R, S} = \min\left(100\%, \mathrm{round}\left(\frac{\text{Expected Turnup}_{R, S}}{\text{Target Quota}_{R, S}} \times 100\right)\right)$$

Coordinators can toggle between viewing the **Active Slot** breakdown or the aggregated **All Sunday Slots** view.

---

## 5. Interactive UI & Filtering

In the Hub Calendar's `SelectedDateDetails` view and `SlotConfidenceForecastBanner`:

1. **Clean Calendar Grid Cells**:
   - Monthly and weekly calendar date cells render clean, uncluttered volunteer avatars without rating rings to keep the month overview readable.
2. **Slot Forecast Banner**:
   - Renders a prominent card for the selected time slot showing:
     - Projected turnup: `~X of Y expected (Z%)`
     - Interactive filter pills: `All (Y)`, `Solid (S)`, `Moderate (M)`, `At Risk (R)`, `Excused (E)`
3. **Interactive Tier Filtering**:
   - Clicking any confidence tier pill filters the volunteer schedule list to inspect specific volunteer cohorts.
   - Re-clicking the active pill or clicking `All` resets the filter.
4. **Selected Date Volunteer Cards**:
   - In the selected date details drawer/panel, each volunteer card displays their avatar with the attendance rating ring, role, category, and an inline confidence badge (`Solid`, `Moderate`, `At Risk`, or `Excused`).

---

## 5. Sunday Schedules CSV Export

Coordinators can export Sunday service rosters via the **Export Schedules CSV** button.

### Export Format & Filename

- **Filename**: `service-schedules-YYYY-MM-DD.csv`
- **Sorting**: Ordered chronologically by Time Slot (`9:00 AM` $\rightarrow$ `12:00 NN` $\rightarrow$ `3:00 PM`), then alphabetically by member `full_name`.

### Export Columns

```csv
Time Slot,Member ID,Full Name,Nickname,Role,Category,Confidence Level,Turnup Rate,Email,Phone,Excused,Excused Reason
```

| Column             | Description                    | Example Value                                |
| :----------------- | :----------------------------- | :------------------------------------------- |
| `Time Slot`        | Formatted service time         | `9:00 AM`                                    |
| `Member ID`        | Unique member identifier       | `MEM-1042`                                   |
| `Full Name`        | Full legal / registered name   | `John Doe`                                   |
| `Nickname`         | Preferred moniker              | `JD`                                         |
| `Role`             | Assigned volunteer role        | `Usher`                                      |
| `Category`         | Volunteer demographic category | `adult`                                      |
| `Confidence Level` | Reliability segmentation tier  | `Solid` / `Moderate` / `At Risk` / `Excused` |
| `Turnup Rate`      | Percentage turnup rate         | `85%` (or `0%` if excused)                   |
| `Email`            | Volunteer contact email        | `john.doe@example.com`                       |
| `Phone`            | Contact phone number           | `0917-123-4567`                              |
| `Excused`          | Excused indicator              | `Yes` / `No`                                 |
| `Excused Reason`   | Excuse rationale if submitted  | `"Out of town business trip"`                |

### Data Privacy & Internal Score Exclusion Policy

> [!IMPORTANT]
> The numerical **Attendance Score** (e.g., `8.5`, `-2.0`) is an **internal metric** used strictly for UI avatar rings and aggregate calculations. It is **never** included in exported CSV rosters shared with external teams or ministry volunteers.
