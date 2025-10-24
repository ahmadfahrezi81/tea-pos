// app/[tenantSlug]/admin/[storeId]/users/_components/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
    Briefcase,
    UserCog,
    User,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    MoreHorizontal,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { StoreUser } from "@/lib/schemas/userStoreAssignments";
import { toast } from "sonner";

const getRoleIcon = (role: string) => {
    const iconClass = "h-4 w-4";
    switch (role.toLowerCase()) {
        case "manager":
            return <UserCog className={iconClass} />;
        case "seller":
            return <Briefcase className={iconClass} />;
        default:
            return <User className={iconClass} />;
    }
};

// Factory function to create columns with callbacks
export const createColumns = (
    onRemove: (user: StoreUser) => void
): ColumnDef<StoreUser>[] => [
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
        accessorKey: "userId",
        id: "userId",
        header: () => <div className="font-semibold pl-3">User ID</div>,
        cell: ({ row }) => {
            const userId = row.original.userId;
            const shortened = `USR-${userId.substring(0, 8).toUpperCase()}`;
            return (
                <div className="font-mono text-xs text-muted-foreground">
                    {shortened}
                </div>
            );
        },
        enableSorting: false,
    },
    {
        accessorKey: "profiles.fullName",
        id: "fullName",
        header: () => <div className="font-semibold pl-3">Name</div>,
        cell: ({ row }) => (
            <div className="font-medium">
                {row.original.profiles?.fullName || "N/A"}
            </div>
        ),
    },
    {
        accessorKey: "profiles.email",
        id: "email",
        header: () => <div className="font-semibold pl-3">Email</div>,
        cell: ({ row }) => <div>{row.original.profiles?.email || "N/A"}</div>,
        enableSorting: false,
    },
    {
        accessorKey: "phoneNumber",
        id: "phoneNumber",
        header: () => <div className="font-semibold pl-3">Phone Number</div>,
        cell: () => (
            <div className="text-muted-foreground">+1 (555) 000-0000</div>
        ),
        enableSorting: false,
    },
    {
        accessorKey: "status",
        id: "status",
        header: () => <div className="font-semibold pl-3">Status</div>,
        cell: () => (
            <Badge
                variant="secondary"
                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
            >
                Active
            </Badge>
        ),
        enableSorting: false,
    },
    {
        accessorKey: "role",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-auto p-0 hover:bg-transparent justify-start font-semibold"
                        >
                            Role
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
            const role = row.getValue("role") as string;
            return (
                <div className="flex items-center gap-2">
                    {getRoleIcon(role)}
                    <span className="capitalize">{role}</span>
                </div>
            );
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const user = row.original;

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
                            onClick={() => {
                                navigator.clipboard.writeText(user.userId);
                                toast.success("User ID copied!");
                            }}
                        >
                            Copy user ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => onRemove(user)}
                        >
                            Remove assignment
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
