# Claude Code — Guia de Implementação: Feature Químico

> **Leia este arquivo inteiro antes de qualquer ação.**
> Você está implementando a Feature Químico (RFC-Q0) no sistema EcoSegme.
> Esta feature adiciona monitoramento de agentes químicos ocupacionais ao sistema existente.

---

## PASSO 0 — Leitura obrigatória antes de começar

Execute nesta ordem, sem pular:

```
1. Ler: backend/app/  (estrutura geral — models/, routers/, schemas/)
2. Ler: CLAUDE.md  (regras absolutas do projeto)
3. Ler: ECOSEGME_DOCUMENTATION.md  (arquitetura completa + spec Feature Químico — seção 18)
4. Ler: RFC-Q0_Feature_Quimico_Fase0.md  (em C:\Users\Edu Marafiga\Claude\Projects\Software Development\)
5. Ler: frontend/src/index.css  (design system completo — use como referência única de estilos)
6. Ler: frontend/src/pages/Conference.jsx  (padrão de tabela, edição inline, modais, botões)
7. Ler: frontend/src/pages/CompanyDetail.jsx  (padrão de abas, listagens, modais de geração)
8. Ler: frontend/src/pages/FieldSheetForm.jsx  (padrão de formulário de criação)
9. Ler: backend/app/models/field_sheet.py  (modelo de referência para novos modelos)
10. Ler: backend/app/routers/field_sheets.py  (router de referência para novos routers)
```

---

## DESIGN SYSTEM — Regras absolutas de UI

> Toda nova tela, componente e elemento deve usar exclusivamente estes tokens.
> Nunca inventar cores, fontes ou tamanhos novos. Nunca usar Tailwind ou outras libs CSS.
> Tudo em inline style (padrão do projeto) ou classes CSS já existentes em index.css.

### Tokens de cor (CSS variables em index.css)

```css
--green:        #16a34a   /* cor primária — botões, links ativos, labels de seção */
--green-dark:   #15803d   /* hover do primário */
--green-light:  #f0fdf4   /* fundo de painéis/seções ativas */
--green-muted:  #dcfce7   /* badges de status positivo */
--text:         #0f172a   /* texto principal */
--text-2:       #64748b   /* texto secundário, labels */
--text-3:       #94a3b8   /* placeholders, texto terciário */
--bg:           #ffffff   /* fundo de cards */
--bg-subtle:    #f8fafc   /* fundo da página */
--border:       #e2e8f0   /* borda padrão */
--border-light: #f1f5f9   /* borda suave */
--radius:       10px      /* border-radius padrão */
--radius-lg:    14px      /* border-radius de cards */
--radius-full:  999px     /* border-radius de botões pill e badges */
```

### Tipografia

```
Família: Inter (Google Fonts) — já importada no index.css
Monospace: JetBrains Mono — usar apenas para valores técnicos (ex: ppm, dB)

Tamanhos usados no projeto:
  11px — cabeçalho de tabela (th), badges, labels superiores de seção
  12px — texto denso em tabelas (td secundário)
  13px — botões, labels de formulário, links de navegação
  14px — texto de tabela principal (td)
  28px / font-weight: 800 — título de página (.page-title)
```

### Botões — usar APENAS estas classes/estilos

```jsx
// Primário (ação principal da página)
<button className="btn btn-primary">Texto</button>

// Secundário (ação alternativa)
<button className="btn btn-secondary">Texto</button>

// Pequeno (dentro de tabelas e linhas)
<button className="btn btn-primary btn-sm">Texto</button>
<button className="btn btn-secondary btn-sm">Texto</button>

// Perigo (excluir)
<button className="btn btn-danger btn-sm">Excluir</button>

// Excluir ficha (padrão específico do projeto)
<button style={{ background: '#FADADD', color: '#8B0000', border: 'none',
  borderRadius: 'var(--radius-full)', padding: '5px 14px',
  fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
  Excluir Ficha
</button>

// Botão desabilitado — sempre usar prop disabled + className btn
<button className="btn btn-primary" disabled={!condicao}>...</button>
```

### Badges de status — padrões do projeto + novos para Químico

```jsx
// Ficha status
aprovada:      { bg: '#dcfce7', color: '#166534' }
pendente:      { bg: '#fef9c3', color: '#854d0e' }

// Resultado de agente químico (NOVO — seguir mesma lógica visual)
dentro_limite:  { bg: '#dcfce7', color: '#166534', label: 'Dentro do Limite' }
acima_limite:   { bg: '#fee2e2', color: '#991b1b', label: 'Acima do Limite' }
nao_detectado:  { bg: '#f1f5f9', color: '#64748b', label: 'Não Detectado' }
pendente:       { bg: '#fef9c3', color: '#854d0e', label: 'Pendente' }

// Renderização padrão de badge:
<span style={{
  padding: '2px 10px', borderRadius: 20,
  fontSize: 11, fontWeight: 600,
  background: s.bg, color: s.color
}}>{s.label}</span>
```

### Estrutura de página (layout padrão)

```jsx
<div className="page">
  <div className="page-header">
    <div>
      <h1 className="page-title">Título</h1>
      <p className="page-subtitle">Subtítulo opcional</p>
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      {/* botões de ação da página */}
    </div>
  </div>

  <div className="card">
    {/* conteúdo */}
  </div>
</div>
```

### Tabelas — padrão exato

```jsx
<div className="card" style={{ padding: 0, overflowX: 'auto' }}>
  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: X }}>
    <thead>
      <tr>
        <th style={{ background: '#f8fafc', padding: '8px 10px', fontWeight: 600,
          fontSize: 11, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>
          COLUNA
        </th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style={{ padding: '8px 10px', fontSize: 12, borderBottom: '1px solid #f1f5f9' }}>
          valor
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Seções de edição inline (expandidas abaixo da linha da tabela)

```jsx
// Padrão dos painéis que expandem ao clicar em editar (Conference.jsx)
<td colSpan={N} style={{ padding: '14px 16px', background: '#f8fff8', borderBottom: '2px solid #bbf7d0' }}>
  <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a',
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
    NOME DA SEÇÃO
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label">Campo</label>
      <input className="form-input" ... />
    </div>
  </div>
</td>
```

### Modais — padrão do projeto

```jsx
{modalAberto && (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  }}>
    <div style={{
      background: 'white', borderRadius: 14, padding: 28,
      width: 520, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
    }}>
      <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Título do Modal</h3>
      {/* conteúdo */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={() => setModalAberto(false)}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleConfirmar}>Confirmar</button>
      </div>
    </div>
  </div>
)}
```

### Formulários — campos padrão

```jsx
<div className="form-group">
  <label className="form-label">Nome do Campo <span>*</span></label>
  <input className="form-input" type="text" value={val} onChange={e => setVal(e.target.value)} />
</div>

// Select padrão
<select className="form-input" value={val} onChange={e => setVal(e.target.value)}>
  <option value="">Selecione...</option>
