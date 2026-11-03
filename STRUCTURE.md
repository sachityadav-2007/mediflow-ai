# 📁 MediFlow AI — Complete Project Directory Architecture

```text
mediflow-ai/
│
├── 🎨 frontend/                     # FRONTEND (React 18 + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/              # Shared UI components
│   │   │   ├── Navbar.jsx           # Global navigation bar with role-based routing
│   │   │   ├── ProtectedRoute.jsx   # Role-based route guard component
│   │   │   ├── ScrollToTop.jsx      # Route transition scroll position reset
│   │   │   └── ServerStatus.jsx     # Live backend connectivity status badge
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Global authentication state, JWT sessions, and RBAC
│   │   ├── hooks/
│   │   │   └── useSocket.js         # Socket.IO real-time event listener hook
│   │   ├── pages/                   # Application pages (10 dedicated views)
│   │   │   ├── HomePage.jsx         # Landing page and system architecture overview
│   │   │   ├── LoginPage.jsx        # Multi-role authentication login view
│   │   │   ├── RegisterPage.jsx     # Patient registration view
│   │   │   ├── DoctorDirectoryPage.jsx # Apollo Hospitals-grade specialist directory & filters
│   │   │   ├── BookAppointmentPage.jsx # Discrete 30-min slot booking interface
│   │   │   ├── MyAppointmentsPage.jsx  # Patient appointment tracking & cancellation
│   │   │   ├── PatientWaitlistPage.jsx # Patient priority queue rank & status
│   │   │   ├── PatientDashboard.jsx    # Patient medical portal & active bookings
│   │   │   ├── DoctorDashboard.jsx     # Doctor schedule, presence toggle, and patient queue
│   │   │   └── AdminDashboard.jsx      # Hospital analytics, doctor & patient control center
│   │   ├── services/
│   │   │   ├── api.js               # Axios HTTP instance configured for port 5001 & cookies
│   │   │   └── socket.js            # Socket.IO client instance for real-time updates
│   │   ├── App.jsx                  # React Router v6 route configuration
│   │   ├── index.css                # Tailwind CSS global styles
│   │   └── main.jsx                 # React root DOM entry point
│   ├── index.html                   # HTML template
│   ├── package.json                 # Frontend dependencies and Vite build scripts
│   ├── tailwind.config.js           # Tailwind CSS theme styling configuration
│   ├── vite.config.js               # Vite development server configuration (Port 5173)
│   └── .env.example                 # Frontend environment variables template
│
├── ⚙️ backend/                      # BACKEND (Node.js + Express.js + Socket.IO)
│   ├── src/
│   │   ├── config/                  # Server configuration
│   │   │   ├── db.js                # Prisma Client database connection instance
│   │   │   └── socket.js            # Socket.IO real-time engine initialization
│   │   ├── controllers/             # HTTP Request Handlers (MVC Controller Layer)
│   │   │   ├── auth.controller.js   # Register, Login, Logout, and Me endpoints
│   │   │   ├── doctor.controller.js # Public directory, presence, schedule, and profile
│   │   │   ├── appointment.controller.js # Available slots and appointment lifecycle
│   │   │   ├── waitlist.controller.js    # Join, status, and manual allocation trigger
│   │   │   ├── patient.controller.js     # Patient profile management
│   │   │   └── admin.controller.js       # Hospital KPIs, doctor, and patient monitoring
│   │   ├── middleware/              # Security and validation middleware
│   │   │   ├── auth.js              # JWT verification and RBAC authorization guard
│   │   │   └── validate.js          # Request payload schema validation
│   │   ├── routes/                  # Express REST Route Handlers
│   │   │   ├── auth.routes.js       # /api/auth
│   │   │   ├── doctor.routes.js     # /api/doctors & /api/doctor
│   │   │   ├── appointment.routes.js# /api/appointments
│   │   │   ├── waitlist.routes.js   # /api/waitlist
│   │   │   ├── patient.routes.js    # /api/patients
│   │   │   └── admin.routes.js      # /api/admin
│   │   ├── services/                # Business Logic & Database Queries (Service Layer)
│   │   │   ├── auth.service.js
│   │   │   ├── doctor.service.js
│   │   │   ├── appointment.service.js
│   │   │   ├── waitlist.service.js
│   │   │   ├── allocationService.js # Smart waitlist priority slot allocation
│   │   │   ├── patient.service.js
│   │   │   └── admin.service.js
│   │   ├── utils/                   # Algorithmic Utilities
│   │   │   ├── generateSlots.js     # Discrete non-overlapping 30-min slot generator
│   │   │   └── priorityScoring.js   # Rule-based priority scoring algorithm
│   │   ├── app.js                   # Express application setup, CORS, cookie-parser
│   │   └── server.js                # HTTP server listener and Socket.IO initialization (Port 5001)
│   ├── package.json                 # Backend dependencies and nodemon scripts
│   └── .env.example                 # Backend environment variables template
│
├── 🗄️ database/                     # DATABASE (PostgreSQL + Prisma ORM)
│   ├── schema.prisma                # Complete Prisma schema (7 models, enums, relations)
│   ├── seed.js                      # Automated seeder (Apollo Doctors, Admin, Patients, Slots)
│   ├── migrations/                  # Version-controlled SQL migration history
│   ├── queries.sql                  # Handy PostgreSQL SQL queries for viva inspection
│   └── README.md                    # Database documentation and ER diagrams
│
├── 📜 scripts/                      # ROOT AUTOMATION SCRIPTS
│   └── dev.js                       # Single-command runner for both backend and frontend
│
├── package.json                     # Root project configuration & unified commands
├── README.md                        # Master project documentation
└── .gitignore                       # Git ignore rules for node_modules, .env, and dist/
```

---

## 🚀 Unified Root Commands

From the root directory, you can now manage all 3 tiers (Frontend, Backend, Database):

```bash
# 1. Run both Backend & Frontend simultaneously
npm run dev

# 2. Run only Frontend (React on Port 5173)
npm run dev:frontend

# 3. Run only Backend (Express on Port 5001)
npm run dev:backend

# 4. Build Frontend for production
npm run build

# 5. Database: Apply migrations
npm run db:migrate

# 6. Database: Seed Apollo Doctors & demo data
npm run db:seed

# 7. Database: Open visual web browser
npm run db:studio
```

