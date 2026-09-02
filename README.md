# Elva

A fullscreen music player built through a dangerous combination of curiosity, poor impulse control, and vibe coding.

Originally, the goal was to make a simple music player. Unfortunately, every time I finished a feature, I got another idea. So now it has animated WebGL backgrounds, synchronized lyrics, audio crossfading, dynamic color extraction, profile customization, and a weird volume thing I made at 2am.

**[Live Demo](#demo) • [Quick Start](#quick-start) • [Features](#features) • [Tech Stack](#tech-stack)**

---

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
git clone https://github.com/S1lence1q/elva.git
cd elva
npm install
npm run dev
```

The app will be available at `http://localhost:5173` (or your configured dev port).

### Restore point (design fallback)

Before large UI experiments, restore to the last known-good state:

```bash
git checkout fallback/pre-design-2026-09-02
# or on main: git reset --hard fallback/pre-design-2026-09-02
```

Tag/branch: `fallback/pre-design-2026-09-02` · commit `8c32a94d` (`chore: checkpoint before design overhaul`).

### Build

```bash
npm run build
npm run preview  # test the production build locally
```

---

## Features

* **Fullscreen immersive music experience:** Beautiful, glassmorphic layout.
* **Interactive synchronized lyrics:** Apple Music-style lyrics with click-to-seek scrubbing.
* **Smooth track crossfading:** Mathematical constant-power ($\sin/\cos$) crossfades.
* **Dynamic album-based theming:** Subtle, muted color extraction that morphs with each track.
* **Search and charts:** Real-time Apple Music charts (DK & Global) and official audio search ranking.
* **Queue management:** Seamless sidebar search and horizontal carousels with drag/Likes.
* **Profile customization:** Edit name and select premium custom WebGL gradient presets.
* **YouTube and audio playback support:** Dual playback engines orchestrating HTML5 audio and YT streams.
* **Overengineered volume controls:** Hold to charge and shoot volume levels as a physics projectile dot in a parabolic trajectory.

---

## Tech Stack

- **Frontend Framework:** React + TypeScript
- **Graphics:** WebGL (custom shaders for animated backgrounds)
- **Audio:** Web Audio API, HTML5 Audio, YouTube streaming
- **Styling:** Tailwind CSS / styled-components
- **Build Tool:** Vite
- **Color Processing:** Dynamic color extraction from album art

---

## Project Structure

```text
src/
├── app/
│   ├── components/          # React components (UI, player, etc.)
│   ├── hooks/              # Custom React hooks (audio, playback logic)
│   ├── utils/              # Utilities (color extraction, math, etc.)
│   ├── types/              # TypeScript type definitions
│   └── styles/             # Global styles and animations
├── public/                  # Static assets
└── index.html              # Entry point
```

---

## Technical Deep Dive

### Audio Architecture

- **Dual playback engines:** HTML5 Audio for local files, custom YouTube orchestration for streams
- **Constant-power crossfades:** Smooth volume transitions using sine/cosine math to avoid clicks and pops
- **Audio preloading:** Smart preloading of next tracks for seamless playback

### Visual Effects

- **WebGL backgrounds:** Custom fragment shaders with real-time color modulation
- **Scroll-based animations:** Synchronized animations tied to scroll position
- **Dynamic theming:** Real-time color extraction from album artwork

### Performance

- **Memoization:** Custom React hooks to prevent unnecessary re-renders
- **Lazy loading:** Components and assets loaded on demand

---

## Known Issues & Limitations

- Lyrics sync occasionally drifts (send a prayer to the audio gods 🙏)
- YouTube playback depends on stream availability
- Some WebGL effects may struggle on older GPUs
- See the [Issues tab](https://github.com/S1lence1q/elva/issues) for reported bugs

---

## Configuration

### Environment Variables

Create a `.env` file in the root directory (if needed):

```env
# Add any required API keys or configuration here
```

### Customization

- **WebGL presets:** Edit gradient presets in `src/app/utils/gradients.ts`
- **Lyrics sync:** Adjust timing offsets in `src/app/hooks/useLyricsSync.ts`
- **Colors:** Tweak color extraction thresholds in `src/app/utils/colorExtraction.ts`

---

## Contributing

Found a bug or have an idea? Feel free to [open an issue](https://github.com/S1lence1q/elva/issues).

Pull requests are welcome! Just keep in mind: **if it works, nobody is allowed to touch it.** 🚫

---

## License

[Add your license here - MIT, GPL, etc.]

---

## About

Don't know what I'm doing, but it's pretty cool and stuff.

I was supposed to stop adding features months ago.

The application is currently held together by React, determination, and whatever dark magic powers CSS animations. If you find a bug, then that sucks lol. Maybe it will get fixed.

Works on my machine 👍

---

**[⬆ back to top](#elva)**
