def test_login_admin(client):
    res = client.post("/auth/login", data={"username": "admin@test.com", "password": "senha123"})
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password(client):
    res = client.post("/auth/login", data={"username": "admin@test.com", "password": "errada"})
    assert res.status_code == 401


def test_login_unknown_user(client):
    res = client.post("/auth/login", data={"username": "naoexiste@test.com", "password": "senha123"})
    assert res.status_code == 401


def test_me(client, admin_token):
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "admin@test.com"


def test_me_sem_token(client):
    res = client.get("/auth/me")
    assert res.status_code == 401
