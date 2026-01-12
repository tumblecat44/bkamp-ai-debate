'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebateStore } from '@/store/debate-store';
import { AIModel } from '@/lib/types';

const MODEL_LABELS: Record<AIModel, string> = {
  gpt: 'OpenAI API Key',
  gemini: 'Google AI API Key',
  claude: 'Anthropic API Key',
};

const MODEL_PLACEHOLDERS: Record<AIModel, string> = {
  gpt: 'sk-...',
  gemini: 'AI...',
  claude: 'sk-ant-...',
};

interface ApiKeyModalProps {
  open: boolean;
  onClose: () => void;
}

export function ApiKeyModal({ open, onClose }: ApiKeyModalProps) {
  const router = useRouter();
  const { selectedModels, aiStates, setApiKey, setStage } = useDebateStore();

  const allKeysEntered = selectedModels.every(
    (model) => aiStates[model].apiKey.trim() !== ''
  );

  const handleStartDebate = () => {
    if (allKeysEntered) {
      setStage('position');
      router.push('/debate');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Key 입력</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {selectedModels.map((model) => (
            <div key={model} className="space-y-2">
              <label className="text-sm font-medium">
                {MODEL_LABELS[model]}
              </label>
              <Input
                type="password"
                placeholder={MODEL_PLACEHOLDERS[model]}
                value={aiStates[model].apiKey}
                onChange={(e) => setApiKey(model, e.target.value)}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleStartDebate} disabled={!allKeysEntered}>
            토론 시작
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
