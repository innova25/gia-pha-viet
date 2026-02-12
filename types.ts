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

export interface GraphNodeData extends Person {
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  hasChildren: boolean;
  spouse?: Person; // Added spouse data for Couple Node
  width?: number; // Dynamic width for layout
  onSpouseSelect?: (id: string) => void; // Handler for clicking spouse
  [key: string]: unknown;
}

export interface TreeData {
  persons: Record<string, Person>;
  rootId: string | null;
}