"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [deployingRDS, setDeployingRDS] = useState(false);
  const [setupS3, setSetupS3] = useState(false);
  const [setupSecrets, setSetupSecrets] = useState(false);
  const [requestingCert, setRequestingCert] = useState(false);
  const [setupCW, setSetupCW] = useState(false);
  
  const [domainName, setDomainName] = useState("");
  const [cwParams, setCwParams] = useState({
    ec2InstanceId: "",
    rdsIdentifier: "",
    loadBalancerFullName: ""
  });

  const [dnsInstructions, setDnsInstructions] = useState<{name: string, type: string, value: string} | null>(null);

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

  const handleRequestCertificate = async () => {
    if (!domainName) {
      alert("Please enter a domain name");
      return;
    }
    
    setRequestingCert(true);
    setDnsInstructions(null);
    try {
      const response = await fetch("/api/request-certificate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domainName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to request certificate");
      }

      if (data.dnsRecord) {
        setDnsInstructions(data.dnsRecord);
      } else {
        alert(data.message);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      alert(`Certificate request failed: ${errorMessage}`);
    } finally {
    setRequestingCert(false);
    }
  };

  const handleSetupCloudWatch = async () => {
    if (!cwParams.ec2InstanceId || !cwParams.rdsIdentifier || !cwParams.loadBalancerFullName) {
      alert("Please enter EC2 Instance ID, RDS Identifier, and ALB Full Name.");
      return;
    }

    setSetupCW(true);
    try {
      const response = await fetch("/api/setup-cloudwatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cwParams),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to setup CloudWatch");
      }

      alert("CloudWatch Dashboard and Alarms created successfully!");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      alert(`CloudWatch Setup failed: ${errorMessage}`);
    } finally {
      setSetupCW(false);
    }
  };

  const isBusy = loading || pushing || deployingRDS || setupS3 || setupSecrets || requestingCert || setupCW;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
      <div className="flex flex-col gap-4 w-full max-w-md border p-6 rounded shadow">
        <h2 className="text-xl font-bold text-center mb-4">Control Panel</h2>
        <button
          onClick={handleDeploy}
          disabled={isBusy}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Deploying..." : "Deploy EC2"}
        </button>
        
        <button
          onClick={handleDeployRDS}
          disabled={isBusy}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deployingRDS ? "Deploying RDS..." : "Deploy RDS"}
        </button>

        <button
          onClick={handleSetupS3}
          disabled={isBusy}
          className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {setupS3 ? "Creating S3 Bucket..." : "Create S3 Bucket"}
        </button>

        <button
          onClick={handleSetupSecrets}
          disabled={isBusy}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {setupSecrets ? "Storing Secrets..." : "Store Secrets"}
        </button>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-md border p-6 rounded shadow mt-4">
        <h2 className="text-xl font-bold text-center mb-4">SSL & Domain</h2>
        <input 
          type="text" 
          placeholder="e.g., n8n.mycompany.com" 
          value={domainName}
          onChange={(e) => setDomainName(e.target.value)}
          disabled={isBusy}
          className="border p-2 rounded text-black bg-white"
        />
        <button
          onClick={handleRequestCertificate}
          disabled={isBusy || !domainName}
          className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {requestingCert ? "Requesting Certificate..." : "Request SSL Certificate"}
        </button>
        
        {dnsInstructions && (
          <div className="mt-4 p-4 bg-gray-100 border border-gray-300 rounded text-sm text-black">
            <h3 className="font-bold mb-2">Action Required: DNS Validation</h3>
            <p className="mb-4">Please add the following CNAME record to your domain&apos;s DNS settings (e.g., in Route53, GoDaddy, Cloudflare) to prove ownership.</p>
            <div className="flex flex-col gap-2 font-mono break-all">
              <div><span className="font-bold">Type:</span> {dnsInstructions.type}</div>
              <div><span className="font-bold">Name:</span> {dnsInstructions.name}</div>
              <div><span className="font-bold">Value:</span> {dnsInstructions.value}</div>
      <div className="flex flex-col gap-4 w-full max-w-md border p-6 rounded shadow mt-4">
        <h2 className="text-xl font-bold text-center mb-4">CloudWatch Monitoring</h2>
        <input 
          type="text" 
          placeholder="EC2 Instance ID (e.g., i-0abcd1234efgh5678)" 
          value={cwParams.ec2InstanceId}
          onChange={(e) => setCwParams({...cwParams, ec2InstanceId: e.target.value})}
          disabled={isBusy}
          className="border p-2 rounded text-black"
        />
        <input 
          type="text" 
          placeholder="RDS DB Identifier (e.g., n8n-db-prod)" 
          value={cwParams.rdsIdentifier}
          onChange={(e) => setCwParams({...cwParams, rdsIdentifier: e.target.value})}
          disabled={isBusy}
          className="border p-2 rounded text-black"
        />
        <input 
          type="text" 
          placeholder="ALB Full Name (e.g., app/my-alb/1234abcd)" 
          value={cwParams.loadBalancerFullName}
          onChange={(e) => setCwParams({...cwParams, loadBalancerFullName: e.target.value})}
          disabled={isBusy}
          className="border p-2 rounded text-black"
        />
        <button
          onClick={handleSetupCloudWatch}
          disabled={isBusy || !cwParams.ec2InstanceId || !cwParams.rdsIdentifier || !cwParams.loadBalancerFullName}
          className="bg-teal-500 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {setupCW ? "Configuring CloudWatch..." : "Setup CloudWatch Monitoring"}
        </button>
      </div>
    </div>
            <p className="mt-4 text-xs italic">Note: AWS will issue the certificate automatically once DNS validation succeeds. This can take up to 30 minutes after adding the record.</p>
          </div>
        )}
      </div>
    </div>
  );
}
