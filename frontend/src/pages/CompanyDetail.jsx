import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [reports, setReports] = useState([]);
  const [fieldSheets, setFieldSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadError, setDownloadError] = useState('');
  const [downloadingFicha, setDownloadingFicha] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/companies'),
      api.get(`/employees?company_id=${id}`),
      api.get(`/reports/list/${id}`),
      api.get(`/field-sheets?company_id=${id}`),
    ]).then(([companiesRes, employeesRes, reportsRes, sheetsRes]) => {
      const found = companiesRes.data.find(c => c.id === parseInt(id));
      setCompany(found || null);
      setEmployees(employeesRes.data);
      setReports(reportsRes.data);
      setFieldSheets(sheetsRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleEditCompany = () => {
    setEditForm({ razao_social: company.razao_social, cnpj: company.cnpj || '', endereco: company.endereco || '' });
    setEditing(true);
  };

  const handleSaveCompany = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/companies/${id}`, editForm);
      setCompany(res.data);
      setEditing(false);
    } catch (err) {
      setDownloadError(err.response?.data?.detail || 'Erro ao salvar empresa.');
    } finally { setSaving(false); }
  };

  const handleDeleteCompany = async () => {
    if (!window.confirm(`Deletar a empresa "${company.razao_social}" e todos os seus dados?`)) return;
    try {
      await api.delete(`/companies/${id}`);
      navigate('/companies');
    } catch {
      setDownloadError('Erro ao deletar empresa.');
    }
  };

  const handleDownloadFicha = async (sheet) => {
    setDownloadingFicha(sheet.id);
    try {
      const res = await api.get(`/field-sheets/${sheet.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha_${String(sheet.laudo_number).padStart(4, '0')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Erro ao baixar ficha PDF.');
    } finally { setDownloadingFicha(null); }
  };

  const handleDownload = async (report) => {
    setDownloadError('');
    try {
      const res = await api.get(report.download_url, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = report.filename; a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Erro ao baixar laudo.');
    }
  };

  if (loading) return <div className="page"><div style={{ textAlign: 'center', padding: 60, color: '#8a93a8' }}>Carregando...</div></div>;
  if (!company) return <div className="page"><div className="alert alert-error">Empresa não encontrada.</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/companies')} style={{ background: 'none', border: 'none', color: '#1f9c74', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 4 }}>
            ← Voltar para Empresas
          </button>
          <h1 className="page-title">{company.razao_social}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleEditCompany}>Editar Empresa</button>
          <button className="btn btn-sm" onClick={handleDeleteCompany}
            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Deletar
          </button>
        </div>
      </div>

      {editing && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title">Editar Empresa</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Razão Social <span>*</span></label>
              <input className="form-input" value={editForm.razao_social} onChange={e => setEditForm({ ...editForm, razao_social: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">CNPJ</label>
              <input className="form-input" value={editForm.cnpj}
                onChange={e => {
                  const d = e.target.value.replace(/\D/g, '').slice(0, 14);
                  const masked = d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
                  setEditForm({ ...editForm, cnpj: masked });
                }}
                placeholder="00.000.000/0000-00" maxLength={18} />
            </div>
            <div className="form-group">
              <label className="form-label">Endereço</label>
              <input className="form-input" value={editForm.endereco} onChange={e => setEditForm({ ...editForm, endereco: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleSaveCompany} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Ações Rápidas */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-primary" onClick={() => navigate(`/employees?company_id=${id}&company_name=${encodeURIComponent(company.razao_social)}`)}>
          + Funcionários
        </button>
        <button className="btn btn-primary" onClick={() => navigate(`/field-sheet/new?company_id=${id}`)}>
          + Ficha de Campo
        </button>
      </div>

      {/* Dados Gerais */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-title">Dados Gerais</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, padding: '8px 0' }}>
          <div>
            <div style={{ fontSize: 11, color: '#8a93a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Razão Social</div>
            <div style={{ fontWeight: 600 }}>{company.razao_social}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#8a93a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>CNPJ</div>
            <div style={{ fontWeight: 600 }}>{company.cnpj || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#8a93a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Funcionários</div>
            <div style={{ fontWeight: 600 }}>{employees.length}</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, color: '#8a93a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Endereço</div>
            <div>{company.endereco || '—'}</div>
          </div>
        </div>
      </div>

      {/* Funcionários */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Funcionários</div>
          <span className="badge badge-blue">{employees.length}</span>
        </div>
        {employees.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#8a93a8' }}>Nenhum funcionário cadastrado.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Função</th>
                <th>Matrícula</th>
                <th>Setor</th>
                <th>Local</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 500 }}>{e.nome}</td>
                  <td>{e.funcao || '—'}</td>
                  <td>{e.matricula || '—'}</td>
                  <td>{e.setor || '—'}</td>
                  <td>{e.local || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Fichas de Campo */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Fichas de Campo</div>
          <span className="badge badge-blue">{fieldSheets.length}</span>
        </div>
        {fieldSheets.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#8a93a8' }}>Nenhuma ficha de campo registrada.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Funcionário</th>
                <th>Data da Coleta</th>
                <th>Técnico</th>
                <th>Dosímetro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {fieldSheets.map(s => (
                <tr key={s.id}>
                  <td><span className="badge badge-blue">{s.laudo_number}</span></td>
                  <td style={{ fontWeight: 500 }}>{s.employee_nome || '—'}</td>
                  <td style={{ color: '#5a6478' }}>{new Date(s.collection_date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td style={{ color: '#5a6478' }}>{s.technician_name}</td>
                  <td style={{ color: '#5a6478' }}>{s.dosimeter_number}</td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => handleDownloadFicha(s)} disabled={downloadingFicha === s.id}>
                      {downloadingFicha === s.id ? '...' : '⬇ Ficha PDF'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Laudos */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Laudos Gerados</div>
          <span className="badge badge-green">{reports.length}</span>
        </div>
        {downloadError && <div className="alert alert-error" style={{ margin: 16 }}>{downloadError}</div>}
        {reports.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#8a93a8' }}>Nenhum laudo gerado.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Arquivo</th>
                <th>Gerado em</th>
                <th>SHA-256</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id}>
                  <td><span className="badge badge-blue">{r.id}</span></td>
                  <td style={{ fontSize: 13, fontWeight: 500 }}>{r.filename}</td>
                  <td style={{ color: '#5a6478', fontSize: 13 }}>{new Date(r.generated_at).toLocaleString('pt-BR')}</td>
                  <td>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#8a93a8' }}>
                      {r.sha256.substring(0, 16)}...
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => handleDownload(r)}>
                      ⬇ Baixar
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
