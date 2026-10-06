# 03 — The AI production playbook

Everything here is about one problem: **an image model has no memory**. It will happily redraw your
protagonist's face by 15% every panel. The defence is not a better prompt — it's a *system*.

---

## 1. Toolchain map (what to use for what)

| Job | Good choices (2026) | Why |
|---|---|---|
| **Anime/manhwa panel art, consistency-critical** | SDXL-family anime checkpoints — Illustrious XL v1.0, NoobAI XL 1.1, Animagine XL 4.0 — in ComfyUI or Forge | Booru-tag prompting, the largest LoRA ecosystem, IP-Adapter + ControlNet support, run locally |
| **Commercial licensing simplicity** | Animagine XL 4.0 (CreativeML Open RAIL++-M) | Permits commercial use; NoobAI is non-commercial |
| **Biggest LoRA/merge ecosystem, native 1536²** | Illustrious XL v1.0 | Where character LoRAs actually live |
| **Prompt-adherence, natural language, legible gradients** | FLUX-class | Better at complex scenes; weaker anime-idiom, heavier VRAM |
| **No-GPU / fast iteration** | Hosted: Gemini image models, ChatGPT image, Midjourney, Dashtoon/Komiko-style webtoon tools | Consistency via reference images, not LoRAs |
| **Character lock (best → worst)** | trained per-character LoRA → IP-Adapter FaceID/Plus → reference-image conditioning (`--cref`, attached refs) → fixed seed + verbatim prompt block | Each step down loses fidelity |
| **Pose/composition control** | ControlNet OpenPose / depth / lineart on a blockout | Lets you block the panel with a 3D mannequin or stick figure first |
| **Upscale / detail pass** | a second "hires fix" pass, latent upscale + short refine | Sharpens faces, eyes and line art before down-scaling to 800px |
| **Backgrounds** | generate separately, then composite behind the character cutout (BiRefNet/rembg matting) | Cheaper than generating a perfect combined panel, and lets you *reuse* backgrounds |

**Local vs cloud, honestly:** local ComfyUI gives you ruthless mechanical control (fixed seeds,
LoRA stacking, batch queues, reusable workflows) which is what scale requires. Hosted tools are
faster to start and better if you can't run a GPU. If you plan 50+ episodes, invest in the local
pipeline; if you're validating an idea, don't.

---

## 2. The consistency system (the three-layer lock)

This is the core technique. Apply all three layers.

### Layer 1 — the frozen description
One `prompt_block` per character in `characters/<id>.json`, pasted **verbatim** into every prompt,
in the same position, forever. Not paraphrased, not "improved". The toolkit does this automatically.

Include: sex/age tags, hair (colour + length + style + fringe), eyes (shape + colour + any tell),
**one unique identifying mark** (scar, earring, tattoo, mismatched sleeve), build, and the default
outfit. Anatomical specifics beat adjectives: "small pale scar through the left eyebrow" survives
generation; "interesting face" does not.

### Layer 2 — the visual anchor (LoRA or reference)
- **LoRA (best for a long series):** generate ~20–40 curated, on-model images of the character
  (front/side/¾, various expressions, various lighting, varied outfits), caption them consistently,
  train a small LoRA (15–60 min on a decent GPU, or a Civitai/Kohya-style service). Then every panel
  that includes the character loads `<lora:name:0.8–0.9>` plus the trigger token. This is the only
  method that reliably holds a face across hundreds of panels.
- **Reference conditioning (fast start):** with hosted models, attach the character sheet / a locked
  face crop to every panel request and instruct the model to keep the face, hair and outfit
  identical. With SDXL, IP-Adapter FaceID or Plus does the same thing locally.
- **ControlNet** on top for pose/structure; **never** use it as your identity anchor.

### Layer 3 — mechanical discipline
- **Fixed seed per character**, varied per panel by a deterministic hash (the prompt pack does this),
  so re-rolls drift *predictably* instead of randomly.
- **One style suffix**, identical on every prompt across the whole series.
- **One lighting rule per beat** (the toolkit maps beat → lighting), so the episode is colour-graded
  as a unit rather than 55 independent choices.
- **Palette lock**: pick 4 colours and reject generations that break them. A drifted palette reads as
  a different artist faster than a drifted face does.

### The continuity audit
Once per episode, put every panel on one screen at thumbnail size and scan for: hair length/fringe,
scar side, outfit pieces, skin tone, eye colour, palette, jewellery, and left/right consistency of
injuries. Ten minutes here is worth more than any prompt tweak.

