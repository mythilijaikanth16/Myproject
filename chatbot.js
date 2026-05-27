import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../studentApi';

const QUICK_PROMPTS = [
  { label: '📊 How many students?',  text: 'How many students are registered?' },
  { label: '⬆️ Ascending A→Z',        text: 'Show students in ascending order' },
  { label: '⬇️ Descending Z→A',        text: 'Show students in descending order' },
  { label: '🎫 Find Roll',            text: 'Show roll number 01' },
  { label: '🏫 Class',               text: 'Show class CS' },
  { label: '📚 Class-wise',          text: 'Sort by class wise' },
  { label: '➕ Register?',           text: 'How do I register a new student?' },
  { label: '🔍 Search?',             text: 'How do I search for a student?' },
  { label: '✏️ Edit?',               text: 'How do I edit a student record?' },
  { label: '🗑️ Delete?',             text: 'How do I delete a student?' },
];

function renderText(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1
      ? <strong key={i}>{p}</strong>
      : p.split('\n').map((line, j, arr) =>
          j < arr.length - 1
            ? <span key={j}>{line}<br /></span>
            : <span key={j}>{line}</span>
        )
  );
}

export default function Chatbot({ token }) {
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState([{
    from:       'bot',
    basic:      "👋 Hi! I'm **Regs**, your Student Registry assistant.\nAsk me anything or use the quick buttons below!",
    ai:         null,
    id:         0,
  }]);
  const [input,        setInput]        = useState('');
  const [loadingBasic, setLoadingBasic] = useState(false);
  const [loadingAI,    setLoadingAI]    = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  async function send(text) {
    const trimmed = (text || input).trim();
    if (!trimmed || loadingBasic || loadingAI) return;
    setInput('');

    // add user message
    const userMsg = { from: 'user', text: trimmed, id: Date.now() };
    setMsgs(prev => [...prev, userMsg]);

    // add a placeholder for bot replies
    const botId = Date.now() + 1;
    setMsgs(prev => [...prev, { from: 'bot', basic: null, ai: null, id: botId }]);

    setLoadingBasic(true);
    setLoadingAI(true);

    // ── Call both endpoints simultaneously ────────────────────────────────────
    const basicCall = apiFetch('/chat', {
      method: 'POST',
      body:   JSON.stringify({ message: trimmed }),
    }, token)
      .then(data => {
        setMsgs(prev => prev.map(m =>
          m.id === botId ? { ...m, basic: data.reply } : m
        ));
      })
      .catch(err => {
        setMsgs(prev => prev.map(m =>
          m.id === botId ? { ...m, basic: `⚠️ ${err.message}` } : m
        ));
      })
      .finally(() => setLoadingBasic(false));

    const aiCall = apiFetch('/chatnew', {
      method: 'POST',
      body:   JSON.stringify({ message: trimmed }),
    }, token)
      .then(data => {
        setMsgs(prev => prev.map(m =>
          m.id === botId ? { ...m, ai: data.reply } : m
        ));
      })
      .catch(err => {
        setMsgs(prev => prev.map(m =>
          m.id === botId ? { ...m, ai: `⚠️ ${err.message}` } : m
        ));
      })
      .finally(() => setLoadingAI(false));

    await Promise.all([basicCall, aiCall]);
  }

  return (
    <>
      <button onClick={() => setOpen(o => !o)} className="chatbot-fab" aria-label="Toggle chat">
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div className="chatbot-window" style={{ width: '680px' }}>
          {/* Header */}
          <div className="chatbot-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🤖 Regs Assistant</span>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', opacity: 0.85 }}>
              <span>🤖 Basic AI</span>
              <span>🧠 AI </span>
            </div>
          </div>

          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            background: '#f3f4f6', borderBottom: '1px solid #e5e7eb',
            padding: '0.4rem 1rem', gap: '1rem'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4f46e5' }}>🤖 Basic Reply</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7c3aed' }}>🧠 AI Reply</span>
          </div>

          {/* Messages */}
          <div className="chatbot-messages" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {msgs.map(m => (
              <div key={m.id}>
                {m.from === 'user' ? (
                  // User message — full width
                  <div className="chatbot-msg chatbot-msg--user">
                    <div className="chatbot-bubble">{m.text}</div>
                  </div>
                ) : (
                  // Bot message — split into two columns
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {/* Basic reply */}
                    <div className="chatbot-msg chatbot-msg--bot">
                      <div className="chatbot-bubble" style={{ background: '#ede9fe', color: '#111', borderLeft: '3px solid #4f46e5' }}>
                        {m.basic === null
                          ? <span style={{ color: '#888', fontSize: '0.8rem' }}>🤖 Thinking…</span>
                          : renderText(m.basic)
                        }
                      </div>
                    </div>
                    {/* AI reply */}
                    <div className="chatbot-msg chatbot-msg--bot">
                      <div className="chatbot-bubble" style={{ background: '#f3e8ff', color: '#111', borderLeft: '3px solid #7c3aed' }}>
                        {m.ai === null
                          ? <span style={{ color: '#888', fontSize: '0.8rem' }}>🧠 Thinking…</span>
                          : renderText(m.ai)
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick chips */}
          <div className="chatbot-chips">
            {QUICK_PROMPTS.map(q => (
              <button key={q.text} className="chatbot-chip" onClick={() => send(q.text)}>
                {q.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="chatbot-input-row">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask Regs anything…"
              className="chatbot-input"
            />
            <button onClick={() => send()} className="chatbot-send" aria-label="Send">➤</button>
          </div>
        </div>
      )}
    </>
  );
}
