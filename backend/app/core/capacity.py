"""Capacidade do servidor para gerar PDFs em lote.

Gerar um PDF consolidado consome memória proporcional ao nº de fichas (medido:
~3 MB por ficha, mais ~180 MB do sistema ligado). Dois mecanismos mantêm o
servidor de pé independente do plano contratado:

- `pdf_slot`: fila de uma geração por vez. O pior caso de memória passa a ser
  1 PDF, não "N usuários x 1 PDF".
- Teto de fichas por PDF calculado SOZINHO pela memória do servidor
  (`effective_max_sheets`): ao trocar o plano do servidor, o teto acompanha no
  reinício, sem mexer em código. `MAX_PDF_SHEETS` (opcional) só serve para
  impor um teto manual MENOR que o automático.

Também expõe o consumo atual para o aviso de uso no sistema (`get_usage`).
"""
import threading
from functools import lru_cache
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings

# Fila: uma geração de PDF por vez. Quem chega com o servidor ocupado espera.
_pdf_lock = threading.BoundedSemaphore(1)
_PDF_WAIT_SECONDS = 240


def pdf_slot():
    """Dependência FastAPI (com yield): reserva a vez de gerar PDF e libera ao
    final da resposta. Declare DEPOIS da dependência de autenticação, para que
    requisições não autenticadas não entrem na fila."""
    if not _pdf_lock.acquire(timeout=_PDF_WAIT_SECONDS):
        raise HTTPException(
            status_code=503,
            detail="O servidor está gerando outros relatórios agora. Tente novamente em instantes.",
        )
    try:
        yield
    finally:
        _pdf_lock.release()


# Calibração (medida com WeasyPrint real, relatório de Ruído):
#   sistema ligado ~180 MB (+margem = 200) e ~3 MB por ficha (x1,5 de margem
#   porque o Químico não foi medido ainda = 4,5). Só se usa 75% da memória.
_SAFE_FRACTION = 0.75
_BASE_MB = 200
_MB_PER_FICHA = 4.5
_FALLBACK_MAX_SHEETS = 40  # memória ilegível (ex.: Windows/dev) -> valor conservador
_MIN_MAX_SHEETS = 10

_blocked = {"count": 0, "largest": 0}
_blocked_lock = threading.Lock()


@lru_cache(maxsize=1)
def effective_max_sheets() -> int:
    """Teto de fichas por PDF para a memória deste servidor (calculado uma vez
    por inicialização; trocar o plano reinicia a máquina e recalcula)."""
    limit_mb = _memory_limit_mb()
    if limit_mb:
        auto = int((limit_mb * _SAFE_FRACTION - _BASE_MB) / _MB_PER_FICHA)
        auto = max(_MIN_MAX_SHEETS, auto // 5 * 5)
    else:
        auto = _FALLBACK_MAX_SHEETS
    manual = settings.MAX_PDF_SHEETS
    return min(auto, manual) if manual else auto


def check_batch_size(n: int) -> None:
    """Bloqueia lotes acima do teto, com mensagem acionável, e registra a
    tentativa (alimenta o aviso de capacidade para o admin)."""
    limit = effective_max_sheets()
    if n > limit:
        with _blocked_lock:
            _blocked["count"] += 1
            _blocked["largest"] = max(_blocked["largest"], n)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Este relatório tem {n} fichas e o servidor suporta até {limit} por PDF no plano atual. "
                "Gere em lotes menores ou peça ao administrador para aumentar o plano do servidor."
            ),
        )


# ──────────────────────────────────────────────────────
# Leitura de memória (Linux). Fora do Linux retorna None sem quebrar.
# ──────────────────────────────────────────────────────

def _read_kb(path: str, key: str) -> Optional[int]:
    try:
        with open(path, "r") as f:
            for line in f:
                if line.startswith(key):
                    return int(line.split()[1])
    except Exception:
        return None
    return None


def _memory_limit_mb() -> Optional[float]:
    total_kb = _read_kb("/proc/meminfo", "MemTotal:")
    limit = total_kb / 1024 if total_kb else None
    for path in ("/sys/fs/cgroup/memory.max", "/sys/fs/cgroup/memory/memory.limit_in_bytes"):
        try:
            with open(path, "r") as f:
                raw = f.read().strip()
            if raw.isdigit():
                cg = int(raw) / 1024 / 1024
                if limit is None or cg < limit:
                    limit = cg
        except Exception:
            continue
    return limit


