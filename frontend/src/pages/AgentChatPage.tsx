import { useState, useRef, useEffect, useCallback } from 'react';
import { createSession, sendMessageSSE } from '../api/agentApi';

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
}

const APP_NAME = 'quotation_agent';
const USER_ID = 'web-user';

export default function AgentChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId;
    const session = await createSession(APP_NAME, USER_ID);
    setSessionId(session.id);
    return session.id;
  }, [sessionId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const sid = await ensureSession();

      // Add an empty agent message that will be streamed into
      setMessages(prev => [...prev, { role: 'agent', content: '' }]);

      await sendMessageSSE(
        APP_NAME,
        USER_ID,
        sid,
        text,
        (chunk: string) => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'agent') {
              updated[updated.length - 1] = { ...last, content: chunk };
            }
            return updated;
          });
        },
        () => {
          setLoading(false);
        },
        (err: Error) => {
          // Remove the empty agent message on error
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'agent' && !last.content) {
              return prev.slice(0, -1);
            }
            return prev;
          });
          setError(err.message);
          setLoading(false);
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderContent = (content: string) => {
    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s)]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline break-all"
        >
          {part}
        </a>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <h2 className="text-2xl font-bold mb-4">智能助理</h2>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow p-4 mb-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <div className="text-4xl mb-4">🤖</div>
            <p className="text-lg font-medium mb-2">EZStore 報價單管理助手</p>
            <p className="text-sm">您可以用自然語言查詢、複製、修改報價單或將報價單轉為訂單。</p>
            <div className="mt-6 space-y-2 text-sm text-gray-500">
              <p>試試看：</p>
              <p className="italic">&ldquo;我要查詢報價單，報價單編號：QT-20260330-001&rdquo;</p>
              <p className="italic">&ldquo;我要查詢客戶的報價單清單，客戶名稱：史塔克工業&rdquo;</p>
              <p className="italic">&ldquo;我要修改報價單報價因子，報價單編號：QT-20260330-001，報價因子改為 0.75&rdquo;</p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-4 py-3 whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.role === 'agent' ? renderContent(msg.content) : msg.content}
              {msg.role === 'agent' && !msg.content && loading && idx === messages.length - 1 && (
                <span className="inline-block animate-pulse">思考中...</span>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-2 text-sm">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="輸入您的指令..."
          disabled={loading}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '處理中...' : '送出'}
        </button>
      </div>
    </div>
  );
}
