# PRD — Showreel

**Version:** 1.0 · **Date:** 2026-07-06 · **Owner:** Zu · **Status:** Draft for review

A browser-based tool that turns static design screens into polished, animated showreel videos (MP4) in minutes — no video-editing skills required, and no files ever leave the user's machine.

---

## 1. Overview & Problem Statement

### The problem

Designers routinely need short showreel videos of their work — for portfolio sites, Dribbble/Behance shots, LinkedIn/X posts, and client pitches. Today the options are all bad for this specific job:

- **After Effects / Premiere**: powerful but heavy. Building a simple "screens sliding by" reel takes hours of keyframing, and every new project means redoing the same formulaic work. Requires skills most designers don't want to maintain.
- **Canva / CapCut**: template libraries are aimed at social content and marketing, not design-work showcases. Motion feels generic; fine control over easing and timing is limited.
- **Figma prototypes + screen recording**: recording a prototype produces inconsistent frame rates, cursor artifacts, and no control over output resolution or format.

The output designers actually want is formulaic: N screens, one motion pattern, consistent timing, a chosen aspect ratio, exported as MP4. A formulaic output deserves a purpose-built tool.

### The solution

Showreel is a single-purpose web app: **upload design screens → pick a motion template and aspect ratio → tune speed, easing, and styling → preview live → export MP4**. Everything runs locally in the browser (rendering and encoding included), which makes it free to operate, instant to start, and private by default.

### Why now / why us

This solves the builder's own recurring pain point (dogfooding guaranteed), the enabling browser tech (WebCodecs, OffscreenCanvas) is now mature in Chromium browsers, and the closest competitor (Reelfolio) validates demand with a paid product while leaving room on positioning (see §4).

---

## 2. Goals & Non-Goals

### Goals (v1)

| # | Goal | Measure |
|---|------|---------|
| G1 | A designer with zero video experience produces a share-ready MP4 showreel | Time from first visit to first successful export ≤ 5 minutes |
| G2 | Output quality that looks hand-animated | Smooth motion (no dropped frames in output), professional easing presets |
| G3 | Zero operating cost per user | All rendering and encoding happen client-side; static hosting only |
| G4 | Privacy by architecture | No design file ever leaves the browser; verifiable (no upload network calls) |
| G5 | Foundation that upgrades cleanly to SaaS | Project data model and render engine independent of storage layer (see §8, §10) |

### Non-Goals (v1)

- **No accounts, no cloud storage, no sharing links** — v2/SaaS scope (§10).
- **No video clip input** — images only in v1. (Reelfolio supports video input; we accept this gap initially to keep the render/export pipeline simple. Planned v1.x.)
- **No audio/music** in v1.0 — P1 fast-follow (§6.7), because audio muxing meaningfully complicates export.
- **No mobile editing experience** — desktop browser is the editing environment. Output videos obviously target mobile display.
- **No collaboration/multiplayer.**
- **No freeform keyframe timeline** — this is a template-driven tool, not a mini After Effects. Control is through parameters (speed, easing, style), not keyframes. This constraint is the product.

---

## 3. Target Users & Personas

**P1 — The Portfolio Builder (primary; this is Zu).**
Product/UI designer updating their portfolio site or preparing a job application. Has 5–20 polished screens per project. Wants a hero video per case study. Values: speed, quality of motion, output that matches portfolio aspect ratios (16:9 hero banners, 9:16 for embedded phone demos).

**P2 — The Social Poster.**
Designer or design-adjacent founder posting work on X, LinkedIn, Dribbble, Instagram. Posts frequently, so tool speed and reusable project setups matter. Values: aspect-ratio flexibility (1:1, 9:16, 4:3 per platform), loopable output, fast re-export after swapping a screen.

**P3 — The Client Pitcher.**
Freelancer/agency designer assembling a reel of screens for a proposal or case-study deck. Values: professional look, control over branding (background colors), reliable export.

All personas share: comfortable with design tools (Figma), **not** comfortable or not willing to spend time in video tools.

---

## 4. Competitive Landscape & Positioning

