import { useEffect, useMemo, useState } from 'react';
import { useStudio } from '../store/studio';
import type { Composition, Panel, ShotType, CameraAngle } from '../store/types';
import { emptyPanel, uid } from '../store/types';
import { ANGLES, COMPOSITIONS, SHOTS } from '../store/constants';
import {
  Badge,
  Btn,
  Card,
  Chips,
  Field,
  Icon,
  IconBtn,
  SectionHead,
  Select,
  Slider,
  TextArea,
  TextInput,
  Toggle,
} from '../components/ui';
import { PanelArt } from '../components/PanelArt';
import { StageNav } from '../components/StageNav';
import { useAction } from '../components/useAction';
import { useNavigate } from '../components/nav';
import { resolvedVersion, versionsFor } from '../lib/references';

const SHOT_TONE: Record<string, string> = {
  establishing: 'neutral',
  wide: 'neutral',
  full: 'info',
  medium: 'info',
  'medium-close': 'accent',
  'close-up': 'accent',
  'extreme-close': 'err',
  insert: 'warn',
  'over-shoulder': 'info',
  silhouette: 'err',
  'panel-less': 'warn',
};

export function Panels() {
  const { project, episode, update, toast } = useStudio();
  const { run, busy } = useAction();
  const navigate = useNavigate();
  const panels = episode?.panels ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = panels.find((p) => p.id === selectedId) ?? panels[0] ?? null;

  useEffect(() => {
    if (!selectedId && panels[0]) setSelectedId(panels[0].id);
  }, [panels, selectedId]);

  const mutatePanel = (id: string, patch: Partial<Panel>) =>
    update((p) => {
      const ep = p.episodes.find((e) => e.id === p.activeEpisodeId) ?? p.episodes[0];
      const i = ep?.panels.findIndex((x) => x.id === id) ?? -1;
      if (ep && i >= 0) ep.panels[i] = { ...ep.panels[i], ...patch };
      if (ep) p.gates.panels = new Date().toISOString();
    });

  const mutatePanels = (fn: (list: Panel[]) => Panel[]) =>
    update((p) => {
      const ep = p.episodes.find((e) => e.id === p.activeEpisodeId) ?? p.episodes[0];
      if (!ep) return;
      ep.panels = fn(ep.panels).map((pn, i) => ({ ...pn, no: i + 1 }));
    });

  const addPanel = (afterNo?: number) => {
    const pn = emptyPanel((afterNo ?? panels.length) + 1);
    pn.setting = project.world.locations[0] ?? '';
    pn.beatId = episode?.beats[Math.min(episode.beats.length - 1, Math.max(0, Math.floor(panels.length / 4)))]?.id ?? null;
    pn.characterIds = project.cast[0] ? [project.cast[0].id] : [];
    mutatePanels((list) => {
      if (afterNo == null) return [...list, pn];
      const idx = list.findIndex((x) => x.no === afterNo);
      const copy = [...list];
      copy.splice(idx + 1, 0, pn);
      return copy;
    });
    setSelectedId(pn.id);
  };

  const duplicatePanel = (pn: Panel) => {
    const copy: Panel = {
      ...JSON.parse(JSON.stringify(pn)),
      id: uid('pnl'),
      no: pn.no + 1,
      bubbles: pn.bubbles.map((b) => ({ ...b, id: uid('bub') })),
      sfx: pn.sfx.map((s) => ({ ...s, id: uid('sfx') })),
      image: pn.image,
      reviewed: false,
    };
    mutatePanels((list) => {
      const idx = list.findIndex((x) => x.id === pn.id);
      const next = [...list];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setSelectedId(copy.id);
    toast('Panel duplicated', 'ok');
  };

  const removePanel = (id: string) => {
    mutatePanels((list) => list.filter((x) => x.id !== id));
    setSelectedId(null);
  };

  const move = (id: string, dir: -1 | 1) => {
    mutatePanels((list) => {
      const i = list.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const rhythmMax = 2.2;
  const stats = useMemo(() => {
    const bleed = panels.filter((p) => p.fullBleed).length;
    const shots = new Set(panels.map((p) => p.shot)).size;
    const silent = panels.filter((p) => !p.bubbles.length && !p.caption).length;
    const avg = panels.length ? panels.reduce((n, p) => n + p.height, 0) / panels.length : 0;
    return { bleed, shots, silent, avg };
  }, [panels]);

  return (
    <div className="stack gap-24">
      <SectionHead
        eyebrow="Stage 04 · Panel director"
        title="Panel direction"
        desc="Every panel is a decision: shot, angle, staging and vertical weight. Height is a verb — tall panels linger, short panels snap."
        right={
          <>
            <Btn variant="ghost" icon="plus" onClick={() => addPanel()}>Add panel</Btn>
            <Btn
              variant="ghost"
              icon="type"
              onClick={() => navigate('lettering')}
            >
              Lettering
            </Btn>
            <Btn variant="primary" icon="spark" loading={busy === 'panels'} onClick={() => void run('panels')}>
              Break down episode
            </Btn>
          </>
        }
      />

      {panels.length > 0 && (
        <Card className="rhythm-strip">
          <div className="row between" style={{ marginBottom: 10 }}>
            <div className="row gap-10">
              <span className="eyebrow">Scroll rhythm</span>
              <span className="tiny dim">{panels.length} panels · avg {stats.avg.toFixed(2)}× · {stats.bleed} full-bleed · {stats.shots} shot types used</span>
            </div>
            <div className="row gap-6 tiny dim">
              <Icon name="move" size={12} /> click a bar to select
            </div>
          </div>
          <div className="rhythm-track">
            {panels.map((p) => (
              <button
                key={p.id}
                className={`rhythm-col ${p.id === selected?.id ? 'is-selected' : ''} ${p.fullBleed ? 'is-bleed' : ''}`}
                onClick={() => setSelectedId(p.id)}
                title={`P${p.no} · ${p.shot} · ${p.height}×`}
              >
                <span className="rhythm-col-fill" style={{ height: `${(p.height / rhythmMax) * 100}%` }}>
                  <span className="rhythm-col-label">{p.no}</span>
                </span>
                <span className={`rhythm-col-dot ${p.image ? 'has-art' : ''}`} />
              </button>
            ))}
          </div>
          <div className="rhythm-units">
            {episode?.beats.map((b) => {
              const count = panels.filter((p) => p.beatId === b.id).length;
              if (!count) return null;
              return (
                <span key={b.id} className={`unit-chip fn-${b.fn}` } style={{ flex: count }}>
                  <span>{b.fn}</span>
                  <em>{count}</em>
                </span>
              );
            })}
          </div>
        </Card>
      )}

      {panels.length ? (
        <div className="panels-layout">
          <div className="panel-grid">
            {panels.map((p) => (
              <button
                key={p.id}
                className={`panel-card ${p.id === selected?.id ? 'is-selected' : ''}`}
                onClick={() => setSelectedId(p.id)}
              >
                <div className="panel-card-art">
                  <PanelArt project={project} panel={p} showLabel={false} />
                  <span className="panel-card-no">P{String(p.no).padStart(2, '0')}</span>
                  {p.image && <span className="panel-card-render"><Icon name="check" size={10} /></span>}
                  {p.reviewed && <span className="panel-card-reviewed">✓</span>}
                </div>
                <div className="panel-card-body">
                  <div className="row gap-4 wrap" style={{ marginBottom: 5 }}>
                    <Badge tone={(SHOT_TONE[p.shot] as 'neutral') ?? 'neutral'}>{p.shot}</Badge>
                    <Badge tone="neutral">{p.height}×</Badge>
                  </div>
                  <p className="panel-card-action">{p.action || p.setting || 'Nothing staged yet.'}</p>
                  <div className="panel-card-foot">
                    <span className="tiny dim">{p.bubbles.length ? `${p.bubbles.length} balloon${p.bubbles.length > 1 ? 's' : ''}` : 'silent'}</span>
                    {p.caption && <span className="tiny dim">· caption</span>}
                    {p.fullBleed && <span className="tiny dim">· bleed</span>}
                  </div>
                </div>
              </button>
            ))}
            <button className="panel-card is-add" onClick={() => addPanel()}>
              <Icon name="plus" size={20} />
              <span>Add panel</span>
            </button>
          </div>

          {selected && (
            <aside className="inspector">
              <div className="inspector-head">
                <div>
                  <div className="eyebrow">Panel {selected.no}</div>
                  <div className="small muted">
                    {selected.beatId
                      ? `Unit ${episode?.beats.find((b) => b.id === selected.beatId)?.unit ?? '—'} · ${episode?.beats.find((b) => b.id === selected.beatId)?.fn ?? ''}`
                      : 'Unassigned to a beat'}
                  </div>
                </div>
                <div className="row gap-4">
                  <IconBtn icon="chevron" label="Move earlier" style={{ transform: 'rotate(-90deg)' }} onClick={() => move(selected.id, -1)} />
                  <IconBtn icon="chevron" label="Move later" style={{ transform: 'rotate(90deg)' }} onClick={() => move(selected.id, 1)} />
                  <IconBtn icon="copy" label="Duplicate" onClick={() => duplicatePanel(selected)} />
                  <IconBtn icon="trash" label="Delete" onClick={() => removePanel(selected.id)} />
                </div>
              </div>

              <div className="inspector-art">
                <PanelArt project={project} panel={selected} showGuides />
              </div>

              <div className="inspector-body">
                <div className="form-grid">
                  <Field label="Shot">
                    <Select value={selected.shot} onChange={(e) => mutatePanel(selected.id, { shot: e.target.value as ShotType })}>
                      {SHOTS.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Angle">
                    <Select value={selected.angle} onChange={(e) => mutatePanel(selected.id, { angle: e.target.value as CameraAngle })}>
                      {ANGLES.map((a) => (
                        <option key={a.id} value={a.id}>{a.label}</option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <Field label="Composition" hint={COMPOSITIONS.find((c) => c.id === selected.composition)?.note}>
                  <Select value={selected.composition} onChange={(e) => mutatePanel(selected.id, { composition: e.target.value as Composition })}>
                    {COMPOSITIONS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Staged moment" hint="One frozen instant. Present tense. What the reader sees, not what it means.">
                  <TextArea rows={3} value={selected.action} onChange={(e) => mutatePanel(selected.id, { action: e.target.value })} />
                </Field>

                <Field
                  label="Setting"
                  hint={
                    project.world.locations.length
                      ? 'Reuse a world location verbatim — identical background wording is what keeps a place the same place.'
                      : undefined
                  }
                  right={
                    project.world.locations.length ? (
                      <button
                        className="link-btn"
                        onClick={() => mutatePanel(selected.id, { setting: project.world.locations[0] })}
                      >
                        use first location
                      </button>
                    ) : undefined
                  }
                >
                  <TextInput
                    list="world-locations"
                    value={selected.setting}
                    onChange={(e) => mutatePanel(selected.id, { setting: e.target.value })}
                    placeholder="the lower river — stepped banks, fog"
                  />
                  <datalist id="world-locations">
                    {project.world.locations.map((l) => (
                      <option key={l} value={l} />
                    ))}
                  </datalist>
                </Field>

                <div className="form-grid">
                  <Field label="Time / weather">
                    <TextInput value={selected.timeOfDay} onChange={(e) => mutatePanel(selected.id, { timeOfDay: e.target.value })} />
                  </Field>
                  <Field label="Lighting">
                    <TextInput value={selected.lighting} onChange={(e) => mutatePanel(selected.id, { lighting: e.target.value })} placeholder="lantern uplight, cold rim" />
                  </Field>
                </div>

                <Field label="Cast in frame">
                  {project.cast.length ? (
                    <Chips
                      options={project.cast.map((c) => ({ id: c.id, label: c.name }))}
                      value={selected.characterIds}
                      multi
                      size="sm"
                      onChange={(id) =>
                        mutatePanel(selected.id, {
                          characterIds: selected.characterIds.includes(id)
                            ? selected.characterIds.filter((x) => x !== id)
                            : [...selected.characterIds, id],
                        })
                      }
                    />
                  ) : (
                    <div className="tiny dim">No cast yet — add characters in the Story Bible.</div>
                  )}
                  {selected.characterIds.length > 0 && (
                    <div className="cast-bind">
                      {selected.characterIds.map((id) => {
                        const c = project.cast.find((x) => x.id === id);
                        if (!c) return null;
                        const versions = versionsFor(project, id);
                        const bound = resolvedVersion(project, selected, id);
                        return (
                          <div className="cast-bind-row" key={id}>
                            <div className="cast-bind-name">
                              <Icon name="user" size={13} />
                              <span>{c.name}</span>
                              {bound && bound.type !== 'base' && (
                                <Badge tone={bound.images.portrait || bound.images.fullBody ? 'info' : 'warn'} dot>
                                  {bound.name}
                                </Badge>
                              )}
                            </div>
                            <div className="row gap-6">
                              <Select
                                aria-label={`${c.name} version`}
                                value={selected.versions?.[id] ?? ''}
                                onChange={(e) =>
                                  mutatePanel(selected.id, {
                                    versions: { ...(selected.versions ?? {}), [id]: e.target.value },
                                  })
                                }
                              >
                                <option value="">base design</option>
                                {versions
                                  .filter((v) => v.type !== 'base')
                                  .map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.name}
                                    </option>
                                  ))}
                              </Select>
                              <TextInput
                                aria-label={`${c.name} outfit`}
                                placeholder={c.outfit || 'default outfit'}
                                value={selected.outfits?.[id] ?? ''}
                                onChange={(e) =>
                                  mutatePanel(selected.id, {
                                    outfits: { ...(selected.outfits ?? {}), [id]: e.target.value },
                                  })
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                      <p className="tiny dim">
                        A version is a costume, injury or awakening with its own reference sheets. Outfit only changes what this
                        one panel wears — the face stays the same.
                      </p>
                    </div>
                  )}
                </Field>

                <Field label="Beat">
                  <Select
                    value={selected.beatId ?? ''}
                    onChange={(e) => mutatePanel(selected.id, { beatId: e.target.value || null })}
                  >
                    <option value="">— unassigned —</option>
                    {episode?.beats.map((b) => (
                      <option key={b.id} value={b.id}>U{b.unit} · {b.fn}</option>
                    ))}
                  </Select>
                </Field>

                <Slider
                  label="Vertical weight"
                  value={selected.height}
                  min={0.5}
                  max={2.2}
                  step={0.05}
                  onChange={(v) => mutatePanel(selected.id, { height: v })}
                  format={(v) => `${v.toFixed(2)}× · ${Math.round(project.style.width * v)}px`}
                  hint="Establishing 1.3–1.6 · reaction 0.6–0.9 · splash 1.9–2.2"
                />

                <Slider
                  label="Gutter before panel"
                  value={selected.gutter}
                  min={0}
                  max={300}
                  step={10}
                  onChange={(v) => mutatePanel(selected.id, { gutter: v })}
                  format={(v) => `${v}px`}
                  hint="120 is neutral. 200+ before a scroll turn makes the reveal land."
                />

                <div className="row gap-16 wrap">
                  <Toggle checked={selected.fullBleed} onChange={(v) => mutatePanel(selected.id, { fullBleed: v })} label="Full bleed" />
                  <Toggle checked={selected.reviewed} onChange={(v) => mutatePanel(selected.id, { reviewed: v })} label="Reviewed" />
                </div>

                <Field label="Storyboard note" hint="For the artist, not the reader.">
                  <TextArea rows={2} value={selected.note} onChange={(e) => mutatePanel(selected.id, { note: e.target.value })} />
                </Field>

                <Field label="Caption" hint="Keep it in the upper third; never fight a balloon for the same space.">
                  <TextArea rows={2} value={selected.caption} onChange={(e) => mutatePanel(selected.id, { caption: e.target.value })} />
                </Field>

                <div className="bubble-mini">
                  <div className="row between" style={{ marginBottom: 8 }}>
                    <span className="eyebrow">Lettering ({selected.bubbles.length})</span>
                    <button className="link-btn" onClick={() => navigate('lettering')}>open lettering →</button>
                  </div>
                  {selected.bubbles.length ? (
                    <div className="stack gap-6">
                      {selected.bubbles.map((b) => (
                        <div key={b.id} className="mini-bubble">
                          <Badge tone={b.kind === 'narration' ? 'info' : 'neutral'}>{b.kind}</Badge>
                          <span>{b.text || '—'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="tiny dim">Silent panel. That is allowed — in rhythm.</div>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
      ) : (
        <Card>
          <div className="empty-inline">
            <strong>No panels yet</strong>
            <p className="small muted">
              Break the beat sheet into panels — the engine assigns shots, angles, heights and cast, then you direct.
            </p>
            <Btn variant="primary" icon="spark" loading={busy === 'panels'} onClick={() => void run('panels')}>Break down episode</Btn>
          </div>
        </Card>
      )}

      <StageNav stage="panels" />
    </div>
  );
}
