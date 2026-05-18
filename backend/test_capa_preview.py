"""Preview completo do relatorio_pdf.html com dados fictícios.
Renderiza via Jinja2 (sem WeasyPrint) para verificação visual no browser."""
import os
import base64
import math
from jinja2 import Template

TMPL_DIR = os.path.join(os.path.dirname(__file__), "app", "templates")
IMG_DIR  = os.path.join(TMPL_DIR, "images")
OUT_PATH = os.path.join(os.path.dirname(__file__), "capa_preview.html")


def b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def calc_font_size(texto, max_width_pt, font_size_pt=16.5, min_pt=9.0):
    while font_size_pt > min_pt:
        chars_per_line = max_width_pt / (0.55 * font_size_pt)
        lines = math.ceil(len(texto) / chars_per_line)
        if lines <= 2:
            break
        font_size_pt -= 0.5
    return f'{font_size_pt}pt'


# ── Imagens ───────────────────────────────────────────────────────────────────
capa_fundo_b64 = b64(os.path.join(IMG_DIR, "capa_fundo.png.png"))
logo_b64       = b64(os.path.join(TMPL_DIR, "logo.png"))
assinatura_b64 = b64(os.path.join(TMPL_DIR, "relatório_assinatura.png"))

# ── Dados fictícios ───────────────────────────────────────────────────────────
razao_social = "Indústria e Comércio de Alimentos do Norte Ltda"
endereco     = "Av. Constantino Nery, 3000, Chapada, Manaus/AM"
cnpj         = "12.345.678/0001-99"
laudo_min    = 42
laudo_max    = 43
year         = 2026
report_date  = "05.2026"
period       = "15/04/2026 à 15/04/2026"
tipo_analise = "Ruído"

empresa_font_size  = calc_font_size(razao_social, 375.9)
endereco_font_size = calc_font_size(endereco, 329.7)

_year = 2026
nr_texto = f"{laudo_min}.1/{_year} ao {laudo_max}.1/{_year}" if laudo_min != laudo_max else f"{laudo_min}.1/{_year}"
nr_font_size = calc_font_size(nr_texto, 321.1, font_size_pt=25.8, min_pt=10.0)

print(f"empresa_font_size  = {empresa_font_size}  ({len(razao_social)} chars)")
print(f"endereco_font_size = {endereco_font_size}  ({len(endereco)} chars)")
print(f"nr_font_size       = {nr_font_size}  ('{nr_texto}')")

# ── Fichas de exemplo ─────────────────────────────────────────────────────────
fichas = [
    {
        "laudo_number": 42,
        "employee_nome": "João da Silva Santos",
        "funcao": "Operador de Máquina",
        "matricula": "12345",
        "setor": "Produção",
        "local": "Linha 02",
        "dosimeter_number": 3,
        "collection_date": "15/04/2026",
        "technician_name": "Carlos Pereira",
        "technician_name_2": "",
        "epi": "Protetor Auricular - Plug de Inserção",
        "activity": "Operação de prensa hidráulica e alimentação da linha de produção.",
        "machine_noise": "Prensa hidráulica HP-200, esteira transportadora.",
        "pre_verificacao_db": "114,00",
        "pos_verificacao_db": "114,50",
        "ne_db": "87,3",
        "ne_val": 87.3,
        "nen_db": "88,1",
        "dose_diaria": "145",
        "tempo_medicao": "480",
        "inicio": "07:00",
        "fim": "15:00",
        "signature_date": "Manaus, 16 de abril de 2026.",
        "signature_date_ext": "16 de abril de 2026",
        "has_laudo": True,
    },
    {
        "laudo_number": 43,
        "employee_nome": "Maria Aparecida Costa",
        "funcao": "Auxiliar de Produção",
        "matricula": "67890",
        "setor": "Embalagem",
        "local": "Linha 05",
        "dosimeter_number": 4,
        "collection_date": "15/04/2026",
        "technician_name": "Carlos Pereira",
        "technician_name_2": "",
        "epi": "Ausência de EPI",
        "activity": "Embalagem manual de produtos acabados.",
        "machine_noise": "Ausência de equipamentos ruidosos.",
        "pre_verificacao_db": "114,00",
        "pos_verificacao_db": "114,00",
        "ne_db": "78,5",
        "ne_val": 78.5,
        "nen_db": "79,0",
        "dose_diaria": "52",
        "tempo_medicao": "480",
        "inicio": "07:00",
        "fim": "15:00",
        "signature_date": "Manaus, 16 de abril de 2026.",
        "signature_date_ext": "16 de abril de 2026",
        "has_laudo": False,
    },
]

# ── Renderizar template real ───────────────────────────────────────────────────
with open(os.path.join(TMPL_DIR, "relatorio_pdf.html"), "r", encoding="utf-8") as f:
    tmpl = Template(f.read())

html = tmpl.render(
    razao_social=razao_social,
    cnpj=cnpj,
    endereco=endereco,
    tipo_analise=tipo_analise,
    period=period,
    report_date=report_date,
    year=year,
    laudo_numbers=[f["laudo_number"] for f in fichas],
    laudo_min=laudo_min,
    laudo_max=laudo_max,
    logo_b64=logo_b64,
    assinatura_b64=assinatura_b64,
    capa_fundo_b64=capa_fundo_b64,
    empresa_font_size=empresa_font_size,
    endereco_font_size=endereco_font_size,
    nr_font_size=nr_font_size,
    signature_date_ext="14 de maio de 2026",
    fichas=fichas,
)

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"Preview completo gerado: {OUT_PATH}")
print("Seções: Capa | Resumo | 2 Fichas individuais com assinatura")
