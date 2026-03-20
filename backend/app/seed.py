from app.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password

def seed():
    db = SessionLocal()
    users = [
        {"name": "Admin EcoSegme", "email": "admin@ecosegme.com", "password": "Admin@2024", "role": UserRole.admin_staff},
        {"name": "Tecnico Campo", "email": "tecnico@ecosegme.com", "password": "Tecnico@2024", "role": UserRole.technician},
    ]
    for u in users:
        exists = db.query(User).filter(User.email == u["email"]).first()
        if not exists:
            user = User(name=u["name"], email=u["email"], password_hash=hash_password(u["password"]), role=u["role"])
            db.add(user)
    db.commit()
    db.close()
    print("Seed executado com sucesso")

if __name__ == "__main__":
    seed()
