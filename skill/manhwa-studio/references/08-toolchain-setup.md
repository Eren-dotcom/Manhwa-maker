# 08 — Toolchain setup

Pick one row. Don't shop around mid-arc — changing base models mid-series changes your art.

---

## Option A — Local ComfyUI (best control, best for a long series)

**Needs:** an NVIDIA GPU with 8GB+ VRAM (12GB+ comfortable), ~50GB disk.

1. Install ComfyUI (desktop build or git clone + `pip install -r requirements.txt`).
2. Get a checkpoint into `ComfyUI/models/checkpoints/`:
   - **Illustrious XL v1.0** — largest anime LoRA ecosystem, native 1536², flexible prompting
   - **Animagine XL 4.0** — permissive licence (commercial use), forgiving defaults, 1024-class
   - **NoobAI XL 1.1** — deepest booru tag coverage; **non-commercial licence** — read it
   - **FLUX** — better at complex scenes and natural language; heavier VRAM, weaker anime idiom
   - On 8GB VRAM: prefer a quantised/GGUF anime model, or generate at 1024 and upscale.
3. Optional but recommended custom nodes: a LoRA loader (built in), IP-Adapter Plus + FaceID,
   ControlNet (OpenPose/depth/lineart), rgthree or an efficiency pack for batch queues.
4. Generate one panel: `manhwa.py prompts 1 --tool comfy` from your project root, then
   ```bash
   cd promptpack
   python comfy_batch.py --queue queue.json --out ../art/ep001 \
       --checkpoint "illustriousXL_v10.safetensors" --steps 28 --cfg 5.5
   ```
   Use `--dry-run` first to dump the workflow JSON and check the LoRA path is real.
5. Export your own workflow (**Workflow → Export (API)**) once you've tuned it, replace the values
   with the `%TOKENS%`, and pass `--template yourworkflow.json`.

**Starting sampler settings:** Euler a or DPM++ 2M Karras, 26–32 steps, CFG 5–7, 1024-class
resolutions snapped to 64, then hires-fix.

## Option B — Hosted image tools (no GPU, faster start)

| Tool | Best for | Consistency method |
|---|---|---|
| Gemini image models | fast iteration, editing, style transfer from a reference | attach the character sheet every time |
| ChatGPT image | conversational iteration, small batches | attach references, ask for one panel per turn |
| Midjourney | covers, key visuals, single hero images | `--cref` / `--oref` with the sheet |
| Purpose-built webtoon tools (Dashtoon, Komiko, Anifusion…) | zero-setup comics | their built-in character system — but check whether publishing can leave their app, and read the ToS about ownership |

**Hosted workflow:** generate the character sheets first, then for every panel attach the sheet and
instruct "keep the face, hair and outfit identical to the reference". Expect ~80% consistency at best;
budget for cleanup, and never try to hold a 40-episode series this way.

## Option C — Hybrid (what most people actually end up doing)

- Local SDXL + LoRA for **character panels** (consistency where it matters)
- Hosted tools for **backgrounds, key visuals, covers, effects**
- Composition and lighting unified afterwards by the palette + grading rules in `series.json`
- Lettering and layout always local via `manhwa.py`

This is the cheapest path to a look that holds together across an arc.

---

## Training a character LoRA

1. Gather 20–40 images of the character (the turnaround sheet + expression sheet + generations from
   them). Curate hard: if an image doesn't look like the character, delete it.
2. Crop faces/hands clean; remove overlapping limbs; keep a consistent resolution.
3. Caption manually with consistent vocabulary (`kohya_ss` / a training service). Character tags
   first, then outfit, then pose. Minimal background description.
4. Train a small LoRA (dim 16–32, ~1500–3000 steps is usually enough for one character). Test at
   0.7–0.9 strength.
5. Iterate once: generate images *with* the new LoRA, curate the best 20, train again.
6. Store at `assets/loras/<id>_v1.safetensors`, register the trigger token and weight in
   `characters/<id>.json`. Version it — `v2` is a different character to your readers' eyes.

Time: 15–60 minutes of GPU. Setup: an afternoon.

---

## Repo requirements

```bash
pip install -r skill/manhwa-studio/requirements.txt   # Pillow
```

Fonts: drop a comic font (Anime Ace, CC Wild Words, Komika, Back Issues, Bangers) into
`<project>/assets/fonts/` and set `series.json → lettering.font_regular` / `font_bold`.
Check the font's licence for commercial use — most comic fonts are free for personal/non-commercial
use only.

---

## Scale check

| Setup | Realistic output |
|---|---|
| Solo + local SDXL + LoRAs + this toolkit | 1 episode (40–60 panels) per 2–4 days, sustainable weekly |
| Solo + hosted tools | 1 episode per 3–7 days, with consistency cleanup overhead |
| Solo + no system (prompt-and-hope) | 1 episode per 2 weeks if you're stubborn, then you quit |

The toolkit's job is to move you to the first row. The story and the selection are still yours.
