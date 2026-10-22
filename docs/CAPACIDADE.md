# Capacidade do servidor — como crescer sem parar o sistema

## O que limita o sistema
Gerar um relatório consolidado (PDF) é a operação mais pesada. Medido em testes com WeasyPrint real:

- O sistema ligado, parado, ocupa ~180 MB de memória.
- Cada ficha no PDF acrescenta ~3 MB durante a geração (relatório de Ruído; o Químico ainda não foi medido).
- Logo: 1 relatório de 100 fichas ≈ 500 MB de pico. Se a memória do servidor acabar, ele reinicia e quem estava gerando relatório perde a geração.

## Proteções no sistema (`backend/app/core/capacity.py`)
1. **Teto de fichas por relatório automático.** Calculado a partir da memória do servidor: `(75% da memória − 200 MB) ÷ 4,5 MB por ficha`, arredondado para múltiplos de 5. Ao trocar o plano do servidor, a máquina reinicia e o teto se ajusta sozinho. Valores esperados: 512 MB → 40 · 1 GB → ~100–115 · 2 GB → ~280.
   - `MAX_PDF_SHEETS` (variável de ambiente, opcional) só pode **reduzir** esse teto.
2. **Fila de 1 PDF por vez.** Se duas pessoas gerarem relatórios juntas, a segunda espera a primeira (até 4 minutos). O pior caso de memória é sempre 1 relatório.
3. **Mensagem clara ao bloquear.** Quem tenta gerar mais fichas que o teto vê quantas fichas o servidor suporta e o que fazer (gerar em lotes menores ou pedir aumento do plano).
4. **Aviso para o admin** no topo do sistema (amarelo, ou vermelho em estado crítico) quando:
   - o pico de memória passa de 75% da memória do servidor (vermelho: 90%); ou
   - houve tentativa de gerar relatório acima do teto; ou
   - algum relatório recente usou 90% ou mais do teto.
   O texto e o passo a passo do aviso ficam em `ALERT_*` no `capacity.py`; podem ser corrigidos sem mexer no frontend.

## Preços de referência (Fly.io, região gru/São Paulo)
Fórmula observada na calculadora (fly.io/calculator) e conferida com as predefinições: **≈ US$ 1,12 por vCPU compartilhada + ≈ US$ 9,68 por GB de RAM, por mês.**

| Configuração | Preço/mês | Observação |
|---|---|---|
| shared 1 vCPU, 1 GB | ~US$ 10,80 | cota de CPU baixa (ver abaixo) |
| shared-cpu-4x, 1 GB (predefinição) | US$ 14,18 | cota de CPU 4× maior |
| shared 4 vCPU, 2 GB | ~US$ 23,80 | |
| shared-cpu-8x, 2 GB (predefinição) | US$ 28,35 | |
| performance-1x, 2 GB | US$ 53,31 | CPU dedicada, sem limite de burst |

Sempre conferir na calculadora antes de contratar. O Fly.io **não tem limite de gasto nem alerta de cobrança**: acompanhar "current month to date bill" no painel.

## Cuidado com CPU compartilhada
Cada vCPU `shared` tem direito a ~6,25% de uso contínuo; acima disso consome uma reserva de até 500 s. Esgotada a reserva, o servidor fica até ~16× mais lento por vCPU. Um PDF de 100 fichas leva ~40 s de CPU; muitos relatórios grandes em sequência podem esgotar a reserva. Se isso acontecer (relatórios muito lentos), subir o número de vCPUs ou usar `performance`.

## Cuidados de implantação no Fly.io
- Por padrão o `fly deploy` pode criar **2 máquinas** (alta disponibilidade), dobrando o custo. Após o primeiro deploy, conferir com `fly status` e, se houver 2, rodar `fly scale count 1`.
- Redirecionar o `VITE_API_URL` do Vercel só depois de testar o endereço `*.fly.dev`.

## Limitações conhecidas
- O pico de memória do aviso é "desde o último reinício".
- Arquivos PDF do SONUS enviados ficam no disco local do servidor, apagado a cada reinício (pendência anterior, independente de capacidade).
- Os passos do aviso (painel do Fly.io) precisam ser validados na conta real da Ecosegme: a documentação do Fly.io só descreve a mudança de tamanho via linha de comando (`fly scale memory`).
