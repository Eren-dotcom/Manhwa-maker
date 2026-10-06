"""
Project data model: series.json / characters/*.json / episodes/*.json + the
approval ledger.

File-driven on purpose: every artefact is plain JSON + PNG on disk, so a human, a
script or an LLM agent can read and edit any stage without a database.
"""
from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path

from .specs import (DEFAULT_GEOMETRY, DENSITY_TIERS, MASTER_WIDTH, PACING_GAPS,
                    resolve_platform)

PROJECT_DIRS = [
    "refined", "characters", "episodes", "art", "output", "promptpack", "reviews",
    "reference_art", "reference_sheets", "assets/fonts", "assets/refs", "assets/loras",
    "your_files", "docs",
]


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
    p = start.resolve()
    if p.is_file():
        p = p.parent
    for cand in [p, *p.parents]:
        if (cand / "series.json").exists():
            return cand
    return p


# --------------------------------------------------------------------------- #
class Project:
    def __init__(self, root: Path):
        self.root = Path(root)
        self.series = load_json(self.root / "series.json")
        self.platform = resolve_platform(self.series.get("platform", "webtoons"))
        self.geometry = {**DEFAULT_GEOMETRY, **self.series.get("geometry", {})}
        self.geometry["width"] = self.geometry.get("width") or MASTER_WIDTH
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
        found = sorted(self.ep_dir.glob("*.json"))
        return found

    def episode(self, ref) -> tuple[Path, dict]:
        ref = str(ref)
        candidates = []
        m = None
        import re
        m = re.fullmatch(r"(?:ep|ch|chapter)?0*(\d+)", ref, re.I)
        if m:
            n = int(m.group(1))
            candidates = [self.ep_dir / f"ep{n:03d}.json", self.ep_dir / f"ch{n:03d}.json",
                          self.ep_dir / f"ep{n}.json"]
        else:
            candidates = [Path(ref), self.ep_dir / f"{ref}.json"]
        for c in candidates:
            if c.exists():
                return c, load_json(c)
        raise FileNotFoundError(f"episode not found: {ref}")

    def panel_image_path(self, ep_no: int, panel_id: str, image: str | None) -> Path | None:
        if image:
            cand = self.root / image
            if cand.exists():
                return cand
        for base in (self.root / "art" / f"ep{int(ep_no):03d}",
                     self.root / f"ch{int(ep_no):03d}" / "panels"):
            for ext in (".png", ".jpg", ".jpeg", ".webp"):
                cand = base / f"{panel_id}{ext}"
                if cand.exists():
                    return cand
        return None

    # -- approval ledger -------------------------------------------------- #
    @property
    def approvals_path(self) -> Path:
        return self.root / "approvals.json"

    def approvals(self) -> dict:
        return load_json(self.approvals_path) if self.approvals_path.exists() else {"approved": []}

    def is_approved(self, kind: str, ident: str) -> bool:
        return f"{kind}:{ident}" in (self.approvals().get("approved") or [])

    def approve(self, kind: str, ident: str, note: str = "") -> dict:
        data = self.approvals()
        key = f"{kind}:{ident}"
        entries = data.setdefault("entries", {})
        if key not in (data.get("approved") or []):
            data.setdefault("approved", []).append(key)
        entries[key] = {"note": note, "at": date.today().isoformat()}
        save_json(self.approvals_path, data)
        return data


# --------------------------------------------------------------------------- #
# init / scaffold
# --------------------------------------------------------------------------- #
def scaffold(root: Path, title: str, platform: str = "webtoons", language: str = "en",
             density: str = "standard") -> Path:
    root = Path(root)
    for d in PROJECT_DIRS:
        (root / d).mkdir(parents=True, exist_ok=True)
    (root / "ch001" / "panels").mkdir(parents=True, exist_ok=True)
    (root / "ch001" / "lettered").mkdir(parents=True, exist_ok=True)
    if not (root / "series.json").exists():
        save_json(root / "series.json", series_template(title, platform, language, density))
    (root / "PROJECT.md").write_text(project_md(title), encoding="utf-8")
    return root


