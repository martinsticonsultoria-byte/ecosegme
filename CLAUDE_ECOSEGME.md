# CLAUDE_ECOSEGME.md — Histórico de Ações do Projeto

> Documento gerado em 2026-05-18. Registra todas as ações realizadas no sistema EcoSegme,
> organizadas por fase, com o estado anterior, o que foi feito e o status atual.

---

## Visão Geral do Sistema

**EcoSegme** — sistema web de gestão de laudos técnicos de dosimetria de ruído ocupacional.

- **Backend:** FastAPI + SQLAlchemy + WeasyPrint + Jinja2 — `backend/`
- **Frontend:** React 18 + Vite + Axios — `frontend/`
- **Banco:** PostgreSQL via Supabase (região São Paulo)
- **Deploy:** Backend → Render | Frontend → Vercel

---

## FASE 1 — Ajustes de Interface e Fluxo (E1–E5)

### E1 — Renomear labels "Nº da Ordem" → "Nº do Laudo"
**Status:** ✅ Concluído

| | Antes | Depois |
|---|---|---|
| Conference.jsx | `"Defina o Nº da Ordem antes de aprovar"` | `"Defina o Nº do Laudo antes de aprovar"` |
| Conference.jsx | `<label>Nº da Ordem</label>` | `<label>Nº do Laudo</label>` |
| Conference.jsx | `"defina o Nº de Ordem (clique em Editar)"` | `"defina o Nº do Laudo (clique em Editar)"` |
| FieldSheetForm.jsx | `"O Nº de Ordem será definido..."` | `"O Nº do Laudo será definido..."` |
| reports.py (×2) | `"sem Nº de Ordem definido"` | `"sem Nº do Laudo definido"` |
| field_sheets.py | `"Defina o Nº da Ordem antes de aprovar"` | `"Defina o Nº do Laudo antes de aprovar"` |

**Arquivos alterados:** `Conference.jsx`, `FieldSheetForm.jsx`, `reports.py`, `field_sheets.py`
**Regra respeitada:** apenas textos visíveis ao usuário — nenhuma variável, prop ou coluna do banco foi renomeada.

---

### E2 — Corrigir bug "Deletar Empresa"
**Status:** ✅ Concluído

| | Antes | Depois |
|---|---|---|
| Comportamento | Erro ao deletar empresa era silencioso fora da aba Laudos | Exibe `alert()` com mensagem clara em qualquer aba |
| Erro 409 | Não tratado | `alert('Não é possível excluir esta empresa pois ela possui fichas ou funcionários vinculados.')` |
| Outros erros | `setDownloadError(...)` — só visível na aba Laudos | `alert('Erro ao deletar empresa. Tente novamente.')` |

**Arquivo alterado:** `frontend/src/pages/CompanyDetail.jsx` — handler `handleDeleteCompany`

---

### E3 — Exibir sufixo .1/ano no Nº do Laudo
**Status:** ✅ Concluído

| | Antes | Depois |
|---|---|---|
| Tabela de conferência | Exibia `42` | Exibe `42.1/2026` |
| Campo de edição | Input numérico simples | Input + span fixo `.1/2026` ao lado |
| Envio ao backend | Número inteiro | Número inteiro (sem sufixo — regra preservada) |

**Arquivo alterado:** `frontend/src/pages/Conference.jsx`
**Regra respeitada:** `laudo_number` permanece Integer no banco. Sufixo é visual, nunca salvo.

---

### E4 — Botão "Excluir Ficha de Campo" (CompanyDetail)
**Status:** ✅ Concluído

| | Antes | Depois |
|---|---|---|
| Linha da ficha | Sem botão de exclusão | Botão rosa `Excluir Ficha de Campo` |
| Comportamento | — | Modal de confirmação → `DELETE /field-sheets/{id}` → remove da tabela |
| Componente | — | `DeleteFieldSheetButton` exportado para reuso |

