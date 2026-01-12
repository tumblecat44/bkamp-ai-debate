'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useDebateStore } from '@/store/debate-store';
import { ChatBubble } from './ChatBubble';
import { AiStatus } from './AiStatus';
import { DebateStageDisplay } from './DebateStage';
import { TokenCounter } from './TokenCounter';
import { ResultSummary } from './ResultSummary';
import {
  getNextTurn,
  shouldAdvanceRound,
  shouldAdvanceStage,
  checkConsensus,
  getStageProgress,
} from '@/lib/debate-engine';
import { AIModel } from '@/lib/types';

export function DebateView() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [currentStreamingModel, setCurrentStreamingModel] = useState<AIModel | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [retryCount, setRetryCount] = useState<Record<AIModel, number>>({
    gpt: 0,
    gemini: 0,
    claude: 0,
  });
  const [apiError, setApiError] = useState<{ model: AIModel; message: string } | null>(null);

  const {
    topic,
    stage,
    round,
    messages,
    selectedModels,
    aiStates,
    isPaused,
    isComplete,
    setStage,
    setRound,
    addMessage,
    setAIStatus,
    updateTokenUsage,
    togglePause,
    setComplete,
    reset,
  } = useDebateStore();

  useEffect(() => {
    mountedRef.current = true;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!messagesEndRef.current) return;
    isProgrammaticScrollRef.current = true;
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    // 부드러운 스크롤이 완료될 시간 후 플래그 리셋
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 500);
  }, []);

  const checkIfAtBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const threshold = 100;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  const handleScroll = useCallback(() => {
    // 프로그래매틱 스크롤 중에는 사용자 스크롤 상태를 변경하지 않음
    if (isProgrammaticScrollRef.current) return;

    const atBottom = checkIfAtBottom();
    setIsUserScrolling(!atBottom);
  }, [checkIfAtBottom]);

  // 사용자의 직접적인 스크롤 시도 감지 (wheel, touch)
  const handleUserScrollIntent = useCallback(() => {
    const atBottom = checkIfAtBottom();
    if (!atBottom) {
      setIsUserScrolling(true);
    }
  }, [checkIfAtBottom]);

  // wheel/touch 이벤트 리스너 등록
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleUserScrollIntent, { passive: true });
    container.addEventListener('touchmove', handleUserScrollIntent, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleUserScrollIntent);
      container.removeEventListener('touchmove', handleUserScrollIntent);
    };
  }, [handleUserScrollIntent]);

  useEffect(() => {
    if (!isUserScrolling) {
      scrollToBottom();
    }
  }, [messages, streamingContent, isUserScrolling, scrollToBottom]);

  // 스트리밍이 완료되고 새 메시지가 추가되면 자동 스크롤 재활성화
  useEffect(() => {
    if (!currentStreamingModel) {
      // 스트리밍이 끝난 후 맨 아래에 있으면 자동 스크롤 재활성화
      const atBottom = checkIfAtBottom();
      if (atBottom) {
        setIsUserScrolling(false);
      }
    }
  }, [messages.length, currentStreamingModel, checkIfAtBottom]);

  const runTurn = useCallback(async () => {
    if (isPaused || isComplete || isRunning) return;

    const config = { selectedModels, topic, messages, stage, round };

    // Check for consensus
    if (checkConsensus(config)) {
      setComplete(true);
      return;
    }

    // Check if we should advance stage
    const stageCheck = shouldAdvanceStage(config);
    if (stageCheck.advance && stageCheck.nextStage) {
      if (stageCheck.nextStage === 'result') {
        setComplete(false);
        return;
      }
      setStage(stageCheck.nextStage);
      setRound(1);
      return;
    }

    // Check if we should advance round
    if (shouldAdvanceRound(config)) {
      setRound(round + 1);
      return;
    }

    // Get next turn
    const turn = getNextTurn(config);
    if (!turn) return;

    const { model, systemPrompt, prompt, contextMessages } = turn;

    setIsRunning(true);
    setCurrentStreamingModel(model);
    setAIStatus(model, 'streaming');
    setStreamingContent('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          apiKey: aiStates[model].apiKey,
          systemPrompt,
          messages: [...contextMessages, { role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) throw new Error('API request failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
              if (parsed.error) throw new Error(parsed.error);
            } catch (e) {
              // Re-throw if it's an actual API error, skip only JSON parse errors
              if (e instanceof Error && e.message && !e.message.includes('JSON')) {
                throw e;
              }
            }
          }
        }
      }

      addMessage({
        model,
        content: fullContent,
        stage,
        round,
      });

      setAIStatus(model, 'complete');
      updateTokenUsage(model, Math.ceil(fullContent.length / 4)); // Rough estimate
      setRetryCount((prev) => ({ ...prev, [model]: 0 }));

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // API 키 에러 또는 인증 에러인 경우 바로 모달 표시
      if (errorMessage.includes('401') || errorMessage.includes('API key') || errorMessage.includes('Incorrect')) {
        setApiError({ model, message: `${model.toUpperCase()} API 키가 유효하지 않습니다. 새 토론에서 다시 설정해주세요.` });
        setAIStatus(model, 'abstained');
        return;
      }

      const currentRetry = retryCount[model];
      if (currentRetry < 3) {
        setRetryCount((prev) => ({ ...prev, [model]: currentRetry + 1 }));
        setAIStatus(model, 'idle');
      } else {
        setApiError({ model, message: `${model.toUpperCase()} API 호출에 실패했습니다. 새 토론에서 다시 시도해주세요.` });
        setAIStatus(model, 'abstained');
      }
    } finally {
      setCurrentStreamingModel(null);
      setStreamingContent('');
      setIsRunning(false);
    }
  }, [
    isPaused,
    isComplete,
    isRunning,
    selectedModels,
    topic,
    messages,
    stage,
    round,
    aiStates,
    retryCount,
    setStage,
    setRound,
    addMessage,
    setAIStatus,
    updateTokenUsage,
    setComplete,
  ]);

  useEffect(() => {
    if (!isPaused && !isComplete && stage !== 'result' && !isRunning && mountedRef.current) {
      const timer = setTimeout(runTurn, 1000);
      return () => clearTimeout(timer);
    }
  }, [isPaused, isComplete, stage, messages.length, round, runTurn, isRunning]);

  useEffect(() => {
    if (!topic || selectedModels.length < 2) {
      router.push('/');
    }
  }, [topic, selectedModels.length, router]);

  if (!topic || selectedModels.length < 2) {
    return null;
  }

  if (isComplete || stage === 'result') {
    return <ResultSummary />;
  }

  const progress = getStageProgress({ selectedModels, topic, messages, stage, round });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-semibold truncate flex-1 mr-4">{topic}</h1>
            <Button
              variant={isPaused ? 'default' : 'outline'}
              size="sm"
              onClick={togglePause}
              disabled={isComplete}
            >
              {isPaused ? '재개' : '일시정지'}
            </Button>
          </div>
          <DebateStageDisplay
            stage={stage}
            round={round}
            current={progress.current}
            max={progress.max}
          />
        </div>
      </div>

      {/* AI Status */}
      <div className="border-b p-4">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2">
          {selectedModels.map((model) => (
            <AiStatus
              key={model}
              model={model}
              status={aiStates[model].status}
              tokenUsage={aiStates[model].tokenUsage}
            />
          ))}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4"
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              model={message.model}
              content={message.content}
            />
          ))}

          {currentStreamingModel && streamingContent && (
            <ChatBubble
              model={currentStreamingModel}
              content={streamingContent}
              isStreaming
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Footer */}
      <TokenCounter />

      {/* API Error Modal */}
      <Dialog open={!!apiError} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>API 오류</DialogTitle>
            <DialogDescription>
              {apiError?.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                reset();
                router.push('/');
              }}
            >
              새 토론 시작
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
