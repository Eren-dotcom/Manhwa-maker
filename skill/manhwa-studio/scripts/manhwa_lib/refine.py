"""
Script refinement -- the stage before any art.

Reference spec: never build a provided script verbatim. Fix logic, cut dead lines,
tighten pacing, run the no-slop pass, strengthen the chapter-end hook, verify panel
counts against the chapter header, and note what changed in one or two lines.

This module does the mechanical half of that: it finds the problems and writes the
canonical copy into refined/. The judgement calls (what to cut, how to rephrase)
stay with the writer or the AI showrunner -- the report tells them exactly where to
look, with line-level evidence.
"""
from __future__ import annotations

import re
from pathlib import Path

from .project import Project, load_json, save_json
from .specs import DENSITY_TIERS, SLOP_PATTERNS, SLOP_WORDS

DETAIL_SHOTS = {"detail_eyes", "detail_mouth", "detail_hands", "detail_boots",
                "detail_fist", "detail_prop", "extreme_close", "close", "insert"}
# establishing register only: chapter openers (opener_tall / entrance) and the
# end-question bookend are structural, not establishing shots, so they do not count
# against the 2-3 cap.
WIDE_SHOTS = {"establishing_wide", "establishing", "wide", "crowd", "top_down", "environment"}
ACTION_BEATS = {"action", "impact", "conflict", "build"}
ESTABLISH_CAP = 3


def _words(text: str) -> list[str]:
    return re.findall(r"[a-z']+", str(text).lower())


def scan_dialogue(ep: dict, max_words: int = 20) -> list[dict]:
    """No-slop pass + the 20-word / 1-2-line balloon discipline."""
    findings: list[dict] = []
    seen: dict[str, str] = {}
    for p in ep.get("panels", []):
        pid = p.get("id", "?")
        for d in (p.get("dialogue") or []):
            text = str(d.get("text", "")).strip()
            if not text:
                continue
            style = d.get("style", "speech")
            if style in ("sfx", "symbol", "prop", "technique"):
                continue
            ws = _words(text)
            n = len(text.split())
            if n > max_words:
                findings.append({"code": "D002", "severity": "warn", "panel": pid,
                                 "message": f"{n} words in one balloon (limit {max_words}) -- split it or cut it",
                                 "text": text})
            low = text.lower()
            for w in SLOP_WORDS:
                if re.search(rf"\b{re.escape(w)}", low):
                    findings.append({"code": "D001", "severity": "warn", "panel": pid,
                                     "message": f"slop word: '{w}'", "text": text})
            for pat, label in SLOP_PATTERNS:
                if re.search(pat, low):
                    findings.append({"code": "D001", "severity": "warn", "panel": pid,
                                     "message": f"slop pattern ({label}): /{pat}/", "text": text})
            key = low.strip(" .!?")
            if key and len(key) > 12:
                if key in seen:
                    findings.append({"code": "D003", "severity": "info", "panel": pid,
                                     "message": f"line repeats panel {seen[key]} verbatim -- vary or cut one",
                                     "text": text})
                else:
                    seen[key] = pid
            if len(ws) > 4 and len(set(ws)) / len(ws) < 0.5:
                findings.append({"code": "D004", "severity": "info", "panel": pid,
                                 "message": "repetitive wording in one balloon", "text": text})
    return findings


