'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDebateStore } from '@/store/debate-store';

const EXAMPLE_TOPICS = [
  'AI가 인간의 일자리를 대체해야 하는가?',
  '소셜 미디어는 사회에 이로운가 해로운가?',
  '원격 근무가 사무실 근무보다 효율적인가?',
  '기본소득제를 도입해야 하는가?',
  '사형 제도는 폐지해야 하는가?',
];

export function TopicInput() {
  const router = useRouter();
  const { topic, setTopic, setStage } = useDebateStore();
  const [inputValue, setInputValue] = useState(topic);

  const handleNext = () => {
    if (inputValue.trim()) {
      setTopic(inputValue.trim());
      setStage('model-select');
      router.push('/select');
    }
  };

  const handleExampleClick = (example: string) => {
    setInputValue(example);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">AI 끝장 토론</CardTitle>
          <p className="text-muted-foreground">
            GPT, Gemini, Claude가 토론하고 합의안을 도출합니다
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Input
              placeholder="토론 주제를 입력하세요"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">예시 주제:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_TOPICS.map((example) => (
                <Button
                  key={example}
                  variant="outline"
                  size="sm"
                  onClick={() => handleExampleClick(example)}
                  className="text-xs"
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleNext}
            disabled={!inputValue.trim()}
            className="w-full"
            size="lg"
          >
            다음
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