| | **Showreel (us)** | **Reelfolio** | **Glims** | **Canva/CapCut** | **After Effects** |
|---|---|---|---|---|---|
| Purpose-built for design reels | ✅ | ✅ | Partially (stop-motion focus) | ❌ | ❌ (general) |
| Local/private processing | ✅ | ❓ | ✅ (advertised) | ❌ | ✅ |
| Motion templates | 5 at launch | 10+ | 1 style + filters | Many (generic) | n/a |
| Aspect ratios | 5 (9:16, 16:9, 1:1, 4:3, 3:4) | 16:9 focus | Multiple | Multiple | Any |
| Speed + easing control | ✅ Deep (per-project + per-item) | ✅ | Speed only | Limited | Full |
| Tall-page auto-scroll template | ✅ | ❌ (not offered) | ❌ | ❌ | Manual |
| Price | Free (v1) → paid tiers (v2) | Free tier / $79 one-time | Subscription + trial | Freemium | Subscription |

**Positioning:** *"The fastest way from Figma screens to a portfolio video — free, private, in your browser."*

Differentiators to protect:
1. **Local-first & free-to-run** — credible privacy story for unreleased client work (NDA-safe), and a cost structure competitors with server rendering can't match.
2. **Aspect-ratio breadth from day one** — Reelfolio centers on 16:9; social-first designers need 9:16 and 1:1 as first-class citizens.
3. **Tall-screen auto-scroll** — full-page web designs are the most common asset designers have and the most awkward to showcase; a dedicated scrolling template is a wedge feature.

---

## 5. Core User Flow

```
┌─────────┐   ┌──────────────┐   ┌─────────────┐   ┌──────────┐   ┌────────┐
│ Upload   │→ │ Auto-arrange  │→ │ Choose       │→ │ Tune      │→ │ Export │
│ screens  │  │ into sequence │  │ template     │  │ & preview │  │ MP4    │
└─────────┘   └──────────────┘   │ + ratio      │  └──────────┘  └────────┘
                                  └─────────────┘        ↑______________|
                                                     (iterate freely)
```

1. **Land** → empty state with a single drop zone ("Drop your design screens here"). Optional sample project loads demo images so the user can feel the product before uploading anything.
2. **Upload** → drag-drop or file-pick multiple images. Thumbnails appear in a reorderable media rail. Project auto-created and auto-saved locally.
3. **Format** → pick aspect ratio (default 16:9) and a motion template (default: the best-looking general-purpose one). Canvas preview updates instantly.
4. **Tune** → inspector panel: speed (per-item duration), easing preset, background, padding/gap/radius/scale. Live preview with play/pause/scrub.
5. **Export** → choose resolution + fps → progress bar with frame count and cancel → MP4 downloads. Confetti optional but encouraged.
6. **Return** → project list on next visit; reopening restores everything from IndexedDB.

**Critical-path promise:** steps 2→5 with defaults untouched must produce a good-looking video. Defaults are the product for first-time users.

---

## 6. Functional Requirements

Priorities: **P0** = v1.0 launch blocker · **P1** = fast-follow (v1.x) · **P2** = later/opportunistic.

### 6.1 Upload & Media Management

| ID | Requirement | Priority |
|----|-------------|----------|
| UP-1 | Drag-and-drop and file-picker upload of multiple images (PNG, JPG, WebP) | P0 |
| UP-2 | AVIF input support | P1 |
| UP-3 | Reorder items by drag in the media rail | P0 |
| UP-4 | Delete and replace an item without disturbing sequence order | P0 |
| UP-5 | Tall images (aspect > 2:1 vertical, e.g. full-page designs) detected and flagged as "scrollable" — eligible for the Scroll template and auto-fit behavior in others | P0 |
| UP-6 | Images stored as originals in IndexedDB; a downscaled working copy (≤ 2× export resolution on longest edge) is generated for preview/render to cap memory | P0 |
| UP-7 | Soft limit 30 images per project with clear messaging; hard limit 100 | P0 |
| UP-8 | Per-file size guard: warn > 15 MB, reject > 40 MB with explanation | P0 |
| UP-9 | Video clip input (MP4/WebM) as sequence items | P2 |

