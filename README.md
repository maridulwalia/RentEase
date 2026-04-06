# 📦 RentEase — Peer-to-Peer Rental Management Platform

**RentEase** is a full-stack MERN web application that simplifies peer-to-peer item rentals. Users can list items they own, browse available rentals, manage bookings, track rental activity, and communicate — all from a single platform.

The system provides verified user profiles, structured booking workflows, owner approvals, rental tracking, and an admin oversight layer to bring trust and transparency to the sharing economy.

> **Stack:** MongoDB · Express.js · React (Vite + TypeScript) · Node.js · Tailwind CSS · Zustand

---

## 🚀 Key Features

| Feature | Description |
|---|---|
| **Auth & Verification** | JWT-based login, ID proof upload, role-based access (user / admin) |
| **Item Listings** | Upload images, set rental rates, manage availability |
| **Booking Flow** | Request → Approval → Pickup → Completion lifecycle |
| **Wallet System** | In-app wallet with transaction history |
| **Admin Panel** | User verification, complaint handling, maintenance mode, platform settings |
| **Complaint System** | File complaints with evidence uploads and message threads |
| **Review System** | Ratings for items and users, with report/moderation flow |
| **Maintenance Mode** | Admin-controlled maintenance mode with real-time frontend banner |
| **File Uploads** | Multer-based local storage (cloud-ready architecture) |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Zustand, Axios, React Router v7 |
| **Backend** | Node.js, Express.js 5, Mongoose 8 |
| **Database** | MongoDB |
| **Auth** | JSON Web Tokens (JWT), Bcrypt |
| **File Uploads** | Multer |
| **Security** | Helmet, CORS, express-rate-limit, express-validator |

---

## 📁 Project Structure

```
RENTEASE/
│
├── server/                   # Backend (Node.js + Express)
│   ├── config/               # Database connection
│   ├── controllers/          # Route logic / request handlers
│   ├── middleware/           # Auth, validation, file upload, maintenance
│   ├── models/               # Mongoose schemas (User, Item, Booking, Review, Complaint, Settings)
│   └── routes/               # API route definitions
│
├── src/                      # Frontend (React + Vite + TypeScript)
│   ├── components/           # Reusable UI components (Navbar, Footer, ProtectedRoute, AdminRoute)
│   ├── hooks/                # Custom React hooks (useMaintenanceMode)
│   ├── pages/                # Page-level components
│   │   ├── admin/            # Admin dashboard
│   │   └── auth/             # Login & Register pages
│   ├── services/             # Axios API wrappers
│   ├── stores/               # Zustand state (authStore)
│   ├── utils/                # Helper functions & error handling
│   ├── App.tsx               # Root component with routing
│   └── main.tsx              # App bootstrap
│
├── uploads/                  # Local storage for uploaded files
│   ├── profiles/
│   ├── items/
│   ├── documents/
│   └── evidence/
│
├── server.js                 # Backend entry point
├── index.html                # Frontend HTML template
├── vite.config.ts            # Vite configuration (with dev proxy)
├── tailwind.config.js        # Tailwind CSS configuration
├── .env                      # Environment variables (not committed)
├── .env.example              # Environment variable template — copy this to get started
└── package.json              # Dependencies & npm scripts
```

---

## ⚙️ API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | Public | Register new user (with ID proof upload) |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| GET | `/api/auth/profile` | User | Get current user profile |
| PUT | `/api/auth/profile` | User | Update profile / profile image |
| PUT | `/api/auth/change-password` | User | Change password |
| POST | `/api/auth/add-to-wallet` | User | Add funds to wallet |
| GET | `/api/items` | Public | Browse items (search, filter, paginate) |
| GET | `/api/items/categories` | Public | Get categories with counts |
| GET | `/api/items/:id` | Public | Get single item details |
| POST | `/api/items` | User | Create a new listing |
| PUT | `/api/items/:id` | Owner | Update a listing |
| DELETE | `/api/items/:id` | Owner | Delete a listing |
| GET | `/api/items/user/my-items` | User | Get own listings |
| POST | `/api/bookings` | User | Create a booking |
| GET | `/api/bookings` | User | List own bookings |
| PUT | `/api/bookings/:id/status` | User | Update booking status |
| GET | `/api/reviews/item/:id` | Public | Get reviews for an item |
| POST | `/api/reviews` | User | Submit a review |
| POST | `/api/complaints` | User | File a complaint |
| GET | `/api/admin/dashboard` | Admin | Dashboard statistics |
| GET | `/api/admin/users` | Admin | Manage users |
| GET | `/api/admin/maintenance-status` | Public | Check maintenance mode |

---

## 🧰 Installation & Local Setup

### Prerequisites

- **Node.js** v18+ ([download](https://nodejs.org))
- **MongoDB** — local instance or [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/maridulwalia/RentEase.git
cd RentEase
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
# Copy the example file
copy .env.example .env    # Windows
# cp .env.example .env   # macOS / Linux
```

Edit `.env` with your values:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/rentease

NODE_ENV=development

# JWT — use a long random string in production
JWT_SECRET=replace_with_a_long_random_secret

# Server
PORT=5000
FRONTEND_URL=http://localhost:5173

# File uploads
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Frontend API URL (used during Vite production build)
VITE_API_URL=http://localhost:5000/api
```

### 4. Start the Backend

```bash
# Terminal 1
node server.js
```

- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

### 5. Start the Frontend

```bash
# Terminal 2
npm run dev
```

- Frontend: `http://localhost:5173`

> The Vite dev server is pre-configured to **proxy** `/api` and `/uploads` requests to the backend — no extra CORS setup needed during development.

---

## 🏗️ Building for Production

```bash
# 1. Build the React frontend
npm run build
# Output goes to /dist

# 2. Start the backend server
NODE_ENV=production node server.js
```

For production deployment, set `FRONTEND_URL` and `VITE_API_URL` in your `.env` to your actual domain.  
The backend serves the API; deploy the `/dist` frontend separately (e.g. Vercel, Netlify) or serve it via Express.

---

## 🔐 Security Notes

- **Never commit `.env`** — it is already in `.gitignore`
- Always use a **strong, unique `JWT_SECRET`** in production (e.g. 64+ random characters)
- Uploaded files are stored locally in `/uploads` — for production, migrate to cloud storage (AWS S3 / Cloudinary)
- Rate limiting: 1000 requests per 15 minutes per IP

---

## 🗂️ Admin Account Setup

Use `createAdmin.js` to seed your first admin user locally:

```bash
node createAdmin.js
```

> `createAdmin.js` is not committed to the repository (it is in `.gitignore`).

---

## 📌 Future Work

- [ ] Payment gateway integration (Razorpay / Stripe)
- [ ] Real-time chat between renter and owner (Socket.io)
- [ ] Cloud file storage migration (AWS S3 / Cloudinary)
- [ ] Email notifications (Nodemailer)
- [ ] Push notifications
- [ ] Mobile app (React Native)

---

## 📄 License

This project is built for academic and demonstration purposes.
