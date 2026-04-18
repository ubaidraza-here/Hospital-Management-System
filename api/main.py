# -*- coding: utf-8 -*-
from fastapi import FastAPI, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
import models, database
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import calendar
from pydantic import BaseModel
from typing import Optional, List

# Auto-create tables in MySQL if they do not exist
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="HMS API — Clinical Operations")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class DoctorCreate(BaseModel):
    name: str
    email: str
    phone: str
    specialization: str

class PatientCreate(BaseModel):
    name: str
    email: str
    phone: str
    date_of_birth: Optional[str] = None
    blood_type: Optional[str] = None

class UserUpdate(BaseModel):
    name: str
    email: str
    phone: str

class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    date_time: datetime

class AppointmentStatusUpdate(BaseModel):
    status: str          # pending | approved | completed | cancelled
    consultation_notes: Optional[str] = None

class ShiftStatusUpdate(BaseModel):
    shift_status: str    # on_shift | busy | off_duty


# ── Helpers ───────────────────────────────────────────────────────────────────

CONSULTATION_FEE = 150.00

def _get_month_boundaries():
    """Returns (start_of_month, end_of_month) as Python datetime objects."""
    now = datetime.utcnow()
    start = datetime(now.year, now.month, 1, 0, 0, 0)
    _, last_day = calendar.monthrange(now.year, now.month)
    end = datetime(now.year, now.month, last_day, 23, 59, 59)
    return start, end

def _serialize_appointment(a: models.Appointment) -> dict:
    return {
        "id": a.id,
        "patient_id": a.patient_id,
        "patient_name": a.patient.name if a.patient else "Unknown",
        "doctor_id": a.doctor_id,
        "doctor_name": a.doctor.name if a.doctor else "Unknown",
        "doctor_specialization": a.doctor.specialization if a.doctor else "",
        "status": a.status.value,
        "date_time": a.date_time.isoformat() if a.date_time else None,
        "consultation_notes": a.consultation_notes,
        "is_paid": a.invoice is not None,
        "invoice_amount": a.invoice.amount if a.invoice else None,
    }

def _serialize_doctor(d: models.Doctor, db: Session) -> dict:
    appointment_count = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == d.id,
        models.Appointment.status.in_([
            models.AppointmentStatus.PENDING,
            models.AppointmentStatus.APPROVED,
        ])
    ).count()
    return {
        "id": d.id,
        "name": d.name,
        "email": d.email,
        "phone": d.phone,
        "specialization": d.specialization,
        "shift_status": d.shift_status.value,
        "active_appointments": appointment_count,
        "experience_years": d.experience_years,
        "bio": d.bio,
    }

def _serialize_patient(p: models.Patient) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "email": p.email,
        "phone": p.phone,
        "date_of_birth": p.date_of_birth,
        "blood_type": p.blood_type,
    }


# ── Seeder ────────────────────────────────────────────────────────────────────