</select>
```

### Alertas inline

```jsx
<div className="alert alert-warning">Texto de aviso</div>
<div className="alert alert-success">Texto de sucesso</div>
<div className="alert alert-error">Texto de erro</div>
```

---

## ANTI-PADRÕES — NUNCA FAZER

```
❌ Não criar novos arquivos CSS ou importar libs de estilo externas
❌ Não usar Tailwind, Bootstrap, Material UI ou qualquer outra lib de componentes
❌ Não inventar cores fora dos tokens acima
❌ Não recriar componentes que já existem — importar e reutilizar
❌ Não alterar index.css ou App.css — apenas usar as classes existentes
❌ Não usar font-size abaixo de 11px ou acima de 14px em tabelas/formulários
❌ Não usar border-radius diferente dos valores definidos nas variáveis
❌ Não colocar botões com padding maior que o padrão .btn em tabelas
❌ Não criar páginas sem a estrutura .page > .page-header + .card
❌ Não usar alert() do browser para erros — usar estado de erro renderizado no JSX
❌ Não alterar laudo.html (template de laudo individual de Ruído)
❌ Não alterar generate_bulk() — apenas generate_bulk_pdf()
❌ Não misturar dois ajustes no mesmo commit
```

---

## IMPLEMENTAÇÃO — 6 FASES SEQUENCIAIS

> **Regra:** Implementar uma fase por vez. Só avançar após o usuário validar.
> A cada fase: ler os arquivos indicados, implementar, testar localmente, reportar.

---

### FASE 0 — Banco de dados (Backend only)

**Objetivo:** Criar as 3 novas tabelas e os endpoints básicos de CRUD.
**Risco:** Médio — migrations são irreversíveis em produção.
**Git:** 1 commit por migration. Nunca agrupar M1+M2+M3 num único commit.

#### M1 — `chemical_agents`

Criar migration Alembic:
```
alembic revision --autogenerate -m "add_chemical_agents"
```

Modelo (`backend/app/models/chemical_agent.py`):
```python
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base

class ChemicalAgent(Base):
    __tablename__ = "chemical_agents"
    id             = Column(Integer, primary_key=True)
    nome           = Column(String(200), nullable=False, index=True)
    esocial        = Column(String(100))
    unidade        = Column(String(20))        # ppm, mg/m³, f/cc
    acgih_twa      = Column(String(20))        # numérico ou '-'
    acgih_stel     = Column(String(20))
    nr15_valor     = Column(String(20))        # numérico ou '-'
    efeito_critico = Column(Text)
    amostrador     = Column(String(150))
    metodo         = Column(String(150))       # ex: Método NIOSH 1501
    metodo_analise = Column(String(100))       # ex: Cromatografia
    vazao          = Column(String(50))
    volume         = Column(String(50))
    lq             = Column(String(50))        # Limite de Quantificação
    numero_cas     = Column(String(50), index=True)
    updated_at     = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at     = Column(TIMESTAMP(timezone=True), server_default=func.now())
```

#### M2 — `chemical_field_sheets`

```python
from sqlalchemy import Column, Integer, String, Text, Date, Numeric, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base

class ChemicalFieldSheet(Base):
    __tablename__ = "chemical_field_sheets"
    id                  = Column(Integer, primary_key=True)
    # Empresa e técnico
    company_id          = Column(Integer, ForeignKey("companies.id"), nullable=False)
    technician_name     = Column(String(150), nullable=False)
    collection_date     = Column(Date, nullable=False)
    # Funcionário
    employee_id         = Column(Integer, ForeignKey("employees.id"), nullable=True)
    employee_name_text  = Column(String(150))
    funcao              = Column(String(100), nullable=False)
    matricula           = Column(String(50), nullable=False)
    setor               = Column(String(150), nullable=False)
    local               = Column(String(100), nullable=False)
    # Amostragem obrigatória
    numero_amostrador   = Column(String(100), nullable=False)
    tipo_amostrador     = Column(String(100), nullable=False)
    situacao_ambiente   = Column(Text, nullable=False)
    # Opcionais
    atividade           = Column(Text)
    frequencia          = Column(String(150))
    tempo_exposicao_h   = Column(Numeric(5, 2))
    jornada_trabalho    = Column(String(50))    # ex: "44 Horas/Semanais"
    volume_ar_amostrado = Column(String(50))    # ex: "12,5 L"
    epi                 = Column(Text)
    observacoes         = Column(Text)
    # Laudo e status
    laudo_number        = Column(String(50))
    laudo_y             = Column(Integer)
    tipo_analise        = Column(String(50), nullable=False, default='Químico')
    status              = Column(String(20), nullable=False, default='pendente')
    data_relatorio      = Column(Date)
    signature_date      = Column(Date)
    conclusao_texto     = Column(Text, default=(
        "De acordo com os resultados encontrados é possível afirmar que as concentrações "
        "dos agentes monitorados, encontram-se dentro dos limites exigidos pelas referências "
        "acima, índices esses também aceitos pela Associação Brasileira de Higienistas "
        "Ocupacionais - ABHO e Ministério do Trabalho e Emprego."
    ))
    # Pré-preenchido no backend ao criar. Admin edita na Conferência. PDF usa este valor.
    created_by          = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at          = Column(TIMESTAMP(timezone=True), server_default=func.now())
```

#### M3 — `chemical_sheet_agents`

```python
from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base

class ChemicalSheetAgent(Base):
    __tablename__ = "chemical_sheet_agents"
    id                = Column(Integer, primary_key=True)
    chemical_sheet_id = Column(Integer, ForeignKey("chemical_field_sheets.id", ondelete="CASCADE"), nullable=False)
    agent_id          = Column(Integer, ForeignKey("chemical_agents.id"), nullable=False)
    valor_encontrado  = Column(String(50))    # numérico ou '<LQ'
    resultado         = Column(String(50))    # dentro_limite | acima_limite | nao_detectado | pendente
    observacao        = Column(Text)
    created_at        = Column(TIMESTAMP(timezone=True), server_default=func.now())
    __table_args__    = (UniqueConstraint('chemical_sheet_id', 'agent_id'),)
```

#### Schemas Pydantic

Criar `backend/app/schemas/chemical.py`:
```python
# Seguir exatamente o padrão de backend/app/schemas/field_sheet.py
# ChemicalAgentOut, ChemicalFieldSheetCreate, ChemicalFieldSheetOut,
# ChemicalSheetAgentCreate, ChemicalSheetAgentOut
```

#### Routers básicos

Criar `backend/app/routers/chemical_field_sheets.py`:
```
GET  /chemical-field-sheets          ?company_id=X&status=Y
POST /chemical-field-sheets
GET  /chemical-field-sheets/{id}
PATCH /chemical-field-sheets/{id}
PATCH /chemical-field-sheets/{id}/status   (aprovar)
DELETE /chemical-field-sheets/{id}         (require_admin)

