# Fonts

Drop your comic lettering fonts here and point `series.json → lettering.fonts` at them:

```json
"lettering": {
  "fonts": {
    "regular":   "assets/fonts/CCWildWords-Regular.ttf",
    "bold":      "assets/fonts/CCWildWords-Bold.ttf",
    "condensed": "assets/fonts/Bangers-Regular.ttf"
  }
}
```

Without them the toolkit falls back to DejaVu (system). It is legible, and it looks generic —
**a real comic font is the cheapest upgrade to perceived quality available to you.**

Recommended, all free for personal and commercial use:

| Font | Role |
|---|---|
| Anime Ace 2.0 | dialogue regular (the classic webtoon face) |
| CC Wild Words | dialogue bold |
| Bangers / Komika | SFX and shouts |
| Back Issues / Badaboom | SFX display |

Two or three faces per series is the ceiling — regular, bold, one display for SFX. More than that and
the page stops looking like one voice. The fonts are not bundled here because their licences, while
permissive, still require you to accept them yourself.
