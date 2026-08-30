# Cloud-n8n-Service

> Automated, versioned deployment of n8n-like workflows from local development to AWS production.

## 1. Problem Statement

Deploying n8n workflows from development to production reliably requires more than exporting a workflow JSON file.

A production deployment needs:

- Infrastructure provisioning
- Container deployment
- Database configuration
- Secret management
- IAM permissions
- Workflow versioning
- Health verification
- Rollback support

Manually configuring these components is error-prone, difficult to reproduce, and slow to maintain.

Cloud-n8n-Service provides a controlled development-to-production pipeline that automates this process.

---

## 2. Solution

Cloud-n8n-Service allows developers to:

1. Build and test an n8n workflow locally.
2. Export and version the workflow using Git.
3. Generate production infrastructure configuration using LatentCode.
4. Deploy the generated infrastructure to AWS.
5. Deploy and activate the workflow in a production n8n instance.
6. Verify the deployment through health checks.
7. Monitor the deployment using CloudWatch.
8. Roll back to a previous Git-committed workflow version if required.

### Core Flow

```text
Local Development
       │
       │ n8n Workflow
       ▼
Docker Compose
(n8n + PostgreSQL)
       │
       │ Export + Commit
       ▼
      Git
       │
       │ Promote to Production
       ▼
   FastAPI
 Control Plane
       │
       ├──────────────► LatentCode
       │                 │
       │                 ▼
       │              IaC Generation
       │
       └──────────────► AWS Deployment
                         │
                         ▼
                  AWS Production
                  ┌──────────────┐
                  │     ECS      │
                  │     n8n      │
                  ├──────────────┤
                  │ RDS PostgreSQL│
                  │ ECR          │
                  │ Secrets Mgr  │
                  │ IAM          │
                  │ CloudWatch   │
                  └──────────────┘
```

## 3. Development vs Production

Cloud-n8n-Service intentionally uses different infrastructure for development and production to maximize local speed and cloud resilience.

| Environment | Infrastructure | Purpose |
| --- | --- | --- |
| **Development** | Docker Compose (`n8n` + `PostgreSQL`) | Build and test workflows locally |
| **Production** | AWS (`ECS` + `RDS` + `ECR` + `Secrets Manager` + `IAM` + `CloudWatch`) | Run validated workflows in the cloud |

### Development

Development runs entirely on the developer's machine via Docker Compose. This keeps development fast and avoids unnecessary AWS infrastructure and costs during workflow creation and testing.

### Production

The production environment is created, provisioned, and managed entirely through the Cloud-n8n-Service deployment pipeline on AWS.

## 4. Promotion Workflow

1. Build workflow locally
2. Test workflow
3. Export workflow JSON
4. Commit version to Git
5. Click "Promote to Production"
6. FastAPI receives promotion request
7. LatentCode generates IaC
8. Cloud-n8n-Service applies IaC
9. AWS ECS deployment starts
10. Production n8n imports workflow
11. Workflow is activated
12. Health check runs
13. CloudWatch monitoring
14. Deployment marked successful

## 5. Rollback

Every workflow version is stored in Git. If a production deployment fails, Cloud-n8n-Service can cleanly redeploy a previously committed version without manually reconstructing the production environment.

## 6. System Architecture

**Frontend (Next.js)**

* Workflow deployment dashboard
* Production status & Health
* Version selection & Rollback

**Backend (Python + FastAPI)**

* Deployment orchestration & AWS integration (Boto3/Terraform)
* LatentCode integration
* n8n API integration

## 7. Local Development Prerequisites

* Docker & Docker Compose
* Python 3.11+
* Node.js 20+
* Git
* AWS CLI & Terraform
* AWS account

Start n8n locally:

```bash
docker compose -f docker/docker-compose.yml up -d
```
