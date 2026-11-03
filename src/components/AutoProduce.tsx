import { useState } from 'react';
import { useStudio } from '../store/studio';
import type { Project } from '../store/types';
import { runAction, type ActionId } from '../ai/engine';
import { PROVIDER_LABEL } from '../ai/providers';
import { Badge, Btn, Modal, Toggle } from './ui';
import { Icon } from './ui';

type StepId = Extract<ActionId, 'concept' | 'world' | 'cast' | 'beats' | 'panels'>;

interface Step {
  id: StepId;
  label: string;
  desc: string;
  has: (p: Project) => boolean;
}

const STEPS: Step[] = [
  { id: 'concept', label: 'Develop concept', desc: 'Logline, hook, theme, tone, comparables', has: (p) => Boolean(p.meta.logline) },
  { id: 'world', label: 'Build world', desc: 'Premise, rules with costs, locations, motifs', has: (p) => Boolean(p.world.premise) },
  { id: 'cast', label: 'Cast the series', desc: 'Characters with want/need and visual anchors', has: (p) => p.cast.length > 0 },
  {
    id: 'beats',
    label: 'Write beat sheet',
    desc: 'Eight scroll units and a cliffhanger',
    has: (p) => Boolean(p.episodes.find((e) => e.id === p.activeEpisodeId)?.beats.length),
  },
  {
    id: 'panels',
    label: 'Direct panels',
    desc: 'Shot, angle, staging, heights, cast per panel',
    has: (p) => Boolean(p.episodes.find((e) => e.id === p.activeEpisodeId)?.panels.length),
  },
];

type Status = 'idle' | 'running' | 'done' | 'skipped' | 'error';

export function AutoProduce({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { project, update, toast } = useStudio();
  const [skipExisting, setSkipExisting] = useState(true);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [log, setLog] = useState<string[]>([]);
  const offline = project.ai.provider === 'offline' || !project.ai.apiKey.trim();

  const reset = () => {
    setStatus({});
    setLog([]);
    setRunning(false);
  };

  const run = async () => {
    setRunning(true);
    setStatus({});
    setLog([]);
    let working: Project = JSON.parse(JSON.stringify(project));
    let failures = 0;

    for (const step of STEPS) {
      if (skipExisting && step.has(working)) {
        setStatus((s) => ({ ...s, [step.id]: 'skipped' }));
        setLog((l) => [...l, `↷ ${step.label} — skipped, already present`]);
        continue;
      }
      setStatus((s) => ({ ...s, [step.id]: 'running' }));
      const res = await runAction(step.id, working, project.ai);
      if (res.ok && res.apply) {
        update(res.apply);
        const draft: Project = JSON.parse(JSON.stringify(working));
        res.apply(draft);
        working = draft;
        setStatus((s) => ({ ...s, [step.id]: 'done' }));
        setLog((l) => [...l, `✓ ${step.label} — ${res.message}`]);
      } else {
        failures += 1;
        setStatus((s) => ({ ...s, [step.id]: 'error' }));
        setLog((l) => [...l, `✗ ${step.label} — ${res.message}`]);
        break;
      }
    }

    setRunning(false);
    toast(failures ? 'Pipeline stopped — check the log' : 'Episode scaffold complete', failures ? 'err' : 'ok');
  };

  const doneCount = STEPS.filter((s) => ['done', 'skipped'].includes(status[s.id] ?? '')).length;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (running) return;
        reset();
        onClose();
      }}
      title="Auto-produce this episode"
      wide
      footer={
        <>
          <Btn variant="ghost" onClick={() => { reset(); onClose(); }} disabled={running}>Close</Btn>
          <Btn variant="primary" icon="spark" loading={running} onClick={() => void run()}>
            {doneCount ? 'Run again' : 'Run pipeline'}
          </Btn>
        </>
      }
    >
      <div className="stack gap-14">
        <div className="row between wrap gap-10">
          <p className="small muted" style={{ maxWidth: '62ch', lineHeight: 1.6 }}>
            Runs the five generative stages in order, each one receiving the output of the last. Every stage is undoable
            and everything stays editable afterwards — this is a scaffold, not a final draft.
          </p>
          <Badge tone={offline ? 'neutral' : 'ok'} dot>
            {offline ? 'Offline protocol engine' : PROVIDER_LABEL[project.ai.provider]}
          </Badge>
        </div>

        <div className="auto-steps">
          {STEPS.map((step, i) => {
            const st = status[step.id] ?? 'idle';
            const present = step.has(project);
            return (
              <div key={step.id} className={`auto-step is-${st}`}>
                <span className="auto-index">{i + 1}</span>
                <div className="grow">
                  <div className="row gap-8">
                    <strong className="small">{step.label}</strong>
                    {present && <Badge tone="ok">present</Badge>}
                  </div>
                  <div className="tiny dim">{step.desc}</div>
                </div>
                <span className="auto-state">
                  {st === 'running' && <span className="spinner" />}
                  {st === 'done' && <Icon name="check" size={15} />}
                  {st === 'skipped' && <span className="tiny dim">skipped</span>}
                  {st === 'error' && <Icon name="warn" size={15} />}
                  {st === 'idle' && <span className="tiny dim">queued</span>}
                </span>
              </div>
            );
          })}
        </div>

        <div className="row between wrap gap-10">
          <Toggle checked={skipExisting} onChange={setSkipExisting} label="Skip stages that already have content" />
          {doneCount > 0 && !running && (
            <span className="tiny dim">{doneCount}/{STEPS.length} stages complete</span>
          )}
        </div>

        {log.length > 0 && (
          <pre className="prompt-block auto-log">{log.join('\n')}</pre>
        )}

        <div className="notice">
          <Icon name="info" size={14} />
          <span>
            Offline mode writes structural scaffolding — beats, shots, staging, prompts — but deliberately leaves dialogue
            to you. With an API key, the director also writes lines, captions and reversals.
          </span>
        </div>
      </div>
    </Modal>
  );
}
