# Fluxo de trabalho — time de agentes (Ecosegme)

Estrutura padrão para executar lotes de ajustes neste sistema. Reutilizar nos próximos trabalhos.

## Princípio

Coordenação por **artefatos**, não por chat entre agentes. Cada subagente nasce, recebe só o brief da sua tarefa, executa, reporta curto e é descartado. O orquestrador (sessão principal) é o único que mantém a visão do todo. Isso evita o custo combinatório de agentes conversando entre si.

## Time

| Papel | Quem | Quando |
|---|---|---|
| **Orquestrador** | Sessão principal (Opus) | Sempre. Monta o backlog, escreve os briefs, decide ordem e paralelismo, despacha, integra, pede confirmação e faz commit/push. |
| **implementer** | Subagente (Sonnet) | 1x por tarefa. Implementa o brief e verifica. |
| **reviewer** | Subagente (Sonnet) | Só quando a tarefa toca template PDF, migração de banco, ou arquivo compartilhado por 2+ tarefas do lote. |

Papéis deliberadamente **não** criados, e por quê:

- **qa-tester** — `pytest` não está instalado. A validação real aqui é `py_compile` + parse JSX + parse Jinja2 + render WeasyPrint, e isso roda dentro do implementer.
- **deploy-agent** — deploy é `git push` para dois remotes, que dispara Render e Vercel. Exige confirmação explícita do usuário a cada vez; não se delega a agente autônomo.
- **tech-architect** — para lotes pequenos (< ~8 tarefas) o spec cabe dentro do brief escrito pelo orquestrador. Um handoff a menos.

## Invariantes do projeto

Estas regras determinam a ordem de execução — não são preferências:

1. **Alembic tem cabeça única e cadeia linear.** Toda tarefa que mexe em banco cria uma migração cujo `down_revision` é o head vigente. Portanto **tarefas com migração são sempre seriais**, mesmo sem overlap de arquivo. O orquestrador informa o `down_revision` correto em cada brief e atualiza o head entre tarefas.
2. **Paralelizar só sem overlap de arquivo** — e lembrando que `Conference.jsx` e `CompanyDetail.jsx` são tocados por quase tudo.
3. **Push vai somente para `meu-fork`** (martinsticonsultoria-byte/ecosegme), de onde sai o deploy. Não enviar para `origin` (glizardx).
4. **Nunca commitar sem confirmação explícita do usuário.**
5. **Campo de controle interno não vai para o relatório final.**
6. Após cada lote, atualizar a Wiki (changelog + seção de uso, quando aplicável).

## Ciclo

```
1. Backlog       → orquestrador estrutura a lista e CONFIRMA prioridades com o usuário
2. Brief         → orquestrador escreve brief autocontido por tarefa
                   (escopo, arquivos, down_revision se houver, critério de pronto)
3. Implementação → implementer; paralelo só se sem overlap E sem migração
4. Revisão       → reviewer, conforme a regra da tabela.
                   Reprovou → volta 1x ao implementer com o motivo.
                   Reprovou de novo → escala ao usuário, não tenta uma terceira vez.
5. Entrega       → orquestrador resume, pede confirmação, commita e envia aos 2 remotes
6. Wiki          → changelog atualizado
```

Entre fases, resumo curto ao usuário — nunca despejar o conteúdo integral dos artefatos intermediários.

## Verificação (o que realmente funciona aqui)

```bash
# Python
python.exe -m py_compile <arquivos.py>

# JSX (a partir de frontend/)
node -e "require('esbuild').buildSync({entryPoints:['src/pages/X.jsx'],bundle:false,write:false,loader:{'.jsx':'jsx'}})"

# Jinja2
python.exe -c "from jinja2 import Environment,FileSystemLoader; Environment(loader=FileSystemLoader('backend/app/templates')).get_template('X.html')"
```

Mudança de PDF exige render real com WeasyPrint e inspeção visual — não se valida lendo código.