def seed_database():
    db = database.SessionLocal()
    try:
        if db.query(models.Person).count() > 0:
            print("Database already seeded - skipping.")
            return

        print("[HMS] Seeding database...")

        # ── Persons ──────────────────────────────────────────────────────────
        admin = models.Admin(
            name="Dr. Claire Novak", email="admin@hospital.org",
            phone="1234567890", role=models.RoleEnum.ADMIN,
        )
        doc1 = models.Doctor(
            name="Dr. James Hartley", email="doctor@hospital.org",
            phone="2223334444", role=models.RoleEnum.DOCTOR,
            specialization="Cardiology", shift_status=models.ShiftStatus.ON_SHIFT,
            experience_years=14, bio="Board-certified cardiologist specializing in interventional procedures and preventive heart care."
        )
        doc2 = models.Doctor(
            name="Dr. Priya Sharma", email="priya@hospital.org",
            phone="3334445555", role=models.RoleEnum.DOCTOR,
            specialization="Neurology", shift_status=models.ShiftStatus.BUSY,
            experience_years=9, bio="Renowned neurologist focusing on cognitive health, neurodegenerative diseases, and stroke recovery."
        )
        doc3 = models.Doctor(
            name="Dr. Marcus Chen", email="marcus@hospital.org",
            phone="4445556666", role=models.RoleEnum.DOCTOR,
            specialization="Orthopedics", shift_status=models.ShiftStatus.OFF_DUTY,
            experience_years=22, bio="Surgical expert in joint replacement, sports medicine, and advanced orthopedic rehabilitation."
        )
        pat1 = models.Patient(
            name="Jordan Smith", email="patient@hospital.org",
            phone="5556667777", role=models.RoleEnum.PATIENT,
            date_of_birth="1990-04-15", blood_type="O+",
        )
        pat2 = models.Patient(
            name="Elena Torres", email="elena@hospital.org",
            phone="6667778888", role=models.RoleEnum.PATIENT,
            date_of_birth="1985-11-22", blood_type="A-",
        )
        pat3 = models.Patient(
            name="Samuel Okonkwo", email="samuel@hospital.org",
            phone="7778889999", role=models.RoleEnum.PATIENT,
            date_of_birth="2001-07-03", blood_type="B+",
        )

        db.add_all([admin, doc1, doc2, doc3, pat1, pat2, pat3])
        db.commit()
        print("[OK] Persons seeded.")

        # Refresh to get IDs
        db.refresh(doc1); db.refresh(doc2); db.refresh(doc3)
        db.refresh(pat1); db.refresh(pat2); db.refresh(pat3)

        # ── Appointments ─────────────────────────────────────────────────────
        now = datetime.utcnow()
        appt1 = models.Appointment(
            patient_id=pat1.id, doctor_id=doc1.id,
            status=models.AppointmentStatus.APPROVED,
            date_time=now - timedelta(days=2),
            consultation_notes="Routine cardiac check. BP stable at 120/80.",
        )
        appt2 = models.Appointment(
            patient_id=pat2.id, doctor_id=doc1.id,
            status=models.AppointmentStatus.PENDING,
            date_time=now + timedelta(hours=4),
        )
        appt3 = models.Appointment(
            patient_id=pat3.id, doctor_id=doc2.id,
            status=models.AppointmentStatus.COMPLETED,
            date_time=now - timedelta(days=10),
            consultation_notes="MRI scheduled for follow-up. Headache frequency reduced.",
        )
        appt4 = models.Appointment(
            patient_id=pat1.id, doctor_id=doc3.id,
            status=models.AppointmentStatus.PENDING,
            date_time=now + timedelta(days=1),
        )
        appt5 = models.Appointment(
            patient_id=pat2.id, doctor_id=doc2.id,
            status=models.AppointmentStatus.CANCELLED,
            date_time=now - timedelta(days=5),
        )
        appt6 = models.Appointment(
            patient_id=pat3.id, doctor_id=doc1.id,
            status=models.AppointmentStatus.APPROVED,
            date_time=now - timedelta(days=1),
        )

        db.add_all([appt1, appt2, appt3, appt4, appt5, appt6])
        db.commit()
        print("[OK] Appointments seeded.")

        db.refresh(appt1); db.refresh(appt3); db.refresh(appt6)

        # ── Invoices (historical 6-month ledger) ─────────────────────────────
        invoices = []
        # Current month invoices
        invoices.append(models.Invoice(
            appointment_id=appt1.id,
            amount=CONSULTATION_FEE,
            date_paid=now - timedelta(days=2),
        ))
        invoices.append(models.Invoice(
            appointment_id=appt6.id,
            amount=CONSULTATION_FEE,
            date_paid=now - timedelta(days=1),
        ))
        # Historical months (5 months back) — simulated via date offsets
        historical_appt = appt3.id
        for month_offset in range(1, 5):
            hist_date = now.replace(day=10) - timedelta(days=month_offset * 30)
            # We re-use appt3 conceptually for chart data via raw inserts
            invoices.append(models.Invoice(
                appointment_id=historical_appt,
                amount=CONSULTATION_FEE * (2 + month_offset % 3),
                date_paid=hist_date,
            ))
            historical_appt = appt3.id  # reuse same appt for seed simplicity

        # Only add first for appt3 to avoid unique constraint on historical sim
        db.add(invoices[0])
        db.add(invoices[1])
        db.commit()

        # Seed historical revenue directly via raw inserts (bypasses unique constraint)
        for month_offset in range(1, 6):
            hist_date = (now.replace(day=10) - timedelta(days=month_offset * 30))
            multiplier = 2 + (month_offset % 3)
            
            # Create a dummy appointment for historical record
            hist_appt = models.Appointment(
                patient_id=pat2.id, doctor_id=doc2.id,
                status=models.AppointmentStatus.COMPLETED,
                date_time=hist_date,
            )
            db.add(hist_appt)
            db.commit()
            db.refresh(hist_appt)

            db.add(models.Invoice(
                appointment_id=hist_appt.id,
                amount=CONSULTATION_FEE * multiplier,
                date_paid=hist_date,
            ))
            db.commit()
        print("[OK] HMS database seed complete!")

    except Exception as e:
        db.rollback()
        print(f"[ERR] Seed failed: {e}")
    finally:
        db.close()

