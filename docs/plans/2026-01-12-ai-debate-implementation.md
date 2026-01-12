# AI Debate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web application where GPT, Gemini, and Claude debate a topic and reach consensus.

**Architecture:** Next.js full-stack app with client-side state (Zustand), streaming AI responses via API routes, and a multi-stage debate engine. The frontend manages the debate flow, storing full conversation history while sending only recent context to AI APIs for token efficiency.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Zustand, OpenAI SDK, Google Generative AI SDK, Anthropic SDK

---

## Task 1: Project Setup

**Files:**
- Create: `ai-debate/package.json`
- Create: `ai-debate/tsconfig.json`
- Create: `ai-debate/tailwind.config.ts`
- Create: `ai-debate/next.config.js`
- Create: `ai-debate/app/layout.tsx`
- Create: `ai-debate/app/globals.css`
- Create: `ai-debate/components.json`

**Step 1: Create Next.js project**

```bash
cd /Users/dgsw67/ai-diss
npx create-next-app@latest ai-debate --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

Expected: New `ai-debate` directory with Next.js project

**Step 2: Install dependencies**

```bash
cd /Users/dgsw67/ai-diss/ai-debate
npm install zustand openai @google/generative-ai @anthropic-ai/sdk
npm install -D @types/node
```

Expected: Dependencies added to package.json

**Step 3: Initialize shadcn/ui**

```bash
cd /Users/dgsw67/ai-diss/ai-debate
npx shadcn@latest init -d
```

Expected: `components.json` created, tailwind config updated

**Step 4: Add shadcn components**

```bash
cd /Users/dgsw67/ai-diss/ai-debate
npx shadcn@latest add button input card checkbox dialog badge
```

Expected: Components added to `components/ui/`

**Step 5: Verify setup**

```bash
cd /Users/dgsw67/ai-diss/ai-debate
npm run dev
```

Expected: Dev server starts on localhost:3000

**Step 6: Commit**

```bash
cd /Users/dgsw67/ai-diss/ai-debate
git add .
git commit -m "feat: initialize Next.js project with shadcn/ui"
```

---

## Task 2: Zustand Store

**Files:**
- Create: `ai-debate/store/debate-store.ts`
- Create: `ai-debate/lib/types.ts`

**Step 1: Create types file**

Create `ai-debate/lib/types.ts`:

```typescript
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
  toggleModel: (model: AIModel) => void;
  setApiKey: (model: AIModel, key: string) => void;
  setAIStatus: (model: AIModel, status: AIStatus) => void;
  updateTokenUsage: (model: AIModel, tokens: number) => void;
  togglePause: () => void;
  setComplete: (consensusReached: boolean) => void;
  reset: () => void;
}
```

**Step 2: Create Zustand store**

Create `ai-debate/store/debate-store.ts`:

```typescript
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
```

**Step 3: Verify TypeScript compilation**

```bash
cd /Users/dgsw67/ai-diss/ai-debate
npx tsc --noEmit
```

Expected: No errors

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add Zustand store and TypeScript types"
```

---

## Task 3: Topic Input Page

**Files:**
- Modify: `ai-debate/app/page.tsx`
- Create: `ai-debate/components/TopicInput.tsx`

**Step 1: Create TopicInput component**

Create `ai-debate/components/TopicInput.tsx`:

```typescript
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
```

**Step 2: Update main page**

Replace `ai-debate/app/page.tsx`:

```typescript
import { TopicInput } from '@/components/TopicInput';

export default function Home() {
  return <TopicInput />;
}
```

**Step 3: Test in browser**

```bash
cd /Users/dgsw67/ai-diss/ai-debate
npm run dev
```

Expected: Topic input page renders at localhost:3000

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add topic input page"
```

---

## Task 4: Model Selection Page

**Files:**
- Create: `ai-debate/app/select/page.tsx`
- Create: `ai-debate/components/ModelSelector.tsx`

**Step 1: Create ModelSelector component**

Create `ai-debate/components/ModelSelector.tsx`:

```typescript
'use client';

