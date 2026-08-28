"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);

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

  return (
    <button
      onClick={handleDeploy}
      disabled={loading}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Deploying..." : "Click me"}
    </button>
  );
}

