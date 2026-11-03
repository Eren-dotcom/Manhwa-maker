import { useEffect, useState } from 'react';
import { useStudio } from '../store/studio';
import type { Bubble, Panel, Sfx } from '../store/types';
import { emptyBubble, uid } from '../store/types';
import { BUBBLE_KINDS } from '../store/constants';
import {
  Badge,
  Btn,
  Card,
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
import { ArtStage } from '../components/PanelArt';
import { StageNav } from '../components/StageNav';

const TAILS: { id: Bubble['tail']; label: string }[] = [
  { id: 'b', label: '↓' },
  { id: 'bl', label: '↙' },
  { id: 'br', label: '↘' },
  { id: 'l', label: '←' },
  { id: 'r', label: '→' },
  { id: 't', label: '↑' },
  { id: 'tl', label: '↖' },
  { id: 'tr', label: '↗' },
  { id: 'none', label: '·' },
];

export function Lettering() {
  const { project, episode, update, updateLive, commit, toast } = useStudio();
  const panels = episode?.panels ?? [];
  const [panelId, setPanelId] = useState<string | null>(panels[0]?.id ?? null);
  const [bubbleId, setBubbleId] = useState<string | null>(null);
  const [safeArea, setSafeArea] = useState(true);

  const panel = panels.find((p) => p.id === panelId) ?? panels[0] ?? null;
  const bubble = panel?.bubbles.find((b) => b.id === bubbleId) ?? null;

  useEffect(() => {
    if (!panelId && panels[0]) setPanelId(panels[0].id);
  }, [panels, panelId]);

  const patchPanel = (patch: Partial<Panel>, live?: boolean) => {
    if (!panel) return;
    const fn = (draft: typeof project) => {
      const ep = draft.episodes.find((e) => e.id === draft.activeEpisodeId) ?? draft.episodes[0];
      const i = ep?.panels.findIndex((x) => x.id === panel.id) ?? -1;
      if (ep && i >= 0) ep.panels[i] = { ...ep.panels[i], ...patch };
      if (ep) draft.gates.lettering = new Date().toISOString();
    };
    live ? updateLive(fn) : update(fn);
  };

  const patchBubble = (id: string, patch: Partial<Bubble>, live?: boolean) => {
    if (!panel) return;
    patchPanel(
      {
        bubbles: panel.bubbles.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      },
      live,
    );
  };

  const addBubble = (kind: Bubble['kind'] = 'speech') => {
    if (!panel) return;
    const idx = panel.bubbles.length;
    const b: Bubble = {
      ...emptyBubble(idx + 1),
      kind,
      x: idx % 2 === 0 ? 32 : 68,
      y: Math.min(88, 16 + idx * 22),
      speaker: project.cast[0]?.name ?? '',
    };
    patchPanel({ bubbles: [...panel.bubbles, b] });
    setBubbleId(b.id);
  };

  const removeBubble = (id: string) => {
    if (!panel) return;
    patchPanel({ bubbles: panel.bubbles.filter((b) => b.id !== id).map((b, i) => ({ ...b, order: i + 1 })) });
    if (bubbleId === id) setBubbleId(null);
  };

  const autoPlace = () => {
    if (!panel) return;
    const list = [...panel.bubbles];
    list.sort((a, b) => a.order - b.order);
    const placed = list.map((b, i) => ({
      ...b,
      order: i + 1,
      x: list.length === 1 ? 50 : i % 2 === 0 ? 30 : 68,
      y: 14 + i * Math.min(24, 72 / Math.max(1, list.length)),
      tail: b.kind === 'narration' ? ('none' as const) : b.y > 50 ? ('t' as const) : ('b' as const),
    }));
    patchPanel({ bubbles: placed });
    toast('Balloons laid out top-to-bottom', 'ok');
  };

  const addSfx = () => {
    if (!panel) return;
    const s: Sfx = { id: uid('sfx'), text: 'BAM', x: 50, y: 50, style: 'impact', rotation: -8, scale: 1 };
    patchPanel({ sfx: [...panel.sfx, s] });
  };

  const patchSfx = (id: string, patch: Partial<Sfx>) => {
    if (!panel) return;
    patchPanel({ sfx: panel.sfx.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  };

  const overflow =
    bubble && bubble.text.length > (BUBBLE_KINDS.find((k) => k.id === bubble.kind)?.limit ?? 90);

  return (
    <div className="stack gap-20">
      <SectionHead
        eyebrow="Stage 07 · Lettering"
        title="Balloons, tails & sound"
        desc="Lettering is staging. Tails point at mouths, captions live in the upper third, and nothing ever lands on a face. Drag balloons directly on the panel."
        right={
          <>
            <Toggle checked={safeArea} onChange={setSafeArea} label="Safe area" />
            <Btn variant="ghost" icon="move" onClick={autoPlace}>Auto-place</Btn>
            <Btn variant="primary" icon="plus" onClick={() => addBubble('speech')}>Add balloon</Btn>
          </>
        }
      />

      <div className="lettering-layout">
        <div className="lettering-thumbs">
          <div className="eyebrow" style={{ padding: '0 4px 8px' }}>Panels</div>
          {panels.map((p) => {
            const lineCount = p.bubbles.length + (p.caption ? 1 : 0);
            return (
              <button
                key={p.id}
                className={`lettering-thumb ${p.id === panel?.id ? 'is-on' : ''}`}
                onClick={() => {
                  setPanelId(p.id);
                  setBubbleId(null);
                }}
              >
                <span className="lt-no">P{p.no}</span>
                <span className="lt-shots">{p.shot}</span>
                <span className={`lt-count ${lineCount ? '' : 'is-empty'}`}>{lineCount || '–'}</span>
              </button>
            );
          })}
        </div>

        <div className="lettering-board">
          {panel ? (
            <>
              <div className="board-head">
                <div className="row gap-8">
                  <Badge tone="accent">P{String(panel.no).padStart(2, '0')}</Badge>
                  <span className="tiny dim">{panel.shot} · {panel.composition}</span>
                </div>
                <span className="tiny dim">drag balloons · click to select</span>
              </div>
              <div className="board-art">
                {safeArea && <div className="safe-area" />}
                <ArtStage
                  project={project}
                  panel={panel}
                  interactive
                  selectedBubble={bubbleId}
                  onSelectBubble={setBubbleId}
                  onMoveBubble={(id, x, y) => patchBubble(id, { x, y }, true)}
                  onCommit={commit}
                  showLabel={false}
                  scale={0.85}
                />
              </div>
              <div className="board-foot">
                <div className="row gap-6 wrap">
                  {BUBBLE_KINDS.slice(0, 5).map((k) => (
                    <Btn key={k.id} size="sm" variant="ghost" onClick={() => addBubble(k.id as Bubble['kind'])}>
                      + {k.label}
                    </Btn>
                  ))}
                </div>
                <span className="tiny dim">{panel.bubbles.length} balloons · {panel.sfx.length} sfx</span>
              </div>
            </>
          ) : (
            <Card><div className="tiny dim">No panels yet.</div></Card>
          )}
        </div>

        <aside className="lettering-panel">
          {panel && (
            <>
              <Card className="bubble-list-card">
                <div className="row between" style={{ marginBottom: 10 }}>
                  <div className="card-title" style={{ marginBottom: 0 }}>Reading order</div>
                  <Badge>{panel.bubbles.length}</Badge>
                </div>
                <div className="stack gap-6">
                  {panel.bubbles.map((b, i) => (
                    <button
                      key={b.id}
                      className={`bubble-row ${bubbleId === b.id ? 'is-on' : ''}`}
                      onClick={() => setBubbleId(b.id)}
                    >
                      <span className="br-order">{b.order || i + 1}</span>
                      <span className={`br-kind b-${b.kind}`}>{b.kind.slice(0, 3)}</span>
                      <span className="br-text">{b.text || '—'}</span>
                      <IconBtn
                        icon="close"
                        label="Delete balloon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBubble(b.id);
                        }}
                      />
                    </button>
                  ))}
                  {!panel.bubbles.length && <div className="tiny dim">Silent panel. Add a balloon if the art cannot carry it.</div>}
                </div>
              </Card>

              {bubble && (
                <Card className="bubble-editor">
                  <div className="row between" style={{ marginBottom: 12 }}>
                    <div className="card-title" style={{ marginBottom: 0 }}>Balloon</div>
                    {overflow && <Badge tone="warn">overflow</Badge>}
                  </div>
                  <Field label="Type">
                    <Select
                      value={bubble.kind}
                      onChange={(e) =>
                        patchBubble(bubble.id, {
                          kind: e.target.value as Bubble['kind'],
                          tail: e.target.value === 'narration' ? 'none' : bubble.tail,
                        })
                      }
                    >
                      {BUBBLE_KINDS.map((k) => (
                        <option key={k.id} value={k.id}>{k.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Text" hint={BUBBLE_KINDS.find((k) => k.id === bubble.kind)?.hint}>
                    <TextArea rows={3} value={bubble.text} onChange={(e) => patchBubble(bubble.id, { text: e.target.value })} />
                  </Field>
                  <div className="form-grid">
                    <Field label="Speaker">
                      <TextInput
                        list="cast-names"
                        value={bubble.speaker}
                        onChange={(e) => patchBubble(bubble.id, { speaker: e.target.value })}
                      />
                      <datalist id="cast-names">
                        {project.cast.map((c) => <option key={c.id} value={c.name} />)}
                      </datalist>
                    </Field>
                    <Field label="Size">
                      <Select value={bubble.size} onChange={(e) => patchBubble(bubble.id, { size: e.target.value as Bubble['size'] })}>
                        <option value="sm">Small</option>
                        <option value="md">Medium</option>
                        <option value="lg">Large</option>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Tail direction" hint="Point it at the speaker’s mouth, never the back of a head.">
                    <div className="tail-grid">
                      {TAILS.map((t) => (
                        <button
                          key={t.id}
                          className={`tail-btn ${bubble.tail === t.id ? 'is-on' : ''}`}
                          onClick={() => patchBubble(bubble.id, { tail: t.id })}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <div className="form-grid">
                    <Slider label="X" min={6} max={94} step={1} value={bubble.x} onChange={(v) => patchBubble(bubble.id, { x: v })} format={(v) => `${v}%`} />
                    <Slider label="Y" min={4} max={96} step={1} value={bubble.y} onChange={(v) => patchBubble(bubble.id, { y: v })} format={(v) => `${v}%`} />
                  </div>
                  <Field label="Order">
                    <TextInput
                      type="number"
                      value={bubble.order}
                      onChange={(e) => patchBubble(bubble.id, { order: Number(e.target.value) })}
                    />
                  </Field>
                </Card>
              )}

              <Card>
                <div className="row between" style={{ marginBottom: 10 }}>
                  <div className="card-title" style={{ marginBottom: 0 }}>Caption & SFX</div>
                  <IconBtn icon="plus" label="Add SFX" onClick={addSfx} />
                </div>
                <Field label="Caption" hint="Upper third. Square-cornered box. Never shares a lane with a balloon.">
                  <TextArea rows={2} value={panel.caption} onChange={(e) => patchPanel({ caption: e.target.value })} />
                </Field>
                <div className="stack gap-10" style={{ marginTop: 12 }}>
                  {panel.sfx.map((s) => (
                    <div key={s.id} className="sfx-row">
                      <TextInput
                        value={s.text}
                        onChange={(e) => patchSfx(s.id, { text: e.target.value })}
                        className="sfx-input"
                        placeholder="BAM"
                      />
                      <Select value={s.style} onChange={(e) => patchSfx(s.id, { style: e.target.value as Sfx['style'] })} style={{ width: 108 }}>
                        <option value="impact">Impact</option>
                        <option value="ink">Ink</option>
                        <option value="neon">Neon</option>
                        <option value="whoosh">Whoosh</option>
                        <option value="hand">Hand</option>
                      </Select>
                      <div className="row gap-4">
                        <Slider label="X" min={0} max={100} step={1} value={s.x} onChange={(v) => patchSfx(s.id, { x: v })} />
                        <Slider label="Y" min={0} max={100} step={1} value={s.y} onChange={(v) => patchSfx(s.id, { y: v })} />
                        <IconBtn
                          icon="trash"
                          label="Remove"
                          onClick={() => patchPanel({ sfx: panel.sfx.filter((x) => x.id !== s.id) })}
                        />
                      </div>
                    </div>
                  ))}
                  {!panel.sfx.length && <div className="tiny dim">No SFX. Sound effects earn their place — once or twice per episode.</div>}
                </div>
              </Card>

              <Card className="protocol-note">
                <div className="eyebrow">Lettering law</div>
                <ul className="checklist">
                  <li className={panel.bubbles.length <= 3 ? 'ok' : ''}>≤3 balloons on this panel</li>
                  <li className={panel.bubbles.every((b) => b.text.length <= 90) ? 'ok' : ''}>Balloons inside their character budget</li>
                  <li className={panel.bubbles.every((b) => b.x >= 8 && b.x <= 92) ? 'ok' : ''}>Nothing in the trim margin</li>
                  <li className={panel.caption ? 'ok' : ''}>Caption used deliberately{panel.caption ? '' : ' (optional)'}</li>
                </ul>
              </Card>
            </>
          )}
        </aside>
      </div>

      <StageNav stage="lettering" />
    </div>
  );
}
