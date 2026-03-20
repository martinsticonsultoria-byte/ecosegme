<div align="center">

<img src="frontend/public/logo.png" alt="Logo" width="180"/>

# Sistema de Laudos de Dosimetria de Ruído

**Plataforma completa para gestão de dosimetria de ruído ocupacional**
*Da coleta de dados em campo à geração de laudos em PDF conforme NR-15*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.133-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Testes](https://img.shields.io/badge/testes-20%20passando-22c55e?style=flat-square)](#testes)

</div>

---

## Visão Geral

Sistema desenvolvido para digitalizar o fluxo de monitoramento de ruído ocupacional, substituindo planilhas e processos manuais por uma plataforma estruturada que gera laudos prontos em menos de 15 minutos.

O sistema extrai dados brutos do dosímetro (SONUS 2), cruza com os dados da ficha de campo preenchida pelo técnico, e gera laudos em PDF padronizados conforme **NR-15** e **NHO-01**.

**Impacto:** ~80 laudos/mês, 2 perfis de usuário (Técnico de Campo e Administrativo).

---

## Como Funciona

```
Técnico de Campo         Administrativo
      │                       │
      ▼                       ▼
 Preenche ficha         Upload do PDF SONUS 2
 (funcionário, EPI,            │
  condições)                   ▼
      │               Parser extrai os dados
      │               (score de confiança +
      │                similaridade de nomes)
      └───────────────────────┐
                              ▼
                   Revisão e validação dos dados
                              │
                              ▼
                   Geração do laudo em PDF
                   (WeasyPrint + Jinja2,
                    hash SHA-256, imutável)
                              │
                              ▼
                         Download ✓
```

---

## Stack

**Backend**
- **FastAPI** — API REST com autenticação JWT e controle de acesso por perfil
- **SQLAlchemy + PostgreSQL** — modelo relacional com migrações via Alembic
- **pdfplumber** — extração de texto dos arquivos SONUS 2
- **WeasyPrint + Jinja2** — geração de PDF a partir de template HTML
- **pypdf** — proteção do PDF e verificação de integridade via SHA-256

**Frontend**
- **React 18 + Vite** — SPA com roteamento protegido por perfil
- **React Router** — rotas com autenticação
- **Axios** — cliente HTTP com injeção automática do token

---

## Decisões Técnicas

### Parser com Score de Confiança
O parser do SONUS 2 usa múltiplos padrões de regex com score de confiança, em vez de um único padrão rígido. Cada campo tem padrões de fallback, e o sistema só rejeita o arquivo quando menos de 3 dos 6 campos obrigatórios são encontrados — tornando o parser resiliente a diferentes versões de firmware do dosímetro.

```python
# Matching de nomes usa similaridade via difflib, não correspondência exata
# Trata abreviações, acentos e pequenas variações de digitação
def names_match(name_pdf: str, name_db: str, threshold: float = 0.85) -> bool:
    return name_similarity(name_pdf, name_db) >= threshold
```

### Laudos Imutáveis
Uma vez gerado, o laudo não pode ser substituído. Cada PDF recebe um hash SHA-256 e é armazenado com nome padronizado. O log de auditoria registra quem gerou cada laudo e quando.

### Controle de Acesso por Perfil
Dois perfis — `technician` e `admin_staff` — com validação no backend (dependency injection do FastAPI) e no frontend (rotas protegidas + navbar condicional).

---

## Estrutura do Projeto

```
ecosegme/
├── backend/
│   ├── app/
│   │   ├── routers/        # auth, companies, employees,
│   │   │                   # field_sheets, uploads, reports, users
│   │   ├── models/         # modelos ORM SQLAlchemy
│   │   ├── core/           # JWT, segurança, dependências
│   │   ├── templates/      # template HTML do laudo (Jinja2)
│   │   ├── parser.py       # parser SONUS 2
│   │   └── pdf_generator.py
│   ├── alembic/            # migrações do banco
│   └── tests/              # pytest (20 testes)
└── frontend/
    └── src/
        ├── pages/          # Login, Empresas, Funcionários,
        │                   # FichaDeCampo, Conferência,
        │                   # Laudos, Usuários
        ├── components/     # Navbar, PrivateRoute
        ├── context/        # AuthContext
        └── api/            # instância do axios
```

---

## Testes

```bash
cd backend
pytest tests/ -v
```

```
tests/test_auth.py         5 passando
tests/test_users.py        6 passando
tests/test_companies.py    3 passando
tests/test_parser.py       6 passando

20 passando em ~3s
```

---

## Rodando Localmente

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env   # preencher os valores
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## Variáveis de Ambiente

Ver [`.env.example`](.env.example) para todas as variáveis necessárias.

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL |
| `SECRET_KEY` | Chave de assinatura JWT |
| `VITE_API_URL` | URL do backend (build do frontend) |

---

## Autor

**Guilherme Lizardo**
Analista de Dados & Desenvolvedor Backend
[linkedin.com/in/guilherme-lizardo](https://br.linkedin.com/in/guilherme-lizardo) · glizardo171@gmail.com
