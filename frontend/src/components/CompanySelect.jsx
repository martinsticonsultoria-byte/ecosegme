import { useEffect, useMemo, useRef, useState } from 'react';

export function SearchIcon({ size = 18, color = '#94a3b8' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

const normalize = (s) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Substitui o <select> de empresas por um seletor com busca (lupa). No celular
// abre em tela cheia. Mantém a mesma interface do <select>: onChange recebe
// um objeto no formato { target: { name, value } } (value sempre string).
export default function CompanySelect({
  companies, value, onChange, name = 'company_id',
  placeholder = 'Selecione...', allowClear = false, disabled = false, style,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const selected = useMemo(
    () => companies.find(c => String(c.id) === String(value)),
    [companies, value]
  );

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return companies;
    const qDigits = q.replace(/\D/g, '');
    return companies.filter(c =>
      normalize(c.razao_social).includes(q) ||
      (qDigits && (c.cnpj || '').replace(/\D/g, '').includes(qDigits))
    );
  }, [companies, query]);

  const close = () => { setOpen(false); setQuery(''); };

  const pick = (id) => {
    onChange({ target: { name, value: String(id) } });
    close();
  };

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="form-input"
        disabled={disabled}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer',
          color: selected ? undefined : 'var(--text-3, #94a3b8)', ...style,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.razao_social : placeholder}
        </span>
        <SearchIcon size={18} color="#64748b" />
      </button>

      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1100,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          }}
        >
          <div
            role="dialog"
            aria-label="Buscar empresa"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', width: '100%', maxWidth: 520, height: '100dvh', maxHeight: '100dvh',
              display: 'flex', flexDirection: 'column',
              ...(window.innerWidth >= 640 ? { height: 'auto', maxHeight: '80vh', marginTop: '8vh', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.25)' } : {}),
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                  <SearchIcon />
                </span>
                <input
                  ref={inputRef}
                  className="form-input"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar empresa..."
                  autoComplete="off"
                  style={{ paddingLeft: 38, paddingRight: query ? 36 : undefined, fontSize: 16 }}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Limpar busca"
                    onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                    style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 20, lineHeight: 1, color: '#94a3b8', cursor: 'pointer', padding: '4px 8px' }}
                  >×</button>
                )}
              </div>
              <button
                type="button"
                onClick={close}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '8px 4px' }}
              >Cancelar</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
              {allowClear && selected && (
                <div
                  onClick={() => pick('')}
                  style={{ padding: '14px 16px', fontSize: 15, color: '#64748b', borderBottom: '1px solid var(--border-light, #f1f5f9)', cursor: 'pointer' }}
                >Limpar seleção</div>
              )}
              {filtered.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                  Nenhuma empresa encontrada.
                </div>
              ) : filtered.map(c => {
                const active = String(c.id) === String(value);
                return (
                  <div
                    key={c.id}
                    onClick={() => pick(c.id)}
                    style={{
                      padding: '14px 16px', fontSize: 15, cursor: 'pointer',
                      borderBottom: '1px solid var(--border-light, #f1f5f9)',
                      background: active ? 'var(--green-light, #f0fdf4)' : 'white',
                      color: active ? 'var(--green-dark, #15803d)' : '#0f172a',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {c.razao_social}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
