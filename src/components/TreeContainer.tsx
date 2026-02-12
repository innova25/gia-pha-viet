import React, { useEffect } from 'react';
import { 
  ReactFlow, 
  useNodesState, 
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  Node,
  Edge
} from '@xyflow/react';
import { getLayoutedElements } from '../services/genealogyService';
import CustomNode from './CustomNode';
import { TreeData } from '../types';

const nodeTypes = {
  personNode: CustomNode,
};

interface TreeContainerProps {
  data: TreeData;
  onSelectPerson: (id: string) => void;
  searchTerm: string;
  expandedNodes: Set<string>;
  onToggleExpand: (id: string) => void;
}

const TreeContainerContent = ({ data, onSelectPerson, searchTerm, expandedNodes, onToggleExpand }: TreeContainerProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, setCenter } = useReactFlow();

  useEffect(() => {
    if (!data.rootId) return;

    const visibleNodes: Node[] = [];
    const visibleEdges: Edge[] = [];
    const queue = [data.rootId];
    const processed = new Set();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (processed.has(currentId)) continue;
      processed.add(currentId);

      const person = data.persons[currentId];
      if (!person) continue;

      const isExpanded = expandedNodes.has(currentId);
      const hasChildren = person.childrenIds.length > 0;
      
      const spouseId = person.spouseIds.length > 0 ? person.spouseIds[0] : null;
      const spouse = spouseId ? data.persons[spouseId] : undefined;

      const nodeWidth = spouse ? 540 : 280;

      visibleNodes.push({
        id: currentId,
        type: 'personNode',
        data: {
          ...person,
          isExpanded,
          onToggleExpand: onToggleExpand,
          hasChildren,
          spouse,
          width: nodeWidth,
          onSpouseSelect: onSelectPerson
        },
        position: { x: 0, y: 0 },
      });

      if (isExpanded && hasChildren) {
        person.childrenIds.forEach(childId => {
          visibleEdges.push({
            id: `e${currentId}-${childId}`,
            source: currentId,
            target: childId,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#d4af37', strokeWidth: 1.5 },
          });
          queue.push(childId);
        });
      }
    }

    const layout = getLayoutedElements(visibleNodes, visibleEdges);
    setNodes(layout.nodes);
    setEdges(layout.edges);

  }, [data, expandedNodes, onToggleExpand, setNodes, setEdges, onSelectPerson]);

  useEffect(() => {
    if (!searchTerm) return;
    
    const foundNode = nodes.find(n => {
       const p = n.data as any;
       const matchPerson = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id === searchTerm;
       const matchSpouse = p.spouse && (p.spouse.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.spouse.id === searchTerm);
       return matchPerson || matchSpouse;
    });

    if (foundNode) {
      const { x, y } = foundNode.position;
      const p = foundNode.data as any;
      const width = p.width || 280;
      
      setCenter(x + width / 2, y + 70, { zoom: 1.0, duration: 800 });
      
      const sTerm = searchTerm.toLowerCase();
      
      if (p.spouse && (p.spouse.name.toLowerCase().includes(sTerm) || p.spouse.id === searchTerm)) {
        onSelectPerson(p.spouse.id);
      } else {
        onSelectPerson(foundNode.id);
      }
    }
  }, [searchTerm, nodes, setCenter, onSelectPerson]);

  useEffect(() => {
    if (nodes.length > 0 && !searchTerm) {
       const timer = setTimeout(() => {
         fitView({ padding: 0.2, duration: 600 });
       }, 100);
       return () => clearTimeout(timer);
    }
  }, [data.rootId, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onSelectPerson(node.id)}
      minZoom={0.1}
      maxZoom={2}
      fitView
      className="bg-transparent"
      proOptions={{ hideAttribution: true }}
    >
    </ReactFlow>
  );
};

export default function TreeContainer(props: TreeContainerProps) {
  return (
    <ReactFlowProvider>
      <TreeContainerContent {...props} />
    </ReactFlowProvider>
  );
}