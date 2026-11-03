import { STAGES } from '../store/constants';
import type { StageId } from '../store/types';
import { useStudio } from '../store/studio';
import { Btn, Icon } from './ui';
import { useNavigate } from './nav';

export function StageNav({ stage }: { stage: StageId }) {
  const navigate = useNavigate();
  const { update, toast } = useStudio();
  const idx = STAGES.findIndex((s) => s.id === stage);
  const current = STAGES[idx];
  const prev = STAGES[idx - 1];
  const next = STAGES[idx + 1];

  return (
    <div className="stage-nav">
      <div className="stage-nav-side">
        {prev ? (
          <Btn variant="ghost" icon="arrowLeft" onClick={() => navigate(prev.id)}>
            {prev.short}
          </Btn>
        ) : (
          <span />
        )}
      </div>
      <div className="stage-nav-mid">
        <span className="tiny dim">
          Stage {current.n} of {STAGES.length}
        </span>
        <span className="stage-nav-rule">{current.label}</span>
      </div>
      <div className="stage-nav-side end">
        {next ? (
          <Btn
            variant="primary"
            onClick={() => {
              update((p) => {
                p.gates[stage] = new Date().toISOString();
              });
              navigate(next.id);
            }}
          >
            {next.label}
            <Icon name="arrow" size={15} />
          </Btn>
        ) : (
          <Btn variant="primary" onClick={() => navigate('preview')}>
            Open reader
            <Icon name="arrow" size={15} />
          </Btn>
        )}
      </div>
    </div>
  );
}
