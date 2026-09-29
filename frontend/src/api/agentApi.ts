const AGENT_BASE = '/agent-api';

export interface AgentMessage {
  role: 'user' | 'agent';
  content: string;
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const event = JSON.parse(jsonStr);
            // Handle error events from ADK
            if (event?.error) {
              onError(new Error(String(event.error)));
              return;
            }
            // ADK SSE events contain content.parts with text
            const parts = event?.content?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.text) {
                  onText(part.text);
                }
              }
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }
    }

    onDone();
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
