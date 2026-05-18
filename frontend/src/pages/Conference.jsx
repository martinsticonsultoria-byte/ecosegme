import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { DeleteFieldSheetButton } from './CompanyDetail';

// ─── Visão de detalhe: tabela de fichas de uma empresa ───────────────────────
function ConferenceDetail({ group, onBack, onReload }) {
  const navigate = useNavigate();
  const [sheets, setSheets] = useState(group.sheets);
  const [uploadFile, setUploadFile] = useState({});
  const [uploading, setUploading] = useState({});
  const [uploadResult, setUploadResult] = useState({});
  const [generating, setGenerating] = useState({});
  const [reports, setReports] = useState({});
  const [approving, setApproving] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [expandedUpload, setExpandedUpload] = useState(null);
  const [genBulkPdf, setGenBulkPdf] = useState(false);
  const [genBulkXls, setGenBulkXls] = useState(false);
  const [errors, setErrors] = useState({});
  const [epiOptions, setEpiOptions] = useState([]);
  const [deletingSonus, setDeletingSonus] = useState({});
  const [modoSelecao, setModoSelecao] = useState(false);
  const [fichasSelecionadas, setFichasSelecionadas] = useState([]);


  useEffect(() => {
    api.get('/epis').then(res => setEpiOptions([...res.data.predefined, ...res.data.custom]));
  }, []);

  const StatusBadge = ({ status }) => {
    const s = status === 'aprovada'
      ? { bg: '#dcfce7', color: '#166534', label: 'Aprovada' }
      : { bg: '#fef9c3', color: '#854d0e', label: 'Pendente' };
    return <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  const handleApprove = async (sheetId) => {
    setApproving(a => ({ ...a, [sheetId]: true }));
    try {
      await api.patch(`/field-sheets/${sheetId}/status`, { status: 'aprovada' });
      setSheets(s => s.map(x => x.id === sheetId ? { ...x, status: 'aprovada' } : x));
      onReload();
    } catch (err) {
      setErrors(e => ({ ...e, [sheetId]: err.response?.data?.detail || 'Erro ao aprovar' }));
    } finally { setApproving(a => ({ ...a, [sheetId]: false })); }
  };

  const handleDownloadFicha = async (sheet) => {
    try {
      const res = await api.get(`/field-sheets/${sheet.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha_${String(sheet.laudo_number).padStart(4, '0')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { setErrors(e => ({ ...e, [sheet.id]: 'Erro ao baixar ficha.' })); }
  };

  const handleUpload = async (sheetId) => {
    const file = uploadFile[sheetId];
    if (!file) return;
    setUploading(u => ({ ...u, [sheetId]: true }));
    setErrors(e => ({ ...e, [sheetId]: '' }));
    setUploadResult(r => ({ ...r, [sheetId]: null }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post(`/uploads/sonus/${sheetId}`, fd);
      setUploadResult(r => ({ ...r, [sheetId]: res.data }));
      const nameMatch = res.data.name_match;
      setSheets(s => s.map(x => x.id === sheetId ? {
        ...x,
        has_sonus: true,
        sonus_name_mismatch: nameMatch === false,
        sonus_parsed_name: res.data.parsed_data?.funcionario,
      } : x));
    } catch (err) {
      setErrors(e => ({ ...e, [sheetId]: err.response?.data?.detail || 'Erro ao enviar PDF' }));
    } finally { setUploading(u => ({ ...u, [sheetId]: false })); }
  };

  const handleDeleteSonus = async (sheetId) => {
    if (!window.confirm('Excluir o PDF do SONUS desta ficha? Você poderá enviar outro depois.')) return;
    setDeletingSonus(d => ({ ...d, [sheetId]: true }));
    try {
      await api.delete(`/uploads/sonus/${sheetId}`);
      setUploadResult(r => ({ ...r, [sheetId]: null }));
      setUploadFile(f => ({ ...f, [sheetId]: null }));
      setSheets(s => s.map(x => x.id === sheetId ? { ...x, has_sonus: false, sonus_name_mismatch: false, sonus_parsed_name: null } : x));
    } catch (err) {
      setErrors(e => ({ ...e, [sheetId]: err.response?.data?.detail || 'Erro ao excluir SONUS' }));
    } finally { setDeletingSonus(d => ({ ...d, [sheetId]: false })); }
  };

  const handleGenerate = async (sheetId) => {
    setGenerating(g => ({ ...g, [sheetId]: true }));
    setErrors(e => ({ ...e, [sheetId]: '' }));
    try {
      const res = await api.post(`/reports/generate/${sheetId}`);
      setReports(r => ({ ...r, [sheetId]: res.data }));
      onReload();
    } catch (err) {
      setErrors(e => ({ ...e, [sheetId]: err.response?.data?.detail || 'Erro ao gerar laudo' }));
    } finally { setGenerating(g => ({ ...g, [sheetId]: false })); }
  };

  const handleDownloadLaudo = async (reportData) => {
    try {
      const urlRes = await api.get(`/reports/url/${reportData.id}`);
      const { url, local } = urlRes.data;
      if (local) {
        const res = await api.get(url, { responseType: 'blob' });
        const blobUrl = window.URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = reportData.filename || `laudo_${reportData.id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(blobUrl);
      } else {
        window.open(url, '_blank');
      }
    } catch { alert('Erro ao baixar laudo.'); }
  };

  const blobDownload = async (url, filename, setLoading) => {
    setLoading(true);
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = filename; a.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      let msg = 'Erro ao gerar relatório.';
      if (err.response?.data instanceof Blob) {
        try { const t = await err.response.data.text(); msg = JSON.parse(t).detail || msg; } catch {}
      }
      alert(msg);
    } finally { setLoading(false); }
  };

  const startEdit = (sheet) => {
    setEditingId(sheet.id);
    setEditForm({
      laudo_number: sheet.laudo_number || '',
      epi: sheet.epi || '',
      activity: sheet.activity || '',
      machine_noise: sheet.machine_noise || '',
      pos_verificacao_db: sheet.pos_verificacao_db || '',
      pre_verificacao_db: sheet.pre_verificacao_db || '',
      technician_name: sheet.technician_name || '',
      technician_name_2: sheet.technician_name_2 || '',
      collection_date: sheet.collection_date || '',
      data_relatorio: sheet.data_relatorio || '',
      conclusao_texto: sheet.conclusao_texto || '',
      dosimeter_number: sheet.dosimeter_number || '',
      tipo_analise: sheet.tipo_analise || 'Ruído',
      funcao: sheet.employee_funcao || '',
      matricula: sheet.employee_matricula || '',
      setor: sheet.employee_setor || '',
      local: sheet.employee_local || '',
    });
  };

  const handleSaveEdit = async (sheetId) => {
    setSaving(true);
    try {
      if (editForm.epi) api.post('/epis', { name: editForm.epi }).then(res => {
        if (res.data.ok) setEpiOptions(prev => prev.includes(editForm.epi) ? prev : [...prev, editForm.epi]);
      }).catch(() => {});
      await api.patch(`/field-sheets/${sheetId}/edit`, editForm);
      setEditingId(null);
      const res = await api.get('/field-sheets/pending');
      const updated = res.data.find(s => s.id === sheetId);
      if (updated) setSheets(s => s.map(x => x.id === sheetId ? updated : x));
      onReload();
    } catch (err) {
      setErrors(e => ({ ...e, [sheetId]: err.response?.data?.detail || 'Erro ao salvar' }));
    } finally { setSaving(false); }
  };

  const params = new URLSearchParams({ company_id: group.company_id, tipo_analise: group.tipo_analise });

  const thStyle = {
    background: '#f8fafc',
    padding: '8px 10px',
    fontWeight: 600,
    fontSize: 11,
    color: '#475569',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
    textAlign: 'left',
  };

  const tdStyle = {
    padding: '8px 10px',
    fontSize: 12,
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
    maxWidth: 180,
  };

  const tdSmall = { ...tdStyle, color: '#64748b', fontSize: 11 };

  return (
    <div className="page">
      {/* Cabeçalho */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 8 }}>
          ← Voltar para Conferência
        </button>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="page-title">{group.company_nome}</h1>
            <p className="page-subtitle">{group.tipo_analise} · {sheets.length} ficha{sheets.length !== 1 ? 's' : ''} · {group.tecnicos.join(', ')}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!modoSelecao ? (
              <button className="btn btn-primary" onClick={() => setModoSelecao(true)}>
                Gerar Relatório PDF
              </button>
            ) : (
              <>
                <button className="btn btn-primary"
                  onClick={() => {
                    const p = new URLSearchParams({ company_id: group.company_id, tipo_analise: group.tipo_analise });
                    fichasSelecionadas.forEach(id => p.append('field_sheet_ids', id));
                    blobDownload(`/reports/generate-bulk-pdf?${p}`, `relatorio_${group.tipo_analise}_${group.company_nome?.slice(0,20)}.pdf`, setGenBulkPdf);
                    setModoSelecao(false);
                    setFichasSelecionadas([]);
                  }}
                  disabled={genBulkPdf || fichasSelecionadas.length === 0}>
                  {genBulkPdf ? 'Gerando...' : 'Confirmar e Gerar'}
                </button>
                <button className="btn btn-secondary"
                  onClick={() => { setModoSelecao(false); setFichasSelecionadas([]); }}>
                  Cancelar Seleção
                </button>
              </>
            )}
            <button className="btn btn-secondary"
              onClick={() => blobDownload(`/reports/generate-bulk?${params}`, `relatorio_${group.tipo_analise}_${group.company_nome?.slice(0,20)}.xlsx`, setGenBulkXls)}
              disabled={genBulkXls}>
              {genBulkXls ? 'Gerando...' : 'Gerar Relatório Excel'}
            </button>
            <button className="btn btn-secondary" onClick={() => navigate(`/companies/${group.company_id}`)}>
              Ver Empresa
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de fichas */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1350, tableLayout: 'auto' }}>
            <thead>
              <tr>
                {modoSelecao && <th style={{ ...thStyle, width: 36 }}></th>}
                <th style={thStyle}>#</th>
                <th style={thStyle}>Dosímetro</th>
                <th style={thStyle}>Data Coleta</th>
                <th style={thStyle}>Funcionário</th>
                <th style={thStyle}>Função</th>
                <th style={thStyle}>Matrícula</th>
                <th style={thStyle}>Setor</th>
                <th style={thStyle}>Local</th>
                <th style={thStyle}>EPI</th>
                <th style={thStyle}>Atividade</th>
                <th style={thStyle}>Máquinas/Equip.</th>
                <th style={thStyle}>Técnico</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right', width: 290, minWidth: 290 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map((sheet, idx) => (
                <>
                  {/* Linha principal da ficha */}
                  <tr key={sheet.id} style={{ background: editingId === sheet.id ? '#f0faf6' : undefined }}>
                    {modoSelecao && (
                      <td style={{ ...tdStyle, width: 36, textAlign: 'center' }}>
                        <input type="checkbox"
                          checked={fichasSelecionadas.includes(sheet.id)}
                          onChange={e => setFichasSelecionadas(prev =>
                            e.target.checked ? [...prev, sheet.id] : prev.filter(id => id !== sheet.id)
                          )}
                        />
                      </td>
                    )}
                    <td style={tdStyle}>
                      {sheet.laudo_number ? <span className="badge badge-blue">{sheet.laudo_number}.1/{new Date().getFullYear()}</span> : <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600 }}>S/ Nº</span>}
                    </td>
                    <td style={tdSmall}>{sheet.dosimeter_number}</td>
                    <td style={tdSmall}>{new Date(sheet.collection_date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{sheet.employee_nome || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                    <td style={tdSmall}>{sheet.employee_funcao || '—'}</td>
                    <td style={tdSmall}>{sheet.employee_matricula || '—'}</td>
                    <td style={tdSmall}>{sheet.employee_setor || '—'}</td>
                    <td style={tdSmall}>{sheet.employee_local || '—'}</td>
                    <td style={{ ...tdSmall, maxWidth: 120 }}>{sheet.epi || '—'}</td>
                    <td style={{ ...tdSmall, maxWidth: 140 }}>{sheet.activity || '—'}</td>
                    <td style={{ ...tdSmall, maxWidth: 140 }}>{sheet.machine_noise || '—'}</td>
                    <td style={tdSmall}>{sheet.technician_name}</td>
                    <td style={{ ...tdStyle, minWidth: 90, whiteSpace: 'nowrap' }}><StatusBadge status={sheet.status} /></td>
                    <td style={{ ...tdStyle, textAlign: 'right', width: 340, minWidth: 340 }}>
                      {sheet.status === 'aprovada' ? (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm"
                            onClick={() => setExpandedUpload(id => id === sheet.id ? null : sheet.id)}>
                            {expandedUpload === sheet.id ? '▲' : '▼ SONUS'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm"
                            onClick={() => editingId === sheet.id ? setEditingId(null) : startEdit(sheet)}>
                            {editingId === sheet.id ? 'Cancelar' : 'Editar'}
                          </button>
                          <button className="btn btn-secondary btn-sm"
                            onClick={() => setExpandedUpload(id => id === sheet.id ? null : sheet.id)}>
                            {expandedUpload === sheet.id ? '▲' : '▼ SONUS'}
                          </button>
                          <button className="btn btn-primary btn-sm"
                            onClick={() => handleApprove(sheet.id)}
                            disabled={
                              approving[sheet.id] ||
                              !sheet.has_sonus ||
                              !sheet.laudo_number ||
                              sheet.sonus_name_mismatch === true ||
                              uploadResult[sheet.id]?.name_match === false
                            }
                            title={
                              !sheet.laudo_number ? 'Defina o Nº do Laudo antes de aprovar' :
                              !sheet.has_sonus ? 'Envie o PDF do SONUS antes de aprovar' :
                              (sheet.sonus_name_mismatch || uploadResult[sheet.id]?.name_match === false) ? 'Nome no SONUS diverge do cadastro — corrija antes de aprovar' :
                              ''
                            }>
                            {approving[sheet.id] ? '...' : 'Aprovar'}
                          </button>
                          <DeleteFieldSheetButton
                            fieldSheetId={sheet.id}
                            onDeleted={() => setSheets(prev => prev.filter(f => f.id !== sheet.id))}
                          />
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Aviso de campos obrigatórios para aprovação */}
                  {sheet.status !== 'aprovada' && (!sheet.laudo_number || !sheet.has_sonus || sheet.sonus_name_mismatch || uploadResult[sheet.id]?.name_match === false) && (
                    <tr key={`warn-${sheet.id}`}>
                      <td colSpan={modoSelecao ? 15 : 14} style={{ padding: '4px 12px', background: '#fffbeb', borderTop: 'none' }}>
                        <span style={{ color: '#92400e', fontSize: 11.5 }}>
                          ⚠ Para aprovar esta ficha:
                          {!sheet.laudo_number && <span> &nbsp;defina o <strong>Nº do Laudo</strong> (clique em Editar);</span>}
                          {!sheet.has_sonus && <span> &nbsp;envie o <strong>PDF do SONUS 2</strong> (clique em ▼ SONUS).</span>}
                          {(sheet.sonus_name_mismatch || uploadResult[sheet.id]?.name_match === false) && (
                            <span> &nbsp;<strong>Nome divergente:</strong> SONUS traz &quot;{uploadResult[sheet.id]?.parsed_data?.funcionario || sheet.sonus_parsed_name}&quot; mas cadastro é &quot;{sheet.employee_nome}&quot; — corrija o cadastro ou reenvie o SONUS correto.</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  )}

                  {/* Erro inline */}
                  {errors[sheet.id] && (
                    <tr key={`err-${sheet.id}`}>
                      <td colSpan={modoSelecao ? 15 : 14} style={{ padding: '4px 12px', background: '#fff5f5' }}>
                        <span style={{ color: '#dc2626', fontSize: 12 }}>{errors[sheet.id]}</span>
                      </td>
                    </tr>
                  )}

                  {/* Linha de edição expandida */}
                  {editingId === sheet.id && (
                    <tr key={`edit-${sheet.id}`}>
                      <td colSpan={modoSelecao ? 15 : 14} style={{ padding: '14px 16px', background: '#f8fff8', borderBottom: '2px solid #bbf7d0' }}>

                        <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Identificação</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Nº do Laudo</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input className="form-input" type="number" value={editForm.laudo_number} onChange={e => setEditForm(f => ({ ...f, laudo_number: parseInt(e.target.value) || '' }))} placeholder="Ex: 42" style={{ width: '100px' }} />
                              <span style={{ color: '#666', fontWeight: '500' }}>{`.1/${new Date().getFullYear()}`}</span>
                            </div>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Nº Dosímetro</label>
                            <input className="form-input" type="number" value={editForm.dosimeter_number} onChange={e => setEditForm(f => ({ ...f, dosimeter_number: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Data da Coleta</label>
                            <input className="form-input" type="date" value={editForm.collection_date} onChange={e => setEditForm(f => ({ ...f, collection_date: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Data do Relatório</label>
                            <input className="form-input" type="date" value={editForm.data_relatorio} onChange={e => setEditForm(f => ({ ...f, data_relatorio: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Tipo de Análise</label>
                            <select className="form-input" value={editForm.tipo_analise} onChange={e => setEditForm(f => ({ ...f, tipo_analise: e.target.value }))}>
                              <option>Ruído</option>
                              <option>Calor</option>
                              <option>Químico</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Funcionário</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Cargo/Função</label>
                            <input className="form-input" value={editForm.funcao} onChange={e => setEditForm(f => ({ ...f, funcao: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Matrícula</label>
                            <input className="form-input" value={editForm.matricula} onChange={e => setEditForm(f => ({ ...f, matricula: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Setor</label>
                            <input className="form-input" value={editForm.setor} onChange={e => setEditForm(f => ({ ...f, setor: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Local da Coleta</label>
                            <input className="form-input" value={editForm.local} onChange={e => setEditForm(f => ({ ...f, local: e.target.value }))} />
                          </div>
                        </div>

                        <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Técnico e Condições</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Técnico Responsável</label>
                            <input className="form-input" value={editForm.technician_name} onChange={e => setEditForm(f => ({ ...f, technician_name: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Resp. pelo Acompanhamento</label>
                            <input className="form-input" value={editForm.technician_name_2} onChange={e => setEditForm(f => ({ ...f, technician_name_2: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">EPI Utilizado</label>
                            <input list="epi-list-conf" className="form-input" value={editForm.epi} onChange={e => setEditForm(f => ({ ...f, epi: e.target.value }))} autoComplete="off" />
                            <datalist id="epi-list-conf">{epiOptions.map(o => <option key={o} value={o} />)}</datalist>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Pré Verificação [dB]</label>
                            <input className="form-input" value={editForm.pre_verificacao_db} onChange={e => setEditForm(f => ({ ...f, pre_verificacao_db: e.target.value }))} placeholder="114,00" />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Pós Verificação [dB]</label>
                            <input className="form-input" value={editForm.pos_verificacao_db} onChange={e => setEditForm(f => ({ ...f, pos_verificacao_db: e.target.value }))} placeholder="Ex: 114,00" />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Atividade Desenvolvida</label>
                            <textarea className="form-input" rows={2} value={editForm.activity} onChange={e => setEditForm(f => ({ ...f, activity: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Máquinas/Equipamentos</label>
                            <textarea className="form-input" rows={2} value={editForm.machine_noise} onChange={e => setEditForm(f => ({ ...f, machine_noise: e.target.value }))} />
                          </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Conclusão Personalizada <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional — substitui o texto automático no PDF)</span></label>
                            <textarea className="form-input" rows={3} value={editForm.conclusao_texto} onChange={e => setEditForm(f => ({ ...f, conclusao_texto: e.target.value }))} placeholder="Deixe em branco para usar o texto automático gerado pelo sistema." />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(sheet.id)} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancelar</button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Upload SONUS expandido */}
                  {expandedUpload === sheet.id && (
                    <tr key={`upload-${sheet.id}`}>
                      <td colSpan={modoSelecao ? 15 : 14} style={{ padding: '12px 16px', background: '#f0f9ff', borderBottom: '2px solid #bae6fd' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0369a1', marginBottom: 8 }}>Upload de Laudo (SONUS 2)</div>
                        {sheet.has_sonus && !uploadResult[sheet.id] ? (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: sheet.sonus_name_mismatch ? 8 : 0 }}>
                              <span style={{ fontSize: 13, color: '#0369a1' }}>PDF do SONUS já enviado.</span>
                              <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                                onClick={() => handleDeleteSonus(sheet.id)}
                                disabled={deletingSonus[sheet.id]}>
                                {deletingSonus[sheet.id] ? '...' : 'Excluir e reenviar'}
                              </button>
                            </div>
                            {sheet.sonus_name_mismatch && (
                              <div style={{ padding: '6px 10px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, color: '#b91c1c', marginBottom: 8 }}>
                                ⚠ Nome no SONUS &quot;{sheet.sonus_parsed_name}&quot; diverge do cadastro &quot;{sheet.employee_nome}&quot; — exclua e reenvie o SONUS correto.
                              </div>
                            )}
                            {!sheet.sonus_name_mismatch && (
                              !reports[sheet.id]
                                ? <button className="btn btn-primary btn-sm" onClick={() => handleGenerate(sheet.id)} disabled={generating[sheet.id]}>
                                    {generating[sheet.id] ? 'Gerando...' : 'Gerar Laudo PDF'}
                                  </button>
                                : <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 13 }}>Laudo gerado</span>
                                    <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadLaudo(reports[sheet.id])}>Baixar</button>
                                  </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 600, marginBottom: 8 }}>
                            <input type="file" accept=".pdf" className="form-input"
                              style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13, flex: 1 }}
                              onChange={e => setUploadFile(f => ({ ...f, [sheet.id]: e.target.files[0] }))} />
                            <button className="btn btn-primary btn-sm"
                              onClick={() => handleUpload(sheet.id)}
                              disabled={uploading[sheet.id] || !uploadFile[sheet.id]}>
                              {uploading[sheet.id] ? 'Enviando...' : 'Conferir'}
                            </button>
                          </div>
                        )}

                        {uploadResult[sheet.id] && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#0f172a', marginBottom: 8 }}>
                              <span>Início: <b>{uploadResult[sheet.id].parsed_data?.inicio}</b></span>
                              <span>Fim: <b>{uploadResult[sheet.id].parsed_data?.fim}</b></span>
                              <span>NE: <b>{uploadResult[sheet.id].parsed_data?.ne_db} dB</b></span>
                            </div>
                            {uploadResult[sheet.id].name_match === false && (
                              <div style={{ padding: '6px 10px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, color: '#b91c1c', marginBottom: 8 }}>
                                ⚠ {uploadResult[sheet.id].name_alert}
                              </div>
                            )}
                            {uploadResult[sheet.id].name_match !== false && (
                              !reports[sheet.id]
                                ? <button className="btn btn-primary btn-sm" onClick={() => handleGenerate(sheet.id)} disabled={generating[sheet.id]}>
                                    {generating[sheet.id] ? 'Gerando...' : 'Gerar Laudo PDF'}
                                  </button>
                                : <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 13 }}>Laudo gerado</span>
                                    <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadLaudo(reports[sheet.id])}>Baixar</button>
                                  </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Visão principal: lista de grupos ────────────────────────────────────────
export default function Conference() {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('pendente');

  const load = () => {
    setLoading(true);
    api.get('/field-sheets/pending')
      .then(res => setSheets(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Agrupa por empresa + tipo_analise
  const grupos = Object.values(
    sheets.reduce((acc, s) => {
      const key = `${s.company_id}||${s.tipo_analise || 'Ruído'}`;
      if (!acc[key]) acc[key] = {
        key, company_id: s.company_id, company_nome: s.company_nome,
        tipo_analise: s.tipo_analise || 'Ruído', sheets: [], tecnicos: new Set(),
      };
      acc[key].sheets.push(s);
      if (s.technician_name) acc[key].tecnicos.add(s.technician_name);
      return acc;
    }, {})
  ).map(g => ({ ...g, tecnicos: [...g.tecnicos] }));

  const statusGrupo = (sheets) => {
    if (sheets.every(s => s.status === 'aprovada')) return 'aprovada';
    if (sheets.some(s => s.status === 'aprovada')) return 'parcial';
    return 'pendente';
  };

  const StatusBadge = ({ status }) => {
    const map = {
      aprovada: { bg: '#dcfce7', color: '#166534', label: 'Aprovada' },
      parcial:  { bg: '#fef9c3', color: '#854d0e', label: 'Parcial' },
      pendente: { bg: '#fee2e2', color: '#991b1b', label: 'Pendente' },
    };
    const s = map[status] || map.pendente;
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  if (selectedGroup) {
    return <ConferenceDetail group={selectedGroup} onBack={() => setSelectedGroup(null)} onReload={load} />;
  }

  if (loading) return <div className="page"><div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Carregando...</div></div>;

  const gruposFiltrados = grupos.filter(g => statusGrupo(g.sheets) !== 'aprovada');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Conferência</h1>
          <p className="page-subtitle">{grupos.length} grupo{grupos.length !== 1 ? 's' : ''} · {sheets.length} ficha{sheets.length !== 1 ? 's' : ''} no total</p>
        </div>
        <button className="btn btn-secondary" onClick={load}>Atualizar</button>
      </div>

      {grupos.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: '#6b7280' }}>Nenhuma ficha pendente de conferência.</p>
        </div>
      )}

      {grupos.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Tipo de Análise</th>
                <th>Fichas</th>
                <th>Técnico(s)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {gruposFiltrados.map(group => (
                <tr key={group.key} style={{ cursor: 'pointer' }} onClick={() => setSelectedGroup(group)}>
                  <td style={{ verticalAlign: 'middle' }}>
                    <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 14, textDecoration: 'underline' }}>
                      {group.company_nome}
                    </span>
                  </td>
                  <td style={{ verticalAlign: 'middle', fontSize: 13 }}>{group.tipo_analise}</td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <span className="badge badge-blue">{group.sheets.length}</span>
                  </td>
                  <td style={{ verticalAlign: 'middle', color: '#64748b', fontSize: 13 }}>{group.tecnicos.join(', ') || '—'}</td>
                  <td style={{ verticalAlign: 'middle' }}><StatusBadge status={statusGrupo(group.sheets)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
