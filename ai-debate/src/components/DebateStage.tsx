import { DebateStage as DebateStageType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface DebateStageProps {
  stage: DebateStageType;
  round: number;
  current: number;
  max: number;
}

const STAGE_LABELS: Record<DebateStageType, string> = {
  'topic-input': '',
  'model-select': '',
  position: '1단계: 입장 제시',
  'cross-exam': '2단계: 교차 질문',
  'common-ground': '3단계: 공통점 추출',
  consensus: '4단계: 합의안 도출',
  result: '토론 종료',
};

export function DebateStageDisplay({ stage, round, current, max }: DebateStageProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="text-sm">
        {STAGE_LABELS[stage]}
      </Badge>
      {stage !== 'result' && (
        <span className="text-sm text-muted-foreground">
          {round > 0 ? `라운드 ${round} - ` : ''}{current}/{max}
        </span>
      )}
    </div>
  );
}
