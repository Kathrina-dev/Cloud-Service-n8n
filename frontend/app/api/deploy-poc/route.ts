import { EC2Client, RunInstancesCommand, DescribeImagesCommand } from "@aws-sdk/client-ec2";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const region = process.env.AWS_REGION || "us-east-1";
    const ec2Client = new EC2Client({ region });
    const stsClient = new STSClient({ region });
    const s3Client = new S3Client({ region });

    const repoName = process.env.AWS_ECR_REPO_NAME;
    if (!repoName) {
      return NextResponse.json(
        { error: "AWS_ECR_REPO_NAME environment variable is not set." },
        { status: 400 }
      );
    }

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

    // Get the AWS Account ID dynamically for the ECR URI
    const identityResponse = await stsClient.send(new GetCallerIdentityCommand({}));
    const accountId = identityResponse.Account;
    const ecrUri = `${accountId}.dkr.ecr.${region}.amazonaws.com`;
    const imageTag = `${ecrUri}/${repoName}:latest`;

    // Fetch RDS config
    const rdsDbName = process.env.AWS_RDS_DB_NAME || "n8n";
    const rdsUsername = process.env.AWS_RDS_USERNAME || "postgres";
    const rdsPassword = process.env.AWS_RDS_PASSWORD || "";
    const rdsHost = process.env.AWS_RDS_HOST || "";

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

# Login to ECR and pull the image
aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${ecrUri}

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
      message: "EC2 instance deployed successfully. It will boot and pull the ECR image shortly.",
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


