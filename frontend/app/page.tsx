"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [deployingRDS, setDeployingRDS] = useState(false);
  const [setupS3, setSetupS3] = useState(false);
  const [setupSecrets, setSetupSecrets] = useState(false);

  const handleDeploy = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/deploy-poc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to deploy instance");
      }

      alert(`EC2 Instance deployed successfully! Instance ID: ${data.instanceId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      alert(`Deployment failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeployRDS = async () => {
    setDeployingRDS(true);
    try {
      const response = await fetch("/api/deploy-rds", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to deploy RDS instance");
      }

      alert(`RDS instance is being provisioned! DB Identifier: ${data.dbInstanceIdentifier}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      alert(`RDS Deployment failed: ${errorMessage}`);
    } finally {
      setDeployingRDS(false);
    }
  };

  const handleSetupS3 = async () => {
    setSetupS3(true);
    try {
      const response = await fetch("/api/setup-s3", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create S3 bucket");
      }

      alert(`S3 bucket created successfully! Bucket Name: ${data.bucketName}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      alert(`S3 Setup failed: ${errorMessage}`);
    } finally {
      setSetupS3(false);
    }
  };

  const handleSetupSecrets = async () => {
    setSetupSecrets(true);
    try {
      const response = await fetch("/api/setup-secrets", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to manage secrets");
      }

      alert(`Secrets stored successfully! Secret Name: ${data.secretName}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      alert(`Secrets Setup failed: ${errorMessage}`);
    } finally {
      setSetupSecrets(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <button
        onClick={handleDeploy}
        disabled={loading || deployingRDS || setupS3 || setupSecrets}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Deploying..." : "Deploy EC2"}
      </button>
      
      <button
        onClick={handleDeployRDS}
        disabled={loading || deployingRDS || setupS3 || setupSecrets}
        className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {deployingRDS ? "Deploying RDS..." : "Deploy RDS"}
      </button>

      <button
        onClick={handleSetupS3}
        disabled={loading || deployingRDS || setupS3 || setupSecrets}
        className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {setupS3 ? "Creating S3 Bucket..." : "Create S3 Bucket"}
      </button>

      <button
        onClick={handleSetupSecrets}
        disabled={loading || deployingRDS || setupS3 || setupSecrets}
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {setupSecrets ? "Storing Secrets..." : "Store Secrets"}
      </button>
    </div>
  );
}

