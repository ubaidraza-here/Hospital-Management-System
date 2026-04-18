# Hospital Management System (HMS) — Clinical Operations

A modern, full-stack Hospital Management System designed for efficient clinical operations, role-based workflows, and financial tracking.

## 🚀 Overview

This HMS project provides a robust platform for managing medical practices. It features separate portals for Administrators, Doctors, and Patients, ensuring that each stakeholder has the exact tools they need for optimal care delivery.

### Key Features

- **Multi-Role Dashboards**: Tailored experiences for Admins, Doctors, and Patients.
- **Appointment Lifecycle**: Complete management from pending requests to approved consultations and completed visits.
- **Financial Ledger**: Immutable billing system with historical revenue visualization using Recharts.
- **Doctor Shift Management**: Real-time status tracking (On Shift, Busy, Off Duty) for better resource allocation.
- **Patient Portals**: Secure access for patients to book appointments and view medical history.
- **Modern UI**: Sleek, responsive design built with Next.js and high-end aesthetics.

## 🛠️ Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database**: MySQL with [SQLAlchemy](https://www.sqlalchemy.org/) ORM
- **Validation**: [Pydantic](https://docs.pydantic.dev/)
- **Environment**: Dotenv for secure configuration

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (React)
- **Styling**: Vanilla CSS / CSS Modules
- **Icons**: Lucide React
- **Charts**: Recharts for financial analytics
- **API Client**: Axios

## ⚙️ Setup & Installation

### Backend Setup
1. Navigate to the `api` directory:
   ```bash
   cd api
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file based on `.env.example` and configure your `DATABASE_URL`.
5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file based on `.env.example` and set `NEXT_PUBLIC_API_URL`.
4. Run the development server:
   ```bash
   npm run dev
   ```

## 🔐 Security Note
All sensitive configurations are managed via environment variables. Ensure that `.env` files are never committed to version control. Template files are provided as `.env.example`.

---
*Built with care for medical professionals and patients.*
