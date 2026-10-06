"""
Panel effects, composited in code.

Speed lines, motion smears, impact flashes and trembling strokes are geometry and
timing, not illustration -- an image model cannot place them consistently and
will bake them into the art where you can never remove them. So they live here
and run on the assembled strip, per panel, driven by the panel's `fx` field.
"""
from __future__ import annotations

import math
import random

from PIL import Image, ImageDraw, ImageFilter

from .specs import PANEL_FX, scale_for


def _rgba(color: str, alpha: int) -> tuple[int, int, int, int]:
    c = (color or "#ffffff").lstrip("#")
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), alpha)


# --------------------------------------------------------------------------- #
# individual effects
# --------------------------------------------------------------------------- #
def speed_radial(layer: Image.Image, rect, color="#101010", count=90, seed=1):
    """Shock: lines converging on the panel's focal point."""
    rng = random.Random(seed)
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = rect
    cx, cy = (x0 + x1) / 2, (y0 + y1) * 0.42
    rmax = math.hypot(x1 - x0, y1 - y0) * 0.75
    for _ in range(count):
        ang = rng.uniform(0, math.tau)
        r0 = rng.uniform(0.22, 0.55) * rmax
        r1 = r0 + rng.uniform(0.18, 0.5) * rmax
        w = max(1, int(rng.uniform(1.5, 4) * scale_for(x1 - x0)))
        d.line([(cx + math.cos(ang) * r0, cy + math.sin(ang) * r0),
                (cx + math.cos(ang) * r1, cy + math.sin(ang) * r1)],
               fill=_rgba(color, rng.randint(70, 165)), width=w)


def speed_horizontal(layer: Image.Image, rect, color="#101010", count=70, seed=2, tint=None):
    """Motion: horizontal streaks that thin out toward the edges."""
    rng = random.Random(seed)
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = rect
    w, h = x1 - x0, y1 - y0
    use = tint or color
    for _ in range(count):
        yy = rng.uniform(y0, y1)
        lw = rng.uniform(0.18, 0.72) * w
        xx = rng.uniform(x0 - w * 0.15, x1 - lw * 0.4)
        th = max(1, int(rng.uniform(1.2, 3.4) * scale_for(w) * 0.6))
        d.line([(xx, yy), (xx + lw, yy)], fill=_rgba(use, rng.randint(55, 150)), width=th)


def speed_rage(layer: Image.Image, rect, seed=3):
    """Rage: red-tinted horizontal lines, denser and hotter."""
    speed_horizontal(layer, rect, color="#c81608", count=110, seed=seed)
    speed_horizontal(layer, rect, color="#ff4a2a", count=45, seed=seed + 1)


def smear(layer: Image.Image, rect, art: Image.Image, direction="right", strength=0.22, seed=4):
    """
    Motion smear: a horizontally displaced, blurred copy of the band of art
    under the streak. Cheaper and more controllable than asking the model.
    """
    x0, y0, x1, y1 = rect
    w, h = x1 - x0, y1 - y0
    band = art.crop(rect).convert("RGBA")
    blurred = band.filter(ImageFilter.GaussianBlur(max(2, int(6 * scale_for(w) * 0.4))))
    off = int(w * strength) * (1 if direction == "right" else -1)
    layer.alpha_composite(blurred, (x0 + off, y0))
    # fade it toward the trailing edge
    fade = Image.new("L", (w, h), 0)
    fd = ImageDraw.Draw(fade)
    steps = 24
    for i in range(steps):
        t = i / (steps - 1)
        a = int(150 * (1 - t))
        fd.rectangle((x0 + t * w, y0, x0 + (t + 1 / steps) * w, y1), fill=a)
    layer.paste(Image.new("RGBA", (w, h), (0, 0, 0, 0)), (x0, y0),
                Image.eval(fade, lambda v: 255 - v))