GET  /chemical-field-sheets/{id}/agents
POST /chemical-field-sheets/{id}/agents
PATCH /chemical-field-sheets/{id}/agents/{agent_id}
DELETE /chemical-field-sheets/{id}/agents/{agent_id}
```

Criar `backend/app/routers/chemical_agents.py`:
```
GET  /chemical-agents                ?search=benzeno&limit=20
GET  /chemical-agents/{id}
```

Registrar routers em `backend/app/main.py`:
```python
from app.routers import chemical_field_sheets, chemical_agents
app.include_router(chemical_field_sheets.router, prefix="/chemical-field-sheets", tags=["chemical"])
app.include_router(chemical_agents.router, prefix="/chemical-agents", tags=["chemical"])
```

**Lógica de cálculo automático** (chamar ao salvar `valor_encontrado`):
```python
def calcular_resultado(valor: str, agent: ChemicalAgent) -> str:
    if not valor:
        return 'pendente'
    if valor.strip().startswith('<'):
        return 'nao_detectado'
    try:
        v = float(valor.replace(',', '.'))
        limite = agent.nr15_valor
        if not limite or limite == '-':
            limite = agent.acgih_twa   # fallback
        if not limite or limite == '-':
            return 'pendente'
        return 'dentro_limite' if v <= float(limite.replace(',', '.')) else 'acima_limite'
    except (ValueError, TypeError):
        return 'pendente'
```

**Cálculo da conclusão da ficha** (ao aprovar):
```python
def calcular_conclusao(resultados: list[str]) -> str:
    if 'acima_limite' in resultados:
        return 'Insalubre'
    return 'Salubre'
```

**Validação:** testar via `/docs` após `alembic upgrade head` — todos os endpoints respondem 200/201/204.

---

### FASE 1 — Importação do catálogo de agentes

**Objetivo:** Popular `chemical_agents` com os 185 agentes da planilha TLV.
**Arquivo de referência:** `Eduardo - quimico.xlsx` (aba TLV, colunas A–P)
**Sem frontend nesta fase.**

#### Mapeamento Excel → banco (aba TLV)

```
Col A → nome
Col B → esocial
Col C → unidade
Col D → acgih_twa
Col E → acgih_stel
Col F → nr15_valor
Col G → efeito_critico
Col H → amostrador
Col I → metodo
Col J → metodo_analise
Col K → vazao
Col L → volume
Col M → lq
Col N → numero_cas
(colunas O e P — verificar no arquivo real)
```

#### Endpoint de importação

```
POST /admin/chemical-agents/import
Body: multipart/form-data — campo "file" (xlsx)
Acesso: require_admin
Retorno: { inserted: N, updated: N, errors: [...] }
Lógica: upsert por numero_cas (se preenchido) ou por nome
```

#### Endpoint sync Google Sheets

```
POST /admin/chemical-agents/sync
Acesso: require_admin
Env vars necessárias:
  GOOGLE_SHEETS_CREDENTIALS = JSON da Service Account
  CHEMICAL_AGENTS_SHEET_ID  = ID da planilha
  CHEMICAL_AGENTS_TAB       = TLV
Dependência Python: google-auth==2.29.0 + google-api-python-client==2.127.0
Retorno: { updated: N, inserted: N }
```

**Validação:** importar o Excel → `GET /chemical-agents?search=benzeno` retorna o agente.

---

### FASE 2 — Frontend: Criar Ficha Química

**Objetivo:** Técnico pode criar uma ficha química.
**Arquivo base para copiar padrão:** `frontend/src/pages/FieldSheetForm.jsx`
**NÃO alterar FieldSheetForm.jsx** — criar página separada.

#### Nova página: `ChemicalFieldSheetForm.jsx`

Seguir exatamente o mesmo layout e fluxo do `FieldSheetForm.jsx`:
- Estrutura de seções com títulos em verde uppercase (`color: '#16a34a'`, `fontWeight: 700`, `fontSize: 11`, `textTransform: 'uppercase'`)
- Grid de 2-4 colunas por seção (`display: 'grid'`, `gridTemplateColumns: 'repeat(4, 1fr)'`, `gap: 10`)
- Campos obrigatórios com `<span>*</span>` no label (vermelho, via `.form-label span`)

**Seções do formulário:**

```
1. EMPRESA (somente leitura — herdado da URL)
   company_id → busca nome da empresa

2. FUNCIONÁRIO
   employee_id (select — busca funcionários da empresa) OU employee_name_text (input texto)
   Toggle: "Selecionar do cadastro" / "Digitar nome manualmente"
   Campos sempre obrigatórios:
     funcao (input)  |  matricula (input)
     setor (input)   |  local (input)
   Se employee_id selecionado: preencher funcao/matricula/setor/local automaticamente
   Se nome manual: campos ficam editáveis

3. IDENTIFICAÇÃO
   collection_date (date)  |  numero_amostrador (text)
   tipo_amostrador (select: "Tubo de Carvão Ativado", "Filtro de PVC", "Filtro de MCE", "Outro")
   technician_name (text)

4. CONDIÇÕES
   situacao_ambiente (textarea — obrigatório)

5. DADOS OPCIONAIS
   atividade (textarea)
   jornada_trabalho (text — ex: "44 Horas/Semanais")
   volume_ar_amostrado (text — ex: "12,5 L")
   frequencia (text)  |  tempo_exposicao_h (number)
   epi (textarea)  |  observacoes (textarea)
```

**Rota:** adicionar em `App.jsx`:
```jsx
<Route path="/chemical-field-sheet-form" element={<PrivateRoute><ChemicalFieldSheetForm /></PrivateRoute>} />
```

**Botão de acesso:** adicionar em `CompanyDetail.jsx` na aba "Fichas de Campo" um seletor de tipo:
```
[Ruído ▼]  [+ Nova Ficha]    ← dropdown que muda o tipo (Ruído | Químico)
Se Químico selecionado → "+ Nova Ficha" leva para /chemical-field-sheet-form?company_id=X
```

**Validação:** criar uma ficha química via formulário → aparece no banco + `GET /chemical-field-sheets?company_id=X`.

---

### FASE 3 — Frontend: Conferência Química

**Objetivo:** Admin vincula agentes, insere valores medidos e aprova ficha.
**Arquivo base:** `frontend/src/pages/Conference.jsx`
**NÃO reescrever Conference.jsx** — adicionar suporte a fichas químicas dentro dele.

#### Mudanças em Conference.jsx

**1. Filtro de tipo:** adicionar tabs ou select no topo da página:
```jsx
// Tabs: [Ruído] [Químico]
// Estado: tipoConferencia ('Ruido' | 'Quimico')
// Ruído → busca /field-sheets?status=pendente (comportamento atual)
// Químico → busca /chemical-field-sheets?status=pendente
```

**2. Tabela de fichas químicas** — mesma estrutura visual da tabela de Ruído, adaptada:

Colunas:
`#` | `Funcionário` | `Empresa` | `Data` | `Amostrador` | `Agentes Vinculados` | `Conclusão` | `Status` | `Ações`

**3. Painel de edição inline** — ao clicar em editar uma ficha química:

