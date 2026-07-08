from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password
from app.core.deps import require_admin

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/setup/seed")
def run_seed(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if db.query(User).first():
        return {"message": "Setup já foi executado", "created": []}
    users = [
        {"name": "Admin EcoSegme", "email": "admin@ecosegme.com", "password": "Admin@2024", "role": "admin_staff"},
        {"name": "Técnico EcoSegme", "email": "tecnico@ecosegme.com", "password": "Tecnico@2024", "role": "technician"},
    ]
    created = []
    for u in users:
        exists = db.query(User).filter(User.email == u["email"]).first()
        if not exists:
            user = User(
                name=u["name"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
                active=True
            )
            db.add(user)
            created.append(u["email"])
    db.commit()
    return {"created": created, "message": "Seed executado com sucesso"}


@router.post("/setup/import-chemical-agents")
def import_chemical_agents(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Importa o catálogo de 185 agentes químicos a partir da planilha TLV.
    Idempotente: pula agentes que já existem (mesmo nome).
    Requer: openpyxl instalado + arquivo no path abaixo.
    """
    import os
    import openpyxl

    XLSX_PATH = os.path.join(
        os.path.dirname(__file__),          # .../backend/app/routers/
        "..", "..", "data",                 # .../backend/data/
        "Eduardo - quimico.xlsx",
    )
    XLSX_PATH = os.path.abspath(XLSX_PATH)

    if not os.path.exists(XLSX_PATH):
        raise HTTPException(
            status_code=404,
            detail=f"Planilha não encontrada em: {XLSX_PATH}. "
                   "Copie 'Eduardo - quimico.xlsx' para backend/data/ e tente novamente.",
        )

    from app.models.chemical_agent import ChemicalAgent

    try:
        wb = openpyxl.load_workbook(XLSX_PATH, data_only=True)
        ws = wb["TLV"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao abrir planilha: {e}")

    # Row 1 = números, Row 2 = cabeçalhos reais, dados a partir de Row 3
    # Mapeamento de colunas (1-based):
    # A=1 nome | B=2 esocial | C=3 unidade | D=4 acgih_twa | E=5 acgih_stel
    # F=6 nr15_valor | H=8 efeito_critico | I=9 amostrador | J=10 metodo
    # K=11 metodo_analise | L=12 vazao | M=13 volume | N=14 lq | P=16 numero_cas

    def _str(val) -> str:
        return str(val).strip() if val is not None else ""

    inserted = 0
    skipped = 0

    for row in range(3, ws.max_row + 1):
        nome = _str(ws.cell(row, 1).value)
        if not nome:
            continue  # linha em branco

        # Idempotência: não duplicar
        exists = db.query(ChemicalAgent).filter(ChemicalAgent.nome == nome).first()
        if exists:
            skipped += 1
            continue

        agent = ChemicalAgent(
            nome=nome,
            esocial=_str(ws.cell(row, 2).value),
            unidade=_str(ws.cell(row, 3).value),
            acgih_twa=_str(ws.cell(row, 4).value),
            acgih_stel=_str(ws.cell(row, 5).value),
            nr15_valor=_str(ws.cell(row, 6).value),
            efeito_critico=_str(ws.cell(row, 8).value),
            amostrador=_str(ws.cell(row, 9).value),
            metodo=_str(ws.cell(row, 10).value),
            metodo_analise=_str(ws.cell(row, 11).value),
            vazao=_str(ws.cell(row, 12).value),
            volume=_str(ws.cell(row, 13).value),
            lq=_str(ws.cell(row, 14).value),
            numero_cas=_str(ws.cell(row, 16).value),
        )
        db.add(agent)
        inserted += 1

    db.commit()
    return {
        "message": "Importação concluída",
        "inserted": inserted,
        "skipped": skipped,
        "total": inserted + skipped,
    }
