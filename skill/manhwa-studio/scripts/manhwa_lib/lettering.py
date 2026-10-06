"""
Lettering engine: the full balloon vocabulary, three lettering voices, gutter
balloons, prop text, technique captions, colour-coded SFX.

Rules baked in:
  * lettering is COMPOSITED, never generated -- image models cannot spell
  * shape encodes delivery (oval / burst / cloud / dashed / wobbly / linked /
    inverted / tinted / symbol-only)
  * balloons may live in the GUTTER with a thin tail reaching into the panel
  * every balloon is auto-placed over the least detailed region of its panel so
    it never lands on a face, a blade or a clue
  * 20 words, 1-2 lines per balloon
"""
from __future__ import annotations

import math
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .specs import ANCHORS, BUBBLE_STYLES, SFX_PALETTE, VOICES

GRID = 32
MAX_LINES = 2           # reference spec: 1-2 lines per balloon


# --------------------------------------------------------------------------- #
# text helpers
# --------------------------------------------------------------------------- #
def _wrap(draw, text: str, font, max_w: float) -> list[str]:
    words = str(text).split()
    lines, cur = [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    out: list[str] = []
    for ln in lines:  # hard-break any word wider than the box
        while draw.textlength(ln, font=font) > max_w and len(ln) > 1:
            k = len(ln)
            while k > 1 and draw.textlength(ln[:k], font=font) > max_w:
                k -= 1
            out.append(ln[:k])
            ln = ln[k:]
        if ln:
            out.append(ln)
    return out or [""]


def fit_text(draw, text, font_path, max_w, max_h, start_size, min_size=14,
             spacing=1.16, max_lines=MAX_LINES):
    """Largest size at which the text fits the box in <= max_lines lines."""
    size = int(start_size)
    fallback = None
    while size >= min_size:
        font = ImageFont.truetype(font_path, size)
        lines = _wrap(draw, text, font, max_w)
        line_h = size * spacing
        widest = max((draw.textlength(l, font=font) for l in lines), default=0)
        fits = widest <= max_w and line_h * len(lines) <= max_h
        if fits and len(lines) <= max_lines:
            return font, lines, size, line_h
        if fits and fallback is None:
            fallback = (font, lines, size, line_h)
        size -= 2
    if fallback:
        return fallback
    font = ImageFont.truetype(font_path, min_size)
    lines = _wrap(draw, text, font, max_w)
    return font, lines, min_size, min_size * spacing


# --------------------------------------------------------------------------- #
# energy map: where NOT to put a balloon
# --------------------------------------------------------------------------- #
def edge_energy(img: Image.Image) -> list[list[float]]:
    g = img.convert("L").resize((GRID, GRID), Image.Resampling.BILINEAR)
    e = g.filter(ImageFilter.FIND_EDGES)
    px = list(e.getdata())
    return [px[r * GRID:(r + 1) * GRID] for r in range(GRID)]


def _mean_energy(energy, x0, y0, x1, y1) -> float:
    c0 = max(0, min(GRID - 1, int(x0 * GRID)))
    c1 = max(c0 + 1, min(GRID, int(math.ceil(x1 * GRID))))
    r0 = max(0, min(GRID - 1, int(y0 * GRID)))
    r1 = max(r0 + 1, min(GRID, int(math.ceil(y1 * GRID))))
    tot = n = 0
    for r in range(r0, r1):
        row = energy[r]
        for c in range(c0, c1):
            tot += row[c]
            n += 1
    return tot / max(1, n)


def _rects_overlap(a, b, pad=6) -> bool:
    return not (a[2] + pad <= b[0] or b[2] + pad <= a[0] or a[3] + pad <= b[1] or b[3] + pad <= a[1])


def choose_box_center(energy, panel_wh, box_wh, prefer_frac=None, occupied=(), margin=0.05):
    """Calmest legal spot for a box of `box_wh` inside a panel."""
    pw, ph = panel_wh
    bw, bh = box_wh
    if bw > pw * (1 - 2 * margin):
        margin = 0.02
    best, best_score = None, None
    for cy in (0.14, 0.24, 0.34, 0.45, 0.56, 0.68, 0.80, 0.90):
        for cx in (0.5, 0.25, 0.75, 0.15, 0.85):
            x0 = min(max(cx * pw - bw / 2, margin * pw), max(margin * pw, pw - bw - margin * pw))
            y0 = min(max(cy * ph - bh / 2, margin * ph), max(margin * ph, ph - bh - margin * ph))
            rect = (x0, y0, x0 + bw, y0 + bh)
            if any(_rects_overlap(rect, o, pad=8) for o in occupied):
                continue
            e = _mean_energy(energy, x0 / pw, y0 / ph, (x0 + bw) / pw, (y0 + bh) / ph)
            pen = 0.0
            if prefer_frac is not None:
                pen += math.hypot(rect[0] + bw / 2 - prefer_frac[0] * pw,
                                  rect[1] + bh / 2 - prefer_frac[1] * ph) / max(pw, ph) * 260
            pen += abs(cy - 0.5) * 40
            score = e + pen
            if best_score is None or score < best_score:
                best, best_score = rect, score
    if best is None:
        best = (max(margin * pw, (pw - bw) / 2), max(margin * ph, (ph - bh) / 2),
                max(margin * pw, (pw - bw) / 2) + bw, max(margin * ph, (ph - bh) / 2) + bh)
    return best


# --------------------------------------------------------------------------- #
# geometry helpers
# --------------------------------------------------------------------------- #
def _bezier(p0, p1, p2, steps=9):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        pts.append((u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]))
    return pts


