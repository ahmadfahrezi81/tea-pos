// app/api/docs/route.ts
import { NextResponse } from "next/server";
import {
    OpenApiGeneratorV31,
    OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { registerOrderRoutes } from "@tea-pos/features/orders/openapi";
import { getBackendVersion } from "@tea-pos/features/shared/version";
import { registerTenantRoutes } from "@tea-pos/features/tenants/openapi";
import packageJson from "../../../package.json";

import { registerUserTenantAssignmentRoutes } from "@tea-pos/features/tenants/user-assignments-openapi";
import { registerTenantInviteRoutes } from "@tea-pos/features/tenants/invites-openapi";
import { registerProductRoutes } from "@tea-pos/features/products/openapi";
import { registerStoreRoutes } from "@tea-pos/features/stores/openapi";
import { registerExpenseRoutes } from "@tea-pos/features/expenses/openapi";
import { registerDailySummaryRoutes } from "@tea-pos/features/summaries/openapi";
import { registerAssignmentRoutes } from "@tea-pos/features/stores/user-assignments-openapi";
import { registerProfileRoutes } from "@tea-pos/features/profiles/openapi";
import { registerWeatherRoutes } from "@tea-pos/features/weather/openapi";
import { registerNotificationRoutes } from "@tea-pos/features/notifications/openapi";
import { registerDailySummaryPhotoRoutes } from "@tea-pos/features/summaries/photos-openapi";
import { registerPaymentRoutes } from "@tea-pos/features/payments/openapi";
import { registerCustomerFeedbackRoutes } from "@tea-pos/features/customer-feedbacks/openapi";

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
registerCustomerFeedbackRoutes(registry);

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
            description: `API for managing orders, products, and daily summaries\n\nBackend build: ${getBackendVersion(packageJson)}`,
        },
        servers: [{ url: "http://localhost:3000" }],
        tags: [{ name: "Orders", description: "Order management" }],
    });

    return NextResponse.json(docs);
}
