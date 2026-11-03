# Manhwa Maker · AI Studio

A complete, browser-native production studio for Korean-style webtoons (manhwa) — and the craft doctrine that teaches an AI (or a human) how to actually make one.

It is two things in one repo:

1. **A working studio** — concept → story bible → beat sheet → panel direction → prompt compiler → render → lettering → QC → publishable exports, with a live vertical-scroll reader.
2. **A protocol library** — ten chapters of manhwa craft, five machine-readable protocols, and the exact "showrunner" system prompt the studio sends to an LLM on every call.

---

## Quick start

```bash
npm install
npm run dev          # → http://localhost:5173
```

Open the app and you land on a fully authored reference project, **The Lantern Bureau** (dark-fantasy manhwa, 14 directed panels, five rendered key panels, complete lettering and QC). Duplicate it to make it yours, or press **New project** in the project switcher.

```bash
npm run build        # typecheck + production bundle
npm run preview      # serve the build
```

No backend. No accounts. Everything is stored in your browser (localStorage + IndexedDB for images).

---

## What's in the studio

| Stage | What it does |
| --- | --- |
| **1 · Concept** | Logline, scroll hook, theme, platform contract (Naver / Kakao / WEBTOON / Tapas / Lezhin), genre preset, palette, and a frozen **style lock**. |
| **2 · Story Bible** | Premise, hard rules with costs, locations, glossary, visual motifs, and a cast where every character carries a permanent **face anchor**, an outfit, and **reference memory** — versions, sheets, approval. |
| **3 · Beat Sheet** | Eight scroll units (hook → setup → cast → turn → escalate → reveal → breather → stinger), tension curve, scroll-end types, panel budgets, cliffhanger. |
| **4 · Panel Director** | Per-panel shot, angle, composition, vertical weight, gutter, full-bleed, staging, cast, lighting and direction notes — plus a live rhythm bar. |
| **5 · Prompt Compiler** | Deterministic per-panel render briefs: style lock first, cast anchors verbatim, fixed seed, negative prompt. Copy one, copy all, export `.md` / `.jsonl`. |
| **6 · Render** | Storyboard art generated in-app from the style lock, or real image generation (OpenAI `gpt-image` / Gemini image / Pollinations) with your character reference sheets attached, plus per-panel natural-language prompt editing. Upload your own art too. |
| **7 · Lettering** | Draggable balloons with tails, reading order, captions, SFX, safe-area overlay, auto-place, and overflow checks. |
| **8 · QC & Export** | Deterministic editorial audit with a score and specific fixes; export the project, prompt pack, production bible, standalone reader HTML and a printable storyboard. |

### Reference memory (the anti-drift system)

Prompt wording is a suggestion; a reference image is a fact. Every character owns **versions** —
`base` (canonical, never overwritten), `variant` (costume, injury, age, weather) and `evolution`
(awakening, power-up, monster stage) — and every version owns up to five **reference sheets**
(portrait, full body, turnaround, expressions, poses).

- **Face ≠ outfit.** `faceAnchor` holds permanent identity only; wardrobe lives in `outfit` and can
  be overridden per panel. A coat change can no longer redesign a jaw.
- **Panels bind to versions.** `versions[characterId]` picks the design in force; the studio attaches
  that version's sheets to the render call (OpenAI `/images/edits`, Gemini `inlineData`) and tells the
  model which changes are allowed.
- **No reference, no render.** QC flags characters with no sheets, versions bound to panels but never
  drawn, and bindings pointing at deleted versions.
- **Location continuity.** World locations are canonical strings, offered on every panel's setting
  field so a place keeps the same words.
- **Edit with words.** "Move him left, add rain" rewrites that one prompt (or appends, offline) — the
  style lock and identity blocks are invariants, and the compiled prompt is always restorable.

Chapter: [`docs/11-reference-memory.md`](docs/11-reference-memory.md).

Plus:

- **Reader preview** — the real thing: continuous vertical strip, scaled balloons, gutters as time, phone/tablet/desktop widths, "only rendered" mode.
- **AI Director drawer** — a chat surface with your whole project as context.
- **Protocol Library** — every craft document, rendered and searchable, plus the live system prompt.
- **Undo/redo, autosave, project library, JSON import/export.**

---

## AI setup (bring your own key, or none)

Click **Settings** in the sidebar footer.

| Provider | Notes |
| --- | --- |
| **Offline protocol engine** *(default)* | No key, no network. Builds a structured, QC-clean scaffolding from the same doctrine: concept, world, cast, 8-unit beats, panels with shot grammar. It deliberately does **not** ghostwrite dialogue. |
| **OpenAI** | `gpt-4o-mini`, `gpt-4.1`, etc. JSON mode enabled. |
| **Anthropic** | Claude models, direct browser access header included. |
| **Google Gemini** | `generateContent` with JSON mime type. |
| **OpenRouter** | One key, many models. |
| **Ollama** | Fully local (`http://localhost:11434`). |
| **Custom** | Any OpenAI-compatible endpoint. |

Image generation: **Storyboard art** (offline, drawn as SVG from your style lock), **OpenAI Images**, **Pollinations** (no key, experimental), or **upload** your own panels.

**Privacy:** keys live in this browser's localStorage and are sent only to the provider you choose. There is no server in this app to leak them.

---

## The protocol library

In-app at **Protocol library**; on disk under [`/docs`](docs) and [`/protocols`](protocols).

**Craft chapters**

