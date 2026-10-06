"""
The reference pilot chapter: NEON ARCHIVE ch001.

It is a working demonstration of the whole reference spec: chapter architecture
(engine / introduction / past life / end question), 1080 master geometry, tall
openers, gutter balloons, the full balloon vocabulary, three lettering voices,
colour-coded SFX, composited effects, a white-out transition, scene tints and a
title card. Use it as the template for your own chapter.
"""
from __future__ import annotations

SERIES = {
    "title": "NEON ARCHIVE",
    "alt_titles": {"ko": "네온 아카이브"},
    "logline": "A memory courier plays a stolen recording and sees her own death in it.",
    "genre": ["cyberpunk", "mystery", "thriller"],
    "audience": "16-28 mobile readers, WEBTOON action/mystery readers",
    "tone": "cold, wet, intimate, quietly brutal",
    "platform": "webtoons",
    "release_language": "en",
    "release_schedule": "weekly",
    "density": "reference",
    "target_panels_per_episode": 120,
    "craft_rules": [
        "Panels are panels: one action each, one clear shot, never two events.",
        "Balloons live in upper thirds and clean skies, never over faces, blades or clues.",
        "Detail crops (eyes, mouths, hands, boots) carry the cutting rhythm between big beats.",
        "Close-ups dominate; no more than 2-3 establishing shots per chapter.",
        "Effect languages never mix: pale-blue arcs outward for the courier, indigo voids inward for the broker.",
        "Techniques read start pose -> force direction -> contact -> result -> cost, in that order.",
        "The last panel asks a question the reader has to scroll for.",
    ],
    "art_direction": {
        "style_block": (
            "Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading over "
            "painterly backgrounds, cinematic anamorphic framing, heavy atmosphere, rain and neon, "
            "dramatic rim lighting, rich saturated accents on a desaturated base, full colour, "
            "highly detailed, single vertical panel composition"
        ),
        "negative_block": (
            "text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, "
            "speed lines, motion blur streaks, impact flash, extra fingers, extra limbs, fused fingers, "
            "deformed hands, bad anatomy, bad proportions, blurry, lowres, jpeg artifacts, "
            "character sheet, multiple views, split panel, manga page"
        ),
        "palette": {"key": "#22304a", "accent": "#e0603c", "shadow": "#0d1220",
                    "highlight": "#cfe6ff", "neon": "#39c6c0"},
        "grading_note": ("Cool blue-grey base, one warm accent (amber or rust) per panel, teal neon only "
                         "for the archive tech. Skin tones never shift between panels."),
    },
    "scenes": {
        "street_night": {"tint": "#1b2a3a", "strength": 0.20, "shadow": "#070b12",
                         "note": "the rain-drowned arcade"},
        "room_night":   {"tint": "#241d33", "strength": 0.16, "shadow": "#0d0a14",
                         "note": "her rented room, one warm lamp"},
        "memory":       {"tint": "#8a8577", "strength": 0.30, "shadow": "#2a2620",
                         "note": "past life / recording register"},
        "aftermath":    {"tint": "#3a1f1c", "strength": 0.24, "shadow": "#120807",
                         "note": "the broken window"},
    },
    "effect_languages": {
        "protagonist": {"color": "#cfe9ff", "shape": "outward pale-blue arcs", "note": "outward, pale blue"},
        "antagonist": {"color": "#3a2f7a", "shape": "inward indigo-black voids",
                       "note": "inward, indigo-black"},
    },
    "geometry": {
        "width": 1080, "side_margin": 0, "top_margin": 40, "bottom_margin": 140,
        "gutter": 200, "bg": "#ffffff", "frame": "none", "corner_radius": 0,
    },
    "lettering": {
        "base_font_size": 40, "font_regular": None, "font_bold": None,
        "font_condensed": None, "font_brush": None,
        "caps": False, "max_words_per_bubble": 20, "bubble_max_width_ratio": 0.72,
    },
    "title_card": {"enabled": True, "title": "NEON ARCHIVE", "subtitle": "CHAPTER 1 — THE SHARD"},
    "ai_disclosure": (
        "AI-assisted production. Story, character design, panel direction, lettering and editing by "
        "the creator; panel artwork generated with an AI model from locked character sheets, then "
        "retouched, composited and lettered by hand. Feedback welcome."
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
        "id": "sera", "name": "Sera Vane", "role": "lead", "faction": "protagonist", "age": "26",
        "one_line": "A licensed memory courier who has stopped asking what she carries.",
        "want": "One clean contract that pays off her debt and gets her out of Sector 9.",
        "flaw": "She trusts recordings more than people.",
        "build": "Lean, long-limbed, heavy boots, shoulders slightly forward from years of rain.",
        "face": "Sharp narrow eyes, blunt fringe, a small pale scar through the left eyebrow.",
        "costume": "Grey technical rain jacket, collar up; black high-neck top; satchel strap across the chest.",
        "identifying_props": ["silver dog-tag necklace", "the brow scar", "the satchel"],
        "acting_rules": "Looks away before she answers. Never smiles with her eyes. Her hands give her away.",
        "effect_language": "outward pale-blue arcs (protagonist register)",
        "injury_continuity": "None yet. If she takes a wound, fix the side and keep it for the arc.",
        "dos": ["fringe blunt", "collar up outdoors, down indoors", "dog-tags always visible"],
        "donts": ["never change hair length", "never remove the brow scar", "never a full smile"],
        "prompt_block": (
            "1girl, 26 years old, sharp narrow dark eyes with amber flecks, black hair in a wet low "
            "ponytail, blunt fringe, small pale scar through the left eyebrow, grey technical rain "
            "jacket with the collar up, black high-neck top, silver dog-tag necklace, courier satchel "
            "strap across the chest, tired expression"
        ),
        "lora": {"file": "assets/loras/sera_v1.safetensors", "token": "seravane", "weight": 0.85},
        "seed": 48151623,
        "ref_images": ["assets/refs/sera_sheet.png", "assets/refs/sera_faces.png",
                       "assets/refs/sera_portrait.png"],
        "portrait": "assets/refs/sera_portrait.png",
        "palette": {"hair": "#12141a", "skin": "#e3bfa2", "outfit": "#4b5665", "accent": "#e0603c"},
        "wardrobe": {
            "default": "grey technical rain jacket, collar up, black high-neck top, satchel strap",
            "indoor": "black high-neck top, silver dog-tag necklace",
        },
        "expressions": ["neutral", "wary", "angry", "hollow", "small smile", "shock"],
        "consistency_notes": ("Never change hair length or the fringe. Never remove the brow scar. "
                              "Jacket collar up outdoors, down indoors. Amber flecks are the tell."),
    },
    "kael": {
        "id": "kael", "name": "Kael", "role": "antagonist", "faction": "antagonist", "age": "40s",
        "one_line": "A broker who sells memories he was never given permission to own.",
        "want": "To retire before someone retires him.",
        "flaw": "He keeps one copy of everything. Including this.",
        "build": "Tall, heavy-shouldered, still, occupies doorways.",
        "face": "Weathered, grey stubble, a deep vertical scar on the right jaw.",
        "costume": "Dark long coat over a rumpled shirt, fingerless gloves, umbrella held low.",
        "identifying_props": ["the right-jaw scar", "the low black umbrella", "fingerless gloves"],
        "acting_rules": "Never hurries. Speaks with his weight on one leg. Looks at people the way "
                        "he looks at merchandise.",
        "effect_language": "inward indigo-black voids (antagonist register)",
        "injury_continuity": "Jaw scar, right side only.",
        "dos": ["gloves always on", "umbrella held low and open"],
        "donts": ["never show him running", "never a clean shirt"],
        "prompt_block": (
            "1man, 40s, tall and heavy-shouldered, weathered face, grey stubble, deep vertical scar on "
            "the right jaw, dark long coat over a rumpled shirt, fingerless gloves, umbrella held low, "
            "unreadable expression"
        ),
        "lora": {"file": None, "token": "kaelbroker", "weight": 0.8},
        "seed": 77012233,
        "ref_images": ["assets/refs/kael_sheet.png", "assets/refs/kael_portrait.png"],
        "portrait": "assets/refs/kael_portrait.png",
        "palette": {"hair": "#2a2a2e", "skin": "#d8ab8b", "outfit": "#22242c", "accent": "#39c6c0"},
        "wardrobe": {"default": "dark long coat, rumpled shirt, fingerless gloves"},
        "expressions": ["flat", "amused", "wary"],
        "consistency_notes": "Jaw scar on the right side only. Never show him without gloves.",
    },
}


