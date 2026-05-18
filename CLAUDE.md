# CLAUDE.md — EcoSegme

> Leia este arquivo inteiro antes de qualquer ação. Ele contém o contexto completo do projeto, regras absolutas e o plano de execução atual.

\---

## 1\. O QUE É ESTE SISTEMA

**EcoSegme** — sistema web de gestão de laudos técnicos de dosimetria de ruído ocupacional para a empresa Ecosegme Ambiental (Manaus/AM). Conformidade com **NR-15** e **NHO-01**.

**Fluxo do negócio:**

```
Técnico de Campo
  → cria Ficha de Campo (dados da coleta + dosímetro)
  → Admin revisa na aba Conferência
  → Admin aprova a ficha (define Nº do Laudo + faz upload do PDF SONUS 2)
  → Sistema gera Laudo PDF individual para a ficha (imutável, SHA-256)
  → Admin gera Relatório Consolidado (agrupa N fichas em 1 PDF final com capa)
```

**Entidades principais:**

* `Company` — empresa cliente avaliada
* `Employee` — funcionário da empresa
* `FieldSheet` — ficha de campo (1 por funcionário por coleta)
* `SonusUpload` — PDF exportado pelo dosímetro SONUS 2
* `GeneratedReport` — laudo PDF individual (1 por FieldSheet)
* `ConsolidatedReport` — relatório PDF final (N fichas agrupadas)
* `AuditLog` — log de auditoria de todas as ações

\---

## 2\. STACK TÉCNICA

**Backend:** `backend/`

* Python 3.12 + FastAPI 0.133
* SQLAlchemy + Alembic (migrations)
* PostgreSQL 16 via Supabase
* WeasyPrint + Jinja2 (geração de PDF via template HTML)
* pdfplumber (extração de texto dos PDFs SONUS 2)
* openpyxl (relatório consolidado XLSX)
* Pillow (processamento de assinatura — remoção de fundo)
* JWT autenticação (HS256, 8h expiração)
* Supabase Storage (armazenamento de PDFs com signed URLs)
* Deploy: Render (`https://ecosegme.onrender.com`)

**Frontend:** `frontend/`

* React 18 + Vite
* Axios com injeção automática de token (`frontend/src/api/axios.js`)
* Páginas: `Companies.jsx`, `CompanyDetail.jsx`, `Conference.jsx`, `FieldSheetForm.jsx`, `Reports.jsx`, `Employees.jsx`, `Users.jsx`, `Login.jsx`
* Deploy: Vercel

**Banco:** Supabase PostgreSQL — região São Paulo (sa-east-1)

\---

## 3\. ESTRUTURA REAL DO PROJETO

```
ecosegme/
├── backend/
│   ├── app/
│   │   ├── routers/        ← auth.py, companies.py, employees.py,
│   │   │                      field\_sheets.py, uploads.py, reports.py,
│   │   │                      users.py, epis.py, setup.py
│   │   ├── models/         ← company.py, employee.py, field\_sheet.py,
│   │   │                      generated\_report.py, consolidated\_report.py,
│   │   │                      sonus\_upload.py, audit\_log.py, user.py
│   │   ├── schemas/        ← company.py, employee.py, field\_sheet.py
│   │   ├── core/           ← deps.py, security.py, limiter.py
│   │   ├── templates/      ← ⚠️ TEMPLATES ESTÃO AQUI (não na raiz do backend)
│   │   │   ├── images/     ← capa\_img\_left.png, capa\_img\_top\_right.png,
│   │   │   │                  capa\_img\_bot\_right.png
│   │   │   ├── relatorio\_pdf.html   ← relatório consolidado (WeasyPrint)
│   │   │   ├── laudo.html           ← laudo individual
│   │   │   ├── ficha\_campo.html
│   │   │   ├── logo.png
│   │   │   ├── assinatura\_arimar.png
│   │   │   └── relatorio\_template.xlsx
│   │   ├── pdf\_generator.py   ← ⚠️ ESTÁ DENTRO DE app/, não na raiz
│   │   ├── parser.py
│   │   ├── supabase\_storage.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── alembic/
│   └── tests/
└── frontend/
    └── src/
        ├── pages/
        ├── components/     ← Navbar.jsx, PrivateRoute.jsx
        ├── context/        ← AuthContext.jsx
        └── api/            ← axios.js
```

> ⚠️ \*\*ATENÇÃO DE PATH:\*\* Templates em `backend/app/templates/` — NÃO em `backend/templates/`
> ⚠️ \*\*ATENÇÃO DE PATH:\*\* pdf\_generator em `backend/app/pdf\_generator.py` — NÃO em `backend/pdf\_generator.py`

