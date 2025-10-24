import { z } from "zod";
import { UUIDSchema } from "./common";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreateCategoryInput = z
    .object({
        name: z.string().min(1).max(255).openapi({
            description: "Category name",
            example: "Beverages",
        }),
        slug: z.string().min(1).max(255).openapi({
            description: "Category slug (URL-friendly)",
            example: "beverages",
        }),
    })
    .openapi({ title: "CreateCategoryInput" });

export const UpdateCategoryInput = z
    .object({
        id: UUIDSchema,
        name: z.string().min(1).max(255).optional().openapi({
            description: "Category name",
            example: "Beverages",
        }),
        slug: z.string().min(1).max(255).optional().openapi({
            description: "Category slug (URL-friendly)",
            example: "beverages",
        }),
    })
    .openapi({ title: "UpdateCategoryInput" });

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListCategoriesQuery = z
    .object({
        // Future expansion: add filters if needed
    })
    .openapi({ title: "ListCategoriesQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const CategoryResponse = z
    .object({
        id: UUIDSchema,
        name: z.string(),
        slug: z.string(),
        tenantId: UUIDSchema,
        createdAt: z.string().nullable(),
        updatedAt: z.string().nullable(),
    })
    .openapi({ title: "CategoryResponse" });

export const CategoryListResponse = z
    .object({
        categories: z.array(CategoryResponse),
    })
    .openapi({ title: "CategoryListResponse" });

export const CreateCategoryResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        category: CategoryResponse,
    })
    .openapi({ title: "CreateCategoryResponse" });

export const UpdateCategoryResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        category: CategoryResponse,
    })
    .openapi({ title: "UpdateCategoryResponse" });

export const DeleteCategoryResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        category: CategoryResponse,
    })
    .openapi({ title: "DeleteCategoryResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateCategoryInput = z.infer<typeof CreateCategoryInput>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryInput>;
export type ListCategoriesQuery = z.infer<typeof ListCategoriesQuery>;
export type CategoryResponse = z.infer<typeof CategoryResponse>;
export type CategoryListResponse = z.infer<typeof CategoryListResponse>;
export type CreateCategoryResponse = z.infer<typeof CreateCategoryResponse>;
export type UpdateCategoryResponse = z.infer<typeof UpdateCategoryResponse>;
export type DeleteCategoryResponse = z.infer<typeof DeleteCategoryResponse>;

export type Category = z.infer<typeof CategoryResponse>;
