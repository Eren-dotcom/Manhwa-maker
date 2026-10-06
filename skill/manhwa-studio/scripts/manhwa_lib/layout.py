"""
Strip compositor: panels -> master strip -> web export + platform tiles + PDF.

Two widths, one pass (reference spec §6):
  * MASTER (default 1080px) -- everything is drawn and lettered here.
  * EXPORT (platform width, 800 for WEBTOON) -- the master is sliced into pieces
    no taller than `tile_max_h * master/export`, then downscaled to the export
    width, so every uploaded tile is exactly at spec AND sharper than if it had
    been drawn at 800.

Also: reserves gutter space for gutter balloons, applies scene tints and panel
effects (speed lines, flashes, smears), handles white-out/black-out beats, and
writes the delivery PDF.
"""
from __future__ import annotations

import html
import json
import math
import shutil
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from . import effects as fx
from .lettering import Letterer, edge_energy
from .project import Project, save_json
from .specs import MASTER_WIDTH, PACING_GAPS, SHOT_PRESETS, find_fonts, scale_for

WORDS_PER_MINUTE = 200
SEC_PER_SCREEN = 7.5      # a phone screen of art at a normal reading scroll
SEC_PER_PANEL = 1.15      # beat dwell on top of that


@dataclass
class Options:
    width: int | None = None            # master width (default 1080)
    export_width: int | None = None     # platform upload width (default = platform)
    tile_height: int | None = None      # export tile height cap (default = platform)
    out_dir: Path | None = None
    no_art: bool = False
    no_letter: bool = False
    annotate: bool = False
    format: str = "png"                 # png | jpg | both
    quality: int = 92
    bg: str | None = None
    tile_search: int = 320              # master px above the cap to hunt for a calm row
    pdf: bool = True
    per_panel: bool = True              # write chNN/panels + chNN/lettered crops


@dataclass
class PanelBox:
    panel: dict
    rect: tuple[int, int, int, int]
    art: Path | None
    placeholder: bool
    fill: str | None = None
    bubbles: list = field(default_factory=list)
    fx_applied: list = field(default_factory=list)

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
    if art_path:
        with Image.open(art_path) as im:
            return max(80, int(round(content_w * im.height / im.width)))
    shot = SHOT_PRESETS.get(panel.get("shot", "medium"), {})
    ar = float(shot.get("ar", 0.92))
    return int(round(content_w / max(0.2, ar)))


def _gap_after(panel: dict, scale: float) -> int:
    if panel.get("gap_after") is not None:
        return int(round(float(panel["gap_after"]) * scale))
    pace = panel.get("pace", "normal")
    return int(round(PACING_GAPS.get(pace, PACING_GAPS["normal"]) * scale))


def _paste_art(canvas: Image.Image, art_path: Path, box, fit: str, bias: str, radius: int) -> None:
    x0, y0, x1, y1 = box
    tw, th = x1 - x0, y1 - y0
    with Image.open(art_path) as raw:
        img = raw.convert("RGBA")
    if fit == "contain":
        img = img.copy()
        img.thumbnail((tw, th), Image.Resampling.LANCZOS)
        px, py = x0 + (tw - img.width) // 2, y0 + (th - img.height) // 2
    else:  # cover / crop
        scale = max(tw / img.width, th / img.height)
        nw = max(tw, int(math.ceil(img.width * scale)))
        nh = max(th, int(math.ceil(img.height * scale)))
        img = img.resize((nw, nh), Image.Resampling.LANCZOS)
        oy = 0 if bias == "top" else (nh - th if bias == "bottom" else (nh - th) // 2)
        ox = (nw - tw) // 2
        img = img.crop((ox, oy, ox + tw, oy + th))
        px, py = x0, y0
    if radius > 0:
        mask = Image.new("L", img.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1),
                                               radius=radius, fill=255)
        img.putalpha(Image.composite(img.getchannel("A"), Image.new("L", img.size, 0), mask))
    canvas.paste(img, (px, py), img)


