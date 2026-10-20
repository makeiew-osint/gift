---
name: "Подарки от makeiew — Dark Admin Console"
description: "A restrained, evidence-led console for managing giveaway operations."
colors:
  canvas: "#0b0e10"
  sidebar: "#0e1215"
  surface: "#12171a"
  surface-raised: "#171e22"
  surface-hover: "#1d2529"
  ink: "#e7edf0"
  muted: "#a3afb5"
  line: "#2a3439"
  line-strong: "#3a464c"
  action-ink: "#101416"
  success: "#79d99a"
  success-bg: "#14231a"
  warning: "#f2c36b"
  warning-bg: "#292215"
  danger: "#ff8585"
  danger-bg: "#2b181a"
  info: "#91baff"
  info-bg: "#172233"
  chart-bar: "#718087"
  nav-text: "#bdc7cc"
  nav-active-marker: "#d3dce0"
  action-hover: "#cbd5d9"
  danger-border: "#704246"
  danger-hover: "#3a2023"
  success-border: "#33563e"
  warning-border: "#68532c"
  chart-low-text: "#c2cdd1"
  chart-mid-bg: "#303d43"
  chart-mid-text: "#e0e8eb"
  chart-high-bg: "#46565e"
  chart-high-text: "#fff"
  drawer-shadow-tint: "rgba(0, 0, 0, .38)"
typography:
  headline:
    fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif'
    fontSize: "clamp(27px, 2.8vw, 36px)"
    fontWeight: 620
    lineHeight: 1.12
    letterSpacing: "-.035em"
  title:
    fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif'
    fontSize: "17px"
    fontWeight: 600
    letterSpacing: "-.02em"
  body:
    fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif'
    fontSize: "12px"
  label:
    fontFamily: '"Cascadia Code", "Consolas", monospace'
    fontSize: "9px"
    letterSpacing: ".08em"
  scale-8:
    fontSize: "8px"
  scale-10:
    fontSize: "10px"
  scale-11:
    fontSize: "11px"
  scale-13:
    fontSize: "13px"
  scale-14:
    fontSize: "14px"
  scale-15:
    fontSize: "15px"
  scale-16:
    fontSize: "16px"
  scale-19:
    fontSize: "19px"
  scale-20:
    fontSize: "20px"
  scale-21:
    fontSize: "21px"
  scale-22:
    fontSize: "22px"
  scale-23:
    fontSize: "23px"
  scale-25:
    fontSize: "25px"
  scale-28:
    fontSize: "28px"
rounded:
  control: "3px"
  brand-mark: "4px"
  circle: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 12px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 12px"
  button-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 12px"
  nav-active:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "39px"
  status-tag:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    height: "21px"
    padding: "3px 7px"
  search-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 10px"
  selected-giveaway:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    padding: "20px"
---

# Design System: Подарки от makeiew — Dark Admin Console

## Overview

**Creative North Star: "Dark Admin Console"**

This is an operations workspace, not a decorative dashboard: graphite surfaces, hairline separators, compact system typography, and measured data set a quiet, instrument-like tone. Information hierarchy comes from alignment, spacing, and rules rather than bright panels or ornamental depth.

The overview puts recorded totals and the selected giveaway in clear view, with active giveaways and recent events close at hand. Real participant-to-goal progress and the remaining deadline make the selected giveaway's current state quickly scannable. A compact, interactive 3D scene with a gift, trophy, and Stars rewards is linked to that giveaway; selecting a model reveals its recorded prize, winner count, or entry price. Color is reserved for operational states and data series; ordinary navigation and primary actions stay neutral. The same restrained grammar carries through finance, analytics, participants, referrals, review, blacklist, winners, and system views.

**Key Characteristics:**
- Near-black graphite canvas with subtly distinct sidebar and work surfaces.
- Fine neutral separators and mostly flat, square-cornered containers.
- System sans-serif for reading; monospace for IDs, dates, counts, and compact labels.
- Status colors communicate operational state rather than brand decoration.
- Three.js is limited to two task-related views: the giveaway gift model and the analytics activity chart; both remain interactive and subordinate to the recorded giveaway data.

## Colors

Graphite neutrals carry the interface; restrained green, amber, red, and blue distinguish state or information when the data calls for it.

