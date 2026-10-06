"""
Platform specs, master/export geometry, ratio bands, shot grammar, balloon
vocabulary, lettering voices and SFX palettes.

Two widths matter:
  * MASTER_WIDTH (1080) -- everything is drawn and lettered at this width.
  * the platform upload width (800 for WEBTOON) -- the master is sliced, then
    downscaled, so uploads are sharper than if they had been drawn at 800.
All craft numbers authored "at 800" are scaled to the master by ``scale_for()``.
"""
from __future__ import annotations

import os
from pathlib import Path

VERSION = "1.1.0"

MASTER_WIDTH = 1080
REFERENCE_WIDTH = 800          # the width all craft guidance is authored at

# --------------------------------------------------------------------------- #
# Platform specifications (upload/export pass)
# --------------------------------------------------------------------------- #
PLATFORM_SPECS: dict[str, dict] = {
    "webtoons": {
        "label": "WEBTOON Canvas (webtoons.com)",
        "width": 800,
        "tile_max_h": 1280,
        "tile_max_bytes": 2 * 1024 * 1024,
        "episode_max_bytes": 20 * 1024 * 1024,
        "max_tiles": 100,
        "formats": ["png", "jpg", "jpeg"],
        "thumb": "1080x1080 square (<500KB) / 1080x1920 vertical (<700KB)",
        "episode_thumb": "202x142",
        "verified": True,
    },
    "naver": {
        "label": "Naver Webtoon (KR app / challenge)",
        "width": 720, "tile_max_h": 1280, "tile_max_bytes": 2 * 1024 * 1024,
        "episode_max_bytes": 20 * 1024 * 1024, "max_tiles": 100,
        "formats": ["png", "jpg"], "verified": False,
    },
    "tapas": {
        "label": "Tapas (AI-generated content prohibited)",
        "width": 940, "tile_max_h": 4000, "tile_max_bytes": 5 * 1024 * 1024,
        "episode_max_bytes": None, "max_tiles": None,
        "formats": ["png", "jpg", "jpeg", "gif"], "verified": False,
    },
    "globalcomix": {
        "label": "GlobalComix (fully-AI art banned Mar 2026)",
        "width": 800, "tile_max_h": 20000, "tile_max_bytes": 25 * 1024 * 1024,
        "episode_max_bytes": None, "max_tiles": None,
        "formats": ["png", "jpg", "jpeg", "webp"], "verified": False,
    },
    "selfhost": {
        "label": "Self-hosted / own site",
        "width": 800, "tile_max_h": 4000, "tile_max_bytes": 8 * 1024 * 1024,
        "episode_max_bytes": None, "max_tiles": None,
        "formats": ["png", "jpg", "jpeg", "webp"], "verified": True,
    },
    "print": {
        "label": "Print master (not for upload)",
        "width": 1600, "tile_max_h": 100000, "tile_max_bytes": None,
        "episode_max_bytes": None, "max_tiles": None,
        "formats": ["png"], "verified": True,
    },
}

# Craft defaults for vertical-scroll pacing, authored AT 800px width.
# 200px is WEBTOON's own floor; 600-1000px sells a time/location jump.
PACING_GAPS = {
    "fast": 70,          # ~90px in the 1080 master -- their tightest figure
    "normal": 200,
    "dramatic": 600,
    "transition": 700,
    "silence": 1000,
    "white_out": 1000,   # time shift
    "black_out": 1000,   # dramatic beat
}

DEFAULT_GEOMETRY = {
    "width": MASTER_WIDTH,
    "side_margin": 0,        # reference tier draws panels full width
    "top_margin": 60,
    "bottom_margin": 120,
    "gutter": 200,           # authored at 800, scaled to the master
    "bg": "#ffffff",
    "frame": "none",
    "corner_radius": 0,
}

