# Sistema de Laudos de Dosimetria de Ruído Ocupacional

<div align="center">

![FastAPI](https://img.shields.io/badge/FastAPI-0.133-009688?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python)
![Supabase](https://img.shields.io/badge/Supabase-Storage-3ECF8E?style=flat-square&logo=supabase)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=flat-square&logo=vercel)

**Plataforma completa para gestão de dosimetria de ruído ocupacional**
*Da coleta em campo à geração de laudos e relatórios PDF conforme NR-15*

[🌐 Demo ao Vivo](https://ecosegme-se6m.vercel.app) · [📖 API Docs](https://ecosegme.onrender.com/docs)

> **Para demonstrações e demo, entre em contato**

</div>

---

## 🎯 O Problema Resolvido

Uma consultoria ambiental no Norte do Brasil processava laudos técnicos de dosimetria de ruído de forma 100% manual:

```
Dosímetro → exportar PDF → transcrever dados → Excel → formatar → gerar PDF final
```

**Resultado:** dias por laudo · podendo a chegar à atraso de vários dias no faturamento devido a demora em geração do relatório final · dezenas laudos/mês acumulando

**Com o sistema:**
```
Dosímetro → upload do PDF → parser automático → conferência → Relatório em PDF
```

**Resultado:** menos de 5 minutos por relatório · faturamento no prazo · zero retrabalho de transcrição

---

## 📊 Impacto Medido

| Métrica | Antes | Depois |
|---|---|---|
| Tempo por laudo | dias | < 5 minutos |
| Atraso no faturamento | vários dias | Zero |
| Volume mensal | laudos acumulados | laudos processados |
| Erros de transcrição | Frequentes | Zero (parser automático) |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│   React 18 + Vite · Axios · Deploy: Vercel              │
│                                                         │
│  Companies → Employees → FieldSheets → Conference       │
│                              ↓                          │
│              Upload SONUS 2 PDF + Approval              │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API (JWT)
┌─────────────────────▼───────────────────────────────────┐
│                      BACKEND                            │
│   FastAPI · SQLAlchemy · Alembic · Deploy: Render       │
│                                                         │
│  Parser SONUS 2 → PDF Generator (WeasyPrint)            │
│  Audit Log · SHA-256 · Immutable Reports                │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        ▼                            ▼
┌───────────────┐          ┌─────────────────┐
│  PostgreSQL   │          │ Supabase Storage │
│  (Supabase)   │          │  PDFs + Assets   │
│  São Paulo    │          └─────────────────┘
└───────────────┘
```

---

## ✨ Funcionalidades

### Fluxo Principal
- **Ficha de Campo Digital** — técnico preenche dados da coleta em campo
- **Parser SONUS 2** — extração automática dos 6 campos do PDF do dosímetro com score de confiança (0–6)
- **Conferência de Dados** — admin revisa, edita e aprova cada ficha antes da geração
- **Laudo Individual PDF** — imutável após geração, com hash SHA-256 e log de auditoria
- **Relatório Consolidado** — agrupa N fichas selecionadas em um único PDF com capa personalizada

### Segurança e Rastreabilidade
- Autenticação JWT com dois perfis: `Técnico de Campo` e `Administrativo`
- Hash SHA-256 em todos os laudos gerados
- Log de auditoria completo (usuário, data, arquivo original, hash)
- Laudos imutáveis após geração — exclusão reverte ficha para pendente
- Bloqueio de upload com nome divergente do cadastro

### Inteligência do Parser
```python
# Matching de nomes com tolerância a variações
def names_match(name_pdf: str, name_db: str, threshold: float = 0.85) -> bool:
    return name_similarity(name_pdf, name_db) >= threshold

# Score de confiança: 0–6 campos extraídos com sucesso
# Múltiplos padrões regex por campo (resiliente a variações de firmware)
```

---

## 🛠️ Stack Técnica

**Backend**
- **FastAPI** (Python 3.12) — API REST assíncrona com validação Pydantic
- **SQLAlchemy + Alembic** — ORM com migrations versionadas
- **PostgreSQL** via Supabase — banco gerenciado, região São Paulo
- **WeasyPrint + Jinja2** — geração de PDFs a partir de templates HTML
- **pdfplumber** — extração de texto dos arquivos SONUS 2
- **bcrypt + JWT** — autenticação segura com tokens de 8h
- **Supabase Storage** — armazenamento de PDFs com signed URLs

**Frontend**
- **React 18 + Vite** — SPA com roteamento protegido por perfil
- **Axios** — cliente HTTP com interceptors para JWT e loading bar

**Infra**
- **Render** — deploy do backend com auto-deploy via GitHub
- **Vercel** — deploy do frontend com preview por branch
- **Supabase** — banco + storage gerenciados na região sa-east-1

---

## 🚀 Rodando Localmente

**Pré-requisitos:** Python 3.12+, Node.js 18+, PostgreSQL ou conta Supabase

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # preencher variáveis
alembic upgrade head
uvicorn app.main:app --reload
# API disponível em http://localhost:8000
# Docs em http://localhost:8000/docs
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env  # definir VITE_API_URL=http://localhost:8000
npm run dev
# App disponível em http://localhost:5173
```

---

## 🗄️ Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL |
| `SECRET_KEY` | Chave de assinatura JWT (64 chars) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_KEY` | Service role key do Supabase |
| `SUPABASE_BUCKET` | Nome do bucket de armazenamento |
| `VITE_API_URL` | URL do backend (build do frontend) |

---

## 📁 Estrutura do Projeto

```
ecosegme/
├── backend/
│   ├── app/
│   │   ├── routers/        # auth, companies, employees,
│   │   │                   # field_sheets, uploads, reports
│   │   ├── models/         # Company, Employee, FieldSheet,
│   │   │                   # GeneratedReport, ConsolidatedReport
│   │   ├── templates/      # HTML para WeasyPrint + imagens
│   │   ├── parser.py       # Parser SONUS 2 com score de confiança
│   │   └── pdf_generator.py
│   └── alembic/            # Migrations versionadas
└── frontend/
    └── src/
        ├── pages/          # Companies, Conference, Reports...
        ├── components/     # Navbar, PrivateRoute
        └── api/            # Axios com JWT interceptor
```

---

## 🧪 Testes

```bash
cd backend
pytest tests/ -v
# 20 testes passando: auth, companies, parser, users
```

---

## 📄 Licença

Projeto desenvolvido para uso privado da consultoria Ambiental.
Código disponibilizado para fins de portfólio.

---

## Screenshots 

<img width="947" height="256" alt="image" src="https://github.com/user-attachments/assets/0ec06422-0c81-4874-a395-157eafcbd6f5" />
<img width="932" height="336" alt="image" src="https://github.com/user-attachments/assets/f5e33889-7f3a-4e47-ba14-a84767632b9f" />
<img width="889" height="321" alt="image" src="https://github.com/user-attachments/assets/ea7f89e0-23bb-47dc-a19a-631c91088e85" />
<img width="894" height="216" alt="image" src="https://github.com/user-attachments/assets/096d3eb5-b02b-40f3-b40e-70a42cd52ef1" />
<img width="904" height="302" alt="image" src="https://github.com/user-attachments/assets/4b0cfaef-a266-4614-8a09-abd21243abb7" />
<img width="917" height="281" alt="image" src="https://github.com/user-attachments/assets/e9638331-6e4f-4c4f-87d0-8e2a46de5b47" />
<img width="912" height="289" alt="image" src="https://github.com/user-attachments/assets/c7f34154-1ec5-44c4-8472-72a464f9dcae" />


---

<div align="center">
  <sub>Desenvolvido por <a href="https://www.linkedin.com/in/eduardo-marafiga-9b2ab58a/">Eduardo Martins</a></sub>  <sub>e <a href="https://github.com/glizardx
">Guilherme Lizardo</a></sub>
</div>
