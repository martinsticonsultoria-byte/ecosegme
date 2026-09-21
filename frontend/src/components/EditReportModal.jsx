import { useEffect, useState } from 'react';
import api from '../api/axios';
import RuidoFichaFields from './RuidoFichaFields';
import QuimicoFichaFields from './QuimicoFichaFields';

const DATE_FIELDS = ['data_relatorio', 'collection_date', 'signature_date'];
const SECTION_TITLE = { fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 };

function calcVolume(horaInicial, horaFinal, vazao) {
  if (!horaInicial || !horaFinal || vazao === '' || vazao === undefined || vazao === null) return null;
  const [h1, m1] = horaInicial.split(':').map(Number);
  const [h2, m2] = horaFinal.split(':').map(Number);
  if ([h1, m1, h2, m2].some(Number.isNaN)) return null;
  let minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (minutos < 0) minutos += 24 * 60;
  const v = parseFloat(String(vazao).replace(',', '.'));
  if (Number.isNaN(v)) return null;
  return Math.round(v * minutos * 100) / 100;
}

function ruidoForm(sheet) {
  return {
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
    equipamentos_texto: sheet.equipamentos_texto || '',
    config_dosimetro_texto: sheet.config_dosimetro_texto || '',
    dosimeter_number: sheet.dosimeter_number || '',
    tipo_analise: sheet.tipo_analise || 'Ruído',
    funcao: sheet.employee_funcao || '',
    matricula: sheet.employee_matricula || '',
    matricula_tipo: sheet.matricula_tipo || 'matricula',
    setor: sheet.employee_setor || '',
    local: sheet.employee_local || '',
  };
}

// objetivo_texto / abreviacoes_texto ficam fora do form: são tratados uma vez para o relatório todo.
function quimicoForm(sheet) {
  return {
    laudo_number: sheet.laudo_number || '',
    data_relatorio: sheet.data_relatorio || '',
    conclusao_texto: sheet.conclusao_texto || '',
    technician_name: sheet.technician_name || '',
    collection_date: sheet.collection_date || '',
    employee_name_text: sheet.employee_nome || '',
    funcao: sheet.funcao || '',
    matricula: sheet.matricula || '',
    setor: sheet.setor || '',
    local: sheet.local || '',
    numero_amostrador: sheet.numero_amostrador || '',
    tipo_amostrador: sheet.tipo_amostrador || '',
    situacao_ambiente: sheet.situacao_ambiente || '',
    observacoes: sheet.observacoes || '',
    notas_texto: sheet.notas_texto || '',
    referencias_texto: sheet.referencias_texto || '',
  };
}

