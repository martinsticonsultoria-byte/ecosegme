# CLAUDE.ECOSEGME.md
> Arquivo de contexto completo do projeto EcoSegme para continuidade com outras IAs.
> Última atualização: Junho 2026

---

## 1. VISÃO GERAL DO PROJETO

**EcoSegme** é um sistema web para gestão de laudos de dosimetria de ruído ocupacional, desenvolvido para a Ecosegme Ambiental (consultoria ambiental em Manaus/AM).

**Problema resolvido:** substituiu um processo 100% manual (dosímetro → Excel → PDF) que levava 5 dias por laudo. Hoje: menos de 15 minutos por laudo, ~80 laudos/mês.

**Perfis de usuário:**
- `technician` — Técnico de Campo: preenche fichas de campo
- `admin_staff` — Administrativo: confere, aprova, gera laudos e relatórios

---

## 2. INFRAESTRUTURA E REPOSITÓRIOS

| Componente | Detalhe |
|---|---|
| **Backend** | FastAPI (Python 3.12) — `ecosegme-backend.onrender.com` (conta Eduardo) |
| **Frontend (produção)** | React 18 + Vite — `ecosegme-se6m.vercel.app` (conta Eduardo) |
| **Frontend (dev/original)** | `ecosegme-frontend.vercel.app` (conta Guilherme) |
| **Banco de dados** | PostgreSQL via Supabase — região sa-east-1 (São Paulo) |
| **Storage** | Supabase Storage — bucket `laudos` |
| **Repositório dev** | `github.com/glizardx/ecosegme` |
| **Repositório próprio** | `github.com/martinsticonsultoria-byte/ecosegme` |
| **Render Workspace** | `tea-d700g7nafjfc73arrptg` |

### Variáveis de Ambiente (Render)
```
DATABASE_URL=postgresql://postgres.kbjixxgrikabhhqultui:[SENHA]@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
SECRET_KEY=[JWT_SECRET]
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
ALLOWED_ORIGINS=https://ecosegme-frontend.vercel.app,https://ecosegme-se6m.vercel.app
SUPABASE_URL=[URL]
SUPABASE_KEY=[SERVICE_KEY]
SUPABASE_BUCKET=laudos
STORAGE_DIR=/tmp/laudos
```

**ATENÇÃO:** A conexão com o banco usa o **Session Pooler** do Supabase (porta 5432), NÃO o Transaction Pooler (porta 6543) nem a conexão direta (IPv6 — não funciona no Render).

---

## 3. STACK TÉCNICA

**Backend:**
- FastAPI + SQLAlchemy + Alembic (migrations)
- pdfplumber (parser SONUS 2)
- WeasyPrint + Jinja2 (geração de PDFs)
- bcrypt + JWT (autenticação)
- Supabase Storage (PDFs)
- SlowAPI (rate limiting)

**Frontend:**
- React 18 + Vite
- React Router (rotas protegidas por perfil)
- Axios com interceptors JWT e loading bar
- Token salvo em `localStorage`

---

## 4. ESTRUTURA DO PROJETO

```
ecosegme/
├── backend/
│   ├── app/
│   │   ├── routers/        # auth, companies, employees, field_sheets,
│   │   │                   # uploads, reports, users, epis, setup
│   │   ├── models/         # Company, Employee, FieldSheet, GeneratedReport,
│   │   │                   # ConsolidatedReport, SonusUpload, AuditLog
│   │   ├── templates/
│   │   │   ├── relatorio_pdf.html   # Template relatório consolidado
│   │   │   ├── laudo.html           # Template laudo individual
│   │   │   ├── ficha_campo.html     # Template ficha de campo
│   │   │   └── images/              # logo.png, capa_fundo.png,
│   │   │                            # relatorio_assinatura.png, etc.
│   │   ├── parser.py       # Parser SONUS 2 com score de confiança
│   │   ├── pdf_generator.py
│   │   └── supabase_storage.py
│   └── alembic/versions/   # 17+ migrations
└── frontend/
    └── src/
        ├── pages/          # Login, Companies, CompanyDetail, Conference,
        │                   # FieldSheetForm, Users, Reports, Employees
        ├── components/     # Navbar, PrivateRoute
        ├── context/        # AuthContext.jsx
        └── api/            # axios.js
```

---

## 5. FLUXO PRINCIPAL DO SISTEMA

