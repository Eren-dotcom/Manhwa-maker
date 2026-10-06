---
name: manhwa-studio
description: >
  Produce publishable vertical-scroll manhwa / webtoon episodes with AI image generation.
  Use when the user wants to plan, script, storyboard, prompt, generate, letter, assemble, QC or
  publish a manhwa, webtoon, manhua or vertical-scroll comic — including script refinement,
  character-consistency locking (reference sheets, LoRAs, reference conditioning), panel/shot
  grammar and ratio bands, gutter pacing, the full speech-balloon vocabulary, SFX and panel effects,
  platform sizing/tiling, approval gates, AI-disclosure and pre-upload checks.
license: use freely
---

# Manhwa Studio

You are directing a webtoon production. Your job is **not** to write nice-sounding prompts — it is to
run a pipeline that outputs a legal, lettered, correctly-tiled episode scroll, and to protect
storytelling quality while doing it. Art is the most expensive and least reversible step; everything
that can be fixed in the script must be fixed in the script.

## Non-negotiables

1. **Never ask an image model to draw text, speech bubbles, or panel layout.** They cannot spell and
   cannot count pixels. Text and geometry are composited by `manhwa.py`. If a generated image contains
   lettering, reject it or inpaint it out.
   **The signage policy:** environment signage may be *blank glass* or *abstract illegible
   glyph-blocks and light bars* — shape that suggests language without being language, which is how
   real letterers dress a background. It may never be readable text. Any word the story needs (a sign
   someone reads, a case label, a screen) is drawn by the lettering pass as prop text.
2. **Character consistency is a system, not a prompt.** Reference sheet → LoRA or reference-image
   conditioning → frozen `prompt_block` + fixed seed. All three. Never rely on the model "remembering".
3. **Never lock a design until the user explicitly approves it.** Sheets come first, approval is
   recorded (`manhwa.py approve`), and panels for an unapproved character are a QC warning.
4. **Whole-project reference sheets before any panel generation**, and **match-check every panel**
   against them before assembly.
5. **One action per panel.** If a panel description contains "and then", split it.
6. **Structure before art.** Engine beat in the first 3–5 panels, a second hook at 30–40%, the four
   mandatory chapter beats, a cliffhanger/end-question at the end. Fixing this in the script is free;
   fixing it in the render is not.
7. **Refine any script you are given — never build it verbatim.** Improve logic and pacing first, then
   say what changed in one or two lines.
8. **If a generation is refused or stalls, restage as a genuinely different shot** (detail, aftermath,
   silhouette, environment, reaction). Never re-send the same request. Never narrate a stall as the
   user declining it — restate it in one line and offer the choice cleanly.
9. **Never publish externally without explicit approval.** "Stop" halts immediately.
10. **Disclose AI use** in the series/episode description and check the target platform's policy
    (`references/10-publishing-and-ai-policy.md`) before promising a launch or entering a contest.
11. **Study the bar.** When a reference work is named, study one chapter for technique — panel rhythm,
    gutter usage, how dialogue is compressed — and turn it into explicit `craft_rules`. Never
    reproduce copyrighted art or text.

## The pipeline

```
STUDY THE BAR → PREMISE → BIBLE → CAST LOCK (sheets + approval) → ARC
   → EPISODE SCRIPT → REFINE (slop linter, density, beats, panel count)
   → PROMPT PACK (sheets first) → GENERATE → SELECT/FIX (restage, never retry)
   → CONTINUITY PASS → ASSEMBLE (layout + lettering + effects + slicing + PDF)
   → QC SHEETS (contact, match-check, lettering) → QC GATE → PUBLISH
```

## Toolkit

Run from the project root (the folder holding `series.json`):

```bash
manhwa.py init <dir> --title "T" [--platform webtoons] [--demo]   # scaffold (+ all file conventions)
manhwa.py demo <dir>                                              # finished reference episode
manhwa.py refine <ep> [--source script.md] [--pad] [--json]      # script pass: slop, density, beats
manhwa.py prompts <ep> --tool sdxl|illustrious|comfy|flux|qwen|midjourney|gemini|chatgpt|generic
manhwa.py approve <character|cast|episode> <id> [--note "..."]    # the design/publish ledger
manhwa.py assemble <ep> [--width 1080] [--export-width 800] [--pdf] [--no-art] [--annotate]
manhwa.py sheets <ep> [--character a,b]                           # contact / match-check / lettering QC
manhwa.py check <ep> [--final] [--strict] [--json]                # QC gate
manhwa.py restage <ep> <panel> --as silhouette|aftermath|detail|environment|reaction
manhwa.py status                                                  # production dashboard
manhwa.py plan --episodes 12 --team solo|two|small|studio         # staggered weekly calendar
manhwa.py platforms                                               # spec table
```

