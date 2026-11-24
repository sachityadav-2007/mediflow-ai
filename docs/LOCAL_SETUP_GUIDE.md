# MediFlow AI: Local Frontend Setup Guide

This guide shows how to run the MediFlow AI **frontend** on your own computer and connect it to the already-deployed backend. It is the quickest way to start contributing to the UI without installing PostgreSQL or the Python ML service.

For the full three-service setup (database, backend, ML service), see the **Local Installation & Setup** section of the main [README](../README.md).

---

## Prerequisites

- **Node.js** v18 or higher (check with `node -v`)
- **npm** v9 or higher (check with `npm -v`)
- **Git**
- A code editor such as VS Code

---

## 1. Get the code

If you are a collaborator, clone the repository directly:

```bash
git clone https://github.com/sachityadav-2007/mediflow-ai.git
cd mediflow-ai
```

If you are not a collaborator, **fork** the repository on GitHub first, then clone your fork:

```bash
git clone https://github.com/<your-username>/mediflow-ai.git
cd mediflow-ai
git remote add upstream https://github.com/sachityadav-2007/mediflow-ai.git
```

Set your Git identity. The email must be one that is added to your GitHub account (GitHub, then Settings, then Emails), otherwise your commits will not be linked to your profile:

```bash
git config user.name "Your Name"
git config user.email "your-github-email@example.com"
```

---

## 2. Create a working branch

Never work directly on `main`. Create a branch for each task:

```bash
git checkout -b my-feature-name
```

---

## 3. Point the frontend at the backend

The frontend reads the backend address from the `VITE_API_URL` environment variable. To use the deployed backend, create `frontend/.env`:

```bash
echo "VITE_API_URL=https://mediflow-api-bz27.onrender.com" > frontend/.env
```

If you run the backend locally instead, use `VITE_API_URL=http://localhost:5001`.

> `frontend/.env` is ignored by Git, so it will not appear in `git status` and will not be committed.

---

## 4. Install and run

```bash
cd frontend
npm install
npm run dev
```

When Vite is ready, it prints:

```
Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser. Keep this terminal open. Closing it stops the server.

---

## 5. Wake up the backend (important)

The deployed backend runs on a free hosting tier, so it goes to sleep when unused. The first request after a pause can take up to about a minute.

If the frontend shows **0 doctors** or an error banner:

1. Open `https://mediflow-api-bz27.onrender.com/api/doctors` in a new browser tab.
2. Wait until it shows JSON that starts with `{"success":true`.
3. Go back to `http://localhost:5173/doctors` and refresh.

---

## 6. Check that it works

Open **http://localhost:5173/doctors**. You should see:

- A list of doctor cards
- A sidebar with Speciality, Campus / City, Clinic Presence and Experience filters
- A **Sort by** dropdown above the doctor list

---

## 7. Where things live

| Path | What it contains |
|:---|:---|
| `frontend/src/pages/` | One file per page (for example `DoctorDirectoryPage.jsx`, `BookAppointmentPage.jsx`) |
| `frontend/src/components/` | Reusable pieces such as `Navbar` and `DoctorCard` |
| `frontend/src/services/api.js` | Functions that call the backend |
| `frontend/src/hooks/` | Custom hooks, such as `useSocket` for live updates |

---

## 8. Common problems

| Problem | Fix |
|:---|:---|
| `localhost:5173` will not load | The dev server is not running. Run `npm run dev` inside the `frontend` folder. |
| Page loads but shows 0 doctors | The backend is asleep. Follow section 5. |
| `zsh: no matches found` when using `grep --include=*.js` | In zsh, put the pattern in quotes: `--include="*.js"`. |
| Commits do not show your profile picture on GitHub | Your Git email is not linked to your GitHub account. Add it in GitHub, then Settings, then Emails. |

---

## 9. Submitting your changes

```bash
git add <the files you changed>
git commit -m "feat(frontend): short description of the change"
git push origin my-feature-name
```

Then open a **pull request** on GitHub into `sachityadav-2007/mediflow-ai:main` and ask a maintainer to review and merge it.

To bring in new changes from the main repository while you work:

```bash
git fetch upstream
git merge upstream/main
```