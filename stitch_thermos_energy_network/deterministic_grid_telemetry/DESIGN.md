---
name: Deterministic Grid & Telemetry
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#424844'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#727974'
  outline-variant: '#c2c8c3'
  surface-tint: '#496458'
  primary: '#00110a'
  on-primary: '#ffffff'
  primary-container: '#0d281e'
  on-primary-container: '#749183'
  inverse-primary: '#afcdbe'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#1a0900'
  on-tertiary: '#ffffff'
  tertiary-container: '#3a1b00'
  on-tertiary-container: '#d17200'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cbe9da'
  primary-fixed-dim: '#afcdbe'
  on-primary-fixed: '#052016'
  on-primary-fixed-variant: '#324c41'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  telemetry-xl:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  telemetry-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  telemetry-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-base: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

The design system establishes a high-precision, mathematical aesthetic for mission-critical grid trading, microgrid telemetry, and distributed energy arbitrage. Drawing inspiration from high-frequency trading terminals, luxury Swiss horology instruments, and high-density industrial control panels, the visual character is deterministic, calm, and authoritative. 

The aesthetic is built on four core tenets:
- **Mathematical Exactness**: Rigid horizontal and vertical alignment lines, micro-borders (1px structural lines), explicit tabular tracking, and fixed monospaced telemetry ensure every fraction of a kilowatt-hour or millicent has dedicated visual weight.
- **Editorial Luxury & Utilitarian Function**: Deep forest green anchors provide gravitas, offset by warm parchment and cream surface fills rather than stark, fatiguing sterile whites. Crisp white contrast is reserved for elevated metric callouts and definitive interaction points.
- **Mission-Critical Clarity**: State signals—specifically grid congestion bands, load shedding warnings, and peer-to-peer execution receipts—take precedence over decorative assets. Surface layers utilize ultra-subtle translucent parchment backdrops, preserving depth without sacrificing legibility under intense data loads.
- **Industrial Precision**: Minimal roundedness, hairline dividers, structured pill telemetry badges, and high-density information architecture allow operators to parse volatile market swings and dynamic tariff vectors within milliseconds.

## Colors

The color palette reinforces the dual nature of ecological energy management and rigorous high-frequency financial settlement. Surface spaces default to warm, unbleached parchment and mineral tones, preventing operator eye strain during long monitoring shifts, while structural framing utilizes deep, timeless forest greens.

### Primary & Brand Layers
- **Primary Deep Forest Green (`#0D281E`)**: The bedrock tone. Applied to major structural navigation headers, primary execution actions, key visual anchors, and highest-level categorical groups.
- **Secondary Energy Emerald (`#10B981`)**: The live transaction and generation signal. Used for export flows, solar yield surplus, profitable P2P bids, and off-peak tariff indicators.
- **Tertiary Tariff Warning / Demand Response Amber (`#D97706`)**: Highlights high-cost capacity periods, pending grid lockups, and demand-response (DR) threshold breaches.
- **Neutral Deep Slate (`#1E293B`)**: High-contrast typographic tone for critical data values, micro-borders, and technical readouts.

### Extended Semantic & Telemetry Colors
- **Surface Canvas (Parchment/Warm Luxury Cream)**: `#FBF9F4` serves as the primary canvas; `#F3EEE3` provides secondary card fills; `#EAE2D2` defines tertiary active wells.
- **Crisp Overlay White**: `#FFFFFF` with precise 1px borders for mission-critical modal overlays and live KPI summary modules.
- **Energy Sage (`#5E8C71`)**: Used for non-urgent baseline metrics, battery float status, and standard load indicators.
- **Tariff Band Spectrum**:
  - *Off-Peak / Surplus*: `#059669` (Emerald 600)
  - *Standard / Normal*: `#5E8C71` (Muted Sage)
  - *Peak Tariff*: `#EA580C` (Sharp Ochre/Orange)
  - *Critical DR Alert*: `#DC2626` (Deterministic Crimson)
- **Grid Carbon Neutral Grey**: `#64748B` for inactive states, axis grid lines, and secondary scalar markers.

## Typography

The typographic hierarchy pairs crisp, modern neo-grotesque UI typography (**Inter**) with high-precision, fixed-pitch monospaced numerals (**JetBrains Mono**).

### Rules for Font Selection & Typesetting
- **Tabular Figures & Metrics**: All values representing currency (c/kWh, USD), engineering units (MW, Hz, MWh, kVA), timestamps (UTC/Epoch), order IDs, and coordinate allocations must strictly employ `JetBrains Mono` with OpenType tabular figures (`tnum`) activated.
- **Visual Cadence & Compact Hierarchy**: Body and narrative text rely on `Inter` with tight negative letter tracking across headers to maintain an authoritative, technical atmosphere.
- **Telemetry Identifiers**: Labels designating sensor origins, telemetry bands, and system states must render in `label-caps` (uppercase `JetBrains Mono` with +0.08em letter-spacing) to provide instant scanning speed amid dense graphical layouts.

## Layout & Spacing

The layout is built upon a deterministic 12-column grid system tuned for mission control visibility, high data density, and uninterrupted monitoring.

### Grid & Density Rules
- **Breakpoints**:
  - `Mobile` (< 768px): 4-column layout, compact outer canvas margins (`1rem`), dense internal component spacing.
  - `Tablet` (768px - 1199px): 8-column layout, `1.5rem` gutters.
  - `Desktop / Control Wall` (≥ 1200px): 12-column fixed or fluid grid architecture with `1.5rem` gutters and `2.5rem` outer margins.
