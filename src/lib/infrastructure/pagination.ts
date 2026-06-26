export function decodeOffsetCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0

  const parsed = Number.parseInt(cursor, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function getPageCursor(page: number, pageSize: number): string | null {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1
  const offset = (safePage - 1) * pageSize

  return offset <= 0 ? null : String(offset)
}

export function getCurrentPageFromCursor(
  cursor: string | null | undefined,
  pageSize: number,
): number {
  const offset = decodeOffsetCursor(cursor)
  return Math.floor(offset / pageSize) + 1
}

export function getTotalPages(totalCount: number, pageSize: number): number {
  if (totalCount <= 0) return 1
  return Math.ceil(totalCount / pageSize)
}
