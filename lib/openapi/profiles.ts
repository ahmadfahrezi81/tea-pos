// lib/openapi/profiles.ts - Route registrations (separate from docs route)
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
    GetProfileQuery,
    ProfileResponse,
    ListProfilesQuery,
    ProfileListResponse,
    CreateProfileInput,
    CreateProfileResponse,
    UpdateProfileInput,
    UpdateProfileResponse,
    ErrorResponseSchema,
} from "../schemas/index";

export function registerProfileRoutes(registry: OpenAPIRegistry) {
    // Register GET /api/profiles/:id (Get single profile)
    registry.registerPath({
        method: "get",
        path: "/api/profiles/{id}",
        description: "Get profile by ID",
        summary: "Retrieve a single user profile",
        tags: ["Profiles"],
        request: {
            params: GetProfileQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: ProfileResponse },
                },
            },
            404: {
                description: "Profile not found",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // Register GET /api/profiles (List all profiles)
    registry.registerPath({
        method: "get",
        path: "/api/profiles",
        description: "Get profiles",
        summary: "Retrieve all user profiles with optional filtering",
        tags: ["Profiles"],
        request: {
            query: ListProfilesQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: ProfileListResponse },
                },
            },
            400: {
                description: "Bad Request",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // Register POST /api/profiles (Create profile)
    registry.registerPath({
        method: "post",
        path: "/api/profiles",
        description: "Create profile",
        summary: "Create a new user profile",
        tags: ["Profiles"],
        request: {
            body: {
                content: { "application/json": { schema: CreateProfileInput } },
            },
        },
        responses: {
            201: {
                description: "Created",
                content: {
                    "application/json": { schema: CreateProfileResponse },
                },
            },
            400: {
                description: "Bad Request",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // Register PATCH /api/profiles/:id (Update profile)
    registry.registerPath({
        method: "patch",
        path: "/api/profiles/{id}",
        description: "Update profile",
        summary: "Update an existing user profile",
        tags: ["Profiles"],
        request: {
            params: GetProfileQuery,
            body: {
                content: { "application/json": { schema: UpdateProfileInput } },
            },
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: UpdateProfileResponse },
                },
            },
            400: {
                description: "Bad Request",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            404: {
                description: "Profile not found",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });
}
