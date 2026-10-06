# 06 — Script format reference

Everything the pipeline reads is plain JSON. This is the whole schema.

---

## `series.json`

```jsonc
{
  "title": "NEON ARCHIVE",
  "logline": "A memory courier plays a stolen recording and sees her own death in it.",
  "genre": ["cyberpunk", "mystery"],
  "audience": "16-28 mobile readers",
  "tone": "cold, wet, intimate",
  "platform": "webtoons",            // webtoons | naver | tapas | globalcomix | selfhost | print
  "release_language": "en",
  "release_schedule": "weekly",
  "target_panels_per_episode": 48,

  "art_direction": {
    "style_block": "Korean webtoon manhwa illustration, ... full colour, highly detailed",  // verbatim on every prompt
    "negative_block": "text, letters, speech bubble, watermark, extra fingers, ...",
    "palette": { "key": "#22304a", "accent": "#e0603c", "shadow": "#0d1220", "highlight": "#cfe6ff" },
    "grading_note": "Cool shadows, warm practicals, skin tones constant."
  },

  "geometry": {
    "width": 800,          // output strip width (defaults to the platform width)
    "side_margin": 40,     // safe area per side
    "top_margin": 70, "bottom_margin": 160,
    "bg": "#ffffff",       // gutter / letterbox colour
    "frame": "none",       // none | border | hairline  (per-panel override allowed)
    "corner_radius": 0
  },

  "lettering": {
    "base_font_size": 30,            // at 800px width; scales with output width
    "font_regular": "assets/fonts/Bangers-Regular.ttf",   // optional; falls back to system fonts
    "font_bold": null,
    "caps": false,                   // true = traditional all-caps lettering
    "max_words_per_bubble": 30,
    "bubble_max_width_ratio": 0.62
  },

  "ai_disclosure": "AI-assisted production. Story, direction and lettering by X; panel artwork generated with Y.",
  "characters": ["sera", "kael"],
  "arcs": [ { "name": "Arc 1", "episodes": "1-8", "beats": ["hook", "reversal", "climax"] } ]
}
```

## `characters/<id>.json`

```jsonc
{
  "id": "sera", "name": "Sera Vane", "role": "lead",     // lead | support | antagonist | minor
  "one_line": "A courier who stopped asking what she carries.",
  "want": "...", "flaw": "...",

  "prompt_block": "1girl, 26 years old, sharp narrow dark eyes with amber flecks, black hair in a wet low ponytail, blunt fringe, small pale scar through the left eyebrow, grey technical rain jacket with the collar up, ... ",

  "lora": { "file": "assets/loras/sera_v1.safetensors", "token": "seravane", "weight": 0.85 },
  "seed": 48151623,
  "ref_images": ["assets/refs/sera_sheet.png", "assets/refs/sera_faces.png"],
  "palette": { "hair": "#12141a", "skin": "#e3bfa2", "outfit": "#4b5665", "accent": "#e0603c" },
  "wardrobe": { "default": "grey rain jacket, collar up", "indoor": "black high-neck top" },
  "expressions": ["neutral", "wary", "angry", "shock"],
  "consistency_notes": "Never change the fringe. Scar on the left brow only."
}
```

## `episodes/epNNN.json`

```jsonc
{
  "episode": 1,
  "title": "The Shard",
  "arc": "Arc 1 - The Courier",
  "logline": "What changes for the reader by the last panel.",
  "purpose": "hook",                 // hook | characterise | worldbuild | plot | setpiece
  "panel_budget": 10,                // QC compares the panel count against this
  "scroll_target_screens": 6,
  "language": "en",
  "status": "scripted",              // scripted | storyboarded | art | lettered | published

  "panels": [ /* see below */ ],

  "end_note": "Next episode: The Broker's Price.",
  "ai_disclosure": null              // null = inherit from series.json
}
```

## Panel object

```jsonc
{
  "id": "p001",                      // becomes the art filename: art/ep001/p001.png

  "shot": "establishing_wide",       // the camera grammar (see references/02)
  "beat": "hook",                    // drives the lighting fragment
  "pace": "dramatic",                // drives the gutter AFTER this panel

  "height": 420,                     // optional px at 800px width. Omit => derived from the art's
                                     // aspect ratio (or the shot preset when there is no art)
  "bleed": false,                    // true = full platform width, ignores side margins
  "fit": "crop",                     // crop (cover) | contain (letterbox) | width
  "crop_bias": "center",             // center | top | bottom
  "frame": null,                     // per-panel override of series geometry.frame
  "gap_after": null,                 // per-panel gutter override in px

  "image": null,                     // explicit path; default art/epNNN/<id>.png
  "characters": ["sera", "kael"],    // who is ON SCREEN (drives the prompt)
  "outfit": { "sera": "indoor" },    // wardrobe variant per character
  "action": "One sentence, one subject, visible verb.",

  "prompt_override": null,           // replace the generated prompt entirely
  "negative_override": null,         // appended to the series negative block
  "notes": "",                       // for you and for the reviewer

  "dialogue": [ /* see below */ ]
}
```

## Dialogue object

```jsonc
{
  "character": "sera",        // must exist in characters/, or: narration | sfx | system | unknown
  "text": "One more delivery. Then I'm done.",
  "style": "speech",          // speech | whisper | shout | thought | narration | system | radio | sfx
  "anchor": "top-left",       // free placement hint, or "auto" (energy scan), or "@0.5,0.25" fractions
  "anchor_lock": false,       // true = obey `anchor` even if it covers art
  "tail": "auto",             // auto | up | down | left | right | none
  "tail_to": null,            // {"x": 0.45, "y": 0.8} panel fractions -- exact speaker position
  "size_scale": 1.0,          // multiply the base font size (SFX often 0.7-1.2)
  "rotation": 0.0             // SFX only, degrees
}
```

### Style cheat-sheet

| style | renders as | use for |
|---|---|---|
| `speech` | white round-rect + tail | normal dialogue |
| `whisper` | grey outline, smaller | quiet lines, `small voice` |
| `shout` | white burst + tail, caps | yelling |
| `thought` | cloud, no tail reaching anyone | inner monologue |
| `narration` | tinted caption box, no tail | narrator / letter from the past |
| `system` | dark HUD plate with a rule line | LitRPG/system windows, quest UI |
| `radio` | dark plate, cyan border, mono | comms, phone, off-screen voice |
| `sfx` | big outlined display text, rotated | sound effects (**never** a bubble) |

### Rules the QC enforces

- ≤3 speech bubbles per panel (split the beat instead)
- ≤`max_words_per_bubble` words per bubble (default 30)
- no dialogue on an `action` panel
- every `character` must exist in `characters/`
- gutters ≥200px unless the panel is deliberately `fast`
- `transition` pacing needs ≥600px

## Minimal working example

```json
{
  "episode": 1, "title": "Pilot",
  "panels": [
    { "id": "p001", "shot": "establishing_wide", "beat": "hook", "pace": "dramatic", "height": 400,
      "action": "Rain over the city, no characters.",
      "dialogue": [{ "character": "narration", "text": "It started raining the day she left.", "style": "narration", "anchor": "bottom-left" }] },
    { "id": "p002", "shot": "close", "beat": "setup", "characters": ["sera"],
      "action": "Close-up: her eyes, neon reflected.",
      "dialogue": [{ "character": "sera", "text": "Then I'm done.", "style": "speech", "anchor": "top-left" }] }
  ]
}
```

Run `manhwa.py check 1` after any edit — it catches schema accidents, missing speakers and pacing
problems before you spend a single generation credit.
