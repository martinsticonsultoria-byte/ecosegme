import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Companies() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ razao_social: '', endereco: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/companies').then(res => setCompanies(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.razao_social.trim()) { setError('Razão social obrigatória'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/companies', form);
      setForm({ razao_social: '', endereco: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Empresas</h1>
          <p className="page-subtitle">{companies.length} empresa{companies.length !== 1 ? 's' : ''} cadastrada{companies.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setError(''); }}>
          {showForm ? '✕ Cancelar' : '+ Nova Empresa'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title">Nova Empresa</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Razão Social <span>*</span></label>
              <input className="form-input" value={form.razao_social}
                onChange={e => setForm({ ...form, razao_social: e.target.value })}
                placeholder="Nome da empresa" />
            </div>
            <div className="form-group">
              <label className="form-label">Endereço</label>
              <input className="form-input" value={form.endereco}
                onChange={e => setForm({ ...form, endereco: e.target.value })}
                placeholder="Rua, número - Cidade/UF" />
            </div>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Empresa'}
          </button>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8a93a8' }}>Carregando...</div>
        ) : companies.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8a93a8' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
            <p>Nenhuma empresa cadastrada ainda.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Razão Social</th>
                <th>Endereço</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id}>
                  <td><span className="badge badge-blue">{c.id}</span></td>
                  <td style={{ fontWeight: 600 }}>{c.razao_social}</td>
                  <td style={{ color: '#5a6478' }}>{c.endereco || '—'}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/employees?company_id=${c.id}&company_name=${encodeURIComponent(c.razao_social)}`)}>
                      👥 Funcionários
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
