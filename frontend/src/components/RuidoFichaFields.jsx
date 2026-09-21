import EpiInput from './EpiInput';

const SECTION_TITLE = { fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 };
const HINT = { fontWeight: 400, color: '#94a3b8' };

export default function RuidoFichaFields({ form: editForm, setForm: setEditForm, epiOptions, setEpiOptions, hideLaudoNumber = false, hideTipoAnalise = false }) {
  return (
    <>
      <div style={SECTION_TITLE}>Identificação</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Nº do Laudo</label>
          {hideLaudoNumber ? (
            <div style={{ color: '#666', fontWeight: 500, fontSize: 13 }}>{editForm.laudo_number}</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input className="form-input" type="text" inputMode="numeric" pattern="[0-9]*" value={editForm.laudo_number} onChange={e => setEditForm(f => ({ ...f, laudo_number: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="Ex: 047 ou 345" style={{ width: '110px' }} />
            </div>
          )}
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
        {!hideTipoAnalise && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipo de Análise</label>
            <select className="form-input" value={editForm.tipo_analise} onChange={e => setEditForm(f => ({ ...f, tipo_analise: e.target.value }))}>
              <option>Ruído</option>
              <option>Calor</option>
              <option>Químico</option>
            </select>
          </div>
        )}
      </div>

      <div style={SECTION_TITLE}>Funcionário</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Cargo/Função</label>
          <input className="form-input" value={editForm.funcao} onChange={e => setEditForm(f => ({ ...f, funcao: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">{editForm.matricula_tipo === 'cpf' ? 'CPF' : 'Matrícula'}</label>
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

      <div style={SECTION_TITLE}>Técnico e Condições</div>
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
          <EpiInput
            value={editForm.epi}
            onChange={val => setEditForm(f => ({ ...f, epi: val }))}
            options={epiOptions}
            setOptions={setEpiOptions} />
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
          <label className="form-label">Equipamentos Utilizados <span style={HINT}>(opcional — substitui o texto padrão no PDF)</span></label>
          <textarea className="form-input" rows={2} value={editForm.equipamentos_texto} onChange={e => setEditForm(f => ({ ...f, equipamentos_texto: e.target.value }))} placeholder="Deixe em branco para usar o texto padrão." />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Configuração do Dosímetro <span style={HINT}>(opcional — substitui o texto padrão no PDF)</span></label>
          <textarea className="form-input" rows={2} value={editForm.config_dosimetro_texto} onChange={e => setEditForm(f => ({ ...f, config_dosimetro_texto: e.target.value }))} placeholder="Deixe em branco para usar o texto padrão." />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Conclusão Personalizada <span style={HINT}>(opcional — substitui o texto automático no PDF)</span></label>
          <textarea className="form-input" rows={3} value={editForm.conclusao_texto} onChange={e => setEditForm(f => ({ ...f, conclusao_texto: e.target.value }))} placeholder="Deixe em branco para usar o texto automático gerado pelo sistema." />
        </div>
      </div>
    </>
  );
}