function agentsState(sheet) {
  const out = {};
  (sheet.agents || []).forEach(a => {
    out[a.agent_id] = {
      valor: a.valor_encontrado || a.agent?.resultado_planilha || '',
      nr15: a.nr15_valor ?? a.agent?.nr15_valor ?? '',
      bases: a.bases_efeitos_criticos ?? a.agent?.efeito_critico ?? '',
    };
  });
  return out;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function errMsg(err, fallback) {
  const d = err?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (d && typeof d.message === 'string') return d.message;
  return fallback;
}

export default function EditReportModal({ report, companyId, onClose, onSaved }) {
  const isQuimico = /qu[ií]mic/i.test(report.tipo_analise || '');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [items, setItems] = useState([]);
  const [missing, setMissing] = useState(0);
  const [objetivo, setObjetivo] = useState('');
  const [abreviacoes, setAbreviacoes] = useState('');
  const [globalInit, setGlobalInit] = useState({ objetivo: '', abreviacoes: '' });
  const [epiOptions, setEpiOptions] = useState([]);
  const [numeroOptions, setNumeroOptions] = useState([]);
  const [tipoOptions, setTipoOptions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/epis').then(r => { if (!cancelled) setEpiOptions(r.data); }).catch(() => {});
    if (isQuimico) {
      api.get('/amostradores?categoria=numero').then(r => { if (!cancelled) setNumeroOptions(r.data); }).catch(() => {});
      api.get('/amostradores?categoria=tipo').then(r => { if (!cancelled) setTipoOptions(r.data); }).catch(() => {});
    }
    const url = isQuimico
      ? `/chemical-field-sheets?company_id=${companyId}`
      : `/field-sheets?company_id=${companyId}&tipo_analise=${encodeURIComponent(report.tipo_analise)}`;
    api.get(url).then(res => {
      if (cancelled) return;
      const byId = new Map(res.data.map(s => [s.id, s]));
      const found = report.sheet_ids.map(i => byId.get(i)).filter(Boolean);
      setMissing(report.sheet_ids.length - found.length);
      if (isQuimico) {
        const firstNonEmpty = (k) => (found.find(s => (s[k] || '').trim()) || {})[k] || '';
        const obj = firstNonEmpty('objetivo_texto');
        const abr = firstNonEmpty('abreviacoes_texto');
        setObjetivo(obj); setAbreviacoes(abr); setGlobalInit({ objetivo: obj, abreviacoes: abr });
      }
      setItems(found.map(s => {
        const form = isQuimico ? quimicoForm(s) : ruidoForm(s);
        const vol = { hora_inicial: (s.hora_inicial || '').slice(0, 5), hora_final: (s.hora_final || '').slice(0, 5), vazao: s.vazao ?? '' };
        const ag = isQuimico ? agentsState(s) : {};
        return {
          id: s.id, sheet: s, form, initForm: form, vol, initVol: vol, ag, initAg: ag,
          agentList: s.agents || [], objInit: s.objetivo_texto || '', abrInit: s.abreviacoes_texto || '',
          open: found.length === 1, error: '',
        };
      }));
      setLoading(false);
    }).catch(err => {
      if (cancelled) return;
      setLoadError(errMsg(err, 'Erro ao carregar as fichas do relatório.'));
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchItem = (id, fn) => setItems(list => list.map(it => it.id === id ? { ...it, ...(typeof fn === 'function' ? fn(it) : fn) } : it));

  const globalChanged = isQuimico && (objetivo !== globalInit.objetivo || abreviacoes !== globalInit.abreviacoes);
  const agentsDirty = (it) => Object.keys(it.ag).filter(k => !same(it.ag[k], it.initAg[k]));
  const itemDirty = (it) => !same(it.form, it.initForm) || !same(it.vol, it.initVol) || agentsDirty(it).length > 0;
  const needsGlobal = (it) => globalChanged && (objetivo !== it.objInit || abreviacoes !== it.abrInit);
  const anyDirty = items.some(itemDirty) || globalChanged;

  const requestClose = () => {
    if (busy) return;
    if (anyDirty && !window.confirm('Há alterações não salvas. Deseja fechar mesmo assim?')) return;
    onClose();
  };

  const handleSave = async () => {
    setBusy(true);
    setGlobalError('');
    setItems(list => list.map(it => ({ ...it, error: '' })));
    const fail = (id, msg) => { patchItem(id, { error: msg, open: true }); setBusy(false); };

    // 1) PATCH só do que mudou, em sequência
    for (const it of items) {
      const formDirty = !same(it.form, it.initForm);
      const volDirty = isQuimico && !same(it.vol, it.initVol);
      const glob = isQuimico && needsGlobal(it);
      if (formDirty || volDirty || glob) {
        try {
          const payload = { ...it.form };
          delete payload.laudo_number;
          delete payload.tipo_analise;
          if (isQuimico) {
            DATE_FIELDS.forEach(k => { if (k in payload && payload[k] === '') payload[k] = null; });
            if (volDirty) {
              const vz = String(it.vol.vazao ?? '').replace(',', '.');
              payload.hora_inicial = it.vol.hora_inicial || null;
              payload.hora_final = it.vol.hora_final || null;
              payload.vazao = vz === '' || Number.isNaN(parseFloat(vz)) ? null : parseFloat(vz);
            }
            if (glob) { payload.objetivo_texto = objetivo; payload.abreviacoes_texto = abreviacoes; }
            await api.patch(`/chemical-field-sheets/${it.id}`, payload);
          } else {
            if (it.form.epi) api.post('/epis', { name: it.form.epi }).then(res => {
              setEpiOptions(prev => prev.some(o => o.name === it.form.epi) ? prev : [...prev, { id: res.data.id, name: res.data.name }]);
            }).catch(() => {});
            await api.patch(`/field-sheets/${it.id}/edit?allow_approved=true`, payload);
          }
          patchItem(it.id, cur => ({
            initForm: it.form, initVol: it.vol,
            objInit: glob ? objetivo : cur.objInit, abrInit: glob ? abreviacoes : cur.abrInit,
          }));
        } catch (err) {
          return fail(it.id, errMsg(err, 'Erro ao salvar a ficha.'));
        }
      }
      if (isQuimico) {
        for (const aid of agentsDirty(it)) {
          const cur = it.ag[aid], ini = it.initAg[aid];
          const payload = {};
          const valorChanged = cur.valor !== ini.valor, nrChanged = cur.nr15 !== ini.nr15;
          if (valorChanged || nrChanged) payload.valor_encontrado = cur.valor;
          if (nrChanged) payload.nr15_valor = cur.nr15;
          if (cur.bases !== ini.bases) payload.bases_efeitos_criticos = cur.bases;
          try {
            await api.patch(`/chemical-field-sheets/${it.id}/agents/${aid}`, payload);
            patchItem(it.id, c => ({ initAg: { ...c.initAg, [aid]: cur } }));
          } catch (err) {
            return fail(it.id, errMsg(err, 'Erro ao salvar agente.'));
          }
        }
      }
    }

    // 3) Regerar substituindo o antigo
    try {
      let res;
      if (isQuimico) {
        const p = new URLSearchParams({ company_id: companyId });
        items.forEach(it => p.append('field_sheet_ids', it.id));
        p.append('replace_id', report.id);
        res = await api.get(`/chemical-field-sheets/report/pdf?${p}`, { responseType: 'blob' });
      } else {
        const p = new URLSearchParams({ company_id: companyId, tipo_analise: report.tipo_analise });
        items.forEach(it => p.append('field_sheet_ids', it.id));
        p.append('replace_id', report.id);
        res = await api.get(`/reports/generate-bulk-pdf?${p}`, { responseType: 'blob' });
      }
      let filename = report.filename;
      const cd = res.headers?.['content-disposition'];
      const m = cd && /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
      if (m) { try { filename = decodeURIComponent(m[1]); } catch { filename = m[1]; } }
      const blobUrl = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = filename; a.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      let detail = '';
      if (err.response?.data instanceof Blob) {
        try { detail = JSON.parse(await err.response.data.text()).detail || ''; } catch {}
      }
      setGlobalError('Alterações salvas nas fichas, mas houve erro ao gerar o PDF — tente novamente.' + (typeof detail === 'string' && detail ? ` (${detail})` : ''));
      setBusy(false);
      return;
    }

    // 4) Recarregar a lista
    try {
      const updated = await api.get(`/reports/consolidated/${companyId}`);
      onSaved(updated.data);
    } catch {
      onSaved(null);
    }
    setBusy(false);
    onClose();
  };

  const inputStyle = { width: '100%' };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 8, padding: 24, maxWidth: 1000, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Editar relatório</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>{report.filename}</div>
        <div style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 10px', marginBottom: 12 }}>
          As alterações são salvas nas fichas e o relatório será gerado novamente, substituindo o atual.
        </div>

        <div style={{ overflowY: 'auto', flex: 1, marginBottom: 16, paddingRight: 4 }}>
          {loading && <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>Carregando fichas...</div>}
          {!loading && loadError && <div style={{ color: '#dc2626', fontSize: 13, padding: 12 }}>{loadError}</div>}
          {!loading && !loadError && items.length === 0 && (
            <div style={{ color: '#dc2626', fontSize: 13, padding: 12 }}>As fichas deste relatório não existem mais. Não é possível editá-lo.</div>
          )}
          {!loading && missing > 0 && items.length > 0 && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
              {missing} ficha(s) deste relatório não existem mais e serão ignoradas.
            </div>
          )}

          {isQuimico && items.length > 0 && (
            <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12 }}>
              <div style={SECTION_TITLE}>Textos do relatório (valem para o relatório inteiro)</div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">Objetivo</label>
                <textarea className="form-input" rows={5} style={inputStyle} value={objetivo} onChange={e => setObjetivo(e.target.value)}
                  placeholder="Deixe em branco para usar o texto padrão do relatório." />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Abreviações</label>
                <textarea className="form-input" rows={5} style={inputStyle} value={abreviacoes} onChange={e => setAbreviacoes(e.target.value)}
                  placeholder="Deixe em branco para usar a lista padrão do relatório." />
              </div>
            </div>
          )}

          {items.map(it => {
            const s = it.sheet;
            const titulo = `${s.laudo_number || 'S/Nº'}.${s.laudo_y || '?'}/${new Date().getFullYear()} — ${s.employee_nome || '—'}`;
            const dirty = itemDirty(it);
            const volCalc = calcVolume(it.vol.hora_inicial, it.vol.hora_final, it.vol.vazao);
            return (
              <div key={it.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
                <div onClick={() => patchItem(it.id, c => ({ open: !c.open }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer', background: '#f8fafc', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{it.open ? '▼' : '▶'}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{titulo}</span>
                  {dirty && <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', background: '#fef3c7', borderRadius: 10, padding: '1px 8px' }}>alterada</span>}
                  {it.error && <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>erro</span>}
                </div>
                {it.error && <div style={{ color: '#dc2626', fontSize: 12, padding: '6px 12px' }}>{it.error}</div>}
                {it.open && (
                  <div style={{ padding: 12 }}>
                    {isQuimico ? (
                      <QuimicoFichaFields form={it.form} setForm={fn => patchItem(it.id, c => ({ form: typeof fn === 'function' ? fn(c.form) : fn }))}
                        laudoY={s.laudo_y} matriculaTipo={s.matricula_tipo}
                        numeroOptions={numeroOptions} setNumeroOptions={setNumeroOptions}
                        tipoOptions={tipoOptions} setTipoOptions={setTipoOptions}
                        hideLaudoNumber hideObjetivoAbreviacoes />
                    ) : (
                      <RuidoFichaFields form={it.form} setForm={fn => patchItem(it.id, c => ({ form: typeof fn === 'function' ? fn(c.form) : fn }))}
                        epiOptions={epiOptions} setEpiOptions={setEpiOptions}
                        hideLaudoNumber hideTipoAnalise />
                    )}
                    {isQuimico && (
                      <>
                        <div style={{ ...SECTION_TITLE, marginTop: 4 }}>Volume amostrado</div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
                          {[['hora_inicial', 'Hora Inicial', 'time', 110], ['hora_final', 'Hora Final', 'time', 110], ['vazao', 'Vazão (L/min)', 'text', 100]].map(([k, label, type, w]) => (
                            <div key={k} className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">{label}</label>
                              <input type={type} inputMode={k === 'vazao' ? 'decimal' : undefined} className="form-input" style={{ width: w }}
                                value={it.vol[k]} placeholder={k === 'vazao' ? 'Ex: 1,5' : undefined}
                                onChange={e => patchItem(it.id, c => ({ vol: { ...c.vol, [k]: e.target.value } }))} />
                            </div>
                          ))}
                          <div style={{ fontSize: 13, color: '#166534', fontWeight: 600, paddingBottom: 8 }}>
                            Volume: {volCalc !== null ? `${volCalc} L` : '—'}
                          </div>
                        </div>
                        <div style={SECTION_TITLE}>Agentes</div>
                        {it.agentList.length === 0 ? (
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>Nenhum agente vinculado.</div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr style={{ background: '#f8fafc' }}>
                                {['Agente', 'Valor Encontrado', 'NR-15', 'Bases de Efeitos Críticos'].map(h => (
                                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {it.agentList.map(a => {
                                const v = it.ag[a.agent_id] || { valor: '', nr15: '', bases: '' };
                                const setAg = (k, val) => patchItem(it.id, c => ({ ag: { ...c.ag, [a.agent_id]: { ...c.ag[a.agent_id], [k]: val } } }));
                                return (
                                  <tr key={a.agent_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '6px 8px', fontWeight: 500 }}>{a.agent?.nome || `Agente ${a.agent_id}`}</td>
                                    <td style={{ padding: '6px 8px' }}><input className="form-input" value={v.valor} onChange={e => setAg('valor', e.target.value)} /></td>
                                    <td style={{ padding: '6px 8px' }}><input className="form-input" value={v.nr15} onChange={e => setAg('nr15', e.target.value)} /></td>
                                    <td style={{ padding: '6px 8px' }}><input className="form-input" value={v.bases} onChange={e => setAg('bases', e.target.value)} /></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {globalError && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{globalError}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={requestClose} disabled={busy}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={busy || loading || items.length === 0}>
            {busy ? 'Gerando…' : 'Salvar e gerar novo relatório'}
          </button>
        </div>
      </div>
    </div>
  );
}
