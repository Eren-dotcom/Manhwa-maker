"""
Strip compositor: panels -> vertical scroll strip -> platform tiles.

Why this exists: image models do not obey pixel budgets, cannot assemble a
6000px scroll, cannot letter, and cannot slice a strip into <=1280px tiles
without cutting a face in half. All of that is deterministic geometry, so it
lives here instead of in a prompt. See references/01-pipeline.md.
"""
from __future__ import annotations

import html
import json
import math
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .lettering import Letterer, edge_energy
from .project import Project, save_json
from .specs import PACING_GAPS, SHOT_PRESETS, find_fonts

WORDS_PER_MINUTE = 200


@dataclass
class Options:
    width: int | None = None
    tile_height: int | None = None
    out_dir: Path | None = None
    no_art: bool = False
    no_letter: bool = False
    annotate: bool = False
    format: str = "png"          # png | jpg | both
    quality: int = 92
    bg: str | None = None
    tile_search: int = 320       # how far above the hard cut we look for a calm row


@dataclass
class PanelBox:
    panel: dict
    rect: tuple[int, int, int, int]
    art: Path | None
    placeholder: bool
    bubbles: list = field(default_factory=list)

    @property
    def w(self):
        return self.rect[2] - self.rect[0]

    @property
    def h(self):
        return self.rect[3] - self.rect[1]


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = (h or "#ffffff").lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore


def _panel_height(panel: dict, content_w: int, scale: float, art_path: Path | None) -> int:
    if panel.get("height"):
        return int(round(float(panel["height"]) * scale))
    if art_path and panel.get("fit", "crop") == "width":
        with Image.open(art_path) as im:
            return max(80, int(round(content_w * im.height / im.width)))
    if art_path:
        with Image.open(art_path) as im:
            return max(80, int(round(content_w * im.height / im.width)))
    shot = SHOT_PRESETS.get(panel.get("shot", "medium"), {})
    ar = float(shot.get("ar", 1.3))
    return int(round(content_w / max(0.4, ar)))


def _gap_after(panel: dict, scale: float) -> int:
    if panel.get("gap_after") is not None:
        return int(round(float(panel["gap_after"]) * scale))
    pace = panel.get("pace", "normal")
    return int(round(PACING_GAPS.get(pace, PACING_GAPS["normal"]) * scale))


def _paste_art(canvas: Image.Image, art_path: Path, box: tuple[int, int, int, int],
               fit: str, bias: str, radius: int) -> None:
    x0, y0, x1, y1 = box
    tw, th = x1 - x0, y1 - y0
    with Image.open(art_path) as raw:
        img = raw.convert("RGBA")
    if fit == "contain":
        img = img.copy()
        img.thumbnail((tw, th), Image.Resampling.LANCZOS)
        px = x0 + (tw - img.width) // 2
        py = y0 + (th - img.height) // 2
    else:  # cover / crop
        scale = max(tw / img.width, th / img.height)
        nw, nh = max(tw, int(math.ceil(img.width * scale))), max(th, int(math.ceil(img.height * scale)))
        img = img.resize((nw, nh), Image.Resampling.LANCZOS)
        if bias == "top":
            oy = 0
        elif bias == "bottom":
            oy = nh - th
        else:
            oy = (nh - th) // 2
        ox = (nw - tw) // 2
        img = img.crop((ox, oy, ox + tw, oy + th))
        px, py = x0, y0
    if radius > 0:
        mask = Image.new("L", img.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius=radius, fill=255)
        img.putalpha(Image.composite(img.getchannel("A"), Image.new("L", img.size, 0), mask))
    canvas.paste(img, (px, py), img)