\---

## 4\. REGRAS ABSOLUTAS — NUNCA VIOLAR

```
❌ NUNCA mudar o tipo de FieldSheet.laudo\_number (é Integer, permanece Integer)
❌ NUNCA criar migration para lógica de exibição — sufixo .1/ano é visual apenas
❌ NUNCA enviar o sufixo ".1/2026" ao backend — enviar apenas o número inteiro
❌ NUNCA alterar generate\_bulk() — apenas generate\_bulk\_pdf() pode ser alterado
❌ NUNCA alterar laudo.html — apenas relatorio\_pdf.html (relatório consolidado)
❌ NUNCA executar E8 antes de E3 estar concluído
❌ NUNCA misturar dois ajustes no mesmo commit
❌ NUNCA alterar o comportamento de reversão de status ao excluir laudo:
   excluir GeneratedReport → FieldSheet.status volta para "pendente" automaticamente
   esta lógica já existe em DELETE /reports/{report\_id} e deve ser preservada
```

\---

## 5\. MODELO MENTAL — NÚMEROS DE LAUDO E RELATÓRIO

```
FieldSheet.laudo\_number = Integer (ex: 42)
  → Admin digita: 42  (campo "Nº do Laudo" na aba Conferência)
  → Sistema exibe: "42.1/2026"  ← sufixo construído no frontend, NUNCA salvo no banco
  → Cálculo frontend: `${laudo\_number}.1/${new Date().getFullYear()}`
  → Cálculo backend:  f"{laudo\_number}.1/{datetime.now().year}"

Relatório Consolidado com fichas 42, 43, 47:
  → Capa exibe: "Nº do Relatório: 42.1/2026 ao 47.1/2026"
  → Cálculo: f"{min(laudo\_numbers)}.1/{year} ao {max(laudo\_numbers)}.1/{year}"
  → laudo\_numbers já disponível em generate\_bulk\_pdf:
    laudo\_numbers = \[s.laudo\_number for s in sheets]
```

\---

## 6\. ARQUIVOS-CHAVE E SUAS RESPONSABILIDADES

|Arquivo|Responsabilidade|
|-|-|
|`backend/app/routers/reports.py`|Geração de laudos e relatórios — `generate\_bulk\_pdf()` é o endpoint principal|
|`backend/app/routers/field\_sheets.py`|CRUD de fichas de campo|
|`backend/app/routers/companies.py`|CRUD de empresas — endpoint DELETE já existe e está correto|
|`backend/app/models/field\_sheet.py`|Modelo FieldSheet — `laudo\_number` é Integer|
|`backend/app/models/consolidated\_report.py`|Modelo do relatório consolidado|
|`backend/app/pdf\_generator.py`|Gera laudo individual via WeasyPrint|
|`backend/app/templates/relatorio\_pdf.html`|⚠️ Template HTML do relatório PDF consolidado|
|`backend/app/templates/laudo.html`|⚠️ Template HTML do laudo individual — NÃO alterar|
|`frontend/src/pages/CompanyDetail.jsx`|Página da empresa — fichas, relatórios, laudos|
|`frontend/src/pages/Conference.jsx`|Tela de conferência — aprovação de fichas|
|`frontend/src/pages/Reports.jsx`|Histórico de relatórios consolidados|
|`frontend/src/api/axios.js`|Instância Axios com JWT — verificar interceptors se DELETE falhar|

\---

## 7\. ENDPOINT CRÍTICO — generate\_bulk\_pdf

```python
# Localização: backend/app/routers/reports.py
# Rota atual: GET /reports/generate-bulk-pdf?company\_id=X\&tipo\_analise=Y
#
# Variáveis JÁ passadas ao template relatorio\_pdf.html (não recriar):
#   razao\_social, cnpj, endereco, tipo\_analise, period,
#   report\_date, year, laudo\_numbers,
#   logo\_b64, assinatura\_b64,
#   capa\_img\_left\_b64, capa\_img\_top\_right\_b64, capa\_img\_bot\_right\_b64,
#   fichas\[]
#
# Variáveis que FALTAM e precisam ser adicionadas em E8:
#   laudo\_min, laudo\_max  (para exibir range na capa)
#   report\_date já existe mas confirmar formato '%m.%Y'
```

\---

## 8\. COMPORTAMENTO DE REVERSÃO — NÃO QUEBRAR

