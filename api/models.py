from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Float, UniqueConstraint, Text
from sqlalchemy.orm import relationship
import enum
from database import Base


# ── Enumerations ──────────────────────────────────────────────────────────────

class RoleEnum(enum.Enum):
    ADMIN   = "admin"
    DOCTOR  = "doctor"
    PATIENT = "patient"


class ShiftStatus(enum.Enum):
    ON_SHIFT = "on_shift"
    BUSY     = "busy"
    OFF_DUTY = "off_duty"


class AppointmentStatus(enum.Enum):
    PENDING   = "pending"
    APPROVED  = "approved"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ── Base Person (Polymorphic Root) ────────────────────────────────────────────

class Person(Base):
    """Abstract base entity — all HMS users derive from this via joined-table inheritance."""
    __tablename__ = "persons"

    id    = Column(Integer, primary_key=True, index=True)
    name  = Column(String(100), index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    phone = Column(String(20))
    role  = Column(Enum(RoleEnum), nullable=False)

    __mapper_args__ = {
        "polymorphic_on":       role,
        "polymorphic_identity": "person",
    }


# ── Admin ─────────────────────────────────────────────────────────────────────

class Admin(Person):
    """System administrator — no additional domain columns."""
    __tablename__ = "admins"

    id = Column(Integer, ForeignKey("persons.id"), primary_key=True)

    __mapper_args__ = {
        "polymorphic_identity": RoleEnum.ADMIN,
    }


# ── Doctor ────────────────────────────────────────────────────────────────────

class Doctor(Person):
    """
    Medical professional.
    Encapsulates clinical shift state for intelligent appointment routing.
    """
    __tablename__ = "doctors"

    id             = Column(Integer, ForeignKey("persons.id"), primary_key=True)
    specialization = Column(String(100), nullable=False)
    shift_status   = Column(Enum(ShiftStatus), default=ShiftStatus.OFF_DUTY, nullable=False)
    experience_years = Column(Integer, nullable=True, default=0)
    bio            = Column(Text, nullable=True)

    appointments = relationship("Appointment", back_populates="doctor", foreign_keys="Appointment.doctor_id")

    __mapper_args__ = {
        "polymorphic_identity": RoleEnum.DOCTOR,
    }


# ── Patient ───────────────────────────────────────────────────────────────────

class Patient(Person):
    """Hospital patient — tracks medical record number."""
    __tablename__ = "patients"

    id            = Column(Integer, ForeignKey("persons.id"), primary_key=True)
    date_of_birth = Column(String(20), nullable=True)
    blood_type    = Column(String(5), nullable=True)

    appointments = relationship("Appointment", back_populates="patient", foreign_keys="Appointment.patient_id")

    __mapper_args__ = {
        "polymorphic_identity": RoleEnum.PATIENT,
    }


# ── Appointment Engine ────────────────────────────────────────────────────────

class Appointment(Base):
    """
    Core scheduling entity linking Patient ↔ Doctor.
    consultation_notes encapsulates clinical observations — accessible only post-completion.
    """
    __tablename__ = "appointments"

    id                  = Column(Integer, primary_key=True, index=True)
    patient_id          = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id           = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    status              = Column(Enum(AppointmentStatus), default=AppointmentStatus.PENDING, nullable=False)
    date_time           = Column(DateTime, nullable=False)
    consultation_notes  = Column(String(1000), nullable=True)

    patient = relationship("Patient", back_populates="appointments", foreign_keys=[patient_id])
    doctor  = relationship("Doctor",  back_populates="appointments", foreign_keys=[doctor_id])
    invoice = relationship("Invoice",  back_populates="appointment", uselist=False)


# ── Invoice (Financial Ledger) ────────────────────────────────────────────────

class Invoice(Base):
    """
    Immutable financial ledger — one row per paid appointment.
    Idempotency enforced via UniqueConstraint on appointment_id.
    Historical records are NEVER mutated once committed.
    """
    __tablename__ = "invoices"

    id             = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=False)
    amount         = Column(Float, nullable=False)
    date_paid      = Column(DateTime, nullable=False)

    appointment = relationship("Appointment", back_populates="invoice")

    __table_args__ = (
        UniqueConstraint("appointment_id", name="uq_invoice_appointment"),
    )