# --------------------------------------------------------------------------- #
# Panel ratio bands (width/height) -- reference-tier panel geometry
#   tall establishing / entrance : 1:2 to 1:3   -> 0.33 .. 0.50 w/h
#   dialogue / medium            : 4:5 to 1:1   -> 0.80 .. 1.00 w/h
#   action wide                  : 16:9 to 2:1  -> 1.78 .. 2.00 w/h
#   detail crops                 : 1:1 to 3:4   -> 0.75 .. 1.00 w/h
#   full bleed / SFX             : any height
# Bands overlap on purpose (1:1 is both a medium shot and a detail crop), so the
# meaningful test is "does this panel sit inside ITS shot's band" -- see in_band().
# --------------------------------------------------------------------------- #
RATIO_BANDS = {
    "tall_establish": (0.33, 0.50),
    "dialogue":       (0.80, 1.00),
    "action_wide":    (1.78, 2.00),
    "detail":         (0.75, 1.00),
    "full_bleed":     None,
}

# --------------------------------------------------------------------------- #
# Shot grammar
# `prompt` : camera fragment appended to the panel prompt
# `ar`     : suggested width/height
# `band`   : which RATIO_BANDS entry it must sit in
# `bubble` : usual bubble anchor
# --------------------------------------------------------------------------- #
SHOT_PRESETS: dict[str, dict] = {
    # -- tall openers ------------------------------------------------------ #
    "opener_tall": {
        "prompt": "tall vertical establishing composition, environment towering over the frame, "
                  "deep depth, atmosphere and scale, tiny human figure for reference",
        "ar": 0.36, "band": "tall_establish", "bubble": "top-center",
        "note": "The 3x-tall chapter opener. State the chapter's visual idea here.",
    },
    "establishing": {
        "prompt": "tall establishing shot, location dominant, vertical composition, atmospheric depth",
        "ar": 0.46, "band": "tall_establish", "bubble": "top-center",
    },
    "entrance": {
        "prompt": "tall narrow entrance composition, a figure entering a doorway or frame from below, "
                  "backlit, long vertical framing, dramatic rim light",
        "ar": 0.34, "band": "tall_establish", "bubble": "none",
        "note": "Entrance strip. Cheap to generate, extremely strong beat.",
    },
    "establishing_wide": {
        "prompt": "wide establishing shot, environment dominant, deep depth of field, "
                  "horizontal cinematic framing",
        "ar": 1.9, "band": "action_wide", "bubble": "top-left",
        "note": "Use sparingly -- max 2-3 establishing shots per chapter.",
    },
    # -- dialogue / medium ------------------------------------------------- #
    "wide":   {"prompt": "wide shot, full body, subject on the right third, environment visible",
               "ar": 1.8, "band": "action_wide", "bubble": "top-left"},
    "medium": {"prompt": "medium shot, waist up, subject centred, shallow depth of field",
               "ar": 0.92, "band": "dialogue", "bubble": "top-center"},
    "cowboy": {"prompt": "cowboy shot, mid-thigh up, three-quarter view",
               "ar": 0.86, "band": "dialogue", "bubble": "top-right"},
    "medium_low": {"prompt": "medium shot from a low angle looking up, subject looming, "
                             "heroic low angle, dramatic perspective",
                   "ar": 0.9, "band": "dialogue", "bubble": "top-center"},
    "medium_high": {"prompt": "medium shot from a high angle looking down, subject small in frame",
                    "ar": 0.9, "band": "dialogue", "bubble": "bottom-center"},
    "hero_backlit": {
        "prompt": "backlit hero shot from a low angle, strong rim light outlining the silhouette, "
                  "dramatic sky or blown-out background, standing pose, cloak or coat moving",
        "ar": 0.82, "band": "dialogue", "bubble": "none",
        "note": "The introduction hero shot: backlit, low angle. Mystery figures keep the face hidden.",
    },
    "ots": {"prompt": "over-the-shoulder shot, foreground shoulder blurred, listener's face in focus",
            "ar": 0.92, "band": "dialogue", "bubble": "top-right"},
    "pov": {"prompt": "first person point of view shot, hands visible in the lower frame, wide angle",
            "ar": 0.8, "band": "dialogue", "bubble": "top-center"},
    "crowd": {"prompt": "crowded scene, many background figures, focus on the foreground subject",
              "ar": 1.85, "band": "action_wide", "bubble": "top-center"},
    "environment": {
        "prompt": "empty environment shot, no characters, mood and atmosphere only",
        "ar": 0.85, "band": "dialogue", "bubble": "none",
        "note": "The breath panel. Use after a reveal to let it land.",
    },
    # -- action ------------------------------------------------------------ #
    "action": {"prompt": "dynamic action shot, extreme foreshortening, motion blur streaks, "
                         "diagonal composition",
               "ar": 1.78, "band": "action_wide", "bubble": "none",
               "note": "Never put dialogue on an action panel."},
    "action_wide": {"prompt": "wide action shot, 16:9 cinematic framing, motion, impact energy",
                    "ar": 1.78, "band": "action_wide", "bubble": "none"},
    "silhouette": {"prompt": "backlit silhouette against a bright background, rim light, "
                             "face unreadable, mystery figure",
                   "ar": 0.9, "band": "dialogue", "bubble": "none"},
    "sfx_full": {
        "prompt": "full-height impact composition, debris and motion in the air, dramatic lighting",
        "ar": 0.55, "band": "full_bleed", "bubble": "none", "bleed": True,
        "note": "Full-height SFX panel: the effect hangs in the gutter and breaks the borders.",
    },
    # -- detail crops (the density engine) --------------------------------- #
    "detail_eyes":  {"prompt": "extreme close-up, eyes only, macro detail, iris reflection, "
                               "lashes, emotion in the pupils",
                     "ar": 1.0, "band": "detail", "bubble": "none"},
    "detail_mouth": {"prompt": "extreme close-up of the mouth and chin, lips parted, breath visible",
                     "ar": 0.9, "band": "detail", "bubble": "none"},
    "detail_hands": {"prompt": "detail crop of hands, fingers, grip and tension, shallow depth",
                     "ar": 0.95, "band": "detail", "bubble": "none"},
    "detail_boots": {"prompt": "detail crop of boots and lower legs stepping, ground level, "
                               "dust or rain at the feet",
                     "ar": 0.85, "band": "detail", "bubble": "none"},
    "detail_fist":  {"prompt": "detail crop of a clenched fist, knuckles white, tension",
                     "ar": 1.0, "band": "detail", "bubble": "none"},
    "detail_prop":  {"prompt": "detail crop of a key prop, held or placed, tight framing",
                     "ar": 0.95, "band": "detail", "bubble": "none",
                     "note": "The object the plot hangs on. Give it its own beat."},
    "extreme_close": {"prompt": "extreme close-up, eyes only, macro detail, iris reflection visible",
                      "ar": 1.0, "band": "detail", "bubble": "none"},
    "close": {"prompt": "close-up of the face and shoulders, eyes in focus, background softly blurred",
              "ar": 0.95, "band": "detail", "bubble": "top-left",
              "note": "The workhorse of webtoon pacing: one per emotional beat."},
    "insert": {"prompt": "detail insert shot of a prop, held in hand, tight framing",
               "ar": 0.95, "band": "detail", "bubble": "none"},
    "top_down": {"prompt": "top-down bird's-eye view of the scene, figures seen from directly above",
                 "ar": 1.85, "band": "action_wide", "bubble": "none"},
}

