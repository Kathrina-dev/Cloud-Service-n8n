import { EC2Client, RunInstancesCommand, DescribeImagesCommand } from "@aws-sdk/client-ec2";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const region = process.env.AWS_REGION || "us-east-1";
    const ec2Client = new EC2Client({ region });

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

    const command = new RunInstancesCommand({
      ImageId: imageId,
      InstanceType: "t2.micro",
      MinCount: 1,
      MaxCount: 1,
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
      message: "EC2 instance deployed successfully",
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


