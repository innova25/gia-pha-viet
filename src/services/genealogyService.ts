import * as XLSX from 'xlsx';
import dagre from 'dagre';
import { Node, Edge, Position } from '@xyflow/react';
import { Person, RawPersonExcelRow, TreeData, Gender, GraphNodeData } from '../types';

// --- IMPORT LOGIC ---

const parseExcelBuffer = (buffer: ArrayBuffer): TreeData => {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<RawPersonExcelRow>(worksheet);
  
  return normalizeData(jsonData);
};

export const parseExcelToTree = async (file: File): Promise<TreeData> => {
  const buffer = await file.arrayBuffer();
  return parseExcelBuffer(buffer);
};

export const loadTreeFromUrl = async (url: string): Promise<TreeData> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
        // If file doesn't exist, return empty tree (user can upload later)
        console.warn(`Could not load Excel file from ${url}: ${response.statusText}`);
        return { persons: {}, rootId: null };
    }
    const buffer = await response.arrayBuffer();
    return parseExcelBuffer(buffer);
  } catch (error) {
    console.error("Error loading Excel from URL:", error);
    // Return empty state on error so app doesn't crash
    return { persons: {}, rootId: null };
  }
};

const normalizeData = (rows: RawPersonExcelRow[]): TreeData => {
  const persons: Record<string, Person> = {};
  let rootId: string | null = null;

  // Pass 1: Create Person objects
  rows.forEach((row) => {
    const id = String(row.ID).trim();
    if (!id) return;

    persons[id] = {
      id,
      name: row.FullName || 'Unknown',
      gender: parseGender(row.Gender),
      birthYear: String(row.BirthYear || ''),
      deathYear: String(row.DeathYear || ''),
      parentId: row.ParentID ? String(row.ParentID).trim() : null,
      spouseIds: row.SpouseIDs ? String(row.SpouseIDs).split(',').map(s => s.trim()) : [],
      childrenIds: [],
      avatarUrl: row.AvatarURL,
      notes: row.Notes,
      generation: 0,
      isRoot: false
    };
  });

  // Pass 2: Establish Relationships & Find Root
  Object.values(persons).forEach((p) => {
    if (p.parentId && persons[p.parentId]) {
      persons[p.parentId].childrenIds.push(p.id);
    } else {
      // If no parent, likely a root (or a spouse not linked directly to parent)
      // For simplicity in this pyramid view, we pick the first node with no parent as visual root
      if (!rootId) {
        rootId = p.id;
        p.isRoot = true;
      }
    }
  });

  // Pass 3: Calculate Generations (BFS)
  if (rootId) {
    const queue: { id: string; gen: number }[] = [{ id: rootId, gen: 1 }];
    const visited = new Set<string>();
    
    while (queue.length > 0) {
      const { id, gen } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      if (persons[id]) {
        persons[id].generation = gen;
        persons[id].childrenIds.forEach(childId => {
          queue.push({ id: childId, gen: gen + 1 });
        });
      }
    }
  }

  return { persons, rootId };
};

const parseGender = (val?: string): Gender => {
  if (!val) return Gender.UNKNOWN;
  const v = val.toLowerCase().trim();
  if (v === 'male' || v === 'nam' || v === 'm') return Gender.MALE;
  if (v === 'female' || v === 'nữ' || v === 'nu' || v === 'f') return Gender.FEMALE;
  return Gender.UNKNOWN;
};

// --- EXPORT LOGIC ---

export const exportTreeToExcel = (persons: Record<string, Person>) => {
  const rows: RawPersonExcelRow[] = Object.values(persons).map(p => ({
    ID: p.id,
    FullName: p.name,
    Gender: p.gender === Gender.MALE ? 'Nam' : p.gender === Gender.FEMALE ? 'Nữ' : 'Khác',
    BirthYear: p.birthYear,
    DeathYear: p.deathYear,
    ParentID: p.parentId || '',
    SpouseIDs: p.spouseIds.join(', '),
    AvatarURL: p.avatarUrl || '',
    Notes: p.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "GiaPha");
  XLSX.writeFile(workbook, "GiaPha_Export.xlsx");
};

// --- GRAPH LAYOUT LOGIC (DAGRE) ---

const defaultNodeWidth = 280;
const nodeHeight = 140;
const rankSep = 80; // Vertical spacing
const nodeSep = 40; // Horizontal spacing

export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction = 'TB' // Top-Bottom
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ 
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep,
  });

  nodes.forEach((node) => {
    // Check if node has a custom width defined in data (for couple nodes)
    const data = node.data as unknown as GraphNodeData;
    const width = data.width || defaultNodeWidth;
    dagreGraph.setNode(node.id, { width, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const data = node.data as unknown as GraphNodeData;
    const width = data.width || defaultNodeWidth;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
    };
  });

  return { nodes: layoutedNodes, edges };
};