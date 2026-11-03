import type { Episode, Project } from '../store/types';
import { compilePanel, characterSheetPrompt, faceOf, sheetPrompt } from './prompt';
import { PLATFORMS } from '../store/constants';
import { refsForPanel, versionsFor, VERSION_LABEL } from './references';

// ---------------------------------------------------------------------------
// Publishing pack. Everything a human team, an image pipeline or a platform
// reviewer needs to rebuild this episode without the studio.
// ---------------------------------------------------------------------------

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'manhwa';

export function download(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const iso = (t?: string) => (t ? new Date(t).toLocaleString() : '—');

export function buildPromptPack(project: Project, episode: Episode): string {
  const panels = episode.panels;
  const L: string[] = [];
  L.push(`# ${project.meta.title} — render pack`);
  L.push('');
  L.push(`Episode ${episode.no}: **${episode.title}** · ${panels.length} panels · ${project.style.width}px wide`);
  L.push('');
  L.push('## 1. Style lock — paste unchanged into every generation');
  L.push('```');
  L.push(project.style.masterPrompt || '(empty — derive it in Prompt Compiler)');
  L.push('```');
  L.push('');
  L.push(`**Negative:** ${project.style.negativePrompt}`);
  L.push('');
  L.push(`**Seed:** ${project.style.seed} — keep fixed for the episode.`);
  L.push('');
  L.push('## 2. Reference memory — render these first, then attach them as image references');
  L.push('');
  L.push('A character is not one prompt, it is one *version* of one character, backed by sheets. Bind panels to versions below.');
  project.cast.forEach((c) => {
    L.push('');
    L.push(`### ${c.name}${c.koreanName ? ` (${c.koreanName})` : ''} — ${c.role}`);
    L.push(`- **Face anchor (permanent — never contains wardrobe):** ${faceOf(c)}`);
    L.push(`- **Default outfit:** ${c.outfit}`);
    L.push(`- **Silhouette:** ${c.silhouette}`);
    L.push(`- **Palette:** ${c.palette}`);
    const versions = versionsFor(project, c.id);
    if (!versions.length) {
      L.push(`- **Sheet prompt:** ${characterSheetPrompt(project, c)}`);
      return;
    }
    versions.forEach((v) => {
      const sheets = Object.keys(v.images ?? {});
      const parent = versions.find((x) => x.id === v.inheritsFrom);
      L.push('');
      L.push(
        `#### ${VERSION_LABEL[v.type]} · ${v.name} \`${v.slug}\`${parent ? ` ← ${parent.slug}` : ''}${v.approved ? ' ✓ approved' : ''}`,
      );
      if (v.description) L.push(`- **Design state:** ${v.description}`);
      if (v.identityMarkers.length) L.push(`- **Lineage markers (must survive):** ${v.identityMarkers.join(', ')}`);
      L.push(`- **Sheets attached:** ${sheets.length ? sheets.join(', ') : 'none — generate before rendering'}`);
      L.push(`- **Turnaround prompt:** ${sheetPrompt(project, c, v, 'turnaround')}`);
    });
  });
  L.push('');
  L.push('## 3. Panels');
  panels.forEach((p) => {
    const c = compilePanel(project, p);
    L.push('');
    L.push(`### P${String(p.no).padStart(2, '0')} — ${p.shot} / ${p.angle} / ${p.composition}${p.fullBleed ? ' / full-bleed' : ''}`);
    L.push(`- **Aspect:** ${c.aspect} · **Height weight:** ${p.height}× · **Gutter:** ${p.gutter}px`);
    if (c.characters.length) L.push(`- **Cast:** ${c.characters.map((x) => x.name).join(', ')}`);
    if (c.versions.length) L.push(`- **Versions:** ${c.versions.map((v) => `${v.name} (${v.slug})`).join(', ')}`);
    if (Object.keys(p.outfits ?? {}).length)
      L.push(
        `- **Outfits this panel:** ${Object.entries(p.outfits ?? {})
          .map(([id, o]) => `${project.cast.find((x) => x.id === id)?.name ?? id}: ${o}`)
          .join('; ')}`,
      );
    const refs = refsForPanel(project, p).length;
    if (refs) L.push(`- **Attach ${refs} reference sheet(s)** from section 2.`);
    L.push('');
    L.push('```');
    L.push(c.prompt);
    L.push('```');
    if (c.negative) L.push(`- **Negative:** ${c.negative}`);
    if (p.caption) L.push(`- **CAPTION:** ${p.caption}`);
    p.bubbles.forEach((b) => L.push(`- **${b.kind.toUpperCase()}**${b.speaker ? ` (${b.speaker})` : ''}: ${b.text}`));
    if (p.sfx.length) L.push(`- **SFX:** ${p.sfx.map((s) => s.text).join(', ')}`);
    if (p.note) L.push(`- **Direction:** ${p.note}`);
  });
  return L.join('\n');
}

export function buildJsonl(project: Project, episode: Episode): string {
  return episode.panels
    .map((p) => {
      const c = compilePanel(project, p);
      return JSON.stringify({
        id: p.id,
        panel: p.no,
        episode: episode.no,
        shot: p.shot,
        angle: p.angle,
        composition: p.composition,
        height: p.height,
        aspect: c.aspect,
        seed: c.seed,
        prompt: c.prompt,
        negative: c.negative,
        characters: c.characters.map((x) => x.name),
        character_versions: c.versions.map((v) => ({ slug: v.slug, name: v.name, type: v.type, markers: v.identityMarkers })),
        outfits: p.outfits ?? {},
        reference_sheets: refsForPanel(project, p).length,
        lettering: {
          caption: p.caption,
          bubbles: p.bubbles.map((b) => ({ kind: b.kind, speaker: b.speaker, text: b.text })),
        },
      });
    })
    .join('\n');
}

export function buildBible(project: Project): string {
  const p = PLATFORMS.find((x) => x.id === project.meta.platform);
  const L: string[] = [];
  L.push(`# ${project.meta.title}${project.meta.altTitle ? ` · ${project.meta.altTitle}` : ''}`);
  L.push('');
  L.push(`*${project.meta.logline || 'No logline yet.'}*`);
  L.push('');
  L.push('| Field | Value |');
  L.push('| --- | --- |');
  L.push(`| Genre | ${project.meta.genre}${project.meta.subgenres.length ? ` (${project.meta.subgenres.join(', ')})` : ''} |`);
  L.push(`| Tone | ${project.meta.tone || '—'} |`);
  L.push(`| Platform | ${p?.name ?? project.meta.platform} · ${p?.canvas ?? ''} · ${p?.cadence ?? ''} |`);
  L.push(`| Rating | ${project.meta.rating} |`);
  L.push(`| Audience | ${project.meta.audience || '—'} |`);
  L.push(`| Comparables | ${project.meta.comparisons.join(', ') || '—'} |`);
  L.push(`| Theme | ${project.meta.theme || '—'} |`);
  L.push(`| Hook | ${project.meta.hook || '—'} |`);
  L.push('');
  L.push('## World');
  L.push(project.world.premise || '_No premise yet._');
  L.push('');
  L.push('### Rules (hard, costly, breakable)');
  project.world.rules.forEach((r, i) => L.push(`${i + 1}. ${r}`));
  L.push('');
  L.push('### Locations');
  project.world.locations.forEach((l) => L.push(`- ${l}`));
  L.push('');
  L.push('### Glossary');
  project.world.glossary.forEach((g) => L.push(`- **${g.term}** — ${g.meaning}`));
  L.push('');
  L.push('## Cast');
  project.cast.forEach((c) => {
    L.push('');
    L.push(`### ${c.name}${c.koreanName ? ` (${c.koreanName})` : ''} — ${c.role}, ${c.age}`);
    L.push(`- **Want:** ${c.want}`);
    L.push(`- **Need:** ${c.need}`);
    L.push(`- **Flaw:** ${c.flaw}`);
    L.push(`- **Arc:** ${c.arc}`);
    L.push(`- **Voice:** ${c.voice}`);
    L.push(`- **Tics:** ${c.verbalTics}`);
    L.push(`- **Silhouette:** ${c.silhouette}`);
    L.push(`- **Outfit:** ${c.outfit}`);
    L.push(`- **Palette:** ${c.palette}`);
    L.push(`- **Face anchor:** \`${faceOf(c)}\``);
    const versions = versionsFor(project, c.id);
    if (versions.length) {
      L.push(`- **Versions:** ${versions.map((v) => `${v.name} (${VERSION_LABEL[v.type].toLowerCase()}, ${Object.keys(v.images ?? {}).length}/5 sheets${v.approved ? ', approved' : ''})`).join('; ')}`);
    }
  });
  L.push('');
  L.push('## Episodes');
  project.episodes.forEach((ep) => {
    L.push('');
    L.push(`### EP${ep.no} — ${ep.title}`);
    L.push(`${ep.logline}`);
    L.push('');
    L.push(`- **Hook:** ${ep.hook || '—'}`);
    L.push(`- **Cliffhanger:** ${ep.cliffhanger || '—'}`);
    L.push(`- **Panels:** ${ep.panels.length} (target ${ep.targetPanels})`);
    L.push('');
    L.push('| Unit | Beat | Tension | Ends | Panels | Summary |');
    L.push('| --- | --- | --- | --- | --- | --- |');
    ep.beats.forEach((b) =>
      L.push(`| ${b.unit} | ${b.fn} | ${'▮'.repeat(b.tension)} | ${b.scrollEnd} | ${b.panelTarget} | ${b.summary.replace(/\|/g, '/')} |`),
    );
  });
  L.push('');
  L.push('---');
  L.push(`Generated by Manhwa Maker Studio · ${iso(new Date().toISOString())}`);
  return L.join('\n');
}

export function serializeProject(project: Project, assets: Record<string, string>, inlineImages: boolean): string {
  const copy = JSON.parse(JSON.stringify(project)) as Project;
  if (inlineImages) {
    copy.episodes.forEach((ep) =>
      ep.panels.forEach((pn) => {
        if (pn.image?.startsWith('img:')) pn.image = assets[pn.image] ?? pn.image;
      }),
    );
  }
  return JSON.stringify(copy, null, 2);
}

// ---------------------------------------------------------------------------
// Standalone vertical-scroll reader (single HTML file, shareable)
// ---------------------------------------------------------------------------

const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function balloonHtml(b: {
  kind: string;
  speaker: string;
  text: string;
  x: number;
  y: number;
  tail: string;
  size: string;
}): string {
  const cls = `balloon b-${b.kind} tail-${b.tail} s-${b.size}`;
  return `<div class="${cls}" style="left:${b.x}%;top:${b.y}%"><span>${esc(b.text)}</span>${
    b.speaker && b.kind !== 'narration' ? `<em class="spk">${esc(b.speaker)}</em>` : ''
  }</div>`;
}

export function buildReaderHtml(project: Project, episode: Episode, assets: Record<string, string>): string {
  const look = project.style;
  const panels = episode.panels
    .map((p) => {
      const src = p.image?.startsWith('img:') ? assets[p.image] : p.image;
      const media = src
        ? `<img src="${esc(src)}" alt="Panel ${p.no}" loading="lazy" />`
        : `<div class="bp"><span>${esc(p.shot.toUpperCase())} · ${esc(p.action || p.setting || 'storyboard')}</span></div>`;
      const bubbles = p.bubbles.map(balloonHtml).join('');
      const sfx = p.sfx
        .map(
          (s) =>
            `<span class="sfx sfx-${s.style}" style="left:${s.x}%;top:${s.y}%;transform:translate(-50%,-50%) rotate(${s.rotation}deg) scale(${s.scale})">${esc(s.text)}</span>`,
        )
        .join('');
      const caption = p.caption ? `<div class="caption">${esc(p.caption)}</div>` : '';
      return `<section class="panel ${p.fullBleed ? 'bleed' : ''}" style="--gutter:${p.gutter}px;--ratio:${p.height}">
  <div class="art">${media}${bubbles}${sfx}${caption}</div>
</section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(project.meta.title)} — EP${episode.no} ${esc(episode.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Inter:wght@400;600&display=swap" rel="stylesheet"/>
<style>
:root{--paper:${look.lookId.includes('pastel') || look.lookId.includes('romance') ? '#fbf3e4' : '#0b0c10'};--ink:${look.lookId.includes('pastel') || look.lookId.includes('romance') ? '#2f2a26' : '#f4efe6'};--accent:#ff5a3c}
*{box-sizing:border-box}
body{margin:0;background:#050506;color:var(--ink);font-family:Inter,system-ui,sans-serif;display:flex;justify-content:center}
.strip{width:100%;max-width:800px;background:var(--paper)}
.head{padding:48px 28px 28px;background:var(--paper);border-bottom:1px solid rgba(128,128,128,.25)}
.eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;opacity:.6}
h1{font-family:'Space Grotesk',Inter,sans-serif;font-size:clamp(28px,6vw,46px);line-height:1.02;margin:10px 0 6px;letter-spacing:-.02em}
.meta{font-size:13px;opacity:.65}
.panel{margin-top:var(--gutter);padding:0}
.panel:first-of-type{margin-top:0}
.art{position:relative;width:100%;aspect-ratio:800 / calc(800 * var(--ratio));overflow:hidden;background:#111}
.panel.bleed .art{width:100vw;max-width:800px;margin:0 auto}
.art img{width:100%;height:100%;object-fit:cover;display:block}
.bp{position:absolute;inset:0;display:flex;align-items:flex-end;padding:22px;background:linear-gradient(160deg,#1a2430,#2f4256 45%,#6f8fa6);color:#dfe9f2;font-size:11px;letter-spacing:.16em;text-transform:uppercase;opacity:.95}
.bp span{max-width:80%;opacity:.75}
.balloon{position:absolute;transform:translate(-50%,-50%);max-width:62%;padding:10px 14px;border-radius:18px;background:#fff;color:#111;font-size:14px;line-height:1.35;text-align:center;box-shadow:0 2px 0 rgba(0,0,0,.18);font-weight:400}
.balloon .spk{display:block;font-size:9px;letter-spacing:.12em;text-transform:uppercase;opacity:.55;font-style:normal;margin-top:3px}
.s-sm{font-size:12px;padding:8px 11px;max-width:52%}
.s-lg{font-size:17px;padding:14px 18px;max-width:68%}
.b-thought{border-radius:26px;border:2px dashed #bbb;background:#fff;box-shadow:none}
.b-shout{background:#fff;border:2.5px solid #111;border-radius:12px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;font-size:15px}
.b-whisper{border:1.5px dashed #999;background:rgba(255,255,255,.92);font-style:italic;font-size:12px}
.b-narration{background:rgba(12,12,14,.86);color:#f4efe6;border-radius:2px;padding:8px 12px;font-size:12px;text-align:left;max-width:56%;transform:translate(0,-50%);left:8%!important}
.b-narration .spk{display:none}
.b-offpanel{border-bottom-right-radius:2px;background:#fff}
.b-system{background:#0d1b2a;color:#7ee8ff;border:1px solid #7ee8ff;font-family:monospace;font-size:12px;box-shadow:0 0 14px rgba(126,232,255,.4)}
.tail-b::after,.tail-bl::after,.tail-br::after{content:"";position:absolute;bottom:-8px;width:14px;height:14px;background:inherit;border:inherit;transform:rotate(45deg);border-top:none;border-left:none}
.tail-b::after{left:50%;margin-left:-7px}
.tail-bl::after{left:24%}
.tail-br::after{right:24%}
.tail-l::after,.tail-r::after{content:"";position:absolute;top:50%;width:14px;height:14px;background:inherit;border:inherit;transform:rotate(45deg)}
.tail-l::after{left:-7px;border-top:none;border-right:none}
.tail-r::after{right:-7px;border-bottom:none;border-left:none}
.tail-t::after,.tail-tl::after,.tail-tr::after{content:"";position:absolute;top:-8px;width:14px;height:14px;background:inherit;border:inherit;transform:rotate(45deg);border-bottom:none;border-right:none}
.tail-t::after{left:50%;margin-left:-7px}
.tail-tl::after{left:24%}
.tail-tr::after{right:24%}
.caption{position:absolute;top:14px;left:14px;right:auto;max-width:72%;background:rgba(8,9,11,.82);color:#f4efe6;padding:9px 13px;font-size:12px;line-height:1.4;letter-spacing:.01em;border-left:3px solid var(--accent)}
.sfx{position:absolute;font-family:Bangers,'Space Grotesk',sans-serif;color:#fff;text-shadow:0 0 0 #000,3px 3px 0 rgba(0,0,0,.55);font-size:clamp(26px,6vw,54px);letter-spacing:.02em;white-space:nowrap;pointer-events:none}
.sfx-ink{color:#f4efe6;-webkit-text-stroke:1.5px #0b0c10}
.sfx-impact{color:#ff5a3c;-webkit-text-stroke:2px #120404}
.sfx-neon{color:#7ee8ff;text-shadow:0 0 18px rgba(126,232,255,.8)}
.sfx-whoosh{color:#fff;font-style:italic;opacity:.85}
.sfx-hand{color:#111;-webkit-text-stroke:0;text-shadow:2px 2px 0 rgba(255,255,255,.4)}
.end{padding:56px 28px 80px;background:var(--paper);text-align:center;border-top:1px solid rgba(128,128,128,.25)}
.end .nxt{font-family:'Space Grotesk',Inter,sans-serif;font-size:20px;letter-spacing:-.01em;margin-bottom:8px}
.end .cliff{font-size:13px;opacity:.7;max-width:46ch;margin:0 auto 22px;line-height:1.5}
.badge{display:inline-block;font-size:10px;letter-spacing:.2em;text-transform:uppercase;padding:7px 12px;border:1px solid currentColor;opacity:.55}
@media print{body{background:#fff}.strip{max-width:none}.panel{page-break-inside:avoid}}
</style></head>
<body><main class="strip">
<header class="head">
  <div class="eyebrow">${esc(project.meta.genre)} · ${esc(project.meta.platform)} · EP ${episode.no}</div>
  <h1>${esc(project.meta.title)}</h1>
  <div class="meta">${esc(episode.title)} · ${esc(project.meta.logline)}</div>
</header>
${panels}
<footer class="end">
  <div class="nxt">Next episode</div>
  <div class="cliff">${esc(episode.cliffhanger || 'The story continues.')}</div>
  <div class="badge">Made with Manhwa Maker Studio</div>
</footer>
</main></body></html>`;
}

/** Printable storyboard (one panel per two-column grid) — used by QC printing. */
export function buildStoryboardPrint(project: Project, episode: Episode): string {
  const rows = episode.panels
    .map(
      (p) => `<tr>
  <td class="no">P${String(p.no).padStart(2, '0')}</td>
  <td>${esc(p.shot)} / ${esc(p.angle)} / ${esc(p.composition)}${p.fullBleed ? ' · BLEED' : ''}<br/><em>${esc(p.setting)}</em></td>
  <td>${esc(p.action)}</td>
  <td>${p.caption ? `<b>CAP:</b> ${esc(p.caption)}<br/>` : ''}${p.bubbles
        .map((b) => `<b>${esc(b.speaker || b.kind)}:</b> ${esc(b.text)}`)
        .join('<br/>')}</td>
  <td>${esc(p.note)}</td>
</tr>`,
    )
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(project.meta.title)} — storyboard</title>
<style>body{font-family:Inter,system-ui,sans-serif;margin:32px;color:#111}h1{font-size:22px;margin:0 0 4px}
.sub{font-size:12px;opacity:.6;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #ccc;padding:7px 8px;vertical-align:top;text-align:left}th{background:#f1f1ee;font-size:10px;letter-spacing:.08em;text-transform:uppercase}
.no{font-weight:700;white-space:nowrap}em{opacity:.6}@media print{body{margin:14mm}}</style></head>
<body><h1>${esc(project.meta.title)} — EP${episode.no} ${esc(episode.title)}</h1>
<div class="sub">${episode.panels.length} panels · style lock: ${esc(project.style.lookId)} · generated ${new Date().toLocaleDateString()}</div>
<table><thead><tr><th>Panel</th><th>Shot</th><th>Action</th><th>Lettering</th><th>Direction</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}
