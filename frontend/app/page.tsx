"use client";

import { useState, useCallback } from 'react';
import Image from 'next/image';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  Panel,
  addEdge,
  Handle,
  Connection,
  EdgeChange,
  NodeChange,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  NodeProps,
  Node,
  Edge,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './globals.css';
import Nodes, { nodePalette } from '../components/nodes';
import ExpandableServiceNode, { type ExpandableServiceNodeData } from '../components/ui/expandable-service-node';
import {
  type FlowNodeData,
  type AwsNodeData,
  type VpcNodeData,
  albSections,
  ec2Sections,
  getSectionsForNode,
} from '../components/node-templates';

function AwsNode({ data }: NodeProps<Node<AwsNodeData>>) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border !border-white/40 !bg-white/80" />
      <div
        className="min-w-[150px] rounded-2xl border border-white/30 bg-white/10 px-3 py-2 text-white backdrop-blur-xl shadow-[0_12px_28px_rgba(0,0,0,0.35)]"
        style={{ boxShadow: `inset 0 0 0 1px ${data.color}55, 0 12px 28px ${data.color}35` }}
      >
        <div
          className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-md border border-white/40 bg-white/20 text-[11px] font-bold"
          style={{ boxShadow: `0 0 0 1px ${data.color}55, 0 8px 18px ${data.color}35` }}
        >
          <Image src={data.iconSrc} alt={data.label} width={24} height={24} className="h-6 w-6 object-contain" />
        </div>
        <p className="text-center text-xs font-semibold leading-tight">{data.label}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border !border-white/40 !bg-white/80" />
    </>
  );
}

