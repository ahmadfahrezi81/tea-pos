//lib/schemas/products.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

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
        imagePath: z.string().nullable().optional().openapi({
            description: "Storage path for product image",
            example: "product-images/abc123.jpg",
        }),
        categoryId: UUIDSchema.nullable().optional().openapi({
            description: "Product category ID",
            example: "123e4567-e89b-12d3-a456-426614174000",
        }),
        status: z.enum(["active", "inactive", "draft"]).optional().openapi({
            description: "Product status",
            example: "active",
        }),
        isMain: z.boolean().optional().openapi({
            description: "Whether this is a main/featured product (legacy)",
            example: false,
        }),
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
        imagePath: z.string().nullable().optional().openapi({
            description: "Storage path for product image",
        }),
        categoryId: UUIDSchema.nullable().optional().openapi({
            description: "Product category ID",
        }),
        status: z.enum(["active", "inactive", "draft"]).optional().openapi({
            description: "Product status",
            example: "active",
        }),
        isActive: z.boolean().optional().openapi({
            description: "Whether the product is active/available (legacy)",
            example: true,
        }),
        isMain: z.boolean().optional().openapi({
            description: "Whether this is a main/featured product (legacy)",
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
        categoryId: z.string().uuid().optional().openapi({
            description: "Filter by category ID",
            example: "123e4567-e89b-12d3-a456-426614174000",
        }),
        status: z.enum(["active", "inactive", "draft"]).optional().openapi({
            description: "Filter by status",
            example: "active",
        }),
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
        imagePath: z.string().nullable(), // NEW: Storage path for deletion
        categoryId: UUIDSchema.nullable(),
        categoryName: z.string().nullable(), // NEW: Added for joined data
        status: z.string().nullable(),
        isActive: z.boolean().nullable(),
        isMain: z.boolean(),
        tenantId: UUIDSchema,
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
