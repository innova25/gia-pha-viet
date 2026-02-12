import * as XLSX from 'xlsx';
import dagre from 'dagre';
import { Node, Edge, Position } from '@xyflow/react';
import { Person, RawPersonExcelRow, TreeData, Gender, GraphNodeData } from '../types';

// --- IMPORT LOGIC ---

export const parseExcelToTree = async (file: File): Promise<TreeData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<RawPersonExcelRow>(worksheet);
        
        const treeData = normalizeData(jsonData);
        resolve(treeData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
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

// Generate Mock Data for First Load
export const generateMockData = (): TreeData => {
  const root: Person = {
    id: '1',
    name: 'Nguyễn Văn Tổ',
    gender: Gender.MALE,
    birthYear: '1850',
    deathYear: '1920',
    parentId: null,
    spouseIds: [],
    childrenIds: ['2', '3', '4'],
    generation: 1,
    isRoot: true,
    notes: 'Ông tổ dòng họ, người khai sinh lập nghiệp.'
  };

  const p2: Person = { id: '2', name: 'Nguyễn Văn Cả', gender: Gender.MALE, birthYear: '1880', deathYear: '1950', parentId: '1', spouseIds: [], childrenIds: ['5', '6'], generation: 2, isRoot: false };
  const p3: Person = { id: '3', name: 'Nguyễn Thị Hai', gender: Gender.FEMALE, birthYear: '1882', deathYear: '1955', parentId: '1', spouseIds: [], childrenIds: [], generation: 2, isRoot: false };
  const p4: Person = { id: '4', name: 'Nguyễn Văn Ba', gender: Gender.MALE, birthYear: '1885', deathYear: '1960', parentId: '1', spouseIds: [], childrenIds: ['7'], generation: 2, isRoot: false };
  
  const p5: Person = { id: '5', name: 'Nguyễn Văn Đích', gender: Gender.MALE, birthYear: '1910', deathYear: '1980', parentId: '2', spouseIds: [], childrenIds: [], generation: 3, isRoot: false };
  const p6: Person = { id: '6', name: 'Nguyễn Thị Nở', gender: Gender.FEMALE, birthYear: '1912', deathYear: '1990', parentId: '2', spouseIds: [], childrenIds: [], generation: 3, isRoot: false };
  const p7: Person = { id: '7', name: 'Nguyễn Văn Tôn', gender: Gender.MALE, birthYear: '1920', deathYear: '1995', parentId: '4', spouseIds: [], childrenIds: [], generation: 3, isRoot: false };

  const persons = { '1': root, '2': p2, '3': p3, '4': p4, '5': p5, '6': p6, '7': p7 };
  return { persons, rootId: '1' };
};