**Acceptance criteria (representative):**
- Dropping 10 mixed PNG/JPG files creates 10 items in drop order; total time to thumbnails < 3 s for typical Figma exports (~2 MB each).
- Reordering persists after page reload (via auto-save).
- A 1440×6000 full-page screenshot is flagged scrollable and renders without visible resampling artifacts at 1080p export.

### 6.2 Canvas, Format & Styling

| ID | Requirement | Priority |
|----|-------------|----------|
| CV-1 | Aspect ratios: **9:16, 16:9, 1:1, 4:3, 3:4** — switchable at any time; layout re-computes non-destructively | P0 |
| CV-2 | Export resolution presets per ratio: 720p and 1080p-class (e.g. 16:9 → 1920×1080; 9:16 → 1080×1920; 1:1 → 1080×1080; 4:3 → 1440×1080; 3:4 → 1080×1440) | P0 |
| CV-3 | 4K-class export (2160-based equivalents) | P1 |
| CV-4 | Background: solid color (color picker + hex), preset palette | P0 |
| CV-5 | Background: linear/radial gradient, and "ambient blur" (blurred blow-up of current image) | P1 |
| CV-6 | Item styling: corner radius, drop shadow toggle, scale (how much of frame the screen occupies), gap between items (for multi-item templates) | P0 |
| CV-7 | Padding / safe-area control | P0 |
| CV-8 | Device frames (phone/browser chrome around screens) | P2 |
| CV-9 | Watermark/credit text toggle (off by default in v1; becomes free-tier lever in v2) | P2 |

**Acceptance criteria:**
- Switching 16:9 → 9:16 mid-edit preserves item order, template, and styling; only layout math changes.
- Background color applies to preview and export identically (color-managed: sRGB throughout, see §12).

### 6.3 Motion System (templates, speed, easing)

The engine is **template-based**: a template is a pure function of `(project, items, timeMs) → draw calls`. Users control parameters, never keyframes.

**Launch templates (5) — P0:**

| Template | Motion | Best for |
|----------|--------|----------|
| **Scroll** | Tall screen scrolls vertically inside the frame, with configurable hold at top/bottom | Full-page web/app designs (wedge feature) |
| **Slide** | Screens push in from a side (left/right/up/down configurable), settle, push out | Classic app walkthrough |
| **Rise** | Centered hero; next screen rises from below and takes over (Reelfolio-style) | Mobile screens in 9:16 |
| **Fade & Zoom** | Crossfade with slow scale (Ken Burns-adjacent) | Hero/marketing shots, calm reels |
| **Stack** | Cards stacked with slight offset/rotation; front card exits, deck advances | Dribbble/social posts, 1:1 |

**Controls — all P0 unless noted:**

| ID | Requirement | Priority |
|----|-------------|----------|
| MO-1 | Per-project **speed**: duration-per-item slider (0.5 s – 8 s) plus transition-duration slider (0.1 s – 2 s) | P0 |
| MO-2 | **Easing presets**: Linear, Ease In-Out (cubic), Ease Out Expo, Ease Out Back (slight overshoot), Spring (critically-damped feel). Applied to template transitions | P0 |
| MO-3 | Custom cubic-bezier editor for easing | P2 |
| MO-4 | Per-item duration override (e.g. hold the hero screen longer) | P1 |
| MO-5 | **Loop mode**: last item transitions back into the first, producing a seamlessly loopable video | P0 |
| MO-6 | Template-specific options exposed as simple controls (e.g. Slide direction, Scroll hold time, Stack rotation amount) | P0 |
| MO-7 | Intro/outro title card (project name text on background) | P2 |

**Acceptance criteria:**
- Changing easing preset updates the live preview within one frame; no reload or re-layout.
- With Loop mode on, frame 0 and the final frame are pixel-identical, so the MP4 loops without a visible seam.
- All 5 templates work with every aspect ratio (they adapt layout; none is ratio-locked).

### 6.4 Timeline & Preview

