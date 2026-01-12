import { AIModel } from '@/lib/types';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';

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
        <div className="text-sm font-medium mb-1" style={{ color: config.color }}>
          {config.name}
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
          {isStreaming && <span className="animate-pulse">|</span>}
        </div>
      </Card>
    </div>
  );
}