```python
# Em DELETE /reports/{report\_id} (reports.py) — já implementado:
# Ao excluir um GeneratedReport:
#   sheet.status = "pendente"
#   sheet.signature\_date = None
# Este comportamento é intencional e deve ser preservado em todos os ajustes.
# Os botões de excluir FICHA (E4/E5) são diferentes — excluem FieldSheet, não GeneratedReport.
# Não confundir os dois fluxos de exclusão.
```

\---

## 9\. PLANO DE AJUSTES — STATUS ATUAL

Execute **um ajuste por vez** na ordem abaixo. Marque ✅ ao concluir.

### E1 — Renomear labels (UI Textual) — RISCO: BAIXO

**Status:** ✅ Concluído
**O que fazer:** Substituir todas as ocorrências de `'Nº da Ordem'` por `'Nº do Laudo'`
**Arquivos:** `Conference.jsx`, `CompanyDetail.jsx`, `FieldSheetForm.jsx`
**Regra:** Apenas texto visível. NÃO alterar variáveis, props ou campos do banco.
**Validação:** Buscar `'da Ordem'` no frontend — deve retornar zero resultados.

\---

### E2 — Corrigir bug Deletar Empresa — RISCO: MÉDIO

**Status:** ✅ Concluído (P2 corrigido)
**Diagnóstico já feito:**

* Endpoint `DELETE /companies/{company\_id}` existe e está correto em `companies.py`
* O `catch` do `handleDeleteCompany` em `CompanyDetail.jsx` usa `setDownloadError`
* `setDownloadError` só exibe o erro se o usuário estiver na aba Laudos
* Em qualquer outra aba (Funcionários, Fichas, Relatórios) o erro é silencioso

**Arquivo:** `frontend/src/pages/CompanyDetail.jsx` — função `handleDeleteCompany`
**Correção — substituir o catch atual por:**

```javascript
} catch (err) {
  if (err.response?.status === 409) {
    alert('Não é possível excluir esta empresa pois ela possui fichas ou funcionários vinculados.')
  } else {
    alert('Erro ao deletar empresa. Tente novamente.')
  }
}
```

**Validação:** Deletar empresa com fichas → alerta 409. Deletar empresa vazia → redireciona para `/companies`.

\---

### E3 — Exibir sufixo .1/ano (Visual Frontend) — RISCO: BAIXO

**Status:** ✅ Concluído
**CRÍTICO:** laudo\_number é Integer. NÃO criar migration. NÃO alterar nenhum arquivo backend.
**Arquivo:** `frontend/src/pages/Conference.jsx`

**Alteração 1 — Campo de edição da ficha:**

```jsx
<div style={{display:'flex', alignItems:'center', gap:'4px'}}>
  <input
    type="number"
    value={laudoNumberPrefixo}
    onChange={e => setLaudoNumberPrefixo(e.target.value)}
    placeholder="Ex: 42"
    style={{width:'100px'}}
  />
  <span style={{color:'#666', fontWeight:'500'}}>
    {`.1/${new Date().getFullYear()}`}
  </span>
</div>
```

Ao salvar: enviar apenas o número inteiro ao backend. Nunca o sufixo.

**Alteração 2 — Coluna # na tabela:**

```jsx
// Antes:
{sheet.laudo\_number}
// Depois:
{sheet.laudo\_number ? `${sheet.laudo\_number}.1/${new Date().getFullYear()}` : 'S/Nº'}
```

**Validação:** Tabela exibe `42.1/2026`. Campo edição mostra input + `.1/2026` fixo ao lado. Salvar → Supabase recebe inteiro puro.

\---

### E4 — Botão Excluir Ficha (CompanyDetail) — RISCO: BAIXO

**Status:** ✅ Concluído (P1 e P4 corrigidos)
**Arquivo:** `frontend/src/pages/CompanyDetail.jsx`
**Verificar primeiro:** Se existe `DELETE /{field\_sheet\_id}` em `field\_sheets.py`. Se não existir, criar com `require\_admin`, delete do registro, retornar 204.

**⚠️ ATENÇÃO:** Excluir FieldSheet é diferente de excluir GeneratedReport.
Excluir a ficha remove a ficha (e seus dados). NÃO confundir com a reversão de status do laudo.

**Criar componente `DeleteFieldSheetButton`:**

* Props: `{ fieldSheetId, onDeleted }`
* Estilo: `background: '#FADADD'`, `color: '#8B0000'`, mesmo tamanho do botão `Ficha PDF`
* Texto: `Excluir Ficha de Campo`
* Ao clicar: modal com fundo `#F2F2F2`, texto vermelho
* Mensagem modal: `"Tem certeza que deseja excluir definitivamente este arquivo?"`
* Botão `Excluir`: chama `DELETE /field-sheets/{fieldSheetId}` via axios
* Botão `Cancelar`: fecha modal sem ação
* Após exclusão bem-sucedida: chamar `onDeleted()`