| ID | Requirement | Priority |
|----|-------------|----------|
| TL-1 | Real-time canvas preview at project aspect ratio, letterboxed into available space | P0 |
| TL-2 | Play/pause (spacebar), scrubber with current-time / total-duration readout | P0 |
| TL-3 | Preview renders with the **same render function as export** — what you see is exactly what encodes (§8) | P0 |
| TL-4 | Item markers on the scrubber; clicking a thumbnail seeks to that item's segment | P1 |
| TL-5 | Preview degrades gracefully: if the machine can't hold 60 fps, drop preview fps — never desync timing/motion math | P0 |

### 6.5 Export

| ID | Requirement | Priority |
|----|-------------|----------|
| EX-1 | Export **MP4 (H.264 + yuv420p)** — the maximum-compatibility target for portfolio embeds, social uploads, and QuickTime | P0 |
| EX-2 | Encoder path A (primary): **WebCodecs `VideoEncoder`** + JS MP4 muxer (e.g. `mp4-muxer`). Hardware-accelerated where available | P0 |
| EX-3 | Encoder path B (fallback): **ffmpeg.wasm** software encode when WebCodecs H.264 is unavailable (feature-detected at runtime) | P0 |
| EX-4 | **Deterministic frame-by-frame rendering**: export iterates `t = frame / fps`, renders each frame off-screen, and feeds the encoder. Never screen/tab capture — a slow machine exports slower, never worse | P0 |
| EX-5 | Frame rate options: 30 fps (default) and 60 fps | P0 |
| EX-6 | Export modal: resolution + fps pickers, estimated duration and file size, progress bar (frames done / total), cancel button that cleanly aborts and frees memory | P0 |
| EX-7 | Export runs in a **Web Worker with OffscreenCanvas** so the UI stays responsive | P0 |
| EX-8 | WebM (VP9) export option | P1 |
| EX-9 | GIF export (with honest quality/size messaging) | P2 |
| EX-10 | Still-frame PNG export (current preview frame) — cheap feature, useful for thumbnails | P1 |

**Browser support matrix (v1):**

| Browser | Path | Status |
|---------|------|--------|
| Chrome / Edge / Arc (Chromium ≥ 120) | WebCodecs | First-class, tested |
| Safari ≥ 17 | WebCodecs where H.264 encode is exposed; else ffmpeg.wasm | Supported, slower fallback possible |
| Firefox | ffmpeg.wasm | Supported, marked "slower export" |
| Mobile browsers | — | Not supported for editing in v1 (clear messaging) |

**Acceptance criteria:**
- A 12-image, 1080p, 30 fps, ~30 s reel exports in ≤ 60 s on an M1 MacBook Air (WebCodecs path).
- Exported MP4 plays in QuickTime, uploads cleanly to LinkedIn, X, and Instagram (via phone), and embeds with `<video>` autoplay-muted on a portfolio site.
- Export success rate ≥ 99% across the supported matrix in pre-launch testing; failures always produce an actionable error message (§9).
- Cancel mid-export returns to editor in < 1 s with no memory leak (verified over 10 consecutive cancelled exports).

### 6.6 Projects & Persistence

| ID | Requirement | Priority |
|----|-------------|----------|
| PR-1 | Auto-save entire project (settings + image blobs) to IndexedDB, debounced, on every change | P0 |
| PR-2 | Multiple projects: project list screen with thumbnail, name, last-edited; create/rename/duplicate/delete | P0 |
| PR-3 | Storage meter and cleanup UI (IndexedDB quota awareness; warn near quota) | P1 |
| PR-4 | Export/import project as a single `.showreel` file (zip of JSON + images) for backup/transfer between machines | P1 |
| PR-5 | Request persistent storage (`navigator.storage.persist()`) to reduce eviction risk; inform user of local-only storage semantics | P0 |

**Acceptance criteria:**
- Force-quit the browser mid-edit; reopening restores the project with at most the last ~1 s of changes lost.
- Deleting a project frees its IndexedDB space (verified in DevTools storage panel).

### 6.7 Audio (P1 fast-follow)

| ID | Requirement | Priority |
|----|-------------|----------|
| AU-1 | Add one background music track (MP3/AAC/WAV upload) | P1 |
| AU-2 | Trim start point, auto-fade-out at video end, volume control, loop-to-fit | P1 |
| AU-3 | Mux AAC audio into the MP4 alongside video | P1 |
| AU-4 | Small library of bundled royalty-free tracks | P2 |

