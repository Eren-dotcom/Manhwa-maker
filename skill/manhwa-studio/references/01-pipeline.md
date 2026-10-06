# 01 — Pipeline (stage by stage)

The production logic behind the commands. Studio pipeline from `docs/01-how-manhwa-studios-work.md`,
rearranged for a solo creator with AI.

---

## The stages and what each one produces

| # | Stage | Command | Output | Gate before moving on |
|---|---|---|---|---|
| 0 | Project | `init` | `series.json`, folder skeleton | logline + art-direction block written |
| 1 | Cast lock | `prompts --no-cover` | `characters/*.json`, sheet entries | **sheets approved by the user** |
| 2 | Episode script | — | `episodes/epNNN.json` | `check` lint on structure/pacing |
| 3 | Prompt pack | `prompts <ep> --tool …` | `promptpack/*.md/.csv/queue.json` | resolutions + seeds sane |
| 4 | Generation | `comfy_batch.py` or manual | `art/epNNN/pNNN.png` | every panel present |
| 5 | Selection & repair | — | replaced panels | no broken hands/faces shipped |
| 6 | Continuity pass | — | fixed art | audit list in `04-continuity.md` |
| 7 | Assembly | `assemble <ep>` | strip, tiles, preview, manifest | placeholders = 0 |
| 8 | QC | `check <ep> --final` | `qc-report.md` | zero errors |
| 9 | Publish | — | live episode | disclosure in description |
| 10 | Next episode | `status`, `plan` | — | buffer ≥2 episodes |

## Why stages exist and why they're in this order

**Cast lock before script, script before prompts, prompts before generation.** Each stage is a
*contract* for the next one. A character change after 40 panels exist invalidates all 40. A script
change after generation wastes the generations. This ordering is the whole reason an AI pipeline can
be fast: cheap artefacts (JSON) get edited, expensive ones (images) get generated once.

**The one exception:** you may generate a *storyboard* of placeholder panels (`assemble --no-art`)
before any art exists. It costs nothing and it's the fastest way to see whether the pacing works.

## The staggered weekly rhythm (why you never work on one episode)

Studios stagger: episode 12 is being scripted while 11 is being lettered and 10 is being published.
That's how a weekly ship stays possible. Solo:

| Day | Episode N (ships this week) | Episode N+1 | Episode N+2 |
|---|---|---|---|
| Mon | — | — | outline + script, `check` |
| Tue | — | prompt pack + generate | — |
| Wed | — | select / inpaint / continuity | — |
| Thu | assemble + QC | — | — |
| Fri | **publish** | — | — |
| Sat/Sun | rest, or batch backgrounds for the arc | | |

`manhwa.py plan --episodes 12 --team solo` prints this schedule with real dates.

## Batching (the biggest speed lever)

Never do one episode start-to-finish. Batch by *stage* across an arc:

- sketch/storyboard 4 episodes, then
- generate all the **close-ups** of the arc (they share lighting), then all **wides**, then all
  **environments**, then
- letter 4 episodes in one sitting.

Context-switching is the tax every solo creator pays invisibly. Batching removes it.

## Automation boundary

| Automate | Always human |
|---|---|
| geometry, gutters, panel heights, slicing | what the story is |
| bubble placement, type size, tails, SFX | the dialogue |
| prompt assembly from the panel sheet | choosing which generation is good enough |
| seeds, resolutions, per-tool formatting | the continuity audit |
| specs, tile caps, file sizes, QC | pacing judgement, and knowing when a warning matters |
| the production calendar | whether it's actually finished |

The toolkit takes the mechanical 60% so you can spend the session on the 40% that readers notice.