# --------------------------------------------------------------------------- #
# Beats
# --------------------------------------------------------------------------- #
BEAT_TAGS = [
    # chapter architecture (mandatory)
    "engine",          # panels 1-5: the chapter's visual idea, stated in images
    "introduction",    # a new face, a new facet, or a planted future face
    "hero_shot",       # the presentation beat of an introduction
    "past_life",       # memory fragment / origin
    "villain",         # enemy sigil, seal, marked blade
    "end_question",    # final panel asks something you must scroll for
    # episode spine
    "hook", "setup", "inciting", "turn", "reveal", "conflict", "midpoint_hook",
    "comedown", "build", "impact", "action", "reaction", "cliffhanger", "sting",
    "establish", "silence",
]

# beat -> lighting / mood fragment (keeps the whole chapter graded consistently)
BEAT_LIGHT = {
    "engine": "bold graphic lighting, high contrast, the chapter's key image",
    "introduction": "dramatic rim light, the subject isolated from the background",
    "hero_shot": "backlit, blown-out background, strong rim light, low angle",
    "past_life": "desaturated, hazy memory light, soft vignette, flat contrast",
    "villain": "cold hard light from below, deep shadow, desaturated with one hot accent",
    "end_question": "hard backlight, silhouette edge, unanswered, one bright accent",
    "hook": "cold ambient light, high contrast, ominous calm",
    "establish": "wide ambient light, soft haze, establishing mood",
    "setup": "neutral soft light, readable, low drama",
    "inciting": "light shifts warmer, something is off-centre",
    "turn": "hard side light, half the face in shadow",
    "reveal": "strong rim light, deep shadows, colour accent on the subject",
    "conflict": "hot key light, deep blacks, tense",
    "midpoint_hook": "colour temperature break, sudden red or cyan cast",
    "comedown": "low contrast, dim, quiet",
    "build": "gradually brighter, tightening",
    "impact": "blown-out highlight, motion streaks",
    "action": "high key with motion blur and speed lines",
    "reaction": "single soft key light on the eyes",
    "cliffhanger": "hard backlight, silhouette edge, unanswered",
    "sting": "single hard light source, everything else crushed to black",
    "silence": "flat ambient light, almost no contrast, quiet",
}

