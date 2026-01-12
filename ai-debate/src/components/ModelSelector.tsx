'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebateStore } from '@/store/debate-store';
import { AIModel } from '@/lib/types';
import { ApiKeyModal } from './ApiKeyModal';

const MODEL_INFO: Record<AIModel, { name: string; color: string }> = {
  gpt: { name: 'GPT (OpenAI)', color: '#10A37F' },
  gemini: { name: 'Gemini (Google)', color: '#4285F4' },
  claude: { name: 'Claude (Anthropic)', color: '#D97706' },
};

export function ModelSelector() {
  const router = useRouter();
  const { topic, selectedModels, toggleModel } = useDebateStore();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    if (!topic) {
      router.push('/');
    }
  }, [topic, router]);

  const handleStart = () => {
    if (selectedModels.length >= 2) {
      setShowApiKeyModal(true);
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  if (!topic) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">토론 참여 AI 선택</CardTitle>
            <p className="text-muted-foreground text-sm mt-2">
              주제: {topic}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {(Object.keys(MODEL_INFO) as AIModel[]).map((model) => (
                <div
                  key={model}
                  className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
                  onClick={() => toggleModel(model)}
                >
                  <Checkbox
                    checked={selectedModels.includes(model)}
                    onCheckedChange={() => toggleModel(model)}
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: MODEL_INFO[model].color }}
                  />
                  <span className="font-medium">{MODEL_INFO[model].name}</span>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              최소 2개의 AI를 선택하세요 ({selectedModels.length}/3 선택됨)
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                이전
              </Button>
              <Button
                onClick={handleStart}
                disabled={selectedModels.length < 2}
                className="flex-1"
              >
                시작하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ApiKeyModal
        open={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
      />
    </>
  );
}
