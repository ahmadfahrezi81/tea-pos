// app/api/docs/route.ts
import { NextResponse } from "next/server";
import {
    OpenApiGeneratorV31,
    OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { registerOrderRoutes } from "@/lib/openapi/orders";

const registry = new OpenAPIRegistry();

// Register all route groups
registerOrderRoutes(registry);
// Future: registerProductRoutes(registry);
// Future: registerDailySummaryRoutes(registry);

export async function GET() {
    const generator = new OpenApiGeneratorV31(registry.definitions);

    const docs = generator.generateDocument({
        openapi: "3.0.0",
        info: {
            version: "1.0.0",
            title: "POS System API",
            description:
                "API for managing orders, products, and daily summaries",
        },
        servers: [{ url: "http://localhost:3000" }],
        tags: [{ name: "Orders", description: "Order management" }],
    });

    return NextResponse.json(docs);
}
