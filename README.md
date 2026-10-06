# Manhwa-maker

**A complete, researched, working pipeline for making manhwa / webtoons with AI.**

You asked three things: analyse the skill file, research how manhwa studios actually work, and build
a skill/program that helps an AI make manhwa. This repo is the answer to all three.

---

## What's in here

| Where | What |
|---|---|
| **`skill/manhwa-studio/`** | The deliverable: an agent skill + a working Python toolchain. Start at its `SKILL.md`. |
| **`docs/01-how-manhwa-studios-work.md`** | Research: the real Korean studio pipeline, roles, rates, working conditions, money. |
| **`docs/02-pipeline-step-by-step.md`** | The 14-step process, from premise to published episode, adapted for an AI-assisted creator. |
| **`docs/03-ai-production-playbook.md`** | Which model does what, how to lock a character across 500 panels, exact QC loop. |
| **`docs/04-platform-specs-and-qc.md`** | Every platform's real px/MB limits + the QC gate list. |
| **`docs/05-research-sources.md`** | Every source, with what it contributed and how much to trust it. |
| **`docs/06-script-format.md`** | The JSON schema reference (what you and your AI write). |
| **`docs/07-skill-file-reconciliation.md`** | Point-by-point analysis of the supplied spec: adopted / merged / new / conflicts, and how each one landed in code. |
| **`docs/08-tool-directory.md`** | **Every tool that helps, by pipeline stage** — consistency stacks, backgrounds, lettering, upscalers, fonts, platform AI policy, and which three-tool combination to pick for your budget. |
| **`prompts/manhwa-showrunner-prompt.md`** | A paste-in prompt that turns any LLM into a manhwa showrunner using this toolkit. |
| **`examples/neon-archive/`** | A finished reference episode: 18 cuts, real generated art, lettered, sliced, QC'd, `GATE: PASS`. |
| **`tests/smoke.py`** | Regression test — builds a demo and asserts the invariants that actually broke (strip vs manifest, gutter-balloon placement, pace-filled panels). `python3 tests/smoke.py` |
| **`skill/manhwa-studio/requirements.txt`** | One dependency (Pillow). |

## Status of the attached SKILL.md — reconciled

The attached `manhwa-maker` spec was pasted into chat and is now **fully reconciled**:
`docs/07-skill-file-reconciliation.md` is the point-by-point analysis (ADOPTED / MERGED / NEW /
CONFLICT), and every point is implemented in `skill/manhwa-studio/` — not just documented.

What it changed in the toolkit:

| The spec's requirement | Where it lives now |
|---|---|
| 1080px production master, platform-width export | `assemble --width 1080 --export-width 800`; tiles cut ≤1728px from the master and downscaled (sharper uploads) |
| ~110–130 panels at reference tier, density from **cuts not plot** | `target_panels_per_episode` tiers (`standard`/`dense`/`reference`) + `refine --pad` |
| Four mandatory beats: engine, introductions, past-life/villain, end question | beat vocabulary + QC `S008`–`S011` |
| Refine a supplied script before any art | `manhwa.py refine` — slop linter, panel-count verification, `refined/CHANGES.md` |
| Full balloon vocabulary, three lettering voices, gutter balloons, prop text, technique captions | `lettering.py` (`BUBBLE_STYLES` ×16, `voices`, `place: "gutter"`, `style: "prop"` / `"technique"`) |
| SFX colour-coded, border-breaking, with speed lines / smears / flashes | `effects.py` + `SFX_PALETTE` |
| Visual QC gates, never skipped | `manhwa.py sheets` → contact sheet, per-character match-check, lettering QC; `check --final` fails if they're missing or stale |
| Never lock a design without explicit approval | `manhwa.py approve` ledger + QC `C006` |
| Refusal ⇒ restage, never retry | `manhwa.py restage --as silhouette\|aftermath\|detail\|environment\|reaction` |
| File conventions (`refined/`, `reference_art/`, `reference_sheets/`, `chXX/panels\|lettered/`, `your_files/*.pdf`) | scaffolded by `init`, written by `assemble` |

The three genuine conflicts (master width, panel density, balloon word cap) are documented with their
resolutions in `docs/07`.

## Quickstart

```bash
pip install -r skill/manhwa-studio/requirements.txt

# see the whole pipeline work on a finished 18-panel reference episode
python skill/manhwa-studio/scripts/manhwa.py demo my-first-series
open my-first-series/output/ep001/preview.html   # read it like a phone

# or start a real project
python skill/manhwa-studio/scripts/manhwa.py init my-series --title "MY SERIES"
cd my-series
python ../skill/manhwa-studio/scripts/manhwa.py refine 1 --source script.md  # fix the script first
python ../skill/manhwa-studio/scripts/manhwa.py prompts 1 --tool sdxl   # or flux / midjourney / gemini
#   -> generate the character sheets, get them approved, then generate art/ and drop the files in
python ../skill/manhwa-studio/scripts/manhwa.py approve character sera:sheet --note "approved"
python ../skill/manhwa-studio/scripts/manhwa.py assemble 1              # master + tiles + PDF + preview
python ../skill/manhwa-studio/scripts/manhwa.py sheets 1                # contact / match-check / lettering QC
python ../skill/manhwa-studio/scripts/manhwa.py check 1 --final         # QC gate
```

## The one-paragraph summary of the research

Korean manhwa studios do **not** draw pages. They run a
**script → storyboard → line art → flat colour → background → lighting/VFX → lettering** pipeline,
split across 6–12 specialists, staggered so that a new ~60-panel episode ships every week while
later episodes sit in earlier stages. The industry average is **68 cuts per episode per week**, and
Korean Institute of Labor Safety and Health research puts artists at **9.9 hours/day,
11.8 the day before deadline**. That is the bar the form sets. AI does not remove that bar — it
moves your labour from *drawing* to *directing, locking continuity, and editing*, which is exactly
what this toolkit automates. The storytelling constraints (5-panel hook, mid-episode hook at 30–40%,
cliffhanger ending, 200px gutters, 600–1000px scene transitions) are not decoration — they are the
reason episodes get read to the end.

## The honest limits

- **AI cannot letter or lay out.** Models misspell text and can't count pixels. This toolkit composites
  lettering and geometry deterministically instead — that's the whole reason the program exists.
- **Character drift is the #1 killer.** Fix it with the character-sheet + LoRA/reference workflow in
  `docs/03`, not by hoping.
- **Check platform policy before you upload.** WEBTOON Canvas has no published AI clause (voluntary
  disclosure still recommended, and mandatory in some channels); **Tapas bans AI-generated content
  outright**; GlobalComix banned fully-AI art in March 2026; WEBTOON *contests* disqualify AI entries.
  Details and dates: `docs/05-research-sources.md`.
- **US copyright does not protect wholly machine-generated images.** You own the script, characters,
  direction and edit; the individual generated frames are on shakier ground. Keep your project files —
  they are your evidence of authorship.

## License / attribution

Original code and text in this repo: use it however you like. Generated example art in
`examples/` is AI output and carries the same caveat as every AI image.
