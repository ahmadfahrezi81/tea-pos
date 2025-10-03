// app/api/docs/route.ts
import { NextResponse } from "next/server";
import {
    OpenApiGeneratorV31,
    OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { registerOrderRoutes } from "@/lib/openapi/orders";
import { getBackendVersion } from "@/lib/version";
import { registerTenantRoutes } from "@/lib/openapi/tenants";
import { registerUserTenantAssignmentRoutes } from "@/lib/openapi/userTenantAssignments";
import { registerTenantInviteRoutes } from "@/lib/openapi/tenantInvites";

const registry = new OpenAPIRegistry();

// Register all route groups
registerOrderRoutes(registry);
// Future: registerProductRoutes(registry);
// Future: registerDailySummaryRoutes(registry);

registerTenantRoutes(registry);
registerUserTenantAssignmentRoutes(registry);
registerTenantInviteRoutes(registry);

export async function GET() {
    const generator = new OpenApiGeneratorV31(registry.definitions);

    const docs = generator.generateDocument({
        openapi: "3.0.0",
        info: {
            version: "1.0.0", // API contract version
            title: "POS System API",
            description: `API for managing orders, products, and daily summaries\n\nBackend build: ${getBackendVersion()}`,
        },
        servers: [{ url: "http://localhost:3000" }],
        tags: [{ name: "Orders", description: "Order management" }],
    });

    return NextResponse.json(docs);
}