**EXPORTAR o componente** — será reutilizado em E5 sem reescrita.
**Validação:** Botão rosa visível em cada linha. Modal aparece. Confirmar → ficha some da tabela + deletada no Supabase.

\---

### E5 — Botão Excluir Ficha (Conference) — RISCO: BAIXO

**Status:** ✅ Concluído (P3 corrigido)
**Dependência:** E4 concluído.
**Arquivo:** `frontend/src/pages/Conference.jsx`
**Ação:** Importar `DeleteFieldSheetButton` criado em E4. Adicionar na coluna Ações ao lado de `Aprovar`:

```jsx
<DeleteFieldSheetButton
  fieldSheetId={ficha.id}
  onDeleted={() => setFichas(prev => prev.filter(f => f.id !== ficha.id))}
/>
```

NÃO reescrever o componente. NÃO alterar Editar, SONUS e Aprovar.
**Validação:** Botão aparece ao lado de `Aprovar`. Comportamento idêntico ao E4.

\---

### E6 — Seleção de Fichas para Relatório PDF — RISCO: MÉDIO

**Status:** ⏳ Aguardando validação em produção
**Arquivos:** `backend/app/routers/reports.py` + `frontend/src/pages/Conference.jsx`

**Backend — alterar assinatura de `generate\_bulk\_pdf` (mudança aditiva, não quebra nada):**

```python
from typing import Optional, List
from fastapi import Query

def generate\_bulk\_pdf(
    company\_id: int,
    tipo\_analise: str,
    field\_sheet\_ids: Optional\[List\[int]] = Query(None),
    db: Session = Depends(get\_db),
    current\_user: User = Depends(get\_current\_user)
):
    # Adicionar logo após a definição de tipo\_filter:
    if field\_sheet\_ids:
        sheets = db.query(FieldSheet).filter(
            FieldSheet.id.in\_(field\_sheet\_ids),
            FieldSheet.company\_id == company\_id
        ).order\_by(FieldSheet.laudo\_number).all()
    else:
        # lógica atual mantida intacta — fallback sem seleção
        sheets = db.query(FieldSheet).filter(
            FieldSheet.company\_id == company\_id,
            tipo\_filter
        ).order\_by(FieldSheet.laudo\_number).all()
```

**Frontend — modo seleção em `Conference.jsx`:**

```
Estados novos: modoSelecao (bool), fichasSelecionadas (array de ids)

Comportamento do botão "Gerar Relatório PDF":
  - 1º clique: modoSelecao = true → aparece coluna de checkboxes à esquerda do "#"
  - botão muda para "Confirmar e Gerar" (desabilitado se fichasSelecionadas.length === 0)
  - adicionar botão "Cancelar Seleção" → reseta modoSelecao e fichasSelecionadas
  - ao confirmar: chamar endpoint com IDs via query params:
    const params = new URLSearchParams({ company\_id, tipo\_analise })
    fichasSelecionadas.forEach(id => params.append('field\_sheet\_ids', id))
    api.get(`/reports/generate-bulk-pdf?${params}`, { responseType: 'blob' })

Remover qualquer mensagem/aviso anterior sobre seleção de fichas.
NÃO alterar botão "Gerar Relatório Excel".
```

**Validação:** Selecionar 2 de 3 fichas → PDF contém só as 2. Sem seleção → botão confirmar desabilitado. Comportamento sem seleção (fallback) preservado.

\---

### E7 — Gerar Relatório via Aba Empresa — RISCO: BAIXO

**Status:** ⏳ Aguardando validação em produção
**Dependência:** E6 concluído.
**Arquivo:** `frontend/src/pages/CompanyDetail.jsx`

**Ação:** Botão `+ Gerar Relatório` na aba Relatórios deve abrir modal com:

* Buscar fichas: `GET /field-sheets/?company\_id={companyId}`
* Listar fichas com checkbox (laudo\_number.1/ano, funcionário, data)
* Botão `Gerar PDF` ativo só se >= 1 selecionada
* Chamar mesmo endpoint de E6 com `field\_sheet\_ids`
* Após geração: fechar modal + recarregar lista de relatórios da aba

NÃO mostrar fichas de outras empresas. NÃO alterar `Conference.jsx`.
**Validação:** Modal abre com fichas desta empresa apenas. Relatório gerado aparece na aba Relatórios.

\---

