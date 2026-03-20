import pdfplumber
import re
import unicodedata
from typing import Optional
from difflib import SequenceMatcher

HEADER_VARIANTS = [
    "Relatório dosimetria de ruído @ SONUS 2",
    "Relatorio dosimetria de ruido @ SONUS 2",
    "SONUS 2",
    "dosimetria de ruído",
]

PATTERNS = {
    "funcionario": [
        r"Funcion[aá]rio avaliado[:\s]+(.+)",
        r"Nome do funcion[aá]rio[:\s]+(.+)",
        r"Colaborador\s*\(a\)\s*:\s*(.+?)\s+Matr",
        r"Avaliado[:\s]+(.+)",
        r"Trabalhador[:\s]+(.+)",
    ],
    "inicio": [
        r"In[ií]cio[:\s]+(\d{2}:\d{2}:\d{2})",
        r"Hora inicial[:\s]+(\d{2}:\d{2}:\d{2})",
        r"Início da medição[:\s]+(\d{2}:\d{2}:\d{2})",
        r"In[ií]cio[:\s]+(\d{2}[hH]\d{2})",
    ],
    "fim": [
        r"Fim[:\s]+(\d{2}:\d{2}:\d{2})",
        r"Hora final[:\s]+(\d{2}:\d{2}:\d{2})",
        r"Término da medição[:\s]+(\d{2}:\d{2}:\d{2})",
        r"Fim[:\s]+(\d{2}[hH]\d{2})",
    ],
    "dose_diaria": [
        r"Dose di[aá]ria\s*\[%\][:\s]+([\d,\.]+)",
        r"Dose\s*\[%\][:\s]+([\d,\.]+)",
        r"Dose di[aá]ria[:\s]+([\d,\.]+)\s*%",
        r"D\s*=\s*([\d,\.]+)\s*%",
    ],
    "ne_db": [
        r"NE\s*\[dB\][:\s]+([\d,\.]+)",
        r"N[ií]vel de exposi[çc][ãa]o[:\s]+([\d,\.]+)",
        r"NE[:\s]+([\d,\.]+)\s*dB",
    ],
    "nen_db": [
        r"NEN\s*\[dB\][:\s]+([\d,\.]+)",
        r"N[ií]vel de exposi[çc][ãa]o normalizado[:\s]+([\d,\.]+)",
        r"NEN[:\s]+([\d,\.]+)\s*dB",
    ],
    "tempo_medicao": [
        r"Tempo\s*(?:de\s*medi[çc][ãa]o|da\s*medi[çc][ãa]o)\s*(?:\[min\])?\s*[:\s]+([\d,\.]+)",
        r"Dura[çc][ãa]o\s*(?:total\s*)?[:\s]+([\d,\.]+)\s*min",
        r"T(?:otal)?\s*=\s*([\d,\.]+)\s*min",
        r"Run\s*time[:\s]+([\d,\.]+)\s*min",
    ],
}


def normalize_text(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_text = nfkd.encode("ASCII", "ignore").decode("ASCII")
    return re.sub(r"\s+", " ", ascii_text).strip()


def name_similarity(name_a: str, name_b: str) -> float:
    a = normalize_text(name_a).lower()
    b = normalize_text(name_b).lower()
    return SequenceMatcher(None, a, b).ratio()


def names_match(name_pdf: str, name_db: str, threshold: float = 0.85) -> bool:
    if not name_pdf or not name_db:
        return False
    return name_similarity(name_pdf, name_db) >= threshold


def validate_header(text: str) -> bool:
    text_normalized = normalize_text(text)
    for variant in HEADER_VARIANTS:
        if normalize_text(variant) in text_normalized:
            return True
    return False


def extract_field(text: str, field: str) -> Optional[str]:
    for pattern in PATTERNS.get(field, []):
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = match.group(1).strip()
            value = re.split(r"\s{2,}|\t", value)[0].strip()
            value = re.split(r"\s+(Data|Jornada|Empresa|Setor|Realizado)\s*:", value, flags=re.IGNORECASE)[0].strip()
            value = re.split(r"\s+\d{2}/\d{2}/\d{4}", value)[0].strip()
            if value:
                return value
    return None


def extract_sonus_data(pdf_path: str) -> dict:
    try:
        with pdfplumber.open(pdf_path) as pdf:
            pages_text = []
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    pages_text.append(page_text)
            full_text = "\n".join(pages_text)
    except Exception as e:
        raise ValueError(f"Erro ao abrir PDF: {str(e)}")

    if not full_text.strip():
        raise ValueError("PDF sem texto extraível — pode ser escaneado ou protegido")

    if not validate_header(full_text):
        raise ValueError("PDF inválido: cabeçalho SONUS 2 não encontrado")

    result = {
        "funcionario": None,
        "inicio": None,
        "fim": None,
        "dose_diaria": None,
        "ne_db": None,
        "nen_db": None,
        "tempo_medicao": None,
    }

    for field in result:
        result[field] = extract_field(full_text, field)

    # Se não achou tempo_medicao diretamente, tenta "Duração total: HH:MM:SS" e converte para min
    if result["tempo_medicao"] is None:
        m = re.search(r"Dura[çc][ãa]o\s*(?:total)?\s*[:\s]+(\d{1,2}):(\d{2}):\d{2}", full_text, re.IGNORECASE)
        if m:
            horas, minutos = int(m.group(1)), int(m.group(2))
            result["tempo_medicao"] = str(horas * 60 + minutos)

    # Fallback: calcula de início/fim se ambos no formato HH:MM:SS
    if result["tempo_medicao"] is None and result["inicio"] and result["fim"]:
        try:
            from datetime import datetime
            fmt = "%H:%M:%S"
            t_ini = datetime.strptime(result["inicio"], fmt)
            t_fim = datetime.strptime(result["fim"], fmt)
            diff = (t_fim - t_ini).seconds // 60
            if diff > 0:
                result["tempo_medicao"] = str(diff)
        except Exception:
            pass

    # tempo_medicao is optional — exclude from required count
    missing = [k for k, v in result.items() if v is None and k != "tempo_medicao"]
    found = 6 - len(missing)

    result["_confidence_score"] = found
    result["_missing_fields"] = missing
    result["_warnings"] = []

    if missing:
        result["_warnings"].append(f"Campos não encontrados: {', '.join(missing)}")

    if found < 3:
        raise ValueError(
            f"Extração insuficiente: apenas {found}/6 campos encontrados. "
            f"Campos ausentes: {', '.join(missing)}"
        )

    return result


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Uso: python -m app.parser <caminho_do_pdf>")
        sys.exit(1)
    try:
        data = extract_sonus_data(sys.argv[1])
        print("\n=== DADOS EXTRAÍDOS ===")
        for k, v in data.items():
            if not k.startswith("_"):
                print(f"  {k}: {v}")
        print(f"\nConfiança: {data['_confidence_score']}/6 campos")
        if data["_warnings"]:
            for w in data["_warnings"]:
                print(f"  AVISO: {w}")
    except ValueError as e:
        print(f"ERRO: {e}")
        sys.exit(1)
