import os
import hashlib
import re
from weasyprint import HTML
from jinja2 import Template
from pypdf import PdfWriter, PdfReader

TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "templates", "laudo.html")
OUTPUT_DIR = "storage/laudos"

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
    html_content = template.render(**data)

    # Nome padronizado: [codigo]_[empresa]_[tipo]_[data].pdf
    codigo = str(data["laudo_number"]).zfill(4)
    empresa = slugify(data["razao_social"])
    data_coleta = str(data["collection_date"]).replace("-", "")
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
