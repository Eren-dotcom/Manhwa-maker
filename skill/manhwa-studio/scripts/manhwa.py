#!/usr/bin/env python3
"""
manhwa.py -- production CLI for AI-assisted manhwa / webtoon pipelines.

  init      scaffold a project (blank or from the reference pilot)
  refine    script pass: no-slop, 20-word balloons, chapter architecture, panel count
  prompts   per-tool prompt pack + job queue (sheets first, then panels)
  approve   record an explicit design approval (nothing is locked without one)
  assemble  panels -> 1080 master -> web copy + platform tiles + delivery PDF
  check     numeric QC gates against the platform specs
  sheets    visual QC gates: contact sheet, likeness match-check, lettering overlay
  restage   rewrite a refused panel as a genuinely different shot
  status    production dashboard and next actions
  plan      staggered weekly production calendar

Plain JSON + PNG on disk. No server, no database.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from manhwa_lib import demo as demo_mod          # noqa: E402
from manhwa_lib import layout as layout_mod      # noqa: E402
from manhwa_lib import project as proj           # noqa: E402
from manhwa_lib import prompts as prompts_mod    # noqa: E402
from manhwa_lib import qc as qc_mod              # noqa: E402
from manhwa_lib import refine as refine_mod      # noqa: E402
from manhwa_lib import sheets as sheets_mod      # noqa: E402
from manhwa_lib.project import TEAM_PRESETS      # noqa: E402
from manhwa_lib.specs import (DENSITY_TIERS, MASTER_WIDTH, PLATFORM_SPECS,  # noqa: E402
                              VERSION, resolve_platform)

_TTY = sys.stdout.isatty()


def c(s, code):
    return f"\033[{code}m{s}\033[0m" if _TTY else s


def ok(s):   return c(s, "32")
def warn(s): return c(s, "33")
def err(s):  return c(s, "31")
def dim(s):  return c(s, "90")
def bold(s): return c(s, "1")


def hr(title=""):
    print(bold(f"\n{title} " + "─" * max(0, 66 - len(title))) if title else "─" * 68)


def _sev_tag(sev):
    return {"error": err("✗ ERROR"), "warn": warn("! warn "), "info": dim("· info "),
            "errors": err("✗ ERROR"), "warnings": warn("! warn "), "notes": dim("· info ")}.get(sev, sev)


# --------------------------------------------------------------------------- #
def cmd_init(a):
    root = Path(a.dir)
    if root.exists() and any(root.iterdir()) and not a.force:
        print(err(f"{root} is not empty (use --force)"))
        return 2
    proj.scaffold(root, a.title or root.name, a.platform, a.lang, a.density)
    chars = 0
    if a.demo:
        _write_demo_content(root)
        chars = len(demo_mod.CHARACTERS)
    spec = resolve_platform(a.platform)
    tier = DENSITY_TIERS[a.density]
    hr("project created")
    print(f"  {bold(str(root))}")
    print(f"  platform   {spec['label']}  ({spec['width']}px export)")
    print(f"  master     {MASTER_WIDTH}px  -> tiles cut at {int(spec['tile_max_h'])}px on export")
    print(f"  density    {a.density} (~{tier['panels']} panels/chapter)")
    print(f"  characters {chars}" + ("" if chars else dim("  (add characters/<id>.json)")))
    print()
    print("next:")
    print("  python manhwa.py refine 1                     # script pass before any art")
    print("  python manhwa.py prompts 1 --tool sdxl        # sheets first, approve them, then panels")
    print("  python manhwa.py assemble 1 && manhwa.py check 1 --final")
    return 0


def _write_demo_content(root: Path):
    proj.save_json(root / "series.json", demo_mod.SERIES)
    for cid, c in demo_mod.CHARACTERS.items():
        proj.save_json(root / "characters" / f"{cid}.json", c)
    proj.save_json(root / "episodes" / "ep001.json", demo_mod.EPISODE)
    (root / "reference_sheets").mkdir(parents=True, exist_ok=True)
    (root / "refined").mkdir(parents=True, exist_ok=True)


def cmd_demo(a):
    root = Path(a.dir)
    root.mkdir(parents=True, exist_ok=True)
    _write_demo_content(root)
    p = proj.Project(root)
    _, ep = p.episode(1)
    # the reference pilot ships with its designs treated as approved, so the demo
    # shows a clean gate. Real projects approve explicitly via `manhwa.py approve`.
    for cid in (ep and demo_mod.CHARACTERS or {}):
        p.approve("character", f"{cid}:sheet", "reference pilot: design approved by the demo build")
    print(bold(f"\nbuilt reference pilot in {root}"))
    man = layout_mod.assemble(p, 1, ep, layout_mod.Options(annotate=a.annotate))
    lay = qc_mod.load_outputs(root / "output" / "ep001")[1]
    res = qc_mod.run_checks(p, 1, ep, man, lay)
    _print_qc(res)
    print(dim(f"\npreview:  {root}/output/ep001/preview.html"))
    print(dim(f"delivery: {root}/your_files/  ·  per-panel: {root}/ch001/"))
    return 0 if res["ok"] else 1


def cmd_status(a):
    p = proj.Project(_root(a))
    plat = p.platform
    chars = p.characters()
    hr(p.series.get("title", "project"))
    tier = p.series.get("density", "standard")
    print(f"  {dim('root')}      {p.root}")
    print(f"  {dim('platform')}  {plat['label']}  master {MASTER_WIDTH}px -> export {plat['width']}px")
    print(f"  {dim('density')}   {tier} (~{DENSITY_TIERS.get(tier, {}).get('panels', '?')} panels/chapter)")
    print(f"  {dim('schedule')}  {p.series.get('release_schedule','-')}   language "
          f"{p.series.get('release_language','-')}")
    print(f"  {dim('cast')}      {', '.join(chars) if chars else warn('none yet')}")

    appr = p.approvals().get("approved") or []
    if appr:
        print(f"  {dim('approved')}  {', '.join(appr)}")
    else:
        print(f"  {dim('approved')}  {warn('nothing approved yet -- approve the reference sheets first')}")

    eps = p.episodes()
    if not eps:
        print(warn("\n  no episodes yet -- create episodes/ep001.json"))
        return 0
    hr("chapters")
    print(f"  {'ch':<5} {'title':<26} {'panels':>7} {'art':>7} {'tiles':>6} {'state':<11}")
    pending = []
    for path in eps:
        ep = proj.load_json(path)
        no = int(ep.get("episode", 0))
        panels = ep.get("panels", [])
        art = sum(1 for x in panels
                  if p.panel_image_path(no, x.get("id", ""), x.get("image")) or x.get("fill"))
        man_path = p.root / "output" / f"ep{no:03d}" / "manifest.json"
        man = proj.load_json(man_path) if man_path.exists() else None
        refined = (p.root / "refined" / f"ch{no:03d}-refined.json").exists()
        qcs = (p.root / "output" / f"ep{no:03d}" / "qc-sheets.json").exists()
        state = ("published" if ep.get("status") == "published" else
                 "gated" if (man and qcs) else
                 "assembled" if man else
                 "art" if art == len(panels) and panels else
                 "refined" if refined else "scripted")
        colour = ok if art == len(panels) and panels else (warn if art else dim)
        print(f"  {no:<5} {str(ep.get('title',''))[:26]:<26} {len(panels):>7} "
              f"{colour(f'{art:>3}/{len(panels):<3}')} {(man or {}).get('tile_count', '-'):>6} {state:<11}")
        if not panels:
            continue
        if not refined:
            pending.append(f"refine ch{no:03d} (script pass before art)")
        if art < len(panels):
            pending.append(f"generate {len(panels)-art} panel(s) -> art/ep{no:03d}/ or ch{no:03d}/panels/")
        if art >= len(panels) and not man:
            pending.append(f"assemble {no}")
        if man and not qcs:
            pending.append(f"sheets {no}   (contact sheet + likeness + lettering QC)")
        if man and qcs:
            pending.append(f"check {no} --final  then upload output/ep{no:03d}/upload/")

    missing_refs = [cid for cid, ch in chars.items()
                    if not any((p.root / r).exists() for r in (ch.get("ref_images") or []))]
    if missing_refs:
        pending.insert(0, "generate reference sheets first: " + ", ".join(missing_refs))
    if pending:
        hr("next actions")
        for i, t in enumerate(pending[:9], 1):
            print(f"  {i}. {t}")
    return 0


# --------------------------------------------------------------------------- #
def cmd_refine(a):
    p = proj.Project(_root(a))
    path, ep = p.episode(a.episode)
    ep_no = int(ep.get("episode", 1))
    src_text = None
    if a.source:
        sp = Path(a.source)
        src_text = sp.read_text(encoding="utf-8") if sp.exists() else None
    summary = refine_mod.run(p, ep_no, ep, src_text, a.max_words, a.pad)
    paths = refine_mod.write_refined(p, ep_no, ep, summary, Path(a.source) if a.source else None)
    if a.json:
        print(json.dumps(summary, indent=2))
        return 0 if summary["counts"]["errors"] == 0 else 1
    hr(f"refine - ch{ep_no:03d} - {summary['panels']} panels, {summary['balloons']} balloons, "
       f"{summary['words']} words")
    for f in summary["findings"][:40]:
        print(f"  {_sev_tag(f['severity'])} {dim('[' + f['code'] + ']')} "
              f"{dim(str(f.get('panel','-')) + ': ')}{f['message']}")
    if len(summary["findings"]) > 40:
        print(dim(f"  ... {len(summary['findings'])-40} more in {paths['report']}"))
    if summary["padding_proposals"]:
        hr_only = summary["padding_proposals"][:6]
        print(f"  {warn('density')}  {len(summary['padding_proposals'])} cuts proposed: "
              + ", ".join(f"{x['after']}->{x['shot']}" for x in hr_only))
    print()
    print(dim(f"  report:    {paths['report']}"))
    print(dim(f"  canonical: {paths['canonical']}"))
    print(dim(f"  changes:   {paths['changes']}"))
    return 0


def cmd_prompts(a):
    p = proj.Project(_root(a))
    path, ep = p.episode(a.episode)
    ep_no = int(ep.get("episode", 1))
    res = prompts_mod.build_pack(p, ep_no, ep, tool=a.tool,
                                 include_sheets=not a.no_sheets, include_cover=not a.no_cover,
                                 include_factions=not a.no_factions)
    (p.root / "art" / f"ep{ep_no:03d}").mkdir(parents=True, exist_ok=True)
    hr(f"prompt pack - {a.tool}")
    print(f"  {bold(str(res['entries']))} entries ({res['sheets']} reference sheets + "
          f"{res['panels']} panels)")
    for f in res["files"]:
        print(f"  {dim('->')} {f}")
    print(dim("\n  1. generate the sheets   2. approve them (`approve character <id>:sheet`)"
              "\n  3. attach them to every panel job   4. generate the panels"))
    return 0


def cmd_approve(a):
    p = proj.Project(_root(a))
    if a.kind == "cast" or (a.kind == "episode" and a.ident.isdigit()):
        path, ep = p.episode(a.ident)
        ep_no = int(ep.get("episode", 1))
        chars = {cid for pp in ep.get("panels", []) for cid in (pp.get("characters") or [])}
        for cid in chars:
            p.approve("character", f"{cid}:sheet", a.note)
        print(ok(f"approved reference designs for: {', '.join(sorted(chars)) or '(none)'}"))
        return 0
    data = p.approve(a.kind, a.ident, a.note)
    print(ok(f"approved {a.kind}:{a.ident}") + (f"  {dim(a.note)}" if a.note else ""))
    print(dim(f"  ledger: {p.approvals_path.name} ({len(data.get('approved') or [])} entries)"))
    return 0


def cmd_assemble(a):
    p = proj.Project(_root(a))
    _, ep = p.episode(a.episode)
    ep_no = int(ep.get("episode", 1))
    opts = layout_mod.Options(
        width=a.width, export_width=a.export_width, tile_height=a.tile_height,
        out_dir=Path(a.out) if a.out else None,
        no_art=a.no_art, no_letter=a.no_letter, annotate=a.annotate,
        format=a.format, quality=a.quality, bg=a.bg, tile_search=a.tile_search,
        pdf=not a.no_pdf, per_panel=not a.no_per_panel)
    man = layout_mod.assemble(p, ep_no, ep, opts)
    hr(f"assembled ch{ep_no:03d}")
    print(f"  master    {man['master_width']} x {man['total_height']:,}px   {man['panels']} panels")
    print(f"  web copy  {man['export_width']} x {man['export_height']:,}px")
    print(f"  tiles     {man['tile_count']} x {man['tile_height_cap']}px cap   "
          f"{man['total_bytes']/1048576:.2f} MB total")
    print(f"  pacing    {man['est_read_screens']} phone screens   ~{man['est_read_seconds']/60:.1f} min read")
    lt = man["lettering"]
    print(f"  lettering {lt['bubbles']} balloons · {lt['gutter']} in gutters · {lt['sfx']} SFX · "
          f"{lt['prop']} prop text")
    if man["placeholders"]:
        print(warn(f"  {len(man['placeholders'])} placeholder panel(s): "
                   f"{', '.join(man['placeholders'][:6])}{'...' if len(man['placeholders'])>6 else ''}"))
    if man.get("pdf"):
        print(f"  {dim('pdf')}       {man['pdf']}")
    out = Path(a.out) if a.out else p.root / "output" / f"ep{ep_no:03d}"
    print(f"  {dim('preview')}   {out}/preview.html")
    print(f"  {dim('upload')}    {out}/upload/   (see UPLOAD.md)")
    print(dim(f"  next:     manhwa.py sheets {ep_no}  &&  manhwa.py check {ep_no} --final"))
    return 0


def _print_qc(res):
    hr(f"QC - {res['counts']['error']} errors, {res['counts']['warn']} warnings, "
       f"{res['counts']['info']} notes")
    for f in res["findings"][:40]:
        where = dim(f"{f['where']}: ") if f["where"] else ""
        print(f"  {_sev_tag(f['severity'])} {dim('[' + f['code'] + ']')} {where}{f['message']}")
    if len(res["findings"]) > 40:
        print(dim(f"  ... {len(res['findings'])-40} more in the report file"))
    print()
    print("  " + (ok("GATE: PASS") if res["ok"] else err("GATE: FAIL")) +
          dim("   (no blocking errors)" if res["ok"] else "   (fix the errors before uploading)"))
    return res


def cmd_check(a):
    p = proj.Project(_root(a))
    _, ep = p.episode(a.episode)
    ep_no = int(ep.get("episode", 1))
    out_dir = Path(a.out) if a.out else p.root / "output" / f"ep{ep_no:03d}"
    man, lay = qc_mod.load_outputs(out_dir)
    res = qc_mod.run_checks(p, ep_no, ep, man, lay, final=a.final)
    if a.json:
        print(json.dumps(res, indent=2))
    else:
        _print_qc(res)
    rep = out_dir if out_dir.exists() else p.root / "reviews"
    rep.mkdir(parents=True, exist_ok=True)
    proj.save_json(rep / "qc-report.json", res)
    (rep / "qc-report.md").write_text(qc_mod.report_md(res, p), encoding="utf-8")
    if not a.json:
        print(dim(f"  report: {rep}/qc-report.md"))
    if not res["ok"]:
        return 1
    if a.strict and res["counts"]["warn"]:
        return 1
    return 0


def cmd_sheets(a):
    p = proj.Project(_root(a))
    _, ep = p.episode(a.episode)
    ep_no = int(ep.get("episode", 1))
    out_dir = p.root / "output" / f"ep{ep_no:03d}"
    man, lay = qc_mod.load_outputs(out_dir)
    if lay is None:
        print(err("assemble the chapter first -- the QC sheets annotate the assembled strip"))
        return 2
    hr(f"QC sheets - ch{ep_no:03d}")
    cs = sheets_mod.contact_sheet(p, ep_no, ep)
    print(f"  {ok('gate 1')} contact sheet    {cs.relative_to(p.root)}")
    if a.character:
        wanted = [c.strip() for c in a.character.split(",")]
        mcs = sheets_mod.match_check(p, ep_no, ep, wanted)
    else:
        mcs = sheets_mod.match_check(p, ep_no, ep)
    for m in mcs:
        print(f"          likeness        {m.relative_to(p.root)}")
    ls = sheets_mod.lettering_sheet(p, ep_no, lay, man)
    print(f"  {ok('gate 2')} lettering QC     {ls.relative_to(p.root)}")
    print()
    print(dim("  read the contact sheet for drift and baked-in text; read the lettering sheet for"
              "\n  tails, clipping and prop text; then do the final scroll read-through on a phone."))
    return 0


def cmd_restage(a):
    p = proj.Project(_root(a))
    path, ep = p.episode(a.episode)
    ep_no = int(ep.get("episode", 1))
    try:
        res = prompts_mod.restage(p, ep_no, path, ep, a.panel, a.kind)
    except KeyError as e:
        print(err(str(e)))
        return 2
    hr("restaged")
    print(f"  {a.panel} -> {res['new_shot']}  ({res['restaged_as']})")
    print(dim("  the prompt has been rewritten as a genuinely different shot -- regenerate it from"
              "\n  the prompt pack. Never resend the refused request."))
    return 0


def cmd_plan(a):
    p = proj.Project(_root(a))
    start = date.fromisoformat(a.start) if a.start else date.today()
    rows = proj.production_plan(a.episodes, a.team, start, a.cadence)
    hr(f"production plan - {a.episodes} chapters - {TEAM_PRESETS[a.team]['label']}")
    print(dim(f"  {TEAM_PRESETS[a.team]['lead_days']}-day lead per chapter, staged so every week ships one.\n"))
    for row in rows:
        stages = "   ".join(f"ch{s['episode']}:{s['stage']}" for s in row["stages"])
        ship = ok(f"  SHIPS ch{row['ships']:03d}") if row.get("ships") else dim("  --")
        print(f"  wk{row['week']:>2} {row['date']} {ship}   {stages}")
    print()
    print(dim("  Launch with 3-4 finished chapters in the buffer. Never publish from the leading edge."))
    return 0


def cmd_platforms(a):
    hr("platform specs")
    for key, s in PLATFORM_SPECS.items():
        note = "" if s["verified"] else warn("  (verify in your dashboard)")
        print(f"  {bold(key):<14} {s['width']:>5}px export  {s['tile_max_h']:>6}px tiles  "
              f"{(s['tile_max_bytes'] or 0)/1048576:>4.0f}MB/tile  {'/'.join(s['formats'])}{note}")
        print(dim(f"                 {s['label']}"))
    print()
    print(dim(f"  master width is {MASTER_WIDTH}px for every platform; only the export pass changes."))
    return 0


# --------------------------------------------------------------------------- #
def _root(a) -> Path:
    if getattr(a, "root", None):
        return Path(a.root).resolve()
    return proj.find_root(Path.cwd())


def build_parser():
    ap = argparse.ArgumentParser(prog="manhwa.py", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--version", action="version", version=f"manhwa.py {VERSION}")
    sub = ap.add_subparsers(dest="cmd", required=True)

    def add_root(sp):
        sp.add_argument("-C", "--root", help="project root (folder containing series.json)")
        return sp

    s = add_root(sub.add_parser("init", help="scaffold a new project"))
    s.add_argument("dir")
    s.add_argument("--title")
    s.add_argument("--platform", default="webtoons", choices=sorted(PLATFORM_SPECS))
    s.add_argument("--lang", default="en")
    s.add_argument("--density", default="standard", choices=sorted(DENSITY_TIERS),
                   help="panels per chapter: standard ~55, dense ~80, reference ~120")
    s.add_argument("--demo", action="store_true", help="also write the reference pilot chapter")
    s.add_argument("--force", action="store_true")
    s.set_defaults(func=cmd_init)

    s = add_root(sub.add_parser("demo", help="build the reference pilot project end to end"))
    s.add_argument("dir", nargs="?", default="neon-archive")
    s.add_argument("--annotate", action="store_true")
    s.set_defaults(func=cmd_demo)

    s = add_root(sub.add_parser("status", help="production dashboard"))
    s.set_defaults(func=cmd_status)

    s = add_root(sub.add_parser("refine", help="script pass: slop, balloons, architecture, panel count"))
    s.add_argument("episode")
    s.add_argument("--source", help="source script file to compare panel counts against")
    s.add_argument("--max-words", type=int, default=20)
    s.add_argument("--pad", action="store_true", help="propose detail-crop cuts to raise density")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_refine)

    s = add_root(sub.add_parser("prompts", help="emit a prompt pack (sheets first)"))
    s.add_argument("episode")
    s.add_argument("--tool", default="sdxl", choices=prompts_mod.TOOLS + ["comfy"])
    s.add_argument("--no-sheets", action="store_true")
    s.add_argument("--no-factions", action="store_true")
    s.add_argument("--no-cover", action="store_true")
    s.set_defaults(func=cmd_prompts)

    s = add_root(sub.add_parser("approve", help="record an explicit design approval"))
    s.add_argument("kind", help="character | cast | episode")
    s.add_argument("ident", help="e.g. sera:sheet, or an episode number with kind=cast")
    s.add_argument("--note", default="")
    s.set_defaults(func=cmd_approve)

    s = add_root(sub.add_parser("assemble", help="build master + web copy + tiles + PDF"))
    s.add_argument("episode")
    s.add_argument("--out")
    s.add_argument("--width", type=int, help=f"master width (default {MASTER_WIDTH})")
    s.add_argument("--export-width", type=int, help="upload width (default = platform width)")
    s.add_argument("--tile-height", type=int, help="tile height cap on export")
    s.add_argument("--no-art", action="store_true", help="storyboard mode: placeholders only")
    s.add_argument("--no-letter", action="store_true")
    s.add_argument("--no-pdf", action="store_true")
    s.add_argument("--no-per-panel", action="store_true", help="skip chNN/panels + chNN/lettered crops")
    s.add_argument("--annotate", action="store_true")
    s.add_argument("--format", default="png", choices=["png", "jpg", "both"])
    s.add_argument("--quality", type=int, default=92)
    s.add_argument("--bg")
    s.add_argument("--tile-search", type=int, default=320)
    s.set_defaults(func=cmd_assemble)

    s = add_root(sub.add_parser("check", help="numeric QC gates"))
    s.add_argument("episode")
    s.add_argument("--out")
    s.add_argument("--final", action="store_true",
                   help="missing art, placeholders and missing QC sheets become errors")
    s.add_argument("--strict", action="store_true", help="warnings also fail the gate")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_check)

    s = add_root(sub.add_parser("sheets", help="visual QC gates (contact sheet, likeness, lettering)"))
    s.add_argument("episode")
    s.add_argument("--character", help="comma separated ids (default: everyone who appears)")
    s.set_defaults(func=cmd_sheets)

    s = add_root(sub.add_parser("restage", help="rewrite a refused panel as a different shot"))
    s.add_argument("episode")
    s.add_argument("panel", help="panel id, e.g. p009")
    s.add_argument("--as", dest="kind", default="silhouette",
                   choices=sorted(prompts_mod.RESTAGE_KINDS))
    s.set_defaults(func=cmd_restage)

    s = add_root(sub.add_parser("plan", help="staggered weekly production calendar"))
    s.add_argument("--episodes", type=int, default=8)
    s.add_argument("--team", default="solo", choices=sorted(TEAM_PRESETS))
    s.add_argument("--start", help="YYYY-MM-DD")
    s.add_argument("--cadence", default="weekly", choices=["weekly"])
    s.set_defaults(func=cmd_plan)

    s = sub.add_parser("platforms", help="show platform specs")
    s.set_defaults(func=cmd_platforms)
    return ap


def main(argv=None):
    a = build_parser().parse_args(argv)
    try:
        return a.func(a)
    except FileNotFoundError as e:
        print(err(f"error: {e}"))
        return 2
    except KeyError as e:
        print(err(f"error: {e}"))
        return 2


if __name__ == "__main__":
    sys.exit(main())
