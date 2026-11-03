import { useState } from 'react';
import { useStudio } from '../store/studio';
import { GENRE_PRESETS, LOOKS, PALETTES, PLATFORMS } from '../store/constants';
import type { Genre, Platform } from '../store/types';
import { Badge, Btn, Card, Chips, Field, SectionHead, Select, Slider, TextArea, TextInput, Icon } from '../components/ui';
import { StageNav } from '../components/StageNav';
import { useAction } from '../components/useAction';
import { buildStyleLock } from '../lib/prompt';
import { copyText } from '../lib/export';

export function Concept() {
  const { project, update, toast } = useStudio();
  const { run, busy } = useAction();
  const [derived, setDerived] = useState(false);
  const preset = GENRE_PRESETS.find((g) => g.genre === project.meta.genre);

  const setMeta = (patch: Partial<typeof project.meta>) => update((p) => Object.assign(p.meta, patch));
  const setStyle = (patch: Partial<typeof project.style>) => update((p) => Object.assign(p.style, patch));

  const applyPreset = () => {
    if (!preset) return;
    update((p) => {
      p.meta.logline = preset.logline;
      p.meta.hook = preset.hook;
      p.meta.tone = preset.tone;
      p.meta.theme = preset.theme;
      p.meta.comparisons = preset.compare;
      p.world.visualMotifs = preset.motifs;
      if (!p.meta.title || p.meta.title === 'Untitled Manhwa' || p.meta.title === 'New Manhwa') {
        p.meta.title = preset.provisionalTitle;
      }
    });
    toast(`Loaded the ${preset.label} template`, 'ok');
  };

  const deriveLock = () => {
    update((p) => {
      p.style.masterPrompt = buildStyleLock(p);
    });
    setDerived(true);
    toast('Style lock derived from the look', 'ok');
  };

  return (
    <div className="stack gap-24">
      <SectionHead
        eyebrow="Stage 01 · Concept"
        title="Concept & style lock"
        desc="Everything downstream inherits from this screen: the promise to the reader, the platform you are writing against, and the single fixed look that keeps 200 panels coherent."
        right={
          <>
            <Btn variant="ghost" icon="layers" onClick={applyPreset}>Load {preset?.label ?? 'preset'}</Btn>
            <Btn variant="primary" icon="spark" loading={busy === 'concept'} onClick={() => void run('concept')}>
              Develop concept
            </Btn>
          </>
        }
      />

      <div className="split">
        <div className="stack gap-16">
          <Card>
            <div className="card-title">Identity</div>
            <div className="form-grid">
              <Field label="Series title">
                <TextInput value={project.meta.title} onChange={(e) => setMeta({ title: e.target.value })} placeholder="The Lantern Bureau" />
              </Field>
              <Field label="Korean / alternate title" hint="Naver and Kakao listings use a native-language title.">
                <TextInput
                  value={project.meta.altTitle}
                  onChange={(e) => setMeta({ altTitle: e.target.value })}
                  placeholder="등불청"
                  style={{ fontFamily: 'var(--font-kr)' }}
                />
              </Field>
            </div>

            <div style={{ marginTop: 14 }}>
              <Field label="Genre">
                <Chips
                  options={GENRE_PRESETS.map((g) => ({ id: g.genre as Genre, label: g.label }))}
                  value={project.meta.genre}
                  onChange={(g) => setMeta({ genre: g })}
                  size="sm"
                />
              </Field>
            </div>

            <div className="form-grid" style={{ marginTop: 14 }}>
              <Field label="Platform" hint={PLATFORMS.find((p) => p.id === project.meta.platform)?.canvas}>
                <Select value={project.meta.platform} onChange={(e) => setMeta({ platform: e.target.value as Platform })}>
                  {PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Rating">
                <TextInput value={project.meta.rating} onChange={(e) => setMeta({ rating: e.target.value })} placeholder="Teen 13+" />
              </Field>
            </div>

            <Field label="Tone" hint="Three adjectives and one warning.">
              <TextInput value={project.meta.tone} onChange={(e) => setMeta({ tone: e.target.value })} placeholder="Cold, patient, quietly cruel" />
            </Field>
          </Card>

          <Card>
            <div className="card-title">The pitch</div>
            <Field
              label="Logline"
              hint="[Protagonist] must [goal] or [stakes], but [obstacle]. Under 35 words, no abstractions."
              right={<Counter value={project.meta.logline.split(/\s+/).filter(Boolean).length} target={35} />}
            >
              <TextArea
                rows={3}
                value={project.meta.logline}
                onChange={(e) => setMeta({ logline: e.target.value })}
                placeholder="A disgraced ferryman must walk forty-one souls home in one night, but the one lantern that cannot go out belongs to his dead sister."
              />
            </Field>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <Field label="Scroll hook" hint="The image or line in panel 1–3 that stops a thumb.">
                <TextArea
                  rows={2}
                  value={project.meta.hook}
                  onChange={(e) => setMeta({ hook: e.target.value })}
                  placeholder="Every lantern in the city has gone dark. Except the one in his hand."
                />
              </Field>
              <Field label="Theme" hint="A question the series argues with — not a moral.">
                <TextArea
                  rows={2}
                  value={project.meta.theme}
                  onChange={(e) => setMeta({ theme: e.target.value })}
                  placeholder="What we owe the dead, and what we hide from the living."
                />
              </Field>
            </div>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <Field label="Audience">
                <TextInput value={project.meta.audience} onChange={(e) => setMeta({ audience: e.target.value })} placeholder="18–34 vertical-scroll readers" />
              </Field>
              <Field label="Comparables" hint="Comma separated. Used in pitches and in AI context.">
                <TextInput
                  value={project.meta.comparisons.join(', ')}
                  onChange={(e) => setMeta({ comparisons: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="Omniscient Reader, Tower of God"
                />
              </Field>
            </div>
          </Card>

          <Card>
            <div className="card-title">Style lock</div>
            <p className="small muted" style={{ marginBottom: 14 }}>
              Pick the look first. The master prompt below is pasted, unchanged, into every render — this is the single
              most effective anti-drift control in the studio.
            </p>
            <div className="look-grid">
              {LOOKS.map((l) => (
                <button
                  key={l.id}
                  className={`look-card ${project.style.lookId === l.id ? 'is-on' : ''}`}
                  onClick={() => setStyle({ lookId: l.id })}
                >
                  <span className="look-swatch" style={{ background: l.gradient }}>
                    <span className="look-line" style={{ opacity: 0.85 }} />
                  </span>
                  <span className="look-name">{l.name}</span>
                  <span className="look-tag">{l.tagline}</span>
                </button>
              ))}
            </div>

            <div className="form-grid" style={{ marginTop: 16 }}>
              <Field label="Line weight">
                <Select value={project.style.lineWeight} onChange={(e) => setStyle({ lineWeight: e.target.value as typeof project.style.lineWeight })}>
                  <option value="hairline">Hairline — delicate, romance</option>
                  <option value="clean">Clean — default webtoon</option>
                  <option value="bold">Bold — action, impact</option>
                  <option value="brush">Brush — noir, historical</option>
                </Select>
              </Field>
              <Field label="Shading">
                <Select value={project.style.shading} onChange={(e) => setStyle({ shading: e.target.value as typeof project.style.shading })}>
                  <option value="flat">Flat colour</option>
                  <option value="cel">Cel — two tone</option>
                  <option value="soft-gradient">Soft gradient</option>
                  <option value="painterly">Painterly</option>
                  <option value="hatched">Hatched</option>
                </Select>
              </Field>
            </div>

            <div className="form-grid" style={{ marginTop: 14 }}>
              <Field label="Palette">
                <div className="palette-list">
                  {PALETTES.map((p) => (
                    <button
                      key={p.id}
                      className={`palette ${project.style.paletteId === p.id ? 'is-on' : ''}`}
                      onClick={() => setStyle({ paletteId: p.id })}
                      title={p.name}
                    >
                      {p.colors.map((c) => (
                        <span key={c} style={{ background: c }} />
                      ))}
                      <em>{p.name}</em>
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <Field
              label="Master prompt"
              hint="Frozen style sentence. Character anchors get appended per panel, never inside this block."
              right={
                <div className="row gap-6">
                  <button className="link-btn" onClick={deriveLock}>Derive from look</button>
                  <button
                    className="link-btn"
                    onClick={async () => {
                      const ok = await copyText(project.style.masterPrompt || buildStyleLock(project));
                      toast(ok ? 'Style lock copied' : 'Copy failed', ok ? 'ok' : 'err');
                    }}
                  >
                    Copy
                  </button>
                </div>
              }
            >
              <TextArea
                rows={4}
                className="mono"
                value={project.style.masterPrompt}
                onChange={(e) => setStyle({ masterPrompt: e.target.value })}
                placeholder="Click “Derive from look”, then edit the language until it matches what you see in your head."
              />
            </Field>

            <Field label="Negative prompt" hint="Forbid text, style drift and the usual anatomy failures.">
              <TextArea rows={2} className="mono" value={project.style.negativePrompt} onChange={(e) => setStyle({ negativePrompt: e.target.value })} />
            </Field>

            <div className="form-grid" style={{ marginTop: 14, alignItems: 'end' }}>
              <Field label="Seed" hint="Fixed across the episode. Only re-roll character sheets.">
                <div className="row gap-6">
                  <TextInput
                    type="number"
                    value={project.style.seed}
                    onChange={(e) => setStyle({ seed: Number(e.target.value) })}
                  />
                  <Btn size="sm" icon="refresh" variant="ghost" onClick={() => setStyle({ seed: Math.floor(Math.random() * 999999) })}>
                    Roll
                  </Btn>
                </div>
              </Field>
              <Slider
                label="Canvas width"
                min={690}
                max={1080}
                step={10}
                value={project.style.width}
                onChange={(v) => setStyle({ width: v })}
                format={(v) => `${v}px`}
                hint="Naver/Kakao 690 · WEBTOON 800 · own site 1080"
              />
            </div>
            {derived && <div className="tiny dim" style={{ marginTop: 8 }}>Lock derived locally — edit freely, it is only a string.</div>}
          </Card>
        </div>

        <aside className="stack gap-14">
          <Card className="pitch-card">
            <div className="eyebrow">Pitch card</div>
            <div className="pitch-look" style={{ background: LOOKS.find((l) => l.id === project.style.lookId)?.gradient }}>
              <span className="pitch-korean" style={{ fontFamily: 'var(--font-kr)' }}>{project.meta.altTitle || '제목'}</span>
            </div>
            <h3 className="pitch-title">{project.meta.title || 'Untitled'}</h3>
            <div className="row gap-6 wrap" style={{ marginBottom: 10 }}>
              <Badge tone="accent">{project.meta.genre}</Badge>
              <Badge>{project.meta.rating}</Badge>
            </div>
            <p className="small" style={{ lineHeight: 1.6, color: 'var(--text)' }}>
              {project.meta.logline || 'No logline yet.'}
            </p>
            <div className="pitch-divider" />
            <div className="kv-list">
              <div><span>Platform</span><strong>{PLATFORMS.find((p) => p.id === project.meta.platform)?.name}</strong></div>
              <div><span>Cadence</span><strong>{PLATFORMS.find((p) => p.id === project.meta.platform)?.cadence}</strong></div>
              <div><span>Comparables</span><strong>{project.meta.comparisons.join(', ') || '—'}</strong></div>
            </div>
            <div className="pitch-quote">
              <Icon name="flame" size={13} />
              <span>{project.meta.hook || 'A hook goes here.'}</span>
            </div>
          </Card>

          <Card className="protocol-note">
            <div className="eyebrow">Concept checklist</div>
            <ul className="checklist">
              <li className={project.meta.logline ? 'ok' : ''}>Logline under 35 words, with a physical obstacle</li>
              <li className={project.meta.hook ? 'ok' : ''}>Hook is an image, not an explanation</li>
              <li className={project.meta.theme ? 'ok' : ''}>Theme is a question, not a lesson</li>
              <li className={project.meta.comparisons.length ? 'ok' : ''}>Two comparables a platform editor can sell</li>
              <li className={project.style.masterPrompt ? 'ok' : ''}>Style lock frozen and reusable</li>
            </ul>
          </Card>
        </aside>
      </div>

      <StageNav stage="concept" />
    </div>
  );
}

function Counter({ value, target }: { value: number; target: number }) {
  const over = value > target;
  return (
    <span className={`counter ${over ? 'is-over' : ''}`}>
      {value}/{target} words
    </span>
  );
}
