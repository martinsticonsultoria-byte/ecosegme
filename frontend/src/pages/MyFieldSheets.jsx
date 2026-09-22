import { useEffect, useState } from 'react';
import api from '../api/axios';
import MyFieldSheetEditModal from '../components/MyFieldSheetEditModal';

export default function MyFieldSheets() {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/field-sheets?mine=true'),
      api.get('/chemical-field-sheets?mine=true'),
    ]).then(([ruido, quimico]) => {
      const ruidoItems = ruido.data
        .filter(s => s.status !== 'aprovada')
        .map(s => ({ ...s, _tipo: 'Ruído' }));
      const quimicoItems = quimico.data
        .filter(s => s.status !== 'aprovado')
        .map(s => ({ ...s, _tipo: 'Químico' }));
      const all = [...ruidoItems, ...quimicoItems].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setSheets(all);
    }).catch(() => {
      setError('Erro ao carregar suas fichas.');
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Minhas Fichas</h1>
          <p className="page-subtitle">Fichas de campo que você criou e ainda não foram aprovadas</p>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>Carregando...</div>}
      {!loading && error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && sheets.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
          Você não tem fichas pendentes de edição.
        </div>
      )}

      {!loading && !error && sheets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sheets.map(s => (
            <div key={`${s._tipo}-${s.id}`} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`badge ${s._tipo === 'Químico' ? 'badge-blue' : 'badge-green'}`}>{s._tipo}</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{s.company_nome || '—'}</span>
                </div>
                <div style={{ fontSize: 13, color: '#475569' }}>{s.employee_nome || '—'}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Coleta: {s.collection_date ? new Date(s.collection_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', background: '#fef3c7', borderRadius: 10, padding: '3px 10px' }}>
                  Pendente
                </span>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(s)}>Editar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <MyFieldSheetEditModal
          sheet={editing}
          tipo={editing._tipo}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