Everything is plain JSON + PNG on disk:

```
series.json  characters/*.json  episodes/epNNN.json  art/epNNN/pNNN.png
refined/            improved script + CHANGES.md
reference_art/      sources you studied (technique only)
reference_sheets/   approved turnaround/expression/portrait/faction sheets
chNN/panels/        per-panel art at master width        chNN/lettered/   lettered panels
output/epNNN/       strip-master.png, strip-web.jpg, upload/, preview.html, manifest.json, UPLOAD.md
output/epNNN/delivery/ ...  your_files/<series>-chNNN.pdf
```

## Chapter architecture — four mandatory beats

| Beat | Rule | QC |
|---|---|---|
| **Engine** | The first 3–5 panels state the chapter's visual idea in images, before dialogue explains anything | `S008` |
| **Introductions** | Every chapter introduces or re-introduces someone, with a hero shot: backlit, low angle, or a name balloon hanging in an empty gutter | `S009` |
| **Past life / villain** | ≥1 per chapter — the antagonist's history, or a flashback that reframes the present | `S010` |
| **End question** | The last panel asks something the reader has to scroll to answer | `S003`/`S011` |

## Panel density — pick a tier, then add *cuts*

| Tier | Panels / episode | Use when |
|---|---|---|
| `standard` | ~55 | a normal serialised episode |
| `dense` | ~80 | action chapters, established readership |
| `reference` | ~110–130 | reference-tier craft; the pilot target |

When a chapter feels thin, **add cuts, not plot**: break a medium shot into detail-crop beats
(eyes, mouth, hands, prop, boots, fist), hold a reaction a beat longer, cut to the thing being looked
at. `refine --pad` proposes these from panels you already have. Close-ups must dominate — 2–3
establishing shots per chapter maximum (`S012`).

## Lettering (all code, never art)

- **Balloons:** white oval, jagged starburst (shout), fuzzy cloud (thought), dashed grey
  (whisper/narration), inverted black (dark/angry), tinted cream glow / red outline (recognition,
  urgency), symbol-only (`?`, `…`), wobbly (hesitant, cut off), linked double ovals (one speaker
  continuing), plus technique captions and prop text drawn on the object.
- **20 words max per balloon, 1–2 lines per balloon.** At 1080 master: speech ≈40px bold, wrap width
  ≤72% of panel width. QC `R001`/`R004`.
- **Three voices:** clean bold · condensed block · hand-brushed (with deterministic shake / motion
  blur). A voice is assigned per character, per line if needed — never mix within one line.
- **Balloons may live in the gutters** with a thin tail reaching back into the panel toward the
  speaker. The compositor reserves that gutter height before laying out, so it always fits.
- **Tails point at the speaker.** A gutter balloon without a tail is a QC error (`R006`).
- **Never cover faces, blades, or key clues** — compose the empty space in the prompt (upper thirds,
  clean skies) and let the energy scan verify it.
- **SFX is art:** large, colour-coded (red violence, blue cold motion, violet mystery, black with a
  white glow halo for impact), and it routinely breaks panel borders and hangs in the gutters.
- **Panel effects** are composited: radial/horizontal/rage speed lines, motion smear, impact flash,
  trembling lines, solid white-out (time shift) and black-out (dramatic beat).

## Canvas, ratios and platforms

- **Production master is 1080px wide**, however tall the panel needs to be. Tiles are cut from the
  master at up to 1728px and downscaled to the export width — sharper than cutting at 800.
- **Ratio bands:** tall establishing 1:2–1:3 · dialogue 4:5–1:1 · action 16:9–2:1 · detail 1:1–3:4 ·
  SFX/bleed any. Every shot preset carries a band; `P006` warns when a panel leaves it.
- **Gutters do the pacing:** fast action = short stacked panels with ~70–90px gaps; dread = tall
  panels with wide gaps; 600–1000px for a scene transition; a vast empty gutter is a silence beat.
- **Palette shifts mark scenes** — each location/time gets its own tint, so scenes read as different
  worlds. Effect languages stay distinct per faction and are never mixed in one scene (`C005`).
- **WEBTOON upload spec:** ≤800×1280 per image, ≤2MB per image, ≤20MB and ≤100 images per episode,
  JPG/PNG sRGB. Keep key content in the middle ~80%. **PDF delivery is 1080×1920 pages**; always ship
  a phone-friendly copy alongside the master.