seed_database()


# ── Core ──────────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"message": "Welcome to the HMS Clinical Operations API"}


@app.post("/login")
def login_user(login_data: LoginRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.Person).filter(models.Person.email == login_data.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    return {
        "id":    user.id,
        "name":  user.name,
        "email": user.email,
        "phone": user.phone,
        "role":  user.role.value,
    }


# ── Users ─────────────────────────────────────────────────────────────────────

@app.put("/users/{user_id}")
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(database.get_db)):
    user = db.query(models.Person).filter(models.Person.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    conflict = db.query(models.Person).filter(
        models.Person.email == data.email,
        models.Person.id != user_id,
    ).first()
    if conflict:
        raise HTTPException(status_code=400, detail="Email already in use.")
    user.name  = data.name
    user.email = data.email
    user.phone = data.phone
    db.commit()
    db.refresh(user)
    return {"id": user.id, "name": user.name, "email": user.email, "phone": user.phone, "role": user.role.value}


# ── Doctors ───────────────────────────────────────────────────────────────────

@app.get("/doctors")
def get_doctors(db: Session = Depends(database.get_db)):
    doctors = db.query(models.Doctor).all()
    return [_serialize_doctor(d, db) for d in doctors]

@app.get("/doctors/{doctor_id}")
def get_doctor(doctor_id: int, db: Session = Depends(database.get_db)):
    d = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    return _serialize_doctor(d, db)

@app.post("/doctors", status_code=status.HTTP_201_CREATED)
def create_doctor(data: DoctorCreate, db: Session = Depends(database.get_db)):
    if db.query(models.Person).filter(models.Person.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")
    doc = models.Doctor(
        name=data.name, email=data.email, phone=data.phone,
        role=models.RoleEnum.DOCTOR,
        specialization=data.specialization,
        shift_status=models.ShiftStatus.OFF_DUTY,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return _serialize_doctor(doc, db)

@app.delete("/doctors/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(doctor_id: int, db: Session = Depends(database.get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    db.delete(doc)
    db.commit()

@app.patch("/doctors/{doctor_id}/shift")
def update_doctor_shift(doctor_id: int, data: ShiftStatusUpdate, db: Session = Depends(database.get_db)):
    shift_map = {
        "on_shift": models.ShiftStatus.ON_SHIFT,
        "busy":     models.ShiftStatus.BUSY,
        "off_duty": models.ShiftStatus.OFF_DUTY,
    }
    new_status = shift_map.get(data.shift_status.lower())
    if new_status is None:
        raise HTTPException(status_code=400, detail="Invalid shift_status value.")
    doc = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    doc.shift_status = new_status
    db.commit()
    db.refresh(doc)
    return {"id": doc.id, "shift_status": doc.shift_status.value}


# ── Specializations ───────────────────────────────────────────────────────────

@app.get("/specializations")
def get_specializations(db: Session = Depends(database.get_db)):
    """Distinct specialization list for patient appointment modal dropdown."""
    rows = db.query(models.Doctor.specialization).distinct().all()
    return [r[0] for r in rows]


# ── Patients ──────────────────────────────────────────────────────────────────

@app.get("/patients")
def get_patients(db: Session = Depends(database.get_db)):
    patients = db.query(models.Patient).all()
    return [_serialize_patient(p) for p in patients]

@app.post("/patients", status_code=status.HTTP_201_CREATED)
def create_patient(data: PatientCreate, db: Session = Depends(database.get_db)):
    if db.query(models.Person).filter(models.Person.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")
    patient = models.Patient(
        name=data.name, email=data.email, phone=data.phone,
        role=models.RoleEnum.PATIENT,
        date_of_birth=data.date_of_birth,
        blood_type=data.blood_type,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return _serialize_patient(patient)

@app.delete("/patients/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: int, db: Session = Depends(database.get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    db.delete(patient)
    db.commit()


# ── Appointments ──────────────────────────────────────────────────────────────

@app.get("/appointments")
def get_all_appointments(db: Session = Depends(database.get_db)):
    """Admin scope — all appointments."""
    appts = db.query(models.Appointment).all()
    return [_serialize_appointment(a) for a in appts]

@app.get("/appointments/doctor/{doctor_id}")
def get_doctor_appointments(doctor_id: int, db: Session = Depends(database.get_db)):
    """Doctor scope — their own appointment queue."""
    doc = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    appts = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == doctor_id
    ).order_by(models.Appointment.date_time.desc()).all()
    return [_serialize_appointment(a) for a in appts]

@app.get("/appointments/patient/{patient_id}")
def get_patient_appointments(patient_id: int, db: Session = Depends(database.get_db)):
    """Patient scope — their own appointments."""
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    appts = db.query(models.Appointment).filter(
        models.Appointment.patient_id == patient_id
    ).order_by(models.Appointment.date_time.desc()).all()
    return [_serialize_appointment(a) for a in appts]

@app.post("/appointments", status_code=status.HTTP_201_CREATED)
def book_appointment(data: AppointmentCreate, db: Session = Depends(database.get_db)):
    """
    Patient books an appointment.
    Guard: doctor must be ON_SHIFT to accept bookings.
    """
    doctor = db.query(models.Doctor).filter(models.Doctor.id == data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    if doctor.shift_status != models.ShiftStatus.ON_SHIFT:
        raise HTTPException(
            status_code=400,
            detail=f"Dr. {doctor.name} is not currently on shift. Please select an available doctor.",
        )
    patient = db.query(models.Patient).filter(models.Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    appt = models.Appointment(
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        date_time=data.date_time,
        status=models.AppointmentStatus.PENDING,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return _serialize_appointment(appt)

@app.patch("/appointments/{appointment_id}/status")
def update_appointment_status(
    appointment_id: int,
    data: AppointmentStatusUpdate,
    db: Session = Depends(database.get_db),
):
    """Doctor approves, rejects, or completes an appointment."""
    status_map = {
        "pending":   models.AppointmentStatus.PENDING,
        "approved":  models.AppointmentStatus.APPROVED,
        "completed": models.AppointmentStatus.COMPLETED,
        "cancelled": models.AppointmentStatus.CANCELLED,
    }
    new_status = status_map.get(data.status.lower())
    if new_status is None:
        raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")

    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    appt.status = new_status
    if data.consultation_notes:
        appt.consultation_notes = data.consultation_notes
    db.commit()
    db.refresh(appt)
    return _serialize_appointment(appt)


# ── Invoice / Financial Ledger ────────────────────────────────────────────────

@app.post("/appointments/{appointment_id}/invoice", status_code=status.HTTP_200_OK)
def log_payment(appointment_id: int, db: Session = Depends(database.get_db)):
    """
    Idempotent payment logging — one Invoice per Appointment.
    If invoice already exists: sync status, return existing record (no double-insert).
    If no invoice: insert immutable ledger row + mark appointment COMPLETED.
    Both ops commit atomically.
    """
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    if appt.status not in (models.AppointmentStatus.APPROVED, models.AppointmentStatus.COMPLETED):
        raise HTTPException(status_code=400, detail="Can only invoice APPROVED or COMPLETED appointments.")

    try:
        # ── Double-Spend Guard ────────────────────────────────────────────────
        existing = db.query(models.Invoice).filter(
            models.Invoice.appointment_id == appointment_id
        ).first()

        if existing:
            # Idempotent — already paid; return cached record
            return {
                "appointment_id": appointment_id,
                "amount": existing.amount,
                "date_paid": existing.date_paid.isoformat(),
                "idempotent": True,
            }

        # ── New payment ───────────────────────────────────────────────────────
        invoice = models.Invoice(
            appointment_id=appointment_id,
            amount=CONSULTATION_FEE,
            date_paid=datetime.utcnow(),
        )
        db.add(invoice)
        appt.status = models.AppointmentStatus.COMPLETED
        db.commit()
        db.refresh(invoice)

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Payment failed: {str(e)}")

    return {
        "appointment_id": appointment_id,
        "amount": CONSULTATION_FEE,
        "date_paid": invoice.date_paid.isoformat(),
        "idempotent": False,
    }


# ── Dashboard Stats ───────────────────────────────────────────────────────────

@app.get("/dashboard-stats")
def get_dashboard_stats(db: Session = Depends(database.get_db)):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end   = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    on_shift_count = db.query(models.Doctor).filter(
        models.Doctor.shift_status == models.ShiftStatus.ON_SHIFT
    ).count()
    busy_count = db.query(models.Doctor).filter(
        models.Doctor.shift_status == models.ShiftStatus.BUSY
    ).count()
    total_appointments_today = db.query(models.Appointment).filter(
        models.Appointment.date_time >= today_start,
        models.Appointment.date_time <= today_end,
    ).count()
    pending_count = db.query(models.Appointment).filter(
        models.Appointment.status == models.AppointmentStatus.PENDING
    ).count()

    return {
        "doctors_on_shift":       on_shift_count,
        "doctors_busy":           busy_count,
        "appointments_today":     total_appointments_today,
        "pending_appointments":   pending_count,
        "total_doctors":          db.query(models.Doctor).count(),
        "total_patients":         db.query(models.Patient).count(),
    }


# ── Financial History ─────────────────────────────────────────────────────────

@app.get("/finances/history")
def get_finance_history(db: Session = Depends(database.get_db)):
    """
    Groups Invoice rows by month/year and sums revenue.
    Returns Recharts-compatible: [{"month": "Jan 2026", "revenue": 450.0}, ...]
    Fails gracefully — returns [] on any DB error.
    """
    try:
        result = db.execute(text("""
            SELECT
                DATE_FORMAT(date_paid, '%b %Y') AS month,
                DATE_FORMAT(date_paid, '%Y-%m') AS sort_key,
                SUM(amount) AS revenue
            FROM invoices
            GROUP BY month, sort_key
            ORDER BY sort_key ASC
        """)).fetchall()
        return [{"month": row[0], "revenue": float(row[2])} for row in result]
    except Exception as e:
        print(f"[WARN] /finances/history failed: {e}")
        return []