def _tail_geometry(rect, tail_to, width_ratio=0.17):
    x0, y0, x1, y1 = rect
    tx, ty = tail_to
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    dx, dy = tx - cx, ty - cy
    if abs(dx) / max(1, (x1 - x0)) > abs(dy) / max(1, (y1 - y0)):
        edge = "right" if dx > 0 else "left"
    else:
        edge = "bottom" if dy > 0 else "top"
    if edge in ("bottom", "top"):
        y = y1 if edge == "bottom" else y0
        bx0 = x0 + (x1 - x0) * (0.5 - width_ratio / 2)
        bx1 = x0 + (x1 - x0) * (0.5 + width_ratio / 2)
        base = [(bx0, y), (bx1, y)]
        apex = (min(max(tx, x0 + 6), x1 - 6), ty)
    else:
        x = x1 if edge == "right" else x0
        by0 = y0 + (y1 - y0) * (0.5 - width_ratio / 2)
        by1 = y0 + (y1 - y0) * (0.5 + width_ratio / 2)
        base = [(x, by0), (x, by1)]
        apex = (tx, min(max(ty, y0 + 6), y1 - 6))
    return base[0], base[1], apex, edge


def _clamp_tail(rect, apex, max_len):
    """Keep the tail short -- a giant spike reads as amateur lettering."""
    x0, y0, x1, y1 = rect
    cx = min(max(apex[0], x0), x1)
    cy = min(max(apex[1], y0), y1)
    dx, dy = apex[0] - cx, apex[1] - cy
    d = math.hypot(dx, dy)
    if d <= max_len or d == 0:
        return apex
    k = max_len / d
    return (cx + dx * k, cy + dy * k)


