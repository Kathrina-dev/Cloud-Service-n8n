import { NextResponse } from 'next/server';
import { 
  CloudWatchClient, 
  PutDashboardCommand,
  PutMetricAlarmCommand
} from '@aws-sdk/client-cloudwatch';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ec2InstanceId, rdsIdentifier, loadBalancerFullName } = body;

    // Validate inputs
    if (!ec2InstanceId || !rdsIdentifier || !loadBalancerFullName) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: ec2InstanceId, rdsIdentifier, loadBalancerFullName' },
        { status: 400 }
      );
    }

    const region = process.env.AWS_REGION || 'us-east-1';
    const cwClient = new CloudWatchClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
        sessionToken: process.env.AWS_SESSION_TOKEN as string,
      },
    });

    const dashboardName = 'n8n-Production-Monitoring';

    // 1. Create the CloudWatch Dashboard
    const dashboardBody = {
      widgets: [
        {
          type: "metric",
          x: 0,
          y: 0,
          width: 8,
          height: 6,
          properties: {
            metrics: [
              [ "AWS/EC2", "CPUUtilization", "InstanceId", ec2InstanceId ]
            ],
            view: "timeSeries",
            stacked: false,
            region: region,
            title: "EC2 CPU Utilization"
          }
        },
        {
          type: "metric",
          x: 8,
          y: 0,
          width: 8,
          height: 6,
          properties: {
            metrics: [
              [ "AWS/EC2", "NetworkIn", "InstanceId", ec2InstanceId ],
              [ ".", "NetworkOut", ".", "." ]
            ],
            view: "timeSeries",
            stacked: false,
            region: region,
            title: "EC2 Network In/Out"
          }
        },
        {
          type: "metric",
          x: 16,
          y: 0,
          width: 8,
          height: 6,
          properties: {
            metrics: [
              [ "AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", rdsIdentifier ]
            ],
            view: "timeSeries",
            stacked: false,
            region: region,
            title: "RDS CPU Utilization"
          }
        },
        {
          type: "metric",
          x: 0,
          y: 6,
          width: 8,
          height: 6,
          properties: {
            metrics: [
              [ "AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", rdsIdentifier ]
            ],
            view: "timeSeries",
            stacked: false,
            region: region,
            title: "RDS Free Storage Space"
          }
        },
        {
          type: "metric",
          x: 8,
          y: 6,
          width: 8,
          height: 6,
          properties: {
            metrics: [
              [ "AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", rdsIdentifier ]
            ],
            view: "timeSeries",
            stacked: false,
            region: region,
            title: "RDS Database Connections"
          }
        },
        {
          type: "metric",
          x: 16,
          y: 6,
          width: 8,
          height: 6,
          properties: {
            metrics: [
              [ "AWS/ApplicationELB", "RequestCount", "LoadBalancer", loadBalancerFullName ],
              [ ".", "HTTPCode_ELB_5XX_Count", ".", "." ]
            ],
            view: "timeSeries",
            stacked: false,
            region: region,
            title: "ALB Requests & 5XX Errors"
          }
        },
        {
          type: "metric",
          x: 0,
          y: 12,
          width: 12,
          height: 6,
          properties: {
            metrics: [
              [ "AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", loadBalancerFullName ]
            ],
            view: "timeSeries",
            stacked: false,
            region: region,
            title: "ALB Target Response Time"
          }
        }
      ]
    };

    console.log(`Putting CloudWatch Dashboard: ${dashboardName}`);
    await cwClient.send(new PutDashboardCommand({
      DashboardName: dashboardName,
      DashboardBody: JSON.stringify(dashboardBody)
    }));

    // 2. Create CloudWatch Alarms
    
    // Alarm: EC2 CPU > 85%
    console.log('Putting EC2 CPU Alarm');
    await cwClient.send(new PutMetricAlarmCommand({
      AlarmName: 'n8n-EC2-High-CPU',
      MetricName: 'CPUUtilization',
      Namespace: 'AWS/EC2',
      Statistic: 'Average',
      Dimensions: [{ Name: 'InstanceId', Value: ec2InstanceId }],
      Period: 300, // 5 minutes
      EvaluationPeriods: 1,
      Threshold: 85,
      ComparisonOperator: 'GreaterThanThreshold',
      AlarmDescription: 'EC2 CPU Utilization exceeds 85% for 5 minutes'
    }));

    // Alarm: RDS Free Storage < 5GB
    console.log('Putting RDS Storage Alarm');
    await cwClient.send(new PutMetricAlarmCommand({
      AlarmName: 'n8n-RDS-Low-Storage',
      MetricName: 'FreeStorageSpace',
      Namespace: 'AWS/RDS',
      Statistic: 'Average',
      Dimensions: [{ Name: 'DBInstanceIdentifier', Value: rdsIdentifier }],
      Period: 300, // 5 minutes
      EvaluationPeriods: 1,
      Threshold: 5 * 1024 * 1024 * 1024, // 5GB in bytes
      ComparisonOperator: 'LessThanThreshold',
      AlarmDescription: 'RDS Free Storage Space is below 5GB'
    }));

    // Alarm: ALB 5XX Errors > 10
    console.log('Putting ALB 5XX Alarm');
    await cwClient.send(new PutMetricAlarmCommand({
      AlarmName: 'n8n-ALB-High-5XX-Errors',
      MetricName: 'HTTPCode_ELB_5XX_Count',
      Namespace: 'AWS/ApplicationELB',
      Statistic: 'Sum',
      Dimensions: [{ Name: 'LoadBalancer', Value: loadBalancerFullName }],
      Period: 300, // 5 minutes
      EvaluationPeriods: 1,
      Threshold: 10,
      ComparisonOperator: 'GreaterThanThreshold',
      AlarmDescription: 'ALB HTTP 5XX Error count exceeds 10 in 5 minutes'
    }));

    return NextResponse.json({ 
      success: true, 
      message: 'CloudWatch Dashboard and Alarms created successfully.' 
    });

  } catch (error: any) {
    console.error('Error setting up CloudWatch:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to setup CloudWatch monitoring' },
      { status: 500 }
    );
  }
}