def _draw_placeholder(canvas: Image.Image, box, panel: dict, font_path: str, scale: float) -> None:
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(canvas)
    d.rectangle(box, fill="#f4f4f6", outline="#c9ccd4", width=max(1, int(round(2 * scale))))
    step = max(10, int(20 * scale))
    for x in range(x0, x1, step * 2):
        d.line([(x, y0), (min(x + step, x1), y0)], fill="#c9ccd4", width=max(1, int(round(2 * scale))))
        d.line([(x, y1), (min(x + step, x1), y1)], fill="#c9ccd4", width=max(1, int(round(2 * scale))))
    pad = max(8, int(14 * scale))
    size_l, size_s = max(10, int(round(15 * scale))), max(9, int(round(12 * scale)))
    f_l = ImageFont.truetype(font_path, size_l)
    f_s = ImageFont.truetype(font_path, size_s)
    d.text((x0 + pad, y0 + pad), panel.get("id", "?"), font=f_l, fill="#2b2f38")
    d.text((x0 + pad, y0 + pad + size_l + int(4 * scale)),
           f"{panel.get('shot','')} · {panel.get('beat','')} · {panel.get('pace','normal')}",
           font=f_s, fill="#7a8090")
    action = (panel.get("action") or "").strip()
    if action:
        max_w = (x1 - x0) - 2 * pad
        words, lines, cur = action.split(), [], ""
        for w in words:
            t = f"{cur} {w}".strip()
            if d.textlength(t, font=f_s) <= max_w or not cur:
                cur = t
            else:
                lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        ty = y0 + (y1 - y0) / 2 - len(lines) * (size_s * 1.25) / 2
        for i, ln in enumerate(lines[:6]):
            d.text(((x0 + x1) / 2, ty + i * size_s * 1.25), ln, font=f_s, fill="#565d6b", anchor="mm")


def _draw_title_card(canvas: Image.Image, box, series: dict, panel: dict, ep: dict,
                     fonts: dict, scale: float) -> None:
    """The chapter title card: first thing in the scroll, before any panel."""
    tc = series.get("title_card") or {}
    x0, y0, x1, y1 = box
    title = str(tc.get("title") or series.get("title") or "")
    sub = str(tc.get("subtitle") or f"CHAPTER {ep.get('episode', 1)} — {ep.get('title', '')}")
    ink = tc.get("ink") or "#f2ede0"
    accent = tc.get("accent") or (series.get("art_direction", {}).get("palette", {}) or {}).get(
        "accent", "#e0603b")
    f_big = ImageFont.truetype(fonts.get("bold") or fonts["regular"], int(96 * scale))
    f_sm = ImageFont.truetype(fonts.get("condensed") or fonts["regular"], int(30 * scale))
    d = ImageDraw.Draw(canvas)
    cx = (x0 + x1) / 2
    d.text((cx, y0 + (y1 - y0) * 0.46), title, font=f_big, fill=ink, anchor="mm")
    d.line([(cx - 120 * scale, y0 + (y1 - y0) * 0.545), (cx + 120 * scale, y0 + (y1 - y0) * 0.545)],
           fill=accent, width=max(2, int(6 * scale)))
    d.text((cx, y0 + (y1 - y0) * 0.63), sub, font=f_sm, fill=ink, anchor="mm")