# --------------------------------------------------------------------------- #
# Balloon vocabulary -- shape encodes delivery
# --------------------------------------------------------------------------- #
BUBBLE_STYLES: dict[str, dict] = {
    "speech":     {"shape": "oval",       "fill": "#ffffff", "outline": "#101010", "tc": "#101010", "bold": False, "tail": True,  "caps": False},
    "shout":      {"shape": "burst",      "fill": "#ffffff", "outline": "#101010", "tc": "#101010", "bold": True,  "tail": True,  "caps": True, "border_break": True},
    "thought":    {"shape": "cloud",      "fill": "#ffffff", "outline": "#101010", "tc": "#101010", "bold": False, "tail": True,  "caps": False},
    "whisper":    {"shape": "dashed",     "fill": "#ffffff", "outline": "#9aa0a6", "tc": "#3c4043", "bold": False, "tail": True,  "caps": False},
    "narration":  {"shape": "dashed",     "fill": "#f4f1e8", "outline": "#8a8578", "tc": "#2a2722", "bold": False, "tail": False, "caps": False},
    "dark":       {"shape": "oval",       "fill": "#0d0d10", "outline": "#0d0d10", "tc": "#f2f2f2", "bold": True,  "tail": True,  "caps": False},
    "urgent":     {"shape": "oval",       "fill": "#ffe9d6", "outline": "#c8342a", "tc": "#7a1a12", "bold": True,  "tail": True,  "caps": False, "glow": "#ff8a5c"},
    "recognition":{"shape": "oval",       "fill": "#fff4d9", "outline": "#c8a53a", "tc": "#4a3a10", "bold": False, "tail": True,  "caps": False, "glow": "#ffe6a3"},
    "symbol":     {"shape": "none",       "fill": None,      "outline": "#101010", "tc": "#101010", "bold": True,  "tail": False, "caps": False, "huge": True},
    "hesitant":   {"shape": "wobbly",     "fill": "#ffffff", "outline": "#2a2a2a", "tc": "#2a2a2a", "bold": False, "tail": True,  "caps": False},
    "continuing": {"shape": "linked",     "fill": "#ffffff", "outline": "#101010", "tc": "#101010", "bold": False, "tail": True,  "caps": False},
    "system":     {"shape": "system",     "fill": "#0b1723", "outline": "#3fd0e0", "tc": "#d8f6ff", "bold": True,  "tail": False, "caps": False, "mono": True},
    "radio":      {"shape": "sync",       "fill": "#101010", "outline": "#3fd0e0", "tc": "#7ce8f4", "bold": False, "tail": False, "caps": False, "mono": True},
    "technique":  {"shape": "technique",  "fill": "#141414", "outline": "#e8e2d4", "tc": "#f2ede0", "bold": True,  "tail": False, "caps": False},
    "prop":       {"shape": "prop",       "fill": None,      "outline": "#1a1a1a", "tc": "#1a1a1a", "bold": False, "tail": False, "caps": False},
    "sfx":        {"shape": "none",       "fill": None,      "outline": "#ffffff", "tc": "#ffffff", "bold": True,  "tail": False, "caps": True,  "stroke": 7},
}

