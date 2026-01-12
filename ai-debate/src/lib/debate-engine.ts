import { AIModel, DebateStage, Message } from './types';
import { getSystemPrompt, getStagePrompt } from './prompts';

interface DebateConfig {
  selectedModels: AIModel[];
  topic: string;
  messages: Message[];
  stage: DebateStage;
  round: number;
}

interface TurnResult {
  model: AIModel;
  prompt: string;
  systemPrompt: string;
  contextMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// Stage configuration - 더 치열한 토론을 위해 교차질문 라운드 증가
const STAGE_CONFIG: Record<DebateStage, { maxRounds: number; turnsPerRound: number }> = {
  'topic-input': { maxRounds: 0, turnsPerRound: 0 },
  'model-select': { maxRounds: 0, turnsPerRound: 0 },
  position: { maxRounds: 1, turnsPerRound: 3 },      // Each AI speaks once
  'cross-exam': { maxRounds: 4, turnsPerRound: 3 },  // 4 rounds for more rigorous debate
  'common-ground': { maxRounds: 2, turnsPerRound: 3 }, // 2 rounds to thoroughly identify common ground
  consensus: { maxRounds: 15, turnsPerRound: 3 },    // Up to 15 rounds (but min 3 required)
  result: { maxRounds: 0, turnsPerRound: 0 },
};

export function getNextTurn(config: DebateConfig): TurnResult | null {
  const { selectedModels, topic, messages, stage, round } = config;

  if (stage === 'result' || stage === 'topic-input' || stage === 'model-select') {
    return null;
  }

  const stageMessages = messages.filter((m) => m.stage === stage && m.round === round);
  const modelsSpokenThisRound = stageMessages.map((m) => m.model);

  // Find next model that hasn't spoken this round
  const nextModel = selectedModels.find((m) => !modelsSpokenThisRound.includes(m));

  if (!nextModel) {
    return null; // All models have spoken this round
  }

  const recentMessages = messages.slice(-5);
  const currentConsensus = findCurrentConsensus(messages);

  return {
    model: nextModel,
    systemPrompt: getSystemPrompt(nextModel),
    prompt: getStagePrompt(stage, topic, recentMessages, currentConsensus, round),
    contextMessages: buildContextMessages(messages, nextModel),
  };
}

export function shouldAdvanceRound(config: DebateConfig): boolean {
  const { selectedModels, messages, stage, round } = config;
  const stageMessages = messages.filter((m) => m.stage === stage && m.round === round);
  return stageMessages.length >= selectedModels.length;
}

export function shouldAdvanceStage(config: DebateConfig): { advance: boolean; nextStage?: DebateStage } {
  const { stage, round } = config;
  const stageConfig = STAGE_CONFIG[stage];

  if (round >= stageConfig.maxRounds) {
    const nextStage = getNextStage(stage);
    return { advance: true, nextStage };
  }

  return { advance: false };
}

// 최소 합의 라운드 - 이보다 먼저 합의할 수 없음
const MIN_CONSENSUS_ROUND = 3;

export function checkConsensus(config: DebateConfig): boolean {
  const { selectedModels, messages, stage, round } = config;

  if (stage !== 'consensus') return false;
  if (round < MIN_CONSENSUS_ROUND) return false;

  // 합의 단계의 최근 메시지들에서 각 AI의 마지막 메시지를 확인
  const consensusMessages = messages.filter((m) => m.stage === 'consensus');

  // 각 AI의 마지막 메시지 가져오기
  const lastMessages = selectedModels.map((model) => {
    const modelMessages = consensusMessages.filter((m) => m.model === model);
    return modelMessages[modelMessages.length - 1];
  });

  // 모든 AI가 메시지를 보냈고, 모두 [CONSENSUS]를 포함하면 합의
  return lastMessages.every((m) => m && m.content.includes('[CONSENSUS]'));
}

// 합의 가능 여부 안내 (UI에서 사용)
export function canReachConsensus(round: number): { canConsensus: boolean; remainingRounds: number } {
  return {
    canConsensus: round >= MIN_CONSENSUS_ROUND,
    remainingRounds: Math.max(0, MIN_CONSENSUS_ROUND - round),
  };
}

function getNextStage(current: DebateStage): DebateStage {
  const order: DebateStage[] = ['position', 'cross-exam', 'common-ground', 'consensus', 'result'];
  const currentIndex = order.indexOf(current);
  return order[currentIndex + 1] || 'result';
}

function findCurrentConsensus(messages: Message[]): string | undefined {
  const consensusMessages = messages.filter(
    (m) => m.stage === 'consensus' && !m.content.slice(0, 500).includes('[CONSENSUS]')
  );
  return consensusMessages[consensusMessages.length - 1]?.content;
}

function buildContextMessages(
  messages: Message[],
  currentModel: AIModel
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.slice(-5).map((m) => ({
    role: m.model === currentModel ? 'assistant' : 'user',
    content: `[${m.model.toUpperCase()}]: ${m.content}`,
  }));
}

export function getStageProgress(config: DebateConfig): { current: number; max: number; label: string } {
  const { stage, round, selectedModels, messages } = config;

  const stageMessages = messages.filter((m) => m.stage === stage && m.round === round);
  const turnsInRound = stageMessages.length;

  const labels: Record<DebateStage, string> = {
    'topic-input': '',
    'model-select': '',
    position: '입장 제시',
    'cross-exam': '교차 질문',
    'common-ground': '공통점 추출',
    consensus: '합의안 도출',
    result: '결과',
  };

  return {
    current: turnsInRound,
    max: selectedModels.length,
    label: labels[stage],
  };
}
