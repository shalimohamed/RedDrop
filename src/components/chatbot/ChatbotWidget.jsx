import { useRef, useState, useEffect } from 'react';
import { askChatbot } from '../../services/chatbot';

const GREETING = {
  role: 'assistant',
  text: "Hi, I'm the RedDrop assistant. Ask me about donation eligibility, how appeals work, or where to find a facility.",
};

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    const nextMessages = [...messages, { role: 'user', text }];
    setMessages(nextMessages);
    setDraft('');
    setSending(true);

    try {
      const reply = await askChatbot(
        text,
        nextMessages.map((m) => ({ role: m.role, content: m.text })),
      );
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', text: error.message }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-xl">
          <div className="flex items-center justify-between bg-blood-900 px-4 py-3">
            <p className="font-display text-sm font-semibold text-white">RedDrop Assistant</p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((message, index) => (
              <p
                key={index}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'ml-auto bg-blood-700 text-white'
                    : 'bg-blood-50 text-ink'
                }`}
              >
                {message.text}
              </p>
            ))}
            {sending && <p className="text-xs text-ink-soft">Thinking…</p>}
          </div>

          <form onSubmit={handleSend} className="flex gap-2 border-t border-line p-3">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about donating…"
              className="flex-1 rounded-full border border-line px-3 py-2 text-sm focus:border-blood-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending}
              className="rounded-full bg-blood-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-blood-700 text-2xl text-white shadow-lg hover:bg-blood-800"
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}
