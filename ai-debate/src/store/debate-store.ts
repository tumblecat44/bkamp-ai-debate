import { create } from 'zustand';
import { DebateState, AIModel, AIState, DebateStage, Message } from '@/lib/types';

const createInitialAIState = (model: AIModel): AIState => ({
  model,
  status: 'idle',
  apiKey: '',
  tokenUsage: 0,
});

const initialState = {
  topic: '',
  stage: 'topic-input' as DebateStage,
  round: 0,
  messages: [] as Message[],
  selectedModels: [] as AIModel[],
  aiStates: {
    gpt: createInitialAIState('gpt'),
    gemini: createInitialAIState('gemini'),
    claude: createInitialAIState('claude'),
  },
  isPaused: false,
  isComplete: false,
  consensusReached: false,
};

export const useDebateStore = create<DebateState>((set) => ({
  ...initialState,

  setTopic: (topic) => set({ topic }),

  setStage: (stage) => set({ stage }),

  setRound: (round) => set({ round }),

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: `${message.model}-${Date.now()}`,
          timestamp: Date.now(),
        },
      ],
    })),

  updateStreamingMessage: (model, content) =>
    set((state) => {
      const existingIndex = state.messages.findIndex(
        (m) => m.model === model && m.stage === state.stage && m.round === state.round
      );

      if (existingIndex === -1) {
        return {
          messages: [
            ...state.messages,
            {
              id: `${model}-${Date.now()}`,
              model,
              content,
              stage: state.stage,
              round: state.round,
              timestamp: Date.now(),
            },
          ],
        };
      }

      const newMessages = [...state.messages];
      newMessages[existingIndex] = {
        ...newMessages[existingIndex],
        content,
      };
      return { messages: newMessages };
    }),

  toggleModel: (model) =>
    set((state) => ({
      selectedModels: state.selectedModels.includes(model)
        ? state.selectedModels.filter((m) => m !== model)
        : [...state.selectedModels, model],
    })),

  setApiKey: (model, key) =>
    set((state) => ({
      aiStates: {
        ...state.aiStates,
        [model]: { ...state.aiStates[model], apiKey: key },
      },
    })),

  setAIStatus: (model, status) =>
    set((state) => ({
      aiStates: {
        ...state.aiStates,
        [model]: { ...state.aiStates[model], status },
      },
    })),

  updateTokenUsage: (model, tokens) =>
    set((state) => ({
      aiStates: {
        ...state.aiStates,
        [model]: {
          ...state.aiStates[model],
          tokenUsage: state.aiStates[model].tokenUsage + tokens,
        },
      },
    })),

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  setComplete: (consensusReached) =>
    set({ isComplete: true, consensusReached, stage: 'result' }),

  reset: () => set(initialState),
}));
