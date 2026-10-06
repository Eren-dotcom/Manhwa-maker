# Prompt pack - NEON ARCHIVE ep 001

Tool adapter: **sdxl**  |  panels: **10**  |  entries: **15** (character sheets + cover + panels)

Work order: generate the character sheets FIRST, approve them, then feed them back as
references for every panel. Regenerating a sheet after 40 panels exist is a disaster.

For ComfyUI: `comfy_batch.py` + `comfy_workflow_template.json` in this folder run the
whole queue headlessly. Replace `%CHECKPOINT%` with your own model file.

### kael_sheet (character sheet - kael)

- generate at **1024x1536** (2:3)
- seed: `77012233`
- note: The single most valuable image you will generate. Lock it, version it, never regenerate it casually.

```text
Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, dramatic rim lighting, rich saturated accents on a desaturated base, full colour, highly detailed, single vertical panel composition, 1man, 40s, tall and heavy-shouldered, weathered face, grey stubble, deep vertical scar on the right jaw, dark long coat over a rumpled shirt, fingerless gloves, umbrella held low, unreadable expression, character reference sheet, front view, three-quarter view, side view, back view, same character in every view, identical outfit, full body, plain light background, no text labels
```

negative:

```text
text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page
```

save as: `assets/refs/kael_sheet.png`

### kael_faces (character sheet - kael)

- generate at **1536x1024** (3:2)
- seed: `77012233`
- note: Feed this to the model as a reference every time an emotional panel comes up.

```text
Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, dramatic rim lighting, rich saturated accents on a desaturated base, full colour, highly detailed, single vertical panel composition, 1man, 40s, tall and heavy-shouldered, weathered face, grey stubble, deep vertical scar on the right jaw, dark long coat over a rumpled shirt, fingerless gloves, umbrella held low, unreadable expression, expression sheet, six head-and-shoulders studies of the same face: neutral, wary, angry, sorrowful, small smile, wide-eyed shock, plain light background
```

negative:

```text
text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page
```

save as: `assets/refs/kael_faces.png`

### sera_sheet (character sheet - sera)

- generate at **1024x1536** (2:3)
- seed: `48151623`
- note: The single most valuable image you will generate. Lock it, version it, never regenerate it casually.

```text
Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, dramatic rim lighting, rich saturated accents on a desaturated base, full colour, highly detailed, single vertical panel composition, 1girl, 26 years old, sharp narrow dark eyes with amber flecks, black hair in a wet low ponytail, blunt fringe, small pale scar through the left eyebrow, grey technical rain jacket with the collar up, black high-neck top, silver dog-tag necklace, courier satchel strap across the chest, tired expression, character reference sheet, front view, three-quarter view, side view, back view, same character in every view, identical outfit, full body, plain light background, no text labels
```

negative:

```text
text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page
```

save as: `assets/refs/sera_sheet.png`

### sera_faces (character sheet - sera)

- generate at **1536x1024** (3:2)
- seed: `48151623`
- note: Feed this to the model as a reference every time an emotional panel comes up.

```text
Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, dramatic rim lighting, rich saturated accents on a desaturated base, full colour, highly detailed, single vertical panel composition, 1girl, 26 years old, sharp narrow dark eyes with amber flecks, black hair in a wet low ponytail, blunt fringe, small pale scar through the left eyebrow, grey technical rain jacket with the collar up, black high-neck top, silver dog-tag necklace, courier satchel strap across the chest, tired expression, expression sheet, six head-and-shoulders studies of the same face: neutral, wary, angry, sorrowful, small smile, wide-eyed shock, plain light background
```

negative:

```text
text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page
```

save as: `assets/refs/sera_faces.png`

### cover key visual

- generate at **1080x1350** (4:5)
- seed: `90210`
- note: Platform thumbnails: 1080x1080 square and 1080x1920 vertical (under 500KB / 700KB).

