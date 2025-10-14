// app/[tenantSlug]/admin/orders/_components/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    MoreHorizontal,
    Copy,
    Eye,
    Trash2,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { OrderListItem } from "@/lib/schemas/order-list";
import { format } from "date-fns";

const formatOrderId = (id: string): string => {
    return `ORD-${id.substring(0, 8).toUpperCase()}`;
};

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(amount);
};

// Factory function to create columns with callbacks
export const createColumns = (
    onView: (order: OrderListItem) => void,
    onDelete: (order: OrderListItem) => void
): ColumnDef<OrderListItem>[] => [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) =>
                    table.toggleAllPageRowsSelected(!!value)
                }
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "id",
        id: "orderId",
        header: () => {
            return <div className="font-semibold pl-3">Order ID</div>;
        },
        cell: ({ row }) => (
            <div className="font-mono text-sm">
                {formatOrderId(row.original.id)}
            </div>
        ),
        enableSorting: false,
    },
    {
        accessorKey: "seller.fullName",
        id: "sellerName",
        header: () => {
            return <div className="font-semibold pl-3">Seller Name</div>;
        },
        cell: ({ row }) => (
            <div className="font-medium">
                {row.original.seller?.fullName || "N/A"}
            </div>
        ),
        enableSorting: false,
    },
    {
        accessorKey: "totalAmount",
        id: "total",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-auto p-0 hover:bg-transparent justify-start font-semibold"
                        >
                            Total
                            {isSorted === "asc" ? (
                                <ArrowUp className="ml-2 h-3 w-3" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="ml-2 h-3 w-3" />
                            ) : (
                                <ArrowUpDown className="ml-2 h-3 w-3" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem
                            onClick={() => column.toggleSorting(false)}
                        >
                            <ArrowUp className="mr-2 h-3 w-3" />
                            Asc
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => column.toggleSorting(true)}
                        >
                            <ArrowDown className="mr-2 h-3 w-3" />
                            Desc
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
        cell: ({ row }) => (
            <div className="font-semibold">
                {formatCurrency(row.original.totalAmount)}
            </div>
        ),
    },
    {
        accessorKey: "totalQuantity",
        id: "quantity",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-auto p-0 hover:bg-transparent justify-start font-semibold"
                        >
                            Quantity
                            {isSorted === "asc" ? (
                                <ArrowUp className="ml-2 h-3 w-3" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="ml-2 h-3 w-3" />
                            ) : (
                                <ArrowUpDown className="ml-2 h-3 w-3" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem
                            onClick={() => column.toggleSorting(false)}
                        >
                            <ArrowUp className="mr-2 h-3 w-3" />
                            Asc
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => column.toggleSorting(true)}
                        >
                            <ArrowDown className="mr-2 h-3 w-3" />
                            Desc
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
        cell: ({ row }) => <div className="">{row.original.totalQuantity}</div>,
    },
    {
        accessorKey: "items",
        id: "items",
        header: () => {
            return <div className="font-semibold pl-3">Items</div>;
        },
        cell: ({ row }) => {
            const items = row.original.items || [];
            if (items.length === 0)
                return <span className="text-muted-foreground text-sm">—</span>;

            return (
                <div className="flex flex-wrap gap-1">
                    {items.map((item, idx) => (
                        <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs px-1.5 py-0 font-normal"
                        >
                            {item.quantity}× {item.product?.name || "Unknown"}
                        </Badge>
                    ))}
                </div>
            );
        },
        enableSorting: false,
    },
    {
        accessorKey: "createdAt",
        id: "timestamp",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-auto p-0 hover:bg-transparent justify-start font-semibold"
                        >
                            Timestamp
                            {isSorted === "asc" ? (
                                <ArrowUp className="ml-2 h-3 w-3" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="ml-2 h-3 w-3" />
                            ) : (
                                <ArrowUpDown className="ml-2 h-3 w-3" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem
                            onClick={() => column.toggleSorting(false)}
                        >
                            <ArrowUp className="mr-2 h-3 w-3" />
                            Asc
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => column.toggleSorting(true)}
                        >
                            <ArrowDown className="mr-2 h-3 w-3" />
                            Desc
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
        cell: ({ row }) => {
            const createdAt = row.original.createdAt;
            if (!createdAt) return null;

            const date = new Date(createdAt);

            // Convert to +7 manually
            const localDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);

            return (
                <div className="text-sm text-muted-foreground">
                    {format(localDate, "PPp")}
                </div>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const order = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            disabled
                            onClick={() =>
                                navigator.clipboard.writeText(order.id)
                            }
                        >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Order ID
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            disabled
                            onClick={() => onView(order)}
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            disabled
                            className="text-red-600"
                            onClick={() => onDelete(order)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Order
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
