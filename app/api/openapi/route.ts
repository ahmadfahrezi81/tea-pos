import { NextResponse } from "next/server";

const spec = {
    openapi: "3.0.0",
    info: {
        title: "Tea POS API",
        version: "1.0.0",
        description:
            "API documentation for the Tea POS system - a comprehensive point of sale solution for tea stores.",
    },
    servers: [
        {
            url: "/api",
            description: "API Base URL",
        },
    ],
    components: {
        securitySchemes: {
            supabaseAuth: {
                type: "http",
                scheme: "bearer",
                description: "Supabase JWT token obtained from authentication",
            },
        },
        schemas: {
            Product: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    name: { type: "string" },
                    price: { type: "number", format: "float" },
                    is_active: { type: "boolean", default: true },
                    image_url: { type: "string", nullable: true },
                    is_main: { type: "boolean", default: false },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                },
                required: [
                    "id",
                    "name",
                    "price",
                    "is_active",
                    "is_main",
                    "created_at",
                    "updated_at",
                ],
            },
            ProductInput: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    price: { type: "number", format: "float" },
                    image_url: { type: "string", nullable: true },
                    is_main: { type: "boolean", default: false },
                },
                required: ["name", "price"],
            },
            ProductUpdate: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    name: { type: "string" },
                    price: { type: "number", format: "float" },
                    image_url: { type: "string", nullable: true },
                    is_active: { type: "boolean" },
                    is_main: { type: "boolean" },
                },
                required: ["id"],
            },
            Order: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    store_id: { type: "string", format: "uuid" },
                    user_id: { type: "string", format: "uuid" },
                    total_amount: { type: "number", format: "float" },
                    created_at: { type: "string", format: "date-time" },
                    stores: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                        },
                    },
                    profiles: {
                        type: "object",
                        properties: {
                            full_name: { type: "string" },
                        },
                    },
                    order_items: {
                        type: "array",
                        items: {
                            $ref: "#/components/schemas/OrderItemWithProduct",
                        },
                    },
                },
                required: [
                    "id",
                    "store_id",
                    "user_id",
                    "total_amount",
                    "created_at",
                ],
            },
            OrderInput: {
                type: "object",
                properties: {
                    storeId: { type: "string", format: "uuid" },
                    items: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                productId: { type: "string", format: "uuid" },
                                quantity: { type: "integer", minimum: 1 },
                                unitPrice: { type: "number", format: "float" },
                            },
                            required: ["productId", "quantity", "unitPrice"],
                        },
                    },
                },
                required: ["storeId", "items"],
            },
            OrderItem: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    order_id: { type: "string", format: "uuid" },
                    product_id: { type: "string", format: "uuid" },
                    quantity: { type: "integer" },
                    unit_price: { type: "number", format: "float" },
                    total_price: { type: "number", format: "float" },
                    created_at: { type: "string", format: "date-time" },
                },
                required: [
                    "id",
                    "order_id",
                    "product_id",
                    "quantity",
                    "unit_price",
                    "total_price",
                    "created_at",
                ],
            },
            OrderItemWithProduct: {
                allOf: [
                    { $ref: "#/components/schemas/OrderItem" },
                    {
                        type: "object",
                        properties: {
                            products: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                },
                            },
                        },
                    },
                ],
            },
            Expense: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    daily_summary_id: { type: "string", format: "uuid" },
                    store_id: { type: "string", format: "uuid" },
                    expense_type: { type: "string" },
                    amount: { type: "integer" },
                    created_at: { type: "string", format: "date-time" },
                },
                required: [
                    "id",
                    "daily_summary_id",
                    "store_id",
                    "expense_type",
                    "amount",
                    "created_at",
                ],
            },
            ExpenseInput: {
                type: "object",
                properties: {
                    dailySummaryId: { type: "string", format: "uuid" },
                    storeId: { type: "string", format: "uuid" },
                    expenses: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                label: { type: "string" },
                                customLabel: { type: "string" },
                                amount: { type: "string" },
                            },
                            required: ["label", "amount"],
                        },
                    },
                },
                required: ["dailySummaryId", "storeId", "expenses"],
            },
            ExpenseUpdate: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    expense_type: { type: "string" },
                    amount: { type: "string" },
                },
                required: ["id"],
            },
            Store: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    name: { type: "string" },
                    address: { type: "string", nullable: true },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                },
                required: ["id", "name", "created_at", "updated_at"],
            },
            StoreInput: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    address: { type: "string" },
                },
                required: ["name"],
            },
            StoreUpdate: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    name: { type: "string" },
                    address: { type: "string" },
                },
                required: ["id", "name"],
            },
            Profile: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    full_name: { type: "string" },
                    email: { type: "string", format: "email" },
                },
                required: ["id", "full_name", "email"],
            },
            UserStoreAssignment: {
                type: "object",
                properties: {
                    user_id: { type: "string", format: "uuid" },
                    store_id: { type: "string", format: "uuid" },
                    role: { type: "string", enum: ["seller", "manager"] },
                    is_default: { type: "boolean", default: false },
                },
                required: ["user_id", "store_id", "role"],
            },
            DailySummary: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    store_id: { type: "string", format: "uuid" },
                    seller_id: { type: "string", format: "uuid" },
                    manager_id: {
                        type: "string",
                        format: "uuid",
                        nullable: true,
                    },
                    date: { type: "string", format: "date" },
                    opening_balance: { type: "number", format: "float" },
                    total_sales: { type: "number", format: "float" },
                    expected_cash: { type: "number", format: "float" },
                    actual_cash: {
                        type: "number",
                        format: "float",
                        nullable: true,
                    },
                    variance: {
                        type: "number",
                        format: "float",
                        nullable: true,
                    },
                    closed_at: {
                        type: "string",
                        format: "date-time",
                        nullable: true,
                    },
                    notes: { type: "string", nullable: true },
                    created_at: { type: "string", format: "date-time" },
                    stores: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                        },
                    },
                    manager: {
                        type: "object",
                        properties: {
                            full_name: { type: "string" },
                        },
                    },
                    seller: {
                        type: "object",
                        properties: {
                            full_name: { type: "string" },
                        },
                    },
                    expenses: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Expense" },
                    },
                    total_expenses: { type: "number", format: "float" },
                },
                required: [
                    "id",
                    "store_id",
                    "seller_id",
                    "date",
                    "opening_balance",
                    "total_sales",
                    "expected_cash",
                    "created_at",
                ],
            },
            DailySummaryInput: {
                type: "object",
                properties: {
                    storeId: { type: "string", format: "uuid" },
                    sellerId: { type: "string", format: "uuid" },
                    managerId: { type: "string", format: "uuid" },
                    date: { type: "string", format: "date" },
                    openingBalance: { type: "number", format: "float" },
                },
                required: ["storeId", "sellerId", "date"],
            },
            Error: {
                type: "object",
                properties: {
                    error: { type: "string" },
                },
                required: ["error"],
            },
            Success: {
                type: "object",
                properties: {
                    success: { type: "boolean" },
                },
                required: ["success"],
            },
        },
    },
    paths: {
        "/orders": {
            get: {
                summary: "Get all orders",
                description:
                    "Retrieve all orders with related store, user, and order items information. Can be filtered by store ID.",
                parameters: [
                    {
                        name: "storeId",
                        in: "query",
                        description: "Filter orders by store ID",
                        required: false,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: {
                    "200": {
                        description: "List of orders retrieved successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        orders: {
                                            type: "array",
                                            items: {
                                                $ref: "#/components/schemas/Order",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
            post: {
                summary: "Create a new order",
                description:
                    "Create a new order with multiple items. Requires authentication.",
                security: [{ supabaseAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/OrderInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Order created successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean" },
                                        orderId: {
                                            type: "string",
                                            format: "uuid",
                                        },
                                        totalAmount: {
                                            type: "number",
                                            format: "float",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request - missing required fields",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "401": {
                        description: "Unauthorized - authentication required",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/products": {
            get: {
                summary: "Get all products",
                description:
                    "Retrieve all products. By default returns only active products, use 'all=true' to include inactive products.",
                parameters: [
                    {
                        name: "all",
                        in: "query",
                        description:
                            "Set to 'true' to include inactive products",
                        required: false,
                        schema: { type: "string", enum: ["true", "false"] },
                    },
                ],
                responses: {
                    "200": {
                        description: "List of products retrieved successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        products: {
                                            type: "array",
                                            items: {
                                                $ref: "#/components/schemas/Product",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
            post: {
                summary: "Create a new product",
                description: "Create a new product. Requires authentication.",
                security: [{ supabaseAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ProductInput",
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Product created successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean" },
                                        product: {
                                            $ref: "#/components/schemas/Product",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request - missing required fields",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "401": {
                        description: "Unauthorized - authentication required",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
            put: {
                summary: "Update a product",
                description:
                    "Update an existing product. Requires authentication.",
                security: [{ supabaseAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ProductUpdate",
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Product updated successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean" },
                                        product: {
                                            $ref: "#/components/schemas/Product",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request - invalid product ID or data",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "401": {
                        description: "Unauthorized - authentication required",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
            delete: {
                summary: "Delete a product",
                description:
                    "Delete an existing product. Requires authentication.",
                security: [{ supabaseAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    id: { type: "string", format: "uuid" },
                                },
                                required: ["id"],
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Product deleted successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean" },
                                        product: {
                                            $ref: "#/components/schemas/Product",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request - product ID required",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "401": {
                        description: "Unauthorized - authentication required",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/expenses": {
            get: {
                summary: "Get expenses",
                description:
                    "Retrieve expenses filtered by various parameters. Can fetch by specific daily summary, or by store and month.",
                parameters: [
                    {
                        name: "storeId",
                        in: "query",
                        description:
                            "Filter expenses by store ID (required with month)",
                        required: false,
                        schema: { type: "string", format: "uuid" },
                    },
                    {
                        name: "month",
                        in: "query",
                        description:
                            "Filter expenses by month in YYYY-MM format (required with storeId)",
                        required: false,
                        schema: { type: "string", pattern: "^\\d{4}-\\d{2}$" },
                    },
                    {
                        name: "dailySummaryId",
                        in: "query",
                        description:
                            "Get expenses for a specific daily summary",
                        required: false,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: {
                    "200": {
                        description: "Expenses retrieved successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    oneOf: [
                                        {
                                            description:
                                                "Response when filtering by dailySummaryId",
                                            type: "object",
                                            properties: {
                                                expenses: {
                                                    type: "array",
                                                    items: {
                                                        $ref: "#/components/schemas/Expense",
                                                    },
                                                },
                                            },
                                        },
                                        {
                                            description:
                                                "Response when filtering by storeId and month",
                                            type: "object",
                                            properties: {
                                                expensesByDate: {
                                                    type: "object",
                                                    additionalProperties: {
                                                        type: "array",
                                                        items: {
                                                            $ref: "#/components/schemas/Expense",
                                                        },
                                                    },
                                                },
                                                totalsByType: {
                                                    type: "object",
                                                    additionalProperties: {
                                                        type: "number",
                                                    },
                                                },
                                                totalExpenses: {
                                                    type: "number",
                                                },
                                                expenses: {
                                                    type: "array",
                                                    items: {
                                                        $ref: "#/components/schemas/Expense",
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    "400": {
                        description:
                            "Bad request - missing required parameters",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
            post: {
                summary: "Create expenses",
                description:
                    "Create multiple expenses for a daily summary. Automatically updates the daily summary's expected cash.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ExpenseInput",
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Expenses created successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        expenses: {
                                            type: "array",
                                            items: {
                                                $ref: "#/components/schemas/Expense",
                                            },
                                        },
                                        totalExpenseAmount: { type: "number" },
                                        newExpectedCash: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request - missing required fields",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
            put: {
                summary: "Update an expense",
                description:
                    "Update an existing expense. Automatically recalculates the daily summary's expected cash.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ExpenseUpdate",
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Expense updated successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/Expense",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request - expense ID required",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
            delete: {
                summary: "Delete an expense",
                description:
                    "Delete an existing expense. Automatically recalculates the daily summary's expected cash.",
                parameters: [
                    {
                        name: "id",
                        in: "query",
                        description: "ID of the expense to delete",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: {
                    "200": {
                        description: "Expense deleted successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/Success",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request - expense ID required",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/store": {
            get: {
                summary: "Get stores with assignments",
                description:
                    "Retrieve all stores with user assignments, or filter by specific user ID. Returns stores, users, and assignment relationships.",
                parameters: [
                    {
                        name: "user_id",
                        in: "query",
                        description:
                            "Filter by specific user ID to get only their assigned stores",
                        required: false,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: {
                    "200": {
                        description: "Stores data retrieved successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        stores: {
                                            type: "array",
                                            items: {
                                                $ref: "#/components/schemas/Store",
                                            },
                                        },
                                        users: {
                                            type: "array",
                                            items: {
                                                $ref: "#/components/schemas/Profile",
                                            },
                                        },
                                        assignments: {
                                            type: "object",
                                            description:
                                                "Assignments grouped by store ID",
                                            additionalProperties: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        user_id: {
                                                            type: "string",
                                                            format: "uuid",
                                                        },
                                                        role: {
                                                            type: "string",
                                                            enum: [
                                                                "seller",
                                                                "manager",
                                                            ],
                                                        },
                                                        is_default: {
                                                            type: "boolean",
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
            post: {
                summary: "Create a new store",
                description:
                    "Create a new store with name and optional address.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/StoreInput" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Store created successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Store" },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request - store name required",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
            put: {
                summary: "Update a store",
                description: "Update an existing store's information.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/StoreUpdate",
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Store updated successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Store" },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request - store ID and name required",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
            delete: {
                summary: "Delete a store",
                description:
                    "Delete an existing store and all its assignments.",
                parameters: [
                    {
                        name: "id",
                        in: "query",
                        description: "ID of the store to delete",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                ],
                responses: {
                    "200": {
                        description: "Store deleted successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/Success",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request - store ID required",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/store/assignments": {
            post: {
                summary: "Create or update user store assignment",
                description:
                    "Assign a user to a store with a specific role. If setting as default, other defaults for the user are unset.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/UserStoreAssignment",
                            },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Assignment created successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/UserStoreAssignment",
                                },
                            },
                        },
                    },
                    "400": {
                        description:
                            "Bad request - missing required fields or invalid role",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "409": {
                        description: "Conflict - assignment already exists",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
            put: {
                summary: "Update assignment default status",
                description:
                    "Update an existing assignment, mainly used for setting/unsetting default store.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    user_id: { type: "string", format: "uuid" },
                                    store_id: {
                                        type: "string",
                                        format: "uuid",
                                    },
                                    role: {
                                        type: "string",
                                        enum: ["seller", "manager"],
                                    },
                                    is_default: { type: "boolean" },
                                },
                                required: ["user_id", "store_id", "role"],
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Assignment updated successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/UserStoreAssignment",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request - missing required fields",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
            delete: {
                summary: "Remove user store assignment",
                description: "Remove a user's assignment from a store.",
                parameters: [
                    {
                        name: "user_id",
                        in: "query",
                        description: "User ID",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                    {
                        name: "store_id",
                        in: "query",
                        description: "Store ID",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                    {
                        name: "role",
                        in: "query",
                        description: "User role",
                        required: true,
                        schema: { type: "string", enum: ["seller", "manager"] },
                    },
                ],
                responses: {
                    "200": {
                        description: "Assignment removed successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/Success",
                                },
                            },
                        },
                    },
                    "400": {
                        description:
                            "Bad request - missing required parameters",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
        "/summaries": {
            get: {
                summary: "Get monthly summaries and analytics",
                description:
                    "Retrieve comprehensive monthly data including daily summaries, product breakdown, orders, expenses, and monthly totals for a specific store and month.",
                parameters: [
                    {
                        name: "storeId",
                        in: "query",
                        description: "Store ID to get summaries for",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                    },
                    {
                        name: "month",
                        in: "query",
                        description: "Month in YYYY-MM format",
                        required: true,
                        schema: { type: "string", pattern: "^\\d{4}-\\d{2}$" },
                    },
                ],
                responses: {
                    "200": {
                        description:
                            "Monthly summaries and analytics retrieved successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        summaries: {
                                            type: "array",
                                            items: {
                                                $ref: "#/components/schemas/DailySummary",
                                            },
                                        },
                                        productBreakdown: {
                                            type: "object",
                                            description:
                                                "Product sales breakdown by date",
                                            additionalProperties: {
                                                type: "object",
                                                additionalProperties: {
                                                    type: "object",
                                                    properties: {
                                                        quantity: {
                                                            type: "integer",
                                                        },
                                                        revenue: {
                                                            type: "number",
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        ordersByDate: {
                                            type: "object",
                                            description:
                                                "Orders grouped by date",
                                            additionalProperties: {
                                                type: "array",
                                                items: {
                                                    $ref: "#/components/schemas/Order",
                                                },
                                            },
                                        },
                                        expensesByDate: {
                                            type: "object",
                                            description:
                                                "Expenses grouped by date",
                                            additionalProperties: {
                                                type: "array",
                                                items: {
                                                    $ref: "#/components/schemas/Expense",
                                                },
                                            },
                                        },
                                        monthlyTotals: {
                                            type: "object",
                                            properties: {
                                                totalSales: {
                                                    type: "number",
                                                    description:
                                                        "Total sales amount for the month",
                                                },
                                                totalOrders: {
                                                    type: "integer",
                                                    description:
                                                        "Total number of orders",
                                                },
                                                totalCups: {
                                                    type: "integer",
                                                    description:
                                                        "Total cups/items sold",
                                                },
                                                totalExpenses: {
                                                    type: "number",
                                                    description:
                                                        "Total expenses for the month",
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request - storeId and month required",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
            post: {
                summary: "Create a daily summary",
                description:
                    "Create a new daily summary for a specific store and date. Automatically calculates initial sales and expected cash.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/DailySummaryInput",
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Daily summary created successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/DailySummary",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request - missing required fields",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "409": {
                        description:
                            "Conflict - daily summary already exists for this date",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
            put: {
                summary: "Update a daily summary",
                description:
                    "Update an existing daily summary. When updating opening balance, automatically recalculates expected cash including expenses.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    id: { type: "string", format: "uuid" },
                                    opening_balance: { type: "number" },
                                    actual_cash: { type: "number" },
                                    variance: { type: "number" },
                                    closed_at: {
                                        type: "string",
                                        format: "date-time",
                                    },
                                    notes: { type: "string" },
                                },
                                required: ["id"],
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Daily summary updated successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/DailySummary",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request - summary ID required",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                    "500": {
                        description: "Internal server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Error" },
                            },
                        },
                    },
                },
            },
        },
    },
};

export async function GET() {
    return NextResponse.json(spec);
}
