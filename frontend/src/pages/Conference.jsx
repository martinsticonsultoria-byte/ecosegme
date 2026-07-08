import { useState, useEffect, useRef } from 'react';
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

  const exibirLaudo = (sheet) => {
    const ano = new Date().getFullYear();
    if (!sheet.laudo_number) return 'S/Nº';
    if (sheet.laudo_y) return `${sheet.laudo_number}.${sheet.laudo_y}/${ano}`;
    return sheet.laudo_number;
  };

  const handleApprove = async (sheetId) => {
    setApproving(a => ({ ...a, [sheetId]: true }));
    try {
      const res = await api.patch(`/field-sheets/${sheetId}/status`, { status: 'aprovada' });
      setSheets(s => s.map(x => x.id === sheetId
        ? { ...x, status: 'aprovada', laudo_y: res.data.laudo_y }
        : x
      ));
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
      if (err.response?.status === 400) {
        alert(err.response?.data?.detail || 'Código já utilizado. Escolha outro.')
        return
      }
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
                    const getPrefix = (laudoNumber) => {
                      if (!laudoNumber) return '';
                      const s = String(laudoNumber);
                      return s.includes('.') ? s.split('.')[0] : s;
                    };
                    const prefixosSelecionados = fichasSelecionadas.map(id => {
                      const f = sheets.find(s => s.id === id);
                      return f ? getPrefix(f.laudo_number) : '';
                    }).filter(Boolean);
                    const prefixosDistintos = [...new Set(prefixosSelecionados)];
                    const executarGeracao = () => {
                      const p = new URLSearchParams({ company_id: group.company_id, tipo_analise: group.tipo_analise });
                      fichasSelecionadas.forEach(id => p.append('field_sheet_ids', id));
                      blobDownload(`/reports/generate-bulk-pdf?${p}`, `relatorio_${group.tipo_analise}_${group.company_nome?.slice(0,20)}.pdf`, setGenBulkPdf);
                      setModoSelecao(false);
                      setFichasSelecionadas([]);
                    };
                    if (prefixosDistintos.length > 1) {
                      const ok = window.confirm(
                        `As fichas selecionadas pertencem a análises diferentes (${prefixosDistintos.join(', ')}).\n` +
                        `O relatório pode ser gerado, mas o número na capa não representará uma sequência contínua.\n\n` +
                        `Deseja continuar?`
                      );
                      if (ok) executarGeracao();
                    } else {
                      executarGeracao();
                    }
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
                      {sheet.laudo_number
                        ? <span className="badge badge-blue">{exibirLaudo(sheet)}</span>
                        : <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600 }}>S/ Nº</span>}
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
                              !sheet.data_relatorio
                            }
                            title={
                              !sheet.laudo_number ? 'Defina o Nº do Laudo antes de aprovar' :
                              !sheet.data_relatorio ? 'Defina a Data do Relatório antes de aprovar' :
                              !sheet.has_sonus ? 'Envie o PDF do SONUS antes de aprovar' :
                              `Aprovar · Nº ${sheet.laudo_number}`
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
                  {sheet.status !== 'aprovada' && (!sheet.laudo_number || !sheet.data_relatorio || !sheet.has_sonus) && (
                    <tr key={`warn-${sheet.id}`}>
                      <td colSpan={modoSelecao ? 15 : 14} style={{ padding: '4px 12px', background: '#fffbeb', borderTop: 'none' }}>
                        <span style={{ color: '#92400e', fontSize: 11.5 }}>
                          ⚠ Para aprovar esta ficha:
                          {!sheet.laudo_number && <span> &nbsp;defina o <strong>Nº do Laudo</strong> (clique em Editar);</span>}
                          {!sheet.data_relatorio && <span> &nbsp;defina a <strong>Data do Relatório</strong> (clique em Editar);</span>}
                          {!sheet.has_sonus && <span> &nbsp;envie o <strong>PDF do SONUS 2</strong> (clique em ▼ SONUS).</span>}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input className="form-input" type="text" inputMode="numeric" pattern="[0-9]*" value={editForm.laudo_number} onChange={e => setEditForm(f => ({ ...f, laudo_number: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="Ex: 047 ou 345" style={{ width: '110px' }} />
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
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: 13, color: '#0369a1' }}>PDF do SONUS já enviado.</span>
                            </div>
                            {!reports[sheet.id]
                              ? <button className="btn btn-primary btn-sm" onClick={() => handleGenerate(sheet.id)} disabled={generating[sheet.id]}>
                                  {generating[sheet.id] ? 'Gerando...' : 'Gerar Laudo PDF'}
                                </button>
                              : <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                  <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 13 }}>Laudo gerado</span>
                                  <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadLaudo(reports[sheet.id])}>Baixar</button>
                                </div>
                            }
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
                            {!reports[sheet.id]
                              ? <button className="btn btn-primary btn-sm" onClick={() => handleGenerate(sheet.id)} disabled={generating[sheet.id]}>
                                  {generating[sheet.id] ? 'Gerando...' : 'Gerar Laudo PDF'}
                                </button>
                              : <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                  <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 13 }}>Laudo gerado</span>
                                  <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadLaudo(reports[sheet.id])}>Baixar</button>
                                </div>
                            }
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

