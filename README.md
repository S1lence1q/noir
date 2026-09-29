# NOIR

A precise music application wrapped around expressive visual worlds. Clean black surfaces, typographic restraint, and graphic objects made of grain, generated directly from the music.

Originally started as an experiment in building an immersive music player with zero running costs. It has evolved into a personal, alive music client with personal Daily Mixes, synchronized lyrics, shared-element canvas transitions, and an intelligent music graph.

**[Live Demo](https://noir.arkivet.xyz/) • [Quick Start](#quick-start) • [Features](#features--highlights) • [Tech Stack](#tech-stack)**

---

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
git clone https://github.com/S1lence1q/noir.git
cd noir
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build

```bash
npm run build
npm run preview  # test the production build locally
```

---

## Features & Highlights

* **Visual Atmosphere & Dither Art:** Expressive dithered covers and deterministic color worlds generated dynamically from album art and sound identity (`NoirDitherCover`).
* **Shared-Element Now Playing:** Seamless cover flight transitions between the compact playback bar and the fullscreen canvas, featuring synchronized lyrics (`L`), queue rail toggle, and Soft Shuffle.
* **Curated Home & Taste Profile:** Personal Daily Mixes, "Jump back in", listening history insights ("Your sound"), and cold-start taste onboarding.
* **Curated Artist Profiles:** Clean, stable profiles featuring chronological latest release spotlight cards, format-filtered discographies (Albums, Singles & EPs), "Fans also like" shelves, and authentic biographies sourced from Last.fm and Wikipedia.
* **Intelligent Music Graph:** Hybrid metadata engine combining Deezer and Last.fm for similar artists, radio generation, genres, and discographies.
* **Smooth Crossfading & Audio Core:** Constant-power ($\sin/\cos$) crossfades between tracks to eliminate clicks, pops, and abrupt cuts.
* **Global Search & Shortcuts:** Fast ⌘K command palette, quick artist navigation, and full keyboard control (⌘N for playlist creation, Space for play/pause).
* **Local-First & Zero Cost:** All taste data, playlist state, and cache stored locally in the browser (IndexedDB / localStorage). Runs directly on GitHub Pages with zero server costs.

---

## Tech Stack

- **Frontend Framework:** React 18 + TypeScript
- **Styling & Tokens:** Tailwind CSS, CSS Custom Properties (`--noir-*` design system)
- **Motion & Animations:** Framer Motion / Motion (shared-element layout transitions)
- **Audio:** Web Audio API, HTML5 Audio, streaming orchestration
- **Data & APIs:** Deezer API (JSONP/proxy), Last.fm API, Wikipedia REST API
- **Build Tool:** Vite

---

## Project Structure

```text
src/
├── app/
│   ├── components/          # React components (shell, noir views, player)
│   ├── hooks/               # Custom React hooks (audio, playback, scroll)
│   ├── services/            # musicGraph, artistIdentity, cache
│   ├── utils/               # Dither algorithms, artwork, math
│   ├── types/               # TypeScript type definitions
│   └── constants/           # Centralized UI strings and tokens
├── public/                  # Static assets and pre-fetched charts
└── index.html               # Entry point
```

---

## Contributing & Issues

Found a bug or have an idea? Feel free to [open an issue](https://github.com/S1lence1q/noir/issues).

---

## About

Built with care, precision, and an obsession with tactile interaction and visual stability.

Works on my machine 👍

---

**[⬆ Back to top](#noir)**