*Deliberately excluded from v1.0: audio decode + resample + AAC encode + mux is the single biggest complexity multiplier in the export pipeline. Ship silent video first; validate demand.*

---

## 7. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| **Performance — preview** | ≥ 30 fps preview with 20 × 1080p-class images on a 2020 MacBook Air (M1, 8 GB); ≥ 24 fps on a mid-range 2019 Intel laptop |
| **Performance — export** | ≤ 2× realtime at 1080p30 on WebCodecs path (30 s video exports in ≤ 60 s); ffmpeg.wasm fallback ≤ 8× realtime with honest progress UI |
| **Memory** | Peak < 2 GB for a 30-image project at 1080p export. Strategy: decode-on-demand with an LRU bitmap cache (~6 items), downscaled working copies (UP-6), explicit `close()` on `ImageBitmap`/`VideoFrame` |
| **Privacy** | Zero network requests containing user content. Only static-asset and (privacy-respecting, e.g. Plausible) analytics requests permitted. This is verifiable and part of marketing |
| **Offline** | After first load, the app functions fully offline (PWA service worker; ffmpeg.wasm binary cached) |
| **Reliability** | Render function is deterministic: same project + same `t` → same pixels, across preview/export and across sessions |
| **Accessibility** | Full keyboard operation of the editor (tab order, arrow-key nudging of sliders, space = play/pause); WCAG AA contrast in UI; `prefers-reduced-motion` respected in app chrome (not in the video content itself) |
| **Browser floor** | Chromium ≥ 120 first-class; Safari ≥ 17 and current Firefox supported with fallback encoder; unsupported browsers get a capability-detection page, not a broken app |
| **App size** | Initial bundle < 500 KB gz; ffmpeg.wasm (~25 MB) lazy-loaded only when the fallback path is actually needed |

---

## 8. Technical Architecture

```
┌───────────────────────────────────────────────────────────────┐
│ React + Vite SPA (TypeScript)                                 │
│                                                               │
│  UI (React)          State (zustand)        Storage           │
│  media rail          project doc (JSON,     IndexedDB (idb)   │
│  inspector           serializable,          - projects        │
│  export modal        versioned schema)      - image blobs     │
│        │                    │                                 │
│        ▼                    ▼                                 │
│  ┌─────────────────────────────────────────────┐              │
│  │ RENDER CORE (framework-free TS module)      │              │
│  │ renderFrame(project, assets, tMs, ctx2d)    │              │
│  │ - template functions (pure)                 │              │
│  │ - easing functions (pure)                   │              │
│  │ - layout math per aspect ratio              │              │
│  └───────────────┬─────────────────┬───────────┘              │
│                  │                 │                          │
│         Preview loop        Export worker (Web Worker)        │
│         (rAF, main-thread   OffscreenCanvas → frame loop →    │
│         canvas)             WebCodecs VideoEncoder → mp4-muxer │
│                             └─ fallback: ffmpeg.wasm encode   │
└───────────────────────────────────────────────────────────────┘
```

**Key decisions:**

1. **One render function for preview and export** (`renderFrame(project, assets, tMs, ctx)`). This is the load-bearing decision: it guarantees WYSIWYG, makes templates testable (golden-frame tests at fixed `t`), and keeps export deterministic. Preview calls it from `requestAnimationFrame`; the export worker calls it in a `for` loop over frame indices.
2. **Canvas 2D first.** All five launch templates are expressible with 2D transforms + alpha. WebGL/PixiJS is deferred until a template genuinely needs 3D perspective (e.g. Rolodex-style tilt) — revisit at v1.x.
3. **Project document is plain versioned JSON** referencing images by content hash. This makes auto-save trivial, `.showreel` export/import trivial, and — critically for §10 — syncing to a future SaaS backend a storage-adapter swap, not a rewrite.
4. **Export in a Worker via OffscreenCanvas**; UI thread only receives progress messages. Images transferred as `ImageBitmap` (zero-copy).
5. **Encoder abstraction**: `interface Encoder { addFrame(bitmap, tUs); finalize(): Blob }` with WebCodecs and ffmpeg.wasm implementations behind runtime feature detection (`VideoEncoder.isConfigSupported` for `avc1.*`).
6. **No backend in v1.** Static hosting (Cloudflare Pages / Netlify / Vercel static). Note: ffmpeg.wasm's multithreaded build requires `SharedArrayBuffer`, i.e. COOP/COEP headers — host must support custom headers (all three above do).