```
Técnico de Campo (celular/desktop)
        ↓
Preenche Ficha de Campo (/field-sheet/new)
  - Seleciona empresa e funcionário (ou cadastra novo)
  - Preenche: tipo análise, nº dosímetro, data coleta, EPI, atividade, máquinas
        ↓
Admin — Aba Conferência (/conference)
  - Vê fichas pendentes
  - Edita: define Nº do Laudo (xxx), Data do Relatório, Conclusão
  - Faz upload do PDF SONUS 2 → parser extrai dados automaticamente
  - Aprovação: sistema calcula .y automaticamente, gera laudo_number completo
        ↓
Admin — Gera Relatório
  - Seleciona fichas aprovadas do mesmo grupo (mesmo xxx)
  - Gera PDF consolidado ou XLSX
  - Nome do arquivo: Relatório_{tipo}_{empresa}_{xxx}.pdf
        ↓
Laudo individual e relatório consolidado disponíveis para download
```

---

## 6. REGRA DO Nº DE LAUDO (DEFINITIVA)

**Formato:** `xxx.y/ano`

| Campo | Regra |
|---|---|
| `xxx` | String digitada pelo admin (pode ter zeros à esquerda: `047`). Representa o grupo de análise. **Único globalmente por ano** — não pode repetir entre empresas diferentes no mesmo ano. Zera a cada virada de ano (mesmo xxx pode ser reusado em anos diferentes). |
| `.y` | Inteiro calculado automaticamente **na aprovação**. Sequencial contando fichas aprovadas com mesmo xxx + 1. Zera quando muda o xxx. |
| `/ano` | Ano atual do sistema (datetime.now().year). Automático. |

**Exemplos:**
```
Grupo 345, 10 fichas, ano 2026:
  345.1/2026, 345.2/2026, ..., 345.10/2026

Mesmo xxx 8856 pode ser reusado em 2027:
  8856.1/2027, 8856.2/2027, ...
```

**Validação na aprovação:**
- Se `xxx` já aparece em `ConsolidatedReport` gerado no **ano atual** → BLOQUEAR
- Se `xxx` existe em fichas aprovadas da **mesma empresa** sem relatório gerado → PERMITIR (adiciona ao grupo)
- Se `xxx` existe em fichas aprovadas de **empresa diferente** no mesmo ano → BLOQUEAR

**Campos no banco:**
- `laudo_number`: String(20) — armazena o xxx digitado pelo admin
- `laudo_y`: Integer nullable — calculado na aprovação

**Exibição no frontend:**
- Ficha não aprovada: mostra apenas `xxx` (ex: "345")
- Ficha aprovada: mostra completo `xxx.y/ano` (ex: "345.3/2026")

---

## 7. CAPA DO RELATÓRIO PDF

**Abordagem:** imagem de fundo (`capa_fundo.png`) + textos dinâmicos posicionados via `position:absolute`.

**Arquivo de fundo:** `backend/app/templates/images/capa_fundo.png`
- Dimensões originais Canva: 1055 × 1491 px
- Renderizado em A4: 595pt × 842pt
- **IMPORTANTE:** A imagem NÃO contém textos dinâmicos — apenas o design de fundo.

**Coordenadas dos campos (convertidas de Canva para WeasyPrint pt):**

| Campo | left | top | font-size | max-width | cor |
|---|---|---|---|---|---|
| razao_social | 93.4pt | 383.2pt | dinâmico* | 375.9pt | #005d50 |
| endereco | 93.4pt | 443.0pt | dinâmico* | 329.6pt | #005d50 |
| cnpj | 93.4pt | 503.2pt | 16.5pt | 215.9pt | #005d50 |
| nº relatório | 45.2pt | 599.3pt | dinâmico* | 321.0pt | #ffffff |
| data emissão | 82.1pt | 685.9pt | 11pt | 120pt | #ffffff |

*Font-size dinâmico: calculado em `reports.py` via `calc_font_size()` baseado no comprimento do texto.

**Fórmula de conversão Canva → WeasyPrint:**
```
left_pt = (x_px / 1055) * 595
top_pt = (y_px / 1491) * 842
```

**Variáveis Jinja2 disponíveis no template:**
```python
capa_fundo_b64, logo_b64, assinatura_b64,
razao_social, cnpj, endereco,
laudo_min, laudo_max, year, report_date,
empresa_font_size, endereco_font_size, nr_font_size,
signature_date_ext
```

**WeasyPrint — restrições importantes:**
- NÃO suporta flexbox nem CSS Grid
- NÃO suporta `object-fit`
- Suporta `position:absolute` dentro de `position:relative`
- Google Fonts via `@import` pode não carregar — usar fallback Arial

---

## 8. ASSINATURA NO RELATÓRIO

**Arquivo:** `backend/app/templates/images/relatorio_assinatura.png`
- Fundo branco
- Contém: assinatura manuscrita + linha + nome + cargo + CREA

