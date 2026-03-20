def test_criar_empresa(client, admin_token):
    res = client.post("/companies", json={
        "razao_social": "Empresa Teste Ltda",
        "cnpj": "12.345.678/0001-99",
        "endereco": "Rua Teste, 123"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["razao_social"] == "Empresa Teste Ltda"


def test_listar_empresas(client, admin_token):
    res = client.get("/companies", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_sem_autenticacao(client):
    res = client.get("/companies")
    assert res.status_code == 401
