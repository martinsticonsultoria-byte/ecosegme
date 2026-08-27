import os
import re
import unicodedata
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
BUCKET = os.environ.get("SUPABASE_BUCKET", "laudos")

_client = None

def _get_client():
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise RuntimeError("SUPABASE_URL e SUPABASE_SERVICE_KEY nao configurados")
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client

def is_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)

def safe_storage_key(filename: str) -> str:
    """Supabase Storage rejeita chaves com acentos/caracteres nao-ASCII
    ("Invalid key"). Normaliza para ASCII mantendo o nome legivel."""
    sem_acento = unicodedata.normalize('NFKD', filename).encode('ascii', 'ignore').decode('ascii')
    return re.sub(r'[^A-Za-z0-9_.\-]', '_', sem_acento)

def upload_pdf(pdf_bytes: bytes, filename: str) -> str:
    client = _get_client()
    key = safe_storage_key(filename)
    client.storage.from_(BUCKET).upload(
        path=key,
        file=pdf_bytes,
        file_options={"content-type": "application/pdf", "upsert": "true"},
    )
    return key

def get_signed_url(path: str, expires_in: int = 3600) -> str:
    client = _get_client()
    res = client.storage.from_(BUCKET).create_signed_url(path, expires_in)
    return res["signedURL"]

def delete_file(path: str) -> None:
    client = _get_client()
    client.storage.from_(BUCKET).remove([path])