**Arquivo alterado:** `frontend/src/pages/CompanyDetail.jsx`
**Endpoint backend:** `DELETE /field-sheets/{id}` em `field_sheets.py`

---

### E5 — Botão "Excluir Ficha de Campo" (Conference)
**Status:** ✅ Concluído

| | Antes | Depois |
|---|---|---|
| Coluna Ações | Apenas "Editar", "SONUS", "Aprovar" | Adicionado `DeleteFieldSheetButton` ao lado de "Aprovar" |
| Implementação | — | Importação do componente criado em E4 — sem reescrita |

**Arquivo alterado:** `frontend/src/pages/Conference.jsx`

---

## FASE 2 — Geração de Relatório PDF com Capa (E6–E8)

### E6 — Seleção de Fichas para Relatório PDF
**Status:** ⏳ Aguardando validação em produção

| | Antes | Depois |
|---|---|---|
| Botão "Gerar Relatório PDF" | Gerava com todas as fichas da empresa | 1º clique ativa modo seleção com checkboxes |
| Seleção | Não existia | Checkboxes à esquerda do "#"; botão muda para "Confirmar e Gerar" |
| Endpoint | `GET /reports/generate-bulk-pdf?company_id=X` | Aceita `field_sheet_ids[]` como query params opcionais |
| Fallback | — | Sem seleção → botão "Confirmar e Gerar" permanece desabilitado |

**Arquivos alterados:** `frontend/src/pages/Conference.jsx`, `backend/app/routers/reports.py`

---

### E7 — Gerar Relatório via Aba Empresa
**Status:** ⏳ Aguardando validação em produção

| | Antes | Depois |
|---|---|---|
| Aba Relatórios | Botão "+ Gerar Relatório" sem funcionalidade de seleção | Abre modal listando fichas com checkbox |
| Seleção | — | Busca `GET /field-sheets/?company_id={id}`, lista fichas, permite seleção múltipla |
| Geração | — | Chama mesmo endpoint de E6 com `field_sheet_ids`; fecha modal e recarrega lista |

**Arquivo alterado:** `frontend/src/pages/CompanyDetail.jsx`

---

### E8 — Capa no Relatório PDF
**Status:** ✅ Concluído (múltiplas iterações de posicionamento)

#### Abordagem adotada
Substituição de layout com imagens decorativas separadas por **imagem de fundo única** (`capa_fundo.png.png`) coberta por divs absolutamente posicionados.

#### Conversão de coordenadas
Fórmula usada para converter coordenadas Canva (1055×1491px) para A4 (595×842pt):
```
x_pt = x_px × (595 / 1055)
y_pt = y_px × (842 / 1491)
```

#### Campos dinâmicos na capa (posições finais)

| Campo | top | left | font-size | font-weight |
|-------|-----|------|-----------|-------------|
| EMPRESA | 383.0pt | 93.4pt | dinâmico (`empresa_font_size`) | 700 |
| ENDEREÇO | 442.7pt | 93.4pt | dinâmico (`endereco_font_size`) | 700 |
| CNPJ | 520pt | 93.4pt | 16.5pt | 700 |
| Nº RELATÓRIO | 599.3pt | 45.2pt | dinâmico (`nr_font_size`) | 400 |
| DATA DE EMISSÃO | 685.8pt | 82.2pt | 20pt | 400 |

#### Font-size dinâmico
Função `calc_font_size()` implementada em `reports.py` e `test_capa_preview.py`:
- Estima `chars_per_line = max_width / (0.55 × font_size_pt)`
- Reduz 0.5pt por vez até o texto caber em ≤ 2 linhas
- Limites: EMPRESA min 9pt, ENDEREÇO min 9pt, Nº RELATÓRIO min 10pt

#### Histórico de ajustes na capa

