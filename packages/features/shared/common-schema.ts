// lib/schemas/common.ts
import { z } from "zod";

// Try to load the OpenAPI extension; if it fails, use a polyfill
let isOpenApiAvailable = false;

try {
  // eslint-disable-next-line global-require
  const { extendZodWithOpenApi } = require("@asteasolutions/zod-to-openapi");
  extendZodWithOpenApi(z);
  isOpenApiAvailable = true;
} catch (e) {
  // Package not available; add a polyfill
  const ZodType = Object.getPrototypeOf(z.string());
  if (!ZodType.openapi) {
    ZodType.openapi = function (config: any) {
      return this;
    };
  }
}

// Common reusable schemas
export const UUIDSchema = z.uuid().openapi({
    description: "UUID identifier",
    example: "123e4567-e89b-12d3-a456-426614174000",
});

export const TimestampSchema = z.iso.datetime().openapi({
    description: "ISO datetime string",
    example: "2024-01-01T00:00:00.000Z",
});

export const ErrorResponseSchema = z
    .object({
        error: z.string().openapi({ example: "Something went wrong" }),
        details: z.record(z.string(), z.any()).optional(),
    })
    .openapi({ title: "ErrorResponse" });

export const SuccessResponseSchema = z
    .object({
        success: z.boolean().openapi({ example: true }),
        message: z.string().optional(),
    })
    .openapi({ title: "SuccessResponse" });

export const DeleteByIdQuery = z.object({
    id: UUIDSchema,
});