### Primary
- **Cool console ink** (`colors.ink`): Main text and the filled primary action; the action pairs it with near-black text.

### Secondary
- **Operational green** (`colors.success`, `colors.success-bg`): Successful, paid, active, or positive event states.
- **Review amber** (`colors.warning`, `colors.warning-bg`): Pending, review, and refunded states that need attention without implying failure.
- **Failure red** (`colors.danger`, `colors.danger-bg`): Cancelled or failed states and destructive actions.
- **Signal blue** (`colors.info`, `colors.info-bg`): Informational links and the paid-series mark in analytics.

### Tertiary
- **Measured slate** (`colors.chart-bar`): Neutral chart bars, subordinate to the informational paid series.

### Neutral
- **Night canvas** (`colors.canvas`): The page foundation and login-screen backdrop.
- **Rail graphite** (`colors.sidebar`): Navigation rail and compact login console bar.
- **Console surface** (`colors.surface`): Data panes, fields, and selected-giveaway detail.
- **Raised graphite** (`colors.surface-raised`): Active navigation, selected rows, and toast surface.
- **Hover graphite** (`colors.surface-hover`): Temporary hover feedback for navigation and rows.
- **Soft white** (`colors.ink`): Primary readable text and the neutral primary-action fill.
- **Muted steel** (`colors.muted`): Supporting copy, labels, metadata, and quiet states.
- **Hairline / strong rule** (`colors.line`, `colors.line-strong`): Default dividers and stronger control/table boundaries.

**The State-Owns-Color Rule.** Keep the console's ordinary controls and selection neutral; use saturated color only to convey a real status or a defined information series.

## Typography

**Display Font:** Segoe UI (with Helvetica Neue and sans-serif fallbacks)
**Body Font:** Segoe UI (with Helvetica Neue and sans-serif fallbacks)
**Label/Mono Font:** Cascadia Code (with Consolas and monospace fallbacks)

**Character:** The system sans stack keeps administrative reading familiar and compact. Monospace provides a distinct, orderly voice for measured values and machine-like metadata without taking over prose.

### Hierarchy
- **Headline** (weight `620`, `clamp(27px, 2.8vw, 36px)`, line-height `1.12`): Page heading, tightly tracked.
- **Title** (weight `600`, `17px`): Main section titles; pane headings reduce to `12px`.
- **Body** (`12px`, line-height `1.55` where specified): Introductory and explanatory copy.
- **Label** (monospace, `9–11px`, tracking `.03–.09em`): IDs, dates, breadcrumbs, table headings, and compact section labels.
- **Measured values** (monospace, `17–21px`): Totals, counts, and detail statistics; dates and identifiers use smaller mono styles.

**The Data-Gets-Mono Rule.** Use monospace for measured values, identifiers, dates, and compact labels—not for explanatory reading copy.

## Layout

The desktop shell uses a sticky `248px` navigation rail beside a flexible workspace; the rail narrows to `220px` by `1080px`. The top bar is `62px` high. The overview begins with a four-column ruled totals strip, then gives the selected giveaway the largest workspace while keeping the active list and recent event log visible alongside it. At `1080px`, recent events span the grid; at `740px`, navigation becomes an off-canvas drawer and the overview stacks into one column.

Use flexible minimums for content, clamped wide-screen workspace padding (`20px` to `48px`), and `17px` mobile gutters (`13px` at `380px` and below). Common spacing steps recur around `4px`, `8px`, `12px`, `16px`, and `24px`; larger gaps separate work areas. Tables retain horizontal scrolling instead of squeezing columns. Totals and detail statistics reflow to two columns on mobile, while event rows return to a single column.

## Elevation & Depth

The console is flat by default. Layered graphite fills and hairline borders establish surface hierarchy; the open mobile navigation drawer is the one structural shadow. Hover, selection, and focus remain explicit through tonal changes, borders, and outlines rather than elevation.

### Shadow Vocabulary
- **Mobile navigation drawer** (`9px 0 26px rgba(0,0,0,.38)`): Separates the fixed drawer from the workspace while open.

**The Flat-By-Default Rule.** Do not add shadows to ordinary data surfaces; rely on tonal layering and borders.