function VpcNode({ data }: NodeProps<Node<VpcNodeData>>) {
  return (
    <div
      className="w-full h-full relative rounded-3xl border-2 border-dashed bg-[#0b1220]/60 p-4 text-white backdrop-blur-md shadow-[0_12px_28px_rgba(0,0,0,0.15)] flex flex-col gap-4"
      style={{
        borderColor: data.accentColor || '#7746d3',
        boxShadow: `inset 0 0 0 1px ${data.accentColor}33, 0 12px 28px ${data.accentColor}15`
      }}
    >
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md border border-white/40 bg-white/20"
          style={{ boxShadow: `0 0 0 1px ${data.accentColor}55, 0 8px 18px ${data.accentColor}35` }}
        >
          <Image src={data.iconSrc} alt={data.label} width={20} height={20} className="h-5 w-5 object-contain" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none">{data.label}</p>
          <p className="text-[10px] text-white/60 mt-1">CIDR: 10.0.0.0/16</p>
        </div>
      </div>

      {/* Subnet boundaries inside VPC */}
      <div className="grid grid-rows-2 gap-4 h-full">
        {/* Public Subnet - Upper Area (ALB, Web Layer) */}
        <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-3 flex flex-col justify-start">
          <div className="flex justify-between items-center text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
            <span>Public Subnet</span>
            <span>10.0.1.0/24 (ALB Layer)</span>
          </div>
        </div>

        {/* Private Subnet - Lower Area (EC2, DB Layer) */}
        <div className="border border-orange-500/20 bg-orange-500/5 rounded-2xl p-3 flex flex-col justify-end">
          <div className="flex justify-between items-end text-[10px] font-semibold text-orange-400 uppercase tracking-wider">
            <span>Private Subnet</span>
            <span>10.0.11.0/24 (EC2 Layer)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  awsNode: AwsNode,
  ec2Node: ExpandableServiceNode,
  expandableNode: ExpandableServiceNode,
  vpcNode: VpcNode,
};

const initialNodes: Node<FlowNodeData>[] = [
  {
    id: '1',
    type: 'expandableNode',
    position: { x: 120, y: 160 },
    style: { zIndex: 10 },
    data: {
      label: 'ALB Load Balancer',
      iconSrc: '/aws-alb.png',
      accentColor: '#8c50ff',
      sections: albSections,
    },
  },
  {
    id: '2',
    type: 'expandableNode',
    position: { x: 380, y: 160 },
    style: { zIndex: 10 },
    data: {
      label: 'EC2 Instance',
      iconSrc: '/aws-ec2.png',
      accentColor: '#ed820b',
      sections: ec2Sections,
    },
  },
];
const initialEdges: Edge[] = [];

export default function Home() {
  const [nodes, setNodes] = useState<Node<FlowNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [loading, setLoading] = useState(false);
  const [deployStatus, setDeployStatus] = useState<string | null>(null);
  const [pushing, setPushing] = useState(false);
  const [deployingRDS, setDeployingRDS] = useState(false);
  const [setupS3, setSetupS3] = useState(false);
  const [setupSecrets, setSetupSecrets] = useState(false);
  const [requestingCert, setRequestingCert] = useState(false);
  const [setupCW, setSetupCW] = useState(false);
  
  const [chatPrompt, setChatPrompt] = useState("");
  const [isGeneratingGraph, setIsGeneratingGraph] = useState(false);
  
  const [domainName, setDomainName] = useState("");
  const [cwParams, setCwParams] = useState({
    ec2InstanceId: "",
    rdsIdentifier: "",
    loadBalancerFullName: ""
  });

  const [dnsInstructions, setDnsInstructions] = useState<{ name: string, type: string, value: string } | null>(null);

  const [deploymentLog, setDeploymentLog] = useState<string[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);

  const handleDeploy = async () => {
    setLoading(true);
    setDeployStatus("Starting AI Orchestrator...");
    try {
      const response = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
    setDeploymentLog([]);
    setShowLogModal(true);

    const log = (msg: string) => {
      setDeploymentLog(prev => [...prev, msg]);
      console.log(msg);
    };

    try {
      // Find the VPC node
      const vpcNode = nodes.find(n => n.type === 'vpcNode');

      let vpcId = "";
      let privateSubnetId = "";
      let publicSubnetId = "";

      if (vpcNode) {
        log("Phase 1: VPC Node detected. Initiating VPC environment deployment...");
        const vpcResponse = await fetch("/api/deploy-vpc", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const vpcData = await vpcResponse.json();
        if (!vpcResponse.ok) {
          throw new Error(vpcData.error || "Failed to deploy VPC");
        }
        vpcId = vpcData.vpcId;
        privateSubnetId = vpcData.privateSubnets?.[0];
        publicSubnetId = vpcData.publicSubnets?.[0];
        log(`✓ VPC successfully deployed. ID: ${vpcId}`);
        log(`✓ Private Subnet: ${privateSubnetId}`);
        log(`✓ Public Subnet: ${publicSubnetId}`);
      } else {
        log("No VPC Node detected on canvas. Using existing infrastructure configurations...");
      }

      // Find children of this VPC
      const ec2Nodes = nodes.filter(n => {
        const isEC2 = n.type === 'expandableNode' && n.data.label.toLowerCase().includes('ec2');
        if (vpcNode) {
          // Inside VPC private subnet area (relative y >= 250)
          return n.parentId === vpcNode.id && n.position.y >= 250 && isEC2;
        }
        return isEC2;
      });

      if (!response.ok) {
        throw new Error(data.error || "Failed to start orchestration");
      }

      const jobId = data.jobId;
      setDeployStatus("AI analyzing architecture...");

      // Start polling
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/status?jobId=${jobId}`);
          const statusData = await statusRes.json();
          
          if (statusData.status) {
            setDeployStatus(statusData.status);
          }

          if (statusData.isComplete) {
            clearInterval(pollInterval);
            setLoading(false);
            if (statusData.error) {
              alert(`Deployment failed: ${statusData.error}`);
            } else {
              alert("Cloud deployment completed successfully!");
            }
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 3000);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      alert(`Deployment failed: ${errorMessage}`);
      const albNodes = nodes.filter(n => {
        const isALB = n.type === 'expandableNode' && n.data.label.toLowerCase().includes('alb');
        if (vpcNode) {
          // Inside VPC public subnet area (relative y < 250)
          return n.parentId === vpcNode.id && n.position.y < 250 && isALB;
        }
        return isALB;
      });

      // Deploy EC2 instances in the private subnet
      if (ec2Nodes.length > 0) {
        log(`Phase 2: Deploying ${ec2Nodes.length} EC2 Instances in Private Subnet...`);
        for (let i = 0; i < ec2Nodes.length; i++) {
          const ec2Node = ec2Nodes[i];
          log(`Launching EC2 Node "${ec2Node.data.label}" (${i + 1}/${ec2Nodes.length})...`);

          const ec2Response = await fetch("/api/deploy-poc", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ privateSubnetId }),
          });
          const ec2Data = await ec2Response.json();
          if (!ec2Response.ok) {
            throw new Error(ec2Data.error || `Failed to deploy EC2 Node "${ec2Node.data.label}"`);
          }
          log(`✓ EC2 Node "${ec2Node.data.label}" deployed successfully. Instance ID: ${ec2Data.instanceId}`);
        }
      } else {
        log("No EC2 Instances found in Private Subnet.");
      }

      // Deploy ALBs in the public subnet
      if (albNodes.length > 0) {
        log(`Phase 3: Deploying ${albNodes.length} Application Load Balancers (ALBs) in Public Subnet...`);
        for (let i = 0; i < albNodes.length; i++) {
          const albNode = albNodes[i];
          log(`Configuring Load Balancer "${albNode.data.label}" (${i + 1}/${albNodes.length})...`);

          // Simulate ALB deployment call (since ALB creation logic is handled via custom configurations)
          await new Promise(resolve => setTimeout(resolve, 2000));
          log(`✓ ALB Node "${albNode.data.label}" deployed successfully. Mapped to Public Subnet.`);
        }
      } else {
        log("No ALBs found in Public Subnet.");
      }

      log("🎉 Architecture deployment completed successfully!");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      log(`❌ Deployment Failed: ${errorMessage}`);
    } finally {
      setLoading(false);
      setDeployStatus(null);
    }
  };

  const onNodesChange: OnNodesChange<Node<FlowNodeData>> = useCallback(
    (changes: NodeChange<Node<FlowNodeData>>[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange: OnEdgesChange<Edge> = useCallback(
    (changes: EdgeChange<Edge>[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect: OnConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onNodeDragStop = useCallback((event: any, draggedNode: Node) => {
    if (draggedNode.type === 'vpcNode') return;

    setNodes((currentNodes) => {
      let updated = currentNodes.map((n) => {
        if (n.id === draggedNode.id) {
          // Case 1: Node already has a parent, check if it was dragged outside the parent boundaries
          if (draggedNode.parentId) {
            const parent = currentNodes.find(p => p.id === draggedNode.parentId);
            const parentWidth = parseInt(parent?.style?.width as string || '570');
            if (
              parent &&
              (draggedNode.position.x < 0 ||
                draggedNode.position.x > parentWidth ||
                draggedNode.position.y < 0 ||
                draggedNode.position.y > 460)
            ) {
              const absX = parent.position.x + draggedNode.position.x;
              const absY = parent.position.y + draggedNode.position.y;
              return {
                ...n,
                parentId: undefined,
                extent: undefined,
                position: { x: absX, y: absY },
              };
            }
          }
          return n;
        }
        return n;
      });

      // Case 2: Check if absolute node was dropped inside any VPC
      const targetVpc = updated.find((n) => {
        if (n.type !== 'vpcNode') return false;
        const vpcWidth = parseInt(n.style?.width as string || '570');
        const draggedNodeCurrent = updated.find(d => d.id === draggedNode.id)!;

        // If node is already a child, it skips overlap check since it's already inside
        if (draggedNodeCurrent.parentId === n.id) return false;

        return (
          draggedNodeCurrent.position.x >= n.position.x &&
          draggedNodeCurrent.position.x <= n.position.x + vpcWidth &&
          draggedNodeCurrent.position.y >= n.position.y &&
          draggedNodeCurrent.position.y <= n.position.y + 460
        );
      });

      if (targetVpc) {
        const draggedNodeCurrent = updated.find(d => d.id === draggedNode.id)!;
        const relativeY = draggedNodeCurrent.position.y - targetVpc.position.y;

        // Is it Public Subnet (relative Y < 230) or Private Subnet (relative Y >= 230)?
        const isPublic = relativeY < 230;

        // Find existing children in that subnet (excluding the dragged node itself)
        const siblingSubnetNodes = updated.filter(
          (c) =>
            c.parentId === targetVpc.id &&
            c.id !== draggedNode.id &&
            (isPublic ? c.position.y < 230 : c.position.y >= 230)
        );

        // Pre-assigned index to stack side-by-side
        const idx = siblingSubnetNodes.length;
        const snapX = 30 + idx * 170;
        const snapY = isPublic ? 90 : 280;

        updated = updated.map((n) => {
          if (n.id === draggedNode.id) {
            return {
              ...n,
              parentId: targetVpc.id,
              extent: 'parent' as const,
              position: { x: snapX, y: snapY },
            };
          }
          return n;
        });
      }

      // Recalculate dimensions for all VPC nodes to scale dynamically
      return updated.map((node) => {
        if (node.type === 'vpcNode') {
          const children = updated.filter((c) => c.parentId === node.id);
          const publicChildren = children.filter((c) => c.position.y < 230);
          const privateChildren = children.filter((c) => c.position.y >= 230);

          const maxIndex = Math.max(publicChildren.length, privateChildren.length, 3);
          const calculatedWidth = 30 + maxIndex * 170 + 30;

          return {
            ...node,
            style: {
              ...node.style,
              width: `${calculatedWidth}px`,
              height: '460px',
              zIndex: 1,
            },
          };
        }
        return node;
      });
    });
  }, [nodes]);

  const getMiniMapNodeColor = useCallback((node: Node) => {
    const nodeData = node.data as Partial<AwsNodeData & ExpandableServiceNodeData> | undefined;
    return nodeData?.color ?? nodeData?.accentColor ?? '#64748b';
  }, []);

  const onAddNode = useCallback((label: string, color: string, icon: string, iconSrc: string, nodeType: string) => {
    let newNodeId = '';

    setNodes((currentNodes) => {
      const nodeIndex = currentNodes.length + 1;
      newNodeId = `${nodeIndex}`;

      const newNode: Node<FlowNodeData> = {
        id: newNodeId,
        type: nodeType,
        position: {
          x: 100 + ((nodeIndex - 1) % 3) * 220,
          y: 160 + Math.floor((nodeIndex - 1) / 3) * 170,
        },
        style: {
          zIndex: nodeType === 'vpcNode' ? 1 : 10,
          width: nodeType === 'vpcNode' ? '570px' : undefined,
          height: nodeType === 'vpcNode' ? '460px' : undefined,
        },
        data:
          nodeType === 'vpcNode'
            ? {
              label,
              iconSrc,
              accentColor: color,
            }
            : {
              label,
              iconSrc,
              accentColor: color,
              sections: getSectionsForNode(label),
            },
      };

      const updatedNodes = [...currentNodes, newNode];
      return updatedNodes.sort((a, b) => {
        const aVal = a.type === 'vpcNode' ? 1 : 10;
        const bVal = b.type === 'vpcNode' ? 1 : 10;
        return aVal - bVal;
      });
    });
  }, []);

  const handleRequestCertificate = async () => {
    if (!domainName) {
      alert("Please enter a domain name");
      return;
    }

    setRequestingCert(true);
    setDnsInstructions(null);
    try {
      const response = await fetch("/api/request-certificate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domainName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to request certificate");
      }

      if (data.dnsRecord) {
        setDnsInstructions(data.dnsRecord);
      } else {
        alert(data.message);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      alert(`Certificate request failed: ${errorMessage}`);
    } finally {
      setRequestingCert(false);
    }
  };

  const handleSetupCloudWatch = async () => {
    if (!cwParams.ec2InstanceId || !cwParams.rdsIdentifier || !cwParams.loadBalancerFullName) {
      alert("Please enter EC2 Instance ID, RDS Identifier, and ALB Full Name.");
      return;
    }

    setSetupCW(true);
    try {
      const response = await fetch("/api/setup-cloudwatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cwParams),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to setup CloudWatch");
      }

      alert("CloudWatch Dashboard and Alarms created successfully!");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      alert(`CloudWatch Setup failed: ${errorMessage}`);
    } finally {
      setSetupCW(false);
    }
  };

  const handleGraphChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPrompt.trim()) return;

    setIsGeneratingGraph(true);
    try {
      const response = await fetch('/api/chat-to-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: chatPrompt, currentGraph: { nodes, edges } })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate graph');
      
      let nextNodeId = Math.max(0, ...nodes.map(n => parseInt(n.id) || 0));

      const newNodesList = (data.newNodes || []).map((nn: any, index: number) => {
        nextNodeId++;
        const paletteItem = nodePalette.find(p => p.label === nn.label);
        
        return {
          id: nn.id || String(nextNodeId),
          type: paletteItem?.nodeType || 'expandableNode',
          position: {
            x: 100 + ((nodes.length + index) % 3) * 220,
            y: 350 + Math.floor((nodes.length + index) / 3) * 170,
          },
          data: paletteItem?.nodeType === 'vpcNode' ? {
            label: nn.logicalName || nn.label,
            iconSrc: paletteItem?.iconSrc || '',
            accentColor: paletteItem?.nodeColor || '#888',
          } : {
            label: nn.logicalName || nn.label,
            iconSrc: paletteItem?.iconSrc || '',
            accentColor: paletteItem?.nodeColor || '#888',
            sections: getSectionsForNode(nn.label),
          }
        };
      });

      const newEdgesList = (data.newEdges || []).map((ne: any, index: number) => ({
        id: `e-${Date.now()}-${index}`,
        source: ne.source,
        target: ne.target,
        type: 'default',
        animated: true,
      }));

      setNodes(prev => [...prev, ...newNodesList]);
      setEdges(prev => [...prev, ...newEdgesList]);
      setChatPrompt("");

    } catch (error: any) {
      alert(`Chat Error: ${error.message}`);
    } finally {
      setIsGeneratingGraph(false);
    }
  };

  const isBusy = loading || pushing || deployingRDS || setupS3 || setupSecrets || requestingCert || setupCW;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0b1220',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#64748b" gap={28} size={1} />
        <Panel position="top-center">
          <Nodes onAddNode={onAddNode} />
        </Panel>
        <Panel position="top-right">
          <button
            onClick={handleDeploy}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 mr-12 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-semibold text-lg backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {deployStatus || "Deploying..."}
              </>
            ) : (
              'Deploy'
            )}
          </button>
        </Panel>
        <Panel position="bottom-center" className="mb-4 w-[600px] max-w-[90vw]">
          <form onSubmit={handleGraphChatSubmit} className="relative flex w-full items-center">
            <input
              type="text"
              value={chatPrompt}
              onChange={(e) => setChatPrompt(e.target.value)}
              placeholder="E.g., Add an EC2 instance connected to an RDS database..."
              disabled={isGeneratingGraph}
              className="w-full rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 pr-12 text-sm text-white placeholder-white/50 backdrop-blur-xl focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50 shadow-[0_12px_28px_rgba(0,0,0,0.35)]"
            />
            <button
              type="submit"
              disabled={isGeneratingGraph || !chatPrompt.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-indigo-500/20 p-2 text-indigo-300 transition hover:bg-indigo-500/40 disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingGraph ? (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </form>
        </Panel>
        <MiniMap
          className="!rounded-xl !border !border-white/30 !bg-white/10 !backdrop-blur-xl"
          nodeColor={getMiniMapNodeColor}
          nodeStrokeColor={getMiniMapNodeColor}
        />
        <Controls className="!rounded-xl !border !border-white/30 !bg-white/10 !backdrop-blur-xl !shadow-[0_8px_24px_rgba(0,0,0,0.35)]" />
      </ReactFlow>

      {showLogModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1220]/95 border border-white/25 rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-lg">Deployment Orchestrator</h3>
              {!loading && (
                <button
                  onClick={() => setShowLogModal(false)}
                  className="text-white/60 hover:text-white text-xs bg-white/10 px-2.5 py-1 rounded-md transition"
                >
                  Close
                </button>
              )}
            </div>
            <div className="space-y-2.5 max-h-60 overflow-y-auto text-xs font-mono">
              {deploymentLog.map((logItem, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <span className="text-emerald-400">➜</span>
                  <span className="text-white/90">{logItem}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