def _draw_placeholder(canvas: Image.Image, box: tuple[int, int, int, int], panel: dict,
                      font_path: str, scale: float) -> None:
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(canvas)
    d.rectangle(box, fill="#f4f4f6", outline="#c9ccd4", width=max(1, int(round(2 * scale))))
    step = max(10, int(20 * scale))
    for x in range(x0, x1, step * 2):  # dashed feel
        d.line([(x, y0), (min(x + step, x1), y0)], fill="#c9ccd4", width=max(1, int(round(2 * scale))))
        d.line([(x, y1), (min(x + step, x1), y1)], fill="#c9ccd4", width=max(1, int(round(2 * scale))))
    pad = max(8, int(14 * scale))
    size_l = max(10, int(round(15 * scale)))
    size_s = max(9, int(round(12 * scale)))
    f_l = ImageFont.truetype(font_path, size_l)
    f_s = ImageFont.truetype(font_path, size_s)
    d.text((x0 + pad, y0 + pad), panel.get("id", "?"), font=f_l, fill="#2b2f38")
    tags = f"{panel.get('shot', '')} · {panel.get('beat', '')} · {panel.get('pace', 'normal')}"
    d.text((x0 + pad, y0 + pad + size_l + int(4 * scale)), tags, font=f_s, fill="#7a8090")
    action = (panel.get("action") or "").strip()
    if action:
        fw = f_s
        max_w = (x1 - x0) - 2 * pad
        words, lines, cur = action.split(), [], ""
        for w in words:
            t = f"{cur} {w}".strip()
            if d.textlength(t, font=fw) <= max_w or not cur:
                cur = t
            else:
                lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        ty = y0 + (y1 - y0) / 2 - len(lines) * (size_s * 1.25) / 2
        for i, ln in enumerate(lines[:6]):
            d.text(((x0 + x1) / 2, ty + i * size_s * 1.25), ln, font=fw, fill="#565d6b", anchor="mm")


def _annotate(canvas: Image.Image, box, panel, font_path: str, scale: float):
    d = ImageDraw.Draw(canvas, "RGBA")
    x0, y0, x1, y1 = box
    f = ImageFont.truetype(font_path, max(11, int(round(16 * scale))))
    label = f"{panel.get('id','?')} · {panel.get('shot','')} · {panel.get('beat','')} · {x1-x0}x{y1-y0}"
    tw = d.textlength(label, font=f)
    d.rectangle((x0, y0, x0 + tw + 16, y0 + 26), fill=(0, 0, 0, 150))
    d.text((x0 + 8, y0 + 5), label, font=f, fill=(255, 235, 120, 255))


