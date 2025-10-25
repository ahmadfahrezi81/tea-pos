// // lib/schemas/profiles.ts
// import { z } from "zod";
// import { UUIDSchema } from "./common";

// /**
//  * NAMING CONVENTION FOR SCHEMAS
//  * ==============================
//  *
//  * Input Schemas (for POST/PUT/PATCH requests):
//  *   - Format: {Action}{Entity}Input
//  *   - Example: CreateProfileInput, UpdateProfileInput
//  *   - Use camelCase for fields (API layer)
//  *
//  * Query Schemas (for GET request parameters):
//  *   - Format: {Action}{Entity}Query or List{Entity}Query
//  *   - Example: ListProfilesQuery, GetProfileQuery
//  *   - Use camelCase for fields (API layer)
//  *
//  * Response Schemas (for API responses):
//  *   - Format: {Entity}Response or {Action}{Entity}Response
//  *   - Example: ProfileResponse, CreateProfileResponse, ProfileListResponse
//  *   - Use camelCase for fields (API layer)
//  *
//  * Note: Use transformKeys() helper to convert DB snake_case to API camelCase
//  */

// // ============================================================================
// // INPUT SCHEMAS
// // ============================================================================

// export const CreateProfileInput = z
//     .object({
//         email: z.string().email().openapi({
//             description: "User email address",
//             example: "user@example.com",
//         }),
//         fullName: z.string().min(1).openapi({
//             description: "User's full name",
//             example: "John Doe",
//         }),
//         role: z.string().openapi({
//             description: "User role",
//             example: "seller",
//         }),
//     })
//     .openapi({ title: "CreateProfileInput" });

// export const UpdateProfileInput = z
//     .object({
//         email: z.string().email().optional().openapi({
//             description: "User email address",
//             example: "user@example.com",
//         }),
//         fullName: z.string().min(1).optional().openapi({
//             description: "User's full name",
//             example: "John Doe",
//         }),
//         role: z.string().optional().openapi({
//             description: "User role",
//             example: "manager",
//         }),
//     })
//     .openapi({ title: "UpdateProfileInput" });

// // ============================================================================
// // QUERY SCHEMAS
// // ============================================================================

// export const GetProfileQuery = z
//     .object({
//         userId: UUIDSchema.optional().openapi({
//             description: "Filter by user ID",
//         }),
//     })
//     .openapi({ title: "GetProfileQuery" });

// export const ListProfilesQuery = z
//     .object({
//         role: z.string().optional().openapi({
//             description: "Filter profiles by role",
//             example: "seller",
//         }),
//     })
//     .openapi({ title: "ListProfilesQuery" });

// // ============================================================================
// // RESPONSE SCHEMAS
// // ============================================================================

// export const ProfileResponse = z
//     .object({
//         id: UUIDSchema,
//         email: z.string(),
//         fullName: z.string(),
//         role: z.string(),
//         createdAt: z.string().nullable(),
//         updatedAt: z.string().nullable(),
//     })
//     .openapi({ title: "ProfileResponse" });

// export const ProfileListResponse = z
//     .object({
//         profiles: z.array(ProfileResponse),
//     })
//     .openapi({ title: "ProfileListResponse" });

// export const CreateProfileResponse = z
//     .object({
//         success: z.boolean().openapi({ example: true }),
//         profileId: UUIDSchema,
//     })
//     .openapi({ title: "CreateProfileResponse" });

// export const UpdateProfileResponse = z
//     .object({
//         success: z.boolean().openapi({ example: true }),
//         profile: ProfileResponse,
//     })
//     .openapi({ title: "UpdateProfileResponse" });

// // ============================================================================
// // TYPE EXPORTS
// // ============================================================================

// export type CreateProfileInput = z.infer<typeof CreateProfileInput>;
// export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>;
// export type GetProfileQuery = z.infer<typeof GetProfileQuery>;
// export type ListProfilesQuery = z.infer<typeof ListProfilesQuery>;
// export type ProfileResponse = z.infer<typeof ProfileResponse>;
// export type ProfileListResponse = z.infer<typeof ProfileListResponse>;
// export type CreateProfileResponse = z.infer<typeof CreateProfileResponse>;
// export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponse>;

// export type Profile = z.infer<typeof ProfileResponse>;

// lib/schemas/profiles.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