**Proposed stack:** React 19 + Vite + TypeScript · zustand · idb · mp4-muxer · @ffmpeg/ffmpeg (lazy) · dnd-kit (rail reordering) · Tailwind CSS · Plausible (analytics) · Vitest + Playwright.

---

## 9. UX Requirements

### Editor layout

```
┌────────────────────────────────────────────────────────────┐
│ ⌂ Projects   [Project name ✏️]           [ Export ▸ ]     │
├──────────┬──────────────────────────────┬──────────────────┤
│ Media    │                              │ Inspector        │
│ rail     │        Canvas preview        │ ─ Template  ▾    │
│ (thumbs, │      (letterboxed to        │ ─ Ratio  ▾       │
│  drag to │       chosen ratio)          │ ─ Speed ────○──  │
│  reorder,│                              │ ─ Easing  ▾      │
│  + add)  │  ▶ ──────●────────── 0:12/0:24  ─ Background 🎨 │
│          │                              │ ─ Style (radius, │
│          │                              │    gap, scale…)  │
└──────────┴──────────────────────────────┴──────────────────┘
```

- **Empty state**: single centered drop zone + "Try with sample screens" button. No blank-canvas paralysis.
- **Defaults produce beauty**: new project = 16:9, best general template, tasteful background, sensible speed. First preview should already look shippable.
- **Instant feedback**: every inspector change reflects in the very next preview frame. No "apply" buttons anywhere.
- **Export modal**: settings → single primary button → progress (with fun copy) → success state with file name, "Export again," and (v2 hook) "Share."

### Error & edge states (all with recovery paths, never dead ends)

| Situation | Behavior |
|-----------|----------|
| Unsupported browser | Capability page: what's missing, which browsers work |
| Oversized/corrupt image | Per-file toast naming the file and the fix; other files still import |
| Encoder init failure | Auto-retry on fallback path with a "using compatible mode (slower)" notice |
| Export failure mid-way | Error with frame number + "Retry" + link to a troubleshooting note; project state untouched |
| IndexedDB quota near-full | Banner with storage meter + link to project cleanup |
| Tab closed during export | On reopen: "Your last export didn't finish" with one-click restart |

---

## 10. Monetization & SaaS Roadmap (v2+)

### Phase 1 — v1.0 (now): Free, local, personal
Free and fully functional. Goals: solve Zu's problem, polish the core, build in public, gather usage signal via privacy-safe analytics. The free-forever local tier is permanent — it is the privacy story and the marketing engine.

### Phase 2 — v1.x: Free + Pro (still no backend)
One-time payment (Reelfolio-validated model, ~$49–79) via Lemon Squeezy/Paddle (merchant-of-record handles global tax). License key checked locally.

| | Free | Pro (one-time) |
|---|---|---|
| Templates | 3 | All (5 + new ones) |
| Resolution | 720p/1080p | + 4K |
| Watermark | Small corner credit | None |
| Audio, WebM, `.showreel` export | — | ✅ |

### Phase 3 — v2: SaaS layer (subscription *on top of* local core)
Adds what genuinely requires a server — never paywalling what already works locally:
- **Accounts + cloud project sync** (the local JSON doc syncs; architecture §8.3 makes this an adapter).
- **Hosted share links** (`showreel.app/r/xyz` playing the video + "made with" loop).
- **Team libraries**: shared brand colors, templates, assets.
- Possible: server-side render farm for very long/4K60 exports as a convenience, not a requirement.

Pricing sketch: keep Pro one-time for local features; ~$8–12/mo for the sync/share/team layer. Decision deferred until Phase 2 data exists.

**Architectural prerequisites already in v1:** versioned JSON project schema, content-hash asset references, storage behind an adapter interface, render core with zero DOM dependencies (could run in Node/worker for server rendering).

---

## 11. Success Metrics

