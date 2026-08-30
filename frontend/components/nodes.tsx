"use client";

import Image from "next/image";

type NodesProps = {
  onAddNode: (label: string, color: string, icon: string, iconSrc: string, nodeType: string) => void;
};

const nodePalette = [
  {
    label: "ALB Load Balancer",
    nodeColor: "#8c50ff",
    icon: "ALB",
    iconSrc: "/aws-alb.png",
    nodeType: "expandableNode",
  },
  {
    label: "EC2 Instance",
    nodeColor: "#ed820b",
    icon: "EC2",
    iconSrc: "/aws-ec2.png",
    nodeType: "expandableNode",
  },
  {
    label: "RDS Database",
    nodeColor: "#3a44c7",
    icon: "RDS",
    iconSrc: "/aws-rds.png",
    nodeType: "expandableNode",
  },
  {
    label: "S3 Bucket",
    nodeColor: "#448a26",
    icon: "S3",
    iconSrc: "/aws-s3.png",
    nodeType: "expandableNode",
  },
  {
    label: "Secrets Manager",
    nodeColor: "#de2f34",
    icon: "SM",
    iconSrc: "/aws-secrets-manager.png",
    nodeType: "expandableNode",
  },
  {
    label: "CloudWatch Logs",
    nodeColor: "#d72d6c",
    icon: "CWL",
    iconSrc: "/aws-cloudwatch.png",
    nodeType: "expandableNode",
  },
  {
    label: "ACM Certificate",
    nodeColor: "#de2d34",
    icon: "ACM",
    iconSrc: "/aws-acm.jpeg",
    nodeType: "expandableNode",
  },
  {
    label: "VPC Network",
    nodeColor: "#7746d3",
    icon: "VPC",
    iconSrc: "/aws-vpc.png",
    nodeType: "vpcNode",
  },
];

const Nodes = ({ onAddNode }: NodesProps) => {

  return (
    <div className="flex max-w-[calc(100vw-2rem)] flex-nowrap items-stretch justify-start gap-2 overflow-x-auto rounded-2xl border border-white/25 bg-white/10 p-2 backdrop-blur-xl shadow-[0_14px_42px_rgba(0,0,0,0.35)]">
      {nodePalette.map((item) => (
        <button
          key={item.label}
          onClick={() => onAddNode(item.label, item.nodeColor, item.icon, item.iconSrc, item.nodeType)}
          className="flex min-h-[86px] w-[118px] flex-col items-center justify-center rounded-xl border border-white/25 bg-white/10 px-2 py-2 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/20"
          style={{
            boxShadow: `inset 0 0 0 1px ${item.nodeColor}55, 0 8px 20px ${item.nodeColor}35`,
          }}
        >
          <span
            className="mb-1.5 inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/40 bg-white/20 text-[10px] font-bold"
            style={{ boxShadow: `0 0 0 1px ${item.nodeColor}55, 0 8px 18px ${item.nodeColor}35` }}
          >
            <Image src={item.iconSrc} alt={item.label} width={30} height={30} className="h-7 w-7 object-contain" />
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

export default Nodes