---

## 3. Prompt construction that actually works

Build prompts in a **fixed slot order** so the model's attention is stable:

```
quality tags · style block · [character blocks in fixed order] · shot/camera ·
action · lighting/mood · composition instruction (bubble space) · <lora:...>
```

- **Style block** — genre + medium + line quality + shading + colour grading + "full colour".
  Write it once in `series.json`.
- **Shot/camera** — take it from the shot grammar; camera language is far more reliable than
  "make it look dramatic". `references/02-panel-grammar.md` has the fragments.
- **Action** — one sentence, active voice, one subject, visible verbs.
- **Bubble space** — the toolkit adds "leave clean negative space in the top-left area for a speech
  bubble" whenever a panel has dialogue, then *still* verifies placement by scanning the finished
  panel. Asking is a hint; measuring is the guarantee.
- **Negative** — always include the anti-text block: `text, letters, words, speech bubble, caption
  box, watermark, signature, logo, ui elements`. Models cannot spell; let them stop trying.
- **Aspect ratio** — don't fight it. Generate at a model-friendly ratio close to your panel's ratio
  (multiple of 64, ~1.15MP) and crop on assembly.

**Anti-patterns** (each of these wastes a day):
- putting the whole script in one prompt and hoping for panels
- changing the style sentence between panels
- generating all panels at one square size and cropping to a vertical strip (lose resolution, gain
  zoomed faces)
- trusting the model for text, SFX lettering, panel borders, or gutter spacing
- re-rolling instead of inpainting a bad hand
- letting the palette drift because "this panel looked nicer in warm light"

---

## 4. What AI is bad at (so don't ask it)

| Task | Why it fails | Do instead |
|---|---|---|
| Drawing speech bubbles + text | can't spell, can't kern, can't count | composite text with `lettering.py`, always |
| Panel layout / gutters | no concept of px, no page model | `layout.py` — deterministic geometry |
| Extending a scroll to a fixed height | cannot count to 8,000 | `assemble` computes it |
| Slicing into ≤1280px tiles | will bisect a face | `layout._tile_cuts` hunts the calm row |
| Consistent faces over 100 panels | no persistent memory | LoRA / reference lock (section 2) |
| Exact hands every time | still the weakest anatomy | inpaint, or draw it |
| Legible sound effects | same as text | `sfx` style in `lettering.py` |
| Deciding pacing | it has no reader model | the beat/pace fields + QC gates |

---

## 5. The generate → measure → fix loop (per panel)

```
prompt (from pack)
   ⇒ generate at model-friendly size
   ⇒ LOOK at it on a phone-width crop
   ⇒ classify the failure:
        composition wrong  → re-roll (new seed, same prompt) or restage the prompt
        detail wrong       → inpaint the region
        style drifted      → check the style block + LoRA weight, re-roll
        face drifted       → reference image / raise LoRA weight / fix the seed
   ⇒ continuity check against the character sheet
   ⇒ save as art/epNNN/pNNN.png
```

Rule from the studios that applies doubly to AI: **fix in the sketch, not the render.** If a panel is
wrong at the storyboard stage, no amount of generation will save the episode's pacing.

---

## 6. Cost, time and legal notes

- **Time per panel, realistically:** 1–5 min of generation/selection for a simple shot, 10–30 min
  for a hero panel needing inpainting. A 55-panel episode is a 2–5 day job with a good system, and a
  2-week job without one.
- **Rights:** in the US, wholly machine-generated images are not copyrightable; your script,
  characters, direction, edit and lettering are. Keep the project files (they are your authorship
  evidence), keep your prompts, and disclose AI use.
- **Platform rules are moving.** Verify before every launch and every contest:
  Canvas has no published AI clause (as of Sept 2026, and no AI-disclosure field) but contests
  disqualify AI entries; **Tapas prohibits AI-generated content outright**; GlobalComix banned
  fully-AI art in March 2026 while allowing AI as one tool in a human-led workflow. Korea's AI Basic
  Act (effective Jan 2026) requires disclosure for content distributed in Korea.
  Full detail + dates: `05-research-sources.md`.
- **Never** train on or imitate a specific living artist's style, or generate a real person's
  likeness. That's an infringement/likeness problem, not an "AI" problem, and platforms enforce it.
