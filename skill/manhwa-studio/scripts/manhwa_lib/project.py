"""
Project data model: series.json / characters/*.json / episodes/*.json.

The whole pipeline is file-driven on purpose: every artefact is plain JSON +
PNG on disk, so a human, a script, or an LLM agent can read and edit any stage
without a database or a running app.
"""
from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path

from .specs import DEFAULT_GEOMETRY, PACING_GAPS, resolve_platform

PROJECT_DIRS = [
    "characters", "episodes", "art", "output", "promptpack",
    "assets/fonts", "assets/refs", "reviews", "docs",
]


# --------------------------------------------------------------------------- #
# load / save
# --------------------------------------------------------------------------- #
def load_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def find_root(start: Path) -> Path:
    """Walk up looking for series.json."""
    p = start.resolve()
    if p.is_file():
        p = p.parent
    for cand in [p, *p.parents]:
        if (cand / "series.json").exists():
            return cand
    return p


class Project:
    def __init__(self, root: Path):
        self.root = Path(root)
        self.series = load_json(self.root / "series.json")
        self.platform = resolve_platform(self.series.get("platform", "webtoons"))
        self.geometry = {**DEFAULT_GEOMETRY, **self.series.get("geometry", {})}
        self.geometry["width"] = self.geometry.get("width") or self.platform["width"]
        if self.series.get("background"):
            self.geometry["bg"] = self.series["background"]

    # -- characters ------------------------------------------------------- #
    @property
    def char_dir(self) -> Path:
        return self.root / "characters"

    def characters(self) -> dict[str, dict]:
        out = {}
        for f in sorted(self.char_dir.glob("*.json")):
            data = load_json(f)
            out[data.get("id", f.stem)] = data
        return out

    def character(self, cid: str) -> dict | None:
        f = self.char_dir / f"{cid}.json"
        return load_json(f) if f.exists() else None

    # -- episodes --------------------------------------------------------- #
    @property
    def ep_dir(self) -> Path:
        return self.root / "episodes"

    def episodes(self) -> list[Path]:
        return sorted(self.ep_dir.glob("ep*.json"))

    def episode(self, ref) -> tuple[Path, dict]:
        ref = str(ref)
        if ref.isdigit():
            p = self.ep_dir / f"ep{int(ref):03d}.json"
        else:
            p = Path(ref)
            if not p.exists() and (self.ep_dir / f"{ref}.json").exists():
                p = self.ep_dir / f"{ref}.json"
        if not p.exists():
            raise FileNotFoundError(f"episode not found: {ref}")
        return p, load_json(p)

    def panel_image_path(self, ep_no: int, panel_id: str, image: str | None) -> Path | None:
        """Resolve a panel's art file. Explicit path wins, then art/epNNN/pid.png."""
        if image:
            cand = self.root / image
            if cand.exists():
                return cand
        for ext in (".png", ".jpg", ".jpeg", ".webp"):
            cand = self.root / "art" / f"ep{int(ep_no):03d}" / f"{panel_id}{ext}"
            if cand.exists():
                return cand
        return None


# --------------------------------------------------------------------------- #
# init
# --------------------------------------------------------------------------- #
def scaffold(root: Path, title: str, platform: str = "webtoons", language: str = "en") -> Path:
    root = Path(root)
    for d in PROJECT_DIRS:
        (root / d).mkdir(parents=True, exist_ok=True)
    if not (root / "series.json").exists():
        save_json(root / "series.json", series_template(title, platform, language))
    (root / "PROJECT.md").write_text(project_md(title), encoding="utf-8")
    return root


