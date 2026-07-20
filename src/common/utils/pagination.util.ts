import { PaginationQueryDto } from "../dto/pagination-query.dto";

export const getPagination = (query: PaginationQueryDto) => {
    const { page, limit } = query;

    return {
        page,
        limit,
        skip: (page - 1) * limit,
    };
}

export const buildPaginationMeta = (page: number, limit: number, total: number) => {
    const totalPages = Math.ceil(total / limit);

    return {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
}