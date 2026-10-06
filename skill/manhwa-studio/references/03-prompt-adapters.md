# 03 — Prompt adapters

One panel, six tools, six dialects. `manhwa.py prompts <ep> --tool <t>` renders all of these from the
same story data.

---

## The universal slot order

Keep the slots in this order for every tool. Models weight the beginning of a prompt more heavily and
stable ordering keeps the look stable between panels.

```
1 quality/style block      (frozen, from series.json art_direction.style_block)
2 character blocks         (frozen prompt_block per character, in a fixed order)
3 shot/camera language     (from the shot preset)
4 action                   (one sentence, one subject)
5 lighting / mood          (from the beat)
6 composition instruction  ("leave clean negative space in the top-left area for a speech bubble")
7 control                  (<lora:...>, --cref, attached reference images)
```

Negative prompt always leads with the anti-text block:
`text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements` — plus
anatomy and quality terms.

---

## SDXL / Illustrious / NoobAI / Animagine (booru tags)

```
seravane, Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over
painterly backgrounds, cinematic anamorphic framing, dramatic rim lighting, full colour, highly
detailed, single vertical panel composition, 1girl, 26 years old, sharp narrow dark eyes with amber
flecks, black hair in a wet low ponytail, blunt fringe, small pale scar through the left eyebrow,
grey technical rain jacket with the collar up, black high-neck top, courier satchel strap, close-up
of the face and shoulders, eyes in focus, background softly blurred, close-up on her eyes reflecting
a red neon sign, neutral soft light, leave clean negative space in the top-left area for a speech
bubble, <lora:sera_v1:0.85>
```

- Tag order matters more than tag count. Characters before camera before scene.
- NoobAI wants `character count, series, artists, special tags, general tags` ordering and supports
  `newest/recent/mid/early` date tags. Illustrious accepts plain English too — don't fight it.
- Negative (standard): `worst quality, low quality, bad anatomy, extra digits, extra limbs, fused
  fingers, deformed hands, jpeg artifacts, signature, watermark, text, speech bubble`
- Sampler starting point: Euler a / DPM++ 2M Karras, 26–32 steps, CFG 5–7.

## FLUX (natural language)

```
Korean webtoon manhwa illustration with clean confident ink line art and soft cel shading over a
painterly background. An extreme close-up of a 26-year-old woman's dark eyes with amber flecks,
black wet fringe, a small pale scar through her left eyebrow, rain beaded on her lashes, lit from
the side by a red neon sign, the background reduced to blurred neon bokeh. Cool blue-grey palette
with one rust-red accent. Leave clean negative space in the top-left area for a speech bubble.
No text, no letters, no speech bubbles, no watermark.
```
FLUX is weaker at anime idiom than Illustrious — say "Korean webtoon illustration" explicitly, and
keep LoRA weights lower (0.6–0.8) since FLUX LoRAs overpower easily.

## Midjourney

```
<the FLUX-style paragraph> --ar 3:2 --style raw --no text, speech bubble, watermark, signature
```
Character lock via `--cref <image url>` (+ `--cw 100` to keep the outfit/face both) or `--oref` on
newer versions. Midjourney is the weakest tool for *episode-wide* consistency — good for covers and
key visuals, risky for 500 panels.

## Gemini / ChatGPT (conversational image models)

```
Use the attached reference images for sera and kael and keep the face, hair and outfit identical to
the references. Draw one vertical webtoon panel, no text and no speech bubbles. [paragraph]
```
Always attach the character sheet. Ask for **one panel per turn** — these tools degrade badly when
asked for a grid. Iterate conversationally ("same character, now from a low angle") rather than
re-rolling from scratch.

## ComfyUI (headless, for scale)

`prompts <ep> --tool comfy` writes `comfy_workflow_template.json` (a minimal, editable API graph
complete with a LoRA node) and `comfy_batch.py`, a generic runner:

```bash
python comfy_batch.py --queue queue.json --out ../art/ep001 \
    --checkpoint "illustriousXL_v10.safetensors" --steps 28 --cfg 5.5
python comfy_batch.py --queue queue.json --out /tmp/x --checkpoint ... --dry-run   # inspect graphs
python comfy_batch.py --queue queue.json --out ../art/ep001 --only p003,p004       # re-roll some
```

If your own workflow is more elaborate, export it from ComfyUI (**Workflow → Export (API)**), replace
the values with the same `%TOKENS%` (`%PROMPT%`, `%NEGATIVE%`, `%WIDTH%`, `%HEIGHT%`, `%SEED%`,
`%CHECKPOINT%`, `%LORA1%`, `%LORA1_STRENGTH%`, `%OUTPUT_PREFIX%`) and point `--template` at it.

Add a **hires-fix** (latent upscale + short second pass) node before `VAEDecode` for sharp faces —
it matters more than extra sampling steps.

---

## Generation resolution

The pack computes a model-friendly size per panel: nearest multiple of 64 at ~1.15MP matching the
panel's aspect ratio. A 720×340 strip panel generates at **1536×704** and is cropped to 720×340 on
assembly — that's roughly 2× oversampling, which is what keeps 800px-wide line art crisp.

Never generate all panels at one square size and crop to a vertical strip; you lose resolution and
end up with zoomed faces.

---

## Prompt anti-patterns

| Don't | Do |
|---|---|
| paraphrase the style block per panel | copy it verbatim |
| describe two actions in one prompt | one action, one panel |
| ask for "dramatic" | give camera + lighting language |
| ask for a "comic page" | ask for **one panel** (page layouts come out of the compositor) |
| let the model try to draw text | negative-prompt text away, composite it |
| reuse one seed for everything | fixed seed *per character*, varied per panel hash |
| change toolchain mid-arc | pick one base model and stay on it for the arc |
