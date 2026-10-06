"""
QC gates: the checks a human editor would run before an episode ships.

Two families:
  * mechanical -- width, tile caps, file sizes, font size, safe areas
  * editorial  -- hook in the first panels, cliffhanger at the end, mid-episode
                  hook, pacing gaps, panel-count discipline, dialogue load

`check --final` turns "missing art" and "placeholder panel" into hard errors, so
the same report works as a pre-upload gate. See references/07-qc-gates.md.
"""
from __future__ import annotations

from pathlib import Path

from .project import Project, load_json
from .specs import PACING_GAPS, SHOT_PRESETS

HOOK_BEATS = {"hook", "inciting", "conflict", "action", "impact"}
END_BEATS = {"cliffhanger", "sting", "reveal", "impact", "turn"}


def _finding(sev: str, code: str, msg: str, where: str = "") -> dict:
    return {"severity": sev, "code": code, "message": msg, "where": where}


def run_checks(project: Project, ep_no: int, ep: dict, manifest: dict | None = None,
               layout: dict | None = None, final: bool = False) -> dict:
    plat = project.platform
    geo = project.geometry
    W = int(geo.get("width") or plat["width"])
    scale = W / 800.0
    panels = ep.get("panels", [])
    chars = project.characters()
    let = project.series.get("lettering", {})
    max_words = int(let.get("max_words_per_bubble", 30))
    findings: list[dict] = []

    # ---------------------------------------------------------------- layout #
    if manifest:
        if manifest.get("width") != plat["width"]:
            findings.append(_finding("error", "L001",
                f"strip width {manifest['width']}px != platform width {plat['width']}px", "manifest"))
        for t in manifest.get("tiles", []):
            if t["height"] > plat["tile_max_h"]:
                findings.append(_finding("error", "L002",
                    f"tile {t['index']} is {t['height']}px tall (cap {plat['tile_max_h']}px)", f"upload/{Path(t['file']).name}"))
            cap = plat.get("tile_max_bytes")
            if cap and t["bytes"] > cap:
                findings.append(_finding("error", "L003",
                    f"tile {t['index']} is {t['bytes']/1048576:.2f}MB (cap {cap/1048576:.0f}MB)", f"upload/{Path(t['file']).name}"))
            if t["format"] not in plat["formats"] and f".{t['format']}" not in [f".{f}" for f in plat["formats"]]:
                findings.append(_finding("error", "L006", f"tile {t['index']} format .{t['format']} not accepted", ""))
        if plat.get("max_tiles") and manifest["tile_count"] > plat["max_tiles"]:
            findings.append(_finding("error", "L004",
                f"{manifest['tile_count']} tiles (cap {plat['max_tiles']})", ""))
        ep_cap = plat.get("episode_max_bytes")
        if ep_cap and manifest["total_bytes"] > ep_cap:
            findings.append(_finding("warn", "L005",
                f"episode is {manifest['total_bytes']/1048576:.1f}MB (cap {ep_cap/1048576:.0f}MB) -- raise JPG quality compression", ""))
    else:
        findings.append(_finding("info", "L000", "no manifest.json found -- run `assemble` for layout checks", ""))

    # ------------------------------------------------------------- structure #
    budget = int(ep.get("panel_budget") or project.series.get("target_panels_per_episode", 55))
    n = len(panels)
    if budget and n < budget * 0.6:
        findings.append(_finding("warn", "S001",
            f"{n} panels vs a {budget}-panel budget -- short episodes lose readers who calibrate to your length", "episode"))
    elif budget and n > budget * 1.5:
        findings.append(_finding("warn", "S001",
            f"{n} panels vs a {budget}-panel budget -- consider splitting the episode", "episode"))

    first = panels[:3]
    if first and not any(p.get("beat") in HOOK_BEATS or p.get("dialogue") for p in first):
        findings.append(_finding("warn", "S002",
            "no hook in the first 3 panels -- readers give you ~5 panels / 8 seconds", "p001-p003"))
    last = panels[-2:] if n >= 2 else panels
    if last and not any(p.get("beat") in END_BEATS for p in last):
        findings.append(_finding("warn", "S003",
            "the episode does not end on a cliffhanger / reveal / sting", "last panels"))
    if n >= 12 and not any(p.get("beat") == "midpoint_hook" for p in panels):
        findings.append(_finding("info", "S004",
            "no panel marked `midpoint_hook` -- 30-40% in is where you lose the most readers", ""))
    for p in panels:
        if not (p.get("action") or "").strip():
            findings.append(_finding("info", "S005", "no action/description text", p.get("id", "?")))
        bubbles = [d for d in (p.get("dialogue") or []) if d.get("style", "speech") != "sfx"]
        if len(bubbles) > 3:
            findings.append(_finding("warn", "S006",
                f"{len(bubbles)} bubbles in one panel -- split the beat across panels", p.get("id", "?")))

    # ---------------------------------------------------------------- pacing #
    for i, p in enumerate(panels):
        pace = p.get("pace", "normal")
        if i == len(panels) - 1:
            continue
        gap = p.get("gap_after")
        if gap is None:
            gap = PACING_GAPS.get(pace, 200) * scale
        if gap < 200 * scale * 0.9 and pace not in ("fast",):
            findings.append(_finding("warn", "P001",
                f"gap {int(gap)}px after a '{pace}' panel -- below the 200px floor, panels will read as one image", p.get("id", "?")))
        if pace == "transition" and gap < 600 * scale:
            findings.append(_finding("warn", "P002",
                f"scene transition with only {int(gap)}px of air -- use 600-1000px to sell the time jump", p.get("id", "?")))
        if p.get("shot") == "action" and p.get("dialogue"):
            findings.append(_finding("warn", "P004",
                "dialogue on an action panel -- give the action its own panel and put the line before or after", p.get("id", "?")))

    run = 1
    for i in range(1, len(panels)):
        if panels[i].get("shot") == panels[i - 1].get("shot"):
            run += 1
            if run == 3:
                findings.append(_finding("warn", "P003",
                    f"3 panels in a row with the same shot ({panels[i].get('shot')}) -- vary the camera", panels[i].get("id", "?")))
        else:
            run = 1

    # ----------------------------------------------------------- readability #
    for p in panels:
        for d in (p.get("dialogue") or []):
            words = len(str(d.get("text", "")).split())
            if words > max_words:
                findings.append(_finding("warn", "R001",
                    f"{words} words in one bubble (limit {max_words}) -- split it or cut it", p.get("id", "?")))

    if layout:
        for pb in layout.get("panels", []):
            pw = max(1, pb["rect"][2] - pb["rect"][0])
            ph = max(1, pb["rect"][3] - pb["rect"][1])
            for b in pb.get("bubbles", []):
                r = b.get("rect") or []
                if len(r) != 4:
                    continue
                area = (r[2] - r[0]) * (r[3] - r[1]) / float(pw * ph)
                if area > 0.5:
                    findings.append(_finding("warn", "R003",
                        f"a {b.get('style')} bubble covers {area*100:.0f}% of the panel -- the art has nowhere to breathe", pb.get("id", "?")))
                size = b.get("font_size") or 0     # already in output px
                if size and size < 16:
                    findings.append(_finding("error", "R002",
                        f"type is {size:.0f}px at {W}px width -- unreadable on a phone (keep >=20px)", pb.get("id", "?")))
                elif size and size < 20:
                    findings.append(_finding("warn", "R002",
                        f"type is {size:.0f}px at {W}px width -- borderline on a phone", pb.get("id", "?")))

    # ------------------------------------------------------------ continuity #
    known = set(chars) | {"narration", "sfx", "system", "unknown", "???"}
    outfits: dict[str, set] = {}
    for p in panels:
        for d in (p.get("dialogue") or []):
            c = d.get("character")
            if c and c not in known:
                findings.append(_finding("error", "C001",
                    f"speaker '{c}' is not in the character bible -- add characters/{c}.json or use `narration`", p.get("id", "?")))
        for c, outfit in (p.get("outfit") or {}).items():
            outfits.setdefault(c, set()).add(outfit)
    for c, os_ in outfits.items():
        if len(os_) > 2:
            findings.append(_finding("info", "C003",
                f"{c} wears {len(os_)} different outfits in one episode -- check the reader can follow the change", c))

    for cid, c in chars.items():
        appears = any(cid in (p.get("characters") or []) for p in panels)
        if not appears:
            continue
        has_lora = bool(c.get("lora", {}).get("file"))
        refs = [r for r in (c.get("ref_images") or []) if r and (project.root / r).exists()]
        if not has_lora and not refs:
            findings.append(_finding("warn", "C002",
                f"'{cid}' has no LoRA and no reference images on disk -- face/outfit drift is guaranteed "
                f"(generate {cid}_sheet.png and {cid}_faces.png from the prompt pack first)", cid))
        if not (c.get("prompt_block") or "").strip():
            findings.append(_finding("warn", "C004",
                f"'{cid}' has an empty prompt_block -- the model has no locked description to reuse", cid))

    # ------------------------------------------------------------ disclosure #
    if not (ep.get("ai_disclosure") or project.series.get("ai_disclosure")):
        findings.append(_finding("warn", "A001",
            "no AI disclosure text in series.json/episode -- disclose voluntarily, the direction of travel is mandatory labelling", "series"))
    if not len(project.series.get("art_direction", {}).get("negative_block", "").strip()):
        findings.append(_finding("info", "A002", "no negative prompt block in the series bible", "series"))

    # ------------------------------------------------------------------ art #
    missing = []
    for p in panels:
        if project.panel_image_path(ep_no, p.get("id", ""), p.get("image")) is None:
            missing.append(p.get("id", "?"))
    if missing:
        sev = "error" if final else "info"
        findings.append(_finding(sev, "F001",
            f"{len(missing)} panel(s) have no art yet: {', '.join(missing[:8])}{'...' if len(missing) > 8 else ''}",
            f"art/ep{ep_no:03d}/"))
    if manifest and manifest.get("placeholders") and final:
        findings.append(_finding("error", "F002",
            f"{len(manifest['placeholders'])} placeholder panel(s) still in the strip", ""))

    # ----------------------------------------------------------- meta / spec #
    if manifest:
        secs = manifest.get("est_read_seconds", 0)
        if secs > 12 * 60:
            findings.append(_finding("info", "T001",
                f"~{secs/60:.1f} min read -- long for a weekly episode; readers average 5-8 min", ""))
        if manifest.get("panels") and manifest["total_height"] / max(1, manifest["panels"]) < 220:
            findings.append(_finding("info", "T002",
                "panels average under 220px tall -- a lot of very short beats can feel choppy", ""))

    order = {"error": 0, "warn": 1, "info": 2}
    findings.sort(key=lambda f: (order.get(f["severity"], 3), f["code"]))
    counts = {s: sum(1 for f in findings if f["severity"] == s) for s in ("error", "warn", "info")}
    return {
        "episode": ep_no, "title": ep.get("title"), "panels": n,
        "counts": counts,
        "ok": counts["error"] == 0,
        "findings": findings,
    }


def report_md(result: dict, project: Project) -> str:
    lvl = {"error": "ERROR", "warn": "warn", "info": "info"}
    lines = [f"# QC report -- {project.series.get('title')} ep {result['episode']:03d}",
             "",
             f"**{result['counts']['error']} errors, {result['counts']['warn']} warnings, "
             f"{result['counts']['info']} notes** across {result['panels']} panels.", ""]
    if result["ok"]:
        lines += ["Gate: PASS (no blocking errors).", ""]
    else:
        lines += ["Gate: FAIL -- fix the errors before uploading.", ""]
    for sev in ("error", "warn", "info"):
        rows = [f for f in result["findings"] if f["severity"] == sev]
        if not rows:
            continue
        lines += [f"## {lvl[sev]} ({len(rows)})", "", "| code | where | finding |", "|---|---|---|"]
        for f in rows:
            lines.append(f"| `{f['code']}` | {f['where']} | {f['message']} |")
        lines.append("")
    return "\n".join(lines)


def load_outputs(out_dir: Path) -> tuple[dict | None, dict | None]:
    m = out_dir / "manifest.json"
    l = out_dir / "layout.json"
    return (load_json(m) if m.exists() else None,
            load_json(l) if l.exists() else None)
