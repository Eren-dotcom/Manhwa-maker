"""
Lettering engine: dialogue bubbles, caption boxes, system windows, SFX.

Design rules baked in (see references/06-lettering.md):
  * lettering is COMPOSITED, never generated -- image models cannot spell
  * speech is a round-rect bubble with a tail that points at the speaker
  * narration is a box, thought is a cloud, shouts are bursts, system is a HUD
  * every bubble is auto-placed over the LOWEST-DETAIL region of the panel so it
    does not cover a face (edge-energy scan, then collision check)
"""
from __future__ import annotations

import math
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .specs import ANCHORS, BUBBLE_STYLES

GRID = 32  # energy-scan resolution


# --------------------------------------------------------------------------- #
# text helpers
# --------------------------------------------------------------------------- #
def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_w: float) -> list[str]:
    words = str(text).split()
    lines: list[str] = []
    cur = ""
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


def fit_text(draw, text, font_path, max_w, max_h, start_size, min_size=14, spacing=1.16):
    """Shrink the type until it fits the box. Returns (font, lines, size, line_h)."""
    size = int(start_size)
    while size >= min_size:
        font = ImageFont.truetype(font_path, size)
        lines = _wrap(draw, text, font, max_w)
        line_h = size * spacing
        widest = max((draw.textlength(l, font=font) for l in lines), default=0)
        if widest <= max_w and line_h * len(lines) <= max_h:
            return font, lines, size, line_h
        size -= 2
    font = ImageFont.truetype(font_path, min_size)
    lines = _wrap(draw, text, font, max_w)
    return font, lines, min_size, min_size * spacing


# --------------------------------------------------------------------------- #
# energy map (where NOT to put a bubble)
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
    """
    Pick the calmest legal spot for a box of `box_wh` inside a panel.
    `occupied` are panel-relative pixel rects already used by other bubbles.
    """
    pw, ph = panel_wh
    bw, bh = box_wh
    if bw > pw * (1 - 2 * margin):
        margin = 0.02
    best, best_score = None, None
    for cy in (0.14, 0.24, 0.34, 0.45, 0.56, 0.68, 0.80, 0.90):
        for cx in (0.5, 0.25, 0.75, 0.15, 0.85):
            # clamp the box inside the panel
            x0 = min(max(cx * pw - bw / 2, margin * pw), pw - bw - margin * pw)
            y0 = min(max(cy * ph - bh / 2, margin * ph), ph - bh - margin * ph)
            rect = (x0, y0, x0 + bw, y0 + bh)
            if any(_rects_overlap(rect, o, pad=8) for o in occupied):
                continue
            e = _mean_energy(energy, x0 / pw, y0 / ph, (x0 + bw) / pw, (y0 + bh) / ph)
            pen = 0.0
            if prefer_frac is not None:
                pen += math.hypot(rect[0] + bw / 2 - prefer_frac[0] * pw,
                                  rect[1] + bh / 2 - prefer_frac[1] * ph) / max(pw, ph) * 260
            pen += abs(cy - 0.5) * 40  # mild pull to the upper half for speech
            score = e + pen
            if best_score is None or score < best_score:
                best, best_score = rect, score
    if best is None:  # everything collided: centre it and accept the overlap
        best = (max(margin * pw, (pw - bw) / 2), max(margin * ph, (ph - bh) / 2),
                max(margin * pw, (pw - bw) / 2) + bw, max(margin * ph, (ph - bh) / 2) + bh)
    return best


# --------------------------------------------------------------------------- #
# shapes
# --------------------------------------------------------------------------- #
def _star_polygon(cx, cy, rx, ry, spikes=15, inner=0.62, jitter=0.0, rng=None):
    pts = []
    for i in range(spikes * 2):
        ang = math.pi * i / spikes
        j = 1.0
        if jitter and rng:
            j = 1.0 + rng.uniform(-jitter, jitter)
        rad = (1.0 if i % 2 == 0 else inner) * j
        pts.append((cx + math.cos(ang) * rx * rad, cy + math.sin(ang) * ry * rad))
    return pts


def _cloud_polygon(cx, cy, rx, ry, bumps=9):
    pts = []
    for i in range(bumps * 2):
        ang = math.pi * i / bumps
        rad = 1.0 if i % 2 == 0 else 0.86
        pts.append((cx + math.cos(ang) * rx * rad, cy + math.sin(ang) * ry * rad))
    return pts


def _bezier(p0, p1, p2, steps=9):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        pts.append((u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]))
    return pts


