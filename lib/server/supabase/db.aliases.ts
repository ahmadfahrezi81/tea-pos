// db.aliases.ts
import type { Tables, TablesInsert, TablesUpdate } from "./db.types";

// --- Daily Summaries ---
export type DailySummary = Tables<"daily_summaries">;
export type DailySummaryInsert = TablesInsert<"daily_summaries">;
export type DailySummaryUpdate = TablesUpdate<"daily_summaries">;

// --- Expenses ---
export type Expense = Tables<"expenses">;
export type ExpenseInsert = TablesInsert<"expenses">;
export type ExpenseUpdate = TablesUpdate<"expenses">;

// --- Order Items ---
export type OrderItem = Tables<"order_items">;
export type OrderItemInsert = TablesInsert<"order_items">;
export type OrderItemUpdate = TablesUpdate<"order_items">;

// --- Orders ---
export type Order = Tables<"orders">;
export type OrderInsert = TablesInsert<"orders">;
export type OrderUpdate = TablesUpdate<"orders">;

// --- Products ---
export type Product = Tables<"products">;
export type ProductInsert = TablesInsert<"products">;
export type ProductUpdate = TablesUpdate<"products">;

// --- Profiles ---
export type Profile = Tables<"profiles">;
export type ProfileInsert = TablesInsert<"profiles">;
export type ProfileUpdate = TablesUpdate<"profiles">;

// --- Stores ---
export type Store = Tables<"stores">;
export type StoreInsert = TablesInsert<"stores">;
export type StoreUpdate = TablesUpdate<"stores">;

// --- User Store Assignments ---
export type UserStoreAssignment = Tables<"user_store_assignments">;
export type UserStoreAssignmentInsert = TablesInsert<"user_store_assignments">;
export type UserStoreAssignmentUpdate = TablesUpdate<"user_store_assignments">;
