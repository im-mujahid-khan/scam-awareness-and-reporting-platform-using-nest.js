export interface CommentSortOptions {
  sortBy: string;
  orderBy: Record<string, 'asc' | 'desc'>;
}

export interface PaginatedComments {
  comments: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}