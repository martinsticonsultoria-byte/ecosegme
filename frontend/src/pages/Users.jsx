import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'technician' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const load = () => api.get('/users').then(res => setUsers(res.data));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) { setError('Preencha todos os campos'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/users', form);
      setForm({ name: '', email: '', password: '', role: 'technician' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar usuário');
    } finally { setLoading(false); }
  };

  const handleToggle = async (id) => {
    await api.patch(`/users/${id}/toggle`);
    load();
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { setError('Mínimo 6 caracteres'); return; }
    try {
      await api.patch(`/users/${resetTarget}/password`, { password: newPassword });
      setResetTarget(null); setNewPassword(''); setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao redefinir senha');
    }
  };

  const roleLabel = (role) => role === 'admin_staff' ? 'Administrativo' : 'Técnico de Campo';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-subtitle">Gerencie os usuários do sistema</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setError(''); }}>
          {showForm ? 'Cancelar' : '+ Novo Usuário'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title">Novo Usuário</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Nome <span style={{ color: 'red' }}>*</span></label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail <span style={{ color: 'red' }}>*</span></label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Senha <span style={{ color: 'red' }}>*</span></label>
              <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="form-group">
              <label className="form-label">Perfil <span style={{ color: 'red' }}>*</span></label>
              <select className="form-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="technician">Técnico de Campo</option>
                <option value="admin_staff">Administrativo</option>
              </select>
            </div>
          </div>
          {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading} style={{ marginTop: 16 }}>
            {loading ? 'Salvando...' : 'Criar Usuário'}
          </button>
        </div>
      )}

      {resetTarget && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid #f59e0b' }}>
          <div className="section-title">Redefinir Senha</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
              <label className="form-label">Nova Senha</label>
              <input className="form-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <button className="btn btn-primary" onClick={handleResetPassword}>Salvar</button>
            <button className="btn btn-secondary" onClick={() => { setResetTarget(null); setNewPassword(''); setError(''); }}>Cancelar</button>
          </div>
          {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.name}</td>
                <td style={{ color: '#5a6478', fontSize: 13 }}>{u.email}</td>
                <td><span className={`badge ${u.role === 'admin_staff' ? 'badge-blue' : 'badge-green'}`}>{roleLabel(u.role)}</span></td>
                <td>
                  <span className={`badge ${u.active ? 'badge-green' : ''}`} style={!u.active ? { background: '#fee2e2', color: '#dc2626' } : {}}>
                    {u.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setResetTarget(u.id); setError(''); }}>
                    Senha
                  </button>
                  {u.id !== me?.id && (
                    <button className="btn btn-sm" onClick={() => handleToggle(u.id)}
                      style={{ background: u.active ? '#fee2e2' : '#dcfce7', color: u.active ? '#dc2626' : '#16a34a', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}>
                      {u.active ? 'Desativar' : 'Ativar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
