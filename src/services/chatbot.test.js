import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('askChatbot (FR-014)', () => {
  const originalApiUrl = import.meta.env.VITE_CHATBOT_API_URL;
  const originalGroqKey = import.meta.env.VITE_GROQ_API_KEY;

  beforeEach(() => {
    import.meta.env.VITE_CHATBOT_API_URL = '';
    import.meta.env.VITE_GROQ_API_KEY = '';
    vi.resetModules();
  });

  afterEach(() => {
    import.meta.env.VITE_CHATBOT_API_URL = originalApiUrl;
    import.meta.env.VITE_GROQ_API_KEY = originalGroqKey;
    vi.unstubAllGlobals();
  });

  it('returns a not-configured message when neither key nor URL is set', async () => {
    const { askChatbot } = await import('./chatbot');
    const reply = await askChatbot('Am I eligible to donate?');
    expect(reply).toMatch(/not configured/i);
  });

  it('posts the message to the custom backend URL and returns the reply', async () => {
    import.meta.env.VITE_CHATBOT_API_URL = 'https://example.com/chat';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ reply: 'Yes, you are eligible.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { askChatbot } = await import('./chatbot');
    const reply = await askChatbot('Am I eligible?', [{ role: 'user', content: 'hi' }]);

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/chat', expect.objectContaining({ method: 'POST' }));
    expect(reply).toBe('Yes, you are eligible.');
  });

  it('throws a friendly error when the custom backend responds with a failure status', async () => {
    import.meta.env.VITE_CHATBOT_API_URL = 'https://example.com/chat';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const { askChatbot } = await import('./chatbot');
    await expect(askChatbot('hello')).rejects.toThrow('The chatbot is unavailable right now.');
  });

  it('falls back to a default reply when the custom backend omits the reply field', async () => {
    import.meta.env.VITE_CHATBOT_API_URL = 'https://example.com/chat';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));

    const { askChatbot } = await import('./chatbot');
    const reply = await askChatbot('hello');
    expect(reply).toMatch(/could you rephrase/i);
  });

  it('calls the Groq chat completions endpoint when VITE_GROQ_API_KEY is set', async () => {
    import.meta.env.VITE_GROQ_API_KEY = 'gsk_testkey';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'You are eligible!' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { askChatbot } = await import('./chatbot');
    const reply = await askChatbot('Am I eligible?', [{ role: 'user', content: 'Am I eligible?' }]);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer gsk_testkey' }),
      }),
    );
    expect(reply).toBe('You are eligible!');
  });

  it('sends the system prompt and full conversation history to Groq', async () => {
    import.meta.env.VITE_GROQ_API_KEY = 'gsk_testkey';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { askChatbot } = await import('./chatbot');
    await askChatbot('ok', [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi there' },
      { role: 'user', content: 'ok' },
    ]);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
    expect(body.messages[2].role).toBe('assistant');
    expect(body.messages[3].role).toBe('user');
  });

  it('throws when the Groq API returns an error', async () => {
    import.meta.env.VITE_GROQ_API_KEY = 'gsk_testkey';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
    }));

    const { askChatbot } = await import('./chatbot');
    await expect(askChatbot('hello', [{ role: 'user', content: 'hello' }])).rejects.toThrow('Invalid API key');
  });

  it('prefers Groq over the custom URL when both are set', async () => {
    import.meta.env.VITE_GROQ_API_KEY = 'gsk_testkey';
    import.meta.env.VITE_CHATBOT_API_URL = 'https://example.com/chat';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'groq!' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { askChatbot } = await import('./chatbot');
    await askChatbot('hi', [{ role: 'user', content: 'hi' }]);

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/chat/completions');
  });
});
