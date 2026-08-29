import { EC2Client, RunInstancesCommand, DescribeImagesCommand } from "@aws-sdk/client-ec2";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const region = process.env.AWS_REGION || "us-east-1";
    const ec2Client = new EC2Client({ region });
    const s3Client = new S3Client({ region });
    const secretsClient = new SecretsManagerClient({ region });

    let imageId = process.env.AWS_AMI_ID;

    // Fall back to dynamic AMI lookup if process.env.AWS_AMI_ID is not provided or invalid
    if (!imageId) {
      const describeImagesCmd = new DescribeImagesCommand({
        ExecutableUsers: ["all"],
        Filters: [
          { Name: "name", Values: ["al2023-ami-2023.*-x86_64"] },
          { Name: "state", Values: ["available"] },
          { Name: "architecture", Values: ["x86_64"] },
        ],
      });
      const imagesResult = await ec2Client.send(describeImagesCmd);
      const sortedImages = (imagesResult.Images || []).sort((a, b) =>
        (b.CreationDate || "").localeCompare(a.CreationDate || "")
      );
      imageId = sortedImages[0]?.ImageId;
    }

    if (!imageId) {
      return NextResponse.json(
        { error: `Could not resolve a valid AMI ID for region ${region}. Please specify AWS_AMI_ID.` },
        { status: 500 }
      );
    }

    const imageTag = "n8nio/n8n:latest";

    // Fetch RDS config from Secrets Manager
    const secretName = process.env.AWS_SECRET_NAME || "n8n/prod/db-credentials";
    let rdsDbName = "";
    let rdsUsername = "";
    let rdsPassword = "";
    let rdsHost = "";

    try {
      console.log(`Fetching database credentials from Secrets Manager: ${secretName}`);
      const secretCommand = new GetSecretValueCommand({ SecretId: secretName });
      const secretResponse = await secretsClient.send(secretCommand);
      
      if (secretResponse.SecretString) {
        const secretPayload = JSON.parse(secretResponse.SecretString);
        rdsDbName = secretPayload.dbname || "";
        rdsUsername = secretPayload.username || "";
        rdsPassword = secretPayload.password || "";
        rdsHost = secretPayload.host || "";
      }
    } catch (secretError) {
      console.error("Failed to fetch database credentials from Secrets Manager. Falling back to local .env (Not recommended for production)", secretError);
      // Fallback to .env in case the secret hasn't been created yet or fails
      rdsDbName = process.env.AWS_RDS_DB_NAME || "n8n";
      rdsUsername = process.env.AWS_RDS_USERNAME || "postgres";
      rdsPassword = process.env.AWS_RDS_PASSWORD || "";
      rdsHost = process.env.AWS_RDS_HOST || "";
    }

    if (!rdsPassword || !rdsHost) {
      return NextResponse.json(
        { error: "Missing database credentials. Please run 'Store Secrets' first or ensure local .env is populated." },
        { status: 500 }
      );
    }

    // Dynamically find the S3 backup bucket
    let s3BucketName = "";
    try {
      const s3Prefix = process.env.S3_BUCKET_PREFIX || "n8n-backups-";
      const { Buckets } = await s3Client.send(new ListBucketsCommand({}));
      if (Buckets && Buckets.length > 0) {
        // Find buckets matching the prefix, sort by creation date (newest first)
        const matchedBuckets = Buckets.filter(b => b.Name?.startsWith(s3Prefix))
          .sort((a, b) => (b.CreationDate?.getTime() || 0) - (a.CreationDate?.getTime() || 0));
        
        if (matchedBuckets.length > 0) {
          s3BucketName = matchedBuckets[0].Name || "";
          console.log(`Found S3 bucket for n8n: ${s3BucketName}`);
        }
      }
    } catch (s3Error) {
      console.warn("Could not list S3 buckets. n8n will start without S3 backup integration.", s3Error);
    }

    // Create the bash script to run on instance startup
    const userData = `#!/bin/bash
yum update -y
yum install -y docker
systemctl start docker
systemctl enable docker

# Pull the official n8n image directly from Docker Hub
docker pull n8nio/n8n:latest

# Run the n8n container with postgres database variables mapped to port 80
docker run -d -p 80:5678 \\
  -e DB_TYPE=postgresdb \\
  -e DB_POSTGRESDB_DATABASE="${rdsDbName}" \\
  -e DB_POSTGRESDB_HOST="${rdsHost}" \\
  -e DB_POSTGRESDB_PORT=5432 \\
  -e DB_POSTGRESDB_USER="${rdsUsername}" \\
  -e DB_POSTGRESDB_PASSWORD="${rdsPassword}" \\
  ${s3BucketName ? `-e N8N_BACKUP_S3_BUCKET="${s3BucketName}" -e AWS_REGION="${region}" \\` : ''}
  ${imageTag}
`;
    const encodedUserData = Buffer.from(userData).toString("base64");

    const command = new RunInstancesCommand({
      ImageId: imageId,
      InstanceType: "t2.micro",
      MinCount: 1,
      MaxCount: 1,
      UserData: encodedUserData,
      IamInstanceProfile: {
        Name: "LabInstanceProfile" // Required for the instance to run `aws ecr` commands
      },
      // Give it a public IP to easily view the web server
      NetworkInterfaces: [
        {
          DeviceIndex: 0,
          AssociatePublicIpAddress: true,
          // Note: Needs a default subnet if omitted, or a specific subnet ID if strictly controlled
        }
      ]
    });

    const response = await ec2Client.send(command);
    const instanceId = response.Instances?.[0]?.InstanceId;

    if (!instanceId) {
      return NextResponse.json(
        { error: "Instance launched but no Instance ID was returned by AWS." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "EC2 instance deployed successfully. It will boot and pull the n8n image shortly.",
      instanceId,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred while launching EC2 instance.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}