- **Rhythm**: Spacing operates on a rigid 4px/8px micro-grid. To preserve the technical feel of an instrument panel, vertical component margins never exceed `space-xl` in operational dashboards. Dense telemetry clusters use `space-xs` (4px) and `space-sm` (8px) gaps.
- **Reflow Architecture**: Multi-pane telemetry arrays collapse into segmented stacked ribbons on mobile. Critical action terminals (order submission, load shedding overrides) dock to persistent bottom panels on handheld displays.

## Elevation & Depth

Visual hierarchy is maintained through precision tonal layering, structural micro-borders, and disciplined glassmorphism rather than heavy drop shadows. The design language avoids floating cards in favor of anchored instrument panels.

### Elevation Tiers
- **Tier 0 (Base Canvas)**: Warm parchment background (`#FBF9F4`). Completely flat.
- **Tier 1 (Instrument Bays & Sub-Panels)**: Surface tint (`#F3EEE3`) framed by a hairline 1px micro-border (`#0D281E` at 12% opacity or `#1E293B` at 10% opacity). No shadow.
- **Tier 2 (Glassmorphic Focus Modules & Telemetry Cards)**: Crisp white (`#FFFFFF`) with 75%–90% opacity, combined with a 12px backdrop blur (`backdrop-filter: blur(12px)`). Defined by a dual outline: a 1px solid perimeter of `#FFFFFF` overlaid on a 1px boundary of `#0D281E` at 8% opacity. Supported by an ultra-diffused, ambient tactile shadow: `0 2px 8px -2px rgba(13, 40, 30, 0.04), 0 8px 24px -4px rgba(13, 40, 30, 0.06)`.
- **Tier 3 (Floating Overlays, Command Modals & Tariff Flyouts)**: Crisp opaque white (`#FFFFFF`), anchored by a 1px border of `#0D281E` at 18% opacity, backed by a clinical projection shadow: `0 12px 32px -6px rgba(13, 40, 30, 0.12), 0 4px 12px -2px rgba(13, 40, 30, 0.05)`.

## Shapes

The design system utilizes a soft architectural radius (`roundedness: 1`). Corners are subtly rounded (0.25rem / 4px base) to eliminate the harshness of raw rectangles while retaining the clinical, calibrated look of precision avionics.

### Radius Implementations
- **Telemetry Indicators, Data Cells & Buttons**: 4px (`rounded-base`).
- **Telemetry Group Cards & Glass Modules**: 8px (`rounded-lg`).
- **Modals & Flyout Sheets**: 12px (`rounded-xl`).
- **State Badges & Status Beads**: Full pill-radius (9999px) strictly reserved for small live simulation markers and tariff band chips.

## Components

### Buttons & Interactive Controls
- **Primary Execution Button**: Deep Forest Green (`#0D281E`) background, crisp white typography, 1px border in `#051B13`. Hover shifts to `#163F30`. Active states trigger a 1px inset micro-glow of Energy Emerald (`#10B981`).
- **Secondary / Action Button**: Warm parchment fill (`#F3EEE3`), slate typography (`#1E293B`), framed with a 1px micro-border (`#D3C9B8`). Hover shifts to `#FFFFFF` with an emerald border accent.
- **Destructive / Load-Shedding Button**: Crisp white background with an active 1px deterministic red border (`#DC2626`) and crimson monospaced typography. Hover fills to `#FEE2E2`.

### Telemetry Cards & Glassmorphic Containers
- Backed with 85% opacity white over parchment, 12px blur, with hairline borders (`#0D281E` at 10% opacity).
- Card headers feature an integrated top metadata rail containing the asset code (e.g., `BATT-NODE-04`) in `label-caps` typography, alongside a live pulsing SVG status bead.

### Badges & Tariff Indicators
- Compact, dense pills featuring uppercase monospaced labels and a 6px status bead.
  - **Off-Peak**: Background `rgba(16, 185, 129, 0.12)`, text `#065F46`, bead `#10B981`.
  - **Normal**: Background `rgba(94, 140, 113, 0.15)`, text `#2C4C38`, bead `#5E8C71`.
  - **Peak**: Background `rgba(217, 119, 6, 0.15)`, text `#92400E`, bead `#D97706`.
  - **DR Alert**: Background `rgba(220, 38, 38, 0.15)`, text `#991B1B`, bead `#DC2626` (pulsing animation: 1.2s ease-in-out).

### Numeric Input Fields & Order Sliders
- Inputs feature parchment background wells (`#EAE2D2` at 60% opacity), 1px solid slate border (`#CBD5E1`), and active focus rings displaying a 1px Forest Green outline accompanied by a 2px Emerald halo (`rgba(16, 185, 129, 0.25)`).
- Numerals enter strictly in `JetBrains Mono`. Integrated stepper increments (+/-) snap to deterministic tick increments (e.g., 0.05 kWh or $0.001).

### Lists & Ledger Tables
- Alternating rows employ subtle parchment striping (`#FBF9F4` to `#F5EFE4`).
- Column headers are anchored by `label-caps` in `#64748B`, separated from rows by a continuous 1px micro-border. Numeric columns align flush right to maintain tabular decimal alignment.

### Specialized Energy Telemetry Modules
- **Bid/Ask Order Books**: Depth displays use emerald green (`#10B981` at 15% opacity) for cumulative bid fills and ochre/orange (`#EA580C` at 15% opacity) for cumulative ask fills.
- **Power Flow Directional Vectors**: Animated dashed SVG conduits rendered in Emerald (export) and Slate Charcoal (import) to show instant localized energy transfer.