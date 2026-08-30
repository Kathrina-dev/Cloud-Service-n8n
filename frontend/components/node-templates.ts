import { type ExpandableServiceNodeData, type ExpandableServiceNodeSection } from './ui/expandable-service-node';

export type AwsNodeData = {
  label: string;
  color: string;
  icon: string;
  iconSrc: string;
};

export type VpcNodeData = {
  label: string;
  iconSrc: string;
  accentColor: string;
  sections?: ExpandableServiceNodeSection[];
};

export type FlowNodeData = AwsNodeData | ExpandableServiceNodeData | VpcNodeData;

export const ec2Sections: ExpandableServiceNodeSection[] = [
  {
    title: 'Compute',
    items: [
      { label: 'Instance name', value: 'app-server-1' },
      { label: 'Instance type', value: 't3.medium' },
      { label: 'vCPU / RAM', value: '2 / 4 GB' },
    ],
  },
  {
    title: 'Storage',
    items: [
      { label: 'Root volume', value: '30 GiB' },
      { label: 'Volume type', value: 'gp3' },
      { label: 'Encryption', value: 'Enabled' },
    ],
  },
  {
    title: 'Security',
    items: [
      { label: 'Allow SSH', value: 'No' },
      { label: 'Firewall', value: 'Create SG' },
      { label: 'Inbound', value: '80, 443' },
    ],
  },
];

export const rdsSections: ExpandableServiceNodeSection[] = [
  {
    title: 'Database',
    items: [
      { label: 'Engine', value: 'PostgreSQL' },
      { label: 'Version', value: '15.4' },
      { label: 'Size', value: 'db.t3.medium' },
      { label: 'Storage', value: '100 GiB GP3' },
    ],
  },
  {
    title: 'Network',
    items: [
      { label: 'Subnet group', value: 'rds-private-subnet' },
    ],
  },
  {
    title: 'Security',
    items: [
      { label: 'Credentials', value: 'Secrets Manager Ref' },
    ],
  },
];

export const s3Sections: ExpandableServiceNodeSection[] = [
  {
    title: 'Bucket',
    items: [
      { label: 'Bucket name', value: 'my-app-assets-prod' },
      { label: 'Region', value: 'us-east-1' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Encryption', value: 'SSE-S3 (AES-256)' },
      { label: 'Versioning', value: 'Enabled' },
    ],
  },
  {
    title: 'Permissions',
    items: [
      { label: 'Access policy', value: 'Private - Block Public' },
    ],
  },
];

export const secretsSections: ExpandableServiceNodeSection[] = [
  {
    title: 'Secret',
    items: [
      { label: 'Secret name', value: '/prod/app/db-creds' },
    ],
  },
  {
    title: 'Payload',
    items: [
      { label: 'Keys', value: 'username, password, host' },
    ],
  },
  {
    title: 'Rotation',
    items: [
      { label: 'Auto rotation', value: 'Enabled (30 days)' },
    ],
  },
];

export const cloudWatchSections: ExpandableServiceNodeSection[] = [
  {
    title: 'Observability',
    items: [
      { label: 'Log group', value: '/aws/lambda/api-prod' },
      { label: 'Metric target', value: 'CPUUtilization > 80%' },
    ],
  },
  {
    title: 'Alarms',
    items: [
      { label: 'Alarm threshold', value: 'Critical: 85% (5m)' },
    ],
  },
];

export const acmSections: ExpandableServiceNodeSection[] = [
  {
    title: 'Certificate',
    items: [
      { label: 'Domain name', value: 'api.myapp.com' },
      { label: 'Validation', value: 'DNS (Route53)' },
    ],
  },
  {
    title: 'Binding',
    items: [
      { label: 'Target binding', value: 'ALB Listener HTTPS' },
    ],
  },
];

export const albSections: ExpandableServiceNodeSection[] = [
  {
    title: 'Health Check',
    items: [
      { label: 'Protocol / Port', value: 'HTTPS / 443' },
      { label: 'Path', value: '/healthz' },
      { label: 'Interval', value: '30s' },
      { label: 'Success codes', value: '200-399' },
    ],
  },
];

export const vpcSections: ExpandableServiceNodeSection[] = [
  {
    title: 'Network',
    items: [
      { label: 'Subnet', value: '10.0.1.0/24, 10.0.2.0/24' },
      { label: 'CIDR Block', value: '10.0.0.0/16' },
    ],
  },
];

export const getSectionsForNode = (label: string): ExpandableServiceNodeSection[] => {
  const cleanLabel = label.toLowerCase();
  if (cleanLabel.includes('ec2') || cleanLabel.includes('instance')) return ec2Sections;
  if (cleanLabel.includes('rds') || cleanLabel.includes('database')) return rdsSections;
  if (cleanLabel.includes('s3') || cleanLabel.includes('bucket')) return s3Sections;
  if (cleanLabel.includes('secrets') || cleanLabel.includes('secret')) return secretsSections;
  if (cleanLabel.includes('cloudwatch') || cleanLabel.includes('log')) return cloudWatchSections;
  if (cleanLabel.includes('acm') || cleanLabel.includes('certificate')) return acmSections;
  if (cleanLabel.includes('alb') || cleanLabel.includes('load balancer')) return albSections;
  if (cleanLabel.includes('vpc')) return vpcSections;
  return [];
};