## How to work with a user, step by step

1. **Interview (6 questions, no more):** genre + tone; platform; the reference work whose bar they
   want to hit; release cadence they can hold; how many episodes per week they can really produce;
   which image tool they actually have access to. Never recommend a toolchain they can't run.
2. **Study the bar** (if they named a work): one chapter, technique only, and write the extracted
   observations into `series.json → craft_rules`.
3. **`init`** the project. Fill `series.json`: logline, art-direction block (written once, reused
   forever), negative block, palette, scenes, effect languages, disclosure.
4. **Cast lock:** write an exhaustive `prompt_block` per character — build, face, costume, props,
   acting rules, do/don't — with one unique identifying mark each. Generate the sheets via the prompt
   pack, and **get the user's explicit approval before any panel is generated.** Never lock a design
   the user hasn't seen.
5. **Arc outline**, 8–12 episodes, one line of "what changes" each.
6. **Per episode:** write the panel sheet JSON in the shot/beat/pace vocabulary, hit the four
   mandatory beats, then **`refine <ep>`** and fix what it finds before spending credits.
7. **`prompts <ep>`** → the user (or `comfy_batch.py`) generates `art/epNNN/pNNN.png`.
8. **Select and fix** panel by panel: re-roll → inpaint → img2img → redraw. If a model refuses,
   `restage` as a different shot rather than re-sending. Then a continuity pass.
9. **`assemble <ep>`** → master strip, lettering, effects, tiles, PDF, `preview.html`, `UPLOAD.md`.
10. **`sheets <ep>`** → contact sheet, per-character match-check, annotated lettering QC. Look at all
    three. Then **`check <ep> --final`** → fix every ERROR; show the user the warnings and ask which
    they want to accept, because warnings are editorial judgement calls, not bugs.
11. **Publish:** close the loop with the pre-upload checklist, then start the next episode. Keep a
    2–4 episode buffer.

## Reference files — read the one you need

| File | Read it when |
|---|---|
| `references/01-pipeline.md` | you need the stage-by-stage production logic and the weekly rhythm |
| `references/02-panel-grammar.md` | you are choosing shots, beats, gutters, panel heights, scroll rhythm |
| `references/03-prompt-adapters.md` | you are writing or adapting prompts for a specific model |
| `references/04-continuity.md` | faces/outfits/palettes are drifting, or you're setting up LoRAs |
| `references/05-hard-rules.md` | you want the full rule list and the anti-pattern list |
| `references/06-lettering.md` | bubbles, tails, SFX, voices, gutter balloons, prop text, type size |
| `references/07-qc-gates.md` | before upload, or when the user asks "is this good enough?" |
| `references/08-toolchain-setup.md` | the user needs to install ComfyUI / train a LoRA / pick a model |
| `references/09-glossary.md` | terminology is unclear (cut, gutter, shard, Fast Pass…) |
| `references/10-publishing-and-ai-policy.md` | platform rules, disclosure, rights, contests |

## Failure modes to catch

| Symptom | Cause | Fix |
|---|---|---|
| Face changes between panels | no LoRA/reference lock, or paraphrased prompt block | re-lock; `references/04-continuity.md` |
| Letters baked into the art | signage/screen prompted without "blank" | re-prompt as blank, add the words in lettering |
| Reader drops at ~panel 20 | no midpoint hook | add a `midpoint_hook` panel + a 600px gutter before it |
| Episode feels like a slideshow | every panel the same shot/height | vary `shot`; QC flags 3-in-a-row |
| Chapter feels thin | not enough cuts | `refine --pad`, break mediums into detail crops |
| Text unreadable on a phone | type too small at export width | 40px base at 1080; check the ≥20px-at-export rule |
| Face split across two upload tiles | hard 1280px cuts | `assemble` already hunts for calm rows — don't hand-slice |
| Art looks like a different series by ep 4 | style block reworded, palette drift | freeze the style block verbatim; audit the palette |
| Generic AI look | prompts describe *content* only | add camera language, lighting and a composition instruction per panel |
| Model refuses a panel | prompt is asking the wrong thing | `restage` as detail/aftermath/silhouette — never re-send |

## Honesty rules for this skill

- Tell the user plainly when a platform bans AI content (Tapas) or when a contest disqualifies it.
- Say that wholly machine-generated images are not copyrightable in the US; the script, direction,
  character design and lettering are.
- Do not imitate a living artist's style or a real person's likeness on request.
- Never claim the output is "as good as" a studio episode. It is a legitimate production method with
  a real quality ceiling that depends on the user's direction and selection.
