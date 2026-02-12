export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  UNKNOWN = 'UNKNOWN'
}

export interface RawPersonExcelRow {
  ID: string | number;
  FullName: string;
  Gender?: string;
  BirthYear?: string | number;
  DeathYear?: string | number;
  ParentID?: string | number;
  SpouseIDs?: string | number; // Comma separated if multiple
  AvatarURL?: string;
  Notes?: string;
}

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  birthYear: string;
  deathYear: string;
  parentId: string | null;
  spouseIds: string[];
  childrenIds: string[];
  avatarUrl?: string;
  notes?: string;
  generation: number;
  isRoot: boolean;
}

export interface GraphNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  gender: Gender;
  birthYear: string;
  deathYear: string;
  parentId: string | null;
  spouseIds: string[];
  childrenIds: string[];
  avatarUrl?: string;
  notes?: string;
  generation: number;
  isRoot: boolean;
  
  // Graph specific
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  hasChildren?: boolean;
  spouse?: Person;
  width?: number;
  onSpouseSelect?: (id: string) => void;
}

export interface TreeData {
  persons: Record<string, Person>;
  rootId: string | null;
}