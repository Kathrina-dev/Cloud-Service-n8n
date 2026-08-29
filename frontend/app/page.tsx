"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [deployingRDS, setDeployingRDS] = useState(false);

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

  const handlePushECR = async () => {
    setPushing(true);
    try {
      const response = await fetch("/api/push-ecr", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to push image to ECR");
      }

      alert(`Image pushed successfully! Tag: ${data.imageTag}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      alert(`Push failed: ${errorMessage}`);
    } finally {
      setPushing(false);
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <button
        onClick={handleDeploy}
        disabled={loading || pushing || deployingRDS}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Deploying..." : "Deploy EC2"}
      </button>

      <button
        onClick={handlePushECR}
        disabled={loading || pushing || deployingRDS}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pushing ? "Pushing to ECR..." : "Push to ECR"}
      </button>
      
      <button
        onClick={handleDeployRDS}
        disabled={loading || pushing || deployingRDS}
        className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {deployingRDS ? "Deploying RDS..." : "Deploy RDS"}
      </button>
    </div>
  );
}

