'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDebateStore } from '@/store/debate-store';
import { AIModel, Message, DebateStage } from '@/lib/types';
import { ChatBubble } from './ChatBubble';
import ReactMarkdown from 'react-markdown';

const MODEL_CONFIG: Record<AIModel, { name: string; color: string }> = {
  gpt: { name: 'GPT', color: '#10A37F' },
  gemini: { name: 'Gemini', color: '#4285F4' },
  claude: { name: 'Claude', color: '#D97706' },
};

const STAGE_LABELS: Record<DebateStage, string> = {
  'topic-input': '',
  'model-select': '',
  position: '1단계: 입장 제시',
  'cross-exam': '2단계: 교차 질문',
  'common-ground': '3단계: 공통점 추출',
  consensus: '4단계: 합의안 도출',
  result: '',
};

interface ParsedConsensusResponse {
  coreArgument: string;
  concession: string;
  proposal: string;
  raw: string;
}

function parseConsensusResponse(content: string): ParsedConsensusResponse {
  const cleanContent = content.replace('[CONSENSUS]', '').trim();

  const coreMatch = cleanContent.match(/\*\*핵심 논거\*\*:\s*([^\n]*(?:\n(?!\*\*)[^\n]*)*)/);
  const concessionMatch = cleanContent.match(/\*\*양보한 부분\*\*:\s*([^\n]*(?:\n(?!\*\*)[^\n]*)*)/);
  const proposalMatch = cleanContent.match(/\*\*합의안\*\*:\s*([^\n]*(?:\n(?!\*\*)[^\n]*)*)/);

  return {
    coreArgument: coreMatch ? coreMatch[1].trim() : '',
    concession: concessionMatch ? concessionMatch[1].trim() : '',
    proposal: proposalMatch ? proposalMatch[1].trim() : '',
    raw: cleanContent,
  };
}

function extractConsensusFromAll(messages: Message[], selectedModels: AIModel[]): string {
  const consensusMessages = messages.filter(
    (m) => m.stage === 'consensus' && m.content.slice(0, 10).includes('[CONSENSUS]')
  );

  if (consensusMessages.length === 0) {
    return '';
  }

  const proposals = consensusMessages.map((m) => {
    const parsed = parseConsensusResponse(m.content);
    return parsed.proposal || parsed.raw;
  });

  if (proposals.length === 1) {
    return proposals[0];
  }

  const allSame = proposals.every((p) => p === proposals[0]);
  if (allSame) {
    return proposals[0];
  }

  const uniqueProposals = [...new Set(proposals.filter(p => p))];
  if (uniqueProposals.length === 1) {
    return uniqueProposals[0];
  }

  return uniqueProposals.join(' | ');
}

