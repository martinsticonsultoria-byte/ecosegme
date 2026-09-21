import CatalogInput from './CatalogInput';

const SECTION_TITLE = { fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 };
const HINT = { fontWeight: 400, color: '#94a3b8' };

// matriculaTipo: opcional; se ausente usa form.matricula_tipo (Conference passa sheet.matricula_tipo).
export default function QuimicoFichaFields({ form: editForm, setForm: setEditForm, laudoY, matriculaTipo, numeroOptions, setNumeroOptions, tipoOptions, setTipoOptions, hideLaudoNumber = false, hideObjetivoAbreviacoes = false }) {
  const matTipo = matriculaTipo !== undefined ? matriculaTipo : editForm.matricula_tipo;
  return (
    <>
      <div style={SECTION_TITLE}>Identificação do Laudo</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Nº do Laudo</label>
          {hideLaudoNumber ? (
            <div style={{ color: '#666', fontWeight: 500, fontSize: 13 }}>{editForm.laudo_number}.{laudoY || '?'}/{new Date().getFullYear()}</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input className="form-input" type="text" inputMode="numeric" pattern="[0-9]*"
                value={editForm.laudo_number}
                onChange={e => setEditForm(f => ({ ...f, laudo_number: e.target.value.replace(/[^0-9]/g, '') }))}
                placeholder="Ex: 047" style={{ width: '100px' }} />
              <span style={{ color: '#666', fontWeight: 500, fontSize: 13 }}>.{laudoY || '?'}/{new Date().getFullYear()}</span>
            </div>
          )}
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
      </div>

      <div style={SECTION_TITLE}>Dados do Funcionário</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Nome do Funcionário</label>
          <input className="form-input" value={editForm.employee_name_text}
            onChange={e => setEditForm(f => ({ ...f, employee_name_text: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Cargo/Função</label>
          <input className="form-input" value={editForm.funcao}
            onChange={e => setEditForm(f => ({ ...f, funcao: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">{matTipo === 'cpf' ? 'CPF' : 'Matrícula'}</label>
          <input className="form-input" value={editForm.matricula}
            onChange={e => setEditForm(f => ({ ...f, matricula: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Setor</label>
          <input className="form-input" value={editForm.setor}
            onChange={e => setEditForm(f => ({ ...f, setor: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Local</label>
          <input className="form-input" value={editForm.local}
            onChange={e => setEditForm(f => ({ ...f, local: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Técnico Responsável</label>
          <input className="form-input" value={editForm.technician_name}
            onChange={e => setEditForm(f => ({ ...f, technician_name: e.target.value }))} />
        </div>
      </div>

      <div style={SECTION_TITLE}>Dados da Coleta</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Nº do Amostrador</label>
          <CatalogInput categoria="numero" value={editForm.numero_amostrador || ''}
            onChange={v => setEditForm(f => ({ ...f, numero_amostrador: v }))}
            options={numeroOptions} setOptions={setNumeroOptions} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Tipo de Amostrador</label>
          <CatalogInput categoria="tipo" value={editForm.tipo_amostrador || ''}
            onChange={v => setEditForm(f => ({ ...f, tipo_amostrador: v }))}
            options={tipoOptions} setOptions={setTipoOptions} />
        </div>
        <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
          <label className="form-label">Situação do Ambiente</label>
          <input className="form-input" value={editForm.situacao_ambiente}
            onChange={e => setEditForm(f => ({ ...f, situacao_ambiente: e.target.value }))} />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label">Observações</label>
        <textarea className="form-input" rows={2} value={editForm.observacoes}
          onChange={e => setEditForm(f => ({ ...f, observacoes: e.target.value }))} />
      </div>
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label">Conclusão <span style={HINT}>(opcional — substitui o texto automático no PDF)</span></label>
        <textarea className="form-input" rows={3} value={editForm.conclusao_texto}
          onChange={e => setEditForm(f => ({ ...f, conclusao_texto: e.target.value }))}
          placeholder="Deixe em branco para usar o texto automático gerado pelo sistema." />
      </div>
      {!hideObjetivoAbreviacoes && (
        <>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Objetivo <span style={HINT}>(opcional — separe os parágrafos com uma linha em branco)</span></label>
            <textarea className="form-input" rows={6} value={editForm.objetivo_texto}
              onChange={e => setEditForm(f => ({ ...f, objetivo_texto: e.target.value }))}
              placeholder="Deixe em branco para usar o texto padrão do relatório." />
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Abreviações <span style={HINT}>(uma por linha, formato Termo: significado)</span></label>
            <textarea className="form-input" rows={6} value={editForm.abreviacoes_texto}
              onChange={e => setEditForm(f => ({ ...f, abreviacoes_texto: e.target.value }))}
              placeholder="Deixe em branco para usar a lista padrão do relatório." />
          </div>
        </>
      )}
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label">Notas <span style={HINT}>(opcional — substitui o texto padrão no PDF)</span></label>
        <textarea className="form-input" rows={3} value={editForm.notas_texto}
          onChange={e => setEditForm(f => ({ ...f, notas_texto: e.target.value }))}
          placeholder="Deixe em branco para usar o texto padrão do relatório." />
      </div>
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label">Referências <span style={HINT}>(uma por linha)</span></label>
        <textarea className="form-input" rows={5} value={editForm.referencias_texto}
          onChange={e => setEditForm(f => ({ ...f, referencias_texto: e.target.value }))}
          placeholder="Deixe em branco para usar as referências padrão do relatório." />
      </div>
    </>
  );
}
