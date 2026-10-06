"""
Platform specs, layout geometry, shot grammar and lettering styles.

Every number here is a *constraint the platform actually enforces* (or a craft
default the industry converges on). They are centralised so the whole pipeline
validates against one source of truth. See docs/04-platform-specs-and-qc.md.
"""
from __future__ import annotations

import os
from pathlib import Path

VERSION = "1.0.0"

# --------------------------------------------------------------------------- #
# Platform specifications
# --------------------------------------------------------------------------- #
# width          : required upload width in px
# tile_max_h     : max height of a single uploaded image
# tile_max_bytes : max file size of a single uploaded image
# episode_max_bytes / max_tiles : episode-level caps
# formats        : accepted file formats
# verified       : False => numbers vary between sources, check your dashboard
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
        "width": 720,          # 690 is also cited for the KR app; 800 works everywhere
        "tile_max_h": 1280,
        "tile_max_bytes": 2 * 1024 * 1024,
        "episode_max_bytes": 20 * 1024 * 1024,
        "max_tiles": 100,
        "formats": ["png", "jpg"],
        "verified": False,
    },
    "tapas": {
        "label": "Tapas",
        "width": 940,          # displays up to 940; 800 also accepted
        "tile_max_h": 4000,
        "tile_max_bytes": 5 * 1024 * 1024,
        "episode_max_bytes": None,
        "max_tiles": None,
        "formats": ["png", "jpg", "jpeg", "gif"],
        "verified": False,
    },
    "globalcomix": {
        "label": "GlobalComix",
        "width": 800,
        "tile_max_h": 20000,
        "tile_max_bytes": 25 * 1024 * 1024,
        "episode_max_bytes": None,
        "max_tiles": None,
        "formats": ["png", "jpg", "jpeg", "webp"],
        "verified": False,
    },
    "selfhost": {
        "label": "Self-hosted / own site",
        "width": 800,
        "tile_max_h": 4000,     # keep tiles small so mobile loads lazily
        "tile_max_bytes": 8 * 1024 * 1024,
        "episode_max_bytes": None,
        "max_tiles": None,
        "formats": ["png", "jpg", "jpeg", "webp"],
        "verified": True,
    },
    "print": {
        "label": "Print master (not for upload)",
        "width": 1600,
        "tile_max_h": 100000,
        "tile_max_bytes": None,
        "episode_max_bytes": None,
        "max_tiles": None,
        "formats": ["png"],
        "verified": True,
    },
}

# Craft defaults for vertical-scroll pacing (px at 800px width).
# WEBTOON's own creator guidance: >=200px between panels, 600-1000px for a
# scene/location transition. Tight gaps read fast, wide gaps read slow.
PACING_GAPS = {
    "fast": 80,
    "normal": 200,
    "dramatic": 600,
    "transition": 700,
    "silent": 1000,
}

DEFAULT_GEOMETRY = {
    "width": 800,
    "side_margin": 40,      # safe area: keep faces/dialogue out of the outer 40px
    "top_margin": 60,
    "bottom_margin": 60,
    "gutter": 200,
    "bg": "#ffffff",
    "frame": "none",        # none | border | hairline
    "gutter_color": "#ffffff",
}