Seção "Identificação" — mesma estética (`background: '#f8fff8'`, borda verde):
```
Nº do Laudo (input text) + ".1/{ano}" fixo ao lado
Data do Relatório (date)
Jornada de Trabalho (text, opcional)
Volume de Ar Amostrado (text, opcional)
Conclusão Personalizada (textarea, opcional)
```

Seção "Agentes Vinculados" — painel azul claro (`background: '#f0f9ff'`, `borderBottom: '2px solid #bae6fd'`):

```jsx
// Lista de agentes já vinculados — uma linha por agente:
| Nome do Agente    | Valor Encontrado | Unidade | ACGIH TWA | NR-15 | Resultado   | [Remover] |
| Benzeno (NIOSH)   | [input]          | ppm     | 0,02      | -     | [badge]     | [×]       |

// Abaixo da lista:
[+ Selecionar Agente]  ← abre modal de busca
```

**4. Modal de seleção de agente:**
```jsx
// Input de busca (debounce 300ms) → GET /chemical-agents?search=termo
// Lista de resultados: nome | unidade | TWA | NR-15
// Clicar no agente → POST /chemical-field-sheets/{id}/agents
// Fechar modal ao vincular
```

**5. Ao digitar valor_encontrado:** chamar `PATCH /chemical-field-sheets/{id}/agents/{agent_id}` com debounce 500ms → badge de resultado atualiza.

**6. Botão Aprovar** — validação antes de chamar `PATCH /status`:
```
✓ laudo_number preenchido
✓ data_relatorio preenchida
✓ pelo menos 1 agente vinculado
✓ todos os agentes com valor_encontrado preenchido
```

**Validação:** vincular 2 agentes, inserir valores → badges aparecem → aprovar ficha.

---

### FASE 4 — Frontend: Aba Química em CompanyDetail

**Objetivo:** Admin vê fichas químicas e relatórios de uma empresa específica.
**Arquivo base:** `frontend/src/pages/CompanyDetail.jsx`

#### Mudanças em CompanyDetail.jsx

**1. Nova aba:** adicionar "Químico" nas tabs existentes:
```
[Funcionários] [Fichas de Campo] [Relatórios] [Laudos] → [Químico]
```

**2. Conteúdo da aba Químico — 2 sub-seções:**

**Sub-seção Fichas Químicas:**
- Tabela com as fichas químicas da empresa
- Colunas: `Nº Laudo` | `Funcionário` | `Data` | `Agentes` | `Conclusão` | `Status` | `Ações`
- Botão "+ Nova Ficha Química" → `/chemical-field-sheet-form?company_id={id}`

**Sub-seção Relatórios Químicos:**
- Listagem de relatórios consolidados químicos gerados
- Botão "+ Gerar Relatório Químico" → modal igual ao modal de relatório de Ruído (E7)
  - Busca fichas: `GET /chemical-field-sheets?company_id={id}&status=aprovada`
  - Checkboxes de seleção
  - Botão "Gerar PDF" → `GET /reports/generate-bulk-pdf-quimico?company_id=X&field_sheet_ids=Y,Z`

**Validação:** ficha aprovada aparece na aba → gerar relatório → arquivo PDF baixado.

---

### FASE 5 — Relatório XLSX Químico

**Objetivo:** Exportar dados das fichas químicas em planilha Excel.
**Arquivo base:** `backend/app/routers/reports.py` (função `generate_bulk_xlsx` como referência)

Endpoint: `GET /reports/generate-bulk-xlsx-quimico?company_id=X&field_sheet_ids=Y,Z`

Estrutura do XLSX:
- Aba 1: Resumo (um colaborador por linha — nome, função, agentes, conclusão)
- Aba 2+: Uma aba por colaborador com todos os agentes e valores

Usar `openpyxl` (já no requirements.txt). Seguir exatamente o padrão de `relatorio_template.xlsx`.

---

### FASE 6 — Relatório PDF Químico (Laudo)

**Objetivo:** Gerar o PDF de laudo químico consolidado.

#### Novo template: `backend/app/templates/relatorio_quimico_pdf.html`

Estrutura: Capa → Página Objetivo → Página Resumo → Folha 01 + Folha 02 por colaborador.

---

#### ⚠️ PÁGINA 1 — CAPA: COPIAR BLOCO EXATO DE `relatorio_pdf.html`

**Regra absoluta:** A capa do relatório químico USA O MESMO BLOCO HTML da capa do relatório de ruído.
Copiar o bloco `<!-- ══════════════════ CAPA ══════════════════ -->` de `relatorio_pdf.html`
para `relatorio_quimico_pdf.html` SEM NENHUMA ALTERAÇÃO.

O sistema preenche automaticamente os dados da ficha química nas mesmas variáveis:
```
{{ razao_social }}    → nome da empresa cliente
{{ endereco }}        → endereço da empresa (ou '—' se vazio)
{{ cnpj }}            → CNPJ da empresa (ou '—' se vazio)
{{ laudo_min }}       → número mínimo do laudo (formatado — ver abaixo)
{{ laudo_max }}       → número máximo do laudo (formatado — ver abaixo)
{{ year }}            → ano atual (ex: 2026)
{{ report_date }}     → data de emissão no formato 'MM.YYYY' (ex: '07.2026')
{{ capa_fundo_b64 }}  → mesma imagem de fundo (carregar de capa_fundo.png — ver backend)
{{ empresa_font_size }}, {{ endereco_font_size }}, {{ nr_font_size }}  → tamanhos dinâmicos
```

**Formato de laudo_min / laudo_max para relatório químico:**
```python
# No backend, antes de passar ao template:
laudo_numbers = [s.laudo_number for s in sheets]
laudo_min = f"N. {min(laudo_numbers):04d} - 1"   # ex: "N. 0042 - 1"
laudo_max = f"N. {max(laudo_numbers):04d} - 1"   # ex: "N. 0047 - 1"
# O template renderiza: "N. 0042 - 1/2026" ou "N. 0042 - 1/2026 ao N. 0047 - 1/2026"
```

**Tamanhos de fonte dinâmicos (mesma lógica do ruído):**
```python
def calc_font_size(text, max_len_large, size_large, size_small):
    return size_large if len(text or '') <= max_len_large else size_small

empresa_font_size = calc_font_size(razao_social, 30, '18pt', '13pt')
endereco_font_size = calc_font_size(endereco or '', 45, '14pt', '10pt')
nr_font_size = '28pt' if len(laudo_min) <= 20 else '20pt'
```

---

#### CABEÇALHO PADRÃO DAS PÁGINAS DE CONTEÚDO

Todas as páginas após a capa (Objetivo, Resumo, Folha 01, Folha 02) devem ter o cabeçalho:
```html
<table style="border:none; border-bottom:1.5px solid #1f9c74; margin-bottom:6px; width:100%; padding-bottom:4px;">
  <tr>
    <td style="border:none; vertical-align:middle; width:40%;">
      <img src="data:image/png;base64,{{ logo_b64 }}" style="height:38px;" alt="EcoSegme" />
    </td>
    <td style="border:none; vertical-align:middle; text-align:right; padding:0;">
      <img src="data:image/png;base64,{{ cabecalho_b64 }}" style="height:38px;" alt="Cabeçalho" />
    </td>
  </tr>
</table>
```

