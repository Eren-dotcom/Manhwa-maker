"""
Prompt pack generator.

The same panel means different things to different tools, so the pack is built
once from the story data and then *rendered* per tool:
  sdxl / illustrious  -> booru tags + <lora:...> + negative prompt
  flux / qwen         -> natural-language paragraph
  midjourney          -> prose + --ar --no --cref flags
  gemini / chatgpt    -> instruction aimed at a reference image
  generic             -> neutral text you can paste anywhere

Deterministic seeds per (character, panel) are emitted so re-rolls drift less.
See references/03-prompt-adapters.md.
"""
from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path

from .project import Project, save_json
from .specs import SHOT_PRESETS

TOOLS = ["sdxl", "illustrious", "flux", "qwen", "midjourney", "gemini", "chatgpt", "generic"]

QUALITY_TAGS = "masterpiece, best quality, very aesthetic, absurdres, newest"

# beat -> lighting / mood fragment (keeps the whole episode graded consistently)
BEAT_LIGHT = {
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
}


# --------------------------------------------------------------------------- #
# sizes & seeds
# --------------------------------------------------------------------------- #
def gen_size(panel_w: int, panel_h: int, budget: float = 1_150_000, multiple: int = 64,
             lo: int = 768, hi: int = 1536) -> tuple[int, int]:
    """Nearest model-friendly pixel size (multiple of 64, ~budget pixels) to the panel AR."""
    if panel_w <= 0 or panel_h <= 0:
        return 1024, 1024
    ar = panel_w / panel_h

    def snap(v, mult):
        return max(mult, int(round(v / mult)) * mult)

    # try w first, then h
    best = None
    for w in range(lo, hi + 1, multiple):
        h = snap(w / ar, multiple)
        if h < multiple:
            continue
        score = abs(w * h - budget)
        if h <= hi + multiple:
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
    for label, val in (("16:9", 16 / 9), ("3:2", 1.5), ("4:3", 4 / 3), ("1:1", 1.0),
                       ("3:4", 0.75), ("2:3", 2 / 3), ("9:16", 9 / 16)):
        if abs(ar - val) < 0.06:
            return label
    if ar > 1.9:
        return f"{ar:.1f}:1"
    if ar > 1.25:
        return "3:2"
    if ar > 1.05:
        return "4:3"
    return "1:1"


# --------------------------------------------------------------------------- #
# prompt building
# --------------------------------------------------------------------------- #
def character_clause(char: dict, outfit: str | None = None) -> str:
    base = (char.get("prompt_block") or "").strip()
    if outfit and char.get("wardrobe", {}).get(outfit):
        return f"{base}, wearing {char['wardrobe'][outfit]}"
    return base


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

    bubble_note = ""
    dlgs = panel.get("dialogue") or []
    if dlgs:
        anchors = [d.get("anchor", "auto") for d in dlgs if d.get("style", "speech") != "sfx"]
        anchor = next((a for a in anchors if a and a not in ("auto", "none")), None) or shot.get("bubble", "top-left")
        if anchor and anchor != "none":
            bubble_note = f"leave clean negative space in the {anchor.replace('-', ' ')} area for a speech bubble"

    beat = panel.get("beat", "setup")
    lighting = BEAT_LIGHT.get(beat, "")

    # size target: the panel's on-strip aspect
    pw = (panel.get("height") and panel["height"] * 1.0) or None
    if panel.get("height"):
        rect_ar = 720 / float(panel["height"])
    else:
        rect_ar = float(shot.get("ar", 1.3))
    tw = 720
    th = max(160, int(round(tw / rect_ar)))
    gw, gh = gen_size(tw, th)

    action = (panel.get("action") or "").strip()
    parts_tags = [p for p in [QUALITY_TAGS if False else "", style] if p]
    tag_parts = [style, *char_clauses, shot["prompt"], action, lighting, bubble_note]
    tag_prompt = ", ".join(p.strip().strip(",") for p in tag_parts if p and p.strip())

    nl_parts = [f"{style}." if style else ""]
    if char_clauses:
        nl_parts.append("Cast: " + "; ".join(char_clauses) + ".")
    nl_parts.append(f"Camera: {shot['prompt']}.")
    if action:
        nl_parts.append(f"Scene: {action}.")
    if lighting:
        nl_parts.append(f"Lighting: {lighting}.")
    if bubble_note:
        nl_parts.append(f"Composition: {bubble_note}.")
    nl_parts.append("No text, no letters, no speech bubbles, no watermark.")
    nl_prompt = " ".join(p for p in nl_parts if p)

    negative = ad.get("negative_block", "") + ", " + panel.get("negative_override", "") if panel.get("negative_override") else ad.get("negative_block", "")

    return {
        "kind": "panel",
        "episode": ep_no,
        "id": pid,
        "shot": shot_key,
        "beat": beat,
        "seed": panel_seed(",".join(tokens) or "nochar", pid, series.get("title", "")),
        "target_panel_px": [tw, th],
        "gen_px": [gw, gh],
        "aspect": _ar_phrase(tw / th),
        "characters": present,
        "loras": loras,
        "prompt_tags": tag_prompt,
        "prompt_nl": nl_prompt,
        "negative": negative,
        "bubble_space": bubble_note,
        "action": action,
        "dialogue": [d.get("text", "") for d in dlgs],
        "out_file": f"art/ep{ep_no:03d}/{pid}.png",
        "notes": panel.get("notes", ""),
    }


