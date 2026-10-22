import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const REFRESH_MS = 10 * 60 * 1000;

const COLORS = {
  atencao: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
  critico: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
};

const dismissKey = (level) => `capacity-dismissed-${level}`;

// Transforma URLs do texto em links clicáveis (os passos vêm prontos da API).
function withLinks(text, color) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer"
           style={{ color, fontWeight: 600, wordBreak: 'break-all' }}>{part}</a>
      : part
  );
}

// Aviso de capacidade do servidor — só para admin, só quando há algo a avisar.
// O texto e os passos vêm da API (backend/app/core/capacity.py), então podem ser
// corrigidos sem mexer aqui.
export default function CapacityBanner() {
  const { user } = useAuth();
  const [usage, setUsage] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const isAdmin = user?.role === 'admin_staff';

  useEffect(() => {
    if (!isAdmin) return undefined;
    let alive = true;
    const load = () => {
      api.get('/system/usage')
        .then((r) => {
          if (!alive) return;
          setUsage(r.data);
          let was = false;
          try { was = sessionStorage.getItem(dismissKey(r.data.level)) === '1'; } catch { /* sem storage */ }
          setDismissed(was);
        })
        .catch(() => { /* aviso é opcional: nunca atrapalha o uso */ });
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, [isAdmin]);

  if (!isAdmin || !usage || usage.level === 'ok' || !usage.message || dismissed) return null;

  const c = COLORS[usage.level] || COLORS.atencao;
  const close = () => {
    setDismissed(true);
    try { sessionStorage.setItem(dismissKey(usage.level), '1'); } catch { /* sem storage */ }
  };

  return (
    <div role="alert" style={{
      background: c.bg, borderBottom: `1px solid ${c.border}`, color: c.text,
      padding: '12px 16px', fontSize: 13, display: 'flex', gap: 12,
      alignItems: 'flex-start', justifyContent: 'space-between',
    }}>
      <div style={{ lineHeight: 1.5, minWidth: 0 }}>
        <strong>{usage.title}.</strong> {usage.message}
        {usage.detail && <div style={{ marginTop: 4, fontStyle: 'italic' }}>{usage.detail}</div>}
        <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          {usage.steps.map((step, i) => (
            <li key={i} style={{ marginBottom: 3 }}>{withLinks(step, c.text)}</li>
          ))}
        </ol>
        <div style={{ opacity: 0.8, marginTop: 8, fontSize: 12 }}>
          {usage.memory_peak_mb != null && usage.memory_limit_mb != null &&
            `Pico de memória: ${usage.memory_peak_mb} de ${usage.memory_limit_mb} MB · `}
          Limite atual: {usage.max_pdf_sheets} fichas por relatório · Maior relatório recente: {usage.largest_batch_90d}
        </div>
      </div>
      <button onClick={close} aria-label="Dispensar aviso" style={{
        background: 'none', border: 'none', color: c.text, cursor: 'pointer',
        fontSize: 22, lineHeight: 1, padding: 4, flexShrink: 0,
      }}>×</button>
    </div>
  );
}
