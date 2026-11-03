import { useMemo, useRef, useState } from 'react';
import { useStudio } from '../store/studio';
import type { Panel } from '../store/types';
import { Badge, Btn, Card, Icon, SectionHead, TextInput } from '../components/ui';
import { PanelArt } from '../components/PanelArt';
import { StageNav } from '../components/StageNav';
import { refinePanelPrompt, renderPanel } from '../ai/engine';
import { blobToDataUrl, PROVIDER_LABEL, supportsReferences } from '../ai/providers';
import { compilePanel } from '../lib/prompt';
import { refsForPanel, versionsFor } from '../lib/references';
import { analyzeRenders, buildRenderQaReport, type RenderQaReport } from '../lib/renderQA';
import { copyText, download } from '../lib/export';

export function RenderView() {
  const { project, episode, update, putAsset, removeAsset, resolve, toast } = useStudio();
  const panels = episode?.panels ?? [];
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [batch, setBatch] = useState<{ running: boolean; done: number; total: number }>({ running: false, done: 0, total: 0 });
  const [focus, setFocus] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editing, setEditing] = useState(false);
  const [qa, setQa] = useState<RenderQaReport | null>(null);
  const [qaBusy, setQaBusy] = useState(false);

  const runQa = async () => {
    setQaBusy(true);
    try {
      const report = await analyzeRenders(project, panels, resolve);
      setQa(report);
      toast(
        report.analysed
          ? `${report.analysed} render(s) analysed · ${report.warned} need a look`
          : 'No rendered panels to analyse yet',
        report.warned ? 'warn' : 'ok',
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not analyse the renders', 'err');
    } finally {
      setQaBusy(false);
    }
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string | null>(null);

  const setPanel = (id: string, patch: Partial<Panel>) =>
    update((p) => {
      const ep = p.episodes.find((e) => e.id === p.activeEpisodeId) ?? p.episodes[0];
      const i = ep?.panels.findIndex((x) => x.id === id) ?? -1;
      if (ep && i >= 0) ep.panels[i] = { ...ep.panels[i], ...patch };
      if (ep) p.gates.render = new Date().toISOString();
    });

  const rendered = panels.filter((p) => p.image).length;
  const isStoryboard = project.ai.imageProvider === 'placeholder';

  const keyPanels = useMemo(() => {
    const set = new Set<string>();
    if (panels[0]) set.add(panels[0].id);
    panels.filter((p) => p.fullBleed).forEach((p) => set.add(p.id));
    if (panels.length) set.add(panels[panels.length - 1].id);
    return panels.filter((p) => set.has(p.id));
  }, [panels]);

  const doRender = async (panel: Panel) => {
    if (isStoryboard) {
      toast('Storyboard mode is on — the blueprint engine is already drawing this panel. Switch image provider in Settings to generate.', 'warn');
      return;
    }
    setBusy((b) => ({ ...b, [panel.id]: true }));
    try {
      const res = await renderPanel(project, panel, project.ai, putAsset, resolve);
      if (res.ref) {
        setPanel(panel.id, { image: res.ref });
        toast(`P${panel.no} rendered`, 'ok');
      } else {
        toast('The provider returned no image. Falling back to storyboard.', 'warn');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Render failed', 'err');
    } finally {
      setBusy((b) => ({ ...b, [panel.id]: false }));
    }
  };

  const runBatch = async (list: Panel[]) => {
    const queue = list.filter((p) => !p.image);
    if (!queue.length) {
      toast('Every panel already has art', 'info');
      return;
    }
    setBatch({ running: true, done: 0, total: queue.length });
    for (let i = 0; i < queue.length; i++) {
      try {
        const res = await renderPanel(project, queue[i], project.ai, putAsset, resolve);
        if (res.ref) setPanel(queue[i].id, { image: res.ref });
      } catch (e) {
        toast(`P${queue[i].no}: ${e instanceof Error ? e.message : 'failed'}`, 'err');
        break;
      }
      setBatch({ running: true, done: i + 1, total: queue.length });
    }
    setBatch({ running: false, done: 0, total: 0 });
    toast('Batch finished', 'ok');
  };

  return (
    <div className="stack gap-24">
      <SectionHead
        eyebrow="Stage 06 · Render"
        title="Art generation"
        desc="Send each panel brief to an image model, or keep the storyboard for a pitch package. Either way the reader preview stays continuous."
        right={
          <>
            <Badge tone={isStoryboard ? 'neutral' : 'ok'} dot>
              {isStoryboard ? 'Storyboard art' : PROVIDER_LABEL[project.ai.imageProvider] ?? project.ai.imageProvider}
            </Badge>
            <Btn variant="ghost" icon="image" disabled={batch.running} onClick={() => void runBatch(keyPanels)}>
              Render key panels
            </Btn>
            <Btn variant="primary" icon="wand" loading={batch.running} onClick={() => void runBatch(panels)}>
              Render all
            </Btn>
          </>
        }
      />

      {batch.running && (
        <div className="banner banner-info">
          <Icon name="wand" size={16} />
          <div className="grow">
            <strong>Rendering {batch.done}/{batch.total}</strong>
            <div className="progress"><span style={{ width: `${(batch.done / Math.max(1, batch.total)) * 100}%` }} /></div>
          </div>
          <span className="tiny dim">One request at a time — panel order matters for visual continuity.</span>
        </div>
      )}

      {isStoryboard && (
        <div className="banner">
          <Icon name="info" size={16} />
          <div className="grow">
            <strong>Storyboard mode.</strong> Panels are drawn in-app from the style lock — palette, composition, shot scale
            and framing are all protocol-accurate, so you can edit and read the episode before spending a single render.
          </div>
          <Btn size="sm" variant="ghost" icon="settings" onClick={() => toast('Open Settings from the sidebar footer', 'info')}>
            Image settings
          </Btn>
        </div>
      )}

      <div className="render-stats">
        <div className="render-stat">
          <span className="eyebrow">Rendered</span>
          <strong>{rendered}<em>/{panels.length}</em></strong>
        </div>
        <div className="render-stat">
          <span className="eyebrow">Key panels</span>
          <strong>{keyPanels.length}</strong>
        </div>
        <div className="render-stat">
          <span className="eyebrow">Seed</span>
          <strong className="mono">{project.style.seed}</strong>
        </div>
        <div className="render-stat">
          <span className="eyebrow">Cast with refs</span>
          <strong>
            {project.cast.filter((c) => versionsFor(project, c.id).some((v) => v.images.portrait || v.images.fullBody)).length}
            <em>/{project.cast.length}</em>
          </strong>
        </div>
      </div>

      <div className="render-grid">
        {panels.map((p) => {
          const c = compilePanel(project, p);
          const src = resolve(p.image);
          return (
            <Card key={p.id} className="render-card">
              <button className="render-thumb" onClick={() => setFocus(p.id)} title="Inspect prompt">
                {src ? (
                  <img src={src} alt={`Panel ${p.no}`} />
                ) : (
                  <PanelArt project={project} panel={p} showLabel={false} />
                )}
                <span className="render-thumb-no">P{String(p.no).padStart(2, '0')}</span>
                {busy[p.id] && (
                  <span className="render-overlay"><span className="spinner" /> rendering</span>
                )}
              </button>
              <div className="render-card-body">
                <div className="row between">
                  <Badge tone={src ? 'ok' : 'neutral'} dot>{src ? 'rendered' : 'storyboard'}</Badge>
                  <span className="tiny dim">{p.shot}</span>
                </div>
                {(() => {
                  const refCount = refsForPanel(project, p).length;
                  const variants = Object.keys(p.versions ?? {}).length;
                  if (!refCount && !variants) return null;
                  return (
                    <div className="tiny dim row gap-6" style={{ marginTop: 6 }}>
                      {variants > 0 && <span className="row gap-4"><Icon name="layers" size={12} />{variants} version</span>}
                      {refCount > 0 && (
                        <span className="row gap-4">
                          <Icon name="image" size={12} />
                          {refCount} ref{refCount === 1 ? '' : 's'}
                          {!supportsReferences(project.ai) && ' (unused)'}
                        </span>
                      )}
                    </div>
                  );
                })()}
                <div className="row gap-4" style={{ marginTop: 8 }}>
                  <Btn
                    size="sm"
                    variant="soft"
                    icon="wand"
                    loading={busy[p.id]}
                    onClick={() => void doRender(p)}
                  >
                    {src ? 'Re-render' : 'Render'}
                  </Btn>
                  <Btn
                    size="sm"
                    variant="ghost"
                    icon="upload"
                    onClick={() => {
                      uploadTarget.current = p.id;
                      fileRef.current?.click();
                    }}
                  >
                    Art
                  </Btn>
                  {src && (
                    <Btn
                      size="sm"
                      variant="ghost"
                      icon="trash"
                      aria-label="Clear render"
                      onClick={() => {
                        removeAsset(p.image);
                        setPanel(p.id, { image: undefined });
                      }}
                    />
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {!panels.length && <Card><div className="tiny dim">No panels yet — direct them in stage 4.</div></Card>}

      <Card className="qa-card">
        <div className="row between wrap gap-10">
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>Render QA</div>
            <p className="tiny dim" style={{ maxWidth: '62ch', lineHeight: 1.6 }}>
              Measured, not opinionated: resolution against the canvas, aspect against the plan, contrast and exposure, dead
              borders, and whether the silhouette survives at 120px.
            </p>
          </div>
          <div className="row gap-6">
            {qa && (
              <>
                <Btn
                  size="sm"
                  variant="ghost"
                  icon="copy"
                  onClick={async () => {
                    const ok = await copyText(buildRenderQaReport(project, qa));
                    toast(ok ? 'QA report copied' : 'Copy failed', ok ? 'ok' : 'err');
                  }}
                >
                  Copy report
                </Btn>
                <Btn
                  size="sm"
                  variant="ghost"
                  icon="download"
                  onClick={() => download(`${project.meta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-render-qa.md`, buildRenderQaReport(project, qa), 'text/markdown')}
                >
                  .md
                </Btn>
              </>
            )}
            <Btn size="sm" variant="soft" icon="shield" loading={qaBusy} disabled={!rendered} onClick={() => void runQa()}>
              {qa ? 'Re-analyse' : 'Analyse renders'}
            </Btn>
          </div>
        </div>

        {qa && (
          <div className="qa-table-wrap">
            <table className="qa-table">
              <thead>
                <tr>
                  <th>P</th>
                  <th>px</th>
                  <th>aspect</th>
                  <th>mean</th>
                  <th>contrast</th>
                  <th>120px edge</th>
                  <th>findings</th>
                </tr>
              </thead>
              <tbody>
                {qa.panels.map((row) => (
                  <tr key={row.panelId} className={row.issues.some((i) => i.level === 'warn') ? 'is-warn' : ''}>
                    <td className="mono">P{String(row.panelNo).padStart(2, '0')}</td>
                    <td className="mono">{row.width}×{row.height}</td>
                    <td className="mono">{row.actualAspect.toFixed(2)}/{row.plannedAspect.toFixed(2)}</td>
                    <td className="mono">{row.meanLuma.toFixed(0)}</td>
                    <td className="mono">{row.contrast.toFixed(0)}</td>
                    <td className="mono">{row.thumbEdge.toFixed(1)}</td>
                    <td>
                      {row.issues.length ? (
                        <ul className="qa-findings">
                          {row.issues.map((i) => (
                            <li key={i.text} className={i.level}>{i.text}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="tiny dim">pass</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="tiny dim" style={{ marginTop: 8 }}>
              {qa.analysed} analysed · {qa.warned} flagged · {qa.skipped} unreadable. Nothing here judges whether the panel is
              good — only whether it will survive a phone.
            </p>
          </div>
        )}
      </Card>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          const id = uploadTarget.current;
          if (!file || !id) return;
          try {
            const ref = await putAsset(await blobToDataUrl(file));
            setPanel(id, { image: ref });
            toast('Art attached', 'ok');
          } catch {
            toast('Could not read that image', 'err');
          }
          e.target.value = '';
        }}
      />

      {focus && (() => {
        const p = panels.find((x) => x.id === focus);
        if (!p) return null;
        const c = compilePanel(project, p);
        const refs = refsForPanel(project, p).map((r) => resolve(r)).filter(Boolean) as string[];
        const runEdit = async () => {
          setEditing(true);
          try {
            const res = await refinePanelPrompt(project, p, editText, project.ai);
            if (res.ok) {
              setPanel(p.id, { prompt: res.prompt });
              toast(res.message, 'ok');
              setEditText('');
            } else {
              toast(res.message, 'warn');
            }
          } finally {
            setEditing(false);
          }
        };
        return (
          <div className="focus-panel">
            <div className="focus-card">
              <div className="row between" style={{ marginBottom: 8 }}>
                <strong>P{String(p.no).padStart(2, '0')} · {p.shot}</strong>
                <button className="link-btn" onClick={() => setFocus(null)}>close</button>
              </div>
              {refs.length > 0 && (
                <div className="focus-refs">
                  {refs.map((r, i) => (
                    <img key={`${r.slice(-24)}-${i}`} src={r} alt={`Reference ${i + 1}`} />
                  ))}
                  <span className="tiny dim">
                    {refs.length} reference sheet{refs.length === 1 ? '' : 's'} attached
                    {supportsReferences(project.ai) ? '' : ' — this image provider ignores them'}
                  </span>
                </div>
              )}
              <pre className="prompt-block">{c.prompt}</pre>
              <div className="tiny dim" style={{ marginTop: 8 }}>
                {c.aspect} · seed {c.seed}
                {c.versions.filter((v) => v.type !== 'base').map((v) => ` · ${v.name}`).join('')}
              </div>
              <div className="focus-edit">
                <label className="eyebrow" htmlFor="panel-edit">Edit with words</label>
                <div className="row gap-6">
                  <TextInput
                    id="panel-edit"
                    value={editText}
                    placeholder="move him left, add rain, lose the lantern glow"
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && editText.trim() && !editing) void runEdit();
                    }}
                  />
                  <Btn variant="soft" icon="wand" loading={editing} disabled={!editText.trim()} onClick={() => void runEdit()}>
                    Rewrite
                  </Btn>
                </div>
                {p.prompt?.trim() && (
                  <button className="link-btn tiny" onClick={() => setPanel(p.id, { prompt: '' })}>
                    reset to the compiled prompt
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <StageNav stage="render" />
    </div>
  );
}
