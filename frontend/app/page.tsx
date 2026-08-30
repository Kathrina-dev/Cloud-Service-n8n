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
import Nodes from '../components/nodes';

type AwsNodeData = {
  label: string;
  color: string;
  icon: string;
  iconSrc: string;
};

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

const nodeTypes = {
  awsNode: AwsNode,
};

const initialNodes: Node<AwsNodeData>[] = [
  {
    id: '1',
    type: 'awsNode',
    position: { x: 120, y: 160 },
    data: { label: 'ALB Load Balancer', color: '#8c50ff', icon: 'ALB', iconSrc: '/aws-alb.png' },
  },
  {
    id: '2',
    type: 'awsNode',
    position: { x: 380, y: 160 },
    data: { label: 'EC2 Instance', color: '#ed820b', icon: 'EC2', iconSrc: '/aws-ec2.png' },
  },
];
const initialEdges: Edge[] = [];
 
export default function Home() {
  const [nodes, setNodes] = useState<Node<AwsNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange: OnNodesChange<Node<AwsNodeData>> = useCallback(
    (changes: NodeChange<Node<AwsNodeData>>[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
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

  const getMiniMapNodeColor = useCallback((node: Node) => {
    const nodeData = node.data as Partial<AwsNodeData> | undefined;
    return nodeData?.color ?? '#64748b';
  }, []);

  const onAddNode = useCallback((label: string, color: string, icon: string, iconSrc: string) => {
    let newNodeId = '';

    setNodes((currentNodes) => {
      const nodeIndex = currentNodes.length + 1;
      newNodeId = `${nodeIndex}`;

      const newNode: Node<AwsNodeData> = {
        id: newNodeId,
        type: 'awsNode',
        position: {
          x: 100 + ((nodeIndex - 1) % 3) * 220,
          y: 160 + Math.floor((nodeIndex - 1) / 3) * 170,
        },
        data: { label, color, icon, iconSrc },
      };

      return [...currentNodes, newNode];
    });
  }, []);

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
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#64748b" gap={28} size={1} />
        <Panel position="top-center">
          <Nodes onAddNode={onAddNode} />
        </Panel>
        <MiniMap
          className="!rounded-xl !border !border-white/30 !bg-white/10 !backdrop-blur-xl"
          nodeColor={getMiniMapNodeColor}
          nodeStrokeColor={getMiniMapNodeColor}
        />
        <Controls className="!rounded-xl !border !border-white/30 !bg-white/10 !backdrop-blur-xl !shadow-[0_8px_24px_rgba(0,0,0,0.35)]" />
      </ReactFlow>
    </div>
  );
}
