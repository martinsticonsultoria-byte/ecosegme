import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Companies() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ razao_social: '', cnpj: '', endereco: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    api.get('/companies')
      .then(res => setCompanies(res.data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const formatCnpj = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const validateCnpj = (cnpj) => {
    const d = cnpj.replace(/\D/g, '');
    return d.length === 0 || d.length === 14;
  };

  const handleSubmit = async () => {
    if (!form.razao_social.trim()) { setError('Razão social obrigatória'); return; }
    if (!validateCnpj(form.cnpj)) { setError('CNPJ inválido — use o formato 00.000.000/0000-00'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/companies', form);
      setForm({ razao_social: '', cnpj: '', endereco: '' });
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
          {showForm ? 'Cancelar' : '+ Nova Empresa'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title">Nova Empresa</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Razão Social <span>*</span></label>
              <input className="form-input" value={form.razao_social}
                onChange={e => setForm({ ...form, razao_social: e.target.value })}
                placeholder="Nome da empresa" />
            </div>
            <div className="form-group">
              <label className="form-label">CNPJ</label>
              <input className="form-input" value={form.cnpj}
                onChange={e => setForm({ ...form, cnpj: formatCnpj(e.target.value) })}
                placeholder="00.000.000/0000-00" maxLength={18} />
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

      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <input
          className="form-input"
          placeholder="Buscar empresa..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Carregando...</div>
        ) : loadError ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: '#dc2626', marginBottom: 12 }}>Erro ao carregar empresas. O servidor pode estar iniciando.</p>
            <button className="btn btn-secondary" onClick={load}>Tentar novamente</button>
          </div>
        ) : companies.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <p style={{ color: '#6b7280' }}>Nenhuma empresa cadastrada ainda.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th>Razão Social</th>
                <th>CNPJ</th>
                <th>Endereço</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {companies.filter(c => c.razao_social.toLowerCase().includes(search.toLowerCase())).map((c, idx) => (
                <tr key={c.id}>
                  <td><span className="badge badge-blue">{idx + 1}</span></td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#16a34a', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => navigate(`/companies/${c.id}`)}>
                      {c.razao_social}
                    </span>
                  </td>
                  <td style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 13 }}>{c.cnpj || '—'}</td>
                  <td style={{ color: '#64748b' }}>{c.endereco || '—'}</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
