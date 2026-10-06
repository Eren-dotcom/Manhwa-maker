"""
Prompt pack generator.

One panel, six tools, six dialects. Built once from the story data, then rendered
per tool:
  sdxl/illustrious  booru tags + <lora:...> + negative prompt
  flux/qwen         natural-language paragraph
  midjourney        prose + --ar/--cref flags
  gemini/chatgpt    instruction aimed at a reference image
  generic           neutral text

Also generates the reference-sheet set the reference spec requires: turnaround,
expression, portrait, and a labelled faction group sheet per faction — all of them
BEFORE any panel is generated.
"""
from __future__ import annotations

import csv
import hashlib
import json
import os
from pathlib import Path

from .project import Project, save_json
from .specs import MASTER_WIDTH, SHOT_PRESETS

TOOLS = ["sdxl", "illustrious", "flux", "qwen", "midjourney", "gemini", "chatgpt", "generic"]

QUALITY_TAGS = "masterpiece, best quality, very aesthetic, absurdres, newest"

BEAT_LIGHT = {
    "engine": "bold graphic lighting, high contrast, the chapter's key image",
    "introduction": "dramatic rim light, subject isolated from the background",
    "hero_shot": "backlit, blown-out background, strong rim light, low angle",
    "past_life": "desaturated hazy memory light, soft vignette, flat contrast",
    "villain": "cold hard light from below, deep shadow, one hot accent",
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
def gen_size(panel_w: int, panel_h: int, budget: float = 1_150_000, multiple: int = 64,
             lo: int = 768, hi: int = 1536) -> tuple[int, int]:
    """Model-friendly size (multiple of 64, ~budget px) matching the panel's ratio."""
    if panel_w <= 0 or panel_h <= 0:
        return 1024, 1024
    ar = panel_w / panel_h

    def snap(v, mult):
        return max(mult, int(round(v / mult)) * mult)

    best = None
    for w in range(lo, hi + 1, multiple):
        h = snap(w / ar, multiple)
        if h < multiple:
            continue
        if h <= hi + multiple:
            score = abs(w * h - budget)
            if best is None or score < best[0]:
                best = (score, w, h)
    if best:
        return best[1], best[2]
    h = min(hi, max(lo, snap((budget / max(ar, 0.01)) ** 0.5, multiple)))
    w = min(hi, max(lo, snap(h * ar, multiple)))
    return w, h


def panel_seed(character_token: str, panel_id: str, salt: str = "") -> int:
    h = hashlib.sha256(f"{character_token}|{panel_id}|{salt}".encode()).hexdigest()
    return int(h[:8], 16)


def _ar_phrase(ar: float) -> str:
    for label, val in (("16:9", 16 / 9), ("2:1", 2.0), ("3:2", 1.5), ("4:3", 4 / 3),
                       ("1:1", 1.0), ("4:5", 0.8), ("3:4", 0.75), ("2:3", 2 / 3),
                       ("1:2", 0.5), ("1:3", 1 / 3)):
        if abs(ar - val) < 0.04:
            return label
    if ar > 1.0:
        return f"{ar:.1f}:1"
    return f"1:{1/ar:.1f}"


# --------------------------------------------------------------------------- #
# prompt building
# --------------------------------------------------------------------------- #
def character_clause(char: dict, outfit: str | None = None) -> str:
    base = (char.get("prompt_block") or "").strip()
    if outfit and char.get("wardrobe", {}).get(outfit):
        return f"{base}, wearing {char['wardrobe'][outfit]}"
    return base


def _composition_note(panel: dict, shot: dict) -> str:
    """Empty space for balloons: upper thirds, clean skies -- never over key detail."""
    dlgs = [d for d in (panel.get("dialogue") or []) if str(d.get("text", "")).strip()]
    if not dlgs:
        return ""
    guard = [str(g).lower() for g in (panel.get("focus_guard") or [])]
    if any(str(d.get("place", "")).lower() in ("gutter", "gutter_after") for d in dlgs):
        return ("leave the lower edge of the composition clean and uncluttered -- a balloon will sit "
                "in the gutter below it")
    anchors = [d.get("anchor", "auto") for d in dlgs if d.get("style", "speech") != "sfx"]
    anchor = next((a for a in anchors if a and a not in ("auto", "none", "gutter")), None)
    where = anchor.replace("-", " ") if anchor else "upper third"
    if where in ("top center", "top left", "top right"):
        where = f"{where} of the frame"
    keep = (" Keep the following unobstructed and clearly readable: "
            + ", ".join(guard) + ".") if guard else ""
    return (f"compose clean empty space in the {where} for a speech balloon; "
            f"clean sky or negative space, never blocking the subject.{keep}")


def build_panel_prompt(project: Project, ep_no: int, panel: dict, chars: dict) -> dict:
    series = project.series
    ad = series.get("art_direction", {})
    style = ad.get("style_block", "")
    pid = panel.get("id", "p000")
    shot_key = panel.get("shot", "medium")
    shot = SHOT_PRESETS.get(shot_key, SHOT_PRESETS["medium"])
    present = [c for c in (panel.get("characters") or []) if c in chars]
    outfits = panel.get("outfit") or {}

    char_clauses = [character_clause(chars[c], outfits.get(c)) for c in present]
    tokens = [chars[c].get("lora", {}).get("token") for c in present if chars[c].get("lora", {}).get("token")]
    loras = [{"file": chars[c]["lora"].get("file"), "weight": chars[c]["lora"].get("weight", 0.85),
              "token": chars[c]["lora"].get("token")}
             for c in present if chars[c].get("lora", {}).get("file")]

    composition = _composition_note(panel, shot)
    beat = panel.get("beat", "setup")
    lighting = BEAT_LIGHT.get(beat, "")

    # presentation rules per the reference spec
    presentation = ""
    if beat in ("introduction", "hero_shot"):
        presentation = ("hero presentation: backlit low angle, rim light outlining the silhouette, "
                        "standing tall, cloak or coat moving")
    elif panel.get("mystery") or shot_key == "silhouette":
        presentation = "mystery figure: face hidden in shadow, rim light only, identity withheld"

    # target geometry: the panel as it sits on the master strip
    side = 0 if panel.get("bleed") else int(project.geometry.get("side_margin", 0) * MASTER_WIDTH / 800.0)
    content_w = int(project.geometry.get("width", MASTER_WIDTH)) - 2 * side
    if panel.get("height"):
        rect_ar = content_w / float(panel["height"])
        tw, th = content_w, int(panel["height"])
    else:
        rect_ar = float(shot.get("ar", 0.92))
        tw = content_w
        th = max(160, int(round(content_w / rect_ar)))
    gw, gh = gen_size(tw, th)

    action = (panel.get("action") or "").strip()
    tech = panel.get("technique") or {}
    tech_note = ""
    if tech:
        tech_note = (f"technique beat: {tech.get('name','')} ({tech.get('step','')}) "
                     f"{tech.get('note','')}").strip()

    tag_parts = [style, *char_clauses, shot["prompt"], presentation, action, tech_note,
                 lighting, composition]
    tag_prompt = ", ".join(p.strip().strip(",") for p in tag_parts if p and str(p).strip())

    nl_parts = [f"{style}." if style else ""]
    if char_clauses:
        nl_parts.append("Cast: " + "; ".join(char_clauses) + ".")
    nl_parts.append(f"Camera: {shot['prompt']}.")
    if presentation:
        nl_parts.append(f"Presentation: {presentation}.")
    if action:
        nl_parts.append(f"Scene: {action}.")
    if tech_note:
        nl_parts.append(f"Beat: {tech_note}.")
    if lighting:
        nl_parts.append(f"Lighting: {lighting}.")
    if composition:
        nl_parts.append(f"Composition: {composition}.")
    nl_parts.append("No text, no words, no letters, no speech balloons, no captions, no watermark.")
    nl_prompt = " ".join(p for p in nl_parts if p)

    negative = ad.get("negative_block", "")
    if panel.get("negative_override"):
        negative = (negative + ", " + panel["negative_override"]).strip(", ")

    fx_note = ""
    if panel.get("fx"):
        names = [f if isinstance(f, str) else f.get("type") for f in panel["fx"]]
        fx_note = ("do not draw speed lines, motion smears or impact flashes -- those are composited "
                   f"afterwards ({', '.join(str(n) for n in names if n)})")

    return {
        "kind": "panel",
        "episode": ep_no,
        "id": pid,
        "shot": shot_key,
        "beat": beat,
        "band": shot.get("band"),
        "seed": panel_seed(",".join(tokens) or "nochar", pid, series.get("title", "")),
        "target_panel_px": [tw, th],
        "gen_px": [gw, gh],
        "aspect": _ar_phrase(tw / th),
        "characters": present,
        "loras": loras,
        "prompt_tags": tag_prompt,
        "prompt_nl": nl_prompt,
        "negative": negative,
        "composition": composition,
        "focus_guard": panel.get("focus_guard") or [],
        "fx_note": fx_note,
        "action": action,
        "dialogue": [d.get("text", "") for d in (panel.get("dialogue") or [])],
        "out_file": f"art/ep{ep_no:03d}/{pid}.png",
        "notes": panel.get("notes", ""),
    }


# --------------------------------------------------------------------------- #
# reference sheets (before any panel)
# --------------------------------------------------------------------------- #
SHEET_KINDS = [
    ("sheet", "turnaround", "character reference sheet, front view, three-quarter view, side view, "
                            "back view, same character in every view, identical outfit, full body, "
                            "plain light background, no text labels",
     "The single most valuable image in the production. Lock it, version it, never regenerate casually."),
    ("faces", "expression", "expression sheet, six head-and-shoulders studies of the same face: "
                            "neutral, wary, angry, sorrowful, small smile, wide-eyed shock, "
                            "plain light background",
     "Feed this back as a reference for every emotional close-up."),
    ("portrait", "portrait", "single chest-up character portrait, three-quarter view, neutral "
                             "expression, plain background, clean line art",
     "The likeness card: this is what every match-check sheet compares panels against."),
]


def build_character_sheets(project: Project, char: dict, ep_no: int = 1) -> list[dict]:
    ad = project.series.get("art_direction", {})
    style = ad.get("style_block", "")
    cid = char.get("id")
    base = character_clause(char)
    neg = ad.get("negative_block", "")
    out = []
    for tag, kind, extra, note in SHEET_KINDS:
        out.append({
            "kind": "sheet", "sheet": kind, "episode": ep_no, "id": f"{cid}_{tag}",
            "character": cid,
            "seed": int(char.get("seed", 12345)) + (0 if kind == "turnaround" else 7),
            "gen_px": [1024, 1536] if kind == "turnaround" else ([1536, 1024] if kind == "expression"
                                                                 else [1024, 1280]),
            "aspect": "2:3" if kind == "turnaround" else ("3:2" if kind == "expression" else "4:5"),
            "prompt_tags": f"{style}, {base}, {extra}",
            "prompt_nl": f"{style}. {base}. {extra}. Plain background, no text.",
            "negative": neg,
            "out_file": f"assets/refs/{cid}_{tag}.png",
            "notes": note,
        })
    return out


def build_faction_sheet(project: Project, faction: str, members: list[dict], ep_no: int = 1) -> dict:
    ad = project.series.get("art_direction", {})
    style = ad.get("style_block", "")
    langs = project.series.get("effect_languages", {})
    lang = langs.get(faction, {})
    clause = "; ".join(f"{m.get('name', m.get('id'))}: {character_clause(m)}" for m in members)
    return {
        "kind": "sheet", "sheet": "faction", "episode": ep_no, "id": f"faction_{faction}",
        "character": None, "faction": faction, "members": [m.get("id") for m in members],
        "seed": 5150, "gen_px": [1536, 1024], "aspect": "3:2",
        "prompt_tags": (f"{style}, labelled faction group sheet, lineup of {len(members)} standing "
                        f"characters in a row, full body, consistent style and lighting, plain "
                        f"background, faction palette {lang.get('color','')}, {clause}"),
        "prompt_nl": (f"{style}. Faction group sheet: a lineup of {len(members)} full-body characters "
                      f"standing in a row against a plain background, consistent lighting and palette. "
                      f"Effect language for this faction: {lang.get('shape','')}. "
                      f"{clause} No text, no labels."),
        "negative": ad.get("negative_block", ""),
        "out_file": f"reference_sheets/{faction}_sheet.png",
        "notes": "The faction sheet fixes relative scale, silhouette and shared palette in one image.",
    }


def build_cover(project: Project, chars: dict, ep_no: int = 1) -> dict:
    ad = project.series.get("art_direction", {})
    style = ad.get("style_block", "")
    leads = [c for c in chars.values() if c.get("role") == "lead"][:2] or list(chars.values())[:1]
    clause = " and ".join(character_clause(c) for c in leads)
    return {
        "kind": "cover", "episode": ep_no, "id": "cover",
        "gen_px": [1080, 1350], "aspect": "4:5", "seed": 90210,
        "prompt_tags": (f"{style}, key visual cover art, {clause}, dramatic composition, "
                        "space at the top for the title, cinematic, high detail"),
        "prompt_nl": (f"{style}. Key visual cover illustration: {clause}. Dramatic cinematic composition "
                      "with empty space at the top for a title. No text, no letters, no logo."),
        "negative": ad.get("negative_block", ""),
        "out_file": f"assets/refs/cover_ep{ep_no:03d}.png",
        "notes": "Platform thumbnails: 1080x1080 square (<500KB) and 1080x1920 vertical (<700KB).",
    }


# --------------------------------------------------------------------------- #
# restaging a refused generation
# --------------------------------------------------------------------------- #
RESTAGE_KINDS = {
    "silhouette": ("backlit silhouette of the same subject, rim light only, face and detail unreadable, "
                   "distance, motion implied"),
    "aftermath": ("aftermath framing: the empty space where the action happened, scattered objects, "
                  "no figure in frame, consequence and mood only"),
    "detail": ("tight detail crop instead of the whole figure: hands, boots, a fallen object, "
               "shallow depth of field"),
    "environment": ("the location itself with no characters in frame, atmosphere and mood carrying "
                    "the beat"),
    "reaction": ("a bystander's reaction instead of the event: face and shoulders, watching, off-centre"),
}


def restage(project: Project, ep_no: int, ep_path: Path, ep: dict, panel_id: str,
            as_kind: str, save: bool = True) -> dict:
    """
    Rewrite a panel's prompt after a policy refusal -- a genuinely different shot,
    never a retry of the same request.
    """
    if as_kind not in RESTAGE_KINDS:
        raise KeyError(f"unknown restage kind {as_kind!r}; pick {sorted(RESTAGE_KINDS)}")
    panels = ep.get("panels", [])
    target = next((p for p in panels if p.get("id") == panel_id), None)
    if target is None:
        raise KeyError(f"panel {panel_id} not found in episode {ep_no}")
    original = dict(target)
    target["shot"] = {"silhouette": "silhouette", "aftermath": "environment",
                      "detail": "detail_prop", "environment": "environment",
                      "reaction": "close"}[as_kind]
    target["action"] = RESTAGE_KINDS[as_kind]
    target["restaged_from"] = {"action": original.get("action"), "shot": original.get("shot"),
                              "reason": "generation refused on policy grounds"}
    target["prompt_override"] = (
        f"{project.series.get('art_direction', {}).get('style_block','')}, "
        f"{RESTAGE_KINDS[as_kind]}, no text, no letters, no watermark"
    )
    target["notes"] = (target.get("notes", "") + " | restaged from the original shot after a refusal; "
                                                  "never resend the original request").strip(" |")
    if save:
        save_json(ep_path, ep)
    return {"panel": panel_id, "restaged_as": as_kind, "new_shot": target["shot"],
            "note": "prompt rewritten, not retried -- regenerate from the prompt pack"}


# --------------------------------------------------------------------------- #
# rendering per tool
# --------------------------------------------------------------------------- #
def render_entry(entry: dict, tool: str, series: dict) -> str:
    if tool in ("sdxl", "illustrious", "comfy"):
        loras = " ".join(f"<lora:{Path(l['file']).stem}:{l['weight']}>"
                         for l in entry.get("loras") or [] if l.get("file"))
        toks = " ".join(l["token"] for l in entry.get("loras") or [] if l.get("token"))
        body = ", ".join(p for p in [toks, entry["prompt_tags"], loras] if p)
        return body
    if tool in ("flux", "qwen"):
        return entry["prompt_nl"]
    if tool == "midjourney":
        return (f"{entry['prompt_nl']} --ar {entry['aspect']} --style raw "
                f"--no text, speech bubble, watermark, signature")
    if tool in ("gemini", "chatgpt"):
        refs = entry.get("characters") or ([entry["character"]] if entry.get("character") else [])
        ref_line = (f"Use the attached reference images for {', '.join(refs)} and keep the face, hair "
                    f"and outfit identical to the references. " if refs else "")
        return (f"{ref_line}Draw one vertical webtoon panel. No text, no words, no letters, no speech "
                f"balloons, no captions. {entry['prompt_nl']}")
    return entry["prompt_nl"]


def build_pack(project: Project, ep_no: int, ep: dict, tool: str = "sdxl",
               include_sheets: bool = True, include_cover: bool = True,
               include_factions: bool = True) -> dict:
    chars = project.characters()
    entries: list[dict] = []
    if include_sheets:
        for cid, c in chars.items():
            if c.get("role") in ("lead", "antagonist", "support"):
                entries += build_character_sheets(project, c, ep_no)
    if include_factions:
        factions: dict[str, list[dict]] = {}
        for c in chars.values():
            factions.setdefault(c.get("faction") or "unassigned", []).append(c)
        for faction, members in factions.items():
            if len(members) > 1 or faction not in ("unassigned",):
                entries.append(build_faction_sheet(project, faction, members, ep_no))
    if include_cover:
        entries.append(build_cover(project, chars, ep_no))
    for p in ep.get("panels", []):
        entries.append(build_panel_prompt(project, ep_no, p, chars))

    for e in entries:
        e["rendered"] = render_entry(e, tool, project.series)

    out_dir = project.root / "promptpack"
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{tool}-ep{ep_no:03d}"

    md = [f"# Prompt pack - {project.series.get('title')} ch{ep_no:03d}", "",
          f"Tool adapter: **{tool}** · panel entries: **{len(ep.get('panels', []))}** · "
          f"total entries: **{len(entries)}**", "",
          "**Work order: sheets first, panels second.** Generate every reference sheet, get them",
          "approved (`manhwa.py approve character <id>:sheet`), then attach them to each panel job.", ""]
    if tool in ("sdxl", "illustrious", "comfy"):
        md += ["For ComfyUI: `comfy_batch.py` + `comfy_workflow_template.json` run the queue headlessly.",
               "Replace `%CHECKPOINT%` with your own model file.", ""]
    for e in entries:
        head = {"panel": f"### {e['id']} - {e.get('shot','')} / {e.get('beat','')}",
                "sheet": f"### {e['id']} (reference sheet - {e.get('sheet')}"
                         + (f" - {e.get('character')}" if e.get("character") else "") + ")",
                "cover": "### cover key visual"}[e["kind"]]
        md += [head, ""]
        if e["kind"] == "panel":
            md.append(f"- strip size **{e['target_panel_px'][0]}x{e['target_panel_px'][1]}** "
                      f"({e['aspect']}, band `{e.get('band')}`) -> generate at "
                      f"**{e['gen_px'][0]}x{e['gen_px'][1]}**")
        else:
            md.append(f"- generate at **{e['gen_px'][0]}x{e['gen_px'][1]}** ({e['aspect']})")
        md.append(f"- seed: `{e['seed']}`")
        if e.get("characters"):
            md.append(f"- cast: {', '.join(e['characters'])}")
        if e.get("loras"):
            md.append("- loras: " + ", ".join(f"`{Path(l['file']).name}`@{l['weight']}" for l in e["loras"]))
        if e.get("action"):
            md.append(f"- action: {e['action']}")
        if e.get("dialogue"):
            md.append("- dialogue in this panel: " + " / ".join(f'"{t}"' for t in e["dialogue"] if t))
        if e.get("composition"):
            md.append(f"- **{e['composition']}**")
        if e.get("fx_note"):
            md.append(f"- fx: {e['fx_note']}")
        if e.get("notes"):
            md.append(f"- note: {e['notes']}")
        md += ["", "```text", e["rendered"], "```", ""]
        if e.get("negative"):
            md += ["negative:", "", "```text", e["negative"], "```", ""]
        md += [f"save as: `{e['out_file']}`", ""]
    (out_dir / f"{stem}.md").write_text("\n".join(md), encoding="utf-8")

    with open(out_dir / f"{stem}.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["id", "kind", "sheet", "out_file", "width", "height", "seed", "prompt", "negative"])
        for e in entries:
            w.writerow([e["id"], e["kind"], e.get("sheet", ""), e["out_file"], e["gen_px"][0],
                        e["gen_px"][1], e["seed"], e["rendered"], e.get("negative", "")])

    queue = [{
        "id": e["id"], "kind": e["kind"], "sheet": e.get("sheet"),
        "out_file": e["out_file"], "width": e["gen_px"][0], "height": e["gen_px"][1],
        "seed": e["seed"], "prompt": e["rendered"], "negative": e.get("negative", ""),
        "loras": e.get("loras") or [], "refs": e.get("characters") or [],
    } for e in entries]
    save_json(out_dir / "queue.json", queue)
    save_json(out_dir / f"queue-{stem}.json", queue)

    result = {"tool": tool, "entries": len(entries), "panels": len(ep.get("panels", [])),
              "sheets": sum(1 for e in entries if e["kind"] == "sheet"),
              "files": [str((out_dir / f"{stem}.md").relative_to(project.root)),
                        str((out_dir / f"{stem}.csv").relative_to(project.root)),
                        str((out_dir / "queue.json").relative_to(project.root))]}
    if tool in ("sdxl", "illustrious", "comfy"):
        tpl = out_dir / "comfy_workflow_template.json"
        save_json(tpl, COMFY_TEMPLATE)
        _write_comfy_batch(out_dir / "comfy_batch.py")
        result["files"] += [str(tpl.relative_to(project.root)),
                            str((out_dir / "comfy_batch.py").relative_to(project.root))]
    return result


# --------------------------------------------------------------------------- #
# ComfyUI glue
# --------------------------------------------------------------------------- #
COMFY_TEMPLATE = {
    "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "%CHECKPOINT%"}},
    "10": {"class_type": "LoraLoader", "inputs": {
        "lora_name": "%LORA1%", "strength_model": "%LORA1_STRENGTH%", "strength_clip": "%LORA1_STRENGTH%",
        "model": ["4", 0], "clip": ["4", 1]}},
    "6": {"class_type": "CLIPTextEncode", "inputs": {"text": "%NEGATIVE%", "clip": ["10", 1]}},
    "7": {"class_type": "CLIPTextEncode", "inputs": {"text": "%PROMPT%", "clip": ["10", 1]}},
    "5": {"class_type": "EmptyLatentImage", "inputs": {"width": "%WIDTH%", "height": "%HEIGHT%", "batch_size": 1}},
    "3": {"class_type": "KSampler", "inputs": {
        "seed": "%SEED%", "steps": "%STEPS%", "cfg": "%CFG%",
        "sampler_name": "euler_ancestral", "scheduler": "normal", "denoise": 1.0,
        "model": ["10", 0], "positive": ["7", 0], "negative": ["6", 0], "latent_image": ["5", 0]}},
    "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
    "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "%OUTPUT_PREFIX%", "images": ["8", 0]}},
}

COMFY_BATCH = '''#!/usr/bin/env python3
"""
Run a promptpack/queue.json against a local ComfyUI instance.

  python comfy_batch.py --queue queue.json --out ../art/ep001 \\
      --checkpoint "illustriousXL_v10.safetensors" [--dry-run] [--only p003,p004] [--kind panel|sheet]

Fills the placeholder template (or your own exported API workflow, as long as it has
the same %TOKENS%), posts one job at a time to /prompt, waits on /history, and writes
the image to --out.
"""
from __future__ import annotations
import argparse, json, time, urllib.parse, urllib.request
from pathlib import Path


def post(server, path, payload):
    req = urllib.request.Request(f"http://{server}{path}",
                                 data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def get(server, path):
    with urllib.request.urlopen(f"http://{server}{path}", timeout=60) as r:
        return json.loads(r.read().decode())


def fill(obj, tokens):
    if isinstance(obj, dict):
        return {k: fill(v, tokens) for k, v in obj.items()}
    if isinstance(obj, list):
        return [fill(v, tokens) for v in obj]
    if isinstance(obj, str):
        if obj.startswith("%") and obj.endswith("%"):
            key = obj.strip("%")
            if key in tokens:
                return tokens[key]
        for k, v in tokens.items():
            obj = obj.replace(f"%{k}%", str(v))
        return obj
    return obj


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--queue", default="queue.json")
    ap.add_argument("--template", default="comfy_workflow_template.json")
    ap.add_argument("--out", required=True, help="folder for the rendered images")
    ap.add_argument("--checkpoint", required=True)
    ap.add_argument("--server", default="127.0.0.1:8188")
    ap.add_argument("--steps", type=int, default=28)
    ap.add_argument("--cfg", type=float, default=5.5)
    ap.add_argument("--only", default="", help="comma separated ids")
    ap.add_argument("--kind", default="panel", choices=["panel", "sheet", "cover", "all"])
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--sleep", type=float, default=0.2)
    a = ap.parse_args()

    queue = json.loads(Path(a.queue).read_text())
    template = json.loads(Path(a.template).read_text())
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    only = {s.strip() for s in a.only.split(",") if s.strip()}
    jobs = [j for j in queue
            if (a.kind == "all" or j.get("kind") == a.kind) and (not only or j["id"] in only)]
    print(f"{len(jobs)} job(s)")

    for j in jobs:
        lora = (j.get("loras") or [{}])[0]
        tokens = {
            "CHECKPOINT": a.checkpoint,
            "PROMPT": j["prompt"], "NEGATIVE": j.get("negative", ""),
            "WIDTH": j["width"], "HEIGHT": j["height"], "SEED": j["seed"],
            "STEPS": a.steps, "CFG": a.cfg,
            "LORA1": lora.get("file") or "None",
            "LORA1_STRENGTH": lora.get("weight", 0.85),
            "OUTPUT_PREFIX": f'manhwa/{j["id"]}',
        }
        graph = fill(template, tokens)
        if a.dry_run:
            (out / f'{j["id"]}.workflow.json').write_text(json.dumps(graph, indent=2))
            print(f'  [dry-run] wrote {j["id"]}.workflow.json')
            continue
        try:
            res = post(a.server, "/prompt", {"prompt": graph})
            pid = res.get("prompt_id")
            print(f'  queued {j["id"]} -> {pid}')
            hist = {}
            for _ in range(1200):
                hist = get(a.server, f"/history/{pid}")
                if pid in hist and hist[pid].get("outputs"):
                    break
                time.sleep(1)
            saved = False
            for node in hist.get(pid, {}).get("outputs", {}).values():
                for img in node.get("images", []):
                    q = urllib.parse.urlencode({"filename": img["filename"],
                                                "subfolder": img.get("subfolder", ""),
                                                "type": img.get("type", "output")})
                    with urllib.request.urlopen(f'http://{a.server}/view?{q}', timeout=120) as r:
                        data = r.read()
                    dest = out / f'{j["id"]}.png'
                    dest.write_bytes(data)
                    print(f'  saved {dest}')
                    saved = True
            if not saved:
                print(f'  !! no image returned for {j["id"]}')
        except Exception as e:  # noqa: BLE001
            print(f'  !! {j["id"]}: {e}')
        time.sleep(a.sleep)
    print("done")


if __name__ == "__main__":
    main()
'''


def _write_comfy_batch(path: Path) -> None:
    path.write_text(COMFY_BATCH, encoding="utf-8")
    try:
        os.chmod(path, 0o755)
    except Exception:
        pass