# --------------------------------------------------------------------------- #
# main entry
# --------------------------------------------------------------------------- #
def assemble(project: Project, ep_no: int, ep: dict, opts: Options) -> dict:
    plat = project.platform
    geo = dict(project.geometry)
    W = int(opts.width or geo.get("width") or plat["width"])
    scale = W / 800.0
    sm = int(round(geo.get("side_margin", 40) * scale))
    top_m = int(round(geo.get("top_margin", 60) * scale))
    bot_m = int(round(geo.get("bottom_margin", 60) * scale))
    bg = hex_to_rgb(opts.bg or geo.get("bg", "#ffffff"))
    radius = int(round(geo.get("corner_radius", 0) * scale))
    content_w = W - 2 * sm

    panels = ep.get("panels", [])
    if not panels:
        raise ValueError(f"episode {ep_no} has no panels")

    # ---- pass 1: geometry ---- #
    boxes: list[PanelBox] = []
    y = top_m
    for p in panels:
        art = None if opts.no_art else project.panel_image_path(ep_no, p.get("id", "p000"), p.get("image"))
        bleed = bool(p.get("bleed"))
        px0 = 0 if bleed else sm
        pw = W if bleed else content_w
        ph = _panel_height(p, pw, scale, art)
        box = PanelBox(panel=p, rect=(px0, y, px0 + pw, y + ph), art=art, placeholder=art is None)
        boxes.append(box)
        y += ph + _gap_after(p, scale)
    y -= _gap_after(panels[-1], scale)
    total_h = y + bot_m

    canvas = Image.new("RGB", (W, total_h), bg)

    # ---- pass 2: art ---- #
    fonts = find_fonts(project.root, project.series.get("lettering", {}).get("fonts"))
    for b in boxes:
        if b.art:
            _paste_art(canvas, b.art, b.rect, b.panel.get("fit", "crop"),
                       b.panel.get("crop_bias", "center"), radius)
        else:
            _draw_placeholder(canvas, b.rect, b.panel, fonts["regular"], scale)
        frame = b.panel.get("frame") or geo.get("frame", "none")
        if frame in ("border", "hairline"):
            lw = max(1, int(round((3 if frame == "border" else 1) * scale)))
            ImageDraw.Draw(canvas).rectangle(b.rect, outline="#111111", width=lw)

    # ---- pass 3: lettering ---- #
    letter_stats = {"bubbles": 0, "words": 0, "sfx": 0}
    if not opts.no_letter:
        let_cfg = project.series.get("lettering", {})
        letterer = Letterer(
            fonts=fonts,
            base_size=int(let_cfg.get("base_font_size", 30)),
            scale=scale,
            caps=bool(let_cfg.get("caps", False)),
            max_words=int(let_cfg.get("max_words_per_bubble", 30)),
            max_width_ratio=float(let_cfg.get("bubble_max_width_ratio", 0.62)),
        )
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        for b in boxes:
            dlg = b.panel.get("dialogue") or []
            if not dlg:
                continue
            energy = edge_energy(canvas.crop(b.rect))
            occupied: list = []
            for d in dlg:
                info = letterer.draw_dialogue(overlay, b.rect, d, energy, occupied)
                if not info:
                    continue
                b.bubbles.append(info)
                letter_stats["bubbles"] += 1
                letter_stats["words"] += len(str(info.get("text", "")).split())
                if info.get("style") == "sfx":
                    letter_stats["sfx"] += 1
        canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")

    if opts.annotate:
        for b in boxes:
            _annotate(canvas, b.rect, b.panel, fonts["regular"], scale)

    # ---- pass 4: output ---- #
    out_dir = Path(opts.out_dir) if opts.out_dir else project.root / "output" / f"ep{ep_no:03d}"
    out_dir.mkdir(parents=True, exist_ok=True)
    strip_path = out_dir / f"strip-full.{ 'jpg' if opts.format == 'jpg' else 'png'}"
    if opts.format == "jpg":
        canvas.save(strip_path, quality=opts.quality, subsampling=1)
    else:
        canvas.save(strip_path)

    tile_h = int(opts.tile_height or plat["tile_max_h"])
    cuts = _tile_cuts(canvas, tile_h, bg, opts.tile_search)
    tiles_meta = _write_tiles(canvas, cuts, out_dir, ep_no, plat, opts)

    words = sum(len(str(d.get("text", "")).split())
                for b in boxes for d in (b.panel.get("dialogue") or []))
    est_seconds = words / (WORDS_PER_MINUTE / 60.0) + len(boxes) * 1.15

    manifest = {
        "series": project.series.get("title"),
        "episode": ep_no,
        "episode_title": ep.get("title"),
        "platform": plat["key"],
        "platform_label": plat.get("label"),
        "width": W,
        "total_height": total_h,
        "panels": len(boxes),
        "tiles": tiles_meta,
        "tile_count": len(tiles_meta),
        "tile_height_cap": tile_h,
        "total_bytes": sum(t["bytes"] for t in tiles_meta),
        "words": words,
        "est_read_seconds": round(est_seconds, 1),
        "est_read_screens": round(total_h / 1280, 1),
        "lettering": letter_stats,
        "placeholders": [b.panel.get("id") for b in boxes if b.placeholder],
        "gap_profile": [{"id": b.panel.get("id"), "pace": b.panel.get("pace", "normal"),
                         "gap_after": _gap_after(b.panel, scale)} for b in boxes[:-1]],
        "ai_disclosure": ep.get("ai_disclosure") or project.series.get("ai_disclosure"),
    }
    save_json(out_dir / "manifest.json", manifest)
    save_json(out_dir / "layout.json", {
        "width": W, "total_height": total_h,
        "panels": [{"id": b.panel.get("id"), "rect": list(b.rect), "art": str(b.art) if b.art else None,
                    "placeholder": b.placeholder,
                    "bubbles": [{"rect": [round(v) for v in bu.get("rect", ())], "style": bu.get("style"),
                                 "text": bu.get("text"), "font_size": bu.get("font_size"),
                                 "lines": bu.get("lines")} for bu in b.bubbles]} for b in boxes],
        "tiles": tiles_meta,
    })
    (out_dir / "preview.html").write_text(
        preview_html(manifest, ep, project.series, out_dir), encoding="utf-8")
    _write_upload_readme(out_dir, manifest, ep, project.series)
    return manifest


