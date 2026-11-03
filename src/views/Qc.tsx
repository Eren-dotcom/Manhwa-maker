import { useMemo, useState } from 'react';
import { useStudio } from '../store/studio';
import type { QcIssue, StageId } from '../store/types';
import { STAGES } from '../store/constants';
import { Badge, Btn, Card, Icon, ProgressRing, SectionHead, Toggle } from '../components/ui';
import { StageNav } from '../components/StageNav';
import {
  buildBible,
  buildPromptPack,
  buildReaderHtml,
  buildStoryboardPrint,
  copyText,
  download,
  serializeProject,
  slug,
} from '../lib/export';
import { qcScore } from '../lib/qc';
import { localCritique } from '../ai/engine';
import { renderMarkdown } from '../lib/markdown';

const LEVEL_TONE: Record<string, 'err' | 'warn' | 'info'> = { error: 'err', warn: 'warn', info: 'info' };

export function QcView({ issues, score }: { issues: QcIssue[]; score: number }) {
  const { project, episode, assets, update, toast } = useStudio();
  const [inline, setInline] = useState(false);
  const [critique, setCritique] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<StageId, QcIssue[]>();
    issues.forEach((i) => {
      const list = map.get(i.stage) ?? [];
      list.push(i);
      map.set(i.stage, list);
    });
    return STAGES.map((s) => ({ stage: s, list: (map.get(s.id) ?? []).sort((a, b) => rank(a) - rank(b)) })).filter(
      (g) => g.list.length,
    );
  }, [issues]);

  const errors = issues.filter((i) => i.level === 'error').length;
  const warns = issues.filter((i) => i.level === 'warn').length;
  const verdict = score >= 90 ? 'Publish' : score >= 75 ? 'Publish with notes' : score >= 55 ? 'Another pass' : 'Hold';
  const name = slug(project.meta.title);

  return (
    <div className="stack gap-24">
      <SectionHead
        eyebrow="Stage 08 · QC & export"
        title="Audit and delivery"
        desc="A deterministic editorial pass over structure, staging, lettering and prompt integrity — then every file your team or your platform needs."
        right={
          <>
            <Btn
              variant="ghost"
              icon="spark"
              onClick={() => {
                setCritique(localCritique(project));
                toast('Local editorial audit complete', 'ok');
              }}
            >
              Editor’s verdict
            </Btn>
            <Btn
              variant="primary"
              icon="shield"
              onClick={() => {
                update((p) => { p.gates.qc = new Date().toISOString(); });
                toast('Episode signed off', 'ok');
              }}
            >
              Sign off episode
            </Btn>
          </>
        }
      />

      <div className="qc-top">
        <Card className="qc-score-card">
          <ProgressRing value={score} size={104} stroke={7} label={`${score}`} />
          <div>
            <div className="eyebrow">Editorial score</div>
            <h3 className="qc-verdict">{verdict}</h3>
            <div className="row gap-6 wrap" style={{ marginTop: 6 }}>
              <Badge tone={errors ? 'err' : 'ok'}>{errors} blocking</Badge>
              <Badge tone={warns ? 'warn' : 'ok'}>{warns} notes</Badge>
              <Badge>{issues.filter((i) => i.level === 'info').length} info</Badge>
            </div>
          </div>
        </Card>

        <Card className="qc-export-card">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Delivery pack</div>
          <div className="export-grid">
            <Btn
              size="sm"
              icon="download"
              onClick={() => download(`${name}.manhwa.json`, serializeProject(project, {}, false), 'application/json')}
            >
              Project JSON
            </Btn>
            <Btn
              size="sm"
              icon="download"
              onClick={() => download(`${name}-with-images.json`, serializeProject(project, assets, true), 'application/json')}
            >
              Project + images
            </Btn>
            <Btn size="sm" icon="download" onClick={() => download(`${name}-prompts.md`, buildPromptPack(project, episode), 'text/markdown')}>
              Render pack
            </Btn>
            <Btn size="sm" icon="download" onClick={() => download(`${name}-bible.md`, buildBible(project), 'text/markdown')}>
              Production bible
            </Btn>
            <Btn
              size="sm"
              icon="image"
              onClick={() => download(`${name}-ep${episode.no}.html`, buildReaderHtml(project, episode, assets), 'text/html')}
            >
              Reader HTML
            </Btn>
            <Btn
              size="sm"
              icon="external"
              onClick={() => {
                const w = window.open('', '_blank');
                if (!w) return;
                w.document.write(buildStoryboardPrint(project, episode));
                w.document.close();
              }}
            >
              Print storyboard
            </Btn>
          </div>
          <div className="row gap-16" style={{ marginTop: 12 }}>
            <Toggle checked={inline} onChange={setInline} label="Include images inline (heavy)" />
            <span className="tiny dim">{inline ? 'Project exports carry base64 art.' : 'Exports reference image assets.'}</span>
          </div>
        </Card>

        <Card className="qc-release-card">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Platform readiness</div>
          <ul className="checklist">
            <li className={episode?.cliffhanger ? 'ok' : ''}>Cliffhanger on the final scroll</li>
            <li className={(episode?.panels.length ?? 0) >= 25 ? 'ok' : ''}>Panel count in platform range</li>
            <li className={project.style.masterPrompt ? 'ok' : ''}>Style lock frozen</li>
            <li className={project.cast.every((c) => c.promptFragment) ? 'ok' : ''}>Every character has an anchor</li>
            <li className={project.meta.rating ? 'ok' : ''}>Rating declared for the store listing</li>
          </ul>
        </Card>
      </div>

      {critique && (
        <Card className="critique-card">
          <div className="row between" style={{ marginBottom: 10 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Editor’s verdict</div>
            <button className="link-btn" onClick={() => setCritique(null)}>dismiss</button>
          </div>
          <div className="md-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(critique) }} />
        </Card>
      )}

      <div className="qc-list">
        {grouped.map(({ stage, list }) => (
          <Card key={stage.id} className="qc-group">
            <div className="row between" style={{ marginBottom: 12 }}>
              <div className="row gap-10">
                <span className="stage-num">{String(stage.n).padStart(2, '0')}</span>
                <div>
                  <div className="small" style={{ fontWeight: 600 }}>{stage.label}</div>
                  <div className="tiny dim">{stage.desc}</div>
                </div>
              </div>
              <div className="row gap-6">
                {['error', 'warn', 'info'].map((lvl) => {
                  const n = list.filter((i) => i.level === lvl).length;
                  return n ? <Badge key={lvl} tone={LEVEL_TONE[lvl]}>{n} {lvl}{n > 1 ? 's' : ''}</Badge> : null;
                })}
              </div>
            </div>
            <div className="stack gap-8">
              {list.map((i) => (
                <div key={i.id} className={`qc-item level-${i.level}`}>
                  <span className={`issue-pip level-${i.level}`} />
                  <div className="grow">
                    <div className="qc-item-title">{i.title}</div>
                    <p className="tiny muted">{i.detail}</p>
                    <p className="qc-fix"><strong>Fix:</strong> {i.fix}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
        {!grouped.length && (
          <Card>
            <div className="empty-inline">
              <Icon name="shield" size={20} />
              <strong>Nothing flagged</strong>
              <p className="small muted">Structural checks pass. Read it once out loud before you sign off — QC cannot hear rhythm.</p>
            </div>
          </Card>
        )}
      </div>

      <Card className="signoff">
        <div className="row between wrap gap-12">
          <div>
            <div className="eyebrow">Sign-off</div>
            <p className="small muted" style={{ marginTop: 4 }}>
              Score {qcScore(issues)}/100 · {project.episodes.length} episode{project.episodes.length > 1 ? 's' : ''} · last edited{' '}
              {new Date(project.meta.updatedAt).toLocaleString()}
            </p>
          </div>
          <Btn
            variant="outline"
            icon="copy"
            onClick={async () => {
              const ok = await copyText(buildBible(project));
              toast(ok ? 'Bible copied to clipboard' : 'Copy failed', ok ? 'ok' : 'err');
            }}
          >
            Copy bible
          </Btn>
        </div>
      </Card>

      <StageNav stage="qc" />
    </div>
  );
}

const rank = (i: QcIssue) => (i.level === 'error' ? 0 : i.level === 'warn' ? 1 : 2);