def build_character_sheet(project: Project, char: dict, ep_no: int = 1) -> list[dict]:
    ad = project.series.get("art_direction", {})
    style = ad.get("style_block", "")
    cid = char.get("id")
    base = character_clause(char)
    neg = ad.get("negative_block", "")
    out = []
    for pid, extra, note in (
        ("sheet", "character reference sheet, front view, three-quarter view, side view, back view, "
                  "same character in every view, identical outfit, full body, plain light background, "
                  "no text labels",
         "The single most valuable image you will generate. Lock it, version it, never regenerate it casually."),
        ("faces", "expression sheet, six head-and-shoulders studies of the same face: neutral, wary, "
                  "angry, sorrowful, small smile, wide-eyed shock, plain light background",
         "Feed this to the model as a reference every time an emotional panel comes up."),
    ):
        out.append({
            "kind": "sheet", "episode": ep_no, "id": f"{cid}_{pid}", "character": cid,
            "seed": int(char.get("seed", 12345)), "gen_px": [1024, 1536] if pid == "sheet" else [1536, 1024],
            "aspect": "2:3" if pid == "sheet" else "3:2",
            "prompt_tags": f"{style}, {base}, {extra}",
            "prompt_nl": f"{style}. {base}. {extra}. Plain background, no text.",
            "negative": neg,
            "out_file": f"assets/refs/{cid}_{pid}.png",
            "notes": note,
        })
    return out


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
        "notes": "Platform thumbnails: 1080x1080 square and 1080x1920 vertical (under 500KB / 700KB).",
    }


# --------------------------------------------------------------------------- #
# rendering per tool
# --------------------------------------------------------------------------- #
def render_entry(entry: dict, tool: str, series: dict) -> str:
    kind = entry["kind"]
    if tool in ("sdxl", "illustrious", "comfy"):
        loras = " ".join(f"<lora:{Path(l['file']).stem}:{l['weight']}>" for l in entry.get("loras") or [] if l.get("file"))
        toks = " ".join(l["token"] for l in entry.get("loras") or [] if l.get("token"))
        body = ", ".join(p for p in [(", ".join([t for t in [toks] if t])), entry["prompt_tags"], loras] if p)
        return body
    if tool in ("flux", "qwen"):
        return entry["prompt_nl"]
    if tool == "midjourney":
        flags = f"--ar {entry['aspect'].replace(':', ':')} --style raw --no text, speech bubble, watermark, signature"
        neg = entry.get("negative", "")
        return f"{entry['prompt_nl']} {flags}"
    if tool in ("gemini", "chatgpt"):
        refs = entry.get("characters") or ([entry["character"]] if entry.get("character") else [])
        ref_line = (f"Use the attached reference images for {', '.join(refs)} and keep the face, hair "
                    f"and outfit identical to the references. " if refs else "")
        return (f"{ref_line}Draw one vertical webtoon panel, no text and no speech bubbles. "
                f"{entry['prompt_nl']}")
    return entry["prompt_nl"]