# --------------------------------------------------------------------------- #
# slicing
# --------------------------------------------------------------------------- #
def _row_ink(canvas: Image.Image, y: int, bg, step: int = 6) -> int:
    row = canvas.crop((0, y, canvas.width, y + 1))
    px = list(row.getdata())[::step]
    br, bgc, bb = bg
    n = 0
    for p in px:
        if abs(p[0] - br) + abs(p[1] - bgc) + abs(p[2] - bb) > 45:
            n += 1
    return n


def _tile_cuts(canvas: Image.Image, tile_h: int, bg, search: int) -> list[int]:
    """Cut points that avoid slicing through art: prefer the emptiest row near the cap."""
    H = canvas.height
    cuts = [0]
    y = 0
    guard = 0
    while H - y > tile_h and guard < 5000:
        guard += 1
        target = y + tile_h
        lo = max(y + int(tile_h * 0.55), target - max(0, search))
        best_y, best_ink = target, None
        for yy in range(lo, target + 1, 2):
            ink = _row_ink(canvas, min(yy, H - 1), bg)
            if best_ink is None or ink < best_ink or (ink == best_ink and yy > best_y):
                best_ink, best_y = ink, yy
            if ink == 0 and yy >= lo + 40:
                break
        y = best_y
        cuts.append(y)
    cuts.append(H)
    return cuts


def _write_tiles(canvas: Image.Image, cuts: list[int], out_dir: Path, ep_no: int,
                 plat: dict, opts: Options) -> list[dict]:
    up = out_dir / "upload"
    up.mkdir(parents=True, exist_ok=True)
    meta = []
    for i in range(len(cuts) - 1):
        y0, y1 = cuts[i], cuts[i + 1]
        tile = canvas.crop((0, y0, canvas.width, y1))
        idx = i + 1
        name = f"ep{ep_no:03d}_{idx:03d}"
        png_path = up / f"{name}.png"
        tile.save(png_path)
        chosen, chosen_ext = png_path, "png"
        want_jpg = opts.format in ("jpg", "both")
        need_jpg = plat.get("tile_max_bytes") and png_path.stat().st_size > plat["tile_max_bytes"]
        if want_jpg or need_jpg:
            jpg_path = up / f"{name}.jpg"
            tile.save(jpg_path, quality=opts.quality, subsampling=1, optimize=True)
            if need_jpg and jpg_path.stat().st_size < png_path.stat().st_size:
                chosen, chosen_ext = jpg_path, "jpg"
            if opts.format == "png" and not need_jpg:
                jpg_path.unlink(missing_ok=True)
            elif want_jpg and not need_jpg and opts.format == "jpg":
                png_path.unlink(missing_ok=True)
                chosen, chosen_ext = jpg_path, "jpg"
        meta.append({
            "index": idx, "file": f"upload/{chosen.name}", "format": chosen_ext,
            "width": tile.width, "height": tile.height,
            "y0": y0, "y1": y1, "bytes": chosen.stat().st_size,
        })
    return meta


