"""
A complete, publishable-length pilot episode used by `manhwa.py demo`.

It is deliberately small (10 panels) and *correct*: hook in the first three
panels, a midpoint hook, varied camera grammar, deliberate gutters, a cliffhanger
reveal, and an honest AI disclosure. Use it as the reference implementation of
the storytelling rules in references/02-panel-grammar.md.
"""
from __future__ import annotations

SERIES = {
    "title": "NEON ARCHIVE",
    "alt_titles": {"ko": "네온 아카이브"},
    "logline": "A memory courier in a rain-drowned megacity plays a stolen recording and sees her own death in it.",
    "genre": ["cyberpunk", "mystery", "thriller"],
    "audience": "16-28 mobile readers, WEBTOON action/mystery readers",
    "tone": "cold, wet, intimate, quietly brutal",
    "platform": "webtoons",
    "release_language": "en",
    "release_schedule": "weekly",
    "target_panels_per_episode": 48,
    "art_direction": {
        "style_block": (
            "Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over "
            "painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, "
            "dramatic rim lighting, rich saturated accents on a desaturated base, full colour, "
            "highly detailed, single vertical panel composition"
        ),
        "negative_block": (
            "text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, "
            "extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, "
            "blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page"
        ),
        "palette": {"key": "#22304a", "accent": "#e0603c", "shadow": "#0d1220",
                    "highlight": "#cfe6ff", "neon": "#39c6c0"},
        "grading_note": (
            "Cool blue-grey base, one warm accent (amber or rust) per panel, teal neon only for the "
            "archive tech. Skin tones never shift between panels."
        ),
    },
    "geometry": {
        "width": 800, "side_margin": 40, "top_margin": 70, "bottom_margin": 160,
        "gutter": 200, "bg": "#ffffff", "frame": "none", "corner_radius": 0,
    },
    "lettering": {
        "base_font_size": 30, "font_regular": None, "font_bold": None, "caps": False,
        "max_words_per_bubble": 30, "bubble_max_width_ratio": 0.62,
    },
    "ai_disclosure": (
        "AI-assisted production. Story, character design, panel direction, lettering and editing by "
        "the creator; panel artwork generated with Illustrious XL + a character LoRA, then retouched, "
        "composited and lettered by hand. Feedback welcome."
    ),
    "characters": ["sera", "kael"],
    "arcs": [
        {"name": "Arc 1 - The Courier", "episodes": "1-8",
         "beats": ["the shard", "the buyer", "the archive burns", "who recorded it",
                   "the second tape", "the name in the file", "the courier's own death", "the choice"]},
    ],
}

CHARACTERS = {
    "sera": {
        "id": "sera", "name": "Sera Vane", "role": "lead", "age": "26",
        "one_line": "A licensed memory courier who has stopped asking what she carries.",
        "want": "One clean contract that pays off her debt and gets her out of Sector 9.",
        "flaw": "She trusts recordings more than people.",
        "prompt_block": (
            "1girl, 26 years old, sharp narrow dark eyes with amber flecks, black hair in a wet low "
            "ponytail, blunt fringe, small pale scar through the left eyebrow, grey technical rain "
            "jacket with the collar up, black high-neck top, silver dog-tag necklace, courier satchel "
            "strap across the chest, tired expression"
        ),
        "lora": {"file": "assets/loras/sera_v1.safetensors", "token": "seravane", "weight": 0.85},
        "seed": 48151623,
        "ref_images": ["assets/refs/sera_sheet.png", "assets/refs/sera_faces.png"],
        "palette": {"hair": "#12141a", "skin": "#e3bfa2", "outfit": "#4b5665", "accent": "#e0603c"},
        "wardrobe": {
            "default": "grey technical rain jacket, collar up, black high-neck top, satchel strap",
            "indoor": "black high-neck top, silver dog-tag necklace",
        },
        "expressions": ["neutral", "wary", "angry", "hollow", "small smile", "shock"],
        "consistency_notes": (
            "Never change hair length or the fringe. Never remove the brow scar. Jacket collar stays up "
            "outdoors, down indoors. Amber flecks in the eyes are the tell that a panel is a close-up."
        ),
    },
    "kael": {
        "id": "kael", "name": "Kael", "role": "support", "age": "40s",
        "one_line": "A broker who sells memories he was never given permission to own.",
        "want": "To retire before someone retires him.",
        "flaw": "He keeps one copy of everything. Including this.",
        "prompt_block": (
            "1man, 40s, tall and heavy-shouldered, weathered face, grey stubble, deep vertical scar on "
            "the right jaw, dark long coat over a rumpled shirt, fingerless gloves, umbrella held low, "
            "unreadable expression"
        ),
        "lora": {"file": None, "token": "kaelbroker", "weight": 0.8},
        "seed": 77012233,
        "ref_images": ["assets/refs/kael_sheet.png"],
        "palette": {"hair": "#2a2a2e", "skin": "#d8ab8b", "outfit": "#22242c", "accent": "#39c6c0"},
        "wardrobe": {"default": "dark long coat, rumpled shirt, fingerless gloves"},
        "expressions": ["flat", "amused", "wary"],
        "consistency_notes": "Jaw scar on the right side only. Never show him without gloves.",
    },
}


