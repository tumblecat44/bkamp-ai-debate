export type AIModel = 'gpt' | 'gemini' | 'claude';

export type DebateStage =
  | 'topic-input'
  | 'model-select'
  | 'position'      // Stage 1: Initial positions
  | 'cross-exam'    // Stage 2: Cross examination
  | 'common-ground' // Stage 3: Find common points
  | 'consensus'     // Stage 4: Reach consensus
  | 'result';

export type AIStatus = 'idle' | 'streaming' | 'complete' | 'error' | 'abstained';

export interface Message {
  id: string;
  model: AIModel;
  content: string;
  stage: DebateStage;
  round: number;
  timestamp: number;
  tokenCount?: number;
}

export interface AIState {
  model: AIModel;
  status: AIStatus;
  apiKey: string;
  tokenUsage: number;
}

export interface DebateState {
  // Core state
  topic: string;
  stage: DebateStage;
  round: number;
  messages: Message[];

  // AI state
  selectedModels: AIModel[];
  aiStates: Record<AIModel, AIState>;

  // Control
  isPaused: boolean;
  isComplete: boolean;
  consensusReached: boolean;

  // Actions
  setTopic: (topic: string) => void;
  setStage: (stage: DebateStage) => void;
  setRound: (round: number) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateStreamingMessage: (model: AIModel, content: string) => void;
  toggleModel: (model: AIModel) => void;
  setApiKey: (model: AIModel, key: string) => void;
  setAIStatus: (model: AIModel, status: AIStatus) => void;
  updateTokenUsage: (model: AIModel, tokens: number) => void;
  togglePause: () => void;
  setComplete: (consensusReached: boolean) => void;
  reset: () => void;
}
