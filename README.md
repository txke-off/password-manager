# Password Manager

React + FastAPI password manager with client-side encryption (AES-GCM, PBKDF2).

---

## Features
- Authorization with JWT
- Client-side password encryption (master password is never stored on a server)
- Complex password generator
- Rate limiting

---

## Project structure
```
.
├── backend/ # FastAPI server
│ ├── main.py # endpoints and API-routes
│ ├── auth.py # JWT + password hashing
│ ├── database.py # SQLAlchemy, connection to DB
│ ├── models.py # ORM-models (User, PasswordEntry)
│ └── dependencies.py # dependencies for main.py
│
└── frontend/ # React + Tailwind
  ├── src/
  │ ├── components/ # UI-components (Dashboard, Login, UnlockScreen etc.)
  │ ├── crypto.ts # WebCrypto (AES-GCM, PBKDF2)
  │ ├── EncryptionContext.tsx
  │ └── App.tsx
  └── index.html
```
