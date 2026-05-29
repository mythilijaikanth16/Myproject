import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../studentApi';

const QUICK_PROMPTS = [
  { label: '📊 How many students?', text: 'How many students are registered?' },
  { label: '⬆️ Ascending A→Z',      text: 'Show students in ascending order' },
  { label: '⬇️ Descending Z→A',      text: 'Show students in descending order' },
  { label: '🎫 Find Roll',          text: 'Show roll number 01' },
  { label: '🏫 Class',             text: 'Show class CS' },
  { label: '📚 Class-wise',        text: 'Sort by class wise' },
  { label: '📁 Files',             text: 'Files uploaded' },
  { label: '➕ Register?',         text: 'How do I register a new student?' },
  { label: '🔍 Search?',           text: 'How do I search for a student?' },
  { label: '✏️ Edit?',             text: 'How do I edit a student record?' },
  { label: '🗑️ Delete?',           text: 'How do I delete a student?' },
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
  const [open,    setOpen]   = useState(false);
  const [msgs,    setMsgs]   = useState([{
    from: 'bot',
    text: "Hi! I'm Regs, your Student Registry assistant.\nAsk me anything or use the quick buttons below!",
    id:   0,
  }]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  async function send(text) {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;
    setInput('');

    // add user message
    const userMsg = { from: 'user', text: trimmed, id: Date.now() };
    setMsgs(prev => [...prev, userMsg]);

    // add placeholder
    const botId = Date.now() + 1;
    setMsgs(prev => [...prev, { from: 'bot', text: null, id: botId }]);

    setLoading(true);

    apiFetch('/chatnew', {
      method: 'POST',
      body:   JSON.stringify({ message: trimmed }),
    }, token)
      .then(data => {
        setMsgs(prev => prev.map(m =>
          m.id === botId ? { ...m, text: data.reply } : m
        ));
      })
      .catch(err => {
        setMsgs(prev => prev.map(m =>
          m.id === botId ? { ...m, text: `Error: ${err.message}` } : m
        ));
      })
      .finally(() => setLoading(false));
  }

  return (
    <>
      <button onClick={() => setOpen(o => !o)} className="chatbot-fab" aria-label="Toggle chat">
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <span>🤖 Regs Assistant</span>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {msgs.map(m => (
              <div key={m.id}>
                {m.from === 'user' ? (
                  <div className="chatbot-msg chatbot-msg--user">
                    <div className="chatbot-bubble">{m.text}</div>
                  </div>
                ) : (
                  <div className="chatbot-msg chatbot-msg--bot">
                    <div className="chatbot-bubble" style={{ background: '#f3e8ff', color: '#111', borderLeft: '3px solid #7c3aed' }}>
                      {m.text === null
                        ? <span style={{ color: '#888', fontSize: '0.8rem' }}>Thinking...</span>
                        : renderText(m.text)
                      }
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
              placeholder="Ask Regs anything..."
              className="chatbot-input"
            />
            <button onClick={() => send()} className="chatbot-send" aria-label="Send">➤</button>
          </div>
        </div>
      )}
    </>
  );
}
