import type { Category } from '../../lib/types';

export type CategoryFilter = Category | '';
export type SortDirection = 'asc' | 'desc' | null;
export type NotesSortDirection = 'withFirst' | 'withoutFirst' | null;
