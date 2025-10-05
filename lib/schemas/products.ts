// lib/schemas/products.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

/**
 * NAMING CONVENTION FOR SCHEMAS
 * ==============================
 *
 * Input Schemas (for POST/PUT/PATCH requests):
 *   - Format: {Action}{Entity}Input
 *   - Example: CreateProductInput, UpdateProductInput
 *   - Use camelCase for fields (API layer)
 *
 * Query Schemas (for GET request parameters):
 *   - Format: {Action}{Entity}Query or List{Entity}Query
 *   - Example: ListProductsQuery, GetProductQuery
 *   - Use camelCase for fields (API layer)
 *
 * Response Schemas (for API responses):
 *   - Format: {Entity}Response or {Action}{Entity}Response
 *   - Example: ProductResponse, CreateProductResponse, ProductListResponse
 *   - Use camelCase for fields (API layer)
 *
 * Note: Use transformKeys() helper to convert DB snake_case to API camelCase
 */

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreateProductInput = z
    .object({
        name: z.string().min(1).max(255).openapi({
            description: "Product name",
            example: "Iced Lemon Tea",
        }),
        price: z.number().min(0).openapi({
            description: "Product price in currency units",
            example: 15000,
        }),
        imageUrl: z.string().url().nullable().optional().openapi({
            description: "URL to product image",
            example: "https://example.com/tea.jpg",
        }),
        isMain: z.boolean().optional().openapi({
            description: "Whether this is a main/featured product",
            example: false,
        }),
        // tenantId is NOT included in input - it's derived from session
    })
    .openapi({ title: "CreateProductInput" });

export const UpdateProductInput = z
    .object({
        id: UUIDSchema,
        name: z.string().min(1).max(255).optional().openapi({
            description: "Product name",
            example: "Iced Lemon Tea",
        }),
        price: z.number().min(0).optional().openapi({
            description: "Product price in currency units",
            example: 15000,
        }),
        imageUrl: z.string().url().nullable().optional().openapi({
            description: "URL to product image",
        }),
        isActive: z.boolean().optional().openapi({
            description: "Whether the product is active/available",
            example: true,
        }),
        isMain: z.boolean().optional().openapi({
            description: "Whether this is a main/featured product",
            example: false,
        }),
    })
    .openapi({ title: "UpdateProductInput" });

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListProductsQuery = z
    .object({
        all: z
            .string()
            .transform((val) => val === "true")
            .optional()
            .openapi({
                description: "Show all products including inactive ones",
                example: "true",
            }),
        // tenantId is NOT a query param - it's from the session
    })
    .openapi({ title: "ListProductsQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const ProductResponse = z
    .object({
        id: UUIDSchema,
        name: z.string(),
        price: z.number(),
        imageUrl: z.string().nullable(),
        isActive: z.boolean().nullable(),
        isMain: z.boolean(),
        tenantId: UUIDSchema, // ← Added for response
        createdAt: z.string().nullable(),
        updatedAt: z.string().nullable(),
    })
    .openapi({ title: "ProductResponse" });

export const ProductListResponse = z
    .object({
        products: z.array(ProductResponse),
    })
    .openapi({ title: "ProductListResponse" });

export const CreateProductResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        product: ProductResponse,
    })
    .openapi({ title: "CreateProductResponse" });

export const UpdateProductResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        product: ProductResponse,
    })
    .openapi({ title: "UpdateProductResponse" });

export const DeleteProductResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        product: ProductResponse,
    })
    .openapi({ title: "DeleteProductResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateProductInput = z.infer<typeof CreateProductInput>;
export type UpdateProductInput = z.infer<typeof UpdateProductInput>;
export type ListProductsQuery = z.infer<typeof ListProductsQuery>;
export type ProductResponse = z.infer<typeof ProductResponse>;
export type ProductListResponse = z.infer<typeof ProductListResponse>;
export type CreateProductResponse = z.infer<typeof CreateProductResponse>;
export type UpdateProductResponse = z.infer<typeof UpdateProductResponse>;
export type DeleteProductResponse = z.infer<typeof DeleteProductResponse>;

export type Product = z.infer<typeof ProductResponse>;
