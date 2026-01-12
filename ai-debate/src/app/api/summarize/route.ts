import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIModel, Message } from '@/lib/types';

interface SummarizeRequest {
  topic: string;
  messages: Message[];
  apiKeys: Partial<Record<AIModel, string>>;
}

const SUMMARY_PROMPT = `당신은 AI 토론의 최종 합의안을 정리하는 전문가입니다.

주어진 토론 주제와 최근 대화 내용을 바탕으로, 모든 AI들이 합의한 내용을 하나의 통합된 합의안으로 정리해주세요.

## 작성 지침:
1. 각 AI의 합의안에서 공통된 핵심 내용을 추출하세요
2. 중복을 제거하고 논리적으로 구조화하세요
3. 명확하고 간결하게 작성하세요
4. 마크다운 형식으로 정리하세요

## 출력 형식:
### 핵심 합의 사항
- (핵심 합의 내용들을 불릿 포인트로)

### 세부 합의 내용
(구체적인 합의 내용을 구조화하여 정리)

### 결론
(한 문단으로 최종 결론 요약)`;

async function summarizeWithClaude(topic: string, messagesText: string, apiKey: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    system: SUMMARY_PROMPT,
    messages: [
      {
        role: 'user',
        content: `## 토론 주제\n${topic}\n\n## 최근 토론 내용\n${messagesText}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock ? textBlock.text : '';
}

async function summarizeWithGPT(topic: string, messagesText: string, apiKey: string): Promise<string> {
  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 4000,
    messages: [
      { role: 'system', content: SUMMARY_PROMPT },
      {
        role: 'user',
        content: `## 토론 주제\n${topic}\n\n## 최근 토론 내용\n${messagesText}`,
      },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

async function summarizeWithGemini(topic: string, messagesText: string, apiKey: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    systemInstruction: SUMMARY_PROMPT,
  });

  const result = await model.generateContent(`## 토론 주제\n${topic}\n\n## 최근 토론 내용\n${messagesText}`);
  return result.response.text();
}

const MODEL_NAMES: Record<AIModel, string> = {
  gpt: 'GPT',
  claude: 'Claude',
  gemini: 'Gemini',
};

export async function POST(request: NextRequest) {
  try {
    const body: SummarizeRequest = await request.json();
    const { topic, messages, apiKeys } = body;

    // Get last 5 messages
    const recentMessages = messages.slice(-5);
    const messagesText = recentMessages
      .map((m) => `[${MODEL_NAMES[m.model]}]\n${m.content}`)
      .join('\n\n---\n\n');

    // Try Claude > GPT > Gemini
    const modelPriority: AIModel[] = ['claude', 'gpt', 'gemini'];

    for (const model of modelPriority) {
      const apiKey = apiKeys[model];
      if (!apiKey) continue;

      try {
        let summary: string;
        switch (model) {
          case 'claude':
            summary = await summarizeWithClaude(topic, messagesText, apiKey);
            break;
          case 'gpt':
            summary = await summarizeWithGPT(topic, messagesText, apiKey);
            break;
          case 'gemini':
            summary = await summarizeWithGemini(topic, messagesText, apiKey);
            break;
        }

        return NextResponse.json({ summary, model });
      } catch (error) {
        console.error(`[Summarize] ${model} failed:`, error);
        // Continue to next model
      }
    }

    return NextResponse.json(
      { error: 'No available API key for summarization' },
      { status: 400 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
