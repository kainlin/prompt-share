---
name: Editorial Precision
colors:
  surface: '#fcf9f7'
  surface-dim: '#dcd9d8'
  surface-bright: '#fcf9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f1'
  surface-container: '#f0edeb'
  surface-container-high: '#eae8e6'
  surface-container-highest: '#e5e2e0'
  on-surface: '#1c1c1b'
  on-surface-variant: '#464742'
  inverse-surface: '#31302f'
  inverse-on-surface: '#f3f0ee'
  outline: '#767872'
  outline-variant: '#c7c7c0'
  surface-tint: '#5f5e5d'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1c1a'
  on-primary-container: '#858382'
  inverse-primary: '#c9c6c4'
  secondary: '#3b0de9'
  on-secondary: '#ffffff'
  secondary-container: '#553dff'
  on-secondary-container: '#e1dcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#380d00'
  on-tertiary-container: '#e45415'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e0'
  primary-fixed-dim: '#c9c6c4'
  on-primary-fixed: '#1c1c1a'
  on-primary-fixed-variant: '#474745'
  secondary-fixed: '#e3dfff'
  secondary-fixed-dim: '#c5c0ff'
  on-secondary-fixed: '#130067'
  on-secondary-fixed-variant: '#3600e1'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59b'
  on-tertiary-fixed: '#380d00'
  on-tertiary-fixed-variant: '#822800'
  background: '#fcf9f7'
  on-background: '#1c1c1b'
  surface-variant: '#e5e2e0'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-main:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '450'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '450'
    lineHeight: 20px
  stats-mono:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  admin-sidebar-width: 96px
  docs-sidebar-width: 260px
  navbar-height: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is built upon a fusion of **high-end editorial aesthetics** and **fintech precision**. It aims to evoke the tactile quality of a premium physical journal while maintaining the high-performance utility of a modern SaaS platform. The interface should feel warm, intentional, and authoritative.

The style leverages **Minimalism** with **Tactile** influences. By utilizing a "paper-on-paper" layering technique, we create a sense of physical structure without relying on heavy shadows. The aesthetic is defined by generous negative space, sophisticated typography, and ultra-refined hairlines that suggest meticulous craftsmanship.

## Colors

The palette is anchored by **Canvas Cream**, providing a soft, non-clinical background that reduces eye strain and reinforces the editorial narrative. **Ink Black** serves as the primary driver for legibility and high-impact UI elements.

- **Canvas Cream (#F3F0EE):** The global foundation. All surfaces sit atop this color.
- **Pure Panel (#FFFFFF):** Reserved for elevated interactive surfaces like cards and focused inputs.
- **Electric Indigo (#533AFD):** Used sparingly for digital "utility" actions: hovers, active states, and focus rings.
- **Signal Orange (#CF4500):** A high-visibility accent for status indicators and critical notifications.
- **Notion Macarons:** Soft Sky, Rose, and Mint are used exclusively for categorizing prompt cards, providing a gentle color-coding system that remains readable.

## Typography

This design system uses **Plus Jakarta Sans** (as a high-quality alternative to Sofia Sans) to achieve a modern, humanist look. 

The hierarchy is strictly enforced:
- **Headings:** Utilize a tight letter spacing of -0.02em and bold weights (600-700) to mimic the impact of a magazine masthead.
- **Body Text:** Uses a custom **450 weight**. This slightly-thicker-than-regular weight ensures that text remains legible and "inky" against the cream background.
- **Numerical Data:** All statistics, tokens, and pricing must use **Tabular Lining (tnum)** settings to ensure columns of numbers align perfectly for fintech-grade precision.

## Layout & Spacing

The layout is driven by specialized functional zones:
- **Admin View:** Employs a narrow, **96px fixed sidebar** for high-efficiency icon-based navigation.
- **Storefront View:** Utilizes a **64px glassmorphism top navigation** with a background blur (12px) to keep the focus on content.
- **Documentation/Discovery:** A **260px fixed sidebar** following the "Nextra" pattern, using tree-style navigation for deep information architecture.

Spacing follows an 8px linear scale. Grids are fluid but capped at a 1440px max-width for readability. Margins are generous (40px on desktop) to support the premium, airy brand feel.

## Elevation & Depth

Depth is achieved through **Tonal Layering** rather than traditional drop shadows.
- **Level 0:** Canvas Cream background.
- **Level 1:** Sidebar/Admin areas in Clay Sidebar (#EBE6E2).
- **Level 2:** Content Cards and Inputs in Pure Panel (#FFFFFF).

The only exception to the "flat" rule is the **Focus State**. Interactive elements gain a subtle **Electric Indigo glow** (0 0 0 4px rgba(83, 58, 253, 0.08)) when active, signaling digital precision.

## Shapes

The shape language is defined by **Extreme Radii**. 
- **Standard Cards:** Use a **40px corner radius** to create a soft, friendly, and distinctive container.
- **Interactive Elements:** Buttons, tags, and search bars use a **9999px (capsule) radius**.
- **Nested Elements:** Elements inside a card should scale down their radius proportionately (usually 12px-16px) to maintain visual harmony.
- **Zero Sharpness:** No element in the design system should have a sharp 90-degree corner.

## Components

### Buttons & Chips
- **Primary:** Capsule-shaped, Ink Black background with white text.
- **Secondary:** Capsule-shaped, Hairline Border (#E3E8EE) with Ink Black text.
- **Chips/Tags:** Use the Notion Macaron palette for background colors with dark grey text for categorization.

### Input Fields
- **Default:** Subtle Hairline Border, light cream fill.
- **Focus State:** Background transitions to Pure White (#FFFFFF) with an Electric Indigo glow and border.

### Cards
- **The "Prompt Card":** White background, 40px radius, 1px Hairline Border. Headers within cards should use the Macaron accent colors to denote prompt categories (e.g., "Creative", "Technical", "Logic").

### Lists & Navigation
- **Tree Navigation:** 260px sidebar uses a minimal indented hierarchy. Active items are indicated by a small Signal Orange dot or a weight change to 600.
- **Admin Icons:** 96px sidebar uses 24px centered icons with tooltip labels on hover.

### Lists
- Tabular data should use the Hairline Border for row separation (no vertical lines). Statistics are always right-aligned using tabular numbers.