def _tail_polygon(rect, apex, base_ratio=0.17, curve=0.34, bulge=0.22):
    b0, b1, apex, _ = _tail_geometry(rect, apex, base_ratio)
    mx, my = (b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2
    dx, dy = apex[0] - mx, apex[1] - my
    seg = math.hypot(b1[0] - b0[0], b1[1] - b0[1]) or 1.0
    n = math.hypot(dx, dy) or 1.0
    px, py = -dy / n, dx / n
    c1 = (b0[0] + dx * curve + px * seg * bulge, b0[1] + dy * curve + py * seg * bulge)
    c2 = (b1[0] + dx * curve - px * seg * bulge, b1[1] + dy * curve - py * seg * bulge)
    return _bezier(b0, c1, apex, 8) + _bezier(apex, c2, b1, 8)


def _star_polygon(cx, cy, rx, ry, spikes=16, inner=0.72, jitter=0.0, rng=None):
    pts = []
    for i in range(spikes * 2):
        ang = math.pi * i / spikes
        j = 1.0 + (rng.uniform(-jitter, jitter) if (jitter and rng) else 0.0)
        rad = (1.0 if i % 2 == 0 else inner) * j
        pts.append((cx + math.cos(ang) * rx * rad, cy + math.sin(ang) * ry * rad))
    return pts


def _cloud_polygon(cx, cy, rx, ry, bumps=11, jitter=0.0, rng=None):
    pts = []
    for i in range(bumps * 2):
        ang = math.pi * i / bumps
        rad = 1.0 if i % 2 == 0 else 0.84
        j = 1.0 + (rng.uniform(-jitter, jitter) if (jitter and rng) else 0.0)
        pts.append((cx + math.cos(ang) * rx * rad * j, cy + math.sin(ang) * ry * rad * j))
    return pts


def _ellipse_points(rect, steps=72):
    x0, y0, x1, y1 = rect
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx, ry = (x1 - x0) / 2, (y1 - y0) / 2
    return [(cx + math.cos(2 * math.pi * i / steps) * rx, cy + math.sin(2 * math.pi * i / steps) * ry)
            for i in range(steps + 1)]


def _dashed_path(draw, pts, color, width, dash=14, gap=10):
    """Draw a dashed polyline path (used for whisper / narration balloons)."""
    acc = 0.0
    on = True
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        seg = math.hypot(x1 - x0, y1 - y0)
        if seg <= 0:
            continue
        t = 0.0
        while t < seg:
            step = (dash if on else gap) - acc
            t2 = min(seg, t + step)
            if on:
                draw.line([(x0 + (x1 - x0) * t / seg, y0 + (y1 - y0) * t / seg),
                           (x0 + (x1 - x0) * t2 / seg, y0 + (y1 - y0) * t2 / seg)],
                          fill=color, width=width)
            acc += t2 - t
            if acc >= (dash if on else gap) - 0.01:
                acc = 0.0
                on = not on
            t = t2


# --------------------------------------------------------------------------- #
# the Letterer
# --------------------------------------------------------------------------- #
class Letterer:
    def __init__(self, fonts: dict[str, str], base_size: int = 40, scale: float = 1.0,
                 caps: bool = False, max_words: int = 20, max_width_ratio: float = 0.72,
                 voices: dict | None = None):
        self.fonts = fonts
        self.base_size = max(14, int(round(base_size * scale)))
        self.scale = scale
        self.caps = caps
        self.max_words = max_words
        self.max_width_ratio = max_width_ratio
        self.voices = {**VOICES, **(voices or {})}
        self.rng = random.Random(7)

    # ------------------------------------------------------------------ #
    def measure(self, text: str, style_name: str, panel_w: float, size_scale: float = 1.0,
                voice: str = "clean_bold"):
        """Approximate rendered balloon size (w, h) without drawing it."""
        style = BUBBLE_STYLES.get(style_name, BUBBLE_STYLES["speech"])
        grow = {"cloud": 1.62, "wobbly": 1.66, "burst": 1.72, "oval": 1.42,
                "linked": 1.30, "dashed": 1.30}.get(style["shape"], 1.0)
        size = self.size_for(style, voice, size_scale)
        fpath = self.font_for(style, voice)
        probe = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
        cap_w = min(panel_w * 0.86, 780.0 * self.scale)
        while True:
            pad_x, pad_y = size * 0.72, size * 0.60
            max_w = max(size * 2.0, min(panel_w * self.max_width_ratio, cap_w / grow - 2 * pad_x))
            font, lines, size2, line_h = fit_text(probe, text, fpath, max_w, 1e6, size)
            tw = max((probe.textlength(l, font=font) for l in lines), default=0)
            bw = (tw + 2 * pad_x) * grow
            bh = (line_h * len(lines) + 2 * pad_y) * grow
            if bw <= cap_w + 1 or size <= 15:
                break
            size -= 2
        return bw, bh

    def font_for(self, style: dict, voice: str) -> str:
        if style.get("mono"):
            return "mono_bold" if style.get("bold") else "mono"
        v = self.voices.get(voice) or self.voices["clean_bold"]
        role = v.get("bold" if style.get("bold") else "regular", "bold")
        return self.fonts.get(role) or self.fonts["regular"]

    def size_for(self, style: dict, voice: str, size_scale: float) -> int:
        v = self.voices.get(voice) or self.voices["clean_bold"]
        mult = float(v.get("weight_scale", 1.0))
        if style.get("huge"):
            mult *= 2.2
        if style["shape"] == "technique":
            mult *= 0.72
        if style["shape"] == "prop":
            mult *= 0.8
        return max(12, int(round(self.base_size * mult * size_scale)))

    # ------------------------------------------------------------------ #
    def draw_dialogue(self, target: Image.Image, panel_rect, dlg: dict, energy, occupied,
                      gutter_rect=None, panel_art=None) -> dict:
        style_name = dlg.get("style", "speech")
        style = dict(BUBBLE_STYLES.get(style_name, BUBBLE_STYLES["speech"]))
        text = str(dlg.get("text", "")).strip()
        if not text:
            return {}
        if style.get("caps") or (self.caps and style_name != "prop"):
            text = text.upper()

        voice = str(dlg.get("voice") or ("hand_brushed" if style.get("border_break") else "clean_bold"))
        size_scale = float(dlg.get("size_scale", 1.0) or 1.0)
        start = self.size_for(style, voice, size_scale)
        fpath = self.font_for(style, voice)
        place = str(dlg.get("place", "") or "").lower()

        if style["shape"] == "prop":
            return self._draw_prop(target, panel_rect, dlg, style, text, fpath, start)
        if style_name == "sfx":
            return self._draw_sfx(target, panel_rect, dlg, style, text, fpath, start, gutter_rect)
        if style.get("huge"):                      # symbol-only beat ("?", "...")
            return self._draw_symbol(target, panel_rect, dlg, text, fpath, start)

        px0, py0, px1, py1 = panel_rect
        pw, ph = px1 - px0, py1 - py0
        probe = ImageDraw.Draw(target)

        # ---- shape-aware box budget -------------------------------- #
        grow = {"cloud": 1.62, "wobbly": 1.66, "burst": 1.72, "oval": 1.42,
                "linked": 1.30, "dashed": 1.30}.get(style["shape"], 1.0)
        boxy = style["shape"] in ("system", "sync", "technique")
        cap_w = min(pw * 0.86, 780.0 * self.scale)
        cap_h = ph * 0.60
        if style["shape"] == "technique":
            cap_w, cap_h = pw * 0.52, ph * 0.20

        size = start
        while True:
            pad_x = size * (0.62 if boxy else 0.72)
            pad_y = size * (0.52 if boxy else 0.60)
            max_text_w = max(size * 2.0, min(pw * self.max_width_ratio, cap_w / grow - 2 * pad_x))
            max_text_h = max(size * 1.4, cap_h / grow - 2 * pad_y)
            font, lines, size2, line_h = fit_text(probe, text, fpath, max_text_w, max_text_h, size)
            tw = max((probe.textlength(l, font=font) for l in lines), default=0)
            bw, bh = (tw + 2 * pad_x) * grow, (line_h * len(lines) + 2 * pad_y) * grow
            if (bw <= cap_w + 1 and bh <= cap_h + 1) or size <= 15:
                break
            size -= 2
        size = size2

        # ---- placement --------------------------------------------- #
        anchor_tok = str(dlg.get("anchor", "auto"))
        prefer = None
        if anchor_tok.startswith("@"):
            try:
                prefer = tuple(float(v) for v in anchor_tok[1:].split(",")[:2])
            except Exception:
                prefer = None
        elif anchor_tok in ANCHORS:
            prefer = ANCHORS[anchor_tok]

        in_gutter = place in ("gutter", "gutter_after") and gutter_rect is not None
        if in_gutter:
            gx0, gy0, gx1, gy1 = gutter_rect
            gw, gh = gx1 - gx0, gy1 - gy0
            # the reserved gutter is exactly as tall as the balloon needs.
            # gutter_rect is in strip coordinates, so subtract the panel origin here:
            # bx/by stay panel-local and strip_rect adds the origin back once.
            if bh <= gh - 4:
                bx = (gx0 - px0) + max(0.0, (gw - bw) / 2)
                by = (gy0 - py0) + (gh - bh) / 2
            else:                                   # not reserved: fall back inside the panel
                in_gutter = False
        if not in_gutter:
            energy_local = energy if energy is not None else [[0.0] * GRID for _ in range(GRID)]
            if prefer is not None and str(dlg.get("anchor_lock", "")).lower() in ("1", "true", "yes"):
                mx, my = min(max(0.05 * pw, 8 * self.scale), 0.12 * pw), min(max(0.05 * ph, 8 * self.scale), 0.14 * ph)
                bx = min(max(prefer[0] * pw - bw / 2, mx), max(mx, pw - bw - mx))
                by = min(max(prefer[1] * ph - bh / 2, my), max(my, ph - bh - my))
            else:
                rect = choose_box_center(energy_local, (pw, ph), (bw, bh), prefer, occupied)
                bx, by = rect[0], rect[1]
        bx = round(bx)
        by = round(by)
        rect_local = (bx, by, bx + round(bw), by + round(bh))
        strip_rect = (px0 + rect_local[0], py0 + rect_local[1], px0 + rect_local[2], py0 + rect_local[3])

        # ---- tail -------------------------------------------------- #
        tail_pt = None
        if style.get("tail") and str(dlg.get("tail", "auto")).lower() != "none":
            tt = dlg.get("tail_to")
            if tt and isinstance(tt, dict):
                tail_pt = (px0 + float(tt.get("x", 0.5)) * pw, py0 + float(tt.get("y", 0.8)) * ph)
            else:
                cx, cy = (strip_rect[0] + strip_rect[2]) / 2, (strip_rect[1] + strip_rect[3]) / 2
                span = min(ph * 0.30, size * 2.1)
                tok = str(dlg.get("tail", "auto")).lower()
                tail_pt = {"up": (cx, strip_rect[1] - span), "down": (cx, strip_rect[3] + span),
                           "left": (strip_rect[0] - span, cy), "right": (strip_rect[2] + span, cy)}.get(tok)
                if tail_pt is None:
                    tail_pt = (cx, min(py1 - 6, strip_rect[3] + span))
            if in_gutter:
                # reach back INTO the panel from the gutter
                tail_pt = _clamp_tail(strip_rect, tail_pt, min(180 * self.scale, size * 4.4))
            else:
                tail_pt = _clamp_tail(strip_rect, tail_pt, min(ph * 0.30, size * 2.1))

        self._render_bubble(target, strip_rect, style, text, font, lines, size, line_h,
                            tail_pt, voice, dlg)
        if not in_gutter:
            occupied.append(rect_local)
        return {"rect": strip_rect, "style": style_name, "text": text, "font_size": size,
                "lines": len(lines), "gutter": in_gutter, "voice": voice,
                "tail": [round(v) for v in tail_pt] if tail_pt else None,
                "panel_rect_local": rect_local}

    # ------------------------------------------------------------------ #
    def _render_bubble(self, target, rect, style, text, font, lines, size, line_h,
                       tail_pt, voice, dlg):
        d = ImageDraw.Draw(target)
        lw = max(2, int(round(3 * self.scale)))
        fill = style.get("fill")
        outline = style.get("outline", "#101010")
        tc = style.get("tc", "#101010")
        shape = style["shape"]
        x0, y0, x1, y1 = rect
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        w, h = x1 - x0, y1 - y0
        shake = bool(dlg.get("shake")) or (voice == "hand_brushed" and bool(dlg.get("shake_hint")))
        blur = float(dlg.get("blur", 0) or 0)

        # glow / halo behind the whole balloon
        glow = style.get("glow")
        if glow:
            halo = Image.new("RGBA", target.size, (0, 0, 0, 0))
            hd = ImageDraw.Draw(halo)
            hd.ellipse((x0 - 10, y0 - 10, x1 + 10, y1 + 10), fill=_hex_rgba(glow, 150))
            halo = halo.filter(ImageFilter.GaussianBlur(max(3, int(9 * self.scale))))
            target.alpha_composite(halo)

        # linked double ovals: the trailing oval goes behind
        if shape == "linked":
            off = int(h * 0.78)
            d.ellipse((x0 - off, y0 + int(h * 0.16), x0 + int(w * 0.42), y0 + h - int(h * 0.16)),
                      fill=fill, outline=outline, width=lw)

        if tail_pt and shape == "cloud":
            tip = _clamp_tail(rect, tail_pt, min(h * 1.15 + 40, 150))
            base = (cx, cy)
            for frac, rad in ((0.44, 0.085), (0.72, 0.055), (0.95, 0.032)):
                px = base[0] + (tip[0] - base[0]) * frac
                py = base[1] + (tip[1] - base[1]) * frac
                r = max(3, h * rad)
                d.ellipse((px - r, py - r, px + r, py + r), fill=fill or "#ffffff",
                          outline=outline, width=max(1, lw - 1))
        elif tail_pt:
            pts = _tail_polygon(rect, tail_pt)
            if shake:
                pts = [(px + self.rng.uniform(-1.6, 1.6) * self.scale,
                        py + self.rng.uniform(-1.6, 1.6) * self.scale) for px, py in pts]
            d.polygon(pts, fill=fill or "#ffffff", outline=outline, width=lw)

        radius = min(int(max(10 * self.scale, min(w, h) * 0.28)), int(h / 2 - 1), int(w / 2 - 1))
        if shape in ("oval", "linked"):
            d.ellipse(rect, fill=fill, outline=outline, width=lw)
        elif shape == "dashed":
            if fill:
                d.rounded_rectangle(rect, radius=max(4, radius), fill=fill)
            _dashed_path(d, _ellipse_points(rect), outline, lw,
                         dash=max(8, int(13 * self.scale)), gap=max(6, int(9 * self.scale)))
        elif shape == "wobbly":
            pts = _cloud_polygon(cx, cy, w * 0.61, h * 0.61, 13, 0.14, self.rng)
            d.polygon(pts, fill=fill, outline=outline, width=lw)
        elif shape == "cloud":
            d.polygon(_cloud_polygon(cx, cy, w * 0.60, h * 0.60, 13), fill=fill, outline=outline, width=lw)
        elif shape == "burst":
            d.polygon(_star_polygon(cx, cy, w * 0.52, h * 0.52, 18, 0.80, 0.035, self.rng),
                      fill=fill, outline=outline, width=lw)
        elif shape == "system":
            d.rounded_rectangle(rect, radius=int(8 * self.scale), fill=fill, outline=outline, width=lw)
            d.line([(x0 + 10, y0 + int(size * 1.5)), (x1 - 10, y0 + int(size * 1.5))],
                   fill=outline, width=max(1, lw - 1))
            d.text((x0 + size * 0.6, y0 + size * 0.75), "◈ SYSTEM", font=font, fill=tc, anchor="lm")
        elif shape == "sync":
            d.rounded_rectangle(rect, radius=int(4 * self.scale), fill=fill, outline=outline, width=lw)
        elif shape == "technique":
            d.rounded_rectangle(rect, radius=int(4 * self.scale), fill=fill, outline=outline,
                                width=max(1, lw - 1))
        else:                                   # fallback: soft rectangle
            d.rounded_rectangle(rect, radius=radius, fill=fill, outline=outline, width=lw)

        # ---- type -------------------------------------------------- #
        if blur > 0:
            ghost = Image.new("RGBA", target.size, (0, 0, 0, 0))
            gd = ImageDraw.Draw(ghost)
            self._draw_lines(gd, rect, style, lines, font, size, line_h, self._hex_rgba_solid(tc, 190),
                             offset=(0, 0))
            ghost = ghost.filter(ImageFilter.GaussianBlur(max(2, int(blur * self.scale))))
            target.alpha_composite(ghost)
        self._draw_lines(d, rect, style, lines, font, size, line_h, tc,
                         offset=(0, 0), shake=shake)

    def _draw_lines(self, d, rect, style, lines, font, size, line_h, color, offset=(0, 0), shake=False):
        x0, y0, x1, y1 = rect
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        boxy = style["shape"] in ("system", "sync", "technique")
        if boxy and style["shape"] == "system":
            ty = y0 + size * 1.55 + line_h / 2
            tx = x0 + size * 0.62
            for i, ln in enumerate(lines):
                d.text((tx + offset[0], ty + i * line_h + offset[1]), ln, font=font, fill=color, anchor="lm")
            return
        if boxy:
            ty = cy - (line_h * len(lines)) / 2 + line_h / 2
            tx = x0 + size * 0.62
            for i, ln in enumerate(lines):
                d.text((tx + offset[0], ty + i * line_h + offset[1]), ln, font=font, fill=color, anchor="lm")
            return
        ty = cy - (line_h * len(lines)) / 2 + line_h / 2
        for i, ln in enumerate(lines):
            dx = offset[0] + (self.rng.uniform(-1.4, 1.4) * self.scale if shake else 0)
            dy = offset[1] + (self.rng.uniform(-1.4, 1.4) * self.scale if shake else 0)
            d.text((cx + dx, ty + i * line_h + dy), ln, font=font, fill=color, anchor="mm")

    # ------------------------------------------------------------------ #
    def _draw_sfx(self, target, panel_rect, dlg, style, text, fpath, start, gutter_rect=None):
        """Colour-coded SFX: outlined display type with a glow halo, free to overhang."""
        fx_name = str(dlg.get("fx", "neutral"))
        pal = SFX_PALETTE.get(fx_name, SFX_PALETTE["neutral"])
        tc = dlg.get("color") or pal["tc"]
        outline = dlg.get("outline") or pal["outline"]
        glow = pal.get("glow")

        px0, py0, px1, py1 = panel_rect
        pw, ph = px1 - px0, py1 - py0
        probe = ImageDraw.Draw(target)
        size = max(18, int(round(start * 1.9 * float(dlg.get("size_scale", 1.0) or 1.0))))
        font, lines, size, line_h = fit_text(probe, text, fpath, pw * 0.86, ph * 0.8, size, 16, max_lines=1)
        stroke = int(round(style.get("stroke", 7) * self.scale))

        bbox = probe.multiline_textbbox((0, 0), "\n".join(lines), font=font, align="center",
                                        stroke_width=stroke, spacing=line_h - size)
        lw, lh = bbox[2] - bbox[0] + 8, bbox[3] - bbox[1] + 8
        layer = Image.new("RGBA", (max(4, lw), max(4, lh)), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.multiline_text((-bbox[0] + 4, -bbox[1] + 4), "\n".join(lines), font=font, fill=tc,
                          align="center", spacing=line_h - size, stroke_width=stroke, stroke_fill=outline)
        rot = float(dlg.get("rotation", 0) or 0)
        if abs(rot) > 0.01:
            layer = layer.rotate(rot, expand=True, resample=Image.Resampling.BICUBIC)

        if glow:
            halo = layer.filter(ImageFilter.GaussianBlur(max(3, int(10 * self.scale))))
            tint = Image.new("RGBA", layer.size, _hex_rgba(glow, 255))
            alpha = halo.getchannel("A").point(lambda v: min(255, int(v * 1.5)))
            tint.putalpha(alpha)
            layer.alpha_composite(tint)

        anchor_tok = str(dlg.get("anchor", "auto"))
        if anchor_tok.startswith("@"):
            try:
                ax, ay = (float(v) for v in anchor_tok[1:].split(",")[:2])
            except Exception:
                ax, ay = 0.5, 0.35
        else:
            ax, ay = ANCHORS.get(anchor_tok) or (0.5, 0.3)
        cx = px0 + ax * pw
        cy = py0 + ay * ph
        place = str(dlg.get("place", "") or "").lower()
        # border break: the effect straddles the panel edge, hanging into the gutter
        if place == "border" and gutter_rect is not None:
            cy = min(py1, max(py0, cy)) + (layer.height * 0.22)
        target.alpha_composite(layer, (int(cx - layer.width / 2), int(cy - layer.height / 2)))
        rect = (cx - layer.width / 2, cy - layer.height / 2,
                cx + layer.width / 2, cy + layer.height / 2)
        return {"rect": rect, "style": "sfx", "text": text, "font_size": size,
                "lines": len(lines), "fx": fx_name, "gutter": place == "gutter"}

    # ------------------------------------------------------------------ #
    def _draw_symbol(self, target, panel_rect, dlg, text, fpath, start):
        """Symbol-only beat: a huge '?' or '...' with no balloon at all."""
        px0, py0, px1, py1 = panel_rect
        pw, ph = px1 - px0, py1 - py0
        font = ImageFont.truetype(fpath, max(40, int(start * 2.4)))
        d = ImageDraw.Draw(target)
        anchor_tok = str(dlg.get("anchor", "auto"))
        if anchor_tok.startswith("@"):
            try:
                ax, ay = (float(v) for v in anchor_tok[1:].split(",")[:2])
            except Exception:
                ax, ay = 0.5, 0.5
        else:
            ax, ay = ANCHORS.get(anchor_tok) or (0.5, 0.5)
        cx, cy = px0 + ax * pw, py0 + ay * ph
        stroke = max(2, int(5 * self.scale))
        d.text((cx, cy), text, font=font, fill=dlg.get("color", "#101010"), anchor="mm",
               stroke_width=stroke, stroke_fill="#ffffff")
        bbox = d.textbbox((cx, cy), text, font=font, anchor="mm", stroke_width=stroke)
        return {"rect": bbox, "style": "symbol", "text": text,
                "font_size": font.size, "lines": 1}

    # ------------------------------------------------------------------ #
    def _draw_prop(self, target, panel_rect, dlg, style, text, fpath, start):
        """Prop text: written directly onto the prop in a hand font, no balloon."""
        px0, py0, px1, py1 = panel_rect
        pw, ph = px1 - px0, py1 - py0
        pr = dlg.get("prop_rect") or {"x": 0.2, "y": 0.2, "w": 0.36, "h": 0.18}
        rx0 = px0 + float(pr.get("x", 0.2)) * pw
        ry0 = py0 + float(pr.get("y", 0.2)) * ph
        rw = float(pr.get("w", 0.36)) * pw
        rh = float(pr.get("h", 0.18)) * ph
        probe = ImageDraw.Draw(target)
        font, lines, size, line_h = fit_text(probe, text, fpath, rw, rh, start, 12, max_lines=4)

        layer = Image.new("RGBA", (max(4, int(rw) + 20), max(4, int(rh) + 20)), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ty = (layer.height - line_h * len(lines)) / 2 + line_h / 2
        for i, ln in enumerate(lines):
            ld.text((layer.width / 2, ty + i * line_h), ln, font=font,
                    fill=style.get("tc", "#1a1a1a"), anchor="mm")
        rot = float(dlg.get("rotation", 0) or 0)
        if abs(rot) > 0.01:
            layer = layer.rotate(rot, expand=True, resample=Image.Resampling.BICUBIC)
        target.alpha_composite(layer, (int(rx0), int(ry0)))
        return {"rect": (rx0, ry0, rx0 + layer.width, ry0 + layer.height), "style": "prop",
                "text": text, "font_size": size, "lines": len(lines)}


def _hex_rgba(color: str, alpha: int) -> tuple[int, int, int, int]:
    c = (color or "#ffffff").lstrip("#")
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), alpha)


def _hex_rgba_solid(color: str, alpha: int) -> tuple[int, int, int, int]:
    return _hex_rgba(color, alpha)
