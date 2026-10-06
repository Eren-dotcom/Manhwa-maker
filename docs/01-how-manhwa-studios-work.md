# 01 — How manhwa studios actually make a manhwa

Research summary. Full source list with confidence notes: `05-research-sources.md`.

---

## 1. The shape of the industry

Manhwa (Korean comics) became **webtoon**: vertical-scroll, full-colour, mobile-first, episodic.
The economics changed the craft:

- **Weekly cadence is the market standard.** A 2022 survey of Korean webtoon writers found
  **63% published weekly**; platforms reward consistency and readers punish gaps.
- **~68 cuts per episode is the norm.** The same survey: *average 68 cuts, median 70*; a separate
  industry explainer puts the "basic requirement" at **70+ cuts per week**. Writers themselves judged
  **50–52 cuts** as the *appropriate* number — the gap between required and sustainable is the fault
  line the whole industry runs on.
- **Top-tier originals run a ~1 month per episode pipeline**, with each department taking roughly a
  week on a **staggered schedule** so a finished episode still ships every week.
- **Pay is per episode delivered** (flat fee + revenue share + recoupable advance), not per hour —
  which is why missing a week is a financial event.

**The implication for you:** the unit of production is not "a drawing", it's **one episode per
week, forever**. Everything below is designed to make that survivable.

## 2. The studio pipeline (who does what)

A webtoon works like an animation pipeline, not like a manga-ka's desk:

| # | Stage | Role (studio) | Output |
|---|---|---|---|
| 1 | **Pre-production** | writer, editor, art director | story bible, arc outline, script, character sheets, palette, asset list |
| 2 | **Script** | writer | episode script: scenes, beats, dialogue, panel intent |
| 3 | **Storyboard / panel layout** | storyboard artist ("webtoon designer") | the vertical layout: camera, panel sizes, gutters, bubble placement, scroll rhythm |
| 4 | **Rough sketch** | line artist | proportioned sketch per panel |
| 5 | **Line art / inking** | line artist | clean lines, detail, depth |
| 6 | **Flat colour** | colourist | base fills, per-character palettes, layer separation |
| 7 | **Backgrounds** | background artist | environments (often 3D-assisted: Acon3D, SketchUp, CSP 3D materials → line extraction) |
| 8 | **Effects / VFX** | effects artist | smoke, debris, magic, speed lines, impact frames |
| 9 | **Lighting & refinement** | render artist | shadows, highlights, mood gradients, final polish |
| 10 | **Lettering** | letterer / typesetter | bubbles, tails, captions, SFX, fonts |
| 11 | **Editing** | editor | pacing notes, continuity, cuts |
| 12 | **Publishing** | producer | slicing, thumbnails, metadata, scheduling |

Two facts worth internalising from artist interviews and studio write-ups:

1. **Storyboard is where problems are cheap.** "Fixing problems in storyboard costs hours. Fixing them
   in finished art costs days."
2. **Studios batch.** "Don't draw one episode start to finish. Sketch five episodes at once, then ink
   five, then colour five." Batching kills context-switching — and it's the single biggest speed lever
   a solo creator ignores.

## 3. The vertical-scroll grammar (the part everyone gets wrong)

Webtoons are not "comics rotated 90°". They have their own grammar:

- **One action per panel.** A page comic fits a whole scene in 4 panels; a webtoon spends 20+ panels
  because each panel is one tiny step. Moment-to-moment pacing is why reading on a phone feels
  immersive.
- **Gutters carry time, not just space.** WEBTOON's own creator guidance: **minimum 200px between
  panels**, **600–1000px for a scene/location transition**. Tight gaps (under 100px) read fast —
  action, rapid dialogue. Wide gaps (1000px+) read slow — a dramatic pause, a time jump.
- **The bottom of the screen is your cliffhanger.** Readers scroll one screen at a time. The
  strongest image of a sequence goes at the bottom so it has to be scrolled *to*.
- **The 5-panel hook.** You get roughly five panels — eight seconds — to keep a new reader. Backstory
  dumps in episode 1 are the single most-cited reason readers drop off. Backstory is allowed at
  episode 3–5, once they're invested.
- **The 30–40% drop-off point.** Platforms track completion; the biggest reader loss is around panel
  20 of 60. Working creators place a **second hook** there deliberately. Episodes with a strong
  mid-hook lose 5–15% of starters; without one they lose 30–40%.
- **Re-establish in the first 3–5 panels.** Weekly readers come back with imperfect memory. That's a
  craft beat, not filler.
- **Climax at ~2/3, cliffhanger at the end.** The final 10–15% of the episode is a revelation, a
  sting, or an unanswered question.

**Panel count:** 40–80 panels is the working range; the industry average sits near 60. A typical
60-panel episode assembles to roughly 8,000–12,000px of scroll — about 5–8 minutes of reading.
Romance/action run longer (~80), slice-of-life and gag shorter (~40).

## 4. The money and the conditions (read this before romanticising it)

- Korean research (KILSH 2022 survey; KILSH data presented at a 2023 National Assembly forum):
  webtoon artists work **9.9 hours/day on average, 11.8 hours on the day before a deadline**,
  typically producing **70+ panels per episode**.
- Naver Original creators averaged roughly **₩280M/year** (₩150M for first-year) per 2022 company
  figures — versus a long tail of Canvas creators earning nothing. Same platform, same work, wildly
  different outcomes; placement and readership decide, not just effort.
- **Canvas** (self-publish) = no exclusivity, you keep IP, revenue share after thresholds
  (roughly 1,000 subscribers + 40,000 monthly views to start earning). **Originals** = invite-only,
  contractual, exclusive, paid.
- What this means for an AI-assisted creator: you are not competing on drawing speed with a 10-person
  Korean studio. You are competing on **story, taste, and consistency of schedule**. The pipeline
  below hands the mechanical labour to tools so you can spend your hours where the audience actually
  notices.

## 5. Practical techniques the pros use (steal these)

1. **3D blockouts** — CSP 3D models / Acon3D / SketchUp for pose and background blocking, then line
   extraction (`LT conversion` / artistic filter) into the line-art pass.
2. **Close & Fill** — CSP's enclose-and-fill with a reference layer turns flat colouring from hours
   into minutes.
3. **Colour sets per character** — name your palette per character (3–4 key colours each) so the
   colourist can't drift.
4. **Draw bigger than you publish** — 1.5×–2.5× the 800px target (so 1,200–2,000px wide), downscale
   on export. Non-negotiable if you want print later.
5. **Bubble library + custom font** — reuse bubbles and SFX shapes as assets; make one font your
   series' voice.
6. **Reuse and flip** — redraw is a last resort; reuse a background, flip a panel, vary the crop.
7. **Batch by stage, not by episode.**
8. **A 3–4 episode buffer before launch.** Never publish from the leading edge of your own plan;
   weekly readers calibrate to your cadence and a gap costs you the readership you just built.
9. **Write dialogue before drawing the panel** — bubble space is the cheapest thing to reserve and the
   most expensive thing to retrofit.
10. **Preview on a phone** before you upload. Every studio does; it catches the pacing errors.

Next: `02-pipeline-step-by-step.md` — the same pipeline, executed solo with AI.