```text
Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, dramatic rim lighting, rich saturated accents on a desaturated base, full colour, highly detailed, single vertical panel composition, key visual cover art, 1girl, 26 years old, sharp narrow dark eyes with amber flecks, black hair in a wet low ponytail, blunt fringe, small pale scar through the left eyebrow, grey technical rain jacket with the collar up, black high-neck top, silver dog-tag necklace, courier satchel strap across the chest, tired expression, dramatic composition, space at the top for the title, cinematic, high detail
```

negative:

```text
text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page
```

save as: `assets/refs/cover_ep001.png`

### p001 - establishing_wide / hook

- strip size **720x420** (3:2) -> generate at **1408x832**
- seed: `2702964563`
- action: Rain-drowned megacity at night, stacked towers receding into fog, a single courier's umbrella light far below, neon signage bleeding into wet asphalt.
- dialogue in this panel: "KRRRSH"
- **leave clean negative space in the top center area for a speech bubble**
- note: No faces. Set the world in one image. Big top gutter above this panel.

```text
Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, dramatic rim lighting, rich saturated accents on a desaturated base, full colour, highly detailed, single vertical panel composition, extreme wide establishing shot, environment dominant, tiny human figure for scale, deep depth of field, Rain-drowned megacity at night, stacked towers receding into fog, a single courier's umbrella light far below, neon signage bleeding into wet asphalt., cold ambient light, high contrast, ominous calm, leave clean negative space in the top center area for a speech bubble
```

negative:

```text
text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page
```

save as: `art/ep001/p001.png`

### p002 - wide / setup

- strip size **720x400** (16:9) -> generate at **1408x768**
- seed: `3036522709`
- cast: sera
- loras: `sera_v1.safetensors`@0.85
- action: Sera walks the flooded arcade alone, ponytail soaked, jacket collar up, satchel held tight.
- dialogue in this panel: "The rain in Sector 9 doesn't clean anything." / "It just moves the dirt somewhere you can't see it."
- **leave clean negative space in the top left area for a speech bubble**

```text
seravane, Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, dramatic rim lighting, rich saturated accents on a desaturated base, full colour, highly detailed, single vertical panel composition, 1girl, 26 years old, sharp narrow dark eyes with amber flecks, black hair in a wet low ponytail, blunt fringe, small pale scar through the left eyebrow, grey technical rain jacket with the collar up, black high-neck top, silver dog-tag necklace, courier satchel strap across the chest, tired expression, wide shot, full body, subject placed on the right third, environment visible, Sera walks the flooded arcade alone, ponytail soaked, jacket collar up, satchel held tight., neutral soft light, readable, low drama, leave clean negative space in the top left area for a speech bubble, <lora:sera_v1:0.85>
```

negative:

```text
text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page
```

save as: `art/ep001/p002.png`

### p003 - close / setup

- strip size **720x340** (2.1:1) -> generate at **1536x704**
- seed: `776593440`
- cast: sera
- loras: `sera_v1.safetensors`@0.85
- action: Close-up on Sera's eyes reflecting a red neon sign, rain on her lashes.
- dialogue in this panel: "One more delivery. Then I'm done."
- **leave clean negative space in the top left area for a speech bubble**

```text
seravane, Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, dramatic rim lighting, rich saturated accents on a desaturated base, full colour, highly detailed, single vertical panel composition, 1girl, 26 years old, sharp narrow dark eyes with amber flecks, black hair in a wet low ponytail, blunt fringe, small pale scar through the left eyebrow, grey technical rain jacket with the collar up, black high-neck top, silver dog-tag necklace, courier satchel strap across the chest, tired expression, close-up of the face and shoulders, eyes in focus, background softly blurred, Close-up on Sera's eyes reflecting a red neon sign, rain on her lashes., neutral soft light, readable, low drama, leave clean negative space in the top left area for a speech bubble, <lora:sera_v1:0.85>
```

negative:

```text
text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page
```

save as: `art/ep001/p003.png`

### p004 - ots / inciting

- strip size **720x400** (16:9) -> generate at **1408x768**
- seed: `2862804908`
- cast: sera, kael
- loras: `sera_v1.safetensors`@0.85
- action: Over Sera's shoulder: a tall man under a low umbrella holds out a cracked data shard.
- dialogue in this panel: "Play it before sunrise. Or don't play it at all."
- **leave clean negative space in the top right area for a speech bubble**