# --------------------------------------------------------------------------- #
# Shot grammar  -> camera language for the image model + composition note
# --------------------------------------------------------------------------- #
# `prompt`   : fragment appended to the panel prompt
# `ar`       : suggested generation aspect ratio (w/h)
# `bubble`   : where speech bubbles usually want to sit for this shot
SHOT_PRESETS: dict[str, dict] = {
    "establishing_wide": {
        "prompt": "extreme wide establishing shot, environment dominant, tiny human figure for scale, deep depth of field",
        "ar": 2.2, "bubble": "top-center",
        "note": "Sets place. No faces needed. Cheap to generate, expensive to get wrong.",
    },
    "wide": {
        "prompt": "wide shot, full body, subject placed on the right third, environment visible",
        "ar": 1.8, "bubble": "top-left",
    },
    "medium": {
        "prompt": "medium shot, waist up, subject centred, shallow depth of field",
        "ar": 1.3, "bubble": "top-center",
    },
    "cowboy": {
        "prompt": "cowboy shot, mid-thigh up, three-quarter view",
        "ar": 1.2, "bubble": "top-right",
    },
    "medium_low": {
        "prompt": "medium shot from a low angle looking up, subject looming, dramatic perspective",
        "ar": 1.3, "bubble": "top-center",
    },
    "medium_high": {
        "prompt": "medium shot from a high angle looking down, subject small in frame, exposed",
        "ar": 1.3, "bubble": "bottom-center",
    },
    "close": {
        "prompt": "close-up of the face and shoulders, eyes in focus, background softly blurred",
        "ar": 1.0, "bubble": "top-left",
        "note": "The workhorse of webtoon pacing: one per emotional beat.",
    },
    "extreme_close": {
        "prompt": "extreme close-up, eyes only, macro detail, iris reflection visible",
        "ar": 1.0, "bubble": "none",
    },
    "ots": {
        "prompt": "over-the-shoulder shot, foreground shoulder blurred, listener's face in focus",
        "ar": 1.5, "bubble": "top-right",
    },
    "insert": {
        "prompt": "detail insert shot of a prop, held in hand, tight framing",
        "ar": 1.4, "bubble": "none",
        "note": "Use for hands, phones, letters, wounds -- the object the plot hangs on.",
    },
    "pov": {
        "prompt": "first person point of view shot, hands visible in the lower frame, wide angle",
        "ar": 1.6, "bubble": "top-center",
    },
    "silhouette": {
        "prompt": "backlit silhouette against a bright background, rim light, face unreadable",
        "ar": 1.6, "bubble": "none",
    },
    "action": {
        "prompt": "dynamic action shot, extreme foreshortening, motion blur streaks, diagonal composition",
        "ar": 1.7, "bubble": "none",
        "note": "Never put dialogue on an action panel. Give the action its own panel.",
    },
    "crowd": {
        "prompt": "crowded scene, many background figures, focus on the foreground subject",
        "ar": 1.9, "bubble": "top-center",
    },
    "top_down": {
        "prompt": "top-down bird's-eye view of the scene, figures seen from directly above",
        "ar": 1.9, "bubble": "none",
    },
    "environment": {
        "prompt": "empty environment shot, no characters, mood and atmosphere only",
        "ar": 2.0, "bubble": "none",
        "note": "The 'breath' panel. Used after a reveal to let it land.",
    },
}

BEAT_TAGS = [
    "hook",         # episode 1-5: the thing that makes them scroll
    "setup",
    "inciting",     # the story starts moving
    "turn",         # something changes
    "reveal",
    "conflict",
    "midpoint_hook",  # ~30-40% through: catches the drop-off point
    "comedown",
    "build",
    "impact",
    "action",
    "reaction",
    "cliffhanger",  # last 2 panels
    "sting",        # final beat image
    "establish",
]

# --------------------------------------------------------------------------- #
# Lettering styles
# --------------------------------------------------------------------------- #
BUBBLE_STYLES = {
    "speech":   {"shape": "round_rect", "fill": "#ffffff", "outline": "#101010", "tc": "#101010", "bold": False, "tail": True,  "caps": False},
    "whisper":  {"shape": "round_rect", "fill": "#ffffff", "outline": "#9aa0a6", "tc": "#3c4043", "bold": False, "tail": True,  "caps": False, "dash": True},
    "shout":    {"shape": "burst",      "fill": "#ffffff", "outline": "#101010", "tc": "#101010", "bold": True,  "tail": True,  "caps": True},
    "thought":  {"shape": "cloud",      "fill": "#ffffff", "outline": "#101010", "tc": "#101010", "bold": False, "tail": True,  "caps": False},
    "narration":{"shape": "box",        "fill": "#f4f1e8", "outline": "#3a3a3a", "tc": "#1a1a1a", "bold": False, "tail": False, "caps": False},
    "system":   {"shape": "system",     "fill": "#0b1723", "outline": "#3fd0e0", "tc": "#d8f6ff", "bold": True,  "tail": False, "caps": False, "mono": True},
    "radio":    {"shape": "round_rect", "fill": "#101010", "outline": "#3fd0e0", "tc": "#7ce8f4", "bold": False, "tail": False, "caps": False, "mono": True},
    "sfx":      {"shape": "none",       "fill": None,      "outline": "#101010", "tc": "#ffffff", "bold": True,  "tail": False, "caps": True,  "stroke": 6},
}

# Anchor tokens accepted in scripts -> fractional position of the bubble's tip
ANCHORS = {
    "top-left": (0.26, 0.16), "top-center": (0.50, 0.14), "top-right": (0.74, 0.16),
    "middle-left": (0.24, 0.45), "center": (0.50, 0.45), "middle-right": (0.76, 0.45),
    "bottom-left": (0.26, 0.76), "bottom-center": (0.50, 0.78), "bottom-right": (0.74, 0.76),
    "auto": None, "none": None,
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
    "regular":   ["Bangers-Regular.ttf", "ComicNeue-Regular.ttf", "AnimeAce2.0BB.ttf", "DejaVuSans.ttf", "arial.ttf"],
    "bold":      ["Bangers-Regular.ttf", "ComicNeue-Bold.ttf", "AnimeAce2.0BB-Bold.ttf", "DejaVuSans-Bold.ttf", "arialbd.ttf"],
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
    # anything unresolved falls back to whatever we found elsewhere
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
