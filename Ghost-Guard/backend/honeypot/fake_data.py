FAKE_USERS = [
    {"id": 1, "username": "admin", "email": "admin@company.internal", "role": "superadmin"},
    {"id": 2, "username": "j.smith", "email": "j.smith@company.internal", "role": "user"},
    {"id": 3, "username": "service_account", "email": "svc@company.internal", "role": "system"}
]

FAKE_DB_INFO = {
    "database": "prod_users_db",
    "version": "PostgreSQL 14.2",
    "tables": ["users", "sessions", "audit_log", "payment_methods"],
    "status": "connected"
}

FAKE_LOGIN_SUCCESS = {
    "status": "success",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake",
    "message": "Login successful"
}