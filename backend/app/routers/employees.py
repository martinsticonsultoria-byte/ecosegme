from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeOut
from app.core.deps import get_current_user, require_admin

router = APIRouter(prefix="/employees", tags=["employees"])

@router.get("", response_model=List[EmployeeOut])
def list_employees(company_id: int = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    query = db.query(Employee)
    if company_id:
        query = query.filter(Employee.company_id == company_id)
    return query.order_by(Employee.nome).all()

@router.post("", response_model=EmployeeOut)
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    employee = Employee(**data.dict())
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee

@router.put("/{employee_id}", response_model=EmployeeOut)
def update_employee(employee_id: int, data: EmployeeCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    for key, value in data.dict().items():
        setattr(employee, key, value)
    db.commit()
    db.refresh(employee)
    return employee
