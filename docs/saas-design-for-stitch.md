# SaaS Web Platform Layout & Design System for Stitch

This document defines the layout structure, page content, and the integrated visual design system of the PromptShare SaaS Platform. It is optimized to serve as the **Single Source of Truth** for prompting **Google Stitch** to perform UI/UX redesigns.

---

## 1. Platform Layout & Pages Architecture

The PromptShare SaaS platform consists of two main visual layers:
1. **SaaS Admin Console (云端商家后台)**: Where prompt creators manage stores and prompt cases.
2. **Storefront Portal (生成式店铺端)**: The customer-facing documentation-style store generated for each tenant.

### A. SaaS Admin Console (`/dashboard`)
*   **Layout Structure**:
    *   **Sidebar**: A narrow sticky vertical bar (`96px`) on the left, displaying logo and icon links for navigation. Foot region carries profile settings and logout options.
    *   **Main Workspace**: A spacious, fluid canvas on the right containing headers, grids, list items, and form settings sections.
*   **Key Pages**:
    *   **Store Overview (Dashboard Home)**: Displaying a grid of owned prompt stores, each styled in specific Notion-pastel card backgrounds, showing cases and subscribers count.
    *   **Prompt Case Management (`/dashboard/cases`)**: High-density list layout showing individual prompt cases, categories, active subscription gates, and direct actions (edit/preview).
    *   **Case Editor (`/dashboard/cases/new` & `/[id]/edit`)**: A clean tabular form panel for managing prompt metadata (Title, category, cover image, preview type, prompt text, tags).
    *   **Store Settings (`/dashboard/settings`)**: Form inputs for customizing store bio, subdomains, display names, and payment/subscription configurations.

### B. Storefront Portal (`/[tenant]`)
*   **Layout Structure (Replicated Nextra Docs layout)**:
    *   **Top Navbar**: Fixed bar (`64px`) with a blurred background (`backdrop-filter`). Contains the brand name (`✨ [StoreName] Prompts`) on the left, and search inputs on the right.
    *   **Left Sidebar**: A fixed `260px` panel with scrollable inner navigation showing the Home link and hierarchical category groups, nesting direct links to cases.
    *   **Central Content**: Wide reading container displaying introduction and markdown-styled prompt information.
    *   **Right Sidebar**: A thin `220px` Table of Contents (TOC) highlighting headings dynamically.
*   **Key Pages**:
    *   **Storefront Homepage**: Introducing the store, step-by-step usage rules, and a clean grid of available categories.
    *   **Prompt Case Page (`/[tenant]/[caseId]`)**: Visual display consisting of category path, prompt header, multi-modal preview (image/video/iframe sandbox), and a subscription-locked prompt block.

---

## 2. Integrated Visual Theme (Stripe + Mastercard + Notion)

The platform merges the **data structure/clarity of Stripe** with the **warm, tactile texture of Mastercard and Notion**.

*   **Mastercard Warm Atmosphere**: Uses putty-cream canvas bases, warm ink blacks, rust-orange accents, and oversized card roundings (`40px`).
*   **Stripe High-Precision Details**: Incorporates hairline dividers, electrical indigo action links, and tabular numbers formatting.
*   **Notion Soft Pastel Tints**: Applies soothing color fills for categorizing visual groups.

---

## 3. Stitch-Ready Design System Specifications (DESIGN.md)

Copy and feed the markdown block below into **Google Stitch** to guide its screen generation and layout design.

```markdown
# Design System: PromptShare SaaS Platform

## 1. Visual Theme & Atmosphere
A warm, clinical yet highly-crafted editorial software interface. It fuses the structured mathematical alignment of fintech dashboards with the organic warmth of a premium annual report. Spacing is comfortable, corners are soft and oversized, and typography is geometric and dense.
- **Density Score**: 5 (Balanced & readable software UI)
- **Variance Score**: 6 (Asymmetric spacing & micro-movements)
- **Motion Score**: 6 (Fluid CSS easing, spring-physics active states)

## 2. Color Palette & Roles

### Base & Backgrounds (Mastercard-derived Putty-Cream)
- **Canvas Cream** (#F3F0EE) — Primary page background; warm putty-toned paper feel.
- **Pure Panel** (#FFFFFF) — Main card faces, form sections, and navbar surface.
- **Clay Sidebar** (#EBE6E2) — Sidebar background surface.

### Ink & Text (Warm Neutrals)
- **Ink Black** (#141413) — Primary headings, body copy, and primary buttons.
- **Slate Gray** (#696969) — Secondary text, metadata descriptions, and inactive states.

### Borders & Accents (Stripe Precision)
- **Hairline Border** (#E3E8EE) — Ultra-thin divider lines for grids, inputs, and cards.
- **Electric Indigo** (#533AFD) — Primary action states, navigation highlights, active inputs.
- **Signal Orange** (#CF4500) — Rust-orange category dots and alert signals.

### Notion Pastel Accents (Card Fills)
- **Soft Sky** (#DCECFA) — Photography category cards
- **Soft Rose** (#FDE0EC) — Products category cards
- **Soft Mint** (#D9F3E1) — Characters category cards
- **Soft Orange** (#FFE8D4) — Generic tags or settings panels

## 3. Typography Rules
- **Display/Headlines**: "Sofia Sans", system-ui, sans-serif. Letter-spacing is set tight (-2% / -0.02em) with weights 600–700 for an editorial look.
- **Body Text**: "Sofia Sans", "Inter", sans-serif. Font weight is set to 450 (softer than regular 400, cleaner than 500) with a leading ratio of 1.45.
- **Tabular/Metadata**: "Inter", monospace (with `font-feature-settings: "tnum"`). Used for stats, subscriptions, and number counts to align figures vertically.

## 4. Component Stylings
- **Buttons (Ink Pill)**: Rounded fully pill-shaped (`9999px`). Dark Ink (#141413) fill with Cream (#F3F0EE) text. Active push feedback shrinks slightly (-1px translate) with no neon glows. Secondary buttons are outlined using Hairline Border.
- **Cards**: Oversized rounded corners (`40px` for main cards, `20px` for items). Box shadows are highly diffused (`0 24px 48px rgba(20, 20, 19, 0.08)`).
- **Inputs**: Label positioned above. Border is Hairline (#E3E8EE) on light gray background. Focus state transitions to Electric Indigo (#533AFD) border with `0 0 0 4px rgba(83, 58, 253, 0.08)` glow.
- **Sidebar Footer Controls**: Language switcher is a borderless globe icon button (`🌐 中文`), theme switch uses a sun icon, and collapse triggers use window icons. Aligned horizontally at the bottom.

## 5. Layout & Spacing
- Layouts are aligned using strict CSS Grids with asymmetric layouts. 
- Centered alignments are banned for case grids. Spacing margins are set using `clamp()` logic to resize dynamically from mobile (single column) to desktop (multi-column).
- Sidebar footer must be sticky and fixed at the viewport bottom while navigation lists scroll independently.

## 6. Anti-Patterns (Banned AI Tells)
- No emojis inside labels (except specified icons like 📷/🛍️/🧍).
- No pure black (#000000) or pure white shadows.
- No neon cyan, purple, or pink gradients in buttons or background panels.
- No overlapping typography or stacked absolute elements.
```
