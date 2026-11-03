# 06 · Prompting for consistent manhwa art

> Image models are extraordinary illustrators and terrible employees. They will happily redesign your protagonist's face on page 3. The job of the prompt system is to remove every freedom you did not ask for.

## The one law: a frozen style lock

Write one paragraph describing look, line, shading and palette. Paste it, **unchanged**, into every prompt for the whole series. Change it only when the series itself changes (a flashback arc, a different art team).

A workable template:

```
[medium + lineage], [line quality], [shading model], [lighting logic],
[palette + colour script], [level of detail], [framing], [finish rules]
```

Example (dark fantasy webtoon):

```
korean dark fantasy webtoon, intricate varied-weight ink lineart, painterly
chiaroscuro shading, ember and moonlit rim lighting, gothic korean
architecture, atmospheric depth haze, muted jewel palette of jade, ink-black
and old gold, vertical 800x1280 panel, cinematic graphic composition, no text
```

Rules for the lock:

- **No character descriptions inside it.** Character detail belongs in anchors, not the lock — otherwise every new cast member mutates the style.
- **No negative words inside it.** Negations confuse diffusion models; use the negative prompt.
- **Keep it under ~90 words.** Longer locks get truncated by some APIs and diluted by others.
- **Include "no text, no lettering, no speech bubbles"** in the lock *and* the negative. Models love to invent captions.

## Character anchors

Every character gets a 35–55 word fixed fragment: hair, face, build, outfit, one prop, palette. Paste it verbatim in every panel prompt. Never paraphrase — paraphrase is drift.

```
Han Yuwol, 34-year-old korean man, tired narrow eyes with faint dark circles,
straight black hair slightly too long at the nape, tall lean build, charcoal
ferryman's long coat worn open, chipped jade badge on the left lapel, ink-stained
fingers, carries a warm paper lantern at hip height
```

Anchors should describe **what is always true**: bone structure, hair, clothes, props. Never describe emotion, lighting or pose — those change per panel and belong in the shot block.

## Prompt order that actually works

1. Style lock
2. Shot (`medium close-up, chest up`)
3. Angle (`low-angle camera`)
4. Composition (`rule-of-thirds, subject off-centre`)
5. Setting (`fogged canal at midnight`)
6. Action (`one hand gripping a lantern, trembling`)
7. Cast anchors (verbatim)
8. Lighting + palette
9. Framing (`vertical panel, full-bleed`)
10. Consistency clause (`identical facial structure to the character reference sheet`)

The order matters because most models weight early tokens more heavily and because it keeps your own thinking disciplined.

## Reference sheets first

Before rendering a single panel:

1. Render each character as a **reference sheet**: front, three-quarter, profile, neutral grey or white background, no dramatic lighting.
2. Approve the sheet. This is the design — the panels only vary pose and light.
3. Use the sheet as an **image reference / character conditioning input** for every panel (IP-Adapter, reference-image, character-reference, or your provider's equivalent).

Text alone will not hold a face across forty panels. A reference image plus a fixed anchor plus a fixed seed will get close.

## Seeds, variation and re-rolling

- Choose one seed per episode and keep it. It stabilises the model's "handwriting".
- Re-roll only when the composition fails, and when you do, change **one** variable at a time (shot wording, or height, or lighting) so you learn what caused the improvement.
- Never re-roll a character sheet mid-episode unless the whole episode is re-rendered.

## Negative prompts

Start from this and add per-genre failures:

```
blurry lineart, extra fingers, extra limbs, deformed hands, watermark,
signature, garbled text, latin lettering, speech bubbles, photorealistic,
3d render, anime screencap, oversaturated pastel, chibi, cropped head,
duplicate character, modern clothing, inconsistent eye colour
```

Add: `two heads, fused bodies` for crowd scenes; `flat lighting` for dramatic panels; `western comic style` if the model keeps drifting.

## Common failure modes and their fixes

| Failure | Cause | Fix |
| --- | --- | --- |
| Face changes between panels | Weak anchor, no reference image | Reference sheet + image conditioning + fixed seed |
| Style drifts toward anime screencap | Lock missing lineage words | Add `korean webtoon`, `ink lineart`, `cel shading`; add `anime screencap` to negatives |
| Text appears in the art | Model is over-eager | `no text` in prompt and negative; never describe lettering in an image prompt |
| Hands wrong | Under-specified pose | Describe the hand's job ("fingers curled around the handle"), or crop it out |
| Composition ignores the brief | Shot wording buried | Move shot + angle to the front of the prompt |
| Everything looks like the same scene | Same seed, same palette words | Vary scene description and lighting first; seed last |
| Character looks younger/older | Age buried | Put age in the anchor and in the shot line |
| Crowd melts into one figure | No count statement | `exactly three figures`, plus a blocking sentence |

## The edit loop (the part people skip)

Generation is 30% of the work. Budget for:

1. **Composition pass** — is the shot readable at thumbnail size?
2. **Continuity pass** — outfit, wounds, props, weather, eyeline direction.
3. **Cleanup pass** — hands, eyes, line noise, stray text, duplicated props.
4. **Integration pass** — add the lettering, SFX and gutters in the studio, never in the image.
5. **Grade pass** — unify the episode's colour, contrast and black levels so 45 separately generated images read as one episode.

If you skip the integration and grade passes, the episode will look like a gallery rather than a comic, no matter how good each image is.

## Working with layers

Where possible, generate or export in layers: background / character / effects. Then you can move a character to fix a tail, relight a scene, or reuse a background across panels. Even a rough 2-layer separation doubles your production speed.

## Ethics, rights and disclosure

- **Train-on-what-you-own:** use models whose licences permit commercial use, and never prompt for a living artist's name or a protected character.
- **Disclose** AI assistance where the platform requires it (most now do, at least in metadata).
- **Keep humans on the hook:** writing, staging, lettering and final QC are authorship. Automating them produces slop, and readers can tell.
- **Respect the culture:** avoid ornament soup. If you use Hanbok, lanterns, or Hangul, get the details right or leave them out.
- **Keep your rights clean:** store your prompts and seeds. They are your production record if a platform or a licensor asks how a panel was made.