# --------------------------------------------------------------------------- #
# preview + notes
# --------------------------------------------------------------------------- #
def preview_html(manifest: dict, ep: dict, series: dict, out_dir: Path) -> str:
    tiles = "".join(
        f'\n      <img src="{html.escape(t["file"])}" alt="tile {t["index"]}" loading="lazy">'
        for t in manifest["tiles"])
    esc = html.escape
    mins = manifest["est_read_seconds"] / 60.0
    disclosure = manifest.get("ai_disclosure") or ""
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(str(series.get('title','')))} - Ep {manifest['episode']}</title>
<style>
  :root {{ color-scheme: dark; }}
  * {{ box-sizing: border-box; }}
  body {{ margin:0; background:#0b0d12; color:#e8ecf4;
         font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }}
  header {{ position:sticky; top:0; z-index:5; background:rgba(11,13,18,.86);
            backdrop-filter:blur(8px); border-bottom:1px solid #1e2431; padding:14px 18px; }}
  h1 {{ margin:0 0 2px; font-size:17px; letter-spacing:.2px; }}
  .sub {{ color:#8b95a8; font-size:13px; }}
  .chips {{ display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }}
  .chip {{ background:#141a25; border:1px solid #232c3d; color:#a8b4c8;
           border-radius:999px; padding:3px 10px; font-size:12px; }}
  .chip b {{ color:#e8ecf4; font-weight:600; }}
  .wrap {{ display:flex; justify-content:center; padding:26px 14px 80px; }}
  .phone {{ width:{manifest['width']}px; max-width:100%; background:#fff; border-radius:14px;
            overflow:hidden; box-shadow:0 24px 70px rgba(0,0,0,.6); }}
  .phone img {{ display:block; width:100%; height:auto; }}
  .foot {{ text-align:center; color:#5f6b7f; font-size:12px; padding:0 20px 40px; }}
  .disc {{ max-width:760px; margin:0 auto 30px; background:#121722; border:1px solid #202939;
           border-radius:10px; padding:12px 14px; color:#93a0b5; font-size:12.5px; }}
  .disc b {{ color:#cfd8e6; }}
</style></head>
<body>
<header>
  <h1>{esc(str(series.get('title','')))} <span style="color:#4b5769">/</span> Ep {manifest['episode']} - {esc(str(ep.get('title','')))}</h1>
  <div class="sub">{esc(str(series.get('logline','')))}</div>
  <div class="chips">
    <span class="chip"><b>{manifest['width']}px</b> width</span>
    <span class="chip"><b>{manifest['total_height']:,}px</b> scroll</span>
    <span class="chip"><b>{manifest['panels']}</b> panels</span>
    <span class="chip"><b>{manifest['tile_count']}</b> tiles</span>
    <span class="chip">~<b>{mins:.1f} min</b> read</span>
    <span class="chip">{esc(str(manifest.get('platform_label','')))}</span>
  </div>
</header>
<div class="wrap"><div class="phone">{tiles}
</div></div>
<div class="disc"><b>AI disclosure.</b> {esc(disclosure)}</div>
<div class="foot">rendered by manhwa.py - strip, tiles, manifest and QC in this folder</div>
</body></html>
"""


def _write_upload_readme(out_dir: Path, manifest: dict, ep: dict, series: dict) -> None:
    lines = [
        f"# Upload sheet - {series.get('title')} ep {manifest['episode']}",
        "",
        f"Platform: **{manifest.get('platform_label')}**  |  width **{manifest['width']}px**  |  "
        f"tiles **{manifest['tile_count']}**  |  total **{manifest['total_bytes']/1048576:.2f} MB**",
        "",
        "Upload the files in `upload/` in numeric order. Every tile is already sized to the",
        "platform cap; the cut points were chosen to land in empty gutter space so no face or",
        "speech bubble is split across two images.",
        "",
        "| # | file | size | height |",
        "|---|------|------|--------|",
    ]
    for t in manifest["tiles"]:
        lines.append(f"| {t['index']} | `{Path(t['file']).name}` | {t['bytes']/1024:.0f} KB | {t['height']}px |")
    lines += [
        "",
        "## Episode metadata",
        f"- title: {ep.get('title')}",
        f"- description: {ep.get('end_note','')}",
        f"- audio/scroll length: {manifest['total_height']:,}px (~{manifest['est_read_screens']} phone screens)",
        "",
        "## AI disclosure (paste into the episode description)",
        f"> {manifest.get('ai_disclosure')}",
        "",
    ]
    (out_dir / "UPLOAD.md").write_text("\n".join(lines), encoding="utf-8")