// ─── Conferência de Fichas Químicas (detalhe de uma empresa) ─────────────────
function ChemicalConferenceDetail({ group, onBack, onReload }) {
  const [sheets, setSheets] = useState(group.sheets);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState({});
  const [errors, setErrors] = useState({});
  const [agentsMap, setAgentsMap] = useState(() =>
    Object.fromEntries(group.sheets.map(s => [s.id, s.agents || []]))
  );
  const [agentValues, setAgentValues] = useState(() => {
    const vals = {};
    group.sheets.forEach(s => {
      (s.agents || []).forEach(a => {
        vals[`${s.id}-${a.agent_id}`] = a.valor_encontrado || '';
      });
    });
    return vals;
  });
  const [modalSheet, setModalSheet] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingAgent, setAddingAgent] = useState(false);
  const debounceRef = useRef(null);
  const saveDebounceRefs = useRef({});

  // Debounce na busca de agentes do catálogo
  useEffect(() => {
    if (!modalSheet) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchText.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get(`/chemical-agents?search=${encodeURIComponent(searchText)}&limit=20`);
        setSearchResults(res.data);
      } catch {}
      finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchText, modalSheet]);

  const handleValorChange = (sheetId, agentId, valor) => {
    const key = `${sheetId}-${agentId}`;
    setAgentValues(v => ({ ...v, [key]: valor }));
    if (saveDebounceRefs.current[key]) clearTimeout(saveDebounceRefs.current[key]);
    saveDebounceRefs.current[key] = setTimeout(async () => {
      try {
        const res = await api.patch(`/chemical-field-sheets/${sheetId}/agents/${agentId}`, { valor_encontrado: valor });
        setAgentsMap(m => ({
          ...m,
          [sheetId]: m[sheetId].map(a => a.agent_id === agentId
            ? { ...a, resultado_status: res.data.resultado_status, valor_encontrado: valor }
            : a),
        }));
      } catch {
        setErrors(e => ({ ...e, [sheetId]: 'Erro ao salvar valor do agente' }));
      }
    }, 500);
  };

  const handleAddAgent = async (agent) => {
    if (!modalSheet) return;
    setAddingAgent(true);
    try {
      const res = await api.post(`/chemical-field-sheets/${modalSheet.id}/agents`, { agent_id: agent.id });
      setAgentsMap(m => ({ ...m, [modalSheet.id]: [...(m[modalSheet.id] || []), res.data] }));
      setAgentValues(v => ({ ...v, [`${modalSheet.id}-${agent.id}`]: '' }));
    } catch (err) {
      setErrors(e => ({ ...e, [modalSheet.id]: err.response?.data?.detail || 'Erro ao vincular agente' }));
    } finally { setAddingAgent(false); }
  };

  const handleRemoveAgent = async (sheetId, agentId) => {
    try {
      await api.delete(`/chemical-field-sheets/${sheetId}/agents/${agentId}`);
      setAgentsMap(m => ({ ...m, [sheetId]: m[sheetId].filter(a => a.agent_id !== agentId) }));
    } catch {
      setErrors(e => ({ ...e, [sheetId]: 'Erro ao remover agente' }));
    }
  };

  const startEdit = (sheet) => {
    setEditingId(sheet.id);
    setEditForm({
      laudo_number: sheet.laudo_number || '',
      data_relatorio: sheet.data_relatorio || '',
      conclusao_texto: sheet.conclusao_texto || '',
      technician_name: sheet.technician_name || '',
      collection_date: sheet.collection_date || '',
      funcao: sheet.funcao || '',
      matricula: sheet.matricula || '',
      setor: sheet.setor || '',
      local: sheet.local || '',
    });
  };

  const handleSaveEdit = async (sheetId) => {
    setSaving(true);
    try {
      // Converte strings vazias em null (campos de data e opcionais)
      const payload = Object.fromEntries(
        Object.entries(editForm).map(([k, v]) => [k, v === '' ? null : v])
      );
      const res = await api.patch(`/chemical-field-sheets/${sheetId}`, payload);
      setSheets(s => s.map(x => x.id === sheetId ? { ...x, ...res.data } : x));
      setEditingId(null);
    } catch (err) {
      setErrors(e => ({ ...e, [sheetId]: err.response?.data?.detail || 'Erro ao salvar' }));
    } finally { setSaving(false); }
  };

  const handleApprove = async (sheet) => {
    setApproving(a => ({ ...a, [sheet.id]: true }));
    try {
      await api.patch(`/chemical-field-sheets/${sheet.id}/status?laudo_number=${encodeURIComponent(sheet.laudo_number)}`);
      setSheets(s => s.map(x => x.id === sheet.id ? { ...x, status: 'aprovado' } : x));
      onReload();
    } catch (err) {
      setErrors(e => ({ ...e, [sheet.id]: err.response?.data?.detail || 'Erro ao aprovar' }));
    } finally { setApproving(a => ({ ...a, [sheet.id]: false })); }
  };

  const canApprove = (sheet) => {
    const agents = agentsMap[sheet.id] || [];
    if (!sheet.laudo_number) return false;
    if (!sheet.data_relatorio) return false;
    if (agents.length === 0) return false;
    return agents.every(a => {
      const v = agentValues[`${sheet.id}-${a.agent_id}`] !== undefined
        ? agentValues[`${sheet.id}-${a.agent_id}`]
        : (a.valor_encontrado || '');
      return v.trim() !== '';
    });
  };

  const approveTitle = (sheet) => {
    const agents = agentsMap[sheet.id] || [];
    if (!sheet.laudo_number) return 'Defina o Nº do Laudo (clique em Editar)';
    if (!sheet.data_relatorio) return 'Defina a Data do Relatório (clique em Editar)';
    if (agents.length === 0) return 'Vincule ao menos um agente químico';
    const allFilled = agents.every(a => {
      const v = agentValues[`${sheet.id}-${a.agent_id}`] !== undefined
        ? agentValues[`${sheet.id}-${a.agent_id}`]
        : (a.valor_encontrado || '');
      return v.trim() !== '';
    });
    if (!allFilled) return 'Preencha o Valor Encontrado de todos os agentes';
    return `Aprovar · Nº ${sheet.laudo_number}`;
  };

  const ResultBadge = ({ status }) => {
    const map = {
      pendente:      { bg: '#fef3c7', color: '#92400e', label: 'Pendente' },
      dentro_limite: { bg: '#dcfce7', color: '#166534', label: 'Dentro do Limite' },
      acima_limite:  { bg: '#fee2e2', color: '#991b1b', label: 'Acima do Limite' },
      nao_detectado: { bg: '#f1f5f9', color: '#475569', label: 'Não Detectado' },
    };
    const s = map[status] || map.pendente;
    return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>;
  };

  const StatusBadge = ({ status }) => {
    const s = status === 'aprovado'
      ? { bg: '#dcfce7', color: '#166534', label: 'Aprovada' }
      : { bg: '#fef9c3', color: '#854d0e', label: 'Pendente' };
    return <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  const thStyle = { background: '#f8fafc', padding: '8px 10px', fontWeight: 600, fontSize: 11, color: '#475569', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap', textAlign: 'left' };
  const tdStyle = { padding: '8px 10px', fontSize: 12, borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
  const tdSmall = { ...tdStyle, color: '#64748b', fontSize: 11 };

  return (
    <div className="page">
      {/* Modal de busca de agentes */}
      {modalSheet && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setModalSheet(null); setSearchText(''); setSearchResults([]); }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: 480, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Vincular Agente Químico</div>
              <button onClick={() => { setModalSheet(null); setSearchText(''); setSearchResults([]); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748b' }}>✕</button>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Funcionário: <strong>{modalSheet.employee_nome}</strong></div>
            <input className="form-input" placeholder="Buscar agente químico..." value={searchText}
              onChange={e => setSearchText(e.target.value)} autoFocus style={{ marginBottom: 12 }} />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {searchLoading && <div style={{ color: '#94a3b8', fontSize: 13, padding: 8 }}>Buscando...</div>}
              {!searchLoading && !searchText && <div style={{ color: '#94a3b8', fontSize: 13, padding: 8 }}>Digite para buscar no catálogo de agentes.</div>}
              {!searchLoading && searchText && searchResults.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13, padding: 8 }}>Nenhum agente encontrado.</div>}
              {searchResults.map(agent => {
                const alreadyLinked = (agentsMap[modalSheet.id] || []).some(a => a.agent_id === agent.id);
                return (
                  <div key={agent.id} style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: alreadyLinked ? 0.5 : 1 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{agent.nome}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        {agent.unidade || '—'} · CAS: {agent.numero_cas || '—'}
                        {agent.nr15_valor ? ` · NR-15: ${agent.nr15_valor}` : ''}
                        {agent.acgih_twa ? ` · TLV: ${agent.acgih_twa}` : ''}
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => !alreadyLinked && handleAddAgent(agent)}
                      disabled={alreadyLinked || addingAgent} style={{ marginLeft: 12, flexShrink: 0 }}>
                      {alreadyLinked ? 'Vinculado' : '+'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 8 }}>
          ← Voltar para Conferência
        </button>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="page-title">{group.company_nome}</h1>
            <p className="page-subtitle">Químico · {sheets.length} ficha{sheets.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Tabela de fichas químicas */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Funcionário</th>
              <th style={thStyle}>Data Coleta</th>
              <th style={thStyle}>Amostrador</th>
              <th style={thStyle}>Agentes</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {sheets.map(sheet => {
              const agents = agentsMap[sheet.id] || [];
              const missingValor = agents.some(a => {
                const v = agentValues[`${sheet.id}-${a.agent_id}`] !== undefined
                  ? agentValues[`${sheet.id}-${a.agent_id}`]
                  : (a.valor_encontrado || '');
                return !v.trim();
              });
              return (
                <>
                  <tr key={sheet.id} style={{ background: editingId === sheet.id ? '#f0faf6' : undefined }}>
                    <td style={tdStyle}>
                      {sheet.laudo_number
                        ? <span className="badge badge-blue">{sheet.laudo_number}.1/{new Date().getFullYear()}</span>
                        : <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600 }}>S/ Nº</span>}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{sheet.employee_nome || '—'}</td>
                    <td style={tdSmall}>{new Date(sheet.collection_date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td style={tdSmall}>{sheet.numero_amostrador} · {sheet.tipo_amostrador}</td>
                    <td style={tdSmall}>
                      {agents.length === 0
                        ? <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600 }}>Nenhum</span>
                        : <span>{agents.length} agente{agents.length !== 1 ? 's' : ''}</span>}
                    </td>
                    <td style={tdStyle}><StatusBadge status={sheet.status} /></td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {sheet.status !== 'aprovado' && (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm"
                            onClick={() => editingId === sheet.id ? setEditingId(null) : startEdit(sheet)}>
                            {editingId === sheet.id ? 'Cancelar' : 'Editar'}
                          </button>
                          <button className="btn btn-primary btn-sm"
                            onClick={() => handleApprove(sheet)}
                            disabled={approving[sheet.id] || !canApprove(sheet)}
                            title={approveTitle(sheet)}>
                            {approving[sheet.id] ? '...' : 'Aprovar'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Aviso de campos obrigatórios */}
                  {sheet.status !== 'aprovado' && (!sheet.laudo_number || !sheet.data_relatorio || agents.length === 0 || missingValor) && (
                    <tr key={`warn-${sheet.id}`}>
                      <td colSpan={7} style={{ padding: '4px 12px', background: '#fffbeb', borderTop: 'none' }}>
                        <span style={{ color: '#92400e', fontSize: 11.5 }}>
                          ⚠ Para aprovar:
                          {!sheet.laudo_number && <span> &nbsp;defina o <strong>Nº do Laudo</strong> (clique em Editar);</span>}
                          {!sheet.data_relatorio && <span> &nbsp;defina a <strong>Data do Relatório</strong> (clique em Editar);</span>}
                          {agents.length === 0 && <span> &nbsp;vincule ao menos <strong>1 agente químico</strong>;</span>}
                          {agents.length > 0 && missingValor && <span> &nbsp;preencha o <strong>Valor Encontrado</strong> de todos os agentes.</span>}
                        </span>
                      </td>
                    </tr>
                  )}

                  {/* Erro inline */}
                  {errors[sheet.id] && (
                    <tr key={`err-${sheet.id}`}>
                      <td colSpan={7} style={{ padding: '4px 12px', background: '#fff5f5' }}>
                        <span style={{ color: '#dc2626', fontSize: 12 }}>{errors[sheet.id]}</span>
                      </td>
                    </tr>
                  )}

                  {/* Painel de edição */}
                  {editingId === sheet.id && (
                    <tr key={`edit-${sheet.id}`}>
                      <td colSpan={7} style={{ padding: '14px 16px', background: '#f8fff8', borderBottom: '2px solid #bbf7d0' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Identificação</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Nº do Laudo</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <input className="form-input" type="text" inputMode="numeric" pattern="[0-9]*"
                                value={editForm.laudo_number}
                                onChange={e => setEditForm(f => ({ ...f, laudo_number: e.target.value.replace(/[^0-9]/g, '') }))}
                                placeholder="Ex: 047" style={{ width: '100px' }} />
                              <span style={{ color: '#666', fontWeight: 500, fontSize: 13 }}>.1/{new Date().getFullYear()}</span>
                            </div>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Data do Relatório</label>
                            <input className="form-input" type="date" value={editForm.data_relatorio}
                              onChange={e => setEditForm(f => ({ ...f, data_relatorio: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Data da Coleta</label>
                            <input className="form-input" type="date" value={editForm.collection_date}
                              onChange={e => setEditForm(f => ({ ...f, collection_date: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Técnico</label>
                            <input className="form-input" value={editForm.technician_name}
                              onChange={e => setEditForm(f => ({ ...f, technician_name: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Cargo/Função</label>
                            <input className="form-input" value={editForm.funcao}
                              onChange={e => setEditForm(f => ({ ...f, funcao: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Setor</label>
                            <input className="form-input" value={editForm.setor}
                              onChange={e => setEditForm(f => ({ ...f, setor: e.target.value }))} />
                          </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 12 }}>
                          <label className="form-label">Conclusão <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional — substitui o texto automático no PDF)</span></label>
                          <textarea className="form-input" rows={3} value={editForm.conclusao_texto}
                            onChange={e => setEditForm(f => ({ ...f, conclusao_texto: e.target.value }))}
                            placeholder="Deixe em branco para usar o texto automático gerado pelo sistema." />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(sheet.id)} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancelar</button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Seção de agentes (sempre visível para fichas não aprovadas) */}
                  {sheet.status !== 'aprovado' && (
                    <tr key={`agents-${sheet.id}`}>
                      <td colSpan={7} style={{ padding: '12px 16px', background: '#f0f9ff', borderBottom: '2px solid #bae6fd' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Agentes Químicos Vinculados
                          </div>
                          <button className="btn btn-primary btn-sm"
                            onClick={() => { setModalSheet(sheet); setSearchText(''); setSearchResults([]); }}>
                            + Vincular Agente
                          </button>
                        </div>
                        {agents.length === 0 ? (
                          <div style={{ color: '#94a3b8', fontSize: 13 }}>Nenhum agente vinculado. Clique em "+ Vincular Agente" para adicionar.</div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr>
                                {['Nome', 'Valor Encontrado', 'Unidade', 'ACGIH TWA', 'ACGIH STEL', 'NR-15', 'Bases de Efeitos Críticos', 'Resultado', ''].map((h, i) => (
                                  <th key={i} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#0369a1', borderBottom: '1px solid #bae6fd', background: '#e0f2fe', maxWidth: h === 'Bases de Efeitos Críticos' ? 200 : undefined }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {agents.map(sa => {
                                const key = `${sheet.id}-${sa.agent_id}`;
                                const val = agentValues[key] !== undefined ? agentValues[key] : (sa.valor_encontrado || '');
                                return (
                                  <tr key={sa.id}>
                                    <td style={{ padding: '6px 8px', color: '#0f172a', fontWeight: 500 }}>
                                      {sa.agent?.nome || '—'}
                                      {sa.agent?.esocial && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>e-Social: {sa.agent.esocial}</div>}
                                    </td>
                                    <td style={{ padding: '6px 8px' }}>
                                      <input className="form-input" value={val}
                                        onChange={e => handleValorChange(sheet.id, sa.agent_id, e.target.value)}
                                        placeholder="Ex: 12,5 ou <LD"
                                        style={{ width: 90, padding: '4px 8px', fontSize: 12 }} />
                                    </td>
                                    <td style={{ padding: '6px 8px', color: '#64748b' }}>{sa.agent?.unidade || '—'}</td>
                                    <td style={{ padding: '6px 8px', color: '#64748b' }}>{sa.agent?.acgih_twa || '—'}</td>
                                    <td style={{ padding: '6px 8px', color: '#64748b' }}>{sa.agent?.acgih_stel || '—'}</td>
                                    <td style={{ padding: '6px 8px', color: '#64748b' }}>{sa.agent?.nr15_valor || '—'}</td>
                                    <td style={{ padding: '6px 8px', color: '#374151', fontSize: 11, maxWidth: 200 }}>{sa.agent?.efeito_critico || '—'}</td>
                                    <td style={{ padding: '6px 8px' }}><ResultBadge status={sa.resultado_status} /></td>
                                    <td style={{ padding: '6px 8px' }}>
                                      <button onClick={() => handleRemoveAgent(sheet.id, sa.agent_id)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}
                                        title="Remover agente">✕</button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
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

  // Fichas químicas
  const [tipoConferencia, setTipoConferencia] = useState('Ruido');
  const [chemSheets, setChemSheets] = useState([]);
  const [chemLoading, setChemLoading] = useState(false);
  const [selectedChemGroup, setSelectedChemGroup] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/field-sheets/pending')
      .then(res => setSheets(res.data))
      .finally(() => setLoading(false));
  };

  const loadChem = () => {
    setChemLoading(true);
    api.get('/chemical-field-sheets')
      .then(res => setChemSheets(res.data))
      .finally(() => setChemLoading(false));
  };

  useEffect(() => { load(); loadChem(); }, []);

  // Agrupa por empresa + tipo_analise (Ruído)
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

  // Agrupa fichas químicas por empresa
  const chemGrupos = Object.values(
    chemSheets.reduce((acc, s) => {
      const key = `${s.company_id}`;
      if (!acc[key]) acc[key] = {
        key, company_id: s.company_id, company_nome: s.company_nome,
        sheets: [], tecnicos: new Set(),
      };
      acc[key].sheets.push(s);
      if (s.technician_name) acc[key].tecnicos.add(s.technician_name);
      return acc;
    }, {})
  ).map(g => ({ ...g, tecnicos: [...g.tecnicos] }));

  const statusGrupoQuimico = (sheets) => {
    if (sheets.every(s => s.status === 'aprovado')) return 'aprovada';
    if (sheets.some(s => s.status === 'aprovado')) return 'parcial';
    return 'pendente';
  };

  const chemGruposFiltrados = chemGrupos.filter(g => statusGrupoQuimico(g.sheets) !== 'aprovada');

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
  if (selectedChemGroup) {
    return <ChemicalConferenceDetail group={selectedChemGroup} onBack={() => setSelectedChemGroup(null)} onReload={loadChem} />;
  }

  const gruposFiltrados = grupos.filter(g => statusGrupo(g.sheets) !== 'aprovada');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Conferência</h1>
          <p className="page-subtitle">
            {tipoConferencia === 'Ruido'
              ? `${grupos.length} grupo${grupos.length !== 1 ? 's' : ''} · ${sheets.length} ficha${sheets.length !== 1 ? 's' : ''} no total`
              : `${chemGrupos.length} empresa${chemGrupos.length !== 1 ? 's' : ''} · ${chemSheets.length} ficha${chemSheets.length !== 1 ? 's' : ''} química${chemSheets.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => { load(); loadChem(); }}>Atualizar</button>
      </div>

      {/* Tabs Ruído / Químico */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        {[
          { id: 'Ruido', label: 'Ruído', count: gruposFiltrados.length },
          { id: 'Quimico', label: 'Químico', count: chemGruposFiltrados.length },
        ].map(tab => (
          <button key={tab.id} onClick={() => setTipoConferencia(tab.id)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              borderBottom: tipoConferencia === tab.id ? '2px solid #16a34a' : '2px solid transparent',
              marginBottom: -2,
              color: tipoConferencia === tab.id ? '#16a34a' : '#64748b',
              background: 'transparent',
            }}>
            {tab.label}
            <span style={{
              marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 20,
              background: tipoConferencia === tab.id ? '#dcfce7' : '#f1f5f9',
              color: tipoConferencia === tab.id ? '#166534' : '#64748b',
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Tab Ruído */}
      {tipoConferencia === 'Ruido' && (
        <>
          {loading && <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Carregando...</div>}

          {!loading && grupos.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ color: '#6b7280' }}>Nenhuma ficha pendente de conferência.</p>
            </div>
          )}

          {!loading && grupos.length > 0 && (
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
        </>
      )}

      {/* Tab Químico */}
      {tipoConferencia === 'Quimico' && (
        <>
          {chemLoading && <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Carregando...</div>}

          {!chemLoading && chemGrupos.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ color: '#6b7280' }}>Nenhuma ficha química encontrada.</p>
            </div>
          )}

          {!chemLoading && chemGrupos.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Fichas Químicas</th>
                    <th>Técnico(s)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {chemGruposFiltrados.map(group => (
                    <tr key={group.key} style={{ cursor: 'pointer' }} onClick={() => setSelectedChemGroup(group)}>
                      <td style={{ verticalAlign: 'middle' }}>
                        <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 14, textDecoration: 'underline' }}>
                          {group.company_nome}
                        </span>
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <span className="badge badge-blue">{group.sheets.length}</span>
                      </td>
                      <td style={{ verticalAlign: 'middle', color: '#64748b', fontSize: 13 }}>{group.tecnicos.join(', ') || '—'}</td>
                      <td style={{ verticalAlign: 'middle' }}><StatusBadge status={statusGrupoQuimico(group.sheets)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
