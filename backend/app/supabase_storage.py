import os
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
BUCKET = "laudos"

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

def upload_pdf(pdf_bytes: bytes, filename: str) -> str:
    client = _get_client()
    client.storage.from_(BUCKET).upload(
        path=filename,
        file=pdf_bytes,
        file_options={"content-type": "application/pdf", "upsert": "false"},
    )
    return filename

def get_signed_url(path: str, expires_in: int = 3600) -> str:
    client = _get_client()
    res = client.storage.from_(BUCKET).create_signed_url(path, expires_in)
    return res["signedURL"]
