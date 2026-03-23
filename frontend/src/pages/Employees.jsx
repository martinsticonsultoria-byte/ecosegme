import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Employees() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const company_id = searchParams.get('company_id');
  const company_name = searchParams.get('company_name');

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const emptyForm = { nome: '', funcao: '', matricula: '', setor: '', local: '' };
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    api.get(`/employees?company_id=${company_id}`)
      .then(res => setEmployees(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (company_id) load(); }, [company_id]);

  const handleSubmit = async () => {
    if (!form.nome.trim()) { setError('Nome obrigatório'); return; }
    setSaving(true); setError('');
    try {
      if (editing) {
        await api.put(`/employees/${editing.id}`, { ...form, company_id: parseInt(company_id) });
      } else {
        await api.post('/employees', { ...form, company_id: parseInt(company_id) });
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const handleEdit = (e) => {
    setEditing(e);
    setForm({ nome: e.nome, funcao: e.funcao || '', matricula: e.matricula || '', setor: e.setor || '', local: e.local || '' });
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (e) => {
    if (!window.confirm(`Deletar funcionário "${e.nome}"?`)) return;
    setDeleting(e.id);
    try {
      await api.delete(`/employees/${e.id}`);
      load();
    } catch {
      setError('Erro ao deletar funcionário.');
    } finally { setDeleting(null); }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    setError('');
  };

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#1a7a3c', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 8 }}>
          ← Voltar
        </button>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="page-title">Funcionários</h1>
            <p className="page-subtitle">{company_name} · {employees.length} funcionário{employees.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyForm); setError(''); }}>
            {showForm && !editing ? '✕ Cancelar' : '+ Novo Funcionário'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title">{editing ? 'Editar Funcionário' : 'Novo Funcionário'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Nome <span>*</span></label>
              <input className="form-input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
            </div>
            <div className="form-group">
              <label className="form-label">Função</label>
              <input className="form-input" value={form.funcao} onChange={e => setForm({ ...form, funcao: e.target.value })} placeholder="Ex: Operador de Máquinas" />
            </div>
            <div className="form-group">
              <label className="form-label">Matrícula</label>
              <input className="form-input" value={form.matricula} onChange={e => setForm({ ...form, matricula: e.target.value })} placeholder="Ex: 001" />
            </div>
            <div className="form-group">
              <label className="form-label">Setor</label>
              <input className="form-input" value={form.setor} onChange={e => setForm({ ...form, setor: e.target.value })} placeholder="Ex: Produção" />
            </div>
            <div className="form-group">
              <label className="form-label">Local</label>
              <input className="form-input" value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} placeholder="Ex: Galpão A" />
            </div>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Salvar Funcionário'}
            </button>
            <button className="btn btn-secondary" onClick={handleCancel}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8a93a8' }}>Carregando...</div>
        ) : employees.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8a93a8' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
            <p>Nenhum funcionário cadastrado ainda.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Função</th>
                <th>Matrícula</th>
                <th>Setor</th>
                <th>Local</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 600 }}>{e.nome}</td>
                  <td style={{ color: '#5a6478' }}>{e.funcao || '—'}</td>
                  <td><span className="badge badge-blue">{e.matricula || '—'}</span></td>
                  <td style={{ color: '#5a6478' }}>{e.setor || '—'}</td>
                  <td style={{ color: '#5a6478' }}>{e.local || '—'}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(e)}>Editar</button>
                    <button className="btn btn-sm" onClick={() => handleDelete(e)} disabled={deleting === e.id}
                      style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                      {deleting === e.id ? '...' : 'Deletar'}
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