import { useState } from 'react';
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

  const handleStart = () => {
    if (selectedModels.length >= 2) {
      setShowApiKeyModal(true);
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  if (!topic) {
    router.push('/');
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
```

**Step 2: Create select page**

Create `ai-debate/app/select/page.tsx`:

```typescript
import { ModelSelector } from '@/components/ModelSelector';

export default function SelectPage() {
  return <ModelSelector />;
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add model selection page"
```

---

## Task 5: API Key Modal

**Files:**
- Create: `ai-debate/components/ApiKeyModal.tsx`

**Step 1: Create ApiKeyModal component**

Create `ai-debate/components/ApiKeyModal.tsx`:

```typescript
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
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add API key modal component"
```

---

## Task 6: AI API Clients

**Files:**
- Create: `ai-debate/lib/ai-clients.ts`
- Create: `ai-debate/app/api/chat/route.ts`

**Step 1: Create AI clients wrapper**

Create `ai-debate/lib/ai-clients.ts`:

```typescript
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIModel, Message } from './types';

export interface ChatRequest {
  model: AIModel;
  apiKey: string;
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function* streamChat(request: ChatRequest): AsyncGenerator<string> {
  const { model, apiKey, systemPrompt, messages } = request;

  switch (model) {
    case 'gpt': {
      const openai = new OpenAI({ apiKey });
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) yield content;
      }
      break;
    }

    case 'claude': {
      const anthropic = new Anthropic({ apiKey });
      const stream = await anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield event.delta.text;
        }
      }
      break;
    }

    case 'gemini': {
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const chat = geminiModel.startChat({
        history: messages.slice(0, -1).map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        })),
        systemInstruction: systemPrompt,
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessageStream(lastMessage.content);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
      break;
    }
  }
}
```

**Step 2: Create API route**

Create `ai-debate/app/api/chat/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { streamChat, ChatRequest } from '@/lib/ai-clients';

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamChat(body)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add AI API clients and streaming route"
```

---

## Task 7: Debate Engine and Prompts

**Files:**
- Create: `ai-debate/lib/prompts.ts`
- Create: `ai-debate/lib/debate-engine.ts`

**Step 1: Create prompts**

Create `ai-debate/lib/prompts.ts`:

```typescript
import { AIModel, DebateStage, Message } from './types';

const MODEL_NAMES: Record<AIModel, string> = {
  gpt: 'GPT',
  gemini: 'Gemini',
  claude: 'Claude',
};

export function getSystemPrompt(model: AIModel): string {
  return `당신은 ${MODEL_NAMES[model]}입니다. 토론에서 논리적이고 건설적인 대화를 합니다.
응답은 한국어로 하며, 300자 이내로 간결하게 작성합니다.
다른 AI의 의견을 존중하면서도 자신의 논리를 명확히 전달합니다.`;
}

export function getStagePrompt(
  stage: DebateStage,
  topic: string,
  recentMessages: Message[],
  currentConsensus?: string
): string {
  const recentContext = recentMessages
    .map((m) => `${MODEL_NAMES[m.model]}: ${m.content}`)
    .join('\n\n');

  switch (stage) {
    case 'position':
      return `토론 주제: "${topic}"

이 주제에 대한 당신의 입장을 제시하세요. 핵심 논거 2-3가지를 포함해 주세요.`;

    case 'cross-exam':
      return `토론 주제: "${topic}"

지금까지의 토론:
${recentContext}

상대 논거의 약점을 지적하고, 반드시 대안을 제시하세요. 비판만 하지 말고 건설적인 제안을 포함하세요.`;

    case 'common-ground':
      return `토론 주제: "${topic}"

지금까지의 토론:
${recentContext}

지금까지 논의를 보고, 모든 참여자가 동의할 수 있는 공통점을 정리하세요. 합의 가능한 영역을 구체적으로 제시하세요.`;

    case 'consensus':
      return `토론 주제: "${topic}"

지금까지의 토론:
${recentContext}

${currentConsensus ? `현재 합의안: "${currentConsensus}"` : ''}

공통점을 기반으로 합의안을 제안하거나, 기존 합의안에 동의/수정을 요청하세요.
현재 합의안에 완전히 동의하면 응답 맨 앞에 [CONSENSUS]를 붙이세요.`;

    default:
      return topic;
  }
}
```

**Step 2: Create debate engine**

Create `ai-debate/lib/debate-engine.ts`:

```typescript
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

