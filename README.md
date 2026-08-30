# 🏗️ AI Cloud Architect Canvas 

> **A Next.js application that lets you design AWS cloud architectures visually using a drag-and-drop canvas (or AI text prompts) and deploy them directly to your live AWS account in one click.**

Built with ❤️ for **BuildSprint**.

---

## ✨ Features

- **🎨 Visual Drag-and-Drop Canvas**: Easily drag AWS services (VPC, EC2, ALB, RDS, S3, etc.) onto the canvas. Group your resources dynamically by dragging EC2 instances inside a VPC's Public or Private Subnets!
- **🤖 Text-to-Graph AI (Powered by Gemini 3.6 Flash)**: Don't want to drag nodes? Just type *"Add an EC2 instance connected to an RDS database"* and our AI will automatically parse your prompt, generate the components, and snap them perfectly onto your canvas.
- **🚀 One-Click AWS Orchestrator**: Once you are happy with your architecture, click **Deploy**. The backend orchestrator reads the canvas topology and asynchronously provisions real infrastructure into your AWS account using the AWS SDK!
  - Creates VPCs, Public/Private Subnets, Internet Gateways, and Route Tables.
  - Launches EC2 instances.
  - Provisions RDS PostgreSQL Databases and highly-secure S3 buckets.

## 🛠️ Tech Stack

- **Frontend Framework**: [Next.js](https://nextjs.org/) (App Router, React 18)
- **Styling**: Tailwind CSS & Glassmorphism UI
- **Canvas Engine**: [React Flow (@xyflow/react)](https://reactflow.dev/)
- **AI Integration**: Google Gemini (`gemini-3.6-flash` via `@google/genai`)
- **Cloud Provider SDK**: AWS SDK v3 for JavaScript/TypeScript

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Kathrina-dev/Cloud-Service-n8n.git
cd Cloud-Service-n8n/frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the `frontend` directory and configure the following keys:

```ini
# AWS Credentials (Ensure your IAM user has permissions for VPC, EC2, RDS, and S3)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_SESSION_TOKEN=your_session_token # (Optional: Only if using AWS Learner Labs)
AWS_REGION=us-east-1

# RDS Database Setup
AWS_RDS_DB_NAME=n8ndb
AWS_RDS_USERNAME=postgres
AWS_RDS_PASSWORD=your_secure_password

# AI Integration
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start architecting!

---

## 🏗️ How the Orchestrator Works

When you click **Deploy**, the React application maps your 2D canvas nodes into an infrastructure graph. 

1. **VPC Layer**: If a VPC node is present, it provisions an AWS VPC with public and private subnets.
2. **Compute Layer**: Scans the private subnet area and provisions EC2 instances (`t2.micro`).
3. **Database & Storage Layer**: Identifies RDS and S3 nodes and triggers asynchronous provisioning of `db.t3.micro` Postgres instances and strictly private S3 buckets.

*All status updates stream directly back to the UI in real-time, giving you complete visibility into the infrastructure-as-code deployment!*