def series_template(title: str, platform: str = "webtoons", language: str = "en",
                    density: str = "standard") -> dict:
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
        "density": density in DENSITY_TIERS and density or "standard",
        "target_panels_per_episode": DENSITY_TIERS.get(density, DENSITY_TIERS["standard"])["panels"],
        "craft_rules": [
            "(paste the rules you extracted from the named reference chapter here -- "
            "they are printed in every QC report)",
        ],
        "art_direction": {
            "style_block": (
                "Korean webtoon manhwa illustration, clean confident ink line art, soft cel shading "
                "with painterly backgrounds, cinematic colour grading, dramatic rim lighting, "
                "highly detailed, vertical-scroll composition, full colour"
            ),
            "negative_block": (
                "text, letters, words, speech bubble, caption box, watermark, signature, logo, ui elements, "
                "extra fingers, extra limbs, fused fingers, deformed hands, bad anatomy, bad proportions, "
                "blurry, lowres, jpeg artifacts, character sheet, multiple views, split panel, manga page"
            ),
            "palette": {"key": "#2b3a55", "accent": "#e8b04b", "shadow": "#141a26", "highlight": "#f2e9d8"},
            "grading_note": "Cool shadows, warm practical lights. Keep skin tones constant across panels.",
        },
        # palette shifts mark scenes: each location / time gets its own grade
        "scenes": {
            "default": {"tint": None, "strength": 0.0, "shadow": None,
                        "note": "add one entry per location or time period"},
        },
        # effect languages stay distinct per faction -- never mix them
        "effect_languages": {
            "protagonist": {"color": "#cfe9ff", "shape": "outward pale-blue arcs",
                            "note": "outward, pale blue"},
            "antagonist": {"color": "#3a2f7a", "shape": "inward indigo-black voids",
                           "note": "inward, indigo-black"},
        },
        "geometry": dict(DEFAULT_GEOMETRY, width=MASTER_WIDTH, side_margin=0,
                         top_margin=60, bottom_margin=120),
        "lettering": {
            "base_font_size": 40,               # the reference figure, at the 1080 master
            "font_regular": None,
            "font_bold": None,
            "font_condensed": None,
            "font_brush": None,
            "caps": False,
            "max_words_per_bubble": 20,         # reference spec: 20 max, 1-2 lines
            "bubble_max_width_ratio": 0.72,     # ~780px wrap at 1080
            "voices": {},                       # override VOICES if needed
        },
        "title_card": {"enabled": True, "art": None, "title": None, "subtitle": None},
        "ai_disclosure": (
            "AI-assisted production. Story, character design, panel direction and lettering by "
            "<your name>; panel artwork generated with <models/tools> and retouched by hand."
        ),
        "characters": [],
        "arcs": [
            {"name": "Arc 1 - title", "episodes": "1-8",
             "beats": ["engine", "introduction", "past life", "reversal", "midpoint", "climax",
                       "end question"]},
        ],
    }