| # | Document |
| --- | --- |
| 01 | [What manhwa actually is](docs/01-what-is-manhwa.md) — manhwa vs manga vs manhua, history, sub-genres, "Korean-ness" on the page |
| 02 | [The vertical scroll format](docs/02-webtoon-format.md) — canvas specs, scroll units, gutters, panel height, safe areas, colour script |
| 03 | [Writing craft for weekly vertical](docs/03-story-craft.md) — logline, want/need/flaw, scenes, dialogue budgets, genre engines |
| 04 | [Panel direction](docs/04-panel-director.md) — shot grammar, angle psychology, composition, 180° rule, staging action, silence |
| 05 | [Lettering, balloons & sound](docs/05-lettering-and-sfx.md) — balloon taxonomy, tails, reading order, typography, SFX, accessibility |
| 06 | [Prompting for consistent art](docs/06-ai-prompting.md) — style locks, anchors, seeds, reference sheets, failure modes, edit loop, ethics |
| 07 | [Production pipeline](docs/07-production-pipeline.md) — roles, weekly clock, gates, panel math, naming, version control, cost control |
| 08 | [QC and continuity](docs/08-qc-and-continuity.md) — five continuity axes, blockers, readability audit, platform rejections |
| 09 | [Korean language & localisation](docs/09-korean-language-and-localization.md) — register, honorifics, indirect refusal, names, localisation workflow |
| 10 | [Publishing & business](docs/10-business-and-publishing.md) — platforms, retention, monetisation, contracts, marketing, pitching |
| — | [Cheat sheet](docs/CHEATSHEET.md) — the one-page version of all of it |

**Machine-readable protocols**

| File | Contents |
| --- | --- |
| [`manhwa-master-protocol.md`](protocols/manhwa-master-protocol.md) | The full operating manual for an AI showrunner (stages, laws, QC, output contract, refusals). |
| [`stage-contracts.json`](protocols/stage-contracts.json) | Inputs, outputs, gates and AI instructions for all 8 stages. |
| [`layout-grammar.json`](protocols/layout-grammar.json) | Canvas specs, shot/angle/composition tables, gutter scale, rhythm templates, continuity rules. |
| [`qc-checklists.json`](protocols/qc-checklists.json) | Blockers, notes, readability, continuity, platform review and accessibility checks with scoring. |
| [`prompt-templates.json`](protocols/prompt-templates.json) | Style-lock and anchor templates, prompt order, negatives, shot/lighting phrase banks. |
| [`style-presets.json`](protocols/style-presets.json) | Seven complete style-lock recipes with palettes. |

Edit those files and the studio updates — the library reads them at build time, and the AI system prompt is compiled from them.

---

## How the AI is actually wired

Every AI action (`Develop concept`, `Build world`, `Cast the series`, `Write beat sheet`, `Break down episode`, the editor's verdict, and the Director chat):

1. sends the **condensed showrunner protocol** as a system message,
2. sends your **live project context** (logline, rules, cast anchors, beats, panel-by-panel staging),
3. sends a **stage contract** describing the exact JSON schema expected,
4. parses the response defensively (fences, chatter and partial JSON tolerated),
5. validates every field (enum whitelists, clamps, name→id resolution),
6. applies it as one undoable patch to the project.

If no key is configured, step 1–4 are replaced by the offline protocol engine, which follows the same contracts deterministically.

---

## Exports

| Export | Format | Use |
| --- | --- | --- |
| Project | `.manhwa.json` (optionally with images inlined) | Backup, hand-off, re-import |
| Render pack | `.md` and `.jsonl` | Feed an image pipeline or a human art team |
| Production bible | `.md` | Series continuity for writers and artists |
| Reader | standalone `.html` | Share, publish, or archive the scroll |
| Storyboard | print view | Review on paper, draw from it |

---

## Project structure

```
src/
  store/      domain model, constants (looks, shots, platforms…), demo project, studio state
  lib/        prompt compiler, QC engine, exports, markdown, IndexedDB image store
  ai/         protocol prompt, provider adapters, offline engine, orchestrator
  components/ design system, storyboard renderer, art stage, shell, copilot
  views/      the eleven screens
  styles/     design tokens + view styles
docs/         the craft corpus (markdown)
protocols/    machine-readable doctrine (json + master protocol)
public/demo/  rendered key panels for the reference episode
```

---

## Design notes

- **No build-time UI libraries.** React + hand-written CSS; 38 source files, ~175 KB JS gzipped + ~13 KB CSS.
- **Storyboard art is real.** When you have no image key, panels are drawn as deterministic SVG frames from the style lock — palette, composition guides, shot scale, figure silhouettes — so you can direct and read the episode before spending a single render.
- **Images never bloat the project.** Rendered art lives in IndexedDB and is referenced by an asset key; undo snapshots and autosaves stay small.
- **QC is deterministic.** The audit runs on every keystroke and produces a score with specific fixes, not vibes.

---

## Credits & influences

Reference memory adapts the versioned character-memory model from
[**RemiPelloux/agent-mangaka-forge**](https://github.com/RemiPelloux/agent-mangaka-forge) (MIT) — base /
variant / evolution versions, the five-sheet reference set, and the "no reference, no render" rule.
The face/outfit separation, dialogue-budget discipline and natural-language panel editing were informed
by [**jays0606/mangstoon_ai**](https://github.com/jays0606/mangstoon_ai) (no license — concepts only;
no code or text was reused). All implementation here is original: browser-local TypeScript wired to
this studio's own prompt compiler, QC engine and providers.

## Honest limits

- Serious image generation needs your own API key; the built-in storyboard mode is a blocking/direction tool, not final art.
- Platform specs (widths, panel counts, monetisation) change — treat them as craft guidance and check current submission guidelines.
- AI assistance should be disclosed where the platform requires it. Writing, staging, lettering and QC are authorship; keep a human on them.
- This is a studio, not a publisher. It produces files; you still have to ship them.