## Shapes

Controls and panels use deliberately restrained, near-square geometry: a `3px` corner radius for buttons, fields, chips, and navigation rows, with square-edged data panes and tables. One-pixel rules define boundaries. Small status and event marks are circular (`50%` radius), serving as state indicators rather than decorative motifs.

## Components

### Buttons
- **Character:** Compact, direct controls with neutral emphasis.
- **Shape:** Slightly softened square corners (`3px`); minimum height `36px`.
- **Primary:** Soft-white fill with near-black text and `0 12px` horizontal padding.
- **Hover / Focus:** Primary hover shifts to a slightly darker neutral; outline hover uses the raised hover surface. Keyboard focus is a `2px` high-contrast outline with `3px` offset.
- **Secondary / Danger:** Outline controls are transparent with a strong rule; destructive controls use the restrained red surface and red text.

### Chips
- **Style:** Compact monospace status tags (`9px`) with a small leading state dot, a raised graphite fill, and a thin border.
- **State:** Active and paid use green; pending, review, and refunded use amber; cancelled uses red. Ended and free remain muted.

### Cards / Containers
- **Corner Style:** Square data panes with no ornamental rounding.
- **Background:** Console surface against the canvas; raised graphite marks selected rows and active navigation.
- **Shadow Strategy:** Flat at rest; only the open mobile drawer casts a structural shadow.
- **Border:** One-pixel hairline, strengthened at data-table tops and controls.
- **Internal Padding:** Selected-giveaway detail uses `20px`; compact note panels use `14px`.

### Inputs / Fields
- **Style:** Console-surface fill, `1px` strong-rule border, `3px` radius, `36px` minimum height, and `0 10px` horizontal padding.
- **Focus:** High-contrast `2px` outline with a `3px` offset.
- **Error / Disabled:** Disabled buttons retain their shape and reduce opacity to `.55`; warnings use the amber attention panel.

### Navigation
- **Style:** A sticky, icon-led rail with compact mono captions. Inactive rows are transparent; hover adds a graphite tint; the active row uses raised graphite, soft-white text, and a narrow light marker. On mobile, the rail becomes an off-canvas drawer behind a menu control.

### Selected Giveaway
The overview detail pane is the focal record, not a generic metric card: an ID and status lead into the giveaway title and prize, followed by a ruled row of participant, entry, winner, and end-time details. A publishing channel appears only when the record supplies one.

### Recent Events
The event log uses compact text rows, subtle separators, and a small state-colored mark. Event copy remains primary; actor IDs and timestamps sit beneath in muted monospace.

### 3D Models
The selected-giveaway pane includes an interactive Three.js scene with a gift box, trophy, star, and Stars coins. The scene rotates by dragging as a single unit; it remains an illustration of giveaway rewards, not a substitute for the giveaway title, prize description, status, or recorded counts. It does not autoplay.

### Analytics Scene
Daily participation is shown as an interactive 3D column plot: neutral slate represents free entries and information blue represents paid entries. Hover reveals the exact recorded count, a daily data table remains available without WebGL, and the scene does not autoplay or imply unavailable post views. Two period-aware line charts compare daily participation with referral joins and received Stars with recorded refunds; their series use separate scales and include exact daily values in the table.

## Do's and Don'ts

### Do:
- **Do** keep the graphite surfaces, fine separators, and system sans / measured-data mono pairing.
- **Do** reserve green, amber, red, and blue for the operational meanings evidenced by the interface.
- **Do** make the selected giveaway and real recent events the overview's visual focus, with recorded totals in a ruled strip.
- **Do** keep keyboard focus visible and honor reduced-motion preferences.
- **Do** distinguish persisted, checkable records from review signals; keep explanatory text clear about what the data represents.

### Don't:
- **Don't** restore the superseded checkpoint-map visual language or use decorative maps as dashboard content.
- **Don't** turn the overview into a collection of generic metric cards; use the compact totals strip and selected-record layout.
- **Don't** use status colors as general-purpose branding or selection decoration.
- **Don't** imply channel-post views, non-referral acquisition sources, verified human identity, or confirmed fraud.
- **Don't** add ornamental shadows to ordinary tables, panes, or controls.
