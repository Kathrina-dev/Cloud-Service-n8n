import {
  EC2Client,
  CreateVpcCommand,
  CreateSubnetCommand,
  CreateInternetGatewayCommand,
  AttachInternetGatewayCommand,
  AllocateAddressCommand,
  CreateNatGatewayCommand,
  DescribeNatGatewaysCommand,
  CreateRouteTableCommand,
  CreateRouteCommand,
  AssociateRouteTableCommand,
  CreateTagsCommand,
  ModifyVpcAttributeCommand
} from "@aws-sdk/client-ec2";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const region = process.env.AWS_REGION || "us-east-1";
    const ec2Client = new EC2Client({ region });

    const vpcCidr = "10.0.0.0/16";
    const azA = `${region}a`;
    const azB = `${region}b`;

    const vpcResponse = await ec2Client.send(new CreateVpcCommand({ CidrBlock: vpcCidr }));
    const vpcId = vpcResponse.Vpc?.VpcId;
    if (!vpcId) throw new Error("VPC creation failed.");

    await ec2Client.send(new ModifyVpcAttributeCommand({ VpcId: vpcId, EnableDnsHostnames: { Value: true } }));
    await ec2Client.send(new ModifyVpcAttributeCommand({ VpcId: vpcId, EnableDnsSupport: { Value: true } }));
    await ec2Client.send(new CreateTagsCommand({ Resources: [vpcId], Tags: [{ Key: "Name", Value: "CompanyX-VPC" }] }));

    // Public Subnets
    const pub1 = await ec2Client.send(new CreateSubnetCommand({ VpcId: vpcId, CidrBlock: "10.0.1.0/24", AvailabilityZone: azA }));
    const pub2 = await ec2Client.send(new CreateSubnetCommand({ VpcId: vpcId, CidrBlock: "10.0.2.0/24", AvailabilityZone: azB }));
    // Private Subnets
    const priv1 = await ec2Client.send(new CreateSubnetCommand({ VpcId: vpcId, CidrBlock: "10.0.11.0/24", AvailabilityZone: azA }));
    const priv2 = await ec2Client.send(new CreateSubnetCommand({ VpcId: vpcId, CidrBlock: "10.0.12.0/24", AvailabilityZone: azB }));

    const pub1Id = pub1.Subnet?.SubnetId!;
    const pub2Id = pub2.Subnet?.SubnetId!;
    const priv1Id = priv1.Subnet?.SubnetId!;
    const priv2Id = priv2.Subnet?.SubnetId!;

    await ec2Client.send(new CreateTagsCommand({
      Resources: [pub1Id, pub2Id, priv1Id, priv2Id],
      Tags: [
        { Key: "Name", Value: "Public-Subnet-A" },
        { Key: "Name", Value: "Public-Subnet-B" },
        { Key: "Name", Value: "Private-Subnet-A" },
        { Key: "Name", Value: "Private-Subnet-B" }
      ]
    }));

    const igwResponse = await ec2Client.send(new CreateInternetGatewayCommand({}));
    const igwId = igwResponse.InternetGateway?.InternetGatewayId!;
    await ec2Client.send(new AttachInternetGatewayCommand({ InternetGatewayId: igwId, VpcId: vpcId }));

    const pubRouteTable = await ec2Client.send(new CreateRouteTableCommand({ VpcId: vpcId }));
    const pubRouteTableId = pubRouteTable.RouteTable?.RouteTableId!;
    
    await ec2Client.send(new CreateRouteCommand({ RouteTableId: pubRouteTableId, DestinationCidrBlock: "0.0.0.0/0", GatewayId: igwId }));
    await ec2Client.send(new AssociateRouteTableCommand({ SubnetId: pub1Id, RouteTableId: pubRouteTableId }));
    await ec2Client.send(new AssociateRouteTableCommand({ SubnetId: pub2Id, RouteTableId: pubRouteTableId }));

    const eipResponse = await ec2Client.send(new AllocateAddressCommand({ Domain: "vpc" }));
    const allocationId = eipResponse.AllocationId!;
    
    const natResponse = await ec2Client.send(new CreateNatGatewayCommand({ AllocationId: allocationId, SubnetId: pub1Id }));
    const natGatewayId = natResponse.NatGateway?.NatGatewayId!;

    // Wait for the NAT Gateway to be available (max 5 minutes)
    let natGatewayAvailable = false;
    for (let i = 0; i < 60; i++) {
      const describeNat = await ec2Client.send(new DescribeNatGatewaysCommand({
        NatGatewayIds: [natGatewayId],
      }));
      const state = describeNat.NatGateways?.[0]?.State;
      if (state === "available") {
        natGatewayAvailable = true;
        break;
      }
      if (state === "failed") {
        throw new Error("NAT Gateway creation failed on AWS side.");
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    if (!natGatewayAvailable) {
      throw new Error("Timeout waiting for NAT Gateway to become available.");
    }

    const privRouteTable = await ec2Client.send(new CreateRouteTableCommand({ VpcId: vpcId }));
    const privRouteTableId = privRouteTable.RouteTable?.RouteTableId!;

    await ec2Client.send(new CreateRouteCommand({ RouteTableId: privRouteTableId, DestinationCidrBlock: "0.0.0.0/0", NatGatewayId: natGatewayId }));
    await ec2Client.send(new AssociateRouteTableCommand({ SubnetId: priv1Id, RouteTableId: privRouteTableId }));
    await ec2Client.send(new AssociateRouteTableCommand({ SubnetId: priv2Id, RouteTableId: privRouteTableId }));

    return NextResponse.json({
      message: "Complete production-ready multi-AZ VPC environment created successfully.",
      vpcId,
      publicSubnets: [pub1Id, pub2Id],
      privateSubnets: [priv1Id, priv2Id],
      natGatewayId,
      internetGatewayId: igwId
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected failure occurred during VPC creation execution.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