def _dlg(character, text, style="speech", anchor="auto", **kw):
    d = {"character": character, "text": text, "style": style, "anchor": anchor,
         "tail": "auto", "tail_to": None, "size_scale": kw.pop("size_scale", 1.0),
         "rotation": kw.pop("rotation", 0.0)}
    d.update(kw)
    return d


EPISODE = {
    "episode": 1,
    "title": "The Shard",
    "arc": "Arc 1 - The Courier",
    "logline": "Sera takes one last delivery and it turns out to be a recording of her own murder.",
    "purpose": "hook",
    "panel_budget": 10,
    "scroll_target_screens": 6,
    "language": "en",
    "status": "scripted",
    "panels": [
        {
            "id": "p001", "shot": "establishing_wide", "beat": "hook", "pace": "dramatic",
            "height": 420, "bleed": True, "characters": [], "action":
                "Rain-drowned megacity at night, stacked towers receding into fog, a single courier's "
                "umbrella light far below, neon signage bleeding into wet asphalt.",
            "notes": "No faces. Set the world in one image. Big top gutter above this panel.",
            "dialogue": [_dlg("sfx", "KRRRSH", style="sfx", anchor="@0.78,0.72", size_scale=0.85, rotation=-8)],
        },
        {
            "id": "p002", "shot": "wide", "beat": "setup", "pace": "normal",
            "height": 400, "characters": ["sera"], "action":
                "Sera walks the flooded arcade alone, ponytail soaked, jacket collar up, satchel held tight.",
            "dialogue": [_dlg("narration", "The rain in Sector 9 doesn't clean anything.", "narration", "top-left"),
                         _dlg("narration", "It just moves the dirt somewhere you can't see it.", "narration", "bottom-left")],
        },
        {
            "id": "p003", "shot": "close", "beat": "setup", "pace": "normal",
            "height": 340, "characters": ["sera"], "action":
                "Close-up on Sera's eyes reflecting a red neon sign, rain on her lashes.",
            "dialogue": [_dlg("sera", "One more delivery. Then I'm done.", "speech", "top-left")],
        },
        {
            "id": "p004", "shot": "ots", "beat": "inciting", "pace": "normal",
            "height": 400, "characters": ["sera", "kael"], "action":
                "Over Sera's shoulder: a tall man under a low umbrella holds out a cracked data shard.",
            "dialogue": [_dlg("kael", "Play it before sunrise. Or don't play it at all.", "speech", "top-right")],
        },
        {
            "id": "p005", "shot": "insert", "beat": "inciting", "pace": "fast",
            "height": 300, "characters": ["sera"], "action":
                "Insert: the shard in her open palm, faint teal light pulsing inside the crack.",
            "dialogue": [_dlg("narration", "It was warm. Memories shouldn't be warm.", "narration", "bottom-left")],
        },
        {
            "id": "p006", "shot": "environment", "beat": "comedown", "pace": "transition",
            "height": 460, "characters": [], "action":
                "Her rented room: rain crawling down a tall window, one chair, one lamp, the city bokeh beyond.",
            "notes": "Transition panel -- 700px of air after it, then the room lands.",
            "dialogue": [],
        },
        {
            "id": "p007", "shot": "medium", "beat": "build", "pace": "normal",
            "height": 380, "characters": ["sera"], "action":
                "Sera seated at the table, the shard projected as a flickering figure collapsing in an alley.",
            "dialogue": [_dlg("sfx", "THUD", style="sfx", anchor="@0.72,0.66", size_scale=0.7, rotation=6)],
        },
        {
            "id": "p008", "shot": "extreme_close", "beat": "reveal", "pace": "dramatic",
            "height": 400, "characters": ["sera"], "action":
                "Extreme close-up of Sera's eyes going wide, teal projection light across her face.",
            "notes": "Thought bubble on an extreme close-up: keep it short, the eyes are the panel.",
            "dialogue": [_dlg("sera", "That's my coat. That's my hair...", "thought", "top-left")],
        },
        {
            "id": "p009", "shot": "medium_low", "beat": "midpoint_hook", "pace": "normal",
            "height": 400, "characters": ["sera", "kael"], "action":
                "Low angle: Sera turns in her chair. A silhouette fills the open doorway behind her, "
                "umbrella dripping on the floorboards.",
            "dialogue": [_dlg("unknown", "You weren't supposed to see that one.", "speech", "top-center")],
        },
        {
            "id": "p010", "shot": "wide", "beat": "cliffhanger", "pace": "silent",
            "height": 520, "bleed": True, "characters": ["sera"], "action":
                "The window bursts inward, glass and rain suspended, Sera thrown back, the whole neon "
                "city staring through the hole.",
            "notes": "Cliffhanger. End on the image, not on a line.",
            "dialogue": [_dlg("sfx", "CRASH", style="sfx", anchor="@0.36,0.34", size_scale=1.1, rotation=-12)],
        },
    ],
    "end_note": "Next episode: The Broker's Price.",
    "ai_disclosure": None,
}