**Carregamento das imagens no backend (`generate_bulk_pdf_quimico`):**
```python
import base64, os

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'templates')

def _b64(filename):
    path = os.path.join(TEMPLATES_DIR, filename)
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode()

logo_b64        = _b64('logo.png')
cabecalho_b64   = _b64('cabecalho.png')
assinatura_alm_b64 = _b64('Assinatura Almerélio Gonçalves .png')  # espaço antes do .png — nome real
capa_fundo_b64  = _b64('capa_fundo.png')   # mesma imagem da capa do relatório de ruído
```

> ⚠️ O nome real do arquivo é `Assinatura Almerélio Gonçalves .png` (com espaço antes de `.png`).
> ⚠️ Confirmar existência de `capa_fundo.png` no diretório de templates — é o mesmo arquivo usado
>    pelo relatório de ruído; localizar no deploy do Render ou variável de ambiente se necessário.

---

#### BLOCO DE ASSINATURA (última Folha 02 de cada colaborador)

Substituir linha de assinatura por imagem. Usar o mesmo padrão do `relatorio_pdf.html`:
```html
<div style="text-align:center; margin-top:20pt;">
  <p style="font-size:11pt; color:#1a1a1a; margin:0 0 24pt 0; font-family:Arial, sans-serif;">
    Manaus, {{ signature_date_ext }}
  </p>
  <img src="data:image/png;base64,{{ assinatura_alm_b64 }}"
       style="width:220pt; height:auto; display:block; margin:0 auto;"/>
</div>
```

**`signature_date_ext` no backend (mesma lógica já usada no ruído):**
```python
from datetime import datetime
MESES = ['janeiro','fevereiro','março','abril','maio','junho',
         'julho','agosto','setembro','outubro','novembro','dezembro']
now = datetime.now()
signature_date_ext = f"{now.day} de {MESES[now.month-1]} de {now.year}"
# Exemplo: "07 de julho de 2026"
```

---

#### PÁGINAS DE CONTEÚDO

