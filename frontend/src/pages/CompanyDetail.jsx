import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export function DeleteFieldSheetButton({ fieldSheetId, onDeleted }) {
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/field-sheets/${fieldSheetId}`);
      setShowModal(false);
      onDeleted();
    } catch {
      alert('Erro ao excluir ficha.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        className="btn btn-sm"
        style={{ background: '#FADADD', color: '#8B0000', border: '1px solid #f5a0a0', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'normal', textAlign: 'center', lineHeight: '1.2', maxWidth: 72 }}
        onClick={() => setShowModal(true)}
      >
        <span>Excluir<br/>Ficha de<br/>Campo</span>
      </button>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#F2F2F2', borderRadius: 8, padding: 24, maxWidth: 400, width: '90%' }}>
            <p style={{ color: '#8B0000', fontWeight: 600, marginBottom: 16 }}>
              Tem certeza que deseja excluir definitivamente este arquivo?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{ background: '#8B0000', color: 'white', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? '...' : 'Excluir'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [reports, setReports] = useState([]);
  const [fieldSheets, setFieldSheets] = useState([]);
  const [consolidated, setConsolidated] = useState([]);
  const [filtroDataDe, setFiltroDataDe] = useState('');
  const [filtroDataAte, setFiltroDataAte] = useState('');
  const [filtroNumLaudo, setFiltroNumLaudo] = useState('');
  const [genTipo, setGenTipo] = useState('Ruído');
  const [genFormat, setGenFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);
  const [aba, setAba] = useState('funcionarios');
  const [loading, setLoading] = useState(true);
  const [downloadError, setDownloadError] = useState('');
  const [downloadingFicha, setDownloadingFicha] = useState(null);
  const [deletingReport, setDeletingReport] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showRelModal, setShowRelModal] = useState(false);
  const [relFichas, setRelFichas] = useState([]);
  const [relFichasSel, setRelFichasSel] = useState([]);
  const [relCarregando, setRelCarregando] = useState(false);
  const [relGerando, setRelGerando] = useState(false);
  const [editEmpModal, setEditEmpModal] = useState(false);
  const [editEmpForm, setEditEmpForm] = useState({});
  const [editEmpTarget, setEditEmpTarget] = useState(null);
  const [savingEmp, setSavingEmp] = useState(false);
  const [deleteEmpModal, setDeleteEmpModal] = useState(false);
  const [deleteEmpTarget, setDeleteEmpTarget] = useState(null);
  const [deletingEmp, setDeletingEmp] = useState(false);
  const [editSheetModal, setEditSheetModal] = useState(false);
  const [editSheetTarget, setEditSheetTarget] = useState(null);
  const [editSheetForm, setEditSheetForm] = useState({});
  const [savingSheet, setSavingSheet] = useState(false);
  const [epiOptionsSheet, setEpiOptionsSheet] = useState([]);

  useEffect(() => {
    const safe = (promise, fallback) => promise.then(r => r.data).catch(() => fallback);
    Promise.all([
      api.get(`/companies/${id}`).then(r => r.data).catch(() => null),
      safe(api.get(`/employees?company_id=${id}`), []),
      safe(api.get(`/reports/list/${id}`), []),
      safe(api.get(`/field-sheets?company_id=${id}`), []),
      safe(api.get(`/reports/consolidated/${id}`), []),
    ]).then(([company, employees, reports, sheets, consolidated]) => {
      setCompany(company);
      setEmployees(employees);
      setReports(reports);
      setFieldSheets(sheets);
      setConsolidated(consolidated);
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
    if (!window.confirm(`Tem certeza? Todas as fichas, laudos, funcionários e dados vinculados à empresa serão deletados permanentemente.`)) return;
    try {
      await api.delete(`/companies/${id}`);
      navigate('/companies');
    } catch (err) {
      if (err.response?.status === 409) {
        alert(err.response?.data?.detail || 'Não é possível excluir esta empresa pois ela possui fichas ou funcionários vinculados.')
      } else {
        alert('Erro ao deletar empresa. Tente novamente.')
      }
    }
  };

  const handleEditEmployee = (emp) => {
    setEditEmpTarget(emp);
    setEditEmpForm({ nome: emp.nome, funcao: emp.funcao || '', matricula: emp.matricula || '', setor: emp.setor || '', local: emp.local || '' });
    setEditEmpModal(true);
  };

  const handleSaveEmployee = async () => {
    setSavingEmp(true);
    try {
      const res = await api.put(`/employees/${editEmpTarget.id}`, { ...editEmpForm, company_id: Number(id) });
      setEmployees(prev => prev.map(e => e.id === editEmpTarget.id ? res.data : e));
      setEditEmpModal(false);
    } catch {
      alert('Erro ao salvar funcionário.');
    } finally { setSavingEmp(false); }
  };

  const handleDeleteEmployee = async () => {
    setDeletingEmp(true);
    try {
      await api.delete(`/employees/${deleteEmpTarget.id}`);
      setEmployees(prev => prev.filter(e => e.id !== deleteEmpTarget.id));
      setDeleteEmpModal(false);
    } catch {
      alert('Erro ao excluir funcionário.');
    } finally { setDeletingEmp(false); }
  };

  const handleEditSheet = (sheet) => {
    if (!epiOptionsSheet.length) {
      api.get('/epis').then(res => setEpiOptionsSheet([...res.data.predefined, ...res.data.custom])).catch(() => {});
    }
    setEditSheetTarget(sheet);
    setEditSheetForm({
      laudo_number: sheet.laudo_number || '',
      dosimeter_number: sheet.dosimeter_number || '',
      collection_date: sheet.collection_date || '',
      data_relatorio: sheet.data_relatorio || '',
      tipo_analise: sheet.tipo_analise || 'Ruído',
      epi: sheet.epi || '',
      activity: sheet.activity || '',
      machine_noise: sheet.machine_noise || '',
      pre_verificacao_db: sheet.pre_verificacao_db || '',
      pos_verificacao_db: sheet.pos_verificacao_db || '',
      technician_name: sheet.technician_name || '',
      technician_name_2: sheet.technician_name_2 || '',
      funcao: sheet.employee_funcao || '',
      matricula: sheet.employee_matricula || '',
      setor: sheet.employee_setor || '',
      local: sheet.employee_local || '',
      conclusao_texto: sheet.conclusao_texto || '',
    });
    setEditSheetModal(true);
  };

  const handleSaveSheet = async () => {
    setSavingSheet(true);
    try {
      await api.patch(`/field-sheets/${editSheetTarget.id}/edit`, editSheetForm);
      const res = await api.get(`/field-sheets?company_id=${id}`);
      setFieldSheets(res.data);
      setEditSheetModal(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao salvar ficha.');
    } finally { setSavingSheet(false); }
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

  const handleOpenRelModal = async () => {
    setShowRelModal(true);
    setRelFichasSel([]);
    setRelCarregando(true);
    try {
      const res = await api.get(`/field-sheets?company_id=${id}&tipo_analise=${encodeURIComponent(genTipo)}`);
      setRelFichas(res.data);
    } catch {
      alert('Erro ao carregar fichas.');
      setShowRelModal(false);
    } finally {
      setRelCarregando(false);
    }
  };

  const handleGerarPdfComSelecao = async () => {
    setRelGerando(true);
    try {
      const p = new URLSearchParams({ company_id: id, tipo_analise: genTipo });
      relFichasSel.forEach(fid => p.append('field_sheet_ids', fid));
      const res = await api.get(`/reports/generate-bulk-pdf?${p}`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `relatorio_${genTipo}_${company?.razao_social?.slice(0,20)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      setShowRelModal(false);
      setRelFichasSel([]);
      const updated = await api.get(`/reports/consolidated/${id}`);
      setConsolidated(updated.data);
    } catch (err) {
      let msg = 'Erro ao gerar relatório.';
      if (err.response?.data instanceof Blob) {
        try { const t = await err.response.data.text(); msg = JSON.parse(t).detail || msg; } catch {}
      }
      alert(msg);
    } finally {
      setRelGerando(false);
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

  const handleDeleteReport = async (report) => {
    if (!window.confirm(`Excluir o laudo "${report.filename}"? Você poderá gerá-lo novamente.`)) return;
    setDeletingReport(report.id);
    try {
      await api.delete(`/reports/${report.id}`);
      setReports(r => r.filter(x => x.id !== report.id));
    } catch {
      setDownloadError('Erro ao excluir laudo.');
    } finally { setDeletingReport(null); }
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
          <div className="grid-3">
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
                <thead><tr><th>Nome</th><th>Função</th><th>Matrícula</th><th>Setor</th><th>Local</th><th>Ações</th></tr></thead>
                <tbody>
                  {employees.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 500 }}>{e.nome}</td>
                      <td>{e.funcao || '—'}</td>
                      <td>{e.matricula || '—'}</td>
                      <td>{e.setor || '—'}</td>
                      <td>{e.local || '—'}</td>
                      <td style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleEditEmployee(e)}>Editar</button>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#FADADD', color: '#8B0000', border: '1px solid #f5a0a0', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          onClick={() => { setDeleteEmpTarget(e); setDeleteEmpModal(true); }}
                        >Excluir</button>
                      </td>
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
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/field-sheet/new?company_id=${id}`)}>
                + Nova Ficha de Ruído
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/chemical-field-sheet/new?company_id=${id}`)}>
                + Nova Ficha Química
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
                      <td>{s.laudo_number ? <span className="badge badge-blue">{s.laudo_number}.{s.laudo_y || 1}/{new Date().getFullYear()}</span> : <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600 }}>S/ Nº</span>}</td>
                      <td style={{ fontWeight: 500 }}>{s.employee_nome || '—'}</td>
                      <td style={{ color: '#64748b' }}>{new Date(s.collection_date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td style={{ color: '#64748b' }}>{s.technician_name}</td>
                      <td style={{ color: '#64748b' }}>{s.dosimeter_number}</td>
                      <td style={{ display: 'flex', gap: 4 }}>
                        {s.status !== 'aprovada' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleEditSheet(s)}>Editar</button>
                        )}
                        <button className="btn btn-primary btn-sm" onClick={() => handleDownloadFicha(s)} disabled={downloadingFicha === s.id}>
                          {downloadingFicha === s.id ? '...' : 'Ficha PDF'}
                        </button>
                        <DeleteFieldSheetButton
                          fieldSheetId={s.id}
                          onDeleted={() => setFieldSheets(prev => prev.filter(f => f.id !== s.id))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Relatórios Consolidados */}
        {aba === 'relatorios' && (() => {
          const consolidadoFiltrado = consolidated.filter(r => {
            if (filtroDataDe && new Date(r.generated_at) < new Date(filtroDataDe + 'T00:00:00')) return false;
            if (filtroDataAte && new Date(r.generated_at) > new Date(filtroDataAte + 'T23:59:59')) return false;
            if (filtroNumLaudo && !r.filename.toLowerCase().includes(filtroNumLaudo.toLowerCase())) return false;
            return true;
          });
          return (
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
              <button className="btn btn-primary btn-sm"
                onClick={genFormat === 'pdf' ? handleOpenRelModal : handleGenerateConsolidated}
                disabled={generating}>
                {generating ? 'Gerando...' : '+ Gerar Relatório'}
              </button>
            </div>
            {consolidated.length > 0 && (
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: '#fafafa' }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Filtrar:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <label style={{ fontSize: 12, color: '#64748b' }}>De:</label>
                  <input type="date" className="form-input" style={{ padding: '4px 8px', fontSize: 12, width: 140 }} value={filtroDataDe} onChange={e => setFiltroDataDe(e.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <label style={{ fontSize: 12, color: '#64748b' }}>Até:</label>
                  <input type="date" className="form-input" style={{ padding: '4px 8px', fontSize: 12, width: 140 }} value={filtroDataAte} onChange={e => setFiltroDataAte(e.target.value)} />
                </div>
                <input type="text" className="form-input" style={{ padding: '4px 8px', fontSize: 12, width: 160 }} placeholder="Nº do Laudo..." value={filtroNumLaudo} onChange={e => setFiltroNumLaudo(e.target.value)} />
                {(filtroDataDe || filtroDataAte || filtroNumLaudo) && (
                  <button className="btn btn-secondary btn-sm" onClick={() => { setFiltroDataDe(''); setFiltroDataAte(''); setFiltroNumLaudo(''); }} style={{ fontSize: 12 }}>
                    Limpar filtros
                  </button>
                )}
                {consolidadoFiltrado.length !== consolidated.length && (
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{consolidadoFiltrado.length} de {consolidated.length}</span>
                )}
              </div>
            )}
            {consolidadoFiltrado.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                {consolidated.length === 0 ? 'Nenhum relatório consolidado gerado.' : 'Nenhum relatório encontrado para os filtros aplicados.'}
              </div>
            ) : (
              <table className="table">
                <thead><tr><th>Arquivo</th><th>Análise</th><th>Formato</th><th>Gerado em</th><th>Ações</th></tr></thead>
                <tbody>
                  {consolidadoFiltrado.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontSize: 13, fontWeight: 500 }}>{r.filename}</td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>{r.tipo_analise}</td>
                      <td><span style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: r.format === 'pdf' ? '#dc2626' : '#166534' }}>{r.format}</span></td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>{new Date(r.generated_at).toLocaleString('pt-BR')}</td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={async () => {
                          try {
                            const res = await api.get(`/reports/consolidated/download/${r.id}`, { responseType: 'blob' });
                            const url = window.URL.createObjectURL(res.data);
                            const a = document.createElement('a');
                            a.href = url; a.download = r.filename; a.click();
                            window.URL.revokeObjectURL(url);
                          } catch { alert('Erro ao baixar relatório.'); }
                        }}>Baixar</button>
                        <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          onClick={async () => {
                            if (!window.confirm(`Excluir o relatório "${r.filename}"? Você poderá gerá-lo novamente.`)) return;
                            try {
                              await api.delete(`/reports/consolidated/${r.id}`);
                              setConsolidated(c => c.filter(x => x.id !== r.id));
                            } catch { alert('Erro ao excluir relatório.'); }
                          }}>
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
          );
        })()}

        {/* Laudos */}
        {aba === 'laudos' && (
          <>
            {downloadError && <div className="alert alert-error" style={{ margin: 16 }}>{downloadError}</div>}
            {reports.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum laudo gerado.</div>
            ) : (
              <table className="table">
                <thead><tr><th>#</th><th>Arquivo</th><th>Gerado em</th><th>SHA-256</th><th>Ações</th></tr></thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td><span className="badge badge-blue">{r.id}</span></td>
                      <td style={{ fontSize: 13, fontWeight: 500 }}>{r.filename}</td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>{new Date(r.generated_at).toLocaleString('pt-BR')}</td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{r.sha256.substring(0, 16)}...</span></td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleDownload(r)}>Baixar</button>
                        <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          onClick={() => handleDeleteReport(r)}
                          disabled={deletingReport === r.id}>
                          {deletingReport === r.id ? '...' : 'Excluir'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {editEmpModal && editEmpTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 8, padding: 24, maxWidth: 480, width: '95%' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Editar Funcionário</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Nome *</label>
                <input className="form-input" value={editEmpForm.nome || ''} onChange={e => setEditEmpForm({ ...editEmpForm, nome: e.target.value })} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Função</label>
                <input className="form-input" value={editEmpForm.funcao || ''} onChange={e => setEditEmpForm({ ...editEmpForm, funcao: e.target.value })} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Matrícula</label>
                <input className="form-input" value={editEmpForm.matricula || ''} onChange={e => setEditEmpForm({ ...editEmpForm, matricula: e.target.value })} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Setor</label>
                <input className="form-input" value={editEmpForm.setor || ''} onChange={e => setEditEmpForm({ ...editEmpForm, setor: e.target.value })} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Local</label>
                <input className="form-input" value={editEmpForm.local || ''} onChange={e => setEditEmpForm({ ...editEmpForm, local: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleSaveEmployee} disabled={savingEmp}>{savingEmp ? 'Salvando...' : 'Salvar'}</button>
              <button className="btn btn-secondary" onClick={() => setEditEmpModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {deleteEmpModal && deleteEmpTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#F2F2F2', borderRadius: 8, padding: 24, maxWidth: 400, width: '90%' }}>
            <p style={{ color: '#8B0000', fontWeight: 600, marginBottom: 16 }}>
              Tem certeza que deseja excluir este funcionário e todos os seus dados vinculados?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{ background: '#8B0000', color: 'white', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                onClick={handleDeleteEmployee}
                disabled={deletingEmp}
              >{deletingEmp ? '...' : 'Excluir'}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setDeleteEmpModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {editSheetModal && editSheetTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 8, padding: 24, maxWidth: 640, width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Editar Ficha de Campo</div>

            <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Identificação</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nº do Laudo</label>
                <input className="form-input" type="number" value={editSheetForm.laudo_number} onChange={e => setEditSheetForm(f => ({ ...f, laudo_number: e.target.value }))} placeholder="Ex: 42" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nº Dosímetro</label>
                <input className="form-input" type="number" value={editSheetForm.dosimeter_number} onChange={e => setEditSheetForm(f => ({ ...f, dosimeter_number: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Data da Coleta</label>
                <input className="form-input" type="date" value={editSheetForm.collection_date} onChange={e => setEditSheetForm(f => ({ ...f, collection_date: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Data do Relatório</label>
                <input className="form-input" type="date" value={editSheetForm.data_relatorio} onChange={e => setEditSheetForm(f => ({ ...f, data_relatorio: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tipo de Análise</label>
                <select className="form-input" value={editSheetForm.tipo_analise} onChange={e => setEditSheetForm(f => ({ ...f, tipo_analise: e.target.value }))}>
                  <option>Ruído</option><option>Calor</option><option>Químico</option>
                </select>
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Funcionário</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Cargo/Função</label>
                <input className="form-input" value={editSheetForm.funcao} onChange={e => setEditSheetForm(f => ({ ...f, funcao: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Matrícula</label>
                <input className="form-input" value={editSheetForm.matricula} onChange={e => setEditSheetForm(f => ({ ...f, matricula: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Setor</label>
                <input className="form-input" value={editSheetForm.setor} onChange={e => setEditSheetForm(f => ({ ...f, setor: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Local da Coleta</label>
                <input className="form-input" value={editSheetForm.local} onChange={e => setEditSheetForm(f => ({ ...f, local: e.target.value }))} />
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Técnico e Condições</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Técnico Responsável</label>
                <input className="form-input" value={editSheetForm.technician_name} onChange={e => setEditSheetForm(f => ({ ...f, technician_name: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Resp. pelo Acompanhamento</label>
                <input className="form-input" value={editSheetForm.technician_name_2} onChange={e => setEditSheetForm(f => ({ ...f, technician_name_2: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">EPI Utilizado</label>
                <input list="epi-list-sheet" className="form-input" value={editSheetForm.epi} onChange={e => setEditSheetForm(f => ({ ...f, epi: e.target.value }))} autoComplete="off" />
                <datalist id="epi-list-sheet">{epiOptionsSheet.map(o => <option key={o} value={o} />)}</datalist>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Pré Verificação [dB]</label>
                <input className="form-input" value={editSheetForm.pre_verificacao_db} onChange={e => setEditSheetForm(f => ({ ...f, pre_verificacao_db: e.target.value }))} placeholder="114,00" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Pós Verificação [dB]</label>
                <input className="form-input" value={editSheetForm.pos_verificacao_db} onChange={e => setEditSheetForm(f => ({ ...f, pos_verificacao_db: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Atividade Desenvolvida</label>
                <textarea className="form-input" rows={2} value={editSheetForm.activity} onChange={e => setEditSheetForm(f => ({ ...f, activity: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Máquinas/Equipamentos</label>
                <textarea className="form-input" rows={2} value={editSheetForm.machine_noise} onChange={e => setEditSheetForm(f => ({ ...f, machine_noise: e.target.value }))} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Conclusão Personalizada <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional)</span></label>
              <textarea className="form-input" rows={3} value={editSheetForm.conclusao_texto} onChange={e => setEditSheetForm(f => ({ ...f, conclusao_texto: e.target.value }))} placeholder="Deixe em branco para usar o texto automático." />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleSaveSheet} disabled={savingSheet}>{savingSheet ? 'Salvando...' : 'Salvar'}</button>
              <button className="btn btn-secondary" onClick={() => setEditSheetModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showRelModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 8, padding: 24, maxWidth: 560, width: '95%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Selecionar fichas para o relatório PDF</div>
            {relCarregando ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>Carregando fichas...</div>
            ) : relFichas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>Nenhuma ficha encontrada.</div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569', textAlign: 'left', width: 36 }}></th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>Nº Laudo</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>Funcionário</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>Data Coleta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relFichas.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <input type="checkbox"
                            checked={relFichasSel.includes(s.id)}
                            onChange={e => setRelFichasSel(prev =>
                              e.target.checked ? [...prev, s.id] : prev.filter(x => x !== s.id)
                            )}
                          />
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {s.laudo_number ? `${s.laudo_number}.${s.laudo_y || 1}/${new Date().getFullYear()}` : <span style={{ color: '#f59e0b' }}>S/Nº</span>}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 500 }}>{s.employee_nome || '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{new Date(s.collection_date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm"
                onClick={handleGerarPdfComSelecao}
                disabled={relGerando || relFichasSel.length === 0}>
                {relGerando ? 'Gerando...' : 'Gerar PDF'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowRelModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