def build_pack(project: Project, ep_no: int, ep: dict, tool: str = "sdxl",
               include_sheets: bool = True, include_cover: bool = True) -> dict:
    chars = project.characters()
    entries: list[dict] = []
    if include_sheets:
        for cid, c in chars.items():
            if c.get("role") in ("lead", "antagonist", "support"):
                entries += build_character_sheet(project, c, ep_no)
    if include_cover:
        entries.append(build_cover(project, chars, ep_no))
    for p in ep.get("panels", []):
        entries.append(build_panel_prompt(project, ep_no, p, chars))

    for e in entries:
        e["rendered"] = render_entry(e, tool, project.series)

    out_dir = project.root / "promptpack"
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{tool}-ep{ep_no:03d}"

    # ---- markdown ---- #
    md = [f"# Prompt pack - {project.series.get('title')} ep {ep_no:03d}",
          "",
          f"Tool adapter: **{tool}**  |  panels: **{len(ep.get('panels', []))}**  |  "
          f"entries: **{len(entries)}** (character sheets + cover + panels)",
          "",
          "Work order: generate the character sheets FIRST, approve them, then feed them back as",
          "references for every panel. Regenerating a sheet after 40 panels exist is a disaster.",
          ""]
    if tool in ("sdxl", "illustrious", "comfy"):
        md += ["For ComfyUI: `comfy_batch.py` + `comfy_workflow_template.json` in this folder run the",
               "whole queue headlessly. Replace `%CHECKPOINT%` with your own model file.", ""]
    for e in entries:
        head = {"panel": f"### {e['id']} - {e.get('shot','')} / {e.get('beat','')}",
                "sheet": f"### {e['id']} (character sheet - {e.get('character')})",
                "cover": "### cover key visual"}[e["kind"]]
        md += [head, ""]
        if e["kind"] == "panel":
            md.append(f"- strip size **{e['target_panel_px'][0]}x{e['target_panel_px'][1]}** "
                      f"({e['aspect']}) -> generate at **{e['gen_px'][0]}x{e['gen_px'][1]}**")
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
        if e.get("bubble_space"):
            md.append(f"- **{e['bubble_space']}**")
        if e.get("notes"):
            md.append(f"- note: {e['notes']}")
        md += ["", "```text", e["rendered"], "```", ""]
        if e.get("negative"):
            md += ["negative:", "", "```text", e["negative"], "```", ""]
        md += [f"save as: `{e['out_file']}`", ""]
    (out_dir / f"{stem}.md").write_text("\n".join(md), encoding="utf-8")

    # ---- csv ---- #
    with open(out_dir / f"{stem}.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["id", "kind", "out_file", "width", "height", "seed", "prompt", "negative"])
        for e in entries:
            w.writerow([e["id"], e["kind"], e["out_file"], e["gen_px"][0], e["gen_px"][1],
                        e["seed"], e["rendered"], e.get("negative", "")])

    # ---- queue json (machine readable, one job per line) ---- #
    queue = [{
        "id": e["id"], "kind": e["kind"], "out_file": e["out_file"],
        "width": e["gen_px"][0], "height": e["gen_px"][1], "seed": e["seed"],
        "prompt": e["rendered"], "negative": e.get("negative", ""),
        "loras": e.get("loras") or [], "refs": e.get("characters") or [],
    } for e in entries]
    save_json(out_dir / "queue.json", queue)
    save_json(out_dir / f"queue-{stem}.json", queue)

    result = {"tool": tool, "entries": len(entries), "panels": len(ep.get("panels", [])),
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

Usage:
  python comfy_batch.py --queue queue.json --out ../art/ep001 \\
      --checkpoint "illustriousXL_v10.safetensors" [--dry-run] [--only p003,p004]

This is a *generic* runner: it fills the placeholder template (or your own
exported API workflow, as long as it contains the same %TOKENS%), posts one job
at a time to /prompt, waits for /history, and writes the image to --out.
If your workflow has more nodes, export it from ComfyUI (Workflow > Export API)
and add the same %TOKENS% where the values belong.
"""
from __future__ import annotations
import argparse, json, os, shutil, sys, time, urllib.request
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
    ap.add_argument("--out", required=True, help="folder for the rendered panels")
    ap.add_argument("--checkpoint", required=True)
    ap.add_argument("--server", default="127.0.0.1:8188")
    ap.add_argument("--steps", type=int, default=28)
    ap.add_argument("--cfg", type=float, default=5.5)
    ap.add_argument("--only", default="", help="comma separated ids")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--sleep", type=float, default=0.2)
    a = ap.parse_args()

    queue = json.loads(Path(a.queue).read_text())
    template = json.loads(Path(a.template).read_text())
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    only = {s.strip() for s in a.only.split(",") if s.strip()}
    jobs = [j for j in queue if j.get("kind") == "panel" and (not only or j["id"] in only)]
    print(f"{len(jobs)} panel job(s)")

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
            for _ in range(1200):
                hist = get(a.server, f"/history/{pid}")
                if pid in hist and hist[pid].get("outputs"):
                    break
                time.sleep(1)
            outs = hist.get(pid, {}).get("outputs", {})
            saved = False
            for node in outs.values():
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
        os_chmod(path)
    except Exception:
        pass


def os_chmod(path: Path):
    import os
    os.chmod(path, 0o755)