def _annotate(canvas: Image.Image, box, panel, font_path: str, scale: float):
    d = ImageDraw.Draw(canvas, "RGBA")
    x0, y0, x1, y1 = box
    f = ImageFont.truetype(font_path, max(11, int(round(16 * scale))))
    label = f"{panel.get('id','?')} · {panel.get('shot','')} · {panel.get('beat','')} · {x1-x0}x{y1-y0}"
    tw = d.textlength(label, font=f)
    d.rectangle((x0, y0, x0 + tw + 16, y0 + 26), fill=(0, 0, 0, 150))
    d.text((x0 + 8, y0 + 5), label, font=f, fill=(255, 235, 120, 255))


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #
def assemble(project: Project, ep_no: int, ep: dict, opts: Options) -> dict:
    plat = project.platform
    geo = dict(project.geometry)
    W = int(opts.width or geo.get("width") or MASTER_WIDTH)
    EW = int(opts.export_width or plat["width"])
    scale = scale_for(W)                      # craft numbers are authored at 800
    exp_scale = EW / float(W)                 # master -> export
    sm = int(round(geo.get("side_margin", 0) * scale))
    top_m = int(round(geo.get("top_margin", 60) * scale))
    bot_m = int(round(geo.get("bottom_margin", 120) * scale))
    bg = hex_to_rgb(opts.bg or geo.get("bg", "#ffffff"))
    radius = int(round(geo.get("corner_radius", 0) * scale))
    content_w = W - 2 * sm

    panels = list(ep.get("panels", []))
    if not panels:
        raise ValueError(f"episode {ep_no} has no panels")
    tc = project.series.get("title_card") or {}
    if tc.get("enabled"):
        panels = [{
            "id": "title", "shot": "title_card", "beat": "engine", "pace": "normal",
            "bleed": True, "fill": tc.get("bg") or "#0d1220",
            "height": float(tc.get("height", 700)), "characters": [], "dialogue": [],
            "_title_card": True, "_actions": 1,
        }] + panels

    fonts = find_fonts(project.root, project.series.get("lettering", {}).get("fonts"))
    let_cfg = project.series.get("lettering", {})
    letterer = Letterer(
        fonts=fonts,
        base_size=int(let_cfg.get("base_font_size", 40)),
        scale=scale,
        caps=bool(let_cfg.get("caps", False)),
        max_words=int(let_cfg.get("max_words_per_bubble", 20)),
        max_width_ratio=float(let_cfg.get("bubble_max_width_ratio", 0.72)),
        voices=let_cfg.get("voices"),
    )

    # ---- pass 0: resolve art + reserve gutter space for gutter balloons ---- #
    gutter_need: dict[int, int] = {}
    for i, p in enumerate(panels):
        gw = content_w
        need = 0
        for d in (p.get("dialogue") or []):
            if str(d.get("place", "")).lower() in ("gutter", "gutter_after") and d.get("text"):
                _, bh = letterer.measure(str(d["text"]), d.get("style", "speech"), gw,
                                         float(d.get("size_scale", 1) or 1))
                need = max(need, bh + 26 * scale)
        if need:
            gutter_need[i] = int(round(need))

    boxes: list[PanelBox] = []
    y = top_m
    for i, p in enumerate(panels):
        art = None if opts.no_art else project.panel_image_path(ep_no, p.get("id", "p000"), p.get("image"))
        bleed = bool(p.get("bleed")) or bool(SHOT_PRESETS.get(p.get("shot", ""), {}).get("bleed"))
        px0 = 0 if bleed else sm
        pw = W if bleed else content_w
        fill = p.get("fill") or (("%s" % p.get("pace")) if p.get("pace") in ("white_out", "black_out") else None)
        if fill in ("white_out", "#ffffff", "white"):
            fill = "#ffffff"
        elif fill in ("black_out", "#000000", "black"):
            fill = "#000000"
        ph = _panel_height(p, pw, scale, art) if not fill else int(p.get("height", 900) * scale if p.get("height") else 900 * scale)
        box = PanelBox(panel=p, rect=(px0, y, px0 + pw, y + ph), art=art,
                       placeholder=(art is None and not fill), fill=fill)
        boxes.append(box)
        gap = _gap_after(p, scale)
        gap = max(gap, gutter_need.get(i, 0))
        y += ph + gap
    last_gap = _gap_after(panels[-1], scale)
    total_h = y - last_gap + bot_m

    canvas = Image.new("RGB", (W, total_h), bg)

    # ---- pass 1: art, fills, scene tints, frames ----------------------- #
    scenes = project.series.get("scenes", {})
    for b in boxes:
        if b.panel.get("_title_card"):
            fx.solid_fill(canvas, b.rect, b.fill)
            _draw_title_card(canvas, b.rect, project.series, b.panel, ep, fonts, scale)
        elif b.fill:
            fx.solid_fill(canvas, b.rect, b.fill)
        elif b.art:
            _paste_art(canvas, b.art, b.rect, b.panel.get("fit", "crop"),
                       b.panel.get("crop_bias", "center"), radius)
        else:
            _draw_placeholder(canvas, b.rect, b.panel, fonts["regular"], scale)

        sc = scenes.get(b.panel.get("scene") or "")
        if sc:
            tint = b.panel.get("tint") or sc.get("tint")
            fx.scene_tint(canvas, b.rect, tint, float(sc.get("strength", 0.16)), sc.get("shadow"))

        specs = b.panel.get("fx") or []
        if isinstance(specs, str):
            specs = [specs]
        extra = []
        for tok in ([b.panel.get("pace")] if b.panel.get("pace") in ("white_out", "black_out") else []):
            pass
        b.fx_applied = fx.apply_panel_fx(canvas, b.rect, specs, scale, seed=abs(hash(b.panel.get("id", ""))) % 9999)

        frame = b.panel.get("frame") or geo.get("frame", "none")
        if frame in ("border", "hairline") and not b.fill:
            lw = max(1, int(round((3 if frame == "border" else 1) * scale)))
            ImageDraw.Draw(canvas).rectangle(b.rect, outline="#111111", width=lw)

    # ---- pass 2: lettering --------------------------------------------- #
    letter_stats = {"bubbles": 0, "words": 0, "sfx": 0, "gutter": 0, "prop": 0}
    placement_issues: list[dict] = []
    if not opts.no_letter:
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        for i, b in enumerate(boxes):
            dlg = b.panel.get("dialogue") or []
            if not dlg:
                continue
            energy = edge_energy(canvas.crop(b.rect)) if not b.fill else None
            occupied: list = []
            # region a gutter balloon may use: the gap AFTER this panel
            nxt = boxes[i + 1].rect[1] if i + 1 < len(boxes) else None
            gutter_rect = (b.rect[0], b.rect[3], b.rect[2], nxt) if nxt else None
            for d in dlg:
                info = letterer.draw_dialogue(overlay, b.rect, d, energy, occupied,
                                              gutter_rect=gutter_rect, panel_art=canvas)
                if not info:
                    continue
                b.bubbles.append(info)
                letter_stats["bubbles"] += 1
                words = len(str(info.get("text", "")).split())
                letter_stats["words"] += words
                if info.get("style") == "sfx":
                    letter_stats["sfx"] += 1
                if info.get("style") == "prop":
                    letter_stats["prop"] += 1
                if info.get("gutter"):
                    letter_stats["gutter"] += 1
                if int(info.get("font_size") or 0) * exp_scale < 20 and info.get("style") not in ("prop",):
                    placement_issues.append({"panel": b.panel.get("id"), "issue": "type too small",
                                             "size_export_px": round(int(info["font_size"]) * exp_scale, 1)})
        canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")

    if opts.annotate:
        for b in boxes:
            _annotate(canvas, b.rect, b.panel, fonts["regular"], scale)

    # ---- pass 3: output ------------------------------------------------ #
    out_dir = Path(opts.out_dir) if opts.out_dir else project.root / "output" / f"ep{ep_no:03d}"
    out_dir.mkdir(parents=True, exist_ok=True)
    master_path = out_dir / f"strip-master.{'jpg' if opts.format == 'jpg' else 'png'}"
    # a strip in the other format is a stale build: leaving it behind makes every gate
    # and every crop that resolves by filename validate the wrong image
    for stale in (out_dir / "strip-master.png", out_dir / "strip-master.jpg"):
        if stale != master_path and stale.exists():
            stale.unlink()
    if opts.format == "jpg":
        canvas.save(master_path, quality=opts.quality, subsampling=1)
    else:
        canvas.save(master_path)

    web = canvas.resize((EW, max(1, int(round(total_h * exp_scale)))), Image.Resampling.LANCZOS)
    web_path = out_dir / "strip-web.jpg"
    web.save(web_path, quality=max(80, opts.quality - 4), subsampling=1, optimize=True)

    tile_cap_export = int(opts.tile_height or plat["tile_max_h"])
    cap_master = max(160, int(tile_cap_export / max(0.01, exp_scale)))
    cuts = _tile_cuts(canvas, cap_master, bg, int(opts.tile_search / 800.0 * W / 800.0 * 1.0) or opts.tile_search)
    tiles_meta = _write_tiles(canvas, cuts, out_dir, ep_no, plat, opts, EW, tile_cap_export)

    pdf_path = None
    if opts.pdf:
        pdf_path = _write_pdf(canvas, out_dir, ep_no, project, W)

    per_panel = {}
    if opts.per_panel:
        per_panel = _write_per_panel(canvas, boxes, project, ep_no, ep)

    words = sum(len(str(d.get("text", "")).split())
                for b in boxes for d in (b.panel.get("dialogue") or []))
    screens = web.height / 1280.0
    est_seconds = (words / (WORDS_PER_MINUTE / 60.0)
                   + screens * SEC_PER_SCREEN
                   + len(boxes) * SEC_PER_PANEL)

    manifest = {
        "series": project.series.get("title"),
        "episode": ep_no,
        "episode_title": ep.get("title"),
        "platform": plat["key"],
        "platform_label": plat.get("label"),
        "master_width": W,
        "export_width": EW,
        "width": W,                      # kept for backward compatibility
        "total_height": total_h,
        "export_height": web.height,
        "panels": len(boxes),
        "tiles": tiles_meta,
        "tile_count": len(tiles_meta),
        "tile_height_cap": tile_cap_export,
        "total_bytes": sum(t["bytes"] for t in tiles_meta),
        "words": words,
        "est_read_seconds": round(est_seconds, 1),
        "est_read_screens": round(web.height / 1280, 1),
        "lettering": letter_stats,
        "placement_issues": placement_issues,
        "placeholders": [b.panel.get("id") for b in boxes if b.placeholder],
        "gutter_reserved": {panels[i].get("id"): v for i, v in gutter_need.items()},
        "gap_profile": [{"id": b.panel.get("id"), "pace": b.panel.get("pace", "normal"),
                         "gap_after_master": max(_gap_after(b.panel, scale), gutter_need.get(i, 0)),
                         "gap_after_export": round(max(_gap_after(b.panel, scale),
                                                       gutter_need.get(i, 0)) * exp_scale)}
                        for i, b in enumerate(boxes[:-1])],
        "fx": {b.panel.get("id"): b.fx_applied for b in boxes if b.fx_applied},
        "strip_file": master_path.name,
        "pdf": str(pdf_path.relative_to(project.root)) if pdf_path else None,
        "per_panel": per_panel,
        "ai_disclosure": ep.get("ai_disclosure") or project.series.get("ai_disclosure"),
    }
    save_json(out_dir / "manifest.json", manifest)
    save_json(out_dir / "layout.json", {
        "master_width": W, "export_width": EW, "total_height": total_h,
        "panels": [{"id": b.panel.get("id"), "rect": list(b.rect), "art": str(b.art) if b.art else None,
                    "placeholder": b.placeholder, "fill": b.fill,
                    "shot": b.panel.get("shot"), "beat": b.panel.get("beat"),
                    "pace": b.panel.get("pace"), "fx": b.fx_applied,
                    "bubbles": [{"rect": [round(v) for v in bu.get("rect", ())], "style": bu.get("style"),
                                 "text": bu.get("text"), "font_size": bu.get("font_size"),
                                 "lines": bu.get("lines"), "gutter": bu.get("gutter"),
                                 "tail": bu.get("tail"), "fx": bu.get("fx")} for bu in b.bubbles]}
                   for b in boxes],
        "tiles": tiles_meta,
    })
    (out_dir / "preview.html").write_text(preview_html(manifest, ep, project.series, out_dir), encoding="utf-8")
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
    """Cut points in the calmest row near the cap, so no face is bisected."""
    H = canvas.height
    cuts, y, guard = [0], 0, 0
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


