#!/usr/bin/env python3
"""
Run a promptpack/queue.json against a local ComfyUI instance.

Usage:
  python comfy_batch.py --queue queue.json --out ../art/ep001 \
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