/**
 * NAMING CONVENTION FOR SCHEMAS
 * ==============================
 *
 * Input Schemas (for POST/PUT/PATCH requests):
 *   - Format: {Action}{Entity}Input
 *   - Example: CreateProfileInput, UpdateProfileInput
 *   - Use camelCase for fields (API layer)
 *
 * Query Schemas (for GET request parameters):
 *   - Format: {Action}{Entity}Query or List{Entity}Query
 *   - Example: ListProfilesQuery, GetProfileQuery
 *   - Use camelCase for fields (API layer)
 *
 * Response Schemas (for API responses):
 *   - Format: {Entity}Response or {Action}{Entity}Response
 *   - Example: ProfileResponse, CreateProfileResponse, ProfileListResponse
 *   - Use camelCase for fields (API layer)
 *
 * Note: Use transformKeys() helper to convert DB snake_case to API camelCase
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const PROFILE_STATUSES = [
    "active",
    "inactive",
    "pending",
    "suspended",
] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreateProfileInput = z
    .object({
        email: z.string().email().openapi({
            description: "User email address",
            example: "user@example.com",
        }),
        fullName: z.string().min(1).openapi({
            description: "User's full name",
            example: "John Doe",
        }),
        role: z.string().openapi({
            description: "User role",
            example: "seller",
        }),
        phoneNumber: z
            .string()
            .regex(/^\+?[1-9]\d{1,14}$/)
            .optional()
            .openapi({
                description:
                    "User phone number with country code (E.164 format)",
                example: "+6281234567890",
            }),
        status: z.enum(PROFILE_STATUSES).default("active").openapi({
            description: "User account status",
            example: "active",
        }),
    })
    .openapi({ title: "CreateProfileInput" });

export const UpdateProfileInput = z
    .object({
        email: z.string().email().optional().openapi({
            description: "User email address",
            example: "user@example.com",
        }),
        fullName: z.string().min(1).optional().openapi({
            description: "User's full name",
            example: "John Doe",
        }),
        role: z.string().optional().openapi({
            description: "User role",
            example: "manager",
        }),
        phoneNumber: z
            .string()
            .regex(/^\+?[1-9]\d{1,14}$/)
            .optional()
            .openapi({
                description:
                    "User phone number with country code (E.164 format)",
                example: "+6281234567890",
            }),
        status: z.enum(PROFILE_STATUSES).optional().openapi({
            description: "User account status",
            example: "active",
        }),
    })
    .openapi({ title: "UpdateProfileInput" });

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const GetProfileQuery = z
    .object({
        userId: UUIDSchema.optional().openapi({
            description: "Filter by user ID",
        }),
    })
    .openapi({ title: "GetProfileQuery" });

export const ListProfilesQuery = z
    .object({
        role: z.string().optional().openapi({
            description: "Filter profiles by role",
            example: "seller",
        }),
        status: z.enum(PROFILE_STATUSES).optional().openapi({
            description: "Filter profiles by status",
            example: "active",
        }),
    })
    .openapi({ title: "ListProfilesQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const ProfileResponse = z
    .object({
        id: UUIDSchema,
        email: z.string(),
        fullName: z.string(),
        role: z.string(),
        phoneNumber: z.string().nullable(),
        status: z.enum(PROFILE_STATUSES),
        createdAt: z.string().nullable(),
        updatedAt: z.string().nullable(),
    })
    .openapi({ title: "ProfileResponse" });

export const ProfileListResponse = z
    .object({
        profiles: z.array(ProfileResponse),
    })
    .openapi({ title: "ProfileListResponse" });

export const CreateProfileResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        profileId: UUIDSchema,
    })
    .openapi({ title: "CreateProfileResponse" });

export const UpdateProfileResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        profile: ProfileResponse,
    })
    .openapi({ title: "UpdateProfileResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateProfileInput = z.infer<typeof CreateProfileInput>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>;
export type GetProfileQuery = z.infer<typeof GetProfileQuery>;
export type ListProfilesQuery = z.infer<typeof ListProfilesQuery>;
export type ProfileResponse = z.infer<typeof ProfileResponse>;
export type ProfileListResponse = z.infer<typeof ProfileListResponse>;
export type CreateProfileResponse = z.infer<typeof CreateProfileResponse>;
export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponse>;

export type Profile = z.infer<typeof ProfileResponse>;
