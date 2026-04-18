# -*- coding: utf-8 -*-
# One-shot HMS database reset script.
# Usage: python reset_db.py
import os, sys
sys.path.insert(0, ".")

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")

# Step 1: connect to 'mysql' system DB to drop/create hms_db
server_url = DATABASE_URL.rsplit("/", 1)[0] + "/mysql"
engine = create_engine(server_url)

with engine.connect() as conn:
    conn.execute(text("DROP DATABASE IF EXISTS hms_db"))
    conn.execute(text("CREATE DATABASE hms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
    conn.commit()

print("[OK] hms_db dropped and recreated.")

# Step 2: import models and create all tables
import models, database

models.Base.metadata.create_all(bind=database.engine)
print("[OK] All HMS tables created.")

# Step 3: run seeder
import main  # seeder runs on import (seed_database() called at module level)
print("[OK] Seed complete. HMS database is ready.")
