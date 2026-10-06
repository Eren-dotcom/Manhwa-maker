"""
Visual QC sheets -- the gates you cannot reduce to a number.

  contact_sheet   every panel in reading order, with labels, so drift and baked-in
                  text are obvious at a glance
  match_check     the character's reference sheet beside every panel they appear in
                  (the likeness gate)
  lettering_sheet the lettered strip annotated with balloon rects, tail endpoints,
                  gutter balloons, SFX bounds and prop text

Written to chNN/ and copied into output/epNNN/ so the whole gate lives with the episode.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .project import Project, save_json, strip_path
from .specs import find_fonts

INK = (16, 18, 22)
BG = (250, 250, 252)
LABEL = (90, 96, 108)


def _missing_label(p) -> str:
    """A panel with no art is not always a defect: black_out / white_out beats and
    explicit `fill` panels are painted by the compositor, so say what they are."""
    if p.get("fill"):
        return "filled"
    pace = str(p.get("pace") or "")
    if pace == "black_out":
        return "black-out beat"
    if pace == "white_out":
        return "white-out beat"
    return "no art"


def _fx_names(fx):
    """Panel `fx` accepts "speed_radial" or {"type": "speed_radial", ...} -- normalise for labels."""
    names = []
    for item in fx or []:
        names.append(str(item.get("type") or item.get("fx") or "fx")
                     if isinstance(item, dict) else str(item))
    return names


def _font(size: int) -> ImageFont.FreeTypeFont:
    fonts = find_fonts(None)
    return ImageFont.truetype(fonts.get("bold") or fonts["regular"], size)


def _fit(img: Image.Image, w: int, h: int) -> Image.Image:
    r = min(w / img.width, h / img.height)
    return img.resize((max(1, int(img.width * r)), max(1, int(img.height * r))),
                      Image.Resampling.LANCZOS)


# --------------------------------------------------------------------------- #
def contact_sheet(project: Project, ep_no: int, ep: dict, cols: int = 6,
                  cell_w: int = 300, cell_h: int = 420) -> Path:
    panels = ep.get("panels", [])
    raw = project.root / f"ch{ep_no:03d}" / "panels"
    rows = (len(panels) + cols - 1) // cols
    pad, head = 18, 92
    W = pad + cols * (cell_w + pad)
    H = head + rows * (cell_h + 46 + pad) + 320
    sheet = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(sheet)
    d.text((pad, 24), f"CONTACT SHEET - {project.series.get('title')} ch{ep_no:03d} "
                      f"({len(panels)} panels)", font=_font(28), fill=INK)
    d.text((pad, 58), "Gate 1: likeness vs reference sheets · no drift · no text baked into art · "
                      "balloon space composed in", font=_font(15), fill=LABEL)

    drift_marks = 0
    for i, p in enumerate(panels):
        r, c = divmod(i, cols)
        x = pad + c * (cell_w + pad)
        y = head + r * (cell_h + 46 + pad)
        d.rectangle((x, y, x + cell_w, y + cell_h), outline=(210, 214, 222), width=1)
        src = None
        for cand in (raw / f"{p.get('id')}.png", raw / f"{p.get('id')}.jpg"):
            if cand.exists():
                src = cand
                break
        if src is None:
            art = project.panel_image_path(ep_no, p.get("id", ""), p.get("image"))
            src = art
        if src is None:
            label = _missing_label(p)
            d.text((x + cell_w / 2, y + cell_h / 2), label, font=_font(18),
                   fill=(90, 96, 108) if label != "no art" else (190, 60, 50), anchor="mm")
        else:
            with Image.open(src) as im:
                fit = _fit(im.convert("RGB"), cell_w - 8, cell_h - 8)
            sheet.paste(fit, (x + (cell_w - fit.width) // 2, y + (cell_h - fit.height) // 2))
        cast = ", ".join(p.get("characters") or []) or "-"
        d.text((x + 2, y + cell_h + 4), f"{p.get('id')} · {p.get('shot')} · {p.get('beat')}",
               font=_font(14), fill=INK)
        d.text((x + 2, y + cell_h + 22), f"{cast} · {p.get('pace','normal')}"
                                         + (f" · fx:{','.join(_fx_names(p.get('fx')))}"
                                            if p.get("fx") else ""),
               font=_font(12), fill=LABEL)

    # checklist footer
    y = head + rows * (cell_h + 46 + pad) + 10
    d.text((pad, y), "HUMAN CHECKLIST", font=_font(17), fill=INK)
    items = [
        "Same face, hair length, fringe and identifying mark in every panel with that character",
        "Outfit consistent (and any change is deliberate + readable)",
        "Palette: no panel drifted into a different colour world",
        "NO text, letters, watermarks or UI baked into any panel",
        "Every panel composed with empty space where its balloon sits",
        "Injury / prop continuity: same side, same stage",
        "Establishing shots: 2-3 maximum for the chapter",
        "Close-ups and detail crops dominating the rhythm",
    ]
    for i, t in enumerate(items):
        ty = y + 30 + i * 24
        d.rectangle((pad + 2, ty + 4, pad + 16, ty + 18), outline=(120, 126, 138), width=2)
        d.text((pad + 26, ty), t, font=_font(15), fill=(60, 66, 78))

    out = project.root / f"ch{ep_no:03d}" / "contact-sheet.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return out


# --------------------------------------------------------------------------- #
def match_check(project: Project, ep_no: int, ep: dict, characters: list[str] | None = None,
                cell_w: int = 300, cell_h: int = 420) -> list[Path]:
    """Reference sheet beside every panel the character appears in -- the likeness gate."""
    chars = project.characters()
    present: dict[str, list[dict]] = {}
    for p in ep.get("panels", []):
        for c in (p.get("characters") or []):
            present.setdefault(c, []).append(p)
    wanted = characters or list(present)
    written = []
    raw = project.root / f"ch{ep_no:03d}" / "panels"
    for cid in wanted:
        panels = present.get(cid) or []
        ch = chars.get(cid) or {}
        refs = [project.root / r for r in (ch.get("ref_images") or []) if (project.root / r).exists()]
        cols = max(2, len(panels) + 1)
        pad, head = 18, 96
        W = pad + cols * (cell_w + pad)
        H = head + cell_h + 60 + pad
        sheet = Image.new("RGB", (W, H), BG)
        d = ImageDraw.Draw(sheet)
        d.text((pad, 22), f"LIKENESS MATCH-CHECK - {ch.get('name', cid)} "
                          f"({len(panels)} panel{'s' if len(panels) != 1 else ''})",
               font=_font(26), fill=INK)
        d.text((pad, 58), (ch.get("consistency_notes") or "No consistency notes on file.")[:170],
               font=_font(14), fill=LABEL)
        d.rectangle((pad, head, pad + cell_w, head + cell_h), outline=(60, 120, 90), width=3)
        if refs:
            with Image.open(refs[0]) as im:
                fit = _fit(im.convert("RGB"), cell_w - 8, cell_h - 8)
            sheet.paste(fit, (pad + (cell_w - fit.width) // 2, head + (cell_h - fit.height) // 2))
            d.text((pad + 2, head + cell_h + 6), f"REFERENCE · {refs[0].name}", font=_font(14), fill=(40, 110, 70))
        else:
            d.text((pad + cell_w / 2, head + cell_h / 2), "NO REFERENCE SHEET",
                   font=_font(18), fill=(190, 60, 50), anchor="mm")
            d.text((pad + 2, head + cell_h + 6), "generate the sheet before panels",
                   font=_font(14), fill=(190, 60, 50))
        for i, p in enumerate(panels):
            x = pad + (i + 1) * (cell_w + pad)
            d.rectangle((x, head, x + cell_w, head + cell_h), outline=(210, 214, 222), width=1)
            src = raw / f"{p.get('id')}.png"
            if not src.exists():
                art = project.panel_image_path(ep_no, p.get("id", ""), p.get("image"))
                src = art if art else None
            if src is None:
                d.text((x + cell_w / 2, head + cell_h / 2), _missing_label(p), font=_font(16),
                       fill=(150, 156, 168), anchor="mm")
            else:
                with Image.open(src) as im:
                    fit = _fit(im.convert("RGB"), cell_w - 8, cell_h - 8)
                sheet.paste(fit, (x + (cell_w - fit.width) // 2, head + (cell_h - fit.height) // 2))
            d.text((x + 2, head + cell_h + 6), f"{p.get('id')} · {p.get('shot')} · {p.get('beat')}",
                   font=_font(14), fill=INK)
        out = project.root / f"ch{ep_no:03d}" / f"match-check-{cid}.png"
        out.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(out)
        written.append(out)
    return written


# --------------------------------------------------------------------------- #
def lettering_sheet(project: Project, ep_no: int, layout: dict, manifest: dict | None = None) -> Path:
    """The lettered scroll annotated with every balloon, tail and SFX bound."""
    strip_file = strip_path(project.root / "output" / f"ep{ep_no:03d}")
    if strip_file is None:
        raise FileNotFoundError("assemble the episode first (no strip-master found)")
    with Image.open(strip_file) as im:
        strip = im.convert("RGB")
    W = strip.width
    scale = W / 1080.0
    legend_h = int(150 * scale)
    marked = Image.new("RGB", (W, strip.height + legend_h), BG)
    marked.paste(strip, (0, 0))
    d = ImageDraw.Draw(marked, "RGBA")

    colours = {
        "speech": (230, 60, 50), "shout": (230, 60, 50), "thought": (150, 80, 220),
        "whisper": (120, 126, 138), "narration": (150, 120, 40), "dark": (20, 20, 24),
        "urgent": (240, 130, 40), "recognition": (230, 190, 40), "symbol": (90, 90, 240),
        "hesitant": (120, 80, 200), "continuing": (60, 140, 220), "system": (40, 180, 200),
        "radio": (40, 180, 200), "technique": (60, 60, 70), "prop": (170, 60, 170),
        "sfx": (250, 120, 20), "none": (120, 120, 120),
    }
    f = _font(max(12, int(15 * scale)))
    counts: dict[str, int] = {}
    clipped = 0
    for p in layout.get("panels", []):
        for b in p.get("bubbles", []):
            r = b.get("rect") or []
            if len(r) != 4:
                continue
            style = b.get("style") or "speech"
            counts[style] = counts.get(style, 0) + 1
            col = colours.get(style, (120, 120, 120))
            d.rectangle(r, outline=col + (255,), width=max(2, int(3 * scale)))
            if style == "sfx":
                d.text((r[0] + 4, r[1] - int(20 * scale)), "SFX " + (b.get("fx") or ""), font=f, fill=col + (255,))
            elif style == "prop":
                d.text((r[0] + 4, r[1] - int(20 * scale)), "PROP", font=f, fill=col + (255,))
            if b.get("gutter"):
                d.text((r[0] + 4, r[1] + 4), "GUTTER", font=f, fill=(20, 150, 90, 255))
            if b.get("font_size") and b["font_size"] * (manifest or {}).get("export_width", 800) / W < 20:
                clipped += 1
                d.text((r[2] - int(120 * scale), r[1] - int(20 * scale)), "SMALL TYPE", font=f, fill=(230, 40, 30, 255))
            t = b.get("tail")
            if t and len(t) == 2:
                cx, cy = (r[0] + r[2]) / 2, (r[1] + r[3]) / 2
                d.line([(cx, cy), tuple(t)], fill=(30, 110, 240, 220), width=max(2, int(2 * scale)))
                rr = max(4, int(6 * scale))
                d.ellipse((t[0] - rr, t[1] - rr, t[0] + rr, t[1] + rr), outline=(30, 110, 240, 255),
                          width=max(2, int(2 * scale)))

    ly = strip.height + int(16 * scale)
    d.text((int(16 * scale), ly), "LETTERING QC - balloon bounds (colour = style) · blue = tail, "
                                "ringed at the speaker end · GUTTER = balloon in the gutter gap",
           font=_font(max(14, int(18 * scale))), fill=INK)
    lx = int(16 * scale)
    for i, (style, n) in enumerate(sorted(counts.items())):
        col = colours.get(style, (120, 120, 120))
        x = lx + (i % 9) * int(118 * scale)
        y = ly + int(26 * scale) + (i // 9) * int(24 * scale)
        d.rectangle((x, y + int(3 * scale), x + int(14 * scale), y + int(17 * scale)), outline=col + (255,), width=3)
        d.text((x + int(20 * scale), y), f"{style} x{n}", font=f, fill=(70, 76, 88))
    d.text((int(16 * scale), ly + int(78 * scale)),
           f"balloons: {sum(counts.values())} · styles used: {len(counts)} · "
           f"type under 20px at export: {clipped} · gutter balloons: "
           f"{sum(1 for p in layout.get('panels', []) for b in p.get('bubbles', []) if b.get('gutter'))}",
           font=f, fill=(70, 76, 88))

    out = project.root / f"ch{ep_no:03d}" / "lettering-qc.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    marked.save(out)
    # a downscaled copy beside the episode for convenience
    out_dir = project.root / "output" / f"ep{ep_no:03d}"
    out_dir.mkdir(parents=True, exist_ok=True)
    small = marked.resize((min(1000, marked.width), int(marked.height * min(1000, marked.width) / marked.width)),
                          Image.Resampling.LANCZOS)
    small.save(out_dir / "lettering-qc.png")
    save_json(out_dir / "qc-sheets.json", {"contact_sheet": f"ch{ep_no:03d}/contact-sheet.png",
                                           "lettering_qc": f"ch{ep_no:03d}/lettering-qc.png",
                                           "styles": counts})
    return out


def build_all(project: Project, ep_no: int, ep: dict, layout: dict, manifest: dict) -> dict:
    paths = {"contact_sheet": str(contact_sheet(project, ep_no, ep).relative_to(project.root)),
             "lettering_qc": str(lettering_sheet(project, ep_no, layout, manifest).relative_to(project.root)),
             "match_checks": [str(p.relative_to(project.root)) for p in match_check(project, ep_no, ep)]}
    save_json(project.root / "output" / f"ep{ep_no:03d}" / "qc-sheets.json", paths)
    return paths