| Iteração | O que foi corrigido |
|----------|---------------------|
| 1ª | Substituição de 3 imagens decorativas por `capa_fundo.png.png` como fundo único |
| 2ª | Coordenadas iniciais de todos os 5 campos |
| 3ª | EMPRESA: overflow com `white-space:normal` + `word-wrap:break-word` + `max-width` |
| 4ª | Novas coordenadas precisas via Canva (última versão) |
| 5ª | CNPJ `top` 503.4pt → 520pt; ENDEREÇO `max-height` 40pt → 30pt + `line-height:1.3` |
| 6ª | Font-size dinâmico para Nº RELATÓRIO (range de laudos) |

**Arquivos alterados:** `relatorio_pdf.html`, `reports.py`, `test_capa_preview.py`

---

## FASE 3 — Assinatura no Relatório PDF

**Status:** ✅ Concluído

| | Antes | Depois |
|---|---|---|
| Imagem de assinatura | `assinatura_arimar.png` (fundo branco sólido) | `relatório_assinatura.png` (fundo branco, com processamento Pillow) |
| Estrutura no template | `<table>` com célula centralizada | `<div style="text-align:center">` |
| Data de assinatura | Por ficha (`f.signature_date`) | Global do relatório: usa `data_relatorio` da ficha mais recente, senão hoje |
| Largura da imagem | 280pt | 220pt |
| Espaço acima da imagem | `margin: 0 0 8pt 0` | `margin: 0 0 24pt 0` |
| Arquivo carregado | `pdf_generator.py` e `reports.py` separados | Ambos apontam para `relatório_assinatura.png` (com acento) |

**Arquivos alterados:** `relatorio_pdf.html`, `reports.py`, `pdf_generator.py`

---

## FASE 4 — Novos Campos no FieldSheet

**Status:** ✅ Concluído (migrations criadas, NÃO executadas)

### Campo `data_relatorio` (Date, nullable)
| | Antes | Depois |
|---|---|---|
| Modelo | Não existia | `data_relatorio = Column(Date, nullable=True)` |
| Schema | Não existia | `data_relatorio: Optional[date] = None` em FieldSheetCreate e FieldSheetOut |
| Migration | — | `c4d5e6f7a8b9_add_data_relatorio_to_field_sheets.py` |
| Formulário | — | Campo "Data do Relatório" (date input) na seção de edição do Conference.jsx |
| Uso no PDF | Usava `signature_date` ou `datetime.now()` | Usa `data_relatorio` da ficha (prioridade), senão `signature_date`, senão hoje |

### Campo `conclusao_texto` (Text, nullable)
| | Antes | Depois |
|---|---|---|
| Modelo | Não existia | `conclusao_texto = Column(Text, nullable=True)` |
| Schema | Não existia | `conclusao_texto: Optional[str] = None` em FieldSheetCreate e FieldSheetOut |
| Migration | — | `d5e6f7a8b9c0_add_conclusao_texto_to_field_sheets.py` |
| Router PATCH | `allowed` set não incluía o campo | Adicionado a `allowed` em `edit_field_sheet` |
| Formulário | — | Textarea "Conclusão Personalizada" (full-width, 3 linhas) no Conference.jsx |
| Template PDF | Texto automático fixo baseado em `ne_val <= 85` | Se `conclusao_texto` preenchido, usa ele; senão usa texto automático |

### Campo `laudo_y` (Integer, nullable=False, default=1)
| | Antes | Depois |
|---|---|---|
| Modelo | Não existia | `laudo_y = Column(Integer, nullable=False, server_default='1')` |
| Schema | Não existia | `laudo_y: int = 1` somente em FieldSheetOut (read-only) |
| Migration | — | `e6f7a8b9c0d1_add_laudo_y_to_field_sheets.py` |
| Geração | — | Auto-calculado no POST: `count(fichas da empresa no ano atual) + 1` |
| Editável | — | Não — ausente do set `allowed` no PATCH |

**Arquivos alterados:** `field_sheet.py` (model), `field_sheet.py` (schema), `field_sheets.py` (router), 3 migrations

---

## FASE 5 — Parser SONUS 2

**Status:** ✅ Concluído