**Layout no template:**
```html
<p style="font-size:11pt; color:#1a1a1a; margin-bottom:24pt;">
  Manaus, {{ signature_date_ext }}
</p>
<img src="data:image/png;base64,{{ assinatura_b64 }}"
     style="width:280pt; height:auto; display:block; margin:0 auto;"/>
```

**`signature_date_ext`** — formato: "13 de maio de 2026"
- Em laudos individuais: usa `data_relatorio` da ficha
- Em relatório consolidado: usa `data_relatorio` da primeira ficha do lote
- Fallback: `datetime.now()`

---

## 9. PARSER SONUS 2

**Arquivo:** `backend/app/parser.py`

**Campo correto:** `Dose [%]` — NÃO `Dose diária [%]` (são valores diferentes)

**Matching de nomes:**
```python
def names_match(name_pdf, name_db, threshold=0.85):
    # Tokens numéricos devem ser idênticos (ex: "João Teste 1" vs "João Teste 2")
    nums_a = set(re.findall(r'\b\d+\b', normalize_text(name_pdf).lower()))
    nums_b = set(re.findall(r'\b\d+\b', normalize_text(name_db).lower()))
    if (nums_a or nums_b) and nums_a != nums_b:
        return False
    return SequenceMatcher(None, a, b).ratio() >= threshold
```

**Score de confiança:** 0–6 campos extraídos com sucesso. Score < 3 → arquivo rejeitado.

**Bloqueio de upload com nome divergente:**
- Se nome do PDF diverge do cadastro → retorna HTTP 422, NÃO salva nada no banco nem no Storage
- Botão "Excluir e reenviar" foi removido (arquivo errado nunca é salvo)

---

## 10. MIGRATIONS ALEMBIC

**Status atual das migrations (head: `c5d6e7f8a9b0`):**

Migrations relevantes em ordem:
- `f7a8b9c0d1e2` — constraint por empresa (em vez de global)
- `f1a2b3c4d5e6` — remove unique laudo_number (arquivo crítico — NÃO deletar)
- `a1b2c3d4e5f6` — permite laudo_number repetido por empresa
- `a2b3c4d5e6f7` — laudo_number string, remove laudo_y (constraint removida por causa de dados duplicados)
- `c5d6e7f8a9b0` — merge heads (head atual)
- `d1e2f3a4b5c6` — adiciona laudo_y nullable

**ATENÇÃO:** O arquivo `f1a2b3c4d5e6` DEVE existir no repositório. Se deletado, causa `KeyError` no Alembic e o deploy falha.