def _d(character, text, style="speech", anchor="auto", **kw):
    d = {
        "character": character, "text": text, "style": style, "anchor": anchor,
        "voice": kw.pop("voice", None), "anchor_lock": kw.pop("anchor_lock", False),
        "place": kw.pop("place", None), "tail": kw.pop("tail", "auto"),
        "tail_to": kw.pop("tail_to", None), "size_scale": kw.pop("size_scale", 1.0),
        "rotation": kw.pop("rotation", 0.0), "shake": kw.pop("shake", False),
        "blur": kw.pop("blur", 0.0), "fx": kw.pop("fx", "neutral"),
        "prop_rect": kw.pop("prop_rect", None),
    }
    d.update(kw)
    return d


EPISODE = {
    "episode": 1,
    "title": "The Shard",
    "arc": "Arc 1 - The Courier",
    "chapter_idea": "A courier who trusts recordings plays one and finds herself inside it.",
    "logline": "Sera takes one last delivery and it turns out to be a recording of her own murder.",
    "introduces": "Sera (hero shot, backlit, p002) and Kael (face hidden in the doorway, p011).",
    "past_life_beat": "p010 - the desaturated memory fragment inside the recording.",
    "end_question": "Who recorded it - and how does the tape know her coat?",
    "panel_budget": 18,
    "scroll_target_screens": 12,
    "language": "en",
    "status": "scripted",
    "panels": [
        # ---------------------------------------------------------- engine #
        {
            "id": "p001", "shot": "opener_tall", "beat": "engine", "pace": "normal",
            "bleed": True, "scene": "street_night", "characters": [], "focus_guard": [],
            "action": "Tall vertical establishing: rain-drowned megacity at night, stacked towers climbing "
                      "out of frame into fog, one tiny umbrella light far below in the flooded arcade.",
            "notes": "The chapter's visual idea, stated in one image. No faces.",
            "dialogue": [_d("sfx", "KRRRSH", "sfx", "@0.62,0.74", fx="cold", size_scale=0.9, rotation=-7)],
        },
        {
            "id": "p002", "shot": "hero_backlit", "beat": "introduction", "pace": "normal",
            "scene": "street_night", "characters": ["sera"], "fx": [{"type": "speed_horizontal", "count": 34}],
            "fx_faction": "protagonist",
            "action": "Sera stands alone in the flooded arcade, backlit by a wall of neon, coat moving, "
                      "silhouette rimmed in pale blue.",
            "notes": "Introduction hero shot: backlit, low angle, rim light.",
            "dialogue": [_d("narration", "The rain in Sector 9 doesn't clean anything.", "narration", "top-left")],
        },
        {
            "id": "p003", "shot": "detail_eyes", "beat": "setup", "pace": "fast",
            "scene": "street_night", "characters": ["sera"], "focus_guard": ["eyes"],
            "action": "Extreme close-up: her eyes catching a red neon sign, rain beaded on her lashes.",
            "dialogue": [_d("sera", "One more delivery.", "speech", "top-left", tail="down")],
        },
        # --------------------------------------------------------- inciting #
        {
            "id": "p004", "shot": "ots", "beat": "inciting", "pace": "normal",
            "scene": "street_night", "characters": ["sera", "kael"], "focus_guard": ["the shard"],
            "action": "Over Sera's shoulder: Kael under a low umbrella holds out a cracked data shard.",
            "dialogue": [_d("kael", "Play it before sunrise.", "speech", "top-right",
                            tail_to={"x": 0.62, "y": 0.62})],
        },
        {
            "id": "p005", "shot": "detail_prop", "beat": "inciting", "pace": "normal",
            "scene": "street_night", "characters": ["sera"], "focus_guard": ["the shard", "the label"],
            "fx": ["tremble"],
            "action": "Insert: the shard in her open palm, faint teal light pulsing inside the crack, "
                      "a hand-written label gummed to the case.",
            "dialogue": [
                _d("narration", "It was warm. Memories shouldn't be warm.", "narration", "bottom-left"),
                _d("prop", "JOB 77-C", "prop", "@0.5,0.5", prop_rect={"x": 0.44, "y": 0.62, "w": 0.34, "h": 0.14},
                   rotation=-4, size_scale=0.8),
            ],
        },
        # --------------------------------------------------------- comedown #
        {
            "id": "p006", "shot": "environment", "beat": "comedown", "pace": "transition",
            "scene": "room_night", "characters": [],
            "action": "Her rented room: rain crawling down a tall window, one chair, one lamp, city bokeh beyond.",
            "dialogue": [],
        },
        {
            "id": "p007", "shot": "medium", "beat": "build", "pace": "normal",
            "scene": "room_night", "characters": ["sera"], "focus_guard": ["the projection"],
            "action": "Sera at the table, the shard projecting a translucent figure collapsing in a rainy alley.",
            "technique": {"name": "ARCHIVE PLAYBACK", "step": "activation", "note": "the shard opens"},
            "dialogue": [
                _d("sfx", "THUD", "sfx", "@0.72,0.66", fx="impact", size_scale=0.62, rotation=5),
                _d("technique", "ARCHIVE PLAYBACK", "technique", "top-right", voice="condensed_block"),
            ],
        },
        {
            "id": "p008", "shot": "extreme_close", "beat": "reveal", "pace": "dramatic",
            "scene": "room_night", "characters": ["sera"], "focus_guard": ["eyes"],
            "action": "Extreme close-up: her eyes going wide, teal projection light across her face.",
            "dialogue": [_d("sera", "That's my coat. That's my hair...", "thought", "top-left")],
        },
        {
            "id": "p009", "shot": "detail_hands", "beat": "reaction", "pace": "fast",
            "scene": "room_night", "characters": ["sera"], "focus_guard": ["hands"],
            "action": "Her hands, gripping the table edge, knuckles white.",
            "dialogue": [_d("sera", "That's me.", "urgent", "bottom-center", size_scale=0.95)],
        },
        # ------------------------------------------- past life / villain beat #
        {
            "id": "p010", "shot": "wide", "beat": "past_life", "pace": "dramatic",
            "scene": "memory", "characters": ["sera"], "fx": ["speed_radial"],
            "fx_faction": "antagonist",
            "action": "The recording's own image: the same alley, the same coat, a figure going down in "
                      "the rain, filmed from a window above.",
            "dialogue": [
                _d("sfx", "FZZT", "sfx", "@0.30,0.28", fx="mystery", size_scale=0.7, rotation=-10),
                _d("narration", "Sector 9. Third night of the rains.", "narration", "bottom-left"),
            ],
        },
        {
            "id": "p011", "shot": "medium_low", "beat": "villain", "pace": "normal",
            "scene": "room_night", "characters": ["sera", "kael"], "focus_guard": ["the doorway"],
            "fx_faction": "antagonist",
            "action": "Low angle: Sera turns in her chair; behind her the doorway is filled by a backlit "
                      "silhouette, umbrella dripping on the floorboards.",
            "dialogue": [_d("kael", "You weren't supposed to see that one.", "dark", "top-center",
                            tail_to={"x": 0.72, "y": 0.42})],
        },
        {
            "id": "p012", "shot": "sfx_full", "beat": "impact", "pace": "silent", "bleed": True,
            "scene": "aftermath", "characters": [], "fx": ["flash", "speed_radial"],
            "action": "Full-height impact: the window bursts inward, glass and rain suspended, the whole "
                      "neon city staring through the hole.",
            "dialogue": [_d("sfx", "CRASH", "sfx", "@0.42,0.38", fx="violence", size_scale=1.15, rotation=-9)],
        },
        {
            "id": "p013", "shot": "close", "beat": "reaction", "pace": "fast",
            "scene": "aftermath", "characters": ["sera"], "focus_guard": ["face"],
            "action": "Sera thrown back, arm up against the glass, mouth open.",
            "dialogue": [_d("sera", "Kael, wait—", "hesitant", "top-left", size_scale=0.95)],
        },
        {
            "id": "p014", "shot": "detail_boots", "beat": "action", "pace": "fast",
            "scene": "aftermath", "characters": [], "fx": [{"type": "speed_horizontal", "count": 60}],
            "action": "Boots on wet floorboards, mid-stride, away from the room.",
            "dialogue": [],
        },
        {
            "id": "p015", "shot": "medium", "beat": "build", "pace": "fast",
            "scene": "street_night", "characters": ["sera"],
            "fx": [{"type": "smear", "direction": "right", "strength": 0.18}],
            "fx_faction": "protagonist",
            "action": "She runs, coat streaming, through the flooded arcade, neon dragging past her.",
            "dialogue": [_d("sfx", "WHUMP", "sfx", "@0.7,0.72", fx="cold", size_scale=0.7, rotation=4)],
        },
        {
            "id": "p016", "shot": "medium_high", "beat": "midpoint_hook", "pace": "normal",
            "scene": "street_night", "characters": ["sera"], "focus_guard": ["face"],
            "place_note": "balloon lives in the gutter below this panel",
            "action": "High angle: Sera stops, looks back up the arcade, rain sheeting between her and "
                      "the camera.",
            "dialogue": [
                _d("sera", "He's not following. He's waiting.", "speech", "gutter", place="gutter",
                   tail="up", tail_to={"x": 0.38, "y": 0.92}),
            ],
        },
        {
            "id": "p017", "shot": "cowboy", "beat": "turn", "pace": "normal",
            "scene": "street_night", "characters": ["kael"], "focus_guard": ["face"],
            "fx": ["tremble"],
            "action": "Kael under the umbrella, unmoving, watching her go, one gloved hand still raised.",
            "dialogue": [
                _d("kael", "You already played it. That's the part", "continuing", "top-left",
                   tail_to={"x": 0.34, "y": 0.55}),
                _d("kael", "he's going to come for.", "continuing", "@0.30,0.30", tail="up"),
            ],
        },
        # -------------------------------------------------------- end question #
        {
            "id": "p018", "shot": "opener_tall", "beat": "end_question", "pace": "black_out",
            "bleed": True, "scene": "street_night", "characters": [],
            "action": "The arcade from above, empty, one umbrella light and one shard-light still lit, "
                      "rain closing over both.",
            "dialogue": [
                _d("sera", "Who recorded it?", "speech", "top-center", voice="hand_brushed",
                   tail="down", size_scale=1.05),
            ],
        },
    ],
    "end_note": "Next chapter: The Broker's Price.",
    "ai_disclosure": None,
}