def series_template(title: str, platform: str = "webtoons", language: str = "en") -> dict:
    spec = resolve_platform(platform)
    return {
        "title": title,
        "alt_titles": {},
        "logline": "One sentence: who wants what, and what stands in the way.",
        "genre": ["fantasy"],
        "audience": "16-25 mobile readers",
        "tone": "tense, warm, wry",
        "platform": spec["key"],
        "release_language": language,
        "release_schedule": "weekly",
        "target_panels_per_episode": 55,
        "art_direction": {
            "style_block": (
                "Korean webtoon manhwa illustration, clean confident line art, soft cel shading "
                "with painterly backgrounds, cinematic colour grading, dramatic rim lighting, "
                "highly detailed, vertical-scroll composition, full colour"
            ),
            "negative_block": (
                "text, letters, speech bubble, caption, watermark, signature, logo, ui, "
                "extra fingers, extra limbs, deformed hands, bad anatomy, blurry, lowres, "
                "jpeg artifacts, multiple views, character sheet layout"
            ),
            "palette": {"key": "#2b3a55", "accent": "#e8b04b", "shadow": "#141a26", "highlight": "#f2e9d8"},
            "grading_note": "Cool shadows, warm practical lights. Keep skin tones constant across panels.",
        },
        "geometry": dict(DEFAULT_GEOMETRY, width=spec["width"]),
        "lettering": {
            "base_font_size": 30,          # at 800px width; scales with geometry.width
            "font_regular": None,          # e.g. "assets/fonts/Bangers-Regular.ttf"
            "font_bold": None,
            "caps": False,                 # set true for traditional all-caps lettering
            "max_words_per_bubble": 30,
            "bubble_max_width_ratio": 0.62,
        },
        "ai_disclosure": (
            "AI-assisted production. Story, character design, panel direction and lettering by "
            "<your name>; panel artwork generated with <models/tools> and retouched by hand."
        ),
        "characters": [],
        "arcs": [
            {"name": "Arc 1 - title", "episodes": "1-8", "beats": ["hook", "reversal", "midpoint", "climax", "cliffhanger"]},
        ],
    }


def character_template(cid: str, name: str, role: str = "support") -> dict:
    return {
        "id": cid,
        "name": name,
        "role": role,                       # lead | support | antagonist | minor
        "age": "",
        "one_line": "Who they are in one line.",
        "want": "What they chase.",
        "flaw": "What breaks them.",
        "prompt_block": (
            "1girl, long black hair in a low ponytail, sharp dark eyes, small scar on left brow, "
            "grey rain jacket with the collar up, black high-neck top, always slightly damp"
        ),
        "lora": {
            "file": None,                   # e.g. "assets/loras/sera_v1.safetensors"
            "token": "sera_arch",           # trigger word the LoRA was trained with
            "weight": 0.85,
        },
        "seed": 48151623,
        "ref_images": ["assets/refs/sera_front.png", "assets/refs/sera_3q.png"],
        "palette": {"hair": "#141414", "skin": "#e6c3a5", "outfit": "#4a5561", "accent": "#2fb6a8"},
        "wardrobe": {
            "default": "grey rain jacket, collar up, black high-neck top",
            "indoor":   "black high-neck top, silver dog-tag necklace",
        },
        "expressions": ["neutral", "wary", "angry", "hollow", "small smile"],
        "consistency_notes": "Never change hair length, never remove the brow scar, keep the jacket collar up.",
    }


def episode_template(no: int, title: str, panels: list[dict] | None = None) -> dict:
    return {
        "episode": no,
        "title": title,
        "arc": "Arc 1",
        "logline": "What changes for the reader by the end of this episode?",
        "purpose": "characterise | worldbuild | plot | setpiece",
        "scroll_target_screens": 8,
        "language": "en",
        "status": "scripted",   # scripted | storyboarded | art | lettered | published
        "panels": panels or [panel_template("p001")],
        "end_note": "Next episode in the series.",
        "ai_disclosure": None,  # falls back to series-level disclosure
    }


def panel_template(pid: str, shot: str = "medium", beat: str = "setup") -> dict:
    return {
        "id": pid,
        "shot": shot,
        "beat": beat,
        "pace": "normal",        # fast | normal | dramatic | transition | silent
        "height": None,          # None => derive from the art's aspect ratio
        "bleed": False,          # True => full platform width, no side margin
        "fit": "crop",           # crop | contain | width
        "crop_bias": "center",   # center | top | bottom
        "image": None,           # art/epNNN/pXXX.png by default
        "characters": [],
        "outfit": {},            # {"sera": "indoor"}
        "action": "What is happening in this panel.",
        "prompt_override": None,
        "negative_override": None,
        "notes": "",
        "dialogue": [],
    }