// Stage configuration
const STAGE_CONFIG: Record<DebateStage, { maxRounds: number; turnsPerRound: number }> = {
  'topic-input': { maxRounds: 0, turnsPerRound: 0 },
  'model-select': { maxRounds: 0, turnsPerRound: 0 },
  position: { maxRounds: 1, turnsPerRound: 3 },      // Each AI speaks once
  'cross-exam': { maxRounds: 2, turnsPerRound: 3 },  // 2 rounds, each AI once per round
  'common-ground': { maxRounds: 1, turnsPerRound: 3 }, // Each AI speaks once
  consensus: { maxRounds: 15, turnsPerRound: 3 },    // Up to 15 rounds
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
    prompt: getStagePrompt(stage, topic, recentMessages, currentConsensus),
    contextMessages: buildContextMessages(messages, nextModel),
  };
}

export function shouldAdvanceRound(config: DebateConfig): boolean {
  const { selectedModels, messages, stage, round } = config;
  const stageMessages = messages.filter((m) => m.stage === stage && m.round === round);
  return stageMessages.length >= selectedModels.length;
}

export function shouldAdvanceStage(config: DebateConfig): { advance: boolean; nextStage?: DebateStage } {
  const { messages, stage, round } = config;
  const stageConfig = STAGE_CONFIG[stage];

  if (round >= stageConfig.maxRounds) {
    const nextStage = getNextStage(stage);
    return { advance: true, nextStage };
  }

  return { advance: false };
}

export function checkConsensus(config: DebateConfig): boolean {
  const { selectedModels, messages, stage, round } = config;

  if (stage !== 'consensus') return false;

  const roundMessages = messages.filter((m) => m.stage === stage && m.round === round);

  if (roundMessages.length < selectedModels.length) return false;

  return roundMessages.every((m) => m.content.startsWith('[CONSENSUS]'));
}

function getNextStage(current: DebateStage): DebateStage {
  const order: DebateStage[] = ['position', 'cross-exam', 'common-ground', 'consensus', 'result'];
  const currentIndex = order.indexOf(current);
  return order[currentIndex + 1] || 'result';
}