def flash(layer: Image.Image, rect, color="#ffffff", seed=5):
    """Impact flash: a radial bloom centred on the panel."""
    x0, y0, x1, y1 = rect
    w, h = x1 - x0, y1 - y0
    bloom = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(bloom)
    cx, cy = w / 2, h * 0.45
    r = max(w, h) * 0.62
    steps = 26
    for i in range(steps, 0, -1):
        t = i / steps
        rad = r * t
        a = int(190 * (1 - t) ** 1.6)
        d.ellipse((cx - rad, cy - rad * 0.72, cx + rad, cy + rad * 0.72), fill=_rgba(color, a))
    bloom = bloom.filter(ImageFilter.GaussianBlur(max(2, int(9 * scale_for(w) * 0.4))))
    layer.alpha_composite(bloom, (x0, y0))


def tremble(layer: Image.Image, rect, color="#2a2a2a", count=34, seed=6):
    """Nervousness: short vibrating strokes, usually beside a face."""
    rng = random.Random(seed)
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = rect
    w, h = x1 - x0, y1 - y0
    for _ in range(count):
        xx = rng.uniform(x0 + w * 0.05, x1 - w * 0.05)
        yy = rng.uniform(y0 + h * 0.05, y1 - h * 0.05)
        ln = rng.uniform(6, 20) * scale_for(w) * 0.5
        ang = rng.uniform(-0.5, 0.5) + (math.pi / 2)
        d.line([(xx, yy), (xx + math.cos(ang) * ln, yy + math.sin(ang) * ln)],
               fill=_rgba(color, rng.randint(80, 150)), width=max(1, int(rng.uniform(1, 2.6))))


def solid_fill(canvas: Image.Image, rect, color="#ffffff"):
    ImageDraw.Draw(canvas).rectangle(rect, fill=color)


def scene_tint(canvas: Image.Image, rect, tint: str, strength: float = 0.16, shadow: str | None = None):
    """
    Palette shift per scene: a subtle duotone so each location/time reads as its
    own world without repainting the art.
    """
    if not tint or strength <= 0:
        return
    x0, y0, x1, y1 = rect
    region = canvas.crop(rect)
    overlay = Image.new("RGB", region.size, tint)
    graded = Image.blend(region, overlay, max(0.0, min(0.6, strength)))
    if shadow:
        # deepen the low end so shadows pick up the scene's second colour
        dark = Image.new("RGB", region.size, shadow)
        mask = region.convert("L").point(lambda v: 255 if v < 96 else 0)
        graded = Image.composite(Image.blend(graded, dark, 0.35), graded, mask)
    canvas.paste(graded, (x0, y0))


# --------------------------------------------------------------------------- #
# driver
# --------------------------------------------------------------------------- #
def apply_panel_fx(canvas: Image.Image, rect, specs, scale: float = 1.0, seed: int = 0):
    """
    Apply a panel's `fx` list. Unknown effect names are ignored (the QC reports
    them separately so a typo doesn't silently do nothing).
    """
    if not specs:
        return []
    applied = []
    x0, y0, x1, y1 = rect
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    for i, spec in enumerate(specs):
        name = spec.get("type") if isinstance(spec, dict) else str(spec)
        opts = spec if isinstance(spec, dict) else {}
        color = opts.get("color")
        s = seed + i * 17
        if name == "speed_radial":
            speed_radial(layer, rect, color or "#101010", opts.get("count", 90), s)
        elif name == "speed_horizontal":
            speed_horizontal(layer, rect, color or "#101010", opts.get("count", 70), s)
        elif name == "speed_rage":
            speed_rage(layer, rect, s)
        elif name == "tremble":
            tremble(layer, rect, color or "#2a2a2a", opts.get("count", 34), s)
        elif name == "flash":
            flash(layer, rect, color or "#ffffff", s)
        elif name == "smear":
            smear(layer, rect, canvas, opts.get("direction", "right"),
                  opts.get("strength", 0.22), s)
        else:
            continue
        applied.append(name)
    canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), layer).convert("RGB"), (0, 0))
    return applied
