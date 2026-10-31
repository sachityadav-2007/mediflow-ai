# MediFlow AI

**Smart Hospital Appointment and Doctor Availability Management System**

MediFlow AI is a full-stack healthcare platform designed to modernize hospital appointment allocation, track doctor availability in real time, manage patient waitlists dynamically, and provide intelligent scheduling.

---

## 🛠️ Technology Stack

### Frontend
- **React 18** (UI Library)
- **Vite** (Next-generation frontend tooling and bundler)
- **Tailwind CSS** (Utility-first CSS framework for modern styling)
- **React Router v6** (Client-side routing)
- **Axios** (Promise-based HTTP client for API requests)

### Backend
- **Node.js** (JavaScript runtime)
- **Express.js** (Minimalist web framework)
- **PostgreSQL** (Relational database)
- **Prisma ORM** (Type-safe database ORM & migrations)
- **Socket.IO** (Real-time bidirectional event-based communication)
- **CORS** (Cross-origin resource sharing middleware)
- **Dotenv** (Environment variable management)
- **Nodemon** (Development hot-reloader)

---

## 📁 Project Structure

```text
mediflow-ai/
│
├── client/                     # Frontend React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   └── ServerStatus.jsx# Backend health check badge & status card
│   │   ├── pages/              # Page views
│   │   │   └── HomePage.jsx    # MediFlow AI landing view
│   │   ├── services/           # External service clients
│   │   │   └── api.js          # Axios instance and API calls
│   │   ├── App.jsx             # Root React Router component
│   │   ├── index.css           # Tailwind CSS directives
│   │   └── main.jsx            # Application entry point
│   ├── .env.example            # Sample client environment variables
│   ├── index.html              # HTML shell
│   ├── package.json            # Client dependencies and scripts
│   ├── postcss.config.js       # PostCSS configuration
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   └── vite.config.js          # Vite configuration
│
├── server/                     # Backend Node/Express application
│   ├── prisma/                 # Prisma schema & database migrations
│   │   ├── migrations/         # SQL migration history
│   │   ├── schema.prisma       # 7 core database models and enums
│   │   └── seed.js             # Database seeder with sample data
│   ├── src/
│   │   ├── config/             # Configuration modules
│   │   │   ├── db.js           # Prisma client singleton
│   │   │   └── socket.js       # Socket.IO initialization
│   │   ├── controllers/        # Request handlers
│   │   │   ├── database.controller.js # Database read & stats controller
│   │   │   └── health.controller.js   # Health check & DB status logic
│   │   ├── middleware/         # Custom Express middleware (placeholder)
│   │   ├── routes/             # API routes
│   │   │   ├── database.routes.js     # Database overview routes
│   │   │   └── health.routes.js       # Health check endpoint route
│   │   ├── services/           # Business logic layer (placeholder)
│   │   ├── app.js              # Express app setup and middleware
│   │   └── server.js           # Server entry point and HTTP/Socket listener
│   ├── .env.example            # Sample server environment variables
│   └── package.json            # Server dependencies and scripts
│
├── README.md                   # Project documentation
└── .gitignore                  # Git ignore rules
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher recommended)

---

### 1. Backend Setup

1. Navigate to the `server` directory:
   ```bash
   cd server
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *(Update `DATABASE_URL` with your PostgreSQL credentials if needed; defaults to `postgresql://postgres@localhost:5432/mediflow_ai?schema=public`)*

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Seed sample healthcare data:
   ```bash
   npm run seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```
   The backend server will run at: `http://localhost:5000`  
   Health check endpoint: `http://localhost:5000/api/health`  
   Database overview endpoint: `http://localhost:5000/api/db-overview`

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the `client` directory:
   ```bash
   cd client
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *(By default, `VITE_API_URL=http://localhost:5000` is set)*

4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The React application will run at: `http://localhost:5173`

---

## 🧪 Verification & Health Check

1. Open your browser and visit: `http://localhost:5173`
2. You will see the **MediFlow AI** landing page.
3. The System Health Status indicator will automatically check the backend connection:
   - 🟢 **Backend Connected** (when server is running at `http://localhost:5000`)
   - 🔴 **Backend Not Connected** (if server is stopped or unreachable)