# token -> fractional position of the balloon's centre
ANCHORS = {
    "top-left": (0.26, 0.16), "top-center": (0.50, 0.14), "top-right": (0.74, 0.16),
    "middle-left": (0.24, 0.45), "center": (0.50, 0.45), "middle-right": (0.76, 0.45),
    "bottom-left": (0.26, 0.76), "bottom-center": (0.50, 0.78), "bottom-right": (0.74, 0.76),
    "gutter": None, "auto": None, "none": None,
}

# --------------------------------------------------------------------------- #
# Lettering voices (three, per the reference spec)
# --------------------------------------------------------------------------- #
VOICES = {
    "clean_bold": {
        "regular": "bold", "bold": "bold", "weight_scale": 1.0,
        "note": "standard speech",
    },
    "condensed_block": {
        "regular": "condensed", "bold": "condensed", "weight_scale": 0.94,
        "note": "narration, captions, technique boxes",
    },
    "hand_brushed": {
        "regular": "regular", "bold": "bold", "weight_scale": 1.08,
        "jitter": 1.0, "note": "emotional / shouting, may carry shake or motion blur",
    },
}

# --------------------------------------------------------------------------- #
# SFX colour coding -- the effect's meaning is carried by its colour
# --------------------------------------------------------------------------- #
SFX_PALETTE = {
    "violence": {"tc": "#f4f4f4", "outline": "#8e1b12", "glow": "#ff2f1f", "note": "violence / rage impact"},
    "cold":     {"tc": "#eaf6ff", "outline": "#12417a", "glow": "#2f8fe0", "note": "cold motion, blades, water"},
    "mystery":  {"tc": "#f2eaff", "outline": "#3d1f74", "glow": "#8f4fe0", "note": "mystery, magic, the unknown"},
    "impact":   {"tc": "#111111", "outline": "#ffffff", "glow": "#cfe9ff", "note": "heavy impact: black with a white halo"},
    "neutral":  {"tc": "#ffffff", "outline": "#101010", "glow": None,      "note": "default"},
}

# --------------------------------------------------------------------------- #
# Panel effects (composited, never asked of the art model)
# --------------------------------------------------------------------------- #
PANEL_FX = {
    "speed_radial":     {"note": "shock: lines converging on a focal point"},
    "speed_horizontal": {"note": "motion: horizontal speed lines"},
    "speed_rage":       {"note": "rage: red-tinted horizontal lines"},
    "smear":            {"note": "motion smear across the panel"},
    "flash":            {"note": "impact flash: radial white bloom"},
    "tremble":          {"note": "nervousness: short trembling strokes"},
    "white_out":        {"note": "time shift"},
    "black_out":        {"note": "dramatic beat"},
}

# --------------------------------------------------------------------------- #
# Script-refinement vocabulary (the no-slop pass)
# --------------------------------------------------------------------------- #
SLOP_WORDS = [
    "delve", "leverage", "tapestry", "realm", "testament", "underscore",
    "navigate", "landscape", "robust", "seamless", "holistic", "synergy",
    "utilize", "facilitate", "myriad", "plethora", "embark", "journey of",
    "unwavering", "indomitable", "profound", "crucial", "pivotal", "vital role",
    "in conclusion", "it is worth noting", "needless to say", "at the end of the day",
    "only time will tell", "little did", "suddenly,", "somehow,",
]

SLOP_PATTERNS = [
    (r"\bnot only\b.{0,40}\bbut also\b", "binary contrast"),
    (r"\b(isn't|is not|wasn't|was not) (just|merely|only)\b", "importance puffery"),
    (r"\bmore than (just )?a\b", "importance puffery"),
    (r"\bin a world where\b", "throat-clearing"),
    (r"\bas (if|though) to say\b", "throat-clearing"),
    (r"\bhe (could|can) feel\b.{0,30}\bfeel\b", "redundancy"),
    (r"\bbegan to (walk|run|move|speak)\b", "filter word"),
    (r"\bwas about to\b", "filter word"),
    (r"\bthe air was thick with\b", "cliche"),
    (r"\ba (single|solitary) tear\b", "cliche"),
    (r"\beyes widened in (shock|surprise)\b", "cliche (show it in the art instead)"),
]