function findCurrentConsensus(messages: Message[]): string | undefined {
  const consensusMessages = messages.filter(
    (m) => m.stage === 'consensus' && !m.content.startsWith('[CONSENSUS]')
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
  const stageConfig = STAGE_CONFIG[stage];

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
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add debate engine and prompts"
```

---

## Task 8: Debate Page UI Components

**Files:**
- Create: `ai-debate/app/debate/page.tsx`
- Create: `ai-debate/components/DebateStage.tsx`
- Create: `ai-debate/components/ChatBubble.tsx`
- Create: `ai-debate/components/AiStatus.tsx`
- Create: `ai-debate/components/TokenCounter.tsx`
- Create: `ai-debate/components/DebateView.tsx`

**Step 1: Create ChatBubble component**

Create `ai-debate/components/ChatBubble.tsx`:

```typescript
import { AIModel } from '@/lib/types';
import { Card } from '@/components/ui/card';

const MODEL_CONFIG: Record<AIModel, { name: string; color: string; bgColor: string }> = {
  gpt: { name: 'GPT', color: '#10A37F', bgColor: 'bg-green-50 dark:bg-green-950' },
  gemini: { name: 'Gemini', color: '#4285F4', bgColor: 'bg-blue-50 dark:bg-blue-950' },
  claude: { name: 'Claude', color: '#D97706', bgColor: 'bg-orange-50 dark:bg-orange-950' },
};

interface ChatBubbleProps {
  model: AIModel;
  content: string;
  isStreaming?: boolean;
}

export function ChatBubble({ model, content, isStreaming }: ChatBubbleProps) {
  const config = MODEL_CONFIG[model];

  return (
    <div className="flex gap-3 items-start">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ backgroundColor: config.color }}
      >
        {config.name[0]}
      </div>
      <Card className={`flex-1 p-3 ${config.bgColor}`}>
        <div className="text-sm font-medium mb-1\" style={{ color: config.color }}>
          {config.name}
        </div>
        <div className="text-sm whitespace-pre-wrap">
          {content}
          {isStreaming && <span className="animate-pulse">|</span>}
        </div>
      </Card>
    </div>
  );
}
```

**Step 2: Create AiStatus component**

Create `ai-debate/components/AiStatus.tsx`:

```typescript
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
```

**Step 3: Create DebateStage component**

Create `ai-debate/components/DebateStage.tsx`:

```typescript
import { DebateStage as DebateStageType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface DebateStageProps {
  stage: DebateStageType;
  round: number;
  current: number;
  max: number;
}

const STAGE_LABELS: Record<DebateStageType, string> = {
  'topic-input': '',
  'model-select': '',
  position: '1단계: 입장 제시',
  'cross-exam': '2단계: 교차 질문',
  'common-ground': '3단계: 공통점 추출',
  consensus: '4단계: 합의안 도출',
  result: '토론 종료',
};

export function DebateStageDisplay({ stage, round, current, max }: DebateStageProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="text-sm">
        {STAGE_LABELS[stage]}
      </Badge>
      {stage !== 'result' && (
        <span className="text-sm text-muted-foreground">
          {round > 0 ? `라운드 ${round} - ` : ''}{current}/{max}
        </span>
      )}
    </div>
  );
}
```

**Step 4: Create TokenCounter component**

Create `ai-debate/components/TokenCounter.tsx`:

```typescript
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
```

**Step 5: Create DebateView component**

Create `ai-debate/components/DebateView.tsx`:

```typescript
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDebateStore } from '@/store/debate-store';
import { ChatBubble } from './ChatBubble';
import { AiStatus } from './AiStatus';
import { DebateStageDisplay } from './DebateStage';
import { TokenCounter } from './TokenCounter';
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
  const [streamingContent, setStreamingContent] = useState('');
  const [currentStreamingModel, setCurrentStreamingModel] = useState<AIModel | null>(null);
  const [retryCount, setRetryCount] = useState<Record<AIModel, number>>({
    gpt: 0,
    gemini: 0,
    claude: 0,
  });

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
  } = useDebateStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const runTurn = useCallback(async () => {
    if (isPaused || isComplete) return;

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
              // Skip parse errors for incomplete JSON
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

      const currentRetry = retryCount[model];
      if (currentRetry < 3) {
        setRetryCount((prev) => ({ ...prev, [model]: currentRetry + 1 }));
        setAIStatus(model, 'idle');
      } else {
        setAIStatus(model, 'abstained');
        addMessage({
          model,
          content: '[기권: API 호출 실패]',
          stage,
          round,
        });
      }
    } finally {
      setCurrentStreamingModel(null);
      setStreamingContent('');
    }
  }, [
    isPaused,
    isComplete,
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
    if (!isPaused && !isComplete && stage !== 'result') {
      const timer = setTimeout(runTurn, 1000);
      return () => clearTimeout(timer);
    }
  }, [isPaused, isComplete, stage, messages.length, round, runTurn]);

  if (!topic || selectedModels.length < 2) {
    router.push('/');
    return null;
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
      <div className="flex-1 overflow-y-auto p-4">
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
    </div>
  );
}
```

**Step 6: Create debate page**

Create `ai-debate/app/debate/page.tsx`:

```typescript
import { DebateView } from '@/components/DebateView';