export function ResultSummary() {
  const router = useRouter();
  const { topic, messages, selectedModels, consensusReached, aiStates, reset } = useDebateStore();
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryModel, setSummaryModel] = useState<AIModel | null>(null);

  useEffect(() => {
    if (!consensusReached) return;

    const generateSummary = async () => {
      setSummaryLoading(true);
      try {
        const apiKeys: Partial<Record<AIModel, string>> = {};
        for (const model of ['claude', 'gpt', 'gemini'] as AIModel[]) {
          if (aiStates[model].apiKey) {
            apiKeys[model] = aiStates[model].apiKey;
          }
        }

        const response = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, messages, apiKeys }),
        });

        if (response.ok) {
          const data = await response.json();
          setGeneratedSummary(data.summary);
          setSummaryModel(data.model);
        }
      } catch (error) {
        console.error('Failed to generate summary:', error);
      } finally {
        setSummaryLoading(false);
      }
    };

    generateSummary();
  }, [consensusReached, topic, messages, aiStates]);

  const handleNewDebate = () => {
    reset();
    router.push('/');
  };

  const handleCopy = async () => {
    const text = formatDebateForCopy(topic, messages, selectedModels, consensusReached, generatedSummary);
    await navigator.clipboard.writeText(text);
    alert('토론 내용이 복사되었습니다.');
  };

  const consensusSummary = extractConsensusFromAll(messages, selectedModels);

  const finalPositions = selectedModels.map((model) => {
    const consensusMessages = messages.filter(
      (m) => m.model === model && m.stage === 'consensus'
    );
    const lastConsensusMessage = consensusMessages[consensusMessages.length - 1];

    if (lastConsensusMessage) {
      return {
        model,
        parsed: parseConsensusResponse(lastConsensusMessage.content),
      };
    }

    const modelMessages = messages.filter((m) => m.model === model);
    const lastMessage = modelMessages[modelMessages.length - 1];
    return {
      model,
      parsed: {
        coreArgument: lastMessage?.content || '발언 없음',
        concession: '',
        proposal: '',
        raw: lastMessage?.content || '',
      },
    };
  });

  const groupedMessages = messages.reduce((acc, msg) => {
    const key = `${msg.stage}-${msg.round}`;
    if (!acc[key]) {
      acc[key] = { stage: msg.stage, round: msg.round, messages: [] };
    }
    acc[key].messages.push(msg);
    return acc;
  }, {} as Record<string, { stage: DebateStage; round: number; messages: Message[] }>);

  const sortedGroups = Object.values(groupedMessages).sort((a, b) => {
    const stageOrder: DebateStage[] = ['position', 'cross-exam', 'common-ground', 'consensus'];
    const aIndex = stageOrder.indexOf(a.stage);
    const bIndex = stageOrder.indexOf(b.stage);
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.round - b.round;
  });

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {consensusReached ? '합의 성공!' : '합의 실패'}
            </CardTitle>
            <p className="text-muted-foreground">{topic}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {consensusReached && (
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-green-800 dark:text-green-200">
                    합의안
                  </h3>
                  {summaryModel && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Generated by {MODEL_CONFIG[summaryModel].name}
                    </span>
                  )}
                </div>
                {summaryLoading ? (
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full" />
                    <span>합의안 정리 중...</span>
                  </div>
                ) : generatedSummary ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-green-900 dark:text-green-100 prose-headings:text-green-800 dark:prose-headings:text-green-200">
                    <ReactMarkdown>{generatedSummary}</ReactMarkdown>
                  </div>
                ) : consensusSummary ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-green-900 dark:text-green-100 prose-headings:text-green-800 dark:prose-headings:text-green-200">
                    <ReactMarkdown>{consensusSummary}</ReactMarkdown>
                  </div>
                ) : null}
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold">각 AI의 최종 입장</h3>
              {finalPositions.map(({ model, parsed }) => (
                <div
                  key={model}
                  className="p-4 rounded-lg border"
                  style={{ borderLeftColor: MODEL_CONFIG[model].color, borderLeftWidth: 4 }}
                >
                  <div
                    className="font-medium text-sm mb-3"
                    style={{ color: MODEL_CONFIG[model].color }}
                  >
                    {MODEL_CONFIG[model].name}
                  </div>

                  {parsed.coreArgument && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-muted-foreground">핵심 논거</span>
                      <div className="prose prose-sm dark:prose-invert max-w-none mt-1">
                        <ReactMarkdown>{parsed.coreArgument}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {parsed.concession && (
                    <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-950 rounded border border-amber-200 dark:border-amber-800">
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">양보한 부분</span>
                      <div className="prose prose-sm dark:prose-invert max-w-none mt-1 text-amber-900 dark:text-amber-100">
                        <ReactMarkdown>{parsed.concession}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {!parsed.coreArgument && !parsed.concession && parsed.raw && (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                      <ReactMarkdown>{parsed.raw}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowFullHistory(!showFullHistory)}
                className="w-full justify-between"
              >
                <span>전체 토론 보기</span>
                <span>{showFullHistory ? '▲' : '▼'}</span>
              </Button>

              {showFullHistory && (
                <div className="mt-4 space-y-6">
                  {sortedGroups.map((group, idx) => (
                    <div key={idx} className="space-y-3">
                      <div className="text-sm font-medium text-muted-foreground border-b pb-1">
                        {STAGE_LABELS[group.stage]}
                        {group.round > 0 && group.stage === 'consensus' && ` - 라운드 ${group.round}`}
                      </div>
                      {group.messages.map((message) => (
                        <ChatBubble
                          key={message.id}
                          model={message.model}
                          content={message.content}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleCopy} className="flex-1">
                복사하기
              </Button>
              <Button onClick={handleNewDebate} className="flex-1">
                새 토론
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatDebateForCopy(
  topic: string,
  messages: Message[],
  selectedModels: AIModel[],
  consensusReached: boolean,
  generatedSummary?: string | null
): string {
  let text = `# AI 끝장 토론\n\n## 주제\n${topic}\n\n## 결과\n${consensusReached ? '합의 성공' : '합의 실패'}\n\n`;

  if (consensusReached) {
    const consensus = generatedSummary || extractConsensusFromAll(messages, selectedModels);
    if (consensus) {
      text += `## 합의안\n${consensus}\n\n`;
    }
  }

  text += `## 각 AI의 최종 입장\n\n`;
  selectedModels.forEach((model) => {
    const consensusMessages = messages.filter(
      (m) => m.model === model && m.stage === 'consensus'
    );
    const lastMsg = consensusMessages[consensusMessages.length - 1];
    if (lastMsg) {
      const parsed = parseConsensusResponse(lastMsg.content);
      text += `### ${MODEL_CONFIG[model].name}\n`;
      if (parsed.coreArgument) text += `- 핵심 논거: ${parsed.coreArgument}\n`;
      if (parsed.concession) text += `- 양보한 부분: ${parsed.concession}\n`;
      text += '\n';
    }
  });

  text += `## 전체 토론 내용\n\n`;
  messages.forEach((m) => {
    text += `### ${MODEL_CONFIG[m.model].name} (${STAGE_LABELS[m.stage] || m.stage})\n${m.content}\n\n`;
  });

  return text;
}