def character_template(cid: str, name: str, role: str = "support") -> dict:
    return {
        "id": cid,
        "name": name,
        "role": role,                       # lead | support | antagonist | minor
        "faction": "protagonist",
        "age": "",
        # ---- written sheet: everything the artist needs, in one place ----- #
        "one_line": "Who they are in one line.",
        "want": "What they chase.",
        "flaw": "What breaks them.",
        "build": "Tall, narrow shoulders, heavy boots.",
        "face": "Sharp narrow eyes, high cheekbones, a habit of looking off-centre.",
        "costume": "Grey rain jacket, collar up; black high-neck top; satchel strap.",
        "identifying_props": ["silver dog-tag necklace", "the brow scar"],
        "acting_rules": "Never smiles with her eyes. Looks away before she answers.",
        "effect_language": "outward pale-blue arcs (protagonist register)",
        "injury_continuity": "None yet. If she takes a wound, fix the side and keep it.",
        "dos": ["keep the fringe blunt", "collar up outdoors, down indoors"],
        "donts": ["never change hair length", "never remove the brow scar"],
        # ---- generation --------------------------------------------------- #
        "prompt_block": (
            "1girl, long black hair in a low ponytail, sharp dark eyes, small scar on left brow, "
            "grey rain jacket with the collar up, black high-neck top, always slightly damp"
        ),
        "lora": {"file": None, "token": None, "weight": 0.85},
        "seed": 48151623,
        "ref_images": ["assets/refs/PLACEHOLDER_sheet.png", "assets/refs/PLACEHOLDER_faces.png"],
        "portrait": "assets/refs/PLACEHOLDER_portrait.png",
        "palette": {"hair": "#141414", "skin": "#e6c3a5", "outfit": "#4a5561", "accent": "#2fb6a8"},
        "wardrobe": {
            "default": "grey rain jacket, collar up, black high-neck top",
            "indoor": "black high-neck top, silver dog-tag necklace",
        },
        "expressions": ["neutral", "wary", "angry", "hollow", "small smile"],
        "consistency_notes": "Never change hair length, never remove the brow scar, keep the collar up.",
    }


def episode_template(no: int, title: str, panels: list[dict] | None = None,
                     density: str = "standard") -> dict:
    return {
        "episode": no,
        "title": title,
        "arc": "Arc 1",
        "chapter_idea": "The one visual idea this chapter states in its first 3-5 panels.",
        "logline": "What changes for the reader by the end of this chapter?",
        "introduces": "Who is introduced or re-introduced here, and how (hero shot?).",
        "past_life_beat": "The memory fragment / enemy sigil / marked blade in this chapter.",
        "end_question": "The question the final panel forces the reader to scroll for.",
        "panel_budget": DENSITY_TIERS.get(density, DENSITY_TIERS["standard"])["panels"],
        "scroll_target_screens": 8,
        "language": "en",
        "status": "scripted",   # scripted | refined | storyboarded | art | lettered | published
        "panels": panels or [panel_template("p001")],
        "end_note": "Next chapter in the series.",
        "ai_disclosure": None,
    }


def panel_template(pid: str, shot: str = "medium", beat: str = "setup") -> dict:
    return {
        "id": pid,
        "shot": shot,
        "beat": beat,
        "pace": "normal",        # fast | normal | dramatic | transition | silence | white_out | black_out
        "height": None,          # None => derived from the art's aspect ratio
        "bleed": False,
        "fit": "crop",           # crop | contain | width
        "crop_bias": "center",   # center | top | bottom
        "image": None,
        "scene": None,           # key into series.scenes -> palette shift
        "tint": None,            # per-panel override of the scene tint
        "fill": None,            # "#ffffff" / "#000000" for white-out / black-out beats
        "fx": [],                # speed_radial | speed_horizontal | speed_rage | smear | flash | tremble
        "fx_faction": None,      # effect language tag (never mix factions in one scene)
        "characters": [],
        "outfit": {},
        "action": "What is happening in this panel.",
        "focus_guard": ["face", "hands"],   # what the balloon must never cover
        "technique": None,       # for technique panels: {name, step, note}
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
        "style": style,          # speech|shout|thought|whisper|narration|dark|urgent|recognition|
                                 # symbol|hesitant|continuing|system|radio|technique|prop|sfx
        "voice": None,           # clean_bold | condensed_block | hand_brushed
        "anchor": anchor,        # auto | top-left | ... | @0.5,0.25 | border | gutter
        "anchor_lock": False,
        "place": None,           # None | gutter | border
        "tail": "auto",          # auto | up | down | left | right | none
        "tail_to": None,         # {"x":0.5,"y":0.8} panel fractions
        "size_scale": 1.0,
        "rotation": 0.0,         # sfx / prop
        "shake": False,          # hand-brushed shake
        "blur": 0.0,             # motion-blur ghosts
        "fx": "neutral",         # sfx colour code: violence|cold|mystery|impact|neutral
        "prop_rect": None,       # {"x":..,"y":..,"w":..,"h":..} for style: prop
    }


