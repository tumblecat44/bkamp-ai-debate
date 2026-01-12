import { AIModel, AIStatus as AIStatusType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const MODEL_CONFIG: Record<AIModel, { name: string; color: string }> = {
  gpt: { name: 'GPT', color: '#10A37F' },
  gemini: { name: 'Gemini', color: '#4285F4' },
  claude: { name: 'Claude', color: '#D97706' },
};

const STATUS_CONFIG: Record<AIStatusType, { label: string; emoji: string }> = {
  idle: { label: '대기 중', emoji: '⚪' },
  streaming: { label: '발언 중...', emoji: '🔵' },
  complete: { label: '발언 완료', emoji: '🟢' },
  error: { label: '오류', emoji: '🔴' },
  abstained: { label: '기권', emoji: '⚫' },
};

interface AiStatusProps {
  model: AIModel;
  status: AIStatusType;
  tokenUsage: number;
}

export function AiStatus({ model, status, tokenUsage }: AiStatusProps) {
  const modelConfig = MODEL_CONFIG[model];
  const statusConfig = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border">
      <span>{statusConfig.emoji}</span>
      <span className="font-medium" style={{ color: modelConfig.color }}>
        {modelConfig.name}
      </span>
      <Badge variant="secondary" className="text-xs">
        {statusConfig.label}
      </Badge>
      <span className="text-xs text-muted-foreground ml-auto">
        {tokenUsage.toLocaleString()} tokens
      </span>
    </div>
  );
}
