# Hospital Management System (HMS) — Clinical Operations Architecture



## 🚀 Architectural Overview
A modern, full-stack Hospital Management System engineered for efficient clinical operations, role-based access control (RBAC), and offline financial ledger tracking. 

This system was architected with a strict adherence to **Object-Oriented Programming (OOP)** principles, replacing legacy manual filing systems with a modular, secure, and highly scalable digital environment. It provides isolated portals for Administrators, Doctors, and Patients, ensuring that each stakeholder possesses the exact operational tools required for optimal care delivery.

## 🧬 Core OOP Implementation (FastAPI Backend)
The backend architecture rigorously applies academic computer science concepts to solve real-world clinical routing problems:
* **Inheritance & Polymorphism:** Utilizes a unified `Person` base class, extended by `Admin`, `Doctor`, and `Patient` derived classes using SQLAlchemy polymorphic identities.
* **Encapsulation:** Protects sensitive clinical data (e.g., consultation notes, billing records) using Pydantic schemas, ensuring strict data validation at the network border.
* **State Machines:** Implements idempotent REST APIs to manage the lifecycle of an `Appointment` (Pending -> Approved -> Completed) and Doctor availability (On Shift -> Busy -> Off Duty).

## 🏥 Key System Features
* **Intelligent Appointment Routing:** Patients can dynamically query available specialists based on real-time shift availability.
* **Multi-Tier RBAC Dashboards:** Cryptographically isolated navigation and data-fetching for Admins, Doctors, and Patients.
* **Immutable Financial Ledger:** Tracks offline consultation fees (categorized by specialization) with an absolute datetime boundary, rendering historical Month-over-Month (MoM) revenue visualization.
* **Doctor Shift Management:** Real-time status toggling directly linked to the patient-facing booking engine.

## 🛠️ Technology Stack

**Backend System**
* **Framework:** FastAPI (Python)
* **Database:** MySQL relational database
* **ORM:** SQLAlchemy (Object-Relational Mapping)
* **Validation:** Pydantic

**Frontend Client**
* **Framework:** Next.js 14+ (React App Router)
* **Styling:** Tailwind CSS (Dark/Clinical Theme)
* **Data Visualization:** Recharts
* **Network Client:** Axios

## ⚙️ Deployment & Initialization

### Backend Setup (Python)
1. Navigate to the `api` directory:
   ```bash
   cd api
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```
3. Install strict dependencies:

   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables (refer to .env.example) and initialize the server. The initialization script will automatically seed the MySQL database with mock clinical data:

  
   ```bash
   uvicorn main:app --reload
   ```
## Frontend Setup (Next.js)

5. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```
6. Install Node dependencies:

   ```bash
   npm install
   ```
7. Boot the Next.js development server:

   ```bash
   npm run dev
   ```

🔐 Security & Constraints
All sensitive configurations, including MySQL connection strings, are strictly managed via environment variables. The financial module operates as a closed, offline ledger and does not currently integrate with external payment gateways.
