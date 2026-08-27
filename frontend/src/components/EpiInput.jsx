import { useState, useRef } from 'react';
import api from '../api/axios';

/** Campo de texto com autocomplete de EPIs, onde cada sugestão pode ser
 * excluída da base clicando no "x" — não dá pra fazer isso com <datalist>
 * nativo (não é estilizável/interativo), por isso um dropdown próprio. */
export default function EpiInput({ value, onChange, options, setOptions, placeholder, id, className = 'form-input', inputStyle }) {
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef(null);

  const filtered = (value || '').trim()
    ? options.filter(o => o.name.toLowerCase().includes(value.toLowerCase()))
    : options;

  const handleSelect = (name) => {
    onChange(name);
    setOpen(false);
  };

  const handleDelete = async (e, epi) => {
    e.stopPropagation();
    if (!window.confirm(`Excluir "${epi.name}" da lista de EPIs?`)) return;
    try {
      await api.delete(`/epis/${epi.id}`);
      setOptions(prev => prev.filter(o => o.id !== epi.id));
    } catch {
      alert('Erro ao excluir EPI.');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        className={className}
        style={inputStyle}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={e => onChange(e.target.value)}
        onFocus={() => { if (blurTimeout.current) clearTimeout(blurTimeout.current); setOpen(true); }}
        onBlur={() => { blurTimeout.current = setTimeout(() => setOpen(false), 150); }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4,
          maxHeight: 260, overflowY: 'auto',
        }}>
          {filtered.map(o => (
            <div key={o.id}
              onClick={() => handleSelect(o.name)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 12px', cursor: 'pointer', fontSize: 14, color: '#0f172a',
                borderBottom: '1px solid #f1f5f9',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              <span>{o.name}</span>
              <span
                onClick={e => handleDelete(e, o)}
                title="Excluir da lista"
                style={{
                  color: '#ef4444', fontWeight: 700, fontSize: 15, lineHeight: 1,
                  padding: '2px 8px', borderRadius: 999, marginLeft: 8, flexShrink: 0,
                }}
              >
                ×
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