def scan_structure(project: Project, ep: dict) -> list[dict]:
    """Chapter architecture + density, as a checker rather than a convention."""
    out: list[dict] = []
    panels = ep.get("panels", [])
    n = len(panels)
    if not panels:
        return [{"code": "S000", "severity": "error", "panel": "-", "message": "episode has no panels"}]
    beats = [p.get("beat", "") for p in panels]
    shots = [p.get("shot", "") for p in panels]

    # 1. engine: the chapter's visual idea inside the first 5 panels
    if not any(b in ("engine", "opener_tall") or (panels[i].get("shot") == "opener_tall")
               for i, b in enumerate(beats[:5])):
        out.append({"code": "S008", "severity": "warn", "panel": "p001-p005",
                    "message": "no engine beat in the first 5 panels -- the chapter's visual idea "
                               "should be stated in images before anything else"})
    # 2. introductions
    if not any(b in ("introduction", "hero_shot") for b in beats):
        out.append({"code": "S009", "severity": "warn", "panel": "-",
                    "message": "no introduction beat -- every chapter introduces or re-introduces "
                               "someone (new face, new facet, or a planted future face)"})
    # 3. past life / villain
    if not any(b in ("past_life", "villain") for b in beats):
        out.append({"code": "S010", "severity": "warn", "panel": "-",
                    "message": "no past-life / villain beat -- the reference spec requires at least one"})
    # 4. end question
    tail_beats = beats[-3:]
    if not any(b in ("end_question", "cliffhanger", "sting", "reveal") for b in tail_beats):
        out.append({"code": "S011", "severity": "warn", "panel": panels[-1].get("id", "-"),
                    "message": "the chapter does not end on a question -- the last panel must make "
                               "the reader scroll for an answer"})
    else:
        last_dlg = [d.get("text", "") for d in (panels[-1].get("dialogue") or [])]
        if last_dlg and not str(last_dlg[-1]).strip().endswith("?"):
            out.append({"code": "S011", "severity": "info", "panel": panels[-1].get("id", "-"),
                        "message": "the final line is a statement, not a question -- an image or an "
                                   "unanswered question lands the cliffhanger harder"})

    # establishing-shot cap
    wide = [p.get("id") for p in panels if p.get("shot") in WIDE_SHOTS]
    if len(wide) > ESTABLISH_CAP:
        out.append({"code": "S012", "severity": "warn", "panel": ", ".join(wide[:6]),
                    "message": f"{len(wide)} establishing/wide shots (cap {ESTABLISH_CAP}) -- "
                               f"close-ups and detail crops should dominate"})
    detail = sum(1 for s in shots if s in DETAIL_SHOTS)
    ratio = detail / max(1, n)
    if ratio < 0.25:
        out.append({"code": "S013", "severity": "warn", "panel": "-",
                    "message": f"only {ratio*100:.0f}% close-up / detail-crop panels -- when a chapter "
                               f"feels thin, add cuts (eyes, mouths, hands, boots, fists), not plot"})

    # density vs the series tier
    tier_name = (project.series.get("density") or "standard")
    tier = DENSITY_TIERS.get(tier_name, DENSITY_TIERS["standard"])
    target = int(ep.get("panel_budget") or tier["panels"])
    if n < target * 0.75:
        out.append({"code": "S001", "severity": "warn", "panel": "-",
                    "message": f"{n} panels vs a {target}-panel target (tier: {tier_name}) -- "
                               f"run `refine --pad` to see where to add cuts"})
    elif n > target * 1.35:
        out.append({"code": "S001", "severity": "warn", "panel": "-",
                    "message": f"{n} panels vs a {target}-panel target -- consider splitting the chapter"})

    # technique legibility: start pose -> force -> contact -> result -> cost
    for i, p in enumerate(panels):
        if p.get("beat") in ACTION_BEATS and not p.get("technique"):
            run = panels[i:i + 5]
            if all(x.get("beat") in ACTION_BEATS for x in run) and len(run) >= 3:
                out.append({"code": "S014", "severity": "info", "panel": p.get("id", "-"),
                            "message": "action run without a technique scaffold -- major techniques "
                                       "want: start pose, force direction, contact point, result, cost"})
                break
    # unused characters
    used = {c for p in panels for c in (p.get("characters") or [])}
    for cid in (project.series.get("characters") or []):
        if cid not in used and project.character(cid):
            out.append({"code": "S015", "severity": "info", "panel": "-",
                        "message": f"'{cid}' is in the bible but never appears in this chapter"})
    return out


def verify_panel_count(text: str, ep: dict) -> list[dict]:
    """Compare the sheet against the chapter header in a source script."""
    out = []
    m = re.search(r"(?:panels?|cuts?)\s*[:=]\s*(\d{1,4})", text, re.I)
    if not m:
        m = re.search(r"(\d{1,4})\s*(?:panels|cuts)\b", text, re.I)
    if m:
        declared = int(m.group(1))
        actual = len(ep.get("panels", []))
        if declared != actual:
            out.append({"code": "S016", "severity": "warn", "panel": "-",
                        "message": f"header declares {declared} panels, sheet has {actual} "
                                   f"({'missing' if actual < declared else 'extra'} "
                                   f"{abs(declared-actual)})"})
    return out