def _write_tiles(canvas: Image.Image, cuts, out_dir: Path, ep_no: int, plat: dict,
                 opts: Options, export_width: int, tile_cap_export: int) -> list[dict]:
    up = out_dir / "upload"
    up.mkdir(parents=True, exist_ok=True)
    meta = []
    for i in range(len(cuts) - 1):
        y0, y1 = cuts[i], cuts[i + 1]
        tile = canvas.crop((0, y0, canvas.width, y1))
        if tile.width != export_width:
            h = max(1, int(round(tile.height * export_width / tile.width)))
            tile = tile.resize((export_width, h), Image.Resampling.LANCZOS)
        if tile.height > tile_cap_export:      # safety: never exceed the platform cap
            tile = tile.crop((0, 0, tile.width, tile_cap_export))
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
            elif opts.format == "jpg" and not need_jpg:
                png_path.unlink(missing_ok=True)
                chosen, chosen_ext = jpg_path, "jpg"
        meta.append({"index": idx, "file": f"upload/{chosen.name}", "format": chosen_ext,
                     "width": tile.width, "height": tile.height,
                     "y0": y0, "y1": y1, "bytes": chosen.stat().st_size})
    return meta


def _write_pdf(canvas: Image.Image, out_dir: Path, ep_no: int, project: Project, W: int) -> Path:
    """Delivery PDF: 1080x1920 pages (scaled to the master width)."""
    page_h = int(round(1920 * W / 1080.0))
    pages = []
    y = 0
    while y < canvas.height:
        box = canvas.crop((0, y, W, min(canvas.height, y + page_h)))
        page = Image.new("RGB", (W, page_h), (255, 255, 255))
        page.paste(box, (0, 0))
        pages.append(page)
        y += page_h
    name = f"{_slug(project.series.get('title', 'series'))}-ch{ep_no:03d}.pdf"
    delivery = out_dir / "delivery"
    delivery.mkdir(parents=True, exist_ok=True)
    path = delivery / name
    if pages:
        pages[0].save(path, save_all=True, append_images=pages[1:], resolution=150.0)
    # their convention: deliverables live in your_files/
    yf = project.root / "your_files"
    yf.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, yf / name)
    return path


