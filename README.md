SmartShift SaaS
SmartShift is a high-performance employee scheduling and energy automation platform designed with a "Dark Luxury" aesthetic. It utilizes a robust, multi-tenant architecture to support unlimited organizations and users securely.

🚀 Tech Stack
Frontend: Vanilla JavaScript, CSS (Dark Luxury theme), and HTML5.

Backend: Supabase (PostgreSQL Database, Auth, Realtime).

Payments: Stripe (Billing Portal integration).

Versioning: Git & GitHub.

📂 Project Structure
Plaintext
smartshift-app/
├── .vscode/            # Editor settings and workspace configuration
├── src/                # Source code
│   ├── index.html      # Main application structure
│   ├── style.css       # Dark Luxury design system
│   └── script.js       # Supabase logic and app functionality
├── .gitignore          # Security: Excludes sensitive env files
└── README.md           # Project documentation
🛠 Setup & Installation
Clone the repository:

Bash
git clone https://github.com/your-username/smartshift.git
cd smartshift-app
Initialize Supabase:

Create a new project in Supabase.

Run the schema setup scripts found in the docs/ folder (or your SQL Editor).

Configure your script.js with your specific SUPABASE_URL and ANON_KEY.

Environment Security:

Never commit your API keys. Use a local .env file (which is ignored by Git) to store your sensitive credentials during development.

🔒 Security Features
This project implements Row Level Security (RLS). Every query is filtered by organization_id, ensuring that company data remains strictly siloed and inaccessible to other tenants.

💳 Payment Integration
Payments are handled via the Stripe Customer Portal. This approach offloads PCI compliance and subscription management to Stripe, allowing you to focus on the scheduling features of the application.# Smart-Shift-Scheduling