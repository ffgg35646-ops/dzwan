
export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
}

export function getPagination(
  pageValue: unknown,
  limitValue: unknown,
  defaultLimit = 20,
  maxLimit = 100,
): PaginationResult {
  const pageNumber = Number(pageValue);
  const limitNumber = Number(limitValue);

  const page =
    Number.isFinite(pageNumber) &&
    pageNumber >= 1
      ? Math.floor(pageNumber)
      : 1;

  const limit =
    Number.isFinite(limitNumber) &&
    limitNumber >= 1
      ? Math.min(
          Math.floor(limitNumber),
          maxLimit,
        )
      : defaultLimit;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}