export default function DebatePage() {
  return <DebateView />;
}
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add debate page UI components"
```

---

## Task 9: Result Summary

**Files:**
- Create: `ai-debate/components/ResultSummary.tsx`
- Modify: `ai-debate/components/DebateView.tsx`

**Step 1: Create ResultSummary component**

Create `ai-debate/components/ResultSummary.tsx`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDebateStore } from '@/store/debate-store';
import { AIModel, Message } from '@/lib/types';

const MODEL_CONFIG: Record<AIModel, { name: string; color: string }> = {
  gpt: { name: 'GPT', color: '#10A37F' },
  gemini: { name: 'Gemini', color: '#4285F4' },
  claude: { name: 'Claude', color: '#D97706' },
};

export function ResultSummary() {
  const router = useRouter();
  const { topic, messages, selectedModels, consensusReached, reset } = useDebateStore();

  const handleNewDebate = () => {
    reset();
    router.push('/');
  };

  const handleCopy = async () => {
    const text = formatDebateForCopy(topic, messages, consensusReached);
    await navigator.clipboard.writeText(text);
    alert('토론 내용이 복사되었습니다.');
  };

  const consensusMessages = messages.filter(
    (m) => m.stage === 'consensus' && m.content.startsWith('[CONSENSUS]')
  );

  const finalPositions = selectedModels.map((model) => {
    const modelMessages = messages.filter((m) => m.model === model);
    return {
      model,
      lastMessage: modelMessages[modelMessages.length - 1],
    };
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
            {consensusReached && consensusMessages.length > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                  합의안
                </h3>
                <p className="text-sm">
                  {consensusMessages[0].content.replace('[CONSENSUS]', '').trim()}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold">각 AI의 최종 입장</h3>
              {finalPositions.map(({ model, lastMessage }) => (
                <div
                  key={model}
                  className="p-3 rounded-lg border"
                  style={{ borderLeftColor: MODEL_CONFIG[model].color, borderLeftWidth: 4 }}
                >
                  <div
                    className="font-medium text-sm mb-1"
                    style={{ color: MODEL_CONFIG[model].color }}
                  >
                    {MODEL_CONFIG[model].name}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {lastMessage?.content.replace('[CONSENSUS]', '').trim() || '발언 없음'}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
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

function formatDebateForCopy(topic: string, messages: Message[], consensusReached: boolean): string {
  let text = `# AI 끝장 토론\n\n## 주제\n${topic}\n\n## 결과\n${consensusReached ? '합의 성공' : '합의 실패'}\n\n## 토론 내용\n\n`;

  messages.forEach((m) => {
    text += `### ${MODEL_CONFIG[m.model].name}\n${m.content}\n\n`;
  });

  return text;
}
```

**Step 2: Update DebateView to show result**

Edit `ai-debate/components/DebateView.tsx` to add result rendering:

Add import at the top:
```typescript
import { ResultSummary } from './ResultSummary';
```

Add condition at the start of the component return:
```typescript
if (isComplete || stage === 'result') {
  return <ResultSummary />;
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add result summary component"
```

---

## Task 10: Dark Mode Support

**Files:**
- Modify: `ai-debate/app/layout.tsx`
- Create: `ai-debate/components/ThemeProvider.tsx`

**Step 1: Install next-themes**

```bash
cd /Users/dgsw67/ai-diss/ai-debate
npm install next-themes
```

**Step 2: Create ThemeProvider**

Create `ai-debate/components/ThemeProvider.tsx`:

```typescript
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

**Step 3: Update layout**

Modify `ai-debate/app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI 끝장 토론',
  description: 'GPT, Gemini, Claude가 토론하고 합의안을 도출합니다',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add dark mode support"
```

---

## Task 11: Final Testing and Cleanup

**Step 1: Run type check**

```bash
cd /Users/dgsw67/ai-diss/ai-debate
npx tsc --noEmit
```

Expected: No errors

**Step 2: Run linter**

```bash
cd /Users/dgsw67/ai-diss/ai-debate
npm run lint
```

Expected: No errors or warnings

**Step 3: Test the full flow**

```bash
cd /Users/dgsw67/ai-diss/ai-debate
npm run dev
```

Manual test:
1. Enter a topic on the home page
2. Select at least 2 AI models
3. Enter API keys in the modal
4. Watch the debate progress
5. Verify streaming works
6. Check result summary displays correctly

**Step 4: Build for production**

```bash
cd /Users/dgsw67/ai-diss/ai-debate
npm run build
```

Expected: Build completes successfully

**Step 5: Final commit**

```bash
git add .
git commit -m "chore: final cleanup and testing"
```

---

## Summary

This implementation plan creates:

1. **Project Setup** - Next.js with TypeScript, Tailwind, shadcn/ui
2. **State Management** - Zustand store for debate state
3. **Pages** - Topic input, model selection, debate view, results
4. **AI Integration** - Streaming API routes for GPT, Gemini, Claude
5. **Debate Engine** - Multi-stage debate logic with consensus detection
6. **UI Components** - Chat bubbles, status indicators, progress display
7. **Features** - Dark mode, token counting, copy/share functionality

Total estimated components: 15+ files across app, components, lib, and store directories.
