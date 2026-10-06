// 與 ADK Agent 服務（/agent-api → agent:8080）溝通的用戶端。
//
// ADK 的 /run_sse 會把整個 Workflow 執行過程中的所有事件都以 SSE 串流出來，
// 包含意圖分類節點（classify_intent，author 為該 LLM 節點名）輸出的 JSON。
// 函式節點的事件 author 是 Workflow 名稱（= app_name），且帶 nodeInfo.path，
// 只有 respond 節點會輸出要顯示給使用者的文字，所以這裡依 nodeInfo / author 過濾。

const AGENT_BASE = '/agent-api';

/** Workflow 中負責產生最終回覆的節點名稱（見 agent/quotation_agent/agent.py）。 */
const RESPONSE_NODE = 'respond';

export interface AgentMessage {
  role: 'user' | 'agent';
  content: string;
}

interface AdkPart {
  text?: string;
  functionCall?: unknown;
  functionResponse?: unknown;
}

interface AdkEvent {
  author?: string;
  partial?: boolean;
  content?: { parts?: AdkPart[] };
  nodeInfo?: { path?: string };
  error?: unknown;
  errorMessage?: string;
}

export async function createSession(
  appName: string,
  userId: string,
): Promise<{ id: string }> {
  const resp = await fetch(`${AGENT_BASE}/apps/${appName}/users/${userId}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!resp.ok) throw new Error(`Failed to create session: ${resp.status}`);
  return resp.json();
}

function eventText(event: AdkEvent): string {
  const parts = event.content?.parts ?? [];
  return parts.map(p => p.text ?? '').join('');
}

/** 是否為要顯示給使用者的回覆事件。 */
function isUserFacing(event: AdkEvent, text: string, appName: string): boolean {
  if (!text) return false;
  const path = event.nodeInfo?.path ?? '';
  if (new RegExp(`/${RESPONSE_NODE}@\\d+$`).test(path)) return true;
  // 其他 LLM 節點（例如 classify_intent）的 author 是節點名，不顯示。
  if (event.author && event.author !== appName) return false;
  // 備援：忽略看起來像結構化 JSON 的內容。
  return !text.trimStart().startsWith('{');
}

/**
 * 送出訊息並串流接收回覆。
 * onText 每次收到的是「目前累積的完整文字」，呼叫端直接以它取代顯示內容即可。
 */
export async function sendMessageSSE(
  appName: string,
  userId: string,
  sessionId: string,
  message: string,
  onText: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): Promise<void> {
  try {
    const resp = await fetch(`${AGENT_BASE}/run_sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: appName,
        user_id: userId,
        session_id: sessionId,
        new_message: {
          role: 'user',
          parts: [{ text: message }],
        },
        streaming: true,
      }),
    });

    if (!resp.ok) {
      throw new Error(`Agent request failed: ${resp.status}`);
    }

    const reader = resp.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        let event: AdkEvent;
        try {
          event = JSON.parse(jsonStr);
        } catch {
          continue; // 非 JSON 的行直接略過
        }

        if (event.error) {
          onError(new Error(String(event.error)));
          return;
        }
        if (event.errorMessage) {
          onError(new Error(event.errorMessage));
          return;
        }

        const text = eventText(event);
        if (!isUserFacing(event, text, appName)) continue;

        // partial 事件是增量片段，要累加；非 partial 事件帶完整文字，直接取代。
        accumulated = event.partial ? accumulated + text : text;
        onText(accumulated);
      }
    }

    onDone();
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
