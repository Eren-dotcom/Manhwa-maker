# 04 — Continuity and character locking

The single hardest problem in AI comics. Faces drift, outfits mutate, palettes wander, and by episode
six the protagonist is a slightly different person. Here's the system that stops it.

---

## The three-layer lock

### Layer 1 — Frozen description (`prompt_block`)

One exhaustive, unchanging string per character. **Reused verbatim**, in the same slot, in every
prompt, forever. The moment you "improve" it, the character changes.

What must be in it:

| Slot | Example | Why |
|---|---|---|
| Sex/age tag | `1girl, 26 years old` | anchors the base model |
| Hair | `black hair in a wet low ponytail, blunt fringe` | the most-copied feature — be exact |
| Eyes | `sharp narrow dark eyes with amber flecks` | the second most-copied |
| **One unique identifying mark** | `small pale scar through the left eyebrow` | this is the tell the model can latch onto |
| Build | `tall and heavy-shouldered` | silhouette consistency |
| Default outfit | `grey technical rain jacket with the collar up, black high-neck top` | wardrobe drift is worse than face drift |
| Small props | `silver dog-tag necklace, satchel strap across the chest` | cheap continuity anchors |

Write anatomy and colour, not adjectives. "Interesting face" does nothing; "small pale scar through
the left eyebrow" survives generation.

### Layer 2 — Visual anchor

Ranked by reliability:

| Method | Fidelity | Setup | Use when |
|---|---|---|---|
| **Per-character LoRA** | highest | 1–4 h, needs 20–40 curated refs + a GPU or a training service | 20+ episodes, a real series |
| **IP-Adapter FaceID / Plus** | high for face, medium for outfit | ~30 min in ComfyUI | you have a locked face crop but no LoRA |
| **Reference-image conditioning** (`--cref`, attached refs to Gemini/ChatGPT) | medium-high | minutes | hosted tools, no local GPU |
| **Fixed seed + verbatim prompt block** | low-medium | none | always — as a *baseline*, never on its own |

**LoRA recipe that works:**
1. generate ~40 variations of the character from the sheet (different poses, outfits, lighting)
2. keep the 15–25 that all look like *the same person*, crop out overlapping hands
3. caption **manually**, with nearly identical captions and consistent wording for poses/outfits
4. train small (~30 images, 1 LoRA pass), test, then optionally train a second pass on the outputs
5. in production: `<lora:name:0.8–0.9>` + trigger token + the frozen `prompt_block`
6. keep a **face LoRA** separate from a *style* LoRA; mixing them muddies both

If IP-Adapter "doesn't handle anime style well" (a common report), it's usually a base-model mismatch —
use an anime-specific IP-Adapter with an anime checkpoint, or go the LoRA route.

### Layer 3 — Mechanical discipline

- **Deterministic seeds.** `manhwa.py` derives a seed per (character-token, panel-id) via SHA-256:
  re-rolling the same panel gives the same composition family, so you iterate instead of gambling.
- **One style suffix** for the whole series.
- **One lighting fragment per beat** — the episode grades as a unit.
- **4-colour palette, locked.** Reject generations that break it; palette drift reads as a different
  artist faster than face drift does.
- **Wardrobe variants are declared, not improvised** (`characters/<id>.json → wardrobe`). QC flags a
  character wearing more than 2 outfits in one episode.

---

## The continuity audit (do this every episode)

Put all panels on one screen at thumbnail size and check, in this order:

1. hair length + fringe + part side
2. the identifying mark, and its correct side
3. outfit pieces (jacket present? collar state? gloves?)
4. skin tone and eye colour
5. palette — do all panels look like one episode?
6. injuries and props: same side, same stage of healing/wear
7. left/right consistency of the scene (doors, windows, who sits where)

Ten minutes here replaces forty minutes of re-generation later.

Self-check without a human eye: the QC contract check (`C002`) fails when a character has no LoRA and
no on-disk reference images, which is the earliest warning you can get. It can't see drift — only you
(or a vision model asked to compare panels to the character sheet) can.

---

## Reference-sheet spec

**Turnaround:** front / three-quarter / side / (back), same outfit, neutral pose, plain light
background, full body, no text labels. One image, four figures, consistent proportions.

**Expressions:** six head-and-shoulders studies — neutral, wary, angry, sorrowful, small smile,
shocked — same lighting, plain background.

Version them: `assets/refs/sera_sheet_v1.png`, `_v2.png`. When you regenerate a sheet, you are
regenerating the character for the rest of the series — update every LoRA or reference in use in the
same session, or you'll end up with a v1 face in episode 7.

---

## Backgrounds and props

- Reuse backgrounds aggressively. A studio reuses; a beginner redraws. Generate a background once,
  store it in `assets/` (not `art/`), and composite character cutouts over it.
- The **layered approach** (background plate + per-character cutouts, matted with BiRefNet/rembg)
  lets you regenerate one element of a panel instead of the whole thing, and keeps lighting
  consistent across panels that share a location.
- If a location appears in 6 panels, generate an **environment sheet** for it the same way you do for
  a character: 3–4 angles, one reference, reused.

## What still requires you

Models cannot hold: consistent *staging* across shots of one scene, correct hand-object interaction,
mirror/camera geometry, or a character's *acting* (the micro-expression that sells a line). Those are
direction decisions. Budget your time for them rather than expecting generation to solve them.
