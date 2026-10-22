import threading
import time

import pytest
from fastapi import HTTPException

from app.config import settings
from app.core import capacity


@pytest.fixture(autouse=True)
def _reset(monkeypatch):
    """Isola cache do teto e contadores entre testes."""
    capacity.effective_max_sheets.cache_clear()
    capacity._blocked.update(count=0, largest=0)
    monkeypatch.setattr(settings, "MAX_PDF_SHEETS", None)
    yield
    capacity.effective_max_sheets.cache_clear()
    capacity._blocked.update(count=0, largest=0)


def _com_memoria(monkeypatch, mb):
    monkeypatch.setattr(capacity, "_memory_limit_mb", lambda: mb)
    capacity.effective_max_sheets.cache_clear()


def test_usage_so_admin(client, admin_token, tech_token):
    assert client.get("/system/usage").status_code == 401
    r = client.get("/system/usage", headers={"Authorization": f"Bearer {tech_token}"})
    assert r.status_code == 403
    r = client.get("/system/usage", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["level"] in ("ok", "atencao", "critico")
    assert body["max_pdf_sheets"] == capacity.effective_max_sheets()
    assert body["largest_batch_90d"] == 0


def test_teto_automatico_acompanha_a_memoria(monkeypatch):
    # Render 512 MB continua no teto antigo (40); Fly 1 GB ~100; Fly 2 GB bem maior.
    _com_memoria(monkeypatch, 512)
    assert capacity.effective_max_sheets() == 40
    _com_memoria(monkeypatch, 960)
    assert 95 <= capacity.effective_max_sheets() <= 120
    _com_memoria(monkeypatch, 1950)
    assert capacity.effective_max_sheets() >= 250


def test_teto_nunca_estoura_a_memoria_medida(monkeypatch):
    """Com o teto automático, o pico previsto (base 180 + 3 MB/ficha medidos)
    fica sempre abaixo de 75% da memória."""
    for mb in (512, 960, 1950, 4000):
        _com_memoria(monkeypatch, mb)
        n = capacity.effective_max_sheets()
        assert 180 + 3.0 * n <= mb * 0.75


def test_sem_leitura_de_memoria_usa_valor_conservador(monkeypatch):
    _com_memoria(monkeypatch, None)
    assert capacity.effective_max_sheets() == 40


def test_teto_manual_so_pode_reduzir(monkeypatch):
    _com_memoria(monkeypatch, 960)
    monkeypatch.setattr(settings, "MAX_PDF_SHEETS", 30)
    capacity.effective_max_sheets.cache_clear()
    assert capacity.effective_max_sheets() == 30
    monkeypatch.setattr(settings, "MAX_PDF_SHEETS", 9999)
    capacity.effective_max_sheets.cache_clear()
    assert capacity.effective_max_sheets() < 9999


def test_bloqueio_gera_mensagem_clara_e_aciona_alerta(monkeypatch, client, admin_token):
    _com_memoria(monkeypatch, 512)
    capacity.check_batch_size(40)  # no limite: passa
    with pytest.raises(HTTPException) as e:
        capacity.check_batch_size(55)
    assert e.value.status_code == 400
    assert "55" in e.value.detail and "40" in e.value.detail and "plano" in e.value.detail

    r = client.get("/system/usage", headers={"Authorization": f"Bearer {admin_token}"}).json()
    assert r["level"] == "atencao"
    assert r["blocked_attempts"] == 1
    assert r["title"] == "Uso de memória de servidor próximo ao limite"
    assert r["message"].startswith("Caso este ritmo de uso se mantenha constante")
    assert r["message"].endswith("siga os seguintes passos:")
    assert len(r["steps"]) >= 5 and "https://fly.io/dashboard" in r["steps"][0]


def test_alerta_por_pico_de_memoria(monkeypatch, client, admin_token):
    _com_memoria(monkeypatch, 1000)
    monkeypatch.setattr(capacity, "_memory_mb", lambda: {"used_mb": 700, "peak_mb": 800})
    h = {"Authorization": f"Bearer {admin_token}"}
    assert client.get("/system/usage", headers=h).json()["level"] == "atencao"  # 80%
    monkeypatch.setattr(capacity, "_memory_mb", lambda: {"used_mb": 700, "peak_mb": 950})
    assert client.get("/system/usage", headers=h).json()["level"] == "critico"  # 95%
    monkeypatch.setattr(capacity, "_memory_mb", lambda: {"used_mb": 300, "peak_mb": 400})
    ok = client.get("/system/usage", headers=h).json()
    assert ok["level"] == "ok" and ok["steps"] == [] and ok["message"] is None


def test_fila_uma_geracao_por_vez():
    """Duas geracoes simultaneas nunca rodam juntas; a segunda espera a primeira."""
    ativo, pico = [0], [0]
    guard = threading.Lock()

    def worker():
        gen = capacity.pdf_slot()
        next(gen)
        with guard:
            ativo[0] += 1
            pico[0] = max(pico[0], ativo[0])
        time.sleep(0.15)
        with guard:
            ativo[0] -= 1
        gen.close()

    ts = [threading.Thread(target=worker) for _ in range(4)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    assert pico[0] == 1


def test_fila_timeout_devolve_503(monkeypatch):
    monkeypatch.setattr(capacity, "_PDF_WAIT_SECONDS", 0.05)
    g1 = capacity.pdf_slot()
    next(g1)
    try:
        with pytest.raises(HTTPException) as e:
            next(capacity.pdf_slot())
        assert e.value.status_code == 503
    finally:
        g1.close()