def _tail_polygon(rect, apex, base_ratio=0.17, curve=0.34, bulge=0.22):
    """
    Hand-drawn looking tail: two quadratic curves from the base out to the apex,
    so it tapers instead of reading as a flat triangle. Kept narrow on purpose --
    a fat tail reads as a second bubble, not a pointer.
    """
    b0, b1, apex, edge = _tail_geometry(rect, apex, base_ratio)
    mx, my = (b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2
    dx, dy = apex[0] - mx, apex[1] - my
    seg = math.hypot(b1[0] - b0[0], b1[1] - b0[1]) or 1.0
    n = math.hypot(dx, dy) or 1.0
    px, py = -dy / n, dx / n
    c1 = (b0[0] + dx * curve + px * seg * bulge, b0[1] + dy * curve + py * seg * bulge)
    c2 = (b1[0] + dx * curve - px * seg * bulge, b1[1] + dy * curve - py * seg * bulge)
    return _bezier(b0, c1, apex, 8) + _bezier(apex, c2, b1, 8)


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


def _tail_geometry(rect, tail_to, width_ratio=0.34):
    """Base segment on the edge of `rect` closest to tail_to, apex at tail_to."""
    x0, y0, x1, y1 = rect
    tx, ty = tail_to
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    # which edge? pick by largest overflow direction
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


# --------------------------------------------------------------------------- #
# the Letterer
# --------------------------------------------------------------------------- #
class Letterer:
    def __init__(self, fonts: dict[str, str], base_size: int = 30, scale: float = 1.0,
                 caps: bool = False, max_words: int = 30, max_width_ratio: float = 0.62):
        self.fonts = fonts
        self.base_size = max(14, int(round(base_size * scale)))
        self.scale = scale
        self.caps = caps
        self.max_words = max_words
        self.max_width_ratio = max_width_ratio
        self.rng = random.Random(7)

    # -- public --------------------------------------------------------- #
    def draw_dialogue(self, target: Image.Image, panel_rect, dlg: dict, energy, occupied) -> dict:
        """Draw one dialogue element into `target` (an RGBA overlay). Returns placement info."""
        style_name = dlg.get("style", "speech")
        style = dict(BUBBLE_STYLES.get(style_name, BUBBLE_STYLES["speech"]))
        text = str(dlg.get("text", "")).strip()
        if not text:
            return {}
        if style.get("caps") or self.caps:
            text = text.upper()

        px0, py0, px1, py1 = panel_rect
        pw, ph = px1 - px0, py1 - py0
        size_scale = float(dlg.get("size_scale", 1.0) or 1.0)
        start = max(14, int(round(self.base_size * (1.35 if style_name == "sfx" else 1.0) * size_scale)))

        if style_name == "sfx":
            return self._draw_sfx(target, panel_rect, dlg, style, text, energy)

        fpath = self.fonts.get("mono_bold" if style.get("mono") and style.get("bold")
                               else "mono" if style.get("mono")
                               else "bold" if style.get("bold") else "regular")
        probe = ImageDraw.Draw(target)
        # scalloped shapes (cloud/burst) need a generous box: the text rect is
        # inscribed in an ellipse, so without the factor the corners get clipped.
        shape_grow = {"cloud": 1.62, "burst": 1.82}.get(style["shape"], 1.0)
        boxy = style["shape"] in ("box", "system", "radio")
        # hard caps: a bubble may never eat the panel (0.78 wide / 0.58 tall),
        # and the type never exceeds max_width_ratio of the panel width.
        cap_w = min(pw * 0.78, pw * (self.max_width_ratio / shape_grow) + 2 * 0.72 * start)
        cap_h = ph * 0.58

        size = start
        while True:
            pad_x = size * (0.62 if boxy else 0.72)
            pad_y = size * (0.52 if boxy else 0.60)
            max_text_w = max(size * 2.0, min(pw * self.max_width_ratio, cap_w / shape_grow - 2 * pad_x))
            max_text_h = max(size * 1.4, cap_h / shape_grow - 2 * pad_y)
            font, lines, size2, line_h = fit_text(probe, text, fpath, max_text_w, max_text_h, size)
            tw = max((probe.textlength(l, font=font) for l in lines), default=0)
            th = line_h * len(lines)
            bw, bh = (tw + 2 * pad_x) * shape_grow, (th + 2 * pad_y) * shape_grow
            if (bw <= cap_w + 1 and bh <= cap_h + 1) or size <= 15:
                break
            size -= 2                      # bubble would swallow the art: shrink the type
        size = size2

        # ---- placement ---- #
        anchor_tok = str(dlg.get("anchor", "auto"))
        prefer = None
        if anchor_tok.startswith("@"):
            try:
                ax, ay = [float(v) for v in anchor_tok[1:].split(",")]
                prefer = (ax, ay)
            except Exception:
                prefer = None
        elif anchor_tok in ANCHORS and ANCHORS[anchor_tok]:
            prefer = ANCHORS[anchor_tok]

        energy_local = energy if energy is not None else [[0.0] * GRID for _ in range(GRID)]
        m_x = min(max(0.05 * pw, 10 * self.scale), 0.12 * pw)
        m_y = min(max(0.05 * ph, 10 * self.scale), 0.14 * ph)

        if prefer is not None and str(dlg.get("anchor_lock", "")).lower() in ("1", "true", "yes"):
            x0 = min(max(prefer[0] * pw - bw / 2, m_x), max(m_x, pw - bw - m_x))
            y0 = min(max(prefer[1] * ph - bh / 2, m_y), max(m_y, ph - bh - m_y))
            rect = (x0, y0, x0 + bw, y0 + bh)
        else:
            rect = choose_box_center(energy_local, (pw, ph), (bw, bh), prefer, occupied)
            if prefer is not None:
                # nudge toward the requested anchor, then re-check collisions
                nx = min(max(prefer[0] * pw - bw / 2, m_x), max(m_x, pw - bw - m_x))
                ny = min(max(prefer[1] * ph - bh / 2, m_y), max(m_y, ph - bh - m_y))
                cand = (nx, ny, nx + bw, ny + bh)
                if not any(_rects_overlap(cand, o, pad=8) for o in occupied):
                    rect = cand
        rect = tuple(round(v) for v in rect)
        strip_rect = (px0 + rect[0], py0 + rect[1], px0 + rect[2], py0 + rect[3])

        # ---- tail ---- #
        tail_tok = str(dlg.get("tail", "auto")).lower()
        tail_pt = None
        if style.get("tail") and tail_tok != "none":
            tt = dlg.get("tail_to")
            if tt and isinstance(tt, dict):
                tail_pt = (px0 + float(tt.get("x", 0.5)) * pw, py0 + float(tt.get("y", 0.8)) * ph)
            else:
                cx, cy = (strip_rect[0] + strip_rect[2]) / 2, (strip_rect[1] + strip_rect[3]) / 2
                span = min(ph * 0.30, size * 2.6)
                d = {"up": (cx, strip_rect[1] - span), "down": (cx, strip_rect[3] + span),
                     "left": (strip_rect[0] - span, cy), "right": (strip_rect[2] + span, cy)}.get(tail_tok)
                if d is None:  # auto: point down into the panel, near the speaker's side
                    d = (cx, min(py1 - 6, strip_rect[3] + span))
                tail_pt = d
            tail_pt = _clamp_tail(strip_rect, tail_pt, min(ph * 0.30, size * 2.1))

        self._render_bubble(target, strip_rect, style, text, font, lines, size, line_h, tail_pt)
        occupied.append(rect)
        return {"rect": strip_rect, "style": style_name, "text": text, "font_size": size,
                "lines": len(lines), "panel_rect_local": rect}

    # -- internals ------------------------------------------------------ #
    def _render_bubble(self, target, rect, style, text, font, lines, size, line_h, tail_pt):
        d = ImageDraw.Draw(target)
        lw = max(2, int(round(3 * self.scale)))
        fill = style.get("fill")
        outline = style.get("outline", "#101010")
        shape = style["shape"]
        x0, y0, x1, y1 = rect
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        w, h = x1 - x0, y1 - y0

        if tail_pt and shape == "cloud":
            # thought bubbles trail off in small circles, never a pointed tail
            x0t, y0t, x1t, y1t = rect
            tip = _clamp_tail(rect, tail_pt, min(h * 1.1 + 40, 150))
            base = ((x0t + x1t) / 2, (y0t + y1t) / 2)
            for i, (frac, rad) in enumerate(((0.42, 0.085), (0.70, 0.055), (0.94, 0.032))):
                px = base[0] + (tip[0] - base[0]) * frac
                py = base[1] + (tip[1] - base[1]) * frac
                r = max(3, h * rad)
                d.ellipse((px - r, py - r, px + r, py + r), fill=fill or "#ffffff",
                          outline=outline, width=max(1, lw - 1))
        elif tail_pt:
            d.polygon(_tail_polygon(rect, tail_pt),
                      fill=fill or "#ffffff", outline=outline, width=lw)

        if shape == "round_rect":
            r = int(max(10 * self.scale, min(w, h) * 0.28))
            d.rounded_rectangle(rect, radius=min(r, int(h / 2 - 1), int(w / 2 - 1)),
                                fill=fill, outline=outline, width=lw)
        elif shape == "box":
            d.rounded_rectangle(rect, radius=int(6 * self.scale), fill=fill, outline=outline, width=max(1, lw - 1))
        elif shape == "burst":
            d.polygon(_star_polygon(cx, cy, w * 0.53, h * 0.53, 18, 0.80, 0.035, self.rng),
                      fill=fill, outline=outline, width=lw)
            d.polygon(_star_polygon(cx, cy, w * 0.525, h * 0.525, 18, 0.80, 0.02, self.rng),
                      fill=fill)
        elif shape == "cloud":
            d.polygon(_cloud_polygon(cx, cy, w * 0.60, h * 0.60, 13),
                      fill=fill, outline=outline, width=lw)
        elif shape == "system":
            d.rounded_rectangle(rect, radius=int(8 * self.scale),
                                fill=(11, 23, 35, 232) if fill and fill.startswith("#") else fill,
                                outline=outline, width=lw)
            d.line([(x0 + 10, y0 + int(size * 1.5)), (x1 - 10, y0 + int(size * 1.5))],
                   fill=outline, width=max(1, lw - 1))
            d.text((x0 + size * 0.6, y0 + size * 0.75), "◈ SYSTEM",
                   font=font, fill=style.get("tc", "#d8f6ff"), anchor="lm")
        elif shape == "sync":  # radio/telecom: dark plate, cyan border
            d.rounded_rectangle(rect, radius=int(4 * self.scale), fill=fill, outline=outline, width=lw)

        tc = style.get("tc", "#101010")
        if shape == "burst" and not style.get("mono"):
            tc = style.get("tc", "#101010")

        if style["shape"] in ("box", "system", "radio"):
            ty = y0 + (h - line_h * len(lines)) / 2 + line_h / 2
            tx = x0 + size * 0.62
            if style.get("mono"):
                tx = x0 + size * 0.6
            for i, ln in enumerate(lines):
                d.text((tx, ty + i * line_h), ln, font=font, fill=tc, anchor="lm")
        else:
            ty = cy - (line_h * len(lines)) / 2 + line_h / 2
            for i, ln in enumerate(lines):
                d.text((cx, ty + i * line_h), ln, font=font, fill=tc, anchor="mm")

    def _draw_sfx(self, target, panel_rect, dlg, style, text, energy):
        px0, py0, px1, py1 = panel_rect
        pw, ph = px1 - px0, py1 - py0
        size_scale = float(dlg.get("size_scale", 1.0) or 1.0)
        size = max(18, int(round(self.base_size * 1.9 * size_scale)))
        fpath = self.fonts.get("bold", self.fonts["regular"])
        probe = ImageDraw.Draw(target)
        font, lines, size, line_h = fit_text(probe, text, fpath, pw * 0.72, ph * 0.7, size, 16)
        stroke = int(round((style.get("stroke", 6)) * self.scale))

        # render to its own layer so we can rotate it
        bbox = probe.multiline_textbbox((0, 0), "\n".join(lines), font=font, align="center",
                                        stroke_width=stroke, spacing=line_h - size)
        lw, lh = bbox[2] - bbox[0] + 8, bbox[3] - bbox[1] + 8
        layer = Image.new("RGBA", (max(4, lw), max(4, lh)), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.multiline_text((-bbox[0] + 4, -bbox[1] + 4), "\n".join(lines), font=font,
                          fill=style.get("tc", "#ffffff"), align="center", spacing=line_h - size,
                          stroke_width=stroke, stroke_fill=style.get("outline", "#101010"))
        rot = float(dlg.get("rotation", 0) or 0)
        if abs(rot) > 0.01:
            layer = layer.rotate(rot, expand=True, resample=Image.Resampling.BICUBIC)

        anchor_tok = str(dlg.get("anchor", "auto"))
        if anchor_tok.startswith("@"):
            try:
                ax, ay = [float(v) for v in anchor_tok[1:].split(",")]
            except Exception:
                ax, ay = 0.5, 0.35
        else:
            ax, ay = ANCHORS.get(anchor_tok) or (0.5, 0.3)
        cx = px0 + ax * pw
        cy = py0 + ay * ph
        target.alpha_composite(layer, (int(cx - layer.width / 2), int(cy - layer.height / 2)))
        rect = (cx - layer.width / 2, cy - layer.height / 2, cx + layer.width / 2, cy + layer.height / 2)
        return {"rect": rect, "style": "sfx", "text": text, "font_size": size, "lines": len(lines)}