def dialogue_template(character: str = "narration", text: str = "", style: str = "speech",
                     anchor: str = "auto") -> dict:
    return {
        "character": character,
        "text": text,
        "style": style,          # speech|whisper|shout|thought|narration|system|radio|sfx
        "anchor": anchor,        # auto|top-left|...|"@0.5,0.25" (panel fractions)
        "tail": "auto",          # auto|down|up|left|right|none
        "tail_to": None,         # {"x":0.5,"y":0.8} panel fractions for the tail tip
        "size_scale": 1.0,
        "rotation": 0.0,
    }


def project_md(title: str) -> str:
    return f"""# {title} -- production project

Folder map (everything the pipeline reads):

```
series.json           series bible: style block, palette, platform, disclosure
characters/*.json     one character sheet per cast member (the consistency lock)
episodes/epNNN.json   script + storyboard + dialogue for one episode
art/epNNN/pNNN.png    rendered panel art (AI output goes here)
assets/refs/          character reference sheets
assets/fonts/         lettering fonts (drop a comic font here)
promptpack/           generated prompt packs -- one per tool
output/epNNN/         assembled strip, tiles, manifest, preview, QC report
reviews/              QC reports you printed for a human pass
```

Commands:

```bash
python manhwa.py status                      # where the production stands
python manhwa.py prompts episodes/ep001.json --tool sdxl
python manhwa.py assemble episodes/ep001.json
python manhwa.py check episodes/ep001.json
python manhwa.py plan --episodes 8 --team small
```
"""


# --------------------------------------------------------------------------- #
# production planning (studio staggered pipeline)
# --------------------------------------------------------------------------- #
TEAM_PRESETS = {
    "solo":   {"label": "Solo (AI-assisted)",     "ep_per_week": 1.0, "lead_days": 4,  "stages": ["script", "storyboard", "art", "letter+qc"]},
    "two":    {"label": "Two people",             "ep_per_week": 1.0, "lead_days": 5,  "stages": ["script", "storyboard", "art", "letter+qc"]},
    "small":  {"label": "Small team (3-5)",       "ep_per_week": 1.0, "lead_days": 7,  "stages": ["script", "storyboard", "lineart+colour", "letter+qc"]},
    "studio": {"label": "Studio pipeline (6-12)", "ep_per_week": 1.0, "lead_days": 21, "stages": ["script", "storyboard", "lineart", "colour", "background", "vfx", "letter+qc"]},
}

STAGE_ORDER = ["script", "storyboard", "lineart", "colour", "background", "vfx", "letter+qc"]


def production_plan(episodes: int, team: str = "solo", start: date | None = None,
                    cadence: str = "weekly") -> list[dict]:
    """
    Studio logic: work is *staggered*, not sequential. Each week ships one
    finished episode while later episodes sit in earlier stages, so the
    pipeline always has 3-6 episodes in flight (see docs/01).
    """
    preset = TEAM_PRESETS.get(team, TEAM_PRESETS["solo"])
    stages = preset["stages"]
    start = start or date.today()
    # map each stage to a week offset: stage i of episode n starts at week (n - 1 + i*(lead/len))
    span = max(1, len(stages))
    weeks = max(episodes, 1) + span  # a couple of weeks of runway
    rows = []
    for w in range(weeks):
        row = {"week": w + 1, "date": (start + timedelta(weeks=w)).isoformat(), "stages": []}
        for ep in range(1, episodes + 1):
            for i, st in enumerate(stages):
                start_week = (ep - 1) + i * (preset["lead_days"] / 7.0) / span * span / max(1.0, len(stages) / 2)
                start_week = (ep - 1) + i * (preset["lead_days"] / 7.0) / 2
                end_week = start_week + max(1.0, preset["lead_days"] / 7.0 / 2)
                if start_week <= w < end_week:
                    row["stages"].append({"episode": ep, "stage": st})
        row["ships"] = None
        if cadence == "weekly" and w >= span:
            shipped = w - span + 1
            if shipped <= episodes:
                row["ships"] = shipped
        rows.append(row)
    return rows
