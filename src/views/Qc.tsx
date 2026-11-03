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
import { qcScore, auditProject } from '../lib/qc';
import { buildUploadManifest, composeUploadSections, planUpload } from '../lib/upload';
import { applyAllFixes, applyFix, canAutoFix } from '../lib/fixes';
import { useNavigate } from '../components/nav';
import { localCritique } from '../ai/engine';
import { renderMarkdown } from '../lib/markdown';

const LEVEL_TONE: Record<string, 'err' | 'warn' | 'info'> = { error: 'err', warn: 'warn', info: 'info' };

export function QcView({ issues, score }: { issues: QcIssue[]; score: number }) {
  const { project, episode, assets, update, toast } = useStudio();
  const navigate = useNavigate();
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

  const fixable = issues.filter(canAutoFix);
  const fixableCount = fixable.reduce((n, i) => n + 1, 0);

  const fixOne = (code: string) => {
    let note = '';
    let applied = 0;
    update((draft) => {
      const res = applyFix(draft, code);
      applied = res.applied;
      note = res.note;
    });
    toast(applied ? note : `Nothing to change — ${note.charAt(0).toLowerCase()}${note.slice(1)}`, applied ? 'ok' : 'info');
  };

  const fixAll = () => {
    let applied = 0;
    let rules = 0;
    update((draft) => {
      // re-audit inside the recipe so we fix what the draft actually contains
      const res = applyAllFixes(draft, auditProject(draft));
      applied = res.applied;
      rules = res.rules;
    });
    toast(
      applied ? `${applied} problem${applied === 1 ? '' : 's'} repaired across ${rules} rule${rules === 1 ? '' : 's'}` : 'Nothing left that the studio can repair on its own',
      applied ? 'ok' : 'info',
    );
  };

  const uploadPlan = useMemo(() => (episode ? planUpload(project, episode) : null), [project, episode]);
  const [slicing, setSlicing] = useState(false);

  const downloadSections = async () => {
    if (!episode) return;
    setSlicing(true);
    try {
      const files = await composeUploadSections(project, episode, (ref) => assets[ref ?? ''] ?? ref);
      const over = files.filter((f) => f.bytes > uploadPlan!.spec.maxFileMB * 1024 * 1024);
      // sequential, spaced — browsers only allow so many programmatic downloads
      for (const f of files) {
        const a = document.createElement('a');
        a.href = f.dataUrl;
        a.download = f.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        await new Promise((r) => setTimeout(r, 400));
      }
      toast(
        over.length
          ? `${files.length} sections exported — ${over.length} exceed ${uploadPlan!.spec.maxFileMB} MB each`
          : `${files.length} sections exported at ${uploadPlan!.width}px`,
        over.length ? 'warn' : 'ok',
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not export sections', 'err');
    } finally {
      setSlicing(false);
    }
  };

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
            <Btn variant="soft" icon="wand" disabled={!fixableCount} onClick={fixAll}>
              Fix automatically{fixableCount ? ` (${fixableCount})` : ''}
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
              icon="download"
              disabled={!episode}
              onClick={() => episode && download(`${name}-ep${episode.no}-upload-plan.md`, buildUploadManifest(project, episode), 'text/markdown')}
            >
              Upload plan
            </Btn>
            <Btn
              size="sm"
              icon="panel"
              loading={slicing}
              disabled={!uploadPlan?.artComplete}
              onClick={() => void downloadSections()}
            >
              Slice sections
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
          <div className="row between" style={{ marginBottom: 10 }}>
            <div className="eyebrow" style={{ marginBottom: 0 }}>Upload sections</div>
            {uploadPlan && <Badge tone={uploadPlan.artComplete ? 'ok' : 'neutral'}>{uploadPlan.sections.length} files</Badge>}
          </div>
          {uploadPlan ? (
            <>
              <ul className="checklist">
                <li className={uploadPlan.sections.length <= uploadPlan.spec.maxImages ? 'ok' : ''}>
                  {uploadPlan.width}px wide · {uploadPlan.totalHeight.toLocaleString()}px tall
                </li>
                <li className={uploadPlan.sections.every((x) => x.height <= uploadPlan.spec.maxSectionHeight) ? 'ok' : ''}>
                  Every section ≤{uploadPlan.spec.maxSectionHeight}px tall
                </li>
                <li className={uploadPlan.sections.some((x) => x.cutsFocus) ? '' : 'ok'}>
                  {uploadPlan.sections.filter((x) => x.cutsFocus).length || 'No'} cut(s) through a panel centre
                </li>
                <li className={uploadPlan.artComplete ? 'ok' : ''}>
                  {uploadPlan.artComplete ? 'All panels have art — sections can be sliced' : 'Storyboard panels block section export'}
                </li>
              </ul>
              <p className="tiny dim" style={{ marginTop: 8, lineHeight: 1.55 }}>
                {uploadPlan.specLabel}: {uploadPlan.spec.maxSectionHeight}px max per image, ≤{uploadPlan.spec.maxFileMB} MB each
                {uploadPlan.spec.approximate ? ' (approximate — verify with the platform)' : ''}.
              </p>
            </>
          ) : (
            <div className="tiny dim">No episode to plan.</div>
          )}
        </Card>

        <Card className="qc-release-card">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Platform readiness</div>
          <ul className="checklist">
            <li className={episode?.cliffhanger ? 'ok' : ''}>Cliffhanger on the final scroll</li>
            <li className={(episode?.panels.length ?? 0) >= 25 ? 'ok' : ''}>Panel count in platform range</li>
            <li className={project.style.masterPrompt ? 'ok' : ''}>Style lock frozen</li>
            <li className={project.cast.every((c) => c.faceAnchor || c.promptFragment) ? 'ok' : ''}>Every character has an anchor</li>
            <li
              className={
                project.cast.every((c) =>
                  (project.versions ?? []).some((v) => v.characterId === c.id && (v.images.portrait || v.images.fullBody)),
                )
                  ? 'ok'
                  : ''
              }
            >
              Every character has reference sheets
            </li>
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
                  <div className="qc-actions">
                    {canAutoFix(i) ? (
                      <Btn size="sm" variant="soft" icon="check" onClick={() => fixOne(i.code!)}>
                        Repair
                      </Btn>
                    ) : (
                      <Btn size="sm" variant="ghost" icon="arrow" onClick={() => navigate(i.stage)}>
                        Open stage
                      </Btn>
                    )}
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