### E8 — Capa no Relatório PDF — RISCO: MÉDIO

**Status:** ⏳ Aguardando validação em produção
**Dependência:** E3 concluído.
**Arquivos:**

* `backend/app/templates/relatorio\_pdf.html` ← ⚠️ path correto
* `backend/app/routers/reports.py`

**Backend — adicionar ao `tmpl.render()` em `generate\_bulk\_pdf`:**

```python
# Estas variáveis já existem no render() — confirmar:
#   razao\_social, cnpj, endereco, year, laudo\_numbers, logo\_b64
#   capa\_img\_left\_b64, capa\_img\_top\_right\_b64, capa\_img\_bot\_right\_b64

# Adicionar apenas as que faltam:
report\_date=datetime.now().strftime('%m.%Y'),     # ex: 05.2026
laudo\_min=min(laudo\_numbers) if laudo\_numbers else '',
laudo\_max=max(laudo\_numbers) if laudo\_numbers else '',
```

**Template — adicionar no início de `relatorio\_pdf.html`, ANTES do conteúdo atual:**

```html
<div style="page-break-after:always; position:relative; width:100%; min-height:100vh;">

  <!-- Imagens decorativas — variáveis base64 já existem no contexto -->
  <img src="data:image/png;base64,{{capa\_img\_left\_b64}}"
       style="position:absolute; left:0; top:0; height:100%;" />
  <img src="data:image/png;base64,{{capa\_img\_top\_right\_b64}}"
       style="position:absolute; right:0; top:0;" />
  <img src="data:image/png;base64,{{capa\_img\_bot\_right\_b64}}"
       style="position:absolute; right:0; bottom:0;" />

  <!-- Logo -->
  <img src="data:image/png;base64,{{logo\_b64}}"
       style="position:absolute; top:40px; left:40px; width:180px;" />

  <!-- Título fixo -->
  <div style="position:absolute; top:180px; left:40px;">
    <p style="font-size:20px; margin:0;">RELATÓRIO DE</p>
    <p style="font-size:36px; font-weight:bold; margin:0;">RUÍDO OCUPACIONAL</p>
  </div>

  <!-- Dados da empresa -->
  <div style="position:absolute; top:320px; left:40px;">
    <p><small>EMPRESA</small><br/><strong>{{razao\_social}}</strong></p>
    <p><small>ENDEREÇO</small><br/>{{endereco}}</p>
    <p><small>CNPJ</small><br/>{{cnpj}}</p>
  </div>

  <!-- Nº do Relatório — range automático das fichas selecionadas -->
  <div style="position:absolute; bottom:220px; left:40px;">
    <p style="font-size:12px; margin:0;">Nº RELATÓRIO</p>
    <p style="font-size:32px; font-weight:bold; margin:0;">
      {{laudo\_min}}.1/{{year}} ao {{laudo\_max}}.1/{{year}}
    </p>
    <p style="font-size:12px; margin:0;">DATA DE EMISSÃO: {{report\_date}}</p>
  </div>

</div>
<!-- FIM DA CAPA — CONTEÚDO ORIGINAL DO TEMPLATE CONTINUA ABAIXO SEM ALTERAÇÕES -->
```

**Validação:** PDF tem capa como 1ª página. Todos os campos preenchidos. Testar com 1 ficha (laudo\_min == laudo\_max) e com múltiplas. Conteúdo técnico nas páginas seguintes intacto.

\---

## 10\. PADRÃO DE TRABALHO

```
Para ajustes de RISCO BAIXO  → executar diretamente, reportar o que foi feito
Para ajustes de RISCO MÉDIO  → ler arquivos, reportar diagnóstico, AGUARDAR confirmação
Para qualquer ajuste         → mostrar o trecho alterado ANTES de salvar
Após cada ajuste             → confirmar validação antes de avançar ao próximo
```

\---

## 11\. ANTI-PADRÕES — O QUE NUNCA FAZER

```
❌ Não analisar o projeto inteiro desnecessariamente
❌ Não misturar 2 ajustes no mesmo passo
❌ Não criar migrations para mudanças visuais
❌ Não duplicar componentes que já existem (importar, não recriar)
❌ Não alterar arquivos fora dos listados em cada ajuste
❌ Não avançar ao próximo ajuste sem validação do ajuste atual
❌ Não usar paths errados: templates estão em backend/app/templates/, não backend/templates/
❌ Não confundir exclusão de FieldSheet (E4/E5) com exclusão de GeneratedReport
```

\---

*EcoSegme · CLAUDE.md v2.0 · Maio 2026 · Corrigido com base no README.md e código real*

