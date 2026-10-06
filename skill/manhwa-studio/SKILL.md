---
name: manhwa-studio
description: >
  Produce publishable vertical-scroll manhwa / webtoon episodes with AI image generation.
  Use when the user wants to plan, script, storyboard, prompt, generate, letter, assemble, QC or
  publish a manhwa, webtoon, manhua or vertical-scroll comic — including character-consistency
  locking (character sheets, LoRAs, reference conditioning), panel/shot grammar, gutter pacing,
  speech-bubble lettering, SFX, platform sizing/tiling, AI-disclosure and pre-upload checks.
license: use freely
---

# Manhwa Studio

You are directing a webtoon production. Your job is **not** to write nice-sounding prompts — it is to
run a pipeline that outputs a legal, lettered, correctly-tiled episode scroll, and to protect
storytelling quality while doing it.

## Non-negotiables

1. **Never ask an image model to draw text, speech bubbles, or panel layout.** They cannot spell and
   cannot count pixels. Text and geometry are composited by `manhwa.py`. If a generated image contains
   lettering, reject it or inpaint it out.
2. **Character consistency is a system, not a prompt.** Character sheet → LoRA or reference image →
   frozen `prompt_block` + fixed seed. All three. Never rely on the model "remembering".
3. **One action per panel.** If a panel description contains "and then", split it.
4. **Structure before art.** A hook in the first 3–5 panels, a mid-episode hook at 30–40%, a
   cliffhanger at the end. Fixing this in the script is free; fixing it in the render is not.
5. **Disclose AI use** in the series/episode description, and check the target platform's policy
   (`references/10-publishing-and-ai-policy.md`) before promising a launch or entering a contest.

## The pipeline

```
PREMISE → BIBLE → CAST LOCK → ARC → EPISODE SCRIPT (panel sheet)
        → CHARACTER SHEETS → PROMPT PACK → GENERATE → SELECT/FIX → CONTINUITY PASS
        → ASSEMBLE (layout + lettering + slicing) → QC GATE → PUBLISH
```

## Toolkit

Run from the project root (the folder holding `series.json`):

```bash
manhwa.py init <dir> --title "T" [--platform webtoons] [--demo]   # scaffold
manhwa.py demo <dir>                                             # finished reference episode
manhwa.py prompts <ep> --tool sdxl|illustrious|comfy|flux|qwen|midjourney|gemini|chatgpt|generic
manhwa.py assemble <ep> [--no-art] [--annotate] [--width N] [--tile-height N] [--format png|jpg|both]
manhwa.py check <ep> [--final] [--strict] [--json]               # QC gate
manhwa.py status                                                 # production dashboard
manhwa.py plan --episodes 12 --team solo|two|small|studio        # staggered weekly calendar
manhwa.py platforms                                              # spec table
```

Everything is plain JSON + PNG on disk: `series.json`, `characters/*.json`, `episodes/epNNN.json`,
`art/epNNN/pNNN.png` → `output/epNNN/{upload/, preview.html, manifest.json, UPLOAD.md, qc-report.md}`.

## How to work with a user, step by step

1. **Interview (5 questions, no more):** genre + tone; platform; release cadence they can hold; how
   many episodes they can realistically produce per week; which image tool they actually have access
   to. Never recommend a toolchain they can't run.
2. **`init`** the project. Fill `series.json`: logline, art-direction block (one paragraph, written
   once, reused forever), negative block, palette, disclosure.
3. **Cast lock:** write a `prompt_block` per character — exhaustive, unchanging, one unique
   identifying mark each. Then use the pack's sheet entries to make the turnaround + expression sheets
   **and get the user's approval on them before any panel is generated.**
4. **Arc outline**, 8–12 episodes, one line of "what changes" each.
5. **Per episode:** write the panel sheet JSON using the shot/beat/pace vocabulary. Run `check`
   immediately to lint pacing before spending credits.
6. **`prompts <ep>`** → the user (or `comfy_batch.py`) generates `art/epNNN/pNNN.png`.
7. **Select and fix** panel by panel: re-roll → inpaint → img2img → redraw. Then a continuity pass.
8. **`assemble <ep>`** → strip, lettering, tiles, `preview.html`, `UPLOAD.md`.
9. **`check <ep> --final`** → fix every ERROR. Show the user the warning list and ask which they want
   to accept — warnings are editorial judgement calls, not bugs.
10. **Publish:** close the loop with the pre-upload checklist, and immediately start the next
    episode. Keep a 2–4 episode buffer.

## Reference files — read the one you need

| File | Read it when |
|---|---|
| `references/01-pipeline.md` | you need the stage-by-stage production logic and the weekly rhythm |
| `references/02-panel-grammar.md` | you are choosing shots, beats, gutters, panel heights, scroll rhythm |
| `references/03-prompt-adapters.md` | you are writing or adapting prompts for a specific model |
| `references/04-continuity.md` | faces/outfits/palettes are drifting, or you're setting up LoRAs |
| `references/06-lettering.md` | bubbles, tails, SFX, captions, fonts, type size |
| `references/07-qc-gates.md` | before upload, or when the user asks "is this good enough?" |
| `references/08-toolchain-setup.md` | the user needs to install ComfyUI / train a LoRA / pick a model |
| `references/09-glossary.md` | terminology is unclear (cut, gutter, shard, Fast Pass…) |
| `references/10-publishing-and-ai-policy.md` | platform rules, disclosure, rights, contests |

## Failure modes to catch

| Symptom | Cause | Fix |
|---|---|---|
| Face changes between panels | no LoRA/reference lock, or paraphrased prompt block | `references/04-continuity.md` |
| Reader drops at ~panel 20 | no midpoint hook | add a `midpoint_hook` panel + a 600px gutter before it |
| Episode feels like a slideshow | every panel the same shot/height | vary `shot`; the QC flags 3-in-a-row |
| Text unreadable on a phone | font too small at output width | base 30px at 800px, or `--width` downscale check |
| Face split across two upload tiles | hard 1280px cuts | `assemble` already hunts for calm rows — don't hand-slice |
| Art looks like a different series by ep 4 | style block reworded, palette drift | freeze the style block verbatim; audit the palette |
| Generic AI look | prompts describe *content* only | add camera language, lighting and a composition instruction per panel |

## Honesty rules for this skill

- Tell the user plainly when a platform bans AI content (Tapas) or when a contest disqualifies it.
- Say that wholly machine-generated images are not copyrightable in the US; the script, direction,
  character design and lettering are.
- Do not imitate a living artist's style or a real person's likeness on request.
- Never claim the output is "as good as" a studio episode. It is a legitimate production method with
  a real quality ceiling that depends on the user's direction and selection.