**North star: number of exported videos per week.**

| Metric | Target (3 months post-launch) |
|--------|-------------------------------|
| Time to first export (new user, median) | ≤ 5 min |
| Export success rate | ≥ 99% |
| Upload → export conversion (sessions with upload that reach an export) | ≥ 40% |
| Week-4 return rate of users who exported once | ≥ 25% |
| Preview fps ≥ 30 (share of sessions, via sampled perf beacon) | ≥ 90% |
| Template usage spread | No template < 5% (else cut/fix it) |
| Qualitative | 10 unsolicited "made with Showreel" posts in the wild |

All measured with privacy-safe, aggregate analytics — no content, no PII (consistent with G4).

---

## 12. Risks & Open Questions

| # | Risk | Likelihood / Impact | Mitigation |
|---|------|---------------------|------------|
| R1 | **Safari WebCodecs H.264 encode gaps/bugs** | High / Medium | Runtime `isConfigSupported` detection; ffmpeg.wasm fallback is a P0 launch requirement, not an afterthought; test matrix includes Safari from day 1 |
| R2 | **Memory blowups** (many large screens × 4K frames) | Medium / High | UP-6 downscaled working copies, LRU bitmap cache, explicit frame `close()`, soft image limits, memory test in CI with 30×4K-input project |
| R3 | **Color fidelity** (designers *will* notice) | Medium / High | Force sRGB end-to-end: sRGB canvas, tag color primaries in the encoder config, golden-frame color tests; document known P3-display caveats |
| R4 | **ffmpeg.wasm size/perf** hurts fallback-browser first impressions | Medium / Medium | Lazy-load only on need; honest "compatible mode" messaging; recommend Chromium for big exports |
| R5 | **Reelfolio ships our differentiators** (ratios, scroll template) | Medium / Medium | Compete on local-first + free tier + polish speed; this is also why v1 must ship fast |
| R6 | **IndexedDB eviction loses user projects** | Low / High | `storage.persist()`, visible "stored locally on this device" messaging, P1 `.showreel` backup export |
| R7 | **Scope creep toward a general video editor** | High / High | §2 non-goals are contractual; every feature request checked against "is it parameters, not keyframes?" |

**Open questions (decide during build, none block start):**
1. Default template for new projects — pick after building all five and testing with real portfolio screens.
2. Exact speed-slider semantics: duration-per-item (proposed) vs. total-video-duration. Prototype both in M2.
3. Product name — "Showreel" is generic and hard to trademark/search; decide before public launch (not before building).
4. Should Loop mode be default-on for 1:1/9:16 (social) and off for 16:9 (portfolio hero)? Test with users.

---

## 13. Release Plan

| Milestone | Scope | Exit criteria |
|-----------|-------|---------------|
| **M1 — Walking skeleton** (wk 1–2) | Vite app, upload → IndexedDB, media rail with reorder, canvas preview rendering *one* template (Slide) at *one* ratio, play/pause/scrub | Zu can watch his own screens animate in-browser |
| **M2 — Motion & format complete** (wk 3–4) | All 5 templates, all 5 ratios, speed + easing + loop, background & styling controls, template golden-frame tests | Full §6.1–6.4 P0 acceptance criteria pass |
| **M3 — Export** (wk 5–6) | Export worker, WebCodecs path, ffmpeg.wasm fallback, export modal + progress + cancel, browser matrix testing | §6.5 P0 acceptance criteria pass on all four browser rows |
| **M4 — Persistence & polish** (wk 7–8) | Project list, auto-save hardening, storage.persist, error/edge states (§9), PWA offline, a11y pass, perf validation against §7 budgets | Zu produces a real portfolio video start-to-finish and publishes it; dogfood checklist clean |
| **v1.0 launch** | Landing page, sample project, privacy write-up, post on X/Dribbble/designer communities | Live on static hosting |
| **v1.x fast-follows** | Audio (§6.7), 4K, per-item duration, WebM, `.showreel` files, ambient-blur bg, PNG snapshot — sequenced by user feedback | — |

---

*End of PRD v1.0. Sections map to plan decisions confirmed on 2026-07-06; references: glims.io, reelfolio.io.*
