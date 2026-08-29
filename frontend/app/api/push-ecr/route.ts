import { ECRClient, GetAuthorizationTokenCommand, DescribeRepositoriesCommand, CreateRepositoryCommand } from "@aws-sdk/client-ecr";
import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export async function POST() {
  try {
    const region = process.env.AWS_REGION || "us-east-1";
    const repoName = process.env.AWS_ECR_REPO_NAME;

    if (!repoName) {
      return NextResponse.json(
        { error: "AWS_ECR_REPO_NAME environment variable is not set." },
        { status: 400 }
      );
    }

    const ecrClient = new ECRClient({ region });

    // Ensure the repository exists, create it if it doesn't
    try {
      await ecrClient.send(new DescribeRepositoriesCommand({ repositoryNames: [repoName] }));
    } catch (error: any) {
      if (error.name === "RepositoryNotFoundException") {
        console.log(`Repository ${repoName} not found. Creating it...`);
        await ecrClient.send(new CreateRepositoryCommand({ repositoryName: repoName }));
      } else {
        throw error;
      }
    }

    const authCommand = new GetAuthorizationTokenCommand({});
    const authResponse = await ecrClient.send(authCommand);

    if (!authResponse.authorizationData || authResponse.authorizationData.length === 0) {
      throw new Error("Failed to get ECR authorization token.");
    }

    const authToken = Buffer.from(
      authResponse.authorizationData[0].authorizationToken || "",
      "base64"
    ).toString();
    const [user, password] = authToken.split(":");
    const proxyEndpoint = authResponse.authorizationData[0].proxyEndpoint;

    if (!proxyEndpoint) {
      throw new Error("No proxy endpoint returned from ECR.");
    }

    // Authenticate Docker
    await execAsync(`docker login -u ${user} -p ${password} ${proxyEndpoint}`, { windowsHide: true });

    // Build the Docker image
    const dockerDirPath = path.join(process.cwd(), "..", "docker");
    const imageTag = `${proxyEndpoint.replace('https://', '')}/${repoName}:latest`;

    await execAsync(`docker build -t ${imageTag} "${dockerDirPath}"`, { windowsHide: true });

    // Push the Docker image
    await execAsync(`docker push ${imageTag}`, { windowsHide: true });

    return NextResponse.json({
      message: "Successfully built and pushed image to ECR",
      imageTag,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred while pushing to ECR.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