```text
seravane, Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, dramatic rim lighting, rich saturated accents on a desaturated base, full colour, highly detailed, single vertical panel composition, 1girl, 26 years old, sharp narrow dark eyes with amber flecks, black hair in a wet low ponytail, blunt fringe, small pale scar through the left eyebrow, grey technical rain jacket with the collar up, black high-neck top, silver dog-tag necklace, courier satchel strap across the chest, tired expression, 1man, 40s, tall and heavy-shouldered, weathered face, grey stubble, deep vertical scar on the right jaw, dark long coat over a rumpled shirt, fingerless gloves, umbrella held low, unreadable expression, over-the-shoulder shot, foreground shoulder blurred, listener's face in focus, Over Sera's shoulder: a tall man under a low umbrella holds out a cracked data shard., light shifts warmer, something is off-centre, leave clean negative space in the top right area for a speech bubble, <lora:sera_v1:0.85>
```

negative:

```text
text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page
```

save as: `art/ep001/p004.png`

### p005 - insert / inciting

- strip size **720x300** (2.4:1) -> generate at **1536x640**
- seed: `474516098`
- cast: sera
- loras: `sera_v1.safetensors`@0.85
- action: Insert: the shard in her open palm, faint teal light pulsing inside the crack.
- dialogue in this panel: "It was warm. Memories shouldn't be warm."
- **leave clean negative space in the bottom left area for a speech bubble**

```text
seravane, Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, dramatic rim lighting, rich saturated accents on a desaturated base, full colour, highly detailed, single vertical panel composition, 1girl, 26 years old, sharp narrow dark eyes with amber flecks, black hair in a wet low ponytail, blunt fringe, small pale scar through the left eyebrow, grey technical rain jacket with the collar up, black high-neck top, silver dog-tag necklace, courier satchel strap across the chest, tired expression, detail insert shot of a prop, held in hand, tight framing, Insert: the shard in her open palm, faint teal light pulsing inside the crack., light shifts warmer, something is off-centre, leave clean negative space in the bottom left area for a speech bubble, <lora:sera_v1:0.85>
```

negative:

```text
text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page
```

save as: `art/ep001/p005.png`

### p006 - environment / comedown

- strip size **720x460** (3:2) -> generate at **1344x832**
- seed: `3128302760`
- action: Her rented room: rain crawling down a tall window, one chair, one lamp, the city bokeh beyond.
- note: Transition panel -- 700px of air after it, then the room lands.

```text
Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, dramatic rim lighting, rich saturated accents on a desaturated base, full colour, highly detailed, single vertical panel composition, empty environment shot, no characters, mood and atmosphere only, Her rented room: rain crawling down a tall window, one chair, one lamp, the city bokeh beyond., low contrast, dim, quiet
```

negative:

```text
text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page
```

save as: `art/ep001/p006.png`

### p007 - medium / build

- strip size **720x380** (3:2) -> generate at **1472x768**
- seed: `156164424`
- cast: sera
- loras: `sera_v1.safetensors`@0.85
- action: Sera seated at the table, the shard projected as a flickering figure collapsing in an alley.
- dialogue in this panel: "THUD"
- **leave clean negative space in the top center area for a speech bubble**

```text
seravane, Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, dramatic rim lighting, rich saturated accents on a desaturated base, full colour, highly detailed, single vertical panel composition, 1girl, 26 years old, sharp narrow dark eyes with amber flecks, black hair in a wet low ponytail, blunt fringe, small pale scar through the left eyebrow, grey technical rain jacket with the collar up, black high-neck top, silver dog-tag necklace, courier satchel strap across the chest, tired expression, medium shot, waist up, subject centred, shallow depth of field, Sera seated at the table, the shard projected as a flickering figure collapsing in an alley., gradually brighter, tightening, leave clean negative space in the top center area for a speech bubble, <lora:sera_v1:0.85>
```

negative:

```text
text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page
```

save as: `art/ep001/p007.png`

### p008 - extreme_close / reveal

- strip size **720x400** (16:9) -> generate at **1408x768**
- seed: `1687393715`
- cast: sera
- loras: `sera_v1.safetensors`@0.85
- action: Extreme close-up of Sera's eyes going wide, teal projection light across her face.
- dialogue in this panel: "That's my coat. That's my hair..."
- **leave clean negative space in the top left area for a speech bubble**
- note: Thought bubble on an extreme close-up: keep it short, the eyes are the panel.

```text
seravane, Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, dramatic rim lighting, rich saturated accents on a desaturated base, full colour, highly detailed, single vertical panel composition, 1girl, 26 years old, sharp narrow dark eyes with amber flecks, black hair in a wet low ponytail, blunt fringe, small pale scar through the left eyebrow, grey technical rain jacket with the collar up, black high-neck top, silver dog-tag necklace, courier satchel strap across the chest, tired expression, extreme close-up, eyes only, macro detail, iris reflection visible, Extreme close-up of Sera's eyes going wide, teal projection light across her face., strong rim light, deep shadows, colour accent on the subject, leave clean negative space in the top left area for a speech bubble, <lora:sera_v1:0.85>
```

negative:

```text
text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page
```

save as: `art/ep001/p008.png`

### p009 - medium_low / midpoint_hook

- strip size **720x400** (16:9) -> generate at **1408x768**
- seed: `484500703`
- cast: sera, kael
- loras: `sera_v1.safetensors`@0.85
- action: Low angle: Sera turns in her chair. A silhouette fills the open doorway behind her, umbrella dripping on the floorboards.
- dialogue in this panel: "You weren't supposed to see that one."
- **leave clean negative space in the top center area for a speech bubble**

```text
seravane, Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, dramatic rim lighting, rich saturated accents on a desaturated base, full colour, highly detailed, single vertical panel composition, 1girl, 26 years old, sharp narrow dark eyes with amber flecks, black hair in a wet low ponytail, blunt fringe, small pale scar through the left eyebrow, grey technical rain jacket with the collar up, black high-neck top, silver dog-tag necklace, courier satchel strap across the chest, tired expression, 1man, 40s, tall and heavy-shouldered, weathered face, grey stubble, deep vertical scar on the right jaw, dark long coat over a rumpled shirt, fingerless gloves, umbrella held low, unreadable expression, medium shot from a low angle looking up, subject looming, dramatic perspective, Low angle: Sera turns in her chair. A silhouette fills the open doorway behind her, umbrella dripping on the floorboards., colour temperature break, sudden red or cyan cast, leave clean negative space in the top center area for a speech bubble, <lora:sera_v1:0.85>
```

negative:

```text
text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page
```

save as: `art/ep001/p009.png`

### p010 - wide / cliffhanger

- strip size **720x520** (4:3) -> generate at **1280x896**
- seed: `2569941080`
- cast: sera
- loras: `sera_v1.safetensors`@0.85
- action: The window bursts inward, glass and rain suspended, Sera thrown back, the whole neon city staring through the hole.
- dialogue in this panel: "CRASH"
- **leave clean negative space in the top left area for a speech bubble**
- note: Cliffhanger. End on the image, not on a line.

```text
seravane, Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, dramatic rim lighting, rich saturated accents on a desaturated base, full colour, highly detailed, single vertical panel composition, 1girl, 26 years old, sharp narrow dark eyes with amber flecks, black hair in a wet low ponytail, blunt fringe, small pale scar through the left eyebrow, grey technical rain jacket with the collar up, black high-neck top, silver dog-tag necklace, courier satchel strap across the chest, tired expression, wide shot, full body, subject placed on the right third, environment visible, The window bursts inward, glass and rain suspended, Sera thrown back, the whole neon city staring through the hole., hard backlight, silhouette edge, unanswered, leave clean negative space in the top left area for a speech bubble, <lora:sera_v1:0.85>
```

negative:

```text
text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page
```

save as: `art/ep001/p010.png`
