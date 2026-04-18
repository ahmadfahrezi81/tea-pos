// app/api/docs/route.ts
import { NextResponse } from "next/server";
import {
    OpenApiGeneratorV31,
    OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { registerOrderRoutes } from "@/lib/shared/openapi/orders";
import { getBackendVersion } from "@/lib/shared/version";
import { registerTenantRoutes } from "@/lib/shared/openapi/tenants";
import { registerUserTenantAssignmentRoutes } from "@/lib/shared/openapi/userTenantAssignments";
import { registerTenantInviteRoutes } from "@/lib/shared/openapi/tenantInvites";
import { registerProductRoutes } from "@/lib/shared/openapi/products";
import { registerStoreRoutes } from "@/lib/shared/openapi/stores";
import { registerExpenseRoutes } from "@/lib/shared/openapi/expenses";
import { registerDailySummaryRoutes } from "@/lib/shared/openapi/daily-summaries";
import { registerAssignmentRoutes } from "@/lib/shared/openapi/userStoreAssignments";
import { registerProfileRoutes } from "@/lib/shared/openapi/profiles";
import { registerWeatherRoutes } from "@/lib/shared/openapi/weather";
import { registerNotificationRoutes } from "@/lib/shared/openapi/notifications";
import { registerDailySummaryPhotoRoutes } from "@/lib/shared/openapi/daily-summary-photos";
import { registerPaymentRoutes } from "@/lib/shared/openapi/payments";

const registry = new OpenAPIRegistry();

// Register all route groups
registerOrderRoutes(registry);
registerProductRoutes(registry);
registerStoreRoutes(registry);
registerAssignmentRoutes(registry);
registerExpenseRoutes(registry);
registerDailySummaryRoutes(registry);
registerProfileRoutes(registry);
registerWeatherRoutes(registry);
registerNotificationRoutes(registry);
registerDailySummaryPhotoRoutes(registry);
registerPaymentRoutes(registry);

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