def project_md(title: str) -> str:
    return f"""# {title} -- production project

```
series.json            the bible: style block, palette, scenes, effect languages, craft rules
refined/               canonical script + refine report + CHANGES.md
characters/*.json      written sheets + prompt blocks (the consistency lock)
episodes/epNNN.json    the panel sheet for one chapter
reference_art/         individual portraits
reference_sheets/      labelled faction group sheets
art/epNNN/pNNN.png     raw panel art (also copied to chNNN/panels/)
chNNN/panels/          raw panels      chNNN/lettered/  lettered panels
chNNN/contact-sheet.png · match-check-<char>.png · lettering-qc.png   (the QC gates)
promptpack/            per-tool prompt packs + queue.json + comfy runner
output/epNNN/          strip-master · strip-web · upload/ · delivery/ · manifest
your_files/            deliverables (<series>-chNNN.pdf)
```

## Commands

```bash
python manhwa.py status                                  # where the production stands
python manhwa.py refine 1 [--source script.md] [--pad]   # the no-slop / structure pass
python manhwa.py prompts 1 --tool sdxl                   # character sheets first, then panels
python manhwa.py approve cast 1 --note "sheets look right"
python manhwa.py assemble 1                              # master + web + tiles + PDF
python manhwa.py check 1 --final                         # numeric QC gates
python manhwa.py sheets 1                                # contact sheet + match-check + lettering QC
python manhwa.py restage p009 --as silhouette            # when a generation is refused
python manhwa.py plan --episodes 12 --team solo
```
"""


# --------------------------------------------------------------------------- #
# production planning (studio staggered pipeline)
# --------------------------------------------------------------------------- #
TEAM_PRESETS = {
    "solo":   {"label": "Solo (AI-assisted)",     "ep_per_week": 1.0, "lead_days": 4,
               "stages": ["script", "sheets", "art", "letter+qc"]},
    "two":    {"label": "Two people",             "ep_per_week": 1.0, "lead_days": 5,
               "stages": ["script", "sheets", "art", "letter+qc"]},
    "small":  {"label": "Small team (3-5)",       "ep_per_week": 1.0, "lead_days": 7,
               "stages": ["script", "sheets", "art", "letter+qc"]},
    "studio": {"label": "Studio pipeline (6-12)", "ep_per_week": 1.0, "lead_days": 21,
               "stages": ["script", "storyboard", "lineart", "colour", "background", "vfx", "letter+qc"]},
}

STAGE_ORDER = ["script", "sheets", "storyboard", "lineart", "colour", "background", "vfx", "letter+qc"]


def production_plan(episodes: int, team: str = "solo", start: date | None = None,
                    cadence: str = "weekly") -> list[dict]:
    preset = TEAM_PRESETS.get(team, TEAM_PRESETS["solo"])
    stages = preset["stages"]
    start = start or date.today()
    span = max(1, len(stages))
    weeks = max(episodes, 1) + span
    rows = []
    for w in range(weeks):
        row = {"week": w + 1, "date": (start + timedelta(weeks=w)).isoformat(), "stages": []}
        for ep in range(1, episodes + 1):
            for i, st in enumerate(stages):
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

def strip_path(out_dir):
    """The current master strip in an output dir.

    The master can be written as .png or .jpg (assemble --format). Resolve it from the
    manifest rather than guessing a filename: after a format change a stale file of the
    other extension sits next to the new one, and every gate that hardcodes a name ends
    up validating the stale image.
    """
    import json as _json
    from pathlib import Path as _Path
    out_dir = _Path(out_dir)
    man = out_dir / "manifest.json"
    if man.exists():
        try:
            name = _json.loads(man.read_text()).get("strip_file")
            if name and (out_dir / name).exists():
                return out_dir / name
        except Exception:
            pass
    cands = [c for c in (out_dir / "strip-master.png", out_dir / "strip-master.jpg") if c.exists()]
    return max(cands, key=lambda c: c.stat().st_mtime) if cands else None

