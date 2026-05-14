import os
import base64
import hashlib
import re
from datetime import datetime
from weasyprint import HTML
from jinja2 import Template
from pypdf import PdfWriter, PdfReader

TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "templates", "laudo.html")

_MESES_PT = ["janeiro","fevereiro","março","abril","maio","junho",
             "julho","agosto","setembro","outubro","novembro","dezembro"]
OUTPUT_DIR = os.environ.get("STORAGE_DIR", "/tmp/laudos")

def slugify(text, max_len=20):
    text = text.upper().strip()
    text = re.sub(r"[^A-Z0-9 ]", "", text)
    text = text.replace(" ", "_")
    return text[:max_len]

def generate_laudo(data: dict) -> tuple:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        template_str = f.read()
    template = Template(template_str)
    sig_date = data.get('signature_date', '')
    if sig_date:
        try:
            d = datetime.strptime(sig_date, "%d/%m/%Y")
            signature_date_ext = f"{d.day:02d} de {_MESES_PT[d.month-1]} de {d.year}"
        except Exception:
            signature_date_ext = sig_date
    else:
        _now = datetime.now()
        signature_date_ext = f"{_now.day:02d} de {_MESES_PT[_now.month-1]} de {_now.year}"
    assinatura_path = os.path.join(os.path.dirname(__file__), "templates", "relatório_assinatura.png")
    with open(assinatura_path, "rb") as f_sig:
        assinatura_b64 = base64.b64encode(f_sig.read()).decode()
    html_content = template.render(**data, signature_date_ext=signature_date_ext, assinatura_b64=assinatura_b64)

    # Nome padronizado: [codigo]_[empresa]_[tipo]_[data].pdf
    codigo = str(data["laudo_number"]).zfill(4)
    empresa = slugify(data["razao_social"])
    raw_date = str(data["collection_date"])
    try:
        data_coleta = datetime.strptime(raw_date, "%d/%m/%Y").strftime("%Y%m%d")
    except ValueError:
        data_coleta = raw_date.replace("-", "")
    filename = f"{codigo}_{empresa}_DOSIMETRIA_{data_coleta}.pdf"

    temp_path = os.path.join(OUTPUT_DIR, "temp_" + filename)
    output_path = os.path.join(OUTPUT_DIR, filename)

    HTML(string=html_content).write_pdf(temp_path)

    reader = PdfReader(temp_path)
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt(user_password="", owner_password=None, use_128bit=True)
    with open(output_path, "wb") as f:
        writer.write(f)
    os.unlink(temp_path)

    with open(output_path, "rb") as f:
        sha256 = hashlib.sha256(f.read()).hexdigest()
    return output_path, filename, sha256
