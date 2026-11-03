import { useMemo, useState } from 'react';
import { useStudio } from '../store/studio';
import type { Panel } from '../store/types';
import { Badge, Btn, Card, Field, Icon, IconBtn, SectionHead, TextArea, TextInput } from '../components/ui';
import { StageNav } from '../components/StageNav';
import { buildStyleLock, characterSheetPrompt, compilePanel, faceOf } from '../lib/prompt';
import { refsForPanel, versionsFor, VERSION_LABEL } from '../lib/references';
import { buildJsonl, buildPromptPack, copyText, download, slug } from '../lib/export';

export function Prompts() {
  const { project, episode, update, toast } = useStudio();
  const panels = episode?.panels ?? [];
  const [openNegative, setOpenNegative] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const compiled = useMemo(
    () => panels.map((p) => ({ panel: p, c: compilePanel(project, p) })),
    [panels, project],
  );
  const refCount = (panel: Panel) => refsForPanel(project, panel).length;
  const filtered = query
    ? compiled.filter(
        ({ panel }) =>
          String(panel.no).includes(query) ||
          panel.shot.includes(query.toLowerCase()) ||
          panel.action.toLowerCase().includes(query.toLowerCase()),
      )
    : compiled;

  const pack = () => buildPromptPack(project, episode);
  const missingLock = !project.style.masterPrompt.trim();

  const setPanel = (id: string, patch: Partial<Panel>) =>
    update((p) => {
      const ep = p.episodes.find((e) => e.id === p.activeEpisodeId) ?? p.episodes[0];
      if (!ep) return;
      const i = ep.panels.findIndex((x) => x.id === id);
      if (i >= 0) ep.panels[i] = { ...ep.panels[i], ...patch };
      p.gates.prompts = new Date().toISOString();
    });

  return (
    <div className="stack gap-24">
      <SectionHead
        eyebrow="Stage 05 · Prompt compiler"
        title="Render briefs"
        desc="One frozen style lock, one fixed character anchor per cast member, one deterministic prompt per panel. This is the difference between a series and forty unrelated illustrations."
        right={
          <>
            <Btn
              variant="ghost"
              icon="download"
              onClick={() => {
                download(`${slug(project.meta.title)}-prompts.jsonl`, buildJsonl(project, episode), 'application/jsonl');
              }}
            >
              .jsonl
            </Btn>
            <Btn
              variant="ghost"
              icon="download"
              onClick={() => {
                download(`${slug(project.meta.title)}-prompts.md`, pack(), 'text/markdown');
              }}
            >
              Pack
            </Btn>
            <Btn
              variant="primary"
              icon="copy"
              onClick={async () => {
                const ok = await copyText(pack());
                toast(ok ? 'Full render pack copied' : 'Copy failed', ok ? 'ok' : 'err');
              }}
            >
              Copy full pack
            </Btn>
          </>
        }
      />

      {missingLock && (
        <div className="banner banner-warn">
          <Icon name="warn" size={16} />
          <div>
            <strong>Style lock is empty.</strong> Prompts are falling back to a derived lock. Freeze it in Concept so every
            panel shares identical style language.
          </div>
        </div>
      )}

      <div className="split">
        <div className="stack gap-14">
          <Card className="lock-card">
            <div className="row between" style={{ marginBottom: 10 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Style lock</div>
              <Badge tone="ok" dot>frozen</Badge>
            </div>
            <pre className="prompt-block">{project.style.masterPrompt || buildStyleLock(project)}</pre>
            <div className="row gap-6" style={{ marginTop: 10 }}>
              <Btn
                size="sm"
                variant="ghost"
                icon="copy"
                onClick={async () => {
                  const ok = await copyText(project.style.masterPrompt || buildStyleLock(project));
                  toast(ok ? 'Style lock copied' : 'Copy failed', ok ? 'ok' : 'err');
                }}
              >
                Copy lock
              </Btn>
              <span className="tiny dim">seed {project.style.seed}</span>
            </div>
          </Card>

          <Card>
            <div className="row between" style={{ marginBottom: 10 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Character sheets</div>
              <Badge>{project.cast.length}</Badge>
            </div>
            <p className="tiny dim" style={{ marginBottom: 12 }}>
              Render these first and attach them as image references. Text alone will not hold a face across forty panels — a
              portrait and a full body will.
            </p>
            <div className="stack gap-10">
              {project.cast.map((c) => {
                const versions = versionsFor(project, c.id);
                const sheets = versions.reduce((n, v) => n + Object.keys(v.images ?? {}).length, 0);
                return (
                  <div key={c.id} className="anchor-row">
                    <div className="row between">
                      <strong className="small">{c.name}</strong>
                      <div className="row gap-6" style={{ alignItems: 'center' }}>
                        <Badge tone={sheets ? 'ok' : 'warn'} dot>{sheets ? `${sheets} sheets` : 'no sheets'}</Badge>
                        <button
                          className="link-btn"
                          onClick={async () => {
                            const ok = await copyText(characterSheetPrompt(project, c));
                            toast(ok ? `${c.name} sheet prompt copied` : 'Copy failed', ok ? 'ok' : 'err');
                          }}
                        >
                          copy sheet
                        </button>
                      </div>
                    </div>
                    <p className="mono tiny">{faceOf(c) || '— no anchor —'}</p>
                    {versions.length > 1 && (
                      <p className="tiny dim">
                        {versions
                          .map((v) => `${v.name} (${VERSION_LABEL[v.type].toLowerCase()}, ${Object.keys(v.images ?? {}).length}/5)`)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                );
              })}
              {!project.cast.length && <div className="tiny dim">No cast — build the bible first.</div>}
            </div>
          </Card>

          <Card className="protocol-note">
            <div className="eyebrow">Prompt order</div>
            <ol className="order-list">
              <li>Style lock (identical every panel)</li>
              <li>Shot + angle + composition</li>
              <li>Setting</li>
              <li>Action (one frozen moment)</li>
              <li>Character anchors (verbatim)</li>
              <li>Lighting + palette</li>
              <li>Framing / bleed</li>
            </ol>
            <p className="tiny dim" style={{ marginTop: 10 }}>
              Negative prompt always forbids text, balloons and style drift.
            </p>
          </Card>
        </div>

        <div className="stack gap-12">
          <div className="row gap-8 between">
            <div className="search">
              <Icon name="search" size={14} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter panels…" />
            </div>
            <span className="tiny dim">{filtered.length} prompts</span>
          </div>

          {filtered.map(({ panel, c }) => (
            <Card key={panel.id} className="prompt-card">
              <div className="prompt-head">
                <div className="row gap-8">
                  <span className="prompt-no">P{String(panel.no).padStart(2, '0')}</span>
                  <Badge tone="accent">{panel.shot}</Badge>
                  <Badge>{panel.angle}</Badge>
                  <Badge>{c.aspect}</Badge>
                  {panel.prompt && <Badge tone="warn">custom</Badge>}
                  {refCount(panel) > 0 && (
                    <Badge tone="info">
                      <Icon name="image" size={11} /> {refCount(panel)} ref
                    </Badge>
                  )}
                  {!panel.image && <Badge tone="neutral">storyboard</Badge>}
                </div>
                <div className="row gap-4">
                  <IconBtn
                    icon="copy"
                    label="Copy prompt"
                    onClick={async () => {
                      const ok = await copyText(`${c.prompt}\n\nNEGATIVE: ${c.negative}`);
                      toast(ok ? `P${panel.no} prompt copied` : 'Copy failed', ok ? 'ok' : 'err');
                    }}
                  />
                  <IconBtn
                    icon={openNegative === panel.id ? 'chevronDown' : 'chevron'}
                    label="Negative prompt"
                    onClick={() => setOpenNegative(openNegative === panel.id ? null : panel.id)}
                  />
                </div>
              </div>

              <pre className="prompt-block">{c.prompt}</pre>

              {openNegative === panel.id && (
                <div className="prompt-extra">
                  <div className="eyebrow">Negative · seed {c.seed}</div>
                  <pre className="prompt-block dim-block">{c.negative}</pre>
                </div>
              )}

              {c.characters.length > 0 && (
                <div className="prompt-cast">
                  {c.characters.map((ch) => (
                    <span key={ch.id} className="cast-pill">
                      <Icon name="user" size={11} /> {ch.name}
                    </span>
                  ))}
                  <span className="tiny dim">anchors injected verbatim</span>
                </div>
              )}

              <details className="prompt-override">
                <summary>Override prompt {panel.prompt ? '· active' : ''}</summary>
                <div className="stack gap-8" style={{ marginTop: 10 }}>
                  <TextArea
                    rows={3}
                    className="mono"
                    value={panel.prompt}
                    placeholder="Leave empty to use the compiled prompt above."
                    onChange={(e) => setPanel(panel.id, { prompt: e.target.value })}
                  />
                  <div className="row gap-8">
                    <Field label="Seed">
                      <TextInput
                        type="number"
                        value={panel.seed ?? ''}
                        placeholder={String(c.seed)}
                        onChange={(e) => setPanel(panel.id, { seed: e.target.value ? Number(e.target.value) : null })}
                      />
                    </Field>
                    <div className="grow" />
                    <Btn size="sm" variant="ghost" icon="refresh" onClick={() => setPanel(panel.id, { prompt: '', seed: null })}>
                      Reset to compiled
                    </Btn>
                  </div>
                </div>
              </details>
            </Card>
          ))}

          {!filtered.length && <Card><div className="tiny dim">No panels match that filter.</div></Card>}
        </div>
      </div>

      <StageNav stage="prompts" />
    </div>
  );
}
