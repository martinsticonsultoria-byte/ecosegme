def test_listar_usuarios_admin(client, admin_token):
    res = client.get("/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_listar_usuarios_tecnico_negado(client, tech_token):
    res = client.get("/users", headers={"Authorization": f"Bearer {tech_token}"})
    assert res.status_code == 403


def test_criar_usuario(client, admin_token):
    res = client.post("/users", json={
        "name": "Novo Usuario",
        "email": "novo@test.com",
        "password": "senha123",
        "role": "technician"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "novo@test.com"


def test_criar_usuario_email_duplicado(client, admin_token):
    client.post("/users", json={"name": "X", "email": "dup@test.com", "password": "senha123", "role": "technician"},
                headers={"Authorization": f"Bearer {admin_token}"})
    res = client.post("/users", json={"name": "X", "email": "dup@test.com", "password": "senha123", "role": "technician"},
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 400


def test_toggle_usuario(client, admin_token):
    # cria um usuário pra desativar
    res = client.post("/users", json={"name": "Toggle", "email": "toggle@test.com", "password": "senha123", "role": "technician"},
                      headers={"Authorization": f"Bearer {admin_token}"})
    uid = res.json()["id"]
    res = client.patch(f"/users/{uid}/toggle", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["active"] == False


def test_reset_senha(client, admin_token):
    res = client.post("/users", json={"name": "ResetPwd", "email": "reset@test.com", "password": "senha123", "role": "technician"},
                      headers={"Authorization": f"Bearer {admin_token}"})
    uid = res.json()["id"]
    res = client.patch(f"/users/{uid}/password", json={"password": "novaSenha456"},
                       headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
