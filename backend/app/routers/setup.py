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


# Cabeçalho da planilha (linha 2) -> nome do campo em ChemicalAgent.
# Lido por NOME, não por posição — inserir/mover colunas na planilha não quebra
# a importação, só o texto do cabeçalho precisa continuar batendo.
_TLV_HEADER_MAP = {
    "Agente": "nome",
    "e-Social": "esocial",
    "Unidade": "unidade",
    "TWA": "acgih_twa",
    "STEL": "acgih_stel",
    "NR 15": "nr15_valor",
    "Bases de Efeitos Críticos": "efeito_critico",
    "Amostrador/Filtro": "amostrador",
    "Método": "metodo",
    "Método de Análise": "metodo_analise",
    "Vazão": "vazao",
    "Volume": "volume",
    "L.Q": "lq",
    "CAS": "numero_cas",
    "Grupos": "grupo",
}


def _parse_tlv_xlsx(xlsx_path, sheet_name="TLV", header_row=2, data_start_row=3):
    """Lê a planilha TLV e devolve uma lista de dicts (um por agente), mapeando
    colunas pelo texto do cabeçalho (linha `header_row`). Não toca no banco —
    função pura, fácil de testar isoladamente contra o arquivo real.
    """
    import openpyxl

    def _str(val):
        return str(val).strip() if val is not None else ""

    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb[sheet_name]

    col_by_field = {}
    for cell in ws[header_row]:
        campo = _TLV_HEADER_MAP.get(_str(cell.value).rstrip())
        if campo and campo not in col_by_field:  # mantém a 1ª ocorrência (há "Agente" duplicado)
            col_by_field[campo] = cell.column

    faltando = [h for h, campo in _TLV_HEADER_MAP.items() if campo not in col_by_field.values() and campo != "grupo"]
    if "nome" not in col_by_field:
        raise ValueError(f'Coluna "Agente" não encontrada no cabeçalho (linha {header_row}) de "{sheet_name}".')

    agentes = []
    for row in range(data_start_row, ws.max_row + 1):
        nome = _str(ws.cell(row, col_by_field["nome"]).value)
        if not nome:
            continue  # linha em branco

        dado = {"nome": nome}
        for campo, col in col_by_field.items():
            if campo == "nome":
                continue
            valor = _str(ws.cell(row, col).value)
            dado[campo] = valor if (campo != "grupo" or valor) else None
        agentes.append(dado)

    return agentes


@router.post("/setup/import-chemical-agents")
def import_chemical_agents(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Importa/atualiza o catálogo de agentes químicos a partir da planilha TLV.
    Faz upsert por nome: agente novo é inserido, agente já existente tem seus
    dados (incluindo `grupo`) atualizados a partir da planilha mais recente.
    Requer: openpyxl instalado + arquivo no path abaixo.
    """
    import os

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
        agentes = _parse_tlv_xlsx(XLSX_PATH)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao ler planilha: {e}")

    inserted = 0
    updated = 0

    for dado in agentes:
        existente = db.query(ChemicalAgent).filter(ChemicalAgent.nome == dado["nome"]).first()
        if existente:
            for campo, valor in dado.items():
                setattr(existente, campo, valor)
            updated += 1
        else:
            db.add(ChemicalAgent(**dado))
            inserted += 1

    db.commit()
    return {
        "message": "Importação concluída",
        "inserted": inserted,
        "updated": updated,
        "total": inserted + updated,
    }
