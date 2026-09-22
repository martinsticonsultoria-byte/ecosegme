import { useEffect, useState } from 'react';
import api from '../api/axios';
import RuidoTecnicoEditFields from './RuidoTecnicoEditFields';
import QuimicoTecnicoEditFields from './QuimicoTecnicoEditFields';

function errMsg(err, fallback) {
  const d = err?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (d && typeof d.message === 'string') return d.message;
  return fallback;
}

function ruidoForm(sheet) {
  return {
    employee_name_text: sheet.employee_nome || '',
    funcao: sheet.employee_funcao || '',
    matricula: sheet.employee_matricula || '',
    matricula_tipo: sheet.matricula_tipo || 'matricula',
    setor: sheet.employee_setor || '',
    local: sheet.employee_local || '',
    dosimeter_number: sheet.dosimeter_number ?? '',
    collection_date: sheet.collection_date || '',
    epi: sheet.epi || '',
    activity: sheet.activity || '',
    machine_noise: sheet.machine_noise || '',
  };
}

function quimicoForm(sheet) {
  return {
    employee_id: sheet.employee_id || null,
    employee_name_text: sheet.employee_nome || '',
    funcao: sheet.funcao || '',
    matricula: sheet.matricula || '',
    matricula_tipo: sheet.matricula_tipo || 'matricula',
    setor: sheet.setor || '',
    local: sheet.local || '',
    numero_ficha_campo: sheet.numero_ficha_campo || '',
    collection_date: sheet.collection_date || '',
    numero_amostrador: sheet.numero_amostrador || '',
    tipo_amostrador: sheet.tipo_amostrador || '',
    technician_name: sheet.technician_name || '',
    situacao_ambiente: sheet.situacao_ambiente || '',
    jornada_trabalho: sheet.jornada_trabalho || '',
    observacoes: sheet.observacoes || '',
  };
}

export default function MyFieldSheetEditModal({ sheet, tipo, onClose, onSaved }) {
  const isQuimico = tipo === 'Químico';
  const [form, setForm] = useState(isQuimico ? quimicoForm(sheet) : ruidoForm(sheet));
  const [initForm] = useState(isQuimico ? quimicoForm(sheet) : ruidoForm(sheet));
  const [epiOptions, setEpiOptions] = useState([]);
  const [numeroOptions, setNumeroOptions] = useState([]);
  const [tipoOptions, setTipoOptions] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (isQuimico) {
      api.get('/amostradores?categoria=numero').then(r => { if (!cancelled) setNumeroOptions(r.data); }).catch(() => {});
      api.get('/amostradores?categoria=tipo').then(r => { if (!cancelled) setTipoOptions(r.data); }).catch(() => {});
    } else {
      api.get('/epis').then(r => { if (!cancelled) setEpiOptions(r.data); }).catch(() => {});
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setBusy(true);
    setError('');
    try {
      if (isQuimico) {
        const payload = {};
        Object.keys(form).forEach(k => {
          if (k === 'employee_id') return;
          if (form[k] !== initForm[k]) payload[k] = form[k] === '' ? null : form[k];
        });
        if (Object.keys(payload).length > 0) {
          await api.patch(`/chemical-field-sheets/${sheet.id}`, payload);
        }
      } else {
        const payload = {};
        Object.keys(form).forEach(k => {
          if (form[k] !== initForm[k]) payload[k] = form[k] === '' ? null : form[k];
        });
        if (Object.keys(payload).length > 0) {
          await api.patch(`/field-sheets/${sheet.id}/edit`, payload);
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(errMsg(err, 'Erro ao salvar ficha'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 8, maxWidth: 800, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Editar ficha {tipo}</div>
          <button onClick={onClose} disabled={busy} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: 20 }}>
          {isQuimico ? (
            <QuimicoTecnicoEditFields
              form={form}
              setForm={setForm}
              matriculaTipo={form.matricula_tipo}
              numeroOptions={numeroOptions}
              setNumeroOptions={setNumeroOptions}
              tipoOptions={tipoOptions}
              setTipoOptions={setTipoOptions}
            />
          ) : (
            <RuidoTecnicoEditFields
              form={form}
              setForm={setForm}
              epiOptions={epiOptions}
              setEpiOptions={setEpiOptions}
            />
          )}
          {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={busy}>
            {busy ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
