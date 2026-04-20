[README.md](https://github.com/user-attachments/files/26914122/README.md)
# Smart-Shift Scheduling
## Complete AI-Powered Workforce Management System

---

## HOW TO RUN IN VS CODE — STEP BY STEP

### Step 1 — Open the Project
1. Open **VS Code**
2. Go to **File → Open Folder**
3. Select the **SmartShift** folder
4. Click **Open**

### Step 2 — Install Node.js (if not installed)
- Download from **nodejs.org** → choose the **LTS** version
- Run the installer, click through with all defaults
- Restart VS Code after installing

### Step 3 — Install Dependencies
1. In VS Code, press **Ctrl + ` (backtick)** to open the terminal
2. Type this and press Enter:
```
npm install
```
Wait for it to finish (takes 1–2 minutes).

### Step 4 — Configure Your Environment
1. In the VS Code file panel, find `.env.example`
2. Right-click it → **Copy**
3. Right-click in the same folder → **Paste**
4. Rename the copy to `.env` (remove `.example`)
5. Open `.env` and fill in:
   - `ANTHROPIC_API_KEY` → get from **platform.anthropic.com** → API Keys → Create Key
   - `SESSION_SECRET` → run this in the terminal and paste the output:
     ```
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Leave everything else as-is for now

### Step 5 — Start the Server
In the VS Code terminal, type:
```
npm run dev
```
You should see:
```
╔══════════════════════════════════════════╗
║   Smart-Shift Scheduling Server          ║
║   http://localhost:3001                  ║
╚══════════════════════════════════════════╝
```

### Step 6 — Open the App
Open your browser and go to:
```
http://localhost:3001
```

---

## FIRST TIME — OWNER SETUP

1. On the sign-in page, click the **Owner** tab
2. Sign in with:
   - ID: `owner@co.com`
   - Password: `owner123`
3. The **First-Time Setup Wizard** launches automatically
4. Speak or type your company name, payroll email, and payroll day
5. Create your first admin account
6. Click **Launch Smart-Shift** — your company name injects everywhere

---

## LOGIN CREDENTIALS (DEMO)

| Role     | ID / Email         | Password   | Accesses         |
|----------|--------------------|------------|------------------|
| Owner    | owner@co.com       | owner123   | Owner Dashboard  |
| Admin    | derek@co.com       | admin123   | Admin Dashboard  |
| Manager  | sofia@co.com       | pass123    | Admin Dashboard  |
| Employee | marcus@co.com      | pass123    | Employee Portal  |
| Employee | 1042837            | pass123    | Employee Portal  |

---

## PROJECT FILE STRUCTURE

```
SmartShift/
├── package.json              ← Node.js dependencies
├── .env.example              ← Copy to .env and fill in your keys
├── .env                      ← YOUR secrets (never share this)
├── .gitignore
├── smartshift.db             ← SQLite database (auto-created on first run)
│
├── server/                   ← Node.js Express Backend
│   ├── server.js             ← Main server entry point
│   ├── db.js                 ← SQLite database + auto-seed
│   ├── middleware/
│   │   └── auth.js           ← Session authentication middleware
│   └── routes/
│       ├── auth.js           ← Login / logout / session
│       ├── employees.js      ← Employee CRUD + 7-digit ID generator
│       ├── shifts.js         ← Shift management + assignments
│       ├── timesheets.js     ← Hour logging + conflict blocking + payroll data
│       ├── messages.js       ← Real-time chat
│       ├── swaps.js          ← Overtime + swap board
│       ├── config.js         ← Company config + notifications
│       └── ai.js             ← ALL Anthropic Claude API calls (key stays secret)
│
└── public/                   ← Frontend (served as static files)
    ├── index.html            ← Sign-in page (matches reference image exactly)
    ├── css/
    │   └── theme.css         ← Global brand theme (exact logo colors)
    ├── js/
    │   └── app.js            ← API client + Voice engine + shared utilities
    └── pages/
        ├── setup.html        ← Owner first-time setup wizard
        ├── admin.html        ← Admin / Manager dashboard (3-column layout)
        ├── employee.html     ← Employee portal (calendar + voice)
        └── owner.html        ← Owner command center (everything)
```

---

## AI AGENT CAPABILITIES

| Feature | How It Works |
|---------|-------------|
| Voice onboarding | Speech → Claude extracts employee fields → form auto-fills |
| Employee validation | Claude checks type limits, flags policy violations |
| Voice hour logging | "Log 8 hours for Monday" → Claude parses → auto-submits |
| Auto-schedule | Claude assigns shifts by points + hours, respecting all caps |
| Conflict detection | Runs locally (no API) — blocks overtime before it happens |
| AI chat assistant | Full context-aware conversation about your operations |
| Payroll generation | Claude writes professional summary email |
| Payroll email sending | Sends automatically on configured day via SMTP |
| Setup wizard | Claude extracts company info from owner's spoken words |

---

## CONFLICT DETECTION RULES

These run **without any AI API call** — instant, server-side:

| Employment Type | Weekly Cap | What Happens |
|-----------------|-----------|--------------|
| Full-Time (FT)  | 40 hours  | BLOCKED — cannot log over |
| Part-Time (PT)  | 30 hours  | BLOCKED — cannot log over |
| Student (ST)    | 25 hours  | BLOCKED — legal compliance |
| Seasonal (SE)   | 40 hours  | BLOCKED — cannot log over |
| Salary (SA)     | No hard cap | Warning displayed at 45h+ |

**At 90% of any cap** → yellow warning badge appears automatically on all dashboards.

---

## PAYROLL AUTOMATION

Payroll runs automatically every week on your configured day:
1. Server checks the day on every startup
2. If today is payroll day and it hasn't sent today: triggers automatically
3. Claude generates a professional summary with all employee hours
4. Email sent via SMTP (configure in `.env`)

**To send payroll manually:** Click the **📤 Payroll** button on any admin/owner dashboard.

---

## SETTING UP EMAIL (PAYROLL SENDING)

Using Gmail:
1. Go to **myaccount.google.com → Security → 2-Step Verification** (enable it)
2. Then go to **myaccount.google.com → Security → App Passwords**
3. Create a new app password for "Mail"
4. In your `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=the_16_char_app_password
```

---

## RESETTING THE DATABASE

To start fresh (removes all employees and data):
```
# Delete the database file
del smartshift.db        (Windows)
rm smartshift.db         (Mac/Linux)

# Restart the server — it auto-recreates with demo data
npm run dev
```

---

## VOICE INPUT — SUPPORTED COMMANDS

**Hours Logging (Employee Portal):**
- "Log 8 hours for today"
- "Log 6 hours for Monday"  
- "Log 4 hours for 2025-04-21"
- "I worked 7.5 hours yesterday"

**Employee Onboarding (Admin/Owner):**
- "Add John Smith full time in operations 40 hours"
- "New employee Maria Santos part time logistics 20 hours maria@co.com"
- "Seasonal worker Jake Brown warehouse 40 hours"

**Swap/Overtime (Employee Portal):**
- "I want to swap my Friday shift"
- "Post overtime for this Saturday"
- "Available for overtime on April 25"

**AI Chat (All Dashboards):**
- "Who is over their hour limit?"
- "Generate a schedule for next week"
- "How many employees do we have?"
- "Send payroll now"
- Anything else — the AI has full context of your operations

---

## TROUBLESHOOTING

**"Cannot find module 'better-sqlite3'"**
→ Run `npm install` again in the terminal

**"Port 3001 already in use"**
→ Change `PORT=3002` in your `.env` file

**Voice not working**
→ Voice input requires **Chrome** browser. Firefox/Safari are not supported.

**AI returns "[AI not connected]"**
→ Open `.env` and make sure `ANTHROPIC_API_KEY` starts with `sk-ant-` (not the example text)

**Login fails**
→ Make sure you're on the correct role tab (Employee / Admin / Owner)

---

## PRODUCTION DEPLOYMENT

**Recommended: Railway.app (easiest)**
1. Push to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Add all `.env` variables in Railway's environment settings
4. Deploy — Railway gives you a live URL

**Other options:** Render.com, Heroku, DigitalOcean App Platform
