import { NextResponse } from 'next/server';
import {
  ElasticLoadBalancingV2Client,
  CreateLoadBalancerCommand,
  CreateTargetGroupCommand,
  CreateListenerCommand
} from '@aws-sdk/client-elastic-load-balancing-v2';
import { randomBytes } from 'crypto';

export async function POST(request: Request) {
  try {
    const region = process.env.AWS_REGION || 'us-east-1';
    const albClient = new ElasticLoadBalancingV2Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
        sessionToken: process.env.AWS_SESSION_TOKEN as string,
      },
    });

    const body = await request.json();
    const { subnetIds, securityGroupId, vpcId } = body;

    if (!subnetIds || !Array.isArray(subnetIds) || subnetIds.length === 0) {
      return NextResponse.json({ success: false, error: 'subnetIds (array) is required' }, { status: 400 });
    }
    if (!securityGroupId) {
      return NextResponse.json({ success: false, error: 'securityGroupId is required' }, { status: 400 });
    }
    if (!vpcId) {
      return NextResponse.json({ success: false, error: 'vpcId is required' }, { status: 400 });
    }

    // Generate a unique name for the ALB
    const randomSuffix = randomBytes(4).toString('hex');
    const albName = `n8n-alb-${randomSuffix}`;

    console.log(`Creating Application Load Balancer: ${albName}`);

    // 1. Create the Load Balancer
    const createAlbCommand = new CreateLoadBalancerCommand({
      Name: albName,
      Subnets: subnetIds,
      SecurityGroups: [securityGroupId],
      Scheme: 'internet-facing',
      Type: 'application',
      IpAddressType: 'ipv4',
    });

    const albResponse = await albClient.send(createAlbCommand);
    const loadBalancer = albResponse.LoadBalancers?.[0];

    if (!loadBalancer || !loadBalancer.LoadBalancerArn) {
      throw new Error('Failed to create Load Balancer');
    }

    const loadBalancerArn = loadBalancer.LoadBalancerArn;
    const dnsName = loadBalancer.DNSName;

    // 2. Create Target Group
    const tgName = `n8n-tg-${randomSuffix}`;
    const createTgCommand = new CreateTargetGroupCommand({
      Name: tgName,
      Protocol: 'HTTP',
      Port: 5678, // Port for n8n
      VpcId: vpcId,
      TargetType: 'instance',
      HealthCheckProtocol: 'HTTP',
      HealthCheckPort: 'traffic-port',
      HealthCheckPath: '/',
      HealthCheckIntervalSeconds: 30,
      HealthCheckTimeoutSeconds: 5,
      HealthyThresholdCount: 5,
      UnhealthyThresholdCount: 2,
    });

    const tgResponse = await albClient.send(createTgCommand);
    const targetGroup = tgResponse.TargetGroups?.[0];

    if (!targetGroup || !targetGroup.TargetGroupArn) {
      throw new Error('Failed to create Target Group');
    }

    const targetGroupArn = targetGroup.TargetGroupArn;

    // 3. Create Listener
    const createListenerCommand = new CreateListenerCommand({
      LoadBalancerArn: loadBalancerArn,
      Protocol: 'HTTP',
      Port: 80,
      DefaultActions: [
        {
          Type: 'forward',
          TargetGroupArn: targetGroupArn,
        },
      ],
    });

    await albClient.send(createListenerCommand);

    return NextResponse.json({
      success: true,
      loadBalancerArn,
      dnsName,
      targetGroupArn,
    });

  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error creating Application Load Balancer:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to provision Application Load Balancer' },
      { status: 500 }
    );
  }
}
