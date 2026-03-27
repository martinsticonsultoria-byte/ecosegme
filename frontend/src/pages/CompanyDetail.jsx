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
  const [consolidated, setConsolidated] = useState([]);
  const [genTipo, setGenTipo] = useState('Ruído');
  const [genFormat, setGenFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);
  const [aba, setAba] = useState('funcionarios');
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
      api.get(`/reports/consolidated/${id}`),
    ]).then(([companiesRes, employeesRes, reportsRes, sheetsRes, consolidatedRes]) => {
      const found = companiesRes.data.find(c => c.id === parseInt(id));
      setCompany(found || null);
      setEmployees(employeesRes.data);
      setReports(reportsRes.data);
      setFieldSheets(sheetsRes.data);
      setConsolidated(consolidatedRes.data);
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

  const handleGenerateConsolidated = async () => {
    setGenerating(true);
    try {
      const url = `/reports/generate-bulk${genFormat === 'pdf' ? '-pdf' : ''}?company_id=${id}&tipo_analise=${encodeURIComponent(genTipo)}`;
      const ext = genFormat === 'pdf' ? 'pdf' : 'xlsx';
      const res = await api.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `relatorio_${genTipo}_${company?.razao_social?.slice(0,20)}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      const updated = await api.get(`/reports/consolidated/${id}`);
      setConsolidated(updated.data);
    } catch (err) {
      let msg = 'Erro ao gerar relatório.';
      if (err.response?.data instanceof Blob) {
        try { const t = await err.response.data.text(); msg = JSON.parse(t).detail || msg; } catch {}
      }
      alert(msg);
    } finally { setGenerating(false); }
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
      const urlRes = await api.get(`/reports/url/${report.id}`);
      const { url, local } = urlRes.data;
      if (local) {
        const res = await api.get(url, { responseType: 'blob' });
        const blobUrl = window.URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = blobUrl; a.download = report.filename; a.click();
        window.URL.revokeObjectURL(blobUrl);
      } else {
        window.open(url, '_blank');
      }
    } catch {
      setDownloadError('Erro ao baixar laudo.');
    }
  };

  if (loading) return <div className="page"><div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Carregando...</div></div>;
  if (!company) return <div className="page"><div className="alert alert-error">Empresa não encontrada.</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/companies')} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 4 }}>
            ← Voltar para Empresas
          </button>
          <h1 className="page-title">{company.razao_social}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleEditCompany}>Editar Empresa</button>
          <button className="btn btn-sm" onClick={handleDeleteCompany}
            style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
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

      {/* Abas */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', background: '#f8fafb' }}>
          {[
            { key: 'funcionarios', label: 'Funcionários', count: employees.length },
            { key: 'fichas',       label: 'Fichas de Campo', count: fieldSheets.length },
            { key: 'relatorios',   label: 'Relatórios', count: consolidated.length },
            { key: 'laudos',       label: 'Laudos', count: reports.length },
          ].map(t => (
            <button key={t.key} onClick={() => setAba(t.key)} style={{
              padding: '12px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: aba === t.key ? 'white' : 'transparent',
              color: aba === t.key ? '#16a34a' : '#8a93a8',
              borderBottom: aba === t.key ? '2px solid #1a7a3c' : '2px solid transparent',
              marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {t.label}
              <span style={{ background: aba === t.key ? '#dcfce7' : '#f1f5f9', color: aba === t.key ? '#166534' : '#8a93a8', borderRadius: 10, fontSize: 11, padding: '1px 7px', fontWeight: 700 }}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Funcionários */}
        {aba === 'funcionarios' && (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/employees?company_id=${id}&company_name=${encodeURIComponent(company.razao_social)}`)}>
                + Adicionar Funcionário
              </button>
            </div>
            {employees.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum funcionário cadastrado.</div>
            ) : (
              <table className="table">
                <thead><tr><th>Nome</th><th>Função</th><th>Matrícula</th><th>Setor</th><th>Local</th></tr></thead>
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
          </>
        )}

        {/* Fichas de Campo */}
        {aba === 'fichas' && (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/field-sheet/new?company_id=${id}`)}>
                + Nova Ficha de Campo
              </button>
            </div>
            {fieldSheets.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhuma ficha de campo registrada.</div>
            ) : (
              <table className="table">
                <thead><tr><th>#</th><th>Funcionário</th><th>Data da Coleta</th><th>Técnico</th><th>Dosímetro</th><th>Ações</th></tr></thead>
                <tbody>
                  {fieldSheets.map(s => (
                    <tr key={s.id}>
                      <td><span className="badge badge-blue">{s.laudo_number}</span></td>
                      <td style={{ fontWeight: 500 }}>{s.employee_nome || '—'}</td>
                      <td style={{ color: '#64748b' }}>{new Date(s.collection_date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td style={{ color: '#64748b' }}>{s.technician_name}</td>
                      <td style={{ color: '#64748b' }}>{s.dosimeter_number}</td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => handleDownloadFicha(s)} disabled={downloadingFicha === s.id}>
                          {downloadingFicha === s.id ? '...' : 'Ficha PDF'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Relatórios Consolidados */}
        {aba === 'relatorios' && (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8, alignItems: 'center' }}>
              <select className="form-input" style={{ padding: '6px 10px', fontSize: 13 }} value={genTipo} onChange={e => setGenTipo(e.target.value)}>
                <option>Ruído</option>
                <option>Temperatura</option>
                <option>Iluminância</option>
                <option>Químico</option>
                <option>Outro</option>
              </select>
              <select className="form-input" style={{ padding: '6px 10px', fontSize: 13 }} value={genFormat} onChange={e => setGenFormat(e.target.value)}>
                <option value="pdf">PDF</option>
                <option value="xlsx">Excel</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={handleGenerateConsolidated} disabled={generating}>
                {generating ? 'Gerando...' : '+ Gerar Relatório'}
              </button>
            </div>
            {consolidated.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum relatório consolidado gerado.</div>
            ) : (
              <table className="table">
                <thead><tr><th>Arquivo</th><th>Análise</th><th>Formato</th><th>Gerado em</th><th>Ação</th></tr></thead>
                <tbody>
                  {consolidated.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontSize: 13, fontWeight: 500 }}>{r.filename}</td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>{r.tipo_analise}</td>
                      <td><span style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: r.format === 'pdf' ? '#dc2626' : '#166534' }}>{r.format}</span></td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>{new Date(r.generated_at).toLocaleString('pt-BR')}</td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={async () => {
                          try {
                            const res = await api.get(`/reports/consolidated/download/${r.id}`, { responseType: 'blob' });
                            const url = window.URL.createObjectURL(res.data);
                            const a = document.createElement('a');
                            a.href = url; a.download = r.filename; a.click();
                            window.URL.revokeObjectURL(url);
                          } catch { alert('Erro ao baixar relatório.'); }
                        }}>Baixar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Laudos */}
        {aba === 'laudos' && (
          <>
            {downloadError && <div className="alert alert-error" style={{ margin: 16 }}>{downloadError}</div>}
            {reports.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum laudo gerado.</div>
            ) : (
              <table className="table">
                <thead><tr><th>#</th><th>Arquivo</th><th>Gerado em</th><th>SHA-256</th><th>Ação</th></tr></thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td><span className="badge badge-blue">{r.id}</span></td>
                      <td style={{ fontSize: 13, fontWeight: 500 }}>{r.filename}</td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>{new Date(r.generated_at).toLocaleString('pt-BR')}</td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{r.sha256.substring(0, 16)}...</span></td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => handleDownload(r)}>Baixar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
