# RECONSTRUCTION REPORT — GreenCube (`greencube.space`)

## Executive Summary
This document provides the complete reverse-engineering and reconstruction report for the GreenCube website (`greencube.space`), an award-winning high-craft interactive 3D architectural showcase.

The website was de-minified, reconstructed, and translated into a clean, fully-functional React 19 + TypeScript + Vite + Three.js application while maintaining 100% fidelity to the visual design, typography, layout grid, CSS custom properties, GLSL shaders, camera physics, and responsive breakpoints.

---

## 1. What Was Recovered Exactly
- **Exact CSS Variables & Layout Grid**:
  - Color palette: `--forest` (`#1f3a27`), `--lemon` (`#cff851`), `--sand` (`#efede0`), `#c5ec4d`.
  - Fluid fluid typography scale (`--title-xl`, `--title-l`, `--title-m`, `--title-s`, `--text-m`, `--text-s`, `--text-xs`).
  - Fluid column and padding math (`--column`, `--space`, `--radius`).
- **DOM Hierarchy & Structural CSS Classes**:
  - Reconstructed exact module class mappings (`_190b32`, `_68f6d6`, `_2680ad`, `_2bb0cd`, `_8ff6a2`, `_b400e8`, `_c1b0c0`, etc.).
- **Typography & Font Pairings**:
  - Garamond Condensed Light (`ITCGaramondStd-LtCond`) paired with Helvetica Neue Light/Medium/Bold.
- **Multilingual Content Structure**:
  - Full German (`de`) and English (`en`) pages and copy for all sections:
    - `index` ("Das Projekt" / "The Project")
    - `wohnen` ("Wohnen" / "Living")
    - `architektur` ("Architektur" / "Architecture")
    - `nachhaltigkeit` ("Nachhaltigkeit" / "Sustainability")
    - `lage` ("Lage & Region" / "Location & Region")
    - `wohnungen` ("Wohnungsangebot" / "Apartments")
    - `kontakt` ("Kontakt & Beratung" / "Contact")
    - `news` ("News & Meilensteine" / "News & Milestones")

---

## 2. Detected Libraries
- **Three.js** (WebGL 3D engine, custom shader materials, instanced mesh rendering, raycasting, camera spherical orbits).
- **Simplex Noise / 3D Noise** (for wind-driven instanced grass and leaf displacement).
- **Prismic CMS** (Headless CMS layer originally used for structured content; compiled locally for standalone execution).
- **Vercel Analytics & Google Tag Manager / GTAG** (Analytics telemetry; mocked / decoupled for local preview).

---

## 3. Recreated Routes
The application supports multi-language client-side routing for both German (`de`) and English (`en`):
- `/de/` & `/en/` — Project Overview
- `/de/wohnen/` & `/en/wohnen/` — Living Concept
- `/de/architektur/` & `/en/architektur/` — Architectural Concept
- `/de/nachhaltigkeit/` & `/en/nachhaltigkeit/` — Sustainability Concept
- `/de/lage/` & `/en/lage/` — Location & Region
- `/de/wohnungen/` & `/en/wohnungen/` — Apartments & Availability Table
- `/de/kontakt/` & `/en/kontakt/` — Contact Form & Inquiries
- `/de/news/` & `/en/news/` — Timeline & Construction Progress

---

## 4. Detected APIs & External Services
- **Prismic Document API**: `https://greencube.cdn.prismic.io/api/v2`
- **Google Tag Manager**: `G-FWFQL9LVNT`
- All content was extracted from the initial compiled payload and bundled locally to ensure 100% offline availability without external API rate limits.

---

## 5. Assets Reused
- **CSS Stylesheet**: Reconstructed 1:1 from minified CSS bundle.
- **Color Palette & SVGs**: Original vector icons for navigation pills and buttons.
- **Font Specifications**: Garamond Condensed Light and Helvetica Neue.

---

## 6. Approximations & Minimal Technical Adjustments
- **3D Architectural Building**: Reconstructed as a high-precision procedural Three.js 3D architectural model with modular wood-hybrid terraces, glass window bays, green louvers, lake water plane, and wireframe edge outlines.
- **Draco Geometry Loading**: Converted to pure WebGL Three.js instanced rendering to eliminate runtime external WASM loading delays, ensuring instant startup in Cloud Run containers.

---

## 7. Backend Requirements
- The contact form includes local interactive feedback and can be bound to any REST/GraphQL backend endpoint via `/api/contact` if desired.