### Correção dos padrões de `dose_diaria`
| | Antes | Depois |
|---|---|---|
| Padrão 1 | `Dose diária [%]:` — capturava campo ERRADO com prioridade | **Removido** |
| Padrão 2 | `Dose [%]:` — campo CORRETO na posição 2 | **Mantido — movido para posição 1** |
| Padrão 3 | `Dose diária: X%` — capturava campo errado como fallback | **Removido** |
| Padrão 4 | `D = X%` — fallback genérico neutro | **Mantido — posição 2** |

**Campo correto no SONUS 2:** `"Dose [%]:"` — não `"Dose diária [%]:"`

**Template relatorio_pdf.html:**

| | Antes | Depois |
|---|---|---|
| Label na tabela de resultados | `Dose Diária (%):` | `Dose [%]:` |

**Arquivo alterado:** `backend/app/parser.py`, `backend/app/templates/relatorio_pdf.html`

---

## FASE 6 — Ferramenta de Preview Local

**Status:** ✅ Concluído

| | Detalhe |
|---|---|
| Arquivo criado | `backend/test_capa_preview.py` |
| Finalidade | Renderizar `relatorio_pdf.html` via Jinja2 puro (sem WeasyPrint) para inspeção visual no browser |
| Saída | `backend/capa_preview.html` — arquivo HTML estático com imagens base64 embutidas |
| Dados | Fichas fictícias de exemplo (2 funcionários, laudos 42 e 43) |
| Lógica | Replica exatamente a mesma `calc_font_size()` usada em produção |

---

## Resumo de Status

| Fase | Ação | Status |
|------|------|--------|
| E1 | Labels "Nº do Laudo" | ✅ Concluído |
| E2 | Bug Deletar Empresa | ✅ Concluído |
| E3 | Sufixo .1/ano visual | ✅ Concluído |
| E4 | Botão Excluir Ficha (CompanyDetail) | ✅ Concluído |
| E5 | Botão Excluir Ficha (Conference) | ✅ Concluído |
| E6 | Seleção de fichas para PDF | ⏳ Aguarda validação em produção |
| E7 | Gerar relatório via aba Empresa | ⏳ Aguarda validação em produção |
| E8 | Capa no Relatório PDF | ✅ Concluído |
| — | Assinatura no PDF | ✅ Concluído |
| — | Campo `data_relatorio` | ✅ Código pronto / ⚠️ Migration pendente de execução |
| — | Campo `conclusao_texto` | ✅ Código pronto / ⚠️ Migration pendente de execução |
| — | Campo `laudo_y` | ✅ Código pronto / ⚠️ Migration pendente de execução |
| — | Parser SONUS 2 — dose | ✅ Concluído |
| — | Preview local (test_capa_preview.py) | ✅ Concluído |

---

## Migrations Pendentes de Execução no Servidor

As três migrations abaixo foram criadas e commitadas mas **ainda não foram executadas** no banco de produção (Supabase):

```
c4d5e6f7a8b9_add_data_relatorio_to_field_sheets.py
d5e6f7a8b9c0_add_conclusao_texto_to_field_sheets.py
e6f7a8b9c0d1_add_laudo_y_to_field_sheets.py
```

Comando para executar (após deploy do backend):
```bash
alembic upgrade head
```

---

## Regras Absolutas (nunca violar)

```
❌ laudo_number é Integer — nunca mudar o tipo, nunca salvar sufixo no banco
❌ Sufixo .1/ano é visual — construído no frontend/template, nunca no banco
❌ Nunca alterar laudo.html — apenas relatorio_pdf.html
❌ Nunca alterar generate_bulk() (Excel) — apenas generate_bulk_pdf() (PDF)
❌ Excluir GeneratedReport → FieldSheet.status volta para "pendente" (comportamento preservado)
❌ Não misturar dois ajustes no mesmo commit
❌ Templates em backend/app/templates/ — nunca em backend/templates/
```

---

*EcoSegme · CLAUDE_ECOSEGME.md · Gerado em 2026-05-18*