**Comando de deploy:** `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

## 11. SEGURANÇA

| Item | Status |
|---|---|
| Swagger/ReDoc desabilitados em produção | ✅ |
| `.env` no `.gitignore` | ✅ |
| SECRET_KEY sem valor default no código | ✅ |
| Bcrypt cost 12 nas senhas | ✅ |
| Rate limiting no login (10/min) | ✅ |
| SQL injection: ORM parametrizado | ✅ |
| SHA-256 em laudos gerados | ✅ |
| Laudos imutáveis após geração | ✅ |
| `setup.py` removido (era código morto) | ✅ |
| `min_length=10` em UserCreate | ✅ |

**CORS:** `ALLOWED_ORIGINS` configurado como variável de ambiente no Render. URLs permitidas: `ecosegme-frontend.vercel.app` e `ecosegme-se6m.vercel.app`.

---

## 12. ARQUIVOS-CHAVE DO FRONTEND

### AuthContext.jsx
```jsx
// Token salvo no localStorage
// user = { email, role, name }
// name usado como technician_name nas fichas
// ATENÇÃO: catch do useEffect deve preservar token quando offline
.catch(() => {
  if (navigator.onLine) localStorage.removeItem('token')
  else setUser({ name: 'Técnico', role: 'technician' })
})
```

### axios.js
```js
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
// Auto-redirect para /login em 401
// Loading bar no topo da página
```

### App.jsx — Rotas
```jsx
/login                → Login (público)
/companies            → Companies (adminOnly)
/companies/:id        → CompanyDetail (adminOnly)
/field-sheet/new      → FieldSheetMobile (todos autenticados) ← técnico usa esta
/field-sheet/admin    → FieldSheetForm original (adminOnly)
/conference           → Conference (adminOnly)
/reports              → Reports (adminOnly)
/users                → Users (adminOnly)
/* → redirect para /field-sheet/new
```

---

## 13. PWA OFFLINE (EM DESENVOLVIMENTO)

**Status:** prompt gerado, aguardando execução no Claude Code.

**Objetivo:** técnico de campo usa o formulário de ficha pelo celular sem internet.

**Arquivos a criar:**
- `frontend/public/manifest.json`
- `frontend/public/sw.js`
- `frontend/src/offlineStorage.js` (IndexedDB)
- `frontend/src/pages/FieldSheetMobile.jsx` (versão mobile do formulário)

**Arquivos a alterar (mínimo):**
- `frontend/index.html` (4 linhas no head + service worker register)
- `frontend/src/App.jsx` (adicionar rota /field-sheet/new → FieldSheetMobile)
- `frontend/src/context/AuthContext.jsx` (preservar token offline)

**Funcionamento offline:**
1. Técnico acessa, faz login (token salvo no localStorage)
2. Companies/epis cacheados no IndexedDB na primeira carga online
3. Sem internet: formulário usa cache local, salva fichas no IndexedDB
4. Ao voltar online: sincroniza automaticamente via `navigator.onLine` event

---

## 14. DECISÕES ARQUITETURAIS IMPORTANTES

| Decisão | Justificativa |
|---|---|
| WeasyPrint para PDFs | Controle total do layout via HTML/CSS |
| Supabase como banco + storage | Gerenciado, região São Paulo, gratuito para o volume atual |
| Render Starter ($7/mês) | Elimina cold start sem overhead de gestão |
| Session Pooler (porta 5432) | Render não suporta IPv6 — Direct Connection falha |
| Imagem de fundo na capa | Elimina problemas de CSS/WeasyPrint para layout complexo |
| Validação do xxx no código (não constraint) | Banco tinha dados duplicados, constraint foi removida |
| FieldSheetMobile separado | Não toca no código existente do admin |

---

## 15. PADRÕES DE TRABALHO COM CLAUDE CODE

**Princípios:**
- Prompt único e completo — sem intermediações
- Máxima economia de tokens
- Diagnóstico antes de alterar quando há risco
- Commit + push ao final de cada sessão
- Sempre fazer push para `origin main` E `meu-fork main`

**Git remotes:**
```bash
origin    → https://github.com/glizardx/ecosegme.git (dev)
meu-fork  → https://github.com/martinsticonsultoria-byte/ecosegme.git (próprio)
```

**Fluxo padrão:**
```bash
git checkout main
git pull origin main --rebase
# ... implementações ...
git add .
git commit -m "tipo: descrição"
git push origin main
git push meu-fork main
```

**Conflitos frequentes:** quando `meu-fork` está desatualizado, usar `git push meu-fork main --force` com cuidado.

---

## 16. PENDÊNCIAS EM ABERTO (junho 2026)

### Críticas (em desenvolvimento):
- [ ] PWA offline para técnico de campo (FieldSheetMobile.jsx)
- [ ] Validar regra definitiva do Nº de Laudo em produção
- [ ] Testar capa do PDF com coordenadas definitivas

### Funcionais (bugs conhecidos):
- [ ] Tabela resumo: colspan do cabeçalho desalinhado com corpo
- [ ] Filtros na aba Relatórios (período + nº do laudo) — implementado, aguarda validação
- [ ] Aviso de prefixos mistos ao gerar relatório — implementado, aguarda validação

### Futuras (planejadas):
- [ ] Dashboard de insights estratégicos (volume de laudos, tempo economizado, etc.)
- [ ] Painel de configuração para a Ecosegme (campos customizáveis, templates editáveis)
- [ ] Domínio próprio (ex: app.ecosegme.com.br)
- [ ] Tornar repositório público para portfolio

---

## 17. CONTEXTO DE NEGÓCIO

**Cliente:** Ecosegme Ambiental — consultoria ambiental em Manaus/AM
**Serviço principal:** laudos de dosimetria de ruído ocupacional (NR-15, NHO-01)
**Volume:** ~80 laudos/mês, 5 técnicos de campo, 1-2 admins
**Engenheiro responsável:** Arimar Neves Neto — CREA Nº 13726-D/AM
**Dev original:** Guilherme Lizardo (`glizardx`) — repositório original
**Consultor/CTO:** Eduardo Martins — repositório fork, autonomia de deploy

---

## 18. LINKS ÚTEIS

| Recurso | URL |
|---|---|
| Sistema em produção | https://ecosegme-se6m.vercel.app |
| Backend API | https://ecosegme-backend.onrender.com |
| Repositório próprio | https://github.com/martinsticonsultoria-byte/ecosegme |
| Render Dashboard | https://dashboard.render.com |
| Supabase Dashboard | https://supabase.com/dashboard |
| Vercel Dashboard | https://vercel.com/dashboard |

---

*Gerado automaticamente em junho de 2026. Atualizar após cada sessão de desenvolvimento.*
