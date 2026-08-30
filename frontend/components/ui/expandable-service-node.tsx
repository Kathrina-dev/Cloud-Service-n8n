"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Handle, Position, type Connection, type NodeProps, type Node, useReactFlow } from '@xyflow/react';

export type ExpandableServiceNodeSection = {
  title: string;
  items: Array<{
    label: string;
    value: string;
  }>;
};

export type ExpandableServiceNodeData = {
  label: string;
  iconSrc: string;
  accentColor: string;
  sections: ExpandableServiceNodeSection[];
  onHandleConnect?: (connection: Connection) => void;
};

export default function ExpandableServiceNode({ id, data }: NodeProps<Node<ExpandableServiceNodeData>>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const { setNodes, setEdges } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((n) => n.id !== id));
    setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
  };

  useEffect(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (nodeRef.current && !nodeRef.current.contains(event.target as globalThis.Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
    };
  }, []);

  return (
    <div
      ref={nodeRef}
      className="group relative min-w-[150px] rounded-2xl border border-white/30 bg-white/10 px-3 py-2 text-white backdrop-blur-xl shadow-[0_12px_28px_rgba(0,0,0,0.35)]"
      style={{ boxShadow: `inset 0 0 0 1px ${data.accentColor}55, 0 12px 28px ${data.accentColor}35` }}
    >
      <button 
        onClick={handleDelete}
        className="absolute -top-2 -right-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-6 h-6 flex items-center justify-center text-xs shadow-md"
        title="Delete Node"
      >
        ✕
      </button>

      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border !border-white/40 !bg-white/80"
      />

      <button
        type="button"
        className="flex flex-col w-full items-center text-center cursor-pointer"
        onClick={(event) => {
          event.stopPropagation();
          setIsExpanded((current) => !current);
        }}
        aria-expanded={isExpanded}
      >
        <div
          className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-md border border-white/40 bg-white/20 text-[11px] font-bold"
          style={{ boxShadow: `0 0 0 1px ${data.accentColor}55, 0 8px 18px ${data.accentColor}35` }}
        >
          <Image src={data.iconSrc} alt={data.label} width={24} height={24} className="h-6 w-6 object-contain" />
        </div>

        <p className="text-center text-xs font-semibold leading-tight">{data.label}</p>
      </button>

      {isExpanded && (
        <div className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 z-50 w-[240px] space-y-3 rounded-xl border border-white/15 bg-[#0b1220]/95 backdrop-blur-md p-3 text-xs shadow-[0_12px_28px_rgba(0,0,0,0.5)]">
          {data.sections.map((section) => (
            <div key={section.title} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">{section.title}</p>
              <div className="space-y-1.5">
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                    <span className="text-white/65">{item.label}</span>
                    <span className="text-white font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border !border-white/40 !bg-white/80"
        onConnect={(connection) => {
          console.log('Expandable service node connected', connection);
          data.onHandleConnect?.(connection);
        }}
      />
    </div>
  );
}