def _write_per_panel(canvas: Image.Image, boxes, project: Project, ep_no: int, ep: dict) -> dict:
    ch_dir = project.root / f"ch{ep_no:03d}"
    raw_dir, let_dir = ch_dir / "panels", ch_dir / "lettered"
    raw_dir.mkdir(parents=True, exist_ok=True)
    let_dir.mkdir(parents=True, exist_ok=True)
    n_raw = n_let = 0
    for b in boxes:
        pid = b.panel.get("id", "p000")
        x0, y0, x1, y1 = b.rect
        canvas.crop((x0, y0, x1, y1)).save(let_dir / f"{pid}.png")
        n_let += 1
        if b.art:
            shutil.copy2(b.art, raw_dir / b.art.name)
            n_raw += 1
    return {"dir": f"ch{ep_no:03d}", "raw": n_raw, "lettered": n_let}


def _slug(text: str) -> str:
    keep = [c.lower() if c.isalnum() else "-" for c in str(text)]
    out = "".join(keep)
    while "--" in out:
        out = out.replace("--", "-")
    return out.strip("-") or "series"


# --------------------------------------------------------------------------- #
# preview + notes
# --------------------------------------------------------------------------- #
def preview_html(manifest: dict, ep: dict, series: dict, out_dir: Path) -> str:
    tiles = "".join(
        f'\n      <img src="{html.escape(str(Path(t["file"]).name))}" alt="tile {t["index"]}" loading="lazy">'
        for t in manifest["tiles"])
    esc = html.escape
    mins = manifest["est_read_seconds"] / 60.0
    disclosure = manifest.get("ai_disclosure") or ""
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(str(series.get('title','')))} - Ch {manifest['episode']}</title>
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
  .phone {{ width:{manifest['export_width']}px; max-width:100%; background:#fff; border-radius:14px;
            overflow:hidden; box-shadow:0 24px 70px rgba(0,0,0,.6); }}
  .phone img {{ display:block; width:100%; height:auto; }}
  .foot {{ text-align:center; color:#5f6b7f; font-size:12px; padding:0 20px 40px; }}
  .disc {{ max-width:760px; margin:0 auto 30px; background:#121722; border:1px solid #202939;
           border-radius:10px; padding:12px 14px; color:#93a0b5; font-size:12.5px; }}
  .disc b {{ color:#cfd8e6; }}
</style></head>
<body>
<header>
  <h1>{esc(str(series.get('title','')))} <span style="color:#4b5769">/</span> Ch {manifest['episode']} - {esc(str(ep.get('title','')))}</h1>
  <div class="sub">{esc(str(series.get('logline','')))}</div>
  <div class="chips">
    <span class="chip">master <b>{manifest['master_width']}px</b></span>
    <span class="chip">export <b>{manifest['export_width']}px</b></span>
    <span class="chip"><b>{manifest['total_height']:,}px</b> master scroll</span>
    <span class="chip"><b>{manifest['panels']}</b> panels</span>
    <span class="chip"><b>{manifest['tile_count']}</b> tiles</span>
    <span class="chip">~<b>{mins:.1f} min</b> read</span>
    <span class="chip">{esc(str(manifest.get('platform_label','')))}</span>
  </div>
</header>
<div class="wrap"><div class="phone">{tiles}
</div></div>
<div class="disc"><b>AI disclosure.</b> {esc(disclosure)}</div>
<div class="foot">master {manifest['master_width']}px - web copy {manifest['export_width']}px - PDF in delivery/</div>
</body></html>
"""


def _write_upload_readme(out_dir: Path, manifest: dict, ep: dict, series: dict) -> None:
    ch = f"ch{manifest['episode']:03d}"
    lines = [
        f"# Upload sheet - {series.get('title')} {ch}",
        "",
        f"Platform **{manifest.get('platform_label')}** · master **{manifest['master_width']}px** · "
        f"export **{manifest['export_width']}px** · tiles **{manifest['tile_count']}** · "
        f"total **{manifest['total_bytes']/1048576:.2f} MB**",
        "",
        "Upload the files in `upload/` in numeric order. Each tile is already at the export width",
        "and under the platform's height/size caps; cuts were placed in empty gutter space so no",
        "face or balloon is split across two images.",
        "",
        "| # | file | size | height |",
        "|---|------|------|--------|",
    ]
    for t in manifest["tiles"]:
        lines.append(f"| {t['index']} | `{Path(t['file']).name}` | {t['bytes']/1024:.0f} KB | {t['height']}px |")
    lines += [
        "",
        "## Other deliverables",
        f"- `{manifest.get('strip_file', 'strip-master.png')}` - the {manifest['master_width']}px "
        f"master (archive this)",
        f"- `strip-web.jpg` - phone-friendly full-height review copy",
        f"- `delivery/` + `your_files/` - the {manifest['master_width']}x{int(round(1920*manifest['master_width']/1080))} PDF",
        f"- `../ch{manifest['episode']:03d}/panels|lettered/` - per-panel crops",
        "",
        "## Episode metadata",
        f"- title: {ep.get('title')}",
        f"- description: {ep.get('end_note','')}",
        f"- scroll: {manifest['total_height']:,}px master (~{manifest['est_read_screens']} phone screens)",
        f"- lettering: {manifest['lettering']['bubbles']} balloons "
        f"({manifest['lettering'].get('gutter',0)} in gutters, {manifest['lettering'].get('sfx',0)} SFX, "
        f"{manifest['lettering'].get('prop',0)} prop text)",
        "",
        "## AI disclosure (paste into the episode description)",
        f"> {manifest.get('ai_disclosure')}",
        "",
        "## Before you upload (do not skip)",
        "1. `manhwa.py sheets` - panel contact sheet + likeness match-check",
        "2. `manhwa.py sheets` - lettering QC overlay (tails, clipping, prop text)",
        "3. Final scroll read-through on a phone",
        "",
    ]
    (out_dir / "UPLOAD.md").write_text("\n".join(lines), encoding="utf-8")
