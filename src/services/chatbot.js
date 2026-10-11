const SYSTEM_CONTEXT = `You are the RedDrop assistant, embedded on a blood donation platform.
Answer questions about donation eligibility, the donation process, how appeals and urgency
levels work, and how to navigate the site. Keep answers short, plain, and reassuring. If asked
something outside blood donation or the RedDrop platform, say so briefly and redirect.`;

const GROQ_MODEL = 'llama-3.3-70b-versatile';

export async function askChatbot(message, history = []) {
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  const endpoint = import.meta.env.VITE_CHATBOT_API_URL;

  if (groqKey) {
    return callGroq(message, history, groqKey);
  }

  if (endpoint) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, context: SYSTEM_CONTEXT }),
    });
    if (!response.ok) {
      throw new Error('The chatbot is unavailable right now. Please try again shortly.');
    }
    const data = await response.json();
    return data.reply ?? "Sorry, I didn't catch that — could you rephrase?";
  }

  return 'AI chatbot is not configured. Set VITE_GROQ_API_KEY to enable it.';
}

async function callGroq(message, history, apiKey) {
  const messages = [
    { role: 'system', content: SYSTEM_CONTEXT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: GROQ_MODEL, messages }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message ?? 'Groq unavailable');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "Sorry, I didn't catch that — could you rephrase?";
}