**Página 2 — Objetivo:**
Cabeçalho padrão (logo_b64 esquerda + cabecalho_b64 direita, linha verde #1f9c74 embaixo).
CSS do corpo: `font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; text-align: justify;`
Recuo de parágrafo ABNT: `text-indent: 1.25cm;` (equivalente a 1,25 cm conforme ABNT NBR 6022).
Título "Objetivo" centralizado, negrito, sem recuo, separado do corpo por uma linha em branco.

HTML da página:
```html
<div class="page-break">
  <!-- Cabeçalho padrão -->
  <table style="border:none; border-bottom:1.5px solid #1f9c74; margin-bottom:20px; width:100%; padding-bottom:4px;">
    <tr>
      <td style="border:none; vertical-align:middle; width:40%;">
        <img src="data:image/png;base64,{{ logo_b64 }}" style="height:38px;" alt="EcoSegme" />
      </td>
      <td style="border:none; vertical-align:middle; text-align:right; padding:0;">
        <img src="data:image/png;base64,{{ cabecalho_b64 }}" style="height:38px;" alt="Cabeçalho" />
      </td>
    </tr>
  </table>

  <!-- Título -->
  <p style="font-family:'Times New Roman',serif; font-size:14pt; font-weight:bold;
            text-align:center; margin:0 0 12pt 0;">Objetivo</p>

  <!-- Corpo — 4 parágrafos com recuo ABNT -->
  <p style="font-family:'Times New Roman',serif; font-size:14pt; line-height:1.5;
            text-align:justify; text-indent:1.25cm; margin:0 0 6pt 0;">
    A avaliação de agentes químicos no ambiente de trabalho tem como objetivo identificar e avaliar
    os riscos associados à exposição a substâncias químicas no local de trabalho, visando à prevenção
    de doenças ocupacionais e à promoção da saúde e segurança dos trabalhadores.
  </p>
  <p style="font-family:'Times New Roman',serif; font-size:14pt; line-height:1.5;
            text-align:justify; text-indent:1.25cm; margin:0 0 6pt 0;">
    Os agentes químicos presentes no ambiente de trabalho podem incluir substâncias tóxicas,
    irritantes, corrosivas, inflamáveis, cancerígenas, entre outras. A exposição a esses agentes
    pode ocorrer por inalação, contato dérmico ou ingestão, e pode levar a uma série de efeitos
    adversos à saúde, como irritação das vias respiratórias, danos ao sistema nervoso, câncer,
    entre outros.
  </p>
  <p style="font-family:'Times New Roman',serif; font-size:14pt; line-height:1.5;
            text-align:justify; text-indent:1.25cm; margin:0 0 6pt 0;">
    Este trabalho visa atender, principalmente, às recomendações do Programa de Gerenciamento de
    Riscos - PGR e a Norma Regulamentadora N.15 - Atividades e Operações Insalubres da Portaria
    3.214 do Ministério do Trabalho.
  </p>
  <p style="font-family:'Times New Roman',serif; font-size:14pt; line-height:1.5;
            text-align:justify; text-indent:1.25cm; margin:0 0 0 0;">
    Em resumo, o objetivo da avaliação de agentes químicos no ambiente de trabalho é garantir a
    saúde e segurança dos trabalhadores, identificando os riscos relacionados à exposição a
    substâncias químicas e implementando medidas de controle eficazes para prevenir doenças
    ocupacionais.
  </p>
</div>
```

---

#### PÁGINA 3 — RESUMO DOS RESULTADOS

```html
<div class="page-break">
  <!-- Cabeçalho padrão -->
  <table style="border:none; border-bottom:1.5px solid #1f9c74; margin-bottom:6px; width:100%; padding-bottom:4px;">
    <tr>
      <td style="border:none; vertical-align:middle; width:40%;">
        <img src="data:image/png;base64,{{ logo_b64 }}" style="height:38px;" alt="EcoSegme" />
      </td>
      <td style="border:none; vertical-align:middle; text-align:right; padding:0;">
        <img src="data:image/png;base64,{{ cabecalho_b64 }}" style="height:38px;" alt="Cabeçalho" />
      </td>
    </tr>
  </table>

  <!-- Dados da empresa -->
  <table style="border:none; margin-bottom:6px;">
    <tr>
      <td style="border:none;"><strong>Empresa:</strong> {{ razao_social }}</td>
      <td style="border:none; text-align:right;"><strong>Data:</strong> {{ report_date }}</td>
    </tr>
    {% if endereco %}
    <tr><td colspan="2" style="border:none;"><strong>Endereço:</strong> {{ endereco }}</td></tr>
    {% endif %}
  </table>

  <!-- Tabela resumo -->
  <table style="width:100%; border-collapse:collapse; margin-bottom:2px;">
    <thead>
      <tr>
        <th colspan="6" style="background:#1f9c74; color:white; text-align:center;
                               font-size:10pt; padding:4px; border:1px solid #167a5a; font-weight:bold;">
          Resumo dos Resultados — Agentes Químicos
        </th>
      </tr>
      <tr>
        <th style="background:#c6efce; text-align:center; font-size:8pt; border:1px solid #aaa; padding:3px;">Colaborador</th>
        <th style="background:#c6efce; text-align:center; font-size:8pt; border:1px solid #aaa; padding:3px;">Função</th>
        <th style="background:#c6efce; text-align:center; font-size:8pt; border:1px solid #aaa; padding:3px;">Setor</th>
        <th style="background:#c6efce; text-align:center; font-size:8pt; border:1px solid #aaa; padding:3px;">Nº Laudo</th>
        <th style="background:#c6efce; text-align:center; font-size:8pt; border:1px solid #aaa; padding:3px;">Agentes Monitorados</th>
        <th style="background:#c6efce; text-align:center; font-size:8pt; border:1px solid #aaa; padding:3px;">Conclusão</th>
      </tr>
    </thead>
    <tbody>
      {% for f in fichas %}
      <tr>
        <td style="border:1px solid #aaa; padding:3px; font-size:8pt;">{{ f.employee_nome or '—' }}</td>
        <td style="border:1px solid #aaa; padding:3px; font-size:8pt; text-align:center;">{{ f.funcao or '—' }}</td>
        <td style="border:1px solid #aaa; padding:3px; font-size:8pt; text-align:center;">{{ f.setor or '—' }}</td>
        <td style="border:1px solid #aaa; padding:3px; font-size:8pt; text-align:center;">
          N. {{ '%04d'|format(f.laudo_number) }} - 1 / {{ year }}
        </td>
        <td style="border:1px solid #aaa; padding:3px; font-size:8pt;">
          {{ f.agents | map(attribute='agente_nome') | join(', ') }}
        </td>
        <td style="border:1px solid #aaa; padding:3px; font-size:8pt; text-align:center;">
          {% if f.salubre %}
            <span style="background:#c6efce; color:#166534; font-weight:bold;
                         padding:2px 6px; border-radius:4px;">Salubre</span>
          {% else %}
            <span style="background:#ffc7ce; color:#991b1b; font-weight:bold;
                         padding:2px 6px; border-radius:4px;">Insalubre</span>
          {% endif %}
        </td>
      </tr>
      {% endfor %}
    </tbody>
  </table>
</div>
```

> **`f.salubre`** no backend: `True` se nenhum agente da ficha tiver `resultado_status == 'acima_limite'`.

---

#### PÁGINAS 4+ — FOLHA 01 E FOLHA 02 (loop por colaborador)

Estrutura Jinja2:
```html
{% for f in fichas %}
  <!-- FOLHA 01 -->
  ...
  <!-- FOLHA 02 -->
  ...
{% endfor %}
```

---

#### FOLHA 01 DE 02

```html
<div class="page-break">
  <!-- Cabeçalho padrão -->
  <table style="border:none; border-bottom:1.5px solid #1f9c74; margin-bottom:6px; width:100%; padding-bottom:4px;">
    <tr>
      <td style="border:none; vertical-align:middle; width:40%;">
        <img src="data:image/png;base64,{{ logo_b64 }}" style="height:38px;" alt="EcoSegme" />
      </td>
      <td style="border:none; vertical-align:middle; text-align:right; padding:0;">
        <img src="data:image/png;base64,{{ cabecalho_b64 }}" style="height:38px;" alt="Cabeçalho" />
      </td>
    </tr>
  </table>

  <!-- Título com número e folha -->
  <table style="width:100%; border-collapse:collapse; margin-bottom:4px;">
    <tr>
      <td style="background:#1f9c74; color:white; font-weight:bold; font-size:9pt;
                 padding:4px 6px; border:1px solid #167a5a; text-align:left;">
        Relatório de Ensaio Analítico N. {{ '%04d'|format(f.laudo_number) }} - 1 / {{ year }}
      </td>
      <td style="background:#1f9c74; color:white; font-weight:bold; font-size:9pt;
                 padding:4px 6px; border:1px solid #167a5a; text-align:right; white-space:nowrap; width:1%;">
        Folha 01 de 02
      </td>
    </tr>
  </table>

  <!-- Dados do Cliente -->
  <table style="width:100%; border-collapse:collapse; margin-bottom:2px;">
    <tr>
      <td style="font-weight:bold; font-size:8pt; background:#f0faf6; border:1px solid #aaa;
                 padding:2px 5px; white-space:nowrap; width:1%;">Razão Social:</td>
      <td style="font-size:8pt; border:1px solid #aaa; padding:2px 5px;">{{ razao_social }}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; font-size:8pt; background:#f0faf6; border:1px solid #aaa; padding:2px 5px;">Endereço:</td>
      <td style="font-size:8pt; border:1px solid #aaa; padding:2px 5px;">{{ endereco or '—' }}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; font-size:8pt; background:#f0faf6; border:1px solid #aaa; padding:2px 5px;">Serviço:</td>
      <td style="font-size:8pt; border:1px solid #aaa; padding:2px 5px;">Monitoramentos de Agentes Químicos no Ambiente de Trabalho.</td>
    </tr>
  </table>

  <!-- Informações do Colaborador -->
  <table style="width:100%; border-collapse:collapse; margin-bottom:2px;">
    <tr>
      <th colspan="4" style="background:#1f9c74; color:white; text-align:center; font-size:8.5pt;
                             padding:2px; border:1px solid #167a5a; margin:0;">
        Informações do Colaborador (a)
      </th>
    </tr>
    <tr>
      <td style="font-weight:bold; font-size:8pt; background:#f0faf6; border:1px solid #aaa; padding:2px 5px; width:1%; white-space:nowrap;">Colaborador (a):</td>
      <td style="font-size:8pt; border:1px solid #aaa; padding:2px 5px;">{{ f.employee_nome or '—' }}</td>
      <td style="font-weight:bold; font-size:8pt; background:#f0faf6; border:1px solid #aaa; padding:2px 5px; width:1%; white-space:nowrap;">Matrícula:</td>
      <td style="font-size:8pt; border:1px solid #aaa; padding:2px 5px;">{{ f.matricula or '—' }}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; font-size:8pt; background:#f0faf6; border:1px solid #aaa; padding:2px 5px; white-space:nowrap;">Cargo/Função:</td>
      <td style="font-size:8pt; border:1px solid #aaa; padding:2px 5px;">{{ f.funcao or '—' }}</td>
      <td style="font-weight:bold; font-size:8pt; background:#f0faf6; border:1px solid #aaa; padding:2px 5px; white-space:nowrap;">Setor:</td>
      <td style="font-size:8pt; border:1px solid #aaa; padding:2px 5px;">{{ f.setor or '—' }}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; font-size:8pt; background:#f0faf6; border:1px solid #aaa; padding:2px 5px; white-space:nowrap;">Local da Coleta:</td>
      <td colspan="3" style="font-size:8pt; border:1px solid #aaa; padding:2px 5px;">{{ f.local or '—' }}</td>
    </tr>
  </table>

  <!-- Informações Técnicas -->
  <table style="width:100%; border-collapse:collapse; margin-bottom:2px;">
    <tr>
      <th colspan="4" style="background:#1f9c74; color:white; text-align:center; font-size:8.5pt;
                             padding:2px; border:1px solid #167a5a;">
        Informações Técnicas de Amostragem
      </th>
    </tr>
    <tr>
      <td style="font-weight:bold; font-size:8pt; background:#f0faf6; border:1px solid #aaa; padding:2px 5px; white-space:nowrap; width:1%;">Data da Avaliação:</td>
      <td style="font-size:8pt; border:1px solid #aaa; padding:2px 5px;">{{ f.collection_date }}</td>
      <td style="font-weight:bold; font-size:8pt; background:#f0faf6; border:1px solid #aaa; padding:2px 5px; white-space:nowrap; width:1%;">Resp. pela Coleta:</td>
      <td style="font-size:8pt; border:1px solid #aaa; padding:2px 5px;">{{ f.technician_name or '—' }}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; font-size:8pt; background:#f0faf6; border:1px solid #aaa; padding:2px 5px; white-space:nowrap;">Volume de Ar Amostrado:</td>
      <td style="font-size:8pt; border:1px solid #aaa; padding:2px 5px;">{{ f.volume_ar_amostrado or '—' }}</td>
      <td style="font-weight:bold; font-size:8pt; background:#f0faf6; border:1px solid #aaa; padding:2px 5px; white-space:nowrap;">Jornada de Trabalho:</td>
      <td style="font-size:8pt; border:1px solid #aaa; padding:2px 5px;">{{ f.jornada_trabalho or '—' }}</td>
    </tr>
  </table>

  <!-- Tabela de Resultados dos Agentes Químicos -->
  <table style="width:100%; border-collapse:collapse; margin-bottom:2px;">
    <thead>
      <tr>
        <th colspan="7" style="background:#1f9c74; color:white; text-align:center; font-size:8.5pt;
                               padding:2px; border:1px solid #167a5a;">
          Resultados dos Agentes Químicos Monitorados
        </th>
      </tr>
      <tr>
        <th style="background:#c6efce; font-size:7.5pt; border:1px solid #aaa; padding:2px 4px; text-align:center;">Agente Químico<br/><small>Cód. e-Social</small></th>
        <th style="background:#c6efce; font-size:7.5pt; border:1px solid #aaa; padding:2px 4px; text-align:center;">Valor<br/>Encontrado</th>
        <th style="background:#c6efce; font-size:7.5pt; border:1px solid #aaa; padding:2px 4px; text-align:center;">Unidade</th>
        <th style="background:#c6efce; font-size:7.5pt; border:1px solid #aaa; padding:2px 4px; text-align:center;">ACGIH<br/>TWA</th>
        <th style="background:#c6efce; font-size:7.5pt; border:1px solid #aaa; padding:2px 4px; text-align:center;">ACGIH<br/>STEL</th>
        <th style="background:#c6efce; font-size:7.5pt; border:1px solid #aaa; padding:2px 4px; text-align:center;">NR 15</th>
        <th style="background:#c6efce; font-size:7.5pt; border:1px solid #aaa; padding:2px 4px; text-align:center;">Bases de<br/>Efeitos Críticos</th>
      </tr>
    </thead>
    <tbody>
      {% for ag in f.agents %}
      <tr style="{% if ag.resultado_status == 'acima_limite' %}background:#ffc7ce;{% endif %}">
        <td style="border:1px solid #aaa; padding:2px 4px; font-size:7.5pt;">
          {{ ag.agente_nome }}<br/>
          <small style="color:#555;">{{ ag.codigo_esocial or 'N.C.' }}</small>
        </td>
        <td style="border:1px solid #aaa; padding:2px 4px; font-size:7.5pt; text-align:center;">
          {{ ag.valor_encontrado or 'N.D.' }}
        </td>
        <td style="border:1px solid #aaa; padding:2px 4px; font-size:7.5pt; text-align:center;">{{ ag.unidade or '—' }}</td>
        <td style="border:1px solid #aaa; padding:2px 4px; font-size:7.5pt; text-align:center;">{{ ag.tlv_twa or '—' }}</td>
        <td style="border:1px solid #aaa; padding:2px 4px; font-size:7.5pt; text-align:center;">{{ ag.tlv_stel or '—' }}</td>
        <td style="border:1px solid #aaa; padding:2px 4px; font-size:7.5pt; text-align:center;">{{ ag.nr15 or '—' }}</td>
        <td style="border:1px solid #aaa; padding:2px 4px; font-size:7.5pt;">{{ ag.efeitos_criticos or '—' }}</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>
</div>
```

---

#### FOLHA 02 DE 02

```html
<div class="page-break">
  <!-- Cabeçalho padrão -->
  <table style="border:none; border-bottom:1.5px solid #1f9c74; margin-bottom:6px; width:100%; padding-bottom:4px;">
    <tr>
      <td style="border:none; vertical-align:middle; width:40%;">
        <img src="data:image/png;base64,{{ logo_b64 }}" style="height:38px;" alt="EcoSegme" />
      </td>
      <td style="border:none; vertical-align:middle; text-align:right; padding:0;">
        <img src="data:image/png;base64,{{ cabecalho_b64 }}" style="height:38px;" alt="Cabeçalho" />
      </td>
    </tr>
  </table>

  <!-- Título -->
  <table style="width:100%; border-collapse:collapse; margin-bottom:8px;">
    <tr>
      <td style="background:#1f9c74; color:white; font-weight:bold; font-size:9pt;
                 padding:4px 6px; border:1px solid #167a5a; text-align:left;">
        Relatório de Ensaio Analítico N. {{ '%04d'|format(f.laudo_number) }} - 1 / {{ year }}
      </td>
      <td style="background:#1f9c74; color:white; font-weight:bold; font-size:9pt;
                 padding:4px 6px; border:1px solid #167a5a; text-align:right; white-space:nowrap; width:1%;">
        Folha 02 de 02
      </td>
    </tr>
  </table>

  <!-- Legenda -->
  <p style="font-size:8pt; font-weight:bold; margin:4px 0 2px 0;">Legenda:</p>
  <p style="font-size:7.5pt; margin:1px 0;">TLV - TWA: Threshold Limits Values (Limite de Exposição) - Média Ponderada pelo Tempo.</p>
  <p style="font-size:7.5pt; margin:1px 0;">TLV - STEL: Threshold Limits Values (Limite de Exposição) - Exposição de Curta Duração.</p>
  <p style="font-size:7.5pt; margin:1px 0;">N.C.: Não Codificado pelo e-Social.</p>
  <p style="font-size:7.5pt; margin:1px 0 6px 0;">N.D.: Nada Detectado.</p>

  <!-- Notas -->
  <p style="font-size:8pt; font-weight:bold; margin:4px 0 2px 0;">Notas:</p>
  <p style="font-size:7.5pt; margin:1px 0;">Foram utilizados os dados fornecidos pelo interessado. O resultado de cada parâmetro está em função do volume de ar amostrado.</p>
  <p style="font-size:7.5pt; margin:1px 0;">Equipamento Utilizado na Coleta: Bomba Gravimétrica. Os resultados são válidos exclusivamente para a amostra analisada.</p>
  <p style="font-size:7.5pt; margin:1px 0 8px 0;">Códigos retirados da "Tabela 24: Agentes Nocivos e Atividades - Aposentadoria Especial" do eSocial Versão S-1.0 de 2021.</p>

  <!-- Tipo de Amostrador -->
  <table style="width:100%; border-collapse:collapse; margin-bottom:2px;">
    <tr>
      <td style="font-weight:bold; font-size:8pt; background:#f0faf6; border:1px solid #aaa;
                 padding:2px 5px; white-space:nowrap; width:1%;">Tipo de Amostrador:</td>
      <td style="font-size:8pt; border:1px solid #aaa; padding:2px 5px;">{{ f.tipo_amostrador or '—' }}</td>
    </tr>
  </table>

  <!-- Metodologia de Análise -->
  <table style="width:100%; border-collapse:collapse; margin-bottom:8px;">
    <tr>
      <td style="font-weight:bold; font-size:8pt; background:#f0faf6; border:1px solid #aaa;
                 padding:2px 5px; white-space:nowrap; width:1%;">Metodologia de Análise:</td>
      <td style="font-size:8pt; border:1px solid #aaa; padding:2px 5px;">
        {{ f.agents | map(attribute='metodo_analise') | select | unique | join(' / ') or '—' }}
      </td>
    </tr>
  </table>

  <!-- Referência -->
  <p style="font-size:8pt; font-weight:bold; margin:4px 0 2px 0;">Referência:</p>
  <p style="font-size:7.5pt; margin:1px 0;">Valores Limites de Exposição TLV-TWA da American Conference of Governmental Industrial Hygienists - ACGIH.</p>
  <p style="font-size:7.5pt; margin:1px 0;">Norma Regulamentadora - NR 15.</p>
  <p style="font-size:7.5pt; margin:1px 0;">Ministério do Trabalho e Emprego - MTE.</p>
  <p style="font-size:7.5pt; margin:1px 0;">Nacional Institute for Occupational Safety and Health - NIOSH (Instituto Nacional de Segurança e Saúde Ocupacional).</p>
  <p style="font-size:7.5pt; margin:1px 0 8px 0;">Occupational Safety and Health Administration - OSHA.</p>

  <!-- Conclusão -->
  <p style="font-size:8pt; font-weight:bold; margin:4px 0 2px 0;">Conclusão:</p>
  <p style="font-size:8pt; text-align:justify; margin:0 0 16px 0;">{{ f.conclusao_texto }}</p>

  <!-- Assinatura -->
  <div style="text-align:center; margin-top:20pt;">
    <p style="font-size:11pt; color:#1a1a1a; margin:0 0 24pt 0; font-family:Arial, sans-serif;">
      Manaus, {{ signature_date_ext }}
    </p>
    <img src="data:image/png;base64,{{ assinatura_alm_b64 }}"
         style="width:220pt; height:auto; display:block; margin:0 auto;"/>
  </div>
</div>
```

---

#### VARIÁVEIS DO BACKEND (`generate_bulk_pdf_quimico`)

O dicionário `f` passado ao template para cada ficha deve conter:

```python
# Para cada chemical_field_sheet `sheet`:
{
  'laudo_number':      sheet.laudo_number,          # int
  'employee_nome':     sheet.employee.nome,          # str
  'funcao':            sheet.funcao,
  'matricula':         sheet.matricula,
  'local':             sheet.local,
  'setor':             sheet.setor,
  'collection_date':   sheet.collection_date.strftime('%d/%m/%Y'),
  'technician_name':   sheet.technician_name,
  'volume_ar_amostrado': sheet.volume_ar_amostrado, # str opcional
  'jornada_trabalho':  sheet.jornada_trabalho,       # str opcional
  'tipo_amostrador':   sheet.tipo_amostrador,        # str opcional
  'conclusao_texto':   sheet.conclusao_texto,
  'salubre':           all(a.resultado_status != 'acima_limite' for a in sheet.agents),
  'agents': [
    {
      'agente_nome':      sa.agent.nome,
      'codigo_esocial':   sa.agent.codigo_esocial,
      'valor_encontrado': sa.valor_encontrado,       # str (ex: "< 0,011" ou "0,045")
      'unidade':          sa.agent.unidade,
      'tlv_twa':          sa.agent.tlv_twa,
      'tlv_stel':         sa.agent.tlv_stel,
      'nr15':             sa.agent.nr15,
      'efeitos_criticos': sa.agent.efeitos_criticos,
      'metodo_analise':   sa.agent.metodo_analise,
      'resultado_status': sa.resultado_status,       # 'normal' | 'acima_limite' | 'nao_detectado'
    }
    for sa in sheet.agents   # chemical_sheet_agents ordenados por agente_nome
  ]
}
```

⚠️ FORMATO DO NÚMERO NOS TÍTULOS:
```python
# Template usa: {{ '%04d'|format(f.laudo_number) }}
# Exemplo com laudo_number=42 → "0042"
# Título renderizado: "Relatório de Ensaio Analítico N. 0042 - 1 / 2026"
```

---

Endpoint:
```
GET /reports/generate-bulk-pdf-quimico
    ?company_id=X
    &field_sheet_ids=Y
    &field_sheet_ids=Z
Acesso: autenticado
Retorno: StreamingResponse (application/pdf)
```

**Validação:** 2 fichas aprovadas → PDF: capa + objetivo + resumo + 4 folhas (Folha 01 + Folha 02 × 2 colaboradores).
Verificar: empresa/endereço/CNPJ corretos na capa; logo e cabecalho.png no cabeçalho de todas as páginas;
assinatura Almerélio na última Folha 02; data "Manaus, DD de mês de YYYY" automática.

---

## REFERÊNCIA RÁPIDA — Arquivos a NÃO alterar

```
❌ backend/app/templates/laudo.html
❌ backend/app/routers/reports.py → função generate_bulk()
❌ frontend/src/index.css
❌ frontend/src/App.css
❌ backend/app/models/field_sheet.py (laudo_number é String, não alterar)
```

## Arquivos que PODEM ser alterados

```
✅ backend/app/main.py  (incluir novos routers)
✅ backend/app/routers/reports.py  (apenas generate_bulk_pdf)
✅ frontend/src/pages/Conference.jsx  (adicionar aba/filtro Químico)
✅ frontend/src/pages/CompanyDetail.jsx  (adicionar aba Químico)
✅ frontend/src/App.jsx  (adicionar nova rota)
```

---

*EcoSegme · Guia Claude Code Feature Químico · 2026-07-07*
