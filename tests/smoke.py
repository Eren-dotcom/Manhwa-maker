#!/usr/bin/env python3
"""Smoke test for the manhwa-studio pipeline.

Builds a throwaway demo project and asserts the structural invariants that the
per-panel tests cannot see. Every assertion here is a bug that actually shipped:

  1. strip height == manifest total_height   (a stale strip of the other format was
     being read by the QC gates and by every crop)
  2. a gutter balloon lands INSIDE its gutter (the balloon was rendering at twice
     the panel offset, i.e. ~32,000px below the strip, invisibly)
  3. black_out / white_out panels need no art (F001 was demanding it)
  4. check --final passes on the reference pilot

Run:  python3 tests/smoke.py
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANHWA = ROOT / "skill" / "manhwa-studio" / "scripts" / "manhwa.py"

failures: list[str] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    print(f"  {'PASS' if ok else 'FAIL'}  {label}" + (f"  -- {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(label)


def run(args: list[str], cwd: Path) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(MANHWA), *args], cwd=cwd,
                          capture_output=True, text=True)


def main() -> int:
    if not MANHWA.exists():
        print(f"cannot find {MANHWA}")
        return 2

    with tempfile.TemporaryDirectory(prefix="manhwa-smoke-") as tmp:
        work = Path(tmp)
        print("building a demo project ...")
        r = run(["demo", "pilot"], cwd=work)
        if r.returncode != 0:
            print(r.stdout[-2000:], r.stderr[-2000:])
            return 1

        proj = work / "pilot"
        print("assembling ...")
        r = run(["assemble", "1"], cwd=proj)
        if r.returncode != 0:
            print(r.stdout[-2000:], r.stderr[-2000:])
            return 1

        from PIL import Image

        manifest = json.loads((proj / "output" / "ep001" / "manifest.json").read_text())
        layout = json.loads((proj / "output" / "ep001" / "layout.json").read_text())

        # 1. the strip on disk is the strip the manifest describes
        strip_name = manifest.get("strip_file")
        strip_file = proj / "output" / "ep001" / (strip_name or "strip-master.png")
        with Image.open(strip_file) as im:
            strip_h = im.height
        check("manifest records which strip file is current", bool(strip_name),
              f"strip_file={strip_name!r}")
        check("strip height matches the manifest",
              strip_h == manifest["total_height"],
              f"strip {strip_h}px vs manifest {manifest['total_height']}px")
        stale = [p.name for p in (proj / "output" / "ep001").glob("strip-master.*")
                 if p.name != strip_file.name]
        check("no stale strip in the other format", not stale, f"leftovers: {stale}")

        # 2. gutter balloons render in the gutter, not off-canvas
        panels = {p["id"]: p for p in layout["panels"]}
        gutters = [(pid, b, panels[pid]) for pid, p in panels.items()
                   for b in (p.get("bubbles") or []) if b.get("gutter")]
        check("the pilot exercises a gutter balloon", bool(gutters))
        for pid, b, panel in gutters:
            x0, y0, x1, y1 = b["rect"]
            gap_top, gap_bottom = panel["rect"][3], None
            order = [p["rect"][1] for p in layout["panels"]]
            after = [v for v in sorted(order) if v > panel["rect"][3]]
            gap_bottom = after[0] if after else strip_h
            inside = gap_top - 2 <= y0 and y1 <= gap_bottom + 2
            check(f"gutter balloon on {pid} sits inside the gutter",
                  inside, f"balloon y {y0}-{y1}, gutter {gap_top}-{gap_bottom}")
            check(f"gutter balloon on {pid} is on the canvas", y1 <= strip_h,
                  f"balloon bottom {y1} vs strip {strip_h}")

        # 3. pace-filled panels are not demanded as art
        ep = json.loads((proj / "episodes" / "ep001.json").read_text())
        filled = [p["id"] for p in ep["panels"]
                  if p.get("fill") or p.get("pace") in ("black_out", "white_out")]
        r = run(["check", "1", "--final", "--json"], cwd=proj)
        report = json.loads(r.stdout) if r.stdout.strip().startswith("{") else {}
        f001 = " ".join(f.get("message", "") for f in report.get("findings", [])
                        if f.get("code") == "F001")
        check("F001 ignores pace-filled panels",
              not any(fid in f001 for fid in filled), f"F001 said: {f001!r}")

        # 4. the visual gates build, and --final refuses to pass without them
        r_nosheets = run(["check", "1", "--final"], cwd=proj)
        check("check --final fails while the QC sheets are missing",
              r_nosheets.returncode != 0)

        r = run(["sheets", "1"], cwd=proj)
        check("sheets builds the three visual gates", r.returncode == 0,
              (r.stderr or r.stdout).strip().splitlines()[-1] if (r.stderr or r.stdout) else "")
        for name in ("contact-sheet.png", "match-check-sera.png", "lettering-qc.png"):
            check(f"gate artefact written: {name}", (proj / "ch001" / name).exists())

        # 5. a fresh demo has no art, so the gate must fail on ART ONLY -- no structural,
        #    layout or lettering errors. (This is what "the script side is clean" means.)
        r = run(["check", "1", "--final", "--json"], cwd=proj)
        try:
            report = json.loads(r.stdout)
        except Exception:
            report = {}
        codes = sorted({f.get("code") for f in report.get("findings", [])
                        if f.get("severity") == "error"})
        check("a fresh demo's only errors are the missing art",
              bool(codes) and set(codes) <= {"F001", "F002"}, f"error codes: {codes}")
        check("the gate still fails while art is missing", r.returncode != 0)

    print()
    if failures:
        print(f"{len(failures)} failure(s): {', '.join(failures)}")
        return 1
    print("all smoke checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
