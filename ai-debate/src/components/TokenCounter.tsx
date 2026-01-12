'use client';

import { useDebateStore } from '@/store/debate-store';

export function TokenCounter() {
  const { aiStates, selectedModels } = useDebateStore();

  const totalTokens = selectedModels.reduce(
    (sum, model) => sum + aiStates[model].tokenUsage,
    0
  );

  return (
    <div className="text-xs text-muted-foreground text-center py-2 border-t">
      총 토큰 사용량: {totalTokens.toLocaleString()} tokens
    </div>
  );
}