# --------------------------------------------------------------------------- #
# Density tiers
# --------------------------------------------------------------------------- #
DENSITY_TIERS = {
    "standard":  {"panels": 55,  "note": "platform-survey range, 40-80"},
    "dense":     {"panels": 80,  "note": "long-form weekly, action/romance"},
    "reference": {"panels": 120, "note": "reference tier: 110-130 panels, 5-7 per 'page', detail-crop driven"},
}

# --------------------------------------------------------------------------- #
# Fonts
# --------------------------------------------------------------------------- #
_SYSTEM_FONT_DIRS = [
    "/usr/share/fonts/truetype/dejavu",   # Debian/Ubuntu (sandbox default)
    "/usr/share/fonts/TTF",
    "/Library/Fonts",
    "/System/Library/Fonts/Supplemental",
    "C:/Windows/Fonts",
]

_WANTED = {
    "regular":   ["Bangers-Regular.ttf", "AnimeAce2.0BB.ttf", "ComicNeue-Regular.ttf", "DejaVuSans.ttf", "arial.ttf"],
    "bold":      ["Bangers-Regular.ttf", "AnimeAce2.0BB-Bold.ttf", "ComicNeue-Bold.ttf", "DejaVuSans-Bold.ttf", "arialbd.ttf"],
    "condensed": ["CCWildWordsRoman.ttf", "ComicNeue-Bold.ttf", "DejaVuSansCondensed-Bold.ttf", "DejaVuSans-Bold.ttf", "arialbd.ttf"],
    "brush":     ["KomikaAxis.ttf", "Bangers-Regular.ttf", "ComicNeue-Bold.ttf", "DejaVuSans-Bold.ttf", "arialbd.ttf"],
    "mono":      ["DejaVuSansMono.ttf", "consola.ttf"],
    "mono_bold": ["DejaVuSansMono-Bold.ttf", "consolab.ttf"],
}


def find_fonts(project_root: Path | None = None, overrides: dict | None = None) -> dict[str, str]:
    """Resolve font paths: project assets/fonts > series overrides > system fonts."""
    found: dict[str, str] = {}
    search_dirs: list[Path] = []
    if project_root:
        search_dirs += [project_root / "assets" / "fonts", project_root / "fonts"]
    search_dirs += [Path(d) for d in _SYSTEM_FONT_DIRS]

    for role, names in _WANTED.items():
        if overrides and overrides.get(role):
            p = Path(overrides[role])
            if not p.is_absolute() and project_root:
                p = project_root / p
            if p.exists():
                found[role] = str(p)
                continue
        for d in search_dirs:
            if not d.is_dir():
                continue
            for n in names:
                if (d / n).exists():
                    found[role] = str(d / n)
                    break
            if role in found:
                break
    fallback = found.get("regular") or next(iter(found.values()), None)
    for role in _WANTED:
        found.setdefault(role, fallback)
    return found


def resolve_platform(name: str) -> dict:
    key = (name or "webtoons").lower()
    if key not in PLATFORM_SPECS:
        raise KeyError(f"unknown platform {name!r}; pick one of {sorted(PLATFORM_SPECS)}")
    spec = dict(PLATFORM_SPECS[key])
    spec["key"] = key
    return spec


def scale_for(width: int) -> float:
    """Scale factor from the reference width (800) to an arbitrary output width."""
    return width / float(REFERENCE_WIDTH)


def in_band(ar: float, band_name: str) -> bool:
    """Is this panel ratio inside the band its shot declares? (Bands overlap.)"""
    band = RATIO_BANDS.get(band_name)
    if band is None:          # full_bleed accepts any height
        return True
    return band[0] - 0.01 <= ar <= band[1] + 0.01


def band_of(ar: float) -> list[str]:
    """Every band that accepts this ratio (for diagnostics)."""
    return [n for n, b in RATIO_BANDS.items() if b is None or b[0] - 0.01 <= ar <= b[1] + 0.01]
