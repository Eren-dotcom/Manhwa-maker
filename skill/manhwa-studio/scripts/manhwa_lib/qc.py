"""
QC gates: everything a human editor checks before an episode ships.

  mechanical  -- width, tile caps, file sizes, master/export pass, font size
  editorial   -- via refine.py: chapter architecture, density, no-slop dialogue
  layout      -- gutters, ratio bands, shot repetition, balloon coverage
  continuity  -- speakers, sheets, LoRA/reference, effect languages, approvals

`check --final` turns missing art / placeholders into errors, so the same report
works as a pre-upload gate.
"""
from __future__ import annotations

from pathlib import Path

from . import refine as refine_mod
from .project import Project, load_json
from .specs import PACING_GAPS, SHOT_PRESETS, in_band, scale_for

END_BEATS = {"end_question", "cliffhanger", "sting", "reveal", "impact", "turn"}
ANTI_TEXT = ("text", "letter", "speech bubble", "caption box", "watermark")


def _finding(sev: str, code: str, msg: str, where: str = "") -> dict:
    return {"severity": sev, "code": code, "message": msg, "where": where}


def run_checks(project: Project, ep_no: int, ep: dict, manifest: dict | None = None,
               layout: dict | None = None, final: bool = False,
               require_sheets: bool = True) -> dict:
    plat = project.platform
    geo = project.geometry
    panels = ep.get("panels", [])
    chars = project.characters()
    let = project.series.get("lettering", {})
    max_words = int(let.get("max_words_per_bubble", 20))
    W = int((manifest or {}).get("master_width") or geo.get("width") or 1080)
    EW = int((manifest or {}).get("export_width") or plat["width"])
    scale = scale_for(W)
    exp_scale = EW / float(W) if W else 1.0
    findings: list[dict] = []

    # ---------------------------------------------------------------- layout #
    if manifest:
        if manifest.get("export_width") != plat["width"]:
            findings.append(_finding("error", "L001",
                f"export width {manifest.get('export_width')}px != platform width {plat['width']}px",
                "manifest"))
        mw = int(manifest.get("master_width") or 0)
        if mw < EW:
            findings.append(_finding("error", "L007",
                f"master width {mw}px is below the export width {EW}px -- you are upscaling", "manifest"))
        elif mw < 1080:
            findings.append(_finding("warn", "L007",
                f"master width {mw}px -- the reference master is 1080px; smaller loses detail on export",
                "manifest"))
        for t in manifest.get("tiles", []):
            if t["height"] > plat["tile_max_h"]:
                findings.append(_finding("error", "L002",
                    f"tile {t['index']} is {t['height']}px tall (cap {plat['tile_max_h']}px)",
                    f"upload/{Path(t['file']).name}"))
            cap = plat.get("tile_max_bytes")
            if cap and t["bytes"] > cap:
                findings.append(_finding("error", "L003",
                    f"tile {t['index']} is {t['bytes']/1048576:.2f}MB (cap {cap/1048576:.0f}MB)",
                    f"upload/{Path(t['file']).name}"))
            if t["format"] not in plat["formats"]:
                findings.append(_finding("error", "L006",
                    f"tile {t['index']} format .{t['format']} not accepted", ""))
        if plat.get("max_tiles") and manifest["tile_count"] > plat["max_tiles"]:
            findings.append(_finding("error", "L004",
                f"{manifest['tile_count']} tiles (cap {plat['max_tiles']})", ""))
        ep_cap = plat.get("episode_max_bytes")
        if ep_cap and manifest["total_bytes"] > ep_cap:
            findings.append(_finding("warn", "L005",
                f"episode is {manifest['total_bytes']/1048576:.1f}MB (cap {ep_cap/1048576:.0f}MB) -- "
                f"lower --quality or use jpg", ""))
        for issue in manifest.get("placement_issues") or []:
            findings.append(_finding("warn", "R002",
                f"type renders at {issue['size_export_px']:.0f}px in the export -- keep >=20px",
                issue.get("panel", "")))
    else:
        findings.append(_finding("info", "L000",
            "no manifest.json found -- run `assemble` for the layout/spec checks", ""))

    # ------------------------------------------------- editorial (refine.py) #
    findings += [{"severity": f["severity"], "code": f["code"], "message": f["message"],
                  "where": f.get("panel", "-")}
                 for f in refine_mod.scan_dialogue(ep, max_words)]
    findings += [{"severity": f["severity"], "code": f["code"], "message": f["message"],
                  "where": f.get("panel", "-")}
                 for f in refine_mod.scan_structure(project, ep)]

    # ---------------------------------------------------------------- pacing #
    for i, p in enumerate(panels):
        if i == len(panels) - 1:
            continue
        gap_export = (p.get("gap_after") or PACING_GAPS.get(p.get("pace", "normal"), 200))
        if gap_export < 200 * 0.9 and p.get("pace") not in ("fast",):
            findings.append(_finding("warn", "P001",
                f"gap {int(gap_export)}px (at 800) after a '{p.get('pace','normal')}' panel -- below the "
                f"200px floor, the panels will read as one image", p.get("id", "?")))
        if p.get("pace") == "transition" and gap_export < 600:
            findings.append(_finding("warn", "P002",
                f"scene transition with only {int(gap_export)}px of air -- use 600-1000px", p.get("id", "?")))
        if p.get("shot") == "action" and p.get("dialogue"):
            findings.append(_finding("warn", "P004",
                "dialogue on an action panel -- give the action its own panel", p.get("id", "?")))
        # reference band: does the panel sit inside its shot's ratio band?
        shot = SHOT_PRESETS.get(p.get("shot", "medium"))
        if shot and p.get("height"):
            ar = (W if p.get("bleed") else W - 2 * int(geo.get("side_margin", 0) * scale)) / float(p["height"])
            if not in_band(ar, shot.get("band", "full_bleed")):
                findings.append(_finding("info", "P006",
                    f"{p.get('shot')} panel has a {ar:.2f}:1 ratio, outside its "
                    f"'{shot.get('band')}' band", p.get("id", "?")))

    run = 1
    for i in range(1, len(panels)):
        if panels[i].get("shot") == panels[i - 1].get("shot"):
            run += 1
            if run == 3:
                findings.append(_finding("warn", "P003",
                    f"3 panels in a row with the same shot ({panels[i].get('shot')}) -- vary the camera",
                    panels[i].get("id", "?")))
        else:
            run = 1

    if manifest and manifest.get("gutter_reserved"):
        for pid in manifest["gutter_reserved"]:
            findings.append(_finding("info", "P005",
                f"gutter reserved for a balloon before {pid} -- the gap is wider than the pace alone "
                f"implies (spacing is deliberate)", pid))

    # ----------------------------------------------------------- readability #
    if layout:
        for pb in layout.get("panels", []):
            pw = max(1, pb["rect"][2] - pb["rect"][0])
            ph = max(1, pb["rect"][3] - pb["rect"][1])
            panel_obj = next((x for x in panels if x.get("id") == pb.get("id")), {})
            guard = [g.lower() for g in (panel_obj.get("focus_guard") or [])]
            for b in pb.get("bubbles", []):
                r = b.get("rect") or []
                if len(r) != 4:
                    continue
                area = (r[2] - r[0]) * (r[3] - r[1]) / float(pw * ph)
                if area > 0.55:
                    findings.append(_finding("warn", "R003",
                        f"a {b.get('style')} balloon covers {area*100:.0f}% of its panel -- "
                        f"the art has nowhere to breathe", pb.get("id", "?")))
                if b.get("lines") and b["lines"] > 2:
                    findings.append(_finding("warn", "R004",
                        f"{b['lines']} lines in one balloon (reference: 1-2) -- split or shorten the line",
                        pb.get("id", "?")))
                if guard and b.get("style") not in ("narration", "technique", "prop"):
                    cy = (r[1] + r[3]) / 2
                    if cy < pb["rect"][1] + ph * 0.45 and "face" in guard and area > 0.18:
                        findings.append(_finding("info", "R005",
                            "a balloon sits over the upper-middle of the panel where the face/eyes "
                            "usually are -- check it is not covering the subject", pb.get("id", "?")))
                if b.get("gutter") and not b.get("tail"):
                    findings.append(_finding("warn", "R006",
                        "gutter balloon with no tail -- the reader cannot tell who is speaking",
                        pb.get("id", "?")))

    # ------------------------------------------------------------ continuity #
    known = set(chars) | {"narration", "sfx", "system", "unknown", "???",
                          "prop", "technique", "symbol"}
    # styles that carry a label rather than a speaker
    NON_SPEAKING = {"sfx", "system", "radio", "prop", "technique", "symbol", "narration"}
    outfits: dict[str, set] = {}
    factions: dict[str, set] = {}
    for p in panels:
        for d in (p.get("dialogue") or []):
            c = d.get("character")
            if d.get("style") in NON_SPEAKING:
                continue
            if c and c not in known:
                findings.append(_finding("error", "C001",
                    f"speaker '{c}' is not in the character bible -- add characters/{c}.json "
                    f"or use `narration`", p.get("id", "?")))
        for c, outfit in (p.get("outfit") or {}).items():
            outfits.setdefault(c, set()).add(outfit)
        if p.get("fx_faction"):
            factions.setdefault(p.get("scene") or "default", set()).add(p["fx_faction"])
    for c, os_ in outfits.items():
        if len(os_) > 2:
            findings.append(_finding("info", "C003",
                f"{c} wears {len(os_)} outfits in one chapter -- check the reader can follow it", c))
    for scene, fx_set in factions.items():
        if len(fx_set) > 1:
            findings.append(_finding("warn", "C005",
                f"scene '{scene}' mixes {len(fx_set)} effect languages ({', '.join(sorted(fx_set))}) -- "
                f"effect languages stay distinct per faction and never mix", scene))

    for cid, c in chars.items():
        appears = any(cid in (p.get("characters") or []) for p in panels)
        if not appears:
            continue
        has_lora = bool(c.get("lora", {}).get("file"))
        refs = [r for r in (c.get("ref_images") or []) if r and (project.root / r).exists()]
        if not has_lora and not refs:
            findings.append(_finding("warn", "C002",
                f"'{cid}' has no LoRA and no reference images on disk -- drift is guaranteed "
                f"(generate the sheets from the prompt pack first)", cid))
        if not (c.get("prompt_block") or "").strip():
            findings.append(_finding("warn", "C004",
                f"'{cid}' has an empty prompt_block -- the model has no locked description", cid))
        if require_sheets:
            approved = any(project.is_approved("character", f"{cid}:{k}")
                           for k in ("sheet", "turnaround", "portrait"))
            if not approved:
                findings.append(_finding("warn", "C006",
                    f"'{cid}' has no approved design -- never lock a design until the user approves it "
                    f"(`approve character {cid}:sheet --note ...`)", cid))
        if not (c.get("acting_rules") or "").strip():
            findings.append(_finding("info", "C007",
                f"'{cid}' has no acting_rules -- how they hold themselves is what keeps them "
                f"recognisable in a close-up", cid))

    # ------------------------------------------------------------ disclosure #
    if not (ep.get("ai_disclosure") or project.series.get("ai_disclosure")):
        findings.append(_finding("warn", "A001",
            "no AI disclosure text -- disclose voluntarily, the direction of travel is mandatory labelling",
            "series"))
    neg = project.series.get("art_direction", {}).get("negative_block", "").lower()
    if not neg:
        findings.append(_finding("warn", "A002", "no negative prompt block in the series bible", "series"))
    elif not all(t in neg for t in ANTI_TEXT):
        findings.append(_finding("warn", "A003",
            "the negative block is missing some anti-text terms (text, letters, speech bubble, caption box, "
            "watermark) -- the art model will try to draw lettering", "series"))
    if not project.series.get("craft_rules"):
        findings.append(_finding("info", "A004",
            "no craft_rules recorded -- if you studied a reference chapter, encode what you learned there "
            "so it prints in every QC report", "series"))

    # ------------------------------------------------------------------ art #
    # black_out / white_out panels are filled by the compositor -- they never need art
    missing = [p.get("id", "?") for p in panels
               if project.panel_image_path(ep_no, p.get("id", ""), p.get("image")) is None
               and not p.get("fill")
               and p.get("pace") not in ("black_out", "white_out")]
    if missing:
        sev = "error" if final else "info"
        findings.append(_finding(sev, "F001",
            f"{len(missing)} panel(s) have no art yet: {', '.join(missing[:8])}"
            f"{'...' if len(missing) > 8 else ''}", f"art/ep{ep_no:03d}/"))
    if manifest and manifest.get("placeholders") and final:
        findings.append(_finding("error", "F002",
            f"{len(manifest['placeholders'])} placeholder panel(s) still in the strip", ""))

    # --------------------------------------------------------- delivery gate #
    if final:
        sheets_json = project.root / "output" / f"ep{ep_no:03d}" / "qc-sheets.json"
        strip = project.root / "output" / f"ep{ep_no:03d}" / "strip-master.png"
        if not sheets_json.exists():
            findings.append(_finding("error", "F004",
                "no QC sheets -- run `manhwa.py sheets <ep>` (contact sheet + lettering QC are gates, "
                "not optional)", ""))
        elif strip.exists() and sheets_json.stat().st_mtime < strip.stat().st_mtime - 1:
            findings.append(_finding("error", "F005",
                "the QC sheets are older than the strip -- re-run `manhwa.py sheets <ep>`", ""))

    if manifest:
        secs = manifest.get("est_read_seconds", 0)
        tier = str(ep.get("density_tier") or (project.series.get("production") or {})
                   .get("target_panels_per_episode") or "standard")
        limit_min = {"dense": 20, "reference": 30}.get(tier, 14)
        if secs > limit_min * 60:
            findings.append(_finding("info", "T001",
                f"~{secs/60:.1f} min read -- long for a {tier}-tier chapter "
                f"(guide {limit_min} min)", ""))
        if manifest.get("panels") and manifest["total_height"] / max(1, manifest["panels"]) < 220 * scale:
            findings.append(_finding("info", "T002",
                "panels average under 220px (at 800) -- a run of very short beats reads choppy", ""))
        if not (manifest.get("pdf")):
            findings.append(_finding("info", "T003", "no delivery PDF in this build (assemble --no-pdf?)", ""))

    order = {"error": 0, "warn": 1, "info": 2}
    findings.sort(key=lambda f: (order.get(f["severity"], 3), f["code"]))
    counts = {s: sum(1 for f in findings if f["severity"] == s) for s in ("error", "warn", "info")}
    return {
        "episode": ep_no, "title": ep.get("title"), "panels": len(panels),
        "master_width": W, "export_width": EW,
        "counts": counts, "ok": counts["error"] == 0,
        "craft_rules": project.series.get("craft_rules") or [],
        "findings": findings,
    }


def report_md(result: dict, project: Project) -> str:
    lvl = {"error": "ERROR", "warn": "warn", "info": "info"}
    lines = [f"# QC report -- {project.series.get('title')} ch{result['episode']:03d}", "",
             f"**{result['counts']['error']} errors, {result['counts']['warn']} warnings, "
             f"{result['counts']['info']} notes** across {result['panels']} panels "
             f"(master {result.get('master_width')}px, export {result.get('export_width')}px).", ""]
    if result.get("craft_rules"):
        lines += ["## Craft rules in force", ""]
        lines += [f"- {r}" for r in result["craft_rules"]]
        lines += [""]
    lines += ["Gate: " + ("PASS (no blocking errors)." if result["ok"]
                          else "FAIL -- fix the errors before uploading."), ""]
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
