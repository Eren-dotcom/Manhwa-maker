# NEON ARCHIVE — the reference pilot

A complete, working chapter of a fictional series, built with the toolkit in this repo. It exists so
you can see **every stage** of the pipeline as real files, and so you can re-run any part of it.

*18 cuts · 1080px master → 800px export · 20 balloons (1 in a gutter) · 5 SFX · 1 prop label ·
title card · colour-coded panel effects · PDF delivery.*

| Path | What it is |
|---|---|
| `series.json` | the bible: logline, art direction, palette, scenes, craft rules, disclosure |
| `characters/sera.json`, `characters/kael.json` | the cast lock — `prompt_block`, acting rules, injury continuity |
| `episodes/ep001.json` | the panel sheet: 18 cuts with beats, shots, pacing, dialogue and effects |
| `art/ep001/*.png` | the generated panel art, master resolution |
| `reference_sheets/` + `assets/refs/` | turnaround / expression sheets, and the files used as conditioning |
| `refined/` | the script pass output and `CHANGES.md` |
| `ch001/contact-sheet.png` | **gate 1** — every panel in reading order for drift and baked-in text |
| `ch001/match-check-sera.png` | **gate 1** — the reference sheet beside every panel she appears in |
| `output/ep001/{manifest,layout}.json` | the assembled geometry: gutters, tiles, balloon rects |
| `output/ep001/qc-report.md` | the QC gate result, with every finding and its code |
| `output/ep001/preview.html` | read it the way a phone reader will |

Derived output (strips, tiles, lettered panels, PDFs, the lettering QC sheet) is **not** committed —
it is reproducible in two commands and would add ~60MB to the repo:

```bash
cd examples/neon-archive
python3 ../../skill/manhwa-studio/scripts/manhwa.py assemble 1   # master + tiles + PDF + preview
python3 ../../skill/manhwa-studio/scripts/manhwa.py sheets 1     # the three visual QC gates
python3 ../../skill/manhwa-studio/scripts/manhwa.py check 1 --final
```

Or rebuild the whole pilot from scratch (this **overwrites** `art/` prompts but not the art files):

```bash
python3 skill/manhwa-studio/scripts/manhwa.py demo examples/neon-archive
```

## Reading it as an example of the craft rules

- **Engine first:** `p001` is a 1:3 tall establishing beat with no dialogue — the chapter states its
  visual idea before anyone explains anything.
- **Introduction:** `p002` is the backlit hero shot.
- **Past life:** `p010` is the memory panel — the effect language switches to radial speed lines and a
  different palette so it reads as a different world.
- **End question:** `p018` closes on *"Who recorded it?"* rather than a statement.
- **Density from cuts, not plot:** `p003` (eyes), `p005` (prop), `p009` (hands) and `p014` (boots) are
  detail crops that stretch a small amount of plot into a scroll-length chapter.
- **Balloons in gutters:** `p016` reserves extra gutter height for a balloon outside the panel.
- **SFX as art:** `p012` is a full-height impact panel with the SFX composited over the border.