def propose_padding(ep: dict) -> list[dict]:
    """Where to add cuts: every medium/wide panel that carries a beat alone."""
    proposals = []
    panels = ep.get("panels", [])
    for i, p in enumerate(panels):
        if p.get("shot") in ("medium", "cowboy", "medium_low", "medium_high", "wide") and p.get("beat") in (
                "build", "turn", "conflict", "impact", "action", "reveal"):
            nid = f"{p.get('id')}_x{i+1:03d}"
            proposals.append({
                "after": p.get("id"),
                "proposed_id": nid,
                "shot": "detail_eyes" if p.get("beat") in ("reveal", "turn") else "detail_hands",
                "beat": p.get("beat"),
                "pace": "fast",
                "characters": p.get("characters") or [],
                "action": f"Detail crop for {p.get('id')}: " +
                          ("the eyes, the moment the realisation lands" if p.get("beat") in ("reveal", "turn")
                           else "the hands, the grip tightening"),
                "why": "break a medium shot into a detail-crop beat (adds a cut, not plot)",
            })
    return proposals


# --------------------------------------------------------------------------- #
def run(project: Project, ep_no: int, ep: dict, source_text: str | None = None,
        max_words: int = 20, pad: bool = False) -> dict:
    findings = scan_dialogue(ep, max_words) + scan_structure(project, ep)
    if source_text:
        findings += verify_panel_count(source_text, ep)
    proposals = propose_padding(ep) if pad else []

    for f in findings:
        f["where"] = f.get("panel", "-")

    summary = {
        "episode": ep_no,
        "panels": len(ep.get("panels", [])),
        "words": sum(len(str(d.get("text", "")).split())
                     for p in ep.get("panels", []) for d in (p.get("dialogue") or [])),
        "balloons": sum(len(p.get("dialogue") or []) for p in ep.get("panels", [])),
        "counts": {
            "errors": sum(1 for f in findings if f["severity"] == "error"),
            "warnings": sum(1 for f in findings if f["severity"] == "warn"),
            "notes": sum(1 for f in findings if f["severity"] == "info"),
        },
        "findings": findings,
        "padding_proposals": proposals,
    }
    return summary


def write_refined(project: Project, ep_no: int, ep: dict, summary: dict,
                  source_path: Path | None = None) -> dict:
    """Canonical copy + the change note, in the reference file convention."""
    ref = project.root / "refined"
    ref.mkdir(parents=True, exist_ok=True)
    save_json(ref / f"ch{ep_no:03d}-refined.json", ep)
    save_json(ref / f"ch{ep_no:03d}-refine-report.json", summary)
    if source_path and source_path.exists():
        (ref / f"ch{ep_no:03d}-source.md").write_text(source_path.read_text(encoding="utf-8"),
                                                      encoding="utf-8")
    lines = [f"# Change note - ch{ep_no:03d} \"{ep.get('title','')}\"", ""]
    c = summary["counts"]
    top = [f for f in summary["findings"] if f["severity"] in ("error", "warn")][:6]
    lines.append(
        f"Refinement pass found {c['errors']} errors, {c['warnings']} warnings and {c['notes']} notes "
        f"across {summary['panels']} panels ({summary['balloons']} balloons, {summary['words']} words). "
        + (f"Headline issues: " + "; ".join(f"{f['code']} ({f.get('panel')})" for f in top) + "." if top
           else "No headline issues.")
    )
    lines += ["", "## Findings", "", "| code | severity | panel | finding |", "|---|---|---|---|"]
    for f in summary["findings"]:
        lines.append(f"| `{f['code']}` | {f['severity']} | {f.get('panel','-')} | {f['message']} |")
    if summary["padding_proposals"]:
        lines += ["", "## Proposed cuts (to raise density without adding plot)", "",
                  "| after | new panel | shot | action |", "|---|---|---|---|"]
        for p in summary["padding_proposals"]:
            lines.append(f"| {p['after']} | {p['proposed_id']} | {p['shot']} | {p['action']} |")
    lines += ["", "## What changed", "",
              "- (the writer or the AI showrunner records the one-or-two-line summary here after "
              "applying the fixes above)", ""]
    (ref / "CHANGES.md").write_text("\n".join(lines), encoding="utf-8")
    return {"report": f"refined/ch{ep_no:03d}-refine-report.json",
            "canonical": f"refined/ch{ep_no:03d}-refined.json",
            "changes": "refined/CHANGES.md"}
