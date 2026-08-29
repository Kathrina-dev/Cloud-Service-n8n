import { EC2Client, DescribeInstancesCommand, GetConsoleOutputCommand } from "@aws-sdk/client-ec2";

const region = process.env.AWS_REGION || 'us-east-1';
const client = new EC2Client({ region });

async function debug() {
  console.log("Fetching instances...");
  const data = await client.send(new DescribeInstancesCommand({}));
  let instances = [];
  data.Reservations.forEach(r => instances.push(...r.Instances));
  
  // Sort by launch time descending
  instances.sort((a, b) => new Date(b.LaunchTime) - new Date(a.LaunchTime));
  
  if (instances.length === 0) {
    console.log("No instances found.");
    return;
  }
  
  const latest = instances[0];
  console.log(`Latest Instance ID: ${latest.InstanceId}`);
  console.log(`State: ${latest.State.Name}`);
  console.log(`IAM Profile: ${latest.IamInstanceProfile ? latest.IamInstanceProfile.Arn : 'None'}`);
  console.log(`Public IP: ${latest.PublicIpAddress}`);
  
  try {
    const consoleOutput = await client.send(new GetConsoleOutputCommand({ InstanceId: latest.InstanceId }));
    if (consoleOutput.Output) {
      const decoded = Buffer.from(consoleOutput.Output, 'base64').toString('ascii');
      console.log("--- CONSOLE OUTPUT END ---");
      // print last 100 lines
      const lines = decoded.split('\n');
      console.log(lines.slice(Math.max(lines.length - 100, 0)).join('\n'));
    } else {
      console.log("No console output available yet (it can take a few minutes after boot).");
    }
  } catch (err) {
    console.error("Failed to get console output:", err.message);
  }
}

debug();
