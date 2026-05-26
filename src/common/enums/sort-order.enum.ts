/**
 * Direction of a SQL ORDER BY clause. Kept in `common/` so other modules
 * can reuse it without depending on orders/.
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}
