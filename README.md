# DeepSkyn - Project Comparison & Analysis

This repository contains the full stack for the DeepSkyn application, organized for efficient team collaboration.

## Project Structure

```text
DeepSkyn-comparaison/
├── backend/            # NestJS API (PostgreSQL + Gemini AI)
├── frontend/           # React + Vite UI
├── docs/               # Technical documentation and guides
└── .gitignore          # Global Git configuration
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL

### Local Setup

1. **Clone the repository**
2. **Environment Configuration**:
   - Copy `backend/.env.example` to `backend/.env` and fill in your credentials (including `DB_PASSWORD=loulou`).
   - Copy `frontend/.env.example` to `frontend/.env`.
3. **Install Dependencies**:
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd ../frontend && npm install
   ```
4. **Run the Application**:
   - **Backend**: `cd backend && npm run start:dev`
   - **Frontend**: `cd frontend && npm run dev`

## Documentation
Additional documentation can be found in the `docs/` folder:
- `JWT-TEST-GUIDE.md`: Guide for testing authentication.
- `resume.txt`: Summary of the aggregation engine logic.

## Security
- Never commit `.env` files.
- Use `.env.example` to share configuration requirements with colleagues.
