// lib/schemas/users.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

/**
 * NAMING CONVENTION FOR SCHEMAS
 * ==============================
 *
 * Input Schemas (for POST/PUT/PATCH requests):
 *   - Format: {Action}{Entity}Input
 *   - Example: CreateUserInput
 *   - Use camelCase for fields (API layer)
 *
 * Response Schemas (for API responses):
 *   - Format: {Entity}Response or {Action}{Entity}Response
 *   - Example: CreateUserResponse
 *   - Use camelCase for fields (API layer)
 */

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreateUserInput = z
    .object({
        fullName: z.string().min(1, "Full name is required").openapi({
            description: "User's full name",
            example: "John Doe",
        }),
        email: z.string().email("Invalid email address").openapi({
            description: "User's email address",
            example: "john.doe@example.com",
        }),
        role: z.enum(["owner", "manager", "staff"]).openapi({
            description: "User's role in the tenant",
            example: "staff",
        }),
        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .openapi({
                description: "User's password",
                example: "SecureP@ssw0rd",
            }),
        confirmPassword: z.string().openapi({
            description: "Password confirmation",
            example: "SecureP@ssw0rd",
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    })
    .openapi({ title: "CreateUserInput" });

export const UpdateUserInput = z
    .object({
        fullName: z
            .string()
            .min(1, "Full name is required")
            .optional()
            .openapi({
                description: "User's full name",
                example: "John Doe",
            }),
        role: z.enum(["owner", "manager", "staff"]).optional().openapi({
            description: "User's role in the tenant",
            example: "manager",
        }),
    })
    .openapi({ title: "UpdateUserInput" });

// export const UpdateUserInputWithId = z
//     .object({
//         userId: UUIDSchema.openapi({
//             description: "User ID to update",
//         }),
//         fullName: z
//             .string()
//             .min(1, "Full name is required")
//             .optional()
//             .openapi({
//                 description: "User's full name",
//                 example: "John Doe",
//             }),
//         role: z.enum(["owner", "manager", "staff"]).optional().openapi({
//             description: "User's role in the tenant",
//             example: "manager",
//         }),
//     })
//     .openapi({ title: "UpdateUserInputWithId" });
export const UpdateUserInputWithId = UpdateUserInput.extend({
    userId: UUIDSchema.openapi({
        description: "User ID to update",
    }),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const CreateUserResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        userId: UUIDSchema.openapi({
            description: "Created user's ID",
        }),
        email: z.string().email().openapi({
            description: "User's email",
            example: "john.doe@example.com",
        }),
        message: z.string().openapi({
            description: "Success message",
            example: "User created successfully",
        }),
    })
    .openapi({ title: "CreateUserResponse" });

export const UpdateUserResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        userId: UUIDSchema.openapi({
            description: "Updated user's ID",
        }),
        message: z.string().openapi({
            description: "Success message",
            example: "User updated successfully",
        }),
    })
    .openapi({ title: "UpdateUserResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateUserInput = z.infer<typeof CreateUserInput>;
export type UpdateUserInput = z.infer<typeof UpdateUserInput>;
export type UpdateUserInputWithId = z.infer<typeof UpdateUserInputWithId>;
export type CreateUserResponse = z.infer<typeof CreateUserResponse>;
export type UpdateUserResponse = z.infer<typeof UpdateUserResponse>;
