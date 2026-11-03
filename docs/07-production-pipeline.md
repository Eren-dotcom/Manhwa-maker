# 07 · Production pipeline

> A weekly webtoon is a manufacturing business with an art problem in the middle of it. Plan the factory, then be an artist inside it.

## Roles

| Role | Owns | Output |
| --- | --- | --- |
| **Writer (스토리)** | Logline, bible, beats, dialogue | Script + beat sheet |
| **Panel director (연출)** | Shot, staging, flow, heights | Storyboard (콘티) |
| **Line artist (선화)** | Drawings, characters, backgrounds | Clean line art |
| **Colourist (채색)** | Colour script, lighting, flats, rendering | Coloured panels |
| **Letterer (식자)** | Balloons, tails, SFX, captions | Typeset episode |
| **Editor (PD)** | Platform fit, schedule, QC, approvals | Ship / hold |
| **Producer** | Budget, contracts, assets, licensing | Delivery |

In a one-person studio you hold all seven hats — but you should still *change hats deliberately*, in this order, and never draw before the beat sheet passes.

## The weekly clock

A sustainable schedule for a 45-panel episode with AI assistance:

| Day | Work | Gate |
| --- | --- | -- |
| Mon | Beat sheet + storyboard thumbnails (all 45 panels) | Editor approves flow |
| Tue | Character sheets, backgrounds, key props, render prompts | Style lock frozen |
| Wed | Panel renders + composition fixes | 100% of panels have art |
| Thu | Continuity pass, cleanup, grade | Episode reads as one piece |
| Fri | Lettering, SFX, captions | Reading order + safe areas pass |
| Sat | Reader pass on a real phone, fixes, export | QC score ≥ 85 |
| Sun | Buffer / buffer / panic | Ship |

If your pipeline cannot survive losing Sunday, it is not a pipeline; it is a deadline with drawings attached.

## The gates (do not skip, in order)

1. **Concept gate** — logline, hook, genre engine, platform, style lock exists.
2. **Bible gate** — world rules, cast with anchors, visual motifs, locations.
3. **Beat gate** — 8 units, each with a reason to scroll at its end, cliffhanger written.
4. **Panel gate** — every panel has shot, angle, staging, height, and a beat.
5. **Prompt gate** — style lock frozen, anchors in every cast prompt, negatives set.
6. **Render gate** — art exists for every panel (or a deliberate storyboard cut).
7. **Lettering gate** — order, tails, safe areas, balloon budgets.
8. **QC gate** — score, continuity, phone read.

Each gate is a *decision you can point at* when a week goes wrong. The studio records them so you can see where the bottleneck actually lives.

## Panel math

- 45 panels × 3 shots of a character = ~135 character renders, or ~45 if you get composition right first time.
- Budget **2–4 generations per kept panel** with a good style lock and reference sheet; 8–12 without.
- Cleanup is 2–6 minutes per panel; lettering is 20–40 seconds per balloon; grade is 30–60 seconds per panel.
- A realistic assisted pace for one experienced person: **6–10 finished panels per working day**.

If your episode needs 90 panels a week, you need a team or a shorter episode — not more motivation.

## Asset naming

```
series/
  bible/
  ep042/
    prompts/      ep042-p07.prompt.txt
    raw/          ep042-p07-r2.png
    art/          ep042-p07.png
    final/        ep042-p07-final.png
  export/         ep042-strip.png, ep042-reader.html
```

Rules: episode and panel always in the name; never overwrite raw generations; keep the prompt next to the image; keep a `changelog.md` per episode with what broke and what fixed it.

## Version control for art

- Commit the **project JSON** (this studio exports it) and the **prompt pack** to git or a synced drive. Those are small and they are the actual authorship.
- Do not commit 4K PNGs to git. Keep raw renders in object storage, synced folder or an asset manager, and commit only finals.
- Tag every published episode. When a platform asks for a change in episode 12, you need to know exactly what shipped.

## Working with a team on one episode

- The writer never rewrites dialogue after lettering without a version bump.
- The director owns the storyboard PDF; artists draw against it, not against the script.
- The letterer is the last person allowed to ask for a re-crop — build that conversation into Thursday, not Saturday.
- One person signs off. Sign-off means "this file is the ship file", not "I like it".

## Cost control with AI

| Cost | Lever |
| --- | --- |
| Generations | Reference sheets + fixed seeds + tighter prompts (2–4× fewer re-rolls) |
| Cleanup | Render larger than final, then downsample — artefacts shrink |
| Backgrounds | Build a reusable set library per location; do not regenerate the Bureau every episode |
| Crowds | Render one crowd plate, reuse with different crops and lighting |
| Lettering | Type in the studio, never in the image model |

## When to stop using AI for a task

Stop when the task requires **continuity of intent** rather than novelty: hands interacting with props, fight choreography beats, emotional micro-acting on a face, and any panel that carries a plot clue. Generate those with heavy reference, or draw them.

## Shipping checklist

- [ ] Episode reads top-to-bottom on a phone with one hand.
- [ ] First 3 panels contain the hook.
- [ ] Last panel is the cliffhanger, not a summary.
- [ ] Every panel has art or is deliberately storyboarded.
- [ ] Lettering passes safe-area, order and budget checks.
- [ ] Colour/contrast unified across panels.
- [ ] File naming and metadata complete for the platform.
- [ ] Thumbnail chosen and tested at 120px.
- [ ] Backup of project JSON + prompts stored.