def _memory_mb() -> dict:
    rss_kb = _read_kb("/proc/self/status", "VmRSS:")
    peak_kb = _read_kb("/proc/self/status", "VmHWM:")
    return {
        "used_mb": round(rss_kb / 1024) if rss_kb else None,
        "peak_mb": round(peak_kb / 1024) if peak_kb else None,
    }


def _largest_batch(db: Session, days: int = 90) -> int:
    """Maior nº de fichas num único PDF gerado nos últimos `days` dias (usa o
    histórico que já existe em consolidated_reports.sheet_ids)."""
    from datetime import datetime, timedelta, timezone
    from app.models.consolidated_report import ConsolidatedReport

    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(ConsolidatedReport.sheet_ids)
        .filter(ConsolidatedReport.format == "pdf", ConsolidatedReport.generated_at >= since)
        .all()
    )
    return max((len(r[0]) for r in rows if r[0]), default=0)


FLY_DASHBOARD_URL = "https://fly.io/dashboard"
FLY_CALCULATOR_URL = "https://fly.io/calculator"

ALERT_TITLE = "Uso de memória de servidor próximo ao limite"
ALERT_MESSAGE = (
    "Caso este ritmo de uso se mantenha constante, sugerimos fazer o acréscimo no plano "
    "de servidor. Para isso siga os seguintes passos:"
)
# Passos escritos para quem não é técnico. Se o painel do Fly.io mudar, edite aqui
# (o frontend só exibe o que a API devolve).
ALERT_STEPS = [
    f"Acesse {FLY_DASHBOARD_URL} e entre com a conta do Fly.io da Ecosegme.",
    "Clique no aplicativo do sistema (nome: ecosegme-backend).",
    "Abra a opção de tamanho do servidor (Machines / Scale) e escolha o próximo nível de memória "
    "(por exemplo, de 1 GB para 2 GB).",
    f"Confira o valor mensal em {FLY_CALCULATOR_URL} antes de confirmar.",
    "Confirme a alteração. O sistema reinicia sozinho em cerca de 1 minuto; evite fazer isso no meio da "
    "geração de um relatório.",
    "Pronto: o limite de fichas por relatório aumenta automaticamente e este aviso some após o reinício.",
    "Se não encontrar a opção ou tiver dúvida, envie este aviso ao responsável técnico do sistema.",
]


def get_usage(db: Session) -> dict:
    limit_mb = _memory_limit_mb()
    mem = _memory_mb()
    max_sheets = effective_max_sheets()
    largest = _largest_batch(db)
    with _blocked_lock:
        blocked_count, blocked_largest = _blocked["count"], _blocked["largest"]

    peak_pct = round(mem["peak_mb"] / limit_mb * 100) if (limit_mb and mem["peak_mb"]) else None
    batch_pct = round(largest / max_sheets * 100) if max_sheets else 0

    # Memória é o que derruba o servidor: >=75% de pico pede atenção, >=90% é crítico.
    # Relatório bloqueado por limite ou lote >=90% do teto = demanda batendo no teto.
    level, detail = "ok", None
    if peak_pct is not None and peak_pct >= 90:
        level = "critico"
        detail = f"O servidor chegou a {peak_pct}% da memória e corre risco de reiniciar durante um relatório."
    elif peak_pct is not None and peak_pct >= 75:
        level = "atencao"
        detail = f"O servidor chegou a {peak_pct}% da memória gerando relatórios."
    elif blocked_count:
        level = "atencao"
        detail = (
            f"{blocked_count} tentativa(s) de gerar relatório foram bloqueadas por passar do limite "
            f"(maior: {blocked_largest} fichas; limite atual: {max_sheets})."
        )
    elif batch_pct >= 90:
        level = "atencao"
        detail = f"Um relatório recente usou {largest} das {max_sheets} fichas permitidas por PDF."

    return {
        "level": level,
        "title": ALERT_TITLE if level != "ok" else None,
        "message": ALERT_MESSAGE if level != "ok" else None,
        "detail": detail,
        "steps": ALERT_STEPS if level != "ok" else [],
        "dashboard_url": FLY_DASHBOARD_URL,
        "calculator_url": FLY_CALCULATOR_URL,
        "memory_limit_mb": round(limit_mb) if limit_mb else None,
        "memory_used_mb": mem["used_mb"],
        "memory_peak_mb": mem["peak_mb"],
        "memory_peak_pct": peak_pct,
        "max_pdf_sheets": max_sheets,
        "largest_batch_90d": largest,
        "largest_batch_pct": batch_pct,
        "blocked_attempts": blocked_count,
    }
