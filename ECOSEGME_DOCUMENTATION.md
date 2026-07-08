# EcoSegme — Documentação Técnica Completa

> **Finalidade deste documento:** Referência técnica completa do sistema EcoSegme para uso em sessões de IA, planejamento de ajustes e onboarding de desenvolvedores. Contém a estrutura atual do sistema e ao final o roadmap de novas features.

**Versão:** 2.0  
**Data:** 2026-07-06  
**Repositório:** https://github.com/martinsticonsultoria-byte/ecosegme  
**Backend (produção):** https://ecosegme.onrender.com  
**Frontend (produção):** https://ecosegme-se6m.vercel.app  
**API Docs (produção):** https://ecosegme.onrender.com/docs (disponível apenas em modo DEBUG)

---

## Índice

1. [O que é o EcoSegme](#1-o-que-é-o-ecosegme)
2. [Problema de Negócio Resolvido](#2-problema-de-negócio-resolvido)
3. [Fluxo Principal do Sistema](#3-fluxo-principal-do-sistema)
4. [Stack Técnica](#4-stack-técnica)
5. [Arquitetura de Infraestrutura](#5-arquitetura-de-infraestrutura)
6. [Estrutura de Pastas](#6-estrutura-de-pastas)
7. [Banco de Dados — Tabelas e Modelos](#7-banco-de-dados--tabelas-e-modelos)
8. [API — Endpoints por Router](#8-api--endpoints-por-router)
9. [Frontend — Páginas e Componentes](#9-frontend--páginas-e-componentes)
10. [Autenticação e Segurança](#10-autenticação-e-segurança)
11. [Geração de PDFs](#11-geração-de-pdfs)
12. [Parser SONUS 2](#12-parser-sonus-2)
13. [Armazenamento de Arquivos](#13-armazenamento-de-arquivos)
14. [Histórico de Migrations](#14-histórico-de-migrations)
15. [Variáveis de Ambiente](#15-variáveis-de-ambiente)
16. [Deploy e CI/CD](#16-deploy-e-cicd)
17. [Regras de Negócio Críticas](#17-regras-de-negócio-críticas)
18. [⚠️ NOVAS FEATURES — Sugestões em Desenvolvimento](#18-️-novas-features--sugestões-em-desenvolvimento)

---

## 1. O que é o EcoSegme

O **EcoSegme** é um sistema web de gestão de laudos técnicos de **dosimetria de ruído ocupacional**, desenvolvido para a empresa **Ecosegme Ambiental** (Manaus/AM).

O sistema gerencia todo o ciclo de vida de um laudo técnico: da coleta em campo pelo técnico até a geração do relatório PDF final entregue ao cliente, garantindo rastreabilidade, imutabilidade e conformidade com as normas técnicas **NR-15** e **NHO-01**.

**Cliente:** Ecosegme Ambiental — consultoria ambiental especializada em higiene ocupacional, Manaus/AM  
**Desenvolvido por:** Eduardo Martins (Martins Consulta) e Guilherme Lizardo

---

## 2. Problema de Negócio Resolvido

Antes do sistema, o processo era 100% manual:

```
Dosímetro SONUS 2
  → exportar PDF manualmente
  → transcrever dados para Excel
  → formatar laudo em Word
  → gerar PDF final
```

**Resultado:** dias por laudo, atrasos de vários dias no faturamento, dezenas de laudos acumulados por mês, erros frequentes de transcrição.

Com o EcoSegme:

```
Dosímetro SONUS 2
  → upload do PDF pelo técnico
  → parser automático extrai 6 campos
  → admin revisa em conferência
  → relatório PDF em < 5 minutos
```

**Impacto medido:**

| Métrica | Antes | Depois |
|---|---|---|
| Tempo por laudo | Dias | < 5 minutos |
| Atraso no faturamento | Vários dias | Zero |
| Erros de transcrição | Frequentes | Zero (parser automático) |
| Laudos acumulados | Dezenas/mês | Zero |

---

## 3. Fluxo Principal do Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     FLUXO RUÍDO OCUPACIONAL (atual)                     │
└─────────────────────────────────────────────────────────────────────────┘

1. Técnico de Campo
   └→ Cria Ficha de Campo (FieldSheetForm.jsx)
       Preenche: empresa, funcionário, dosímetro, data, atividade, EPI
       → status: "pendente"

2. Técnico de Campo
   └→ Faz upload do PDF SONUS 2 (dosímetro)
       Parser extrai: nome funcionário, início, fim, dose diária, NE(dB), NEN(dB)
       Validação: nome no PDF vs nome no cadastro (threshold 85% de similaridade)

3. Admin — Aba Conferência (Conference.jsx)
   └→ Revisa ficha + dados do SONUS
       Edita campos se necessário (EPI, atividade, conclusão, etc.)
       Define: Nº do Laudo (ex: 42 → exibido como "42.1/2026")
       Define: Data do Relatório
       → Aprova ficha (status: "aprovada")
       → laudo_y calculado automaticamente

4. Admin — Aba Laudos (CompanyDetail.jsx)
   └→ Gera Laudo Individual PDF por ficha
       Laudo é imutável após geração (SHA-256 registrado)
       Armazenado no Supabase Storage
       → Disponível para download com signed URL

5. Admin — Aba Relatórios (Conference.jsx ou CompanyDetail.jsx)
   └→ Seleciona N fichas aprovadas
       Gera Relatório Consolidado PDF (com capa + N laudos)
       OU gera Relatório XLSX
       → Salvo no Supabase Storage + registrado na tabela consolidated_reports

REVERSÃO: excluir GeneratedReport → ficha volta para status "pendente" automaticamente
```

---

## 4. Stack Técnica

### Backend (`backend/`)

| Componente | Tecnologia | Versão |
|---|---|---|
| Linguagem | Python | 3.12 |
| Framework | FastAPI | 0.133.1 |
| ORM | SQLAlchemy | 2.0.47 |
| Migrations | Alembic | 1.18.4 |
| Banco | PostgreSQL 16 via Supabase | — |
| Geração PDF | WeasyPrint + Jinja2 | 68.1 / 3.1.6 |
| Parse PDF SONUS | pdfplumber | 0.11.9 |
| Relatório XLSX | openpyxl | latest |
| Processamento imagem | Pillow | 12.1.1 |
| Autenticação | python-jose (JWT HS256) | 3.5.0 |
| Validação | Pydantic | 2.12.5 |
| Rate limiting | slowapi | 0.1.9 |
| Storage | Supabase SDK | ≥2.0.0 |
| Servidor ASGI | Uvicorn | 0.41.0 |
| Testes | pytest + httpx | 9.0.2 / 0.28.1 |

### Frontend (`frontend/`)

| Componente | Tecnologia | Versão |
|---|---|---|
| Framework | React | 19.2.0 |
| Build | Vite | 7.3.1 |
| Roteamento | react-router-dom | 7.13.1 |
| HTTP Client | Axios | 1.13.5 |

### Infra

| Serviço | Uso | Região |
|---|---|---|
| Render | Deploy do backend (Python/FastAPI) | US East (Virginia) |
| Vercel | Deploy do frontend (React/Vite) | Edge global |
| Supabase | Banco PostgreSQL + File Storage | sa-east-1 (São Paulo) |
| GitHub | Repositório + CI/CD trigger | — |

---

## 5. Arquitetura de Infraestrutura

```
┌─────────────────────────────────────────────────────────┐
│                    USUÁRIO FINAL                        │
│         Técnico de Campo / Administrativo               │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│            FRONTEND — Vercel (Edge CDN)                 │
│    React 19 + Vite · SPA · https://ecosegme-se6m.vercel.app │
│                                                         │
│  Login → Companies → Employees → FieldSheets           │
│  Conference → Reports → Users                          │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API (JWT Bearer Token)
                      │ HTTPS → https://ecosegme.onrender.com
┌─────────────────────▼───────────────────────────────────┐
│            BACKEND — Render (Web Service)               │
│    FastAPI · Python 3.12 · Uvicorn                     │
│                                                         │
│  Routers: auth / companies / employees / field_sheets  │
│           uploads / reports / users / epis / setup     │
│                                                         │
│  Parser SONUS 2 (pdfplumber + regex)                   │
│  PDF Generator (WeasyPrint + Jinja2 templates)         │
└──────────────┬──────────────────┬──────────────────────┘
               │                  │
               ▼                  ▼
┌──────────────────┐   ┌──────────────────────────────┐
│  Supabase DB     │   │     Supabase Storage          │
│  PostgreSQL 16   │   │  Bucket: laudos + SONUS PDFs  │
│  sa-east-1       │   │  Signed URLs (acesso seguro)  │
└──────────────────┘   └──────────────────────────────┘
               ▲
               │ Auto-deploy (git push → main)
┌──────────────┴──────────────────────────────────────┐
│           GitHub — martinsticonsultoria-byte/ecosegme │
│           branch: main · 125+ commits               │
└─────────────────────────────────────────────────────┘
```

**Deploy automático:**
- Push na branch `main` → Render detecta mudança → rebuild + restart automático (backend)
- Push na branch `main` → Vercel detecta mudança → rebuild + redeploy automático (frontend)

---

## 6. Estrutura de Pastas

```
ecosegme/                          ← raiz do projeto
├── CLAUDE.md                      ← instruções para IA (regras absolutas do projeto)
├── CLAUDE.ECOSEGME.md             ← variação de instruções
├── ECOSEGME_DOCUMENTATION.md      ← este arquivo
├── README.md                      ← README público (portfólio)
├── render.yaml                    ← configuração de deploy (Render)
│
├── backend/
│   ├── requirements.txt           ← dependências Python
│   ├── build.sh                   ← script de build no Render
│   ├── alembic.ini                ← configuração do Alembic
│   ├── render.yaml                ← configuração específica do backend
│   │
│   ├── alembic/
│   │   ├── env.py                 ← ambiente de migration
│   │   └── versions/              ← 20 migrations versionadas
│   │
│   ├── tests/                     ← testes pytest (20 testes)
│   │
│   └── app/
│       ├── main.py                ← entrypoint FastAPI + middlewares
│       ├── config.py              ← configurações via pydantic-settings
│       ├── database.py            ← engine SQLAlchemy + session
│       ├── parser.py              ← parser PDF SONUS 2
│       ├── pdf_generator.py       ← geração de laudo individual (WeasyPrint)
│       ├── supabase_storage.py    ← integração Supabase Storage
│       ├── seed.py                ← dados iniciais
│       │
│       ├── core/
│       │   ├── deps.py            ← get_current_user, require_admin, require_technician
│       │   ├── security.py        ← JWT encode/decode, bcrypt
│       │   └── limiter.py         ← rate limiter (slowapi)
│       │
│       ├── models/                ← modelos SQLAlchemy
│       │   ├── user.py
│       │   ├── company.py
│       │   ├── employee.py
│       │   ├── field_sheet.py
│       │   ├── sonus_upload.py
│       │   ├── generated_report.py
│       │   ├── consolidated_report.py
│       │   ├── audit_log.py
│       │   └── custom_epi.py
│       │
│       ├── schemas/               ← schemas Pydantic (validação I/O)
│       │   ├── company.py
│       │   ├── employee.py
│       │   └── field_sheet.py
│       │
│       ├── routers/               ← endpoints da API
│       │   ├── auth.py            ← /auth
│       │   ├── companies.py       ← /companies
│       │   ├── employees.py       ← /employees
│       │   ├── field_sheets.py    ← /field-sheets
│       │   ├── uploads.py         ← /uploads
│       │   ├── reports.py         ← /reports
│       │   ├── users.py           ← /users (admin only)
│       │   ├── epis.py            ← /epis
│       │   └── setup.py           ← /setup
│       │
│       └── templates/             ← ⚠️ ATENÇÃO: templates AQUI, não em backend/templates/
│           ├── laudo.html         ← template laudo individual (NÃO alterar)
│           ├── relatorio_pdf.html ← template relatório consolidado PDF
│           ├── ficha_campo.html   ← template ficha de campo PDF
│           ├── relatorio_template.xlsx ← template XLSX
│           ├── logo.png
│           ├── assinatura_arimar.png
│           └── images/            ← imagens da capa do relatório
│               ├── capa_img_left.png
│               ├── capa_img_top_right.png
│               └── capa_img_bot_right.png
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── vercel.json                ← SPA rewrite: todas as rotas → /index.html
    └── src/
        ├── App.jsx                ← rotas principais com PrivateRoute
        ├── main.jsx               ← entrypoint React
        │
        ├── api/
        │   └── axios.js           ← instância Axios + interceptors JWT auto-inject
        │
        ├── context/
        │   └── AuthContext.jsx    ← estado global de autenticação (token, role, name)
        │
        ├── components/
        │   ├── Navbar.jsx         ← barra de navegação (condicional por role)
        │   └── PrivateRoute.jsx   ← proteção de rotas por autenticação
        │
        └── pages/
            ├── Login.jsx          ← tela de login
            ├── Companies.jsx      ← listagem de empresas
            ├── CompanyDetail.jsx  ← detalhes da empresa (4 abas)
            ├── Conference.jsx     ← conferência e aprovação de fichas
            ├── FieldSheetForm.jsx ← formulário de nova ficha de campo
            ├── FieldSheetMobile.jsx ← versão mobile da ficha
            ├── Employees.jsx      ← gestão de funcionários
            ├── Reports.jsx        ← histórico de relatórios consolidados
            └── Users.jsx          ← gestão de usuários (admin only)
```

---

## 7. Banco de Dados — Tabelas e Modelos

Banco: **PostgreSQL 16** gerenciado pelo Supabase, região **sa-east-1 (São Paulo)**.

### 7.1 `users`

Usuários do sistema com dois perfis de acesso.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | Integer PK | identificador |
| `name` | VARCHAR(150) NOT NULL | nome completo |
| `email` | VARCHAR(150) UNIQUE NOT NULL | login |
| `password_hash` | VARCHAR(255) NOT NULL | bcrypt |
| `role` | Enum NOT NULL | `technician` ou `admin_staff` |
| `active` | Boolean DEFAULT true | soft delete |
| `created_at` | TIMESTAMPTZ | criação |

**Perfis:**
- `technician` — Técnico de Campo: cria fichas, faz upload do SONUS 2
- `admin_staff` — Administrativo: revisa, aprova, gera laudos e relatórios

### 7.2 `companies`

Empresas clientes avaliadas pela Ecosegme.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | Integer PK | identificador |
| `razao_social` | VARCHAR(200) NOT NULL | nome da empresa |
| `cnpj` | VARCHAR(18) | CNPJ formatado |
| `endereco` | VARCHAR(300) | endereço completo |
| `created_at` | TIMESTAMPTZ | criação |

### 7.3 `employees`

Funcionários das empresas clientes.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | Integer PK | identificador |
| `company_id` | Integer FK → companies | empresa |
| `nome` | VARCHAR(150) NOT NULL | nome completo |
| `funcao` | VARCHAR(100) | cargo/função |
| `matricula` | VARCHAR(50) | matrícula |
| `setor` | VARCHAR(100) | setor de trabalho |
| `local` | VARCHAR(100) | local de trabalho |
| `created_at` | TIMESTAMPTZ | criação |

### 7.4 `field_sheets` — TABELA CENTRAL

Ficha de campo de dosimetria de ruído. Uma por funcionário por coleta.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | Integer PK | identificador |
| `company_id` | Integer FK → companies NOT NULL | empresa avaliada |
| `employee_id` | Integer FK → employees NULLABLE | funcionário (pode ser NULL se nome livre) |
| `employee_name_text` | VARCHAR(150) | fallback: nome digitado manualmente |
| `laudo_number` | **String(50) NULLABLE** | ⚠️ SEMPRE STRING — ex: "42" |
| `laudo_y` | Integer NULLABLE | calculado na aprovação — ex: 1 → "42.1/2026" |
| `dosimeter_number` | Integer NOT NULL | número do dosímetro |
| `collection_date` | Date NOT NULL | data da coleta |
| `epi` | VARCHAR(200) | EPIs utilizados |
| `activity` | Text | atividade executada |
| `machine_noise` | Text | máquinas/equipamentos ruidosos |
| `tipo_analise` | VARCHAR(50) NULLABLE | "Ruído", "Temperatura", "Iluminância" — NULL = Ruído (legado) |
| `status` | VARCHAR(20) DEFAULT 'pendente' | `pendente` ou `aprovada` |
| `technician_name` | VARCHAR(150) NOT NULL | técnico responsável (1º) |
| `technician_name_2` | VARCHAR(150) | técnico responsável (2º) |
| `signature_date` | Date | data da assinatura/aprovação |
| `data_relatorio` | Date | data oficial do laudo (admin define) |
| `conclusao_texto` | Text | conclusão customizada (sobrepõe auto-gerada) |
| `turno` | VARCHAR(50) | turno de trabalho |
| `codigo_esocial` | VARCHAR(50) | código e-Social do CBO |
| `pre_verificacao_db` | VARCHAR(20) DEFAULT '114,00' | calibração pré-medição (dB) |
| `pos_verificacao_db` | VARCHAR(20) | calibração pós-medição (dB) |
| `created_by` | Integer FK → users NOT NULL | quem criou |
| `created_at` | TIMESTAMPTZ | criação |

**Regra de exibição do número do laudo:**
```
laudo_number = "42" (string no banco)
laudo_y = 1 (calculado na aprovação)
Exibição: "42.1/2026"  ← construído no frontend/backend, NUNCA salvo assim
```

**Cálculo do laudo_y na aprovação:**
```python
count = db.query(FieldSheet).filter(
    company_id == sheet.company_id,
    laudo_number == xxx,
    laudo_y IS NOT NULL,
    id != sheet.id
).count()
sheet.laudo_y = count + 1
```

### 7.5 `sonus_uploads`

PDF exportado pelo dosímetro SONUS 2, com dados extraídos pelo parser.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | Integer PK | identificador |
| `field_sheet_id` | Integer FK → field_sheets NOT NULL | ficha vinculada |
| `original_filename` | VARCHAR(255) | nome original do arquivo |
| `storage_path` | VARCHAR(500) | caminho no storage |
| `parsed_employee_name` | VARCHAR(150) | nome extraído do PDF |
| `inicio` | VARCHAR(20) | horário de início da medição |
| `fim` | VARCHAR(20) | horário de fim |
| `dose_diaria` | VARCHAR(20) | dose diária (%) |
| `ne_db` | VARCHAR(20) | NE em dB |
| `nen_db` | VARCHAR(20) | NEN em dB(A) |
| `tempo_medicao` | VARCHAR(20) | tempo total de medição |
| `sha256_original` | VARCHAR(64) NOT NULL | hash do PDF original |
| `upload_at` | TIMESTAMPTZ | data do upload |
| `uploaded_by` | Integer FK → users | quem fez o upload |

**Validação de nome:** similaridade mínima de 85% entre `parsed_employee_name` e nome no cadastro. Rejeita upload se abaixo do threshold.

**Anti-duplicidade:** SHA-256 único — não permite reenvio do mesmo arquivo para fichas diferentes.

### 7.6 `generated_reports`

Laudo individual PDF imutável, gerado após aprovação da ficha.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | Integer PK | identificador |
| `field_sheet_id` | Integer FK → field_sheets NOT NULL | ficha de origem |
| `sonus_upload_id` | Integer FK → sonus_uploads NOT NULL | dados SONUS utilizados |
| `output_path` | VARCHAR(500) NOT NULL | caminho no storage |
| `output_filename` | VARCHAR(255) NOT NULL | nome do arquivo |
| `sha256_output` | VARCHAR(64) NOT NULL | hash do laudo gerado |
| `generated_by` | Integer FK → users | quem gerou |
| `generated_at` | TIMESTAMPTZ | data de geração |

**Imutabilidade:** uma ficha pode ter apenas 1 laudo. Excluir o laudo reverte a ficha para `status = 'pendente'` e `signature_date = NULL`.

### 7.7 `consolidated_reports`

Relatório consolidado (PDF ou XLSX) agrupando N fichas de uma empresa.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | Integer PK | identificador |
| `company_id` | Integer FK → companies NOT NULL | empresa |
| `tipo_analise` | VARCHAR(100) NOT NULL | tipo (Ruído, Temperatura, etc.) |
| `format` | VARCHAR(10) NOT NULL | `pdf` ou `xlsx` |
| `filename` | VARCHAR(255) NOT NULL | nome do arquivo |
| `storage_path` | VARCHAR(500) NOT NULL | caminho no storage |
| `generated_by` | Integer FK → users | quem gerou |
| `generated_at` | TIMESTAMPTZ | data de geração |

### 7.8 `audit_logs`

Log de auditoria de todas as ações relevantes.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | Integer PK | identificador |
| `user_id` | Integer FK → users NOT NULL | quem executou |
| `action` | VARCHAR(100) NOT NULL | ação (ex: `generate_report`, `upload_sonus`) |
| `field_sheet_id` | Integer FK → field_sheets NULLABLE | ficha relacionada |
| `original_filename` | VARCHAR(255) | nome do arquivo original |
| `sha256_hash` | VARCHAR(64) | hash registrado |
| `details` | VARCHAR(500) | detalhes adicionais |
| `created_at` | TIMESTAMPTZ | data/hora |

### 7.9 `custom_epis`

EPIs customizados por empresa (configuração personalizada).

---

## 8. API — Endpoints por Router

Base URL: `https://ecosegme.onrender.com`

Todas as rotas (exceto `/auth/login`, `/health`, `/ping`) requerem `Authorization: Bearer {token}`.

### 8.1 `/auth`

| Método | Path | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/login` | público | Login — retorna JWT token + role + name |
| GET | `/auth/me` | autenticado | Dados do usuário logado |

**Dados enviados:** `form-data: username=email, password=senha`  
**Login response:** `{ access_token, token_type: "bearer", role, name }`  
**Token TTL:** 480 minutos (8 horas)

### 8.2 `/companies`

| Método | Path | Acesso | Descrição |
|---|---|---|---|
| GET | `/companies` | autenticado | Listar empresas (ordenado por razao_social) |
| POST | `/companies` | admin | Criar empresa |
| GET | `/companies/{id}` | autenticado | Detalhe da empresa |
| PUT | `/companies/{id}` | admin | Atualizar empresa |
| DELETE | `/companies/{id}` | admin | Excluir empresa (cascade: fichas, funcionários, laudos) |

### 8.3 `/employees`

| Método | Path | Acesso | Descrição |
|---|---|---|---|
| GET | `/employees` | autenticado | Listar (filtro: company_id) |
| POST | `/employees` | autenticado | Criar funcionário |
| GET | `/employees/{id}` | autenticado | Detalhe |
| PUT | `/employees/{id}` | autenticado | Atualizar |
| DELETE | `/employees/{id}` | admin | Excluir |

### 8.4 `/field-sheets` — ROUTER PRINCIPAL

| Método | Path | Acesso | Descrição |
|---|---|---|---|
| GET | `/field-sheets` | autenticado | Listar (filtros: company_id, tipo_analise) |
| POST | `/field-sheets` | autenticado | Criar ficha (cria funcionário se nome livre) |
| GET | `/field-sheets/{id}` | autenticado | Detalhe da ficha |
| GET | `/field-sheets/{id}/pdf` | autenticado | Download da ficha em PDF |
| PATCH | `/field-sheets/{id}/edit` | autenticado | Editar campos (lista de `allowed` fields) |
| PATCH | `/field-sheets/{id}/status` | autenticado | Aprovar/reprovar (valida pré-requisitos) |
| DELETE | `/field-sheets/{id}` | admin | Excluir ficha (cascade: SONUS, laudos) |
| GET | `/field-sheets/pending` | autenticado | Fichas sem laudo gerado |

**Campos `allowed` para PATCH/edit:**
```
epi, activity, machine_noise, technician_name, technician_name_2,
pre_verificacao_db, pos_verificacao_db, laudo_number, collection_date,
tipo_analise, data_relatorio, conclusao_texto, dosimeter_number
```

**Pré-requisitos para aprovação:**
- `laudo_number` preenchido
- `data_relatorio` preenchida
- Upload do SONUS 2 presente
- Nome no SONUS ≥ 85% de similaridade com cadastro

**Filtro tipo_analise Ruído:** inclui fichas com `tipo_analise = NULL` (legado) via OR query.

### 8.5 `/uploads`

| Método | Path | Acesso | Descrição |
|---|---|---|---|
| POST | `/uploads/sonus/{field_sheet_id}` | autenticado | Upload PDF SONUS 2 |
| GET | `/uploads/sonus/{field_sheet_id}` | autenticado | Ver dados do upload |
| DELETE | `/uploads/sonus/{field_sheet_id}` | autenticado | Excluir upload (só se ficha pendente) |

**Validações no upload:**
- Arquivo deve ser PDF (header `%PDF`)
- Tamanho máximo: 20 MB
- SHA-256 único (sem duplicatas cross-fichas)
- Nome no PDF comparado com cadastro (threshold 85%)

### 8.6 `/reports`

| Método | Path | Acesso | Descrição |
|---|---|---|---|
| POST | `/reports/generate/{field_sheet_id}` | autenticado | Gerar laudo individual PDF |
| GET | `/reports/download/{report_id}` | autenticado | Download do laudo (signed URL Supabase) |
| DELETE | `/reports/{report_id}` | autenticado | Excluir laudo (reverte ficha para pendente) |
| GET | `/reports/company/{company_id}` | autenticado | Laudos de uma empresa |
| GET | `/reports/generate-bulk-pdf` | autenticado | Gerar relatório consolidado PDF |
| GET | `/reports/generate-bulk-xlsx` | autenticado | Gerar relatório consolidado XLSX |
| GET | `/reports/consolidated` | autenticado | Histórico de relatórios consolidados |

**Parâmetros de `generate-bulk-pdf`:**
```
?company_id=X&tipo_analise=Ruído&field_sheet_ids=1&field_sheet_ids=2
```
Se `field_sheet_ids` não informado: usa todas as fichas aprovadas da empresa/tipo.

### 8.7 `/users`

| Método | Path | Acesso | Descrição |
|---|---|---|---|
| GET | `/users` | admin | Listar usuários |
| POST | `/users` | admin | Criar usuário |
| PUT | `/users/{id}` | admin | Atualizar usuário |
| PATCH | `/users/{id}/toggle-active` | admin | Ativar/desativar |

### 8.8 `/epis`

Endpoints para EPIs customizados por empresa (configuração personalizada de EPIs padrão).

### 8.9 Endpoints de saúde

| Método | Path | Descrição |
|---|---|---|
| GET | `/health` | `{ status: "ok" }` sem DB |
| GET | `/ping` | `{ status: "ok" }` com query ao DB |

---

## 9. Frontend — Páginas e Componentes

### 9.1 Roteamento e Proteção

**`App.jsx`:** define todas as rotas. Rotas protegidas usam `<PrivateRoute>`.

```
/                   → redirect para /companies
/login              → Login.jsx (público)
/companies          → Companies.jsx (autenticado)
/companies/:id      → CompanyDetail.jsx (autenticado)
/conference         → Conference.jsx (autenticado)
/field-sheet-form   → FieldSheetForm.jsx (autenticado)
/reports            → Reports.jsx (autenticado)
/employees/:companyId → Employees.jsx (autenticado)
/users              → Users.jsx (admin only)
```

**`axios.js`:** instância Axios com:
- `baseURL`: `VITE_API_URL` (env var do Vite)
- Interceptor request: injeta `Authorization: Bearer {token}` automaticamente
- Token lido do `localStorage` (chave: `token`)

**`AuthContext.jsx`:** gerencia `token`, `role`, `userName` via React Context. `login()` salva no localStorage. `logout()` limpa e redireciona para `/login`.

### 9.2 Páginas

**`Login.jsx`**
- Formulário email + senha
- Chama `POST /auth/login` com form-data
- Salva token + role + name no AuthContext/localStorage
- Redireciona para `/companies`

**`Companies.jsx`**
- Lista todas as empresas ordenadas por razão social
- Botão "+ Nova Empresa" (admin)
- Cada card leva para `CompanyDetail.jsx`

**`CompanyDetail.jsx`** — página mais complexa do sistema
- 4 abas: **Funcionários | Fichas de Campo | Relatórios | Laudos**
- Aba Funcionários: CRUD de funcionários da empresa
- Aba Fichas de Campo: lista fichas com status, edição inline, botão "Excluir Ficha" (rosa/vermelho)
- Aba Relatórios: modal de seleção de fichas → gera PDF ou XLSX (E7)
- Aba Laudos: lista laudos gerados, download, exclusão

**`Conference.jsx`** — tela de conferência (admin)
- Lista fichas pendentes de todas as empresas
- Exibe dados do SONUS 2 vinculado
- Permite editar campos da ficha
- Campo de Nº do Laudo com exibição do sufixo `.1/2026` fixo ao lado
- Coluna de checkboxes para seleção de fichas ao gerar relatório (E6)
- Botão "Excluir Ficha de Campo" (componente `DeleteFieldSheetButton`)
- Botão "Aprovar" → chama `PATCH /status`
- Botão "Gerar Relatório PDF" / "Gerar Relatório Excel"

**`FieldSheetForm.jsx`**
- Formulário de nova ficha de campo
- Busca empresa + funcionários
- Campos: dosímetro, data, atividade, máquinas, EPI, técnico(s)
- Botões de navegação: "← Voltar para Empresas" e "Avançar para Conferência →"

**`FieldSheetMobile.jsx`**
- Versão simplificada do formulário para uso em campo (mobile)

**`Reports.jsx`**
- Histórico global de relatórios consolidados
- Filtro por empresa/tipo
- Download direto

**`Users.jsx`**
- Gestão de usuários (somente admin_staff)
- Criar, editar, ativar/desativar usuários

**`Employees.jsx`**
- CRUD de funcionários de uma empresa

### 9.3 Componentes

**`DeleteFieldSheetButton`** (em `CompanyDetail.jsx`)
- Reutilizável: props `{ fieldSheetId, onDeleted }`
- Estilo rosa/vermelho escuro
- Modal de confirmação antes de excluir
- Chama `DELETE /field-sheets/{id}` e chama `onDeleted()` após sucesso

---

## 10. Autenticação e Segurança

### JWT

- Algoritmo: HS256
- TTL: 480 minutos (8 horas)
- Payload: `{ sub: user_id, role: "technician"|"admin_staff" }`
- Biblioteca: python-jose 3.5.0
- Rate limit no `/auth/login`: 10 requisições/minuto por IP (slowapi)

### Roles e permissões

| Ação | `technician` | `admin_staff` |
|---|---|---|
| Criar ficha de campo | ✅ | ✅ |
| Upload SONUS 2 | ✅ | ✅ |
| Editar ficha | ✅ (própria) | ✅ |
| Aprovar ficha | ❌ | ✅ |
| Gerar laudo PDF | ✅ | ✅ |
| Excluir laudo | ✅ | ✅ |
| Excluir ficha | ❌ | ✅ |
| Gerar relatório consolidado | ✅ | ✅ |
| Criar/editar empresa | ❌ | ✅ |
| Excluir empresa | ❌ | ✅ |
| Gerenciar usuários | ❌ | ✅ |

### Headers de segurança (middleware)

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### CORS

Origens permitidas (configurável via env `ALLOWED_ORIGINS`):
```
http://localhost:5173
http://localhost:3000
https://ecosegme-se6m.vercel.app
```

### Integridade de laudos

- SHA-256 calculado para cada PDF gerado e armazenado em `generated_reports.sha256_output`
- SHA-256 do PDF SONUS original armazenado em `sonus_uploads.sha256_original`
- Anti-duplicidade: SHA-256 único — mesmo arquivo não pode ser enviado para duas fichas diferentes
- Laudos são imutáveis: não podem ser regenerados sem excluir o anterior

---

## 11. Geração de PDFs

### Laudo Individual (`pdf_generator.py`)

- Template: `backend/app/templates/laudo.html` (NÃO alterar)
- Engine: WeasyPrint 68.1 + Jinja2 3.1.6
- Fluxo: dados da ficha → render HTML → WeasyPrint → PDF → Supabase Storage
- Variáveis passadas ao template: laudo_number, tipo_analise, razao_social, cnpj, endereco, nome_funcionario, matricula, funcao, setor, local, turno, codigo_esocial, collection_date, technician_name(s), activity, machine_noise, epi, pre/pos_verificacao_db, signature_date, parsed_employee_name, inicio, fim, dose_diaria, ne_db, nen_db, tempo_medicao

### Relatório Consolidado (`reports.py` → `generate_bulk_pdf`)

- Template: `backend/app/templates/relatorio_pdf.html` (pode alterar)
- Endpoint: `GET /reports/generate-bulk-pdf?company_id=X&tipo_analise=Y&field_sheet_ids=...`
- Inclui capa com: logo, razao_social, cnpj, endereco, range de laudos, data emissão, imagens decorativas
- Variáveis do template: razao_social, cnpj, endereco, tipo_analise, period, report_date, year, laudo_numbers, laudo_min, laudo_max, logo_b64, assinatura_b64, capa_img_*_b64, fichas[]
- Formato do Nº do Relatório na capa: `{laudo_min}.1/{year} ao {laudo_max}.1/{year}`

### Ficha de Campo PDF

- Template: `backend/app/templates/ficha_campo.html`
- Endpoint: `GET /field-sheets/{id}/pdf`

---

## 12. Parser SONUS 2

**Arquivo:** `backend/app/parser.py`

O parser extrai dados do PDF exportado pelo dosímetro SONUS 2 usando `pdfplumber` + regex.

### Campos extraídos (score 0–6)

| Campo | Tipo | Descrição |
|---|---|---|
| `funcionario` | string | Nome do funcionário na medição |
| `inicio` | string | Horário de início (HH:MM) |
| `fim` | string | Horário de fim (HH:MM) |
| `dose_diaria` | string | Dose diária em % |
| `ne_db` | string | Nível de exposição NE (dB) |
| `nen_db` | string | Nível de exposição normalizado NEN (dB(A)) |
| `tempo_medicao` | string | Tempo total de medição |

### Comparação de nomes

```python
def names_match(name_pdf: str, name_db: str, threshold: float = 0.85) -> bool:
    return name_similarity(name_pdf, name_db) >= threshold
```

- Normaliza maiúsculas/minúsculas e acentos
- Usa `difflib.SequenceMatcher` para calcular similaridade
- Threshold de 85% para aceitar variações (ex: apelido vs. nome completo)
- Rejeita upload se abaixo do threshold com mensagem detalhada

---

## 13. Armazenamento de Arquivos

**`supabase_storage.py`**

- Backend: Supabase Storage (S3-compatible), bucket configurado via `SUPABASE_BUCKET`
- Acesso: signed URLs com validade configurável
- Arquivos armazenados: PDFs do SONUS 2, laudos individuais, relatórios consolidados
- Fallback local: se Supabase não configurado, usa diretório local (`/tmp/laudos`)

**Verificação de configuração:**
```python
def is_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)
```

---

## 14. Histórico de Migrations

Migrations em ordem cronológica (Alembic, diretório `backend/alembic/versions/`):

| Migration | Descrição |
|---|---|
| `66ddbc5dd2d4` | Schema inicial (companies, employees, users, field_sheets) |
| `b3f3e2445a5f` | Adiciona generated_reports |
| `5827881a361c` | Adiciona audit_logs |
| `70dd6f7e1e7f` | Adiciona sonus_uploads |
| `dfb3550a955c` | Adiciona campos à field_sheet (tipo_analise, turno, codigo_esocial, etc.) |
| `35943bf76957` | Adiciona custom_epis |
| `fd93756deedb` | Adiciona cnpj em companies |
| `bba37caa8120` | Adiciona technician_name_2 em field_sheets |
| `a1b2c3d4e5f6` | Permite laudo_number repetido (remove unique constraint) |
| `63fac055ad44` | Adiciona tempo_medicao em sonus_uploads |
| `a1c2d3e4f5a6` | Ajustes v2 (múltiplos campos) |
| `f1a2b3c4d5e6` | Remove unique de laudo_number |
| `132d5d249712` | laudo_number nullable |
| `c4d5e6f7a8b9` | Adiciona data_relatorio em field_sheets |
| `d1e2f3a4b5c6` | Adiciona laudo_y nullable |
| `e6f7a8b9c0d1` | laudo_y em field_sheets |
| `d5e6f7a8b9c0` | Adiciona conclusao_texto em field_sheets |
| `f7a8b9c0d1e2` | Fix unique laudo_number por empresa |
| `a2b3c4d5e6f7` | laudo_number como String(50), remove laudo_y antigo |
| `c5d6e7f8a9b0` | Merge heads |

---

## 15. Variáveis de Ambiente

### Backend (Render)

| Variável | Descrição | Obrigatória |
|---|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL Supabase | ✅ |
| `SECRET_KEY` | Chave de assinatura JWT (min 64 chars) | ✅ |
| `ALGORITHM` | Algoritmo JWT (default: HS256) | — |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | TTL do token (default: 480 = 8h) | — |
| `SUPABASE_URL` | URL do projeto Supabase | ✅ |
| `SUPABASE_SERVICE_KEY` | Service role key do Supabase | ✅ |
| `SUPABASE_BUCKET` | Nome do bucket de storage | ✅ |
| `ALLOWED_ORIGINS` | CORS origins permitidas (separadas por vírgula) | — |
| `DEBUG` | Ativa `/docs` e `/redoc` (default: false) | — |
| `STORAGE_DIR` | Diretório local fallback (default: /tmp/laudos) | — |

### Frontend (Vercel)

| Variável | Descrição | Obrigatória |
|---|---|---|
| `VITE_API_URL` | URL do backend (ex: https://ecosegme.onrender.com) | ✅ |

---

## 16. Deploy e CI/CD

### Backend — Render

**Arquivo:** `render.yaml` e `backend/render.yaml`

```yaml
services:
  - type: web
    name: ecosegme-backend
    runtime: python
    rootDir: backend
    buildCommand: chmod +x build.sh && bash build.sh
    startCommand: alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

- **Auto-deploy:** push no GitHub → Render detecta → rebuild + restart
- `alembic upgrade head` roda automaticamente no start (aplica migrations pendentes)
- `build.sh`: instala dependências Python

### Frontend — Vercel

**Arquivo:** `frontend/vercel.json`

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

- **Auto-deploy:** push no GitHub → Vercel detecta → rebuild + redeploy
- SPA rewrite: todas as rotas retornam `index.html` (necessário para react-router)
- Build: `npm install && npm run build` → publica `dist/`

### Workflow de desenvolvimento

```
1. Desenvolver localmente (branch feature/ ou main)
2. Testar com backend local: uvicorn app.main:app --reload
3. Testar com frontend local: npm run dev
4. git add <arquivos> && git commit -m "descrição"
5. git push origin main
   → Render rebuild automático (backend ~2-3 min)
   → Vercel rebuild automático (frontend ~1-2 min)
```

**⚠️ ATENÇÃO git no Windows:** O diretório do projeto está sob OneDrive (sincronização em nuvem). Comandos git devem ser executados no **Terminal do Windows** (PowerShell ou CMD) — NÃO em terminais Linux/sandbox, pois o OneDrive bloqueia operações de unlink de arquivos no WSL/Linux.

---

## 17. Regras de Negócio Críticas

Estas regras não devem ser violadas sob nenhuma circunstância:

### Regras absolutas

1. **`laudo_number` é String(50)** — nunca converter para Integer. O banco armazena "42", não 42.

2. **Sufixo `.1/2026` é visual** — nunca salvar "42.1/2026" no banco. Construído no frontend/backend apenas para exibição.
   ```javascript
   // Frontend:
   `${laudo_number}.1/${new Date().getFullYear()}`
   // Backend:
   f"{laudo_number}.1/{datetime.now().year}"
   ```

3. **Nunca alterar `laudo.html`** — template de laudo individual é imutável por contrato. Apenas `relatorio_pdf.html` pode ser alterado.

4. **Nunca criar migration para lógica visual** — o sufixo .1/ano é apresentação, não dado.

5. **Reversão de status ao excluir laudo** — `DELETE /reports/{id}` reverte `sheet.status = 'pendente'` e `sheet.signature_date = None`. Sempre preservar este comportamento.

6. **Distinção ficha vs. laudo** — excluir `FieldSheet` ≠ excluir `GeneratedReport`. São fluxos diferentes com efeitos diferentes.

7. **`generate_bulk()` é imutável** — apenas `generate_bulk_pdf()` pode ser alterado.

### Regras de numeração

- `laudo_y` = posição dentro de fichas com mesmo `laudo_number` na mesma empresa
- "42.1/2026" = laudo_number:"42", laudo_y:1, ano:2026
- "42.2/2026" = segunda ficha com laudo_number:"42" na mesma empresa no mesmo ano
- Relatório consolidado com fichas 42, 43, 47 → capa exibe: "42.1/2026 ao 47.1/2026"

### Regras de fluxo

- Ficha só pode ser aprovada se: laudo_number + data_relatorio preenchidos + SONUS enviado + nome correspondente
- Upload SONUS em ficha aprovada: bloqueado
- Laudo já gerado: imutável, novo `POST /generate` retorna 400
- Empresa com fichas ou funcionários: não pode ser excluída (retorna 409)

---

## 18. ⚠️ NOVAS FEATURES — Sugestões em Desenvolvimento

> **ATENÇÃO:** Esta seção documenta funcionalidades **ainda não implementadas**. São sugestões aprovadas para desenvolvimento futuro. Nenhuma linha de código foi escrita para estas features. Qualquer implementação deve começar pela **aprovação do RFC correspondente**.

---

### 18.1 Feature Químico — Agentes Químicos Ocupacionais

**RFC:** `RFC-Q0_Feature_Quimico_Fase0.md` (v1.3, aguardando aprovação da Diretoria)  
**Status geral:** RFC escrito, aprovação pendente, nenhum código iniciado

#### Motivação

Expandir o sistema para cobrir **agentes químicos** além do ruído, seguindo NR-15 (Anexos 11/13) e TLV/BEI da ACGIH. O fluxo é adaptado pois não há dosímetro — os agentes são coletados por amostragem e vinculados manualmente pelo admin.

#### Fluxo Proposto

```
Técnico cria Ficha Química (chemical_field_sheets)
  → Admin abre na aba Conferência
  → Admin vincula agentes do catálogo regulatório (chemical_agents)
  → Admin preenche valor medido por agente (valor_encontrado)
  → Sistema calcula resultado: dentro_limite / acima_limite / nao_detectado
  → Admin aprova (Nº do Laudo + Data do Relatório)
  → Sistema gera Laudo PDF Químico (Fase 4 — template a ser entregue pelo cliente)
```

#### Novas Tabelas (3 migrations, em ordem obrigatória)

**M1: `chemical_agents`** — catálogo regulatório de substâncias

```sql
CREATE TABLE chemical_agents (
    id              SERIAL PRIMARY KEY,
    nome            VARCHAR(200) NOT NULL,
    esocial         VARCHAR(100),
    unidade         VARCHAR(20),         -- ppm, mg/m³, f/cc
    acgih_twa       VARCHAR(20),         -- limite ACGIH (8h) — numérico ou '-'
    acgih_stel      VARCHAR(20),         -- limite ACGIH (curto prazo)
    nr15_valor      VARCHAR(20),         -- limite NR-15 — numérico ou '-'
    efeito_critico  TEXT,
    amostrador      VARCHAR(150),
    metodo          VARCHAR(150),
    metodo_analise  VARCHAR(100),
    vazao           VARCHAR(50),
    volume          VARCHAR(50),
    lq              VARCHAR(50),         -- Limite de Quantificação
    numero_cas      VARCHAR(50),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_chemical_agents_nome ON chemical_agents (nome);
CREATE INDEX idx_chemical_agents_cas  ON chemical_agents (numero_cas);
```

Fonte: `Eduardo - quimico.xlsx`, aba TLV — 185 agentes mapeados (colunas A–P).  
Atualização: via Google Sheets sync (Service Account) ou importação Excel.

**M2: `chemical_field_sheets`** — fichas de campo para agentes químicos

```sql
CREATE TABLE chemical_field_sheets (
    id                  SERIAL PRIMARY KEY,
    -- Empresa e técnico (obrigatórios)
    company_id          INTEGER NOT NULL REFERENCES companies(id),
    technician_name     VARCHAR(150) NOT NULL,
    collection_date     DATE NOT NULL,
    -- Funcionário: employee_id OU (employee_name_text + campos manuais)
    employee_id         INTEGER REFERENCES employees(id),
    employee_name_text  VARCHAR(150),          -- obrigatório se employee_id NULL
    funcao              VARCHAR(100) NOT NULL,  -- obrigatório (manual se sem employee_id)
    matricula           VARCHAR(50) NOT NULL,   -- obrigatório (manual se sem employee_id)
    setor               VARCHAR(150) NOT NULL,  -- obrigatório
    local               VARCHAR(100) NOT NULL,  -- obrigatório
    -- Amostragem (obrigatórios)
    numero_amostrador   VARCHAR(100) NOT NULL,
    tipo_amostrador     VARCHAR(100) NOT NULL,  -- ex: passivo, ativo, gravimétrico
    situacao_ambiente   TEXT NOT NULL,
    -- Opcionais
    atividade           TEXT,
    frequencia          VARCHAR(150),
    tempo_exposicao_h   NUMERIC(5,2),
    jornada_trabalho    VARCHAR(50),    -- ex: "44 Horas/Semanais"
    volume_ar_amostrado VARCHAR(50),    -- ex: "12,5 L" — digitado manualmente
    epi                 TEXT,
    observacoes         TEXT,
    -- Laudo e status
    laudo_number        VARCHAR(50),
    laudo_y             INTEGER,
    tipo_analise        VARCHAR(50) NOT NULL DEFAULT 'Químico',
    status              VARCHAR(20) NOT NULL DEFAULT 'pendente',
    data_relatorio      DATE,
    signature_date      DATE,
    conclusao_texto     TEXT,
    created_by          INTEGER NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

Por que tabela separada? `field_sheets` tem `dosimeter_number NOT NULL` — torná-la nullable causaria risco de regressão no módulo de Ruído.

**M3: `chemical_sheet_agents`** — junction table agentes vinculados à ficha

```sql
CREATE TABLE chemical_sheet_agents (
    id                  SERIAL PRIMARY KEY,
    chemical_sheet_id   INTEGER NOT NULL REFERENCES chemical_field_sheets(id) ON DELETE CASCADE,
    agent_id            INTEGER NOT NULL REFERENCES chemical_agents(id),
    valor_encontrado    VARCHAR(50),   -- numérico ou '<LQ'
    resultado           VARCHAR(50),   -- 'dentro_limite' | 'acima_limite' | 'nao_detectado' | 'pendente'
    observacao          TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chemical_sheet_id, agent_id)
);
```

#### Lógica de Cálculo do Resultado

```python
# Backend — ao salvar valor_encontrado de cada agente:
if valor_encontrado.startswith('<'):
    resultado = 'nao_detectado'
elif try_float(valor_encontrado) <= try_float(agent.nr15_valor):
    resultado = 'dentro_limite'
elif try_float(valor_encontrado) > try_float(agent.nr15_valor):
    resultado = 'acima_limite'
elif agent.nr15_valor == '-':
    # fallback: tentar acgih_twa
    ...
else:
    resultado = 'pendente'

# Conclusão final da ficha:
if any(r == 'acima_limite' for r in resultados): conclusao = "Insalubre"
else: conclusao = "Salubre"
```

#### Novos Endpoints

```
# Fichas Químicas
POST   /chemical-field-sheets/
GET    /chemical-field-sheets/          # filtros: company_id, status
GET    /chemical-field-sheets/{id}
PATCH  /chemical-field-sheets/{id}
PATCH  /chemical-field-sheets/{id}/status
DELETE /chemical-field-sheets/{id}

# Agentes vinculados à ficha
GET    /chemical-field-sheets/{id}/agents
POST   /chemical-field-sheets/{id}/agents
PATCH  /chemical-field-sheets/{id}/agents/{agent_id}
DELETE /chemical-field-sheets/{id}/agents/{agent_id}

# Catálogo regulatório
GET    /chemical-agents/               # search por nome ou CAS
GET    /chemical-agents/{id}
POST   /admin/chemical-agents/sync     # sincronizar do Google Sheets
POST   /admin/chemical-agents/import   # importar Excel (fallback)

# Relatório (Fase 4 — fora do escopo imediato)
GET    /reports/generate-bulk-pdf-quimico?company_id=X&field_sheet_ids=Y,Z
```

#### Atualização do Catálogo via Google Sheets

```
Google Sheets (aba TLV, editada pelo admin)
  → Admin clica "Sincronizar Agentes" no EcoSegme
  → Backend: POST /admin/chemical-agents/sync
  → Lê A2:P187 via Google Sheets API v4 (Service Account)
  → Faz upsert em chemical_agents (match por numero_cas ou nome)
  → Retorna: "X atualizados, Y inseridos"

Env vars adicionais (Render):
  GOOGLE_SHEETS_CREDENTIALS  = JSON da Service Account
  CHEMICAL_AGENTS_SHEET_ID   = ID da planilha
  CHEMICAL_AGENTS_TAB        = TLV

Novas dependências (requirements.txt):
  google-auth==2.29.0
  google-api-python-client==2.127.0
```

#### Plano de Fases

| Fase | Escopo | Status |
|---|---|---|
| **Fase 0** | Migrations M1+M2+M3 + schemas + routers básicos | RFC aprovado pendente |
| **Fase 1** | Importação Excel + Google Sheets sync | Aguarda Fase 0 |
| **Fase 2** | Frontend: Conference (vincular agentes) + CompanyDetail Químico | Aguarda Fase 1 |
| **Fase 3** | Relatório XLSX Químico | Aguarda Fase 2 |
| **Fase 4** | Laudo PDF Químico — spec definida (ver abaixo) | Aguarda texto aba "Doc Base" (P2) |

#### Pendências Bloqueadoras

| # | Item | Bloqueia | Status |
|---|---|---|---|
| P1 | Excel com tabela de agentes (aba TLV) | Fase 1 | ✅ Recebido (`Eduardo - quimico.xlsx`, 185 agentes) |
| P2 | Texto "Objetivo" (aba Doc Base) + estrutura do Relatório de Ensaio Analítico | Fase 4 | ✅ Recebido e documentado (seção 18.2.1) |
| P3 | Colunas do Excel de agentes | Fase 0 | ✅ Mapeadas (colunas A–P confirmadas) |
| P4 | Admin vincula agentes na Conferência? | Fase 2 | ✅ Confirmado: na aba Conferência |

---

### 18.2 Backlog de Ajustes Técnicos

Itens identificados durante desenvolvimento, prontos para implementar quando oportuno:

| Item | Descrição | Risco | Prioridade |
|---|---|---|---|
| Sort laudo_number | `ORDER BY` numérico em vez de alfabético (cast para Integer no select) | Baixo | Médio |
| Filtro de tipo na Conference | Exibir fichas filtrando por tipo_analise na aba Conferência | Baixo | Médio |

---

### 18.2.1 Fase 4 — Especificação do Relatório PDF Químico

**Template:** `backend/app/templates/relatorio_quimico_pdf.html` — novo arquivo.
Capa copiada de `relatorio_pdf.html` sem alterações; páginas de conteúdo usam cabeçalho com `logo.png` (esq) + `cabecalho.png` (dir).

**Estrutura — 4 páginas:**

#### Página 1 — Capa
Bloco HTML copiado **exatamente** de `relatorio_pdf.html` (mesmo background, mesmas posições absolutas).
Dados do relatório químico mapeados nas mesmas variáveis Jinja2:
- `{{ razao_social }}` → `companies.razao_social`
- `{{ endereco }}` → `companies.endereco`
- `{{ cnpj }}` → `companies.cnpj`
- `{{ laudo_min }}` / `{{ laudo_max }}` → `f"N. {num:04d} - 1"` (ex: `"N. 0042 - 1"`)
  → template renderiza: `"N. 0042 - 1/2026"` ou `"N. 0042 - 1/2026 ao N. 0047 - 1/2026"`
- `{{ report_date }}` → `datetime.now().strftime('%m.%Y')` (ex: `"07.2026"`)
- `{{ capa_fundo_b64 }}` → mesma imagem de fundo do relatório de ruído

#### Página 2 — Objetivo
- Cabeçalho padrão: logo à esquerda + informações da empresa à direita
- Formatação ABNT: texto justificado, fonte 14pt, espaçamento 1,5, margens laterais 3cm (esquerda) / 2cm (direita), margem estética no topo

**Texto fixo (idêntico, não alterar):**

```
Objetivo:

        A avaliação de agentes químicos no ambiente de trabalho tem como objetivo identificar
e avaliar os riscos associados à exposição a substâncias químicas no local de trabalho,
visando à prevenção de doenças ocupacionais e à promoção da saúde e segurança dos
trabalhadores.

        Os agentes químicos presentes no ambiente de trabalho podem incluir substâncias
tóxicas, irritantes, corrosivas, inflamáveis, cancerígenas, entre outras. A exposição a
esses agentes pode ocorrer por inalação, contato dérmico ou ingestão, e pode levar a uma
série de efeitos adversos à saúde, como irritação das vias respiratórias, danos ao sistema
nervoso, câncer, entre outros.

        Este trabalho visa atender, principalmente, às recomendações do Programa de
Gerenciamento de Riscos - PGR e a Norma Regulamentadora N.15 - Atividades e Operações
Insalubres da Portaria 3.214 do Ministério do Trabalho.

        Em resumo, o objetivo da avaliação de agentes químicos no ambiente de trabalho é
garantir a saúde e segurança dos trabalhadores, identificando os riscos relacionados à
exposição a substâncias químicas e implementando medidas de controle eficazes para prevenir
doenças ocupacionais.
```

**Regras de renderização no template HTML (WeasyPrint):**
```css
/* Aplicar ao bloco de texto da página Objetivo */
font-family: Times New Roman, serif;  /* padrão ABNT */
font-size: 14pt;
line-height: 1.5;
text-align: justify;
text-indent: 2cm;          /* recuo de parágrafo */
margin-left: 3cm;
margin-right: 2cm;
margin-top: 2cm;
```

**Título "Objetivo:"** — negrito, sem recuo, mesma fonte 14pt.

#### Página 3 — Resumo dos Resultados
- Cabeçalho padrão
- Tabela-resumo com um colaborador por linha:

| Colaborador | Função | Setor | Nº Laudo | Agentes Monitorados | Conclusão |
|---|---|---|---|---|---|
- Conclusão por linha: **Salubre** (verde) ou **Insalubre** (vermelho)
- Segue padrão visual da tabela-resumo do módulo de Ruído

#### Página 4+ — Relatório de Ensaio Analítico (2 folhas por colaborador)

**Folha 01 de 02** — estrutura baseada no modelo `Hidrocarbonetos Aromáticos.pdf`:

```
Cabeçalho: "Relatório de Ensaio Analítico N. {laudo_number:04d} - 1 / {year}" | "Folha 01 de 02"
  → laudo_number zero-padded para 4 dígitos (ex: 42 → "0042")
  → "1" é constante (sub-serial fixo, como o ".1" do laudo de ruído)
  → separadores: " - " e " / " com espaços (NÃO usar "." ou "/")
  → ".0" ao final do ano é artefato do Excel — NÃO replicar

[Dados do Cliente]
Razão Social:  companies.razao_social
Endereço:      companies.endereco
Serviço:       "Monitoramentos de Agentes Químicos no Ambiente de Trabalho"  ← texto fixo

[Informações do Colaborador]
Colaborador:   employee_name_text | employees.nome
Função:        chemical_field_sheets.funcao
Matrícula:     chemical_field_sheets.matricula
Local da Coleta: chemical_field_sheets.local
Setor:         chemical_field_sheets.setor

[Informações Técnicas de Amostragem]
Data da Avaliação:      collection_date
Volume de Ar Amostrado: volume_ar_amostrado  (opcional — exibe em branco se NULL)
Jornada de Trabalho:    jornada_trabalho     (opcional — exibe em branco se NULL)
Resp. pela coleta:      technician_name

[Tabela de Resultados dos Agentes Químicos]
Colunas: Agente Químico + Cód. e-Social | Valor Encontrado | Unidade | ACGIH TWA | ACGIH STEL | NR 15 | Bases de Efeitos Críticos
Linhas: uma por agente vinculado (chemical_sheet_agents JOIN chemical_agents)
  - Agente com resultado "acima_limite" → linha destacada em vermelho
  - Agente com resultado "nao_detectado" → valor exibido como recebido (ex: "< 0,011")
```

**Folha 02 de 02:**
```
Cabeçalho: mesmo padrão

[Legenda — texto fixo]
TLV-TWA: Threshold Limits Values - Média Ponderada pelo Tempo
TLV-STEL: Threshold Limits Values - Exposição de Curta Duração
N.C.: Não Codificado pelo e-Social
N.D.: Nada Detectado

[Notas — texto fixo]
"Foram utilizados os dados fornecidos pelo interessado..."
"Equipamento Utilizado na Coleta: Bomba Gravimétrica..."
"Códigos retirados da Tabela 24 do eSocial Versão S-1.0 de 2021."

[Tipo de Amostrador]     → chemical_field_sheets.tipo_amostrador
[Metodologia de Análise] → chemical_agents.metodo_analise (distinct dos agentes da ficha)

[Referência — texto fixo]
ACGIH, NR-15, MTE, NIOSH, OSHA

[Conclusão]
Texto padrão pré-preenchido (editável pelo admin na aba Conferência):
"De acordo com os resultados encontrados é possível afirmar que as concentrações dos
agentes monitorados, encontram-se dentro dos limites exigidos pelas referências acima,
índices esses também aceitos pela Associação Brasileira de Higienistas Ocupacionais -
ABHO e Ministério do Trabalho e Emprego."

Comportamento: chemical_field_sheets.conclusao_texto é sempre pré-preenchido com este texto
no momento da criação da ficha (no backend, ao fazer POST /chemical-field-sheets).
O admin pode editar livremente na Conferência. O PDF usa o valor salvo em conclusao_texto.

Data: `"Manaus, {{ signature_date_ext }}"` — gerada automaticamente no momento da geração do PDF.
  → `signature_date_ext = f"{now.day} de {MESES[now.month-1]} de {now.year}"`  ex: "07 de julho de 2026"
Assinatura: `Assinatura Almerélio Gonçalves .png` (Engenheiro Químico, IPAAM nº 0303, CRQ nº 14300074)
  ⚠️ NÃO usar `assinatura_arimar.png` — essa é exclusiva do laudo de Ruído (Arimar, Engenheiro de Segurança)
```

**Pendência bloqueadora (P2):** texto da aba "Doc Base" do Excel para a Página 2 (Objetivo).

---

### 18.3 Ajustes em Validação (Pendentes de Deploy)

Os itens abaixo foram **corrigidos no código** mas ainda aguardam push para produção (rodar `git push origin main` no Terminal Windows):

| Bug | Arquivo | Correção |
|---|---|---|
| `laudo_number` como Integer causava "Erro ao salvar ficha" | `CompanyDetail.jsx` ~L660 | Removido `parseInt()` — mantém como string |
| Modal E7 não filtrava por tipo_analise | `CompanyDetail.jsx` `handleOpenRelModal` | Adicionado `&tipo_analise=${genTipo}` |
| Endpoint `/field-sheets` não aceitava parâmetro `tipo_analise` | `field_sheets.py` | Adicionado filtro com OR para Ruído legado |

---

*EcoSegme Documentation v2.0 · Ecosegme Ambiental · 2026-07-06*  
*Gerado por Martins Consulta (CTO) — para uso em sessões de IA e onboarding técnico*
