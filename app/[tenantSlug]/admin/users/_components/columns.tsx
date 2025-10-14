"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
    Crown,
    Zap,
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

export type User = {
    id: string;
    userId: string;
    tenantId: string;
    role: string;
    createdAt: string | null;
    profiles: {
        fullName: string;
        email: string;
    } | null;
};

const getRoleIcon = (role: string) => {
    const iconClass = "h-4 w-4";
    switch (role.toLowerCase()) {
        case "owner":
            return <Crown className={iconClass} />;
        case "admin":
            return <Zap className={iconClass} />;
        case "manager":
            return <UserCog className={iconClass} />;
        case "staff":
            return <Briefcase className={iconClass} />;
        default:
            return <User className={iconClass} />;
    }
};

// Factory function to create columns with callbacks
export const createColumns = (
    onEdit: (user: User) => void,
    onDelete: (user: User) => void
): ColumnDef<User>[] => [
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
        accessorKey: "profiles.fullName",
        id: "fullName",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-auto p-0 hover:bg-transparent justify-start font-semibold"
                        >
                            Name
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
            <div className="font-medium">
                {row.original.profiles?.fullName || "N/A"}
            </div>
        ),
    },
    {
        accessorKey: "profiles.email",
        id: "email",
        header: () => {
            return <div className="font-semibold pl-3">Email</div>;
        },
        cell: ({ row }) => <div>{row.original.profiles?.email || "N/A"}</div>,
        enableSorting: false,
    },
    {
        accessorKey: "phoneNumber",
        id: "phoneNumber",
        header: () => {
            return <div className="font-semibold pl-3">Phone Number</div>;
        },
        cell: () => (
            <div className="text-muted-foreground">+1 (555) 000-0000</div>
        ),
        enableSorting: false,
    },
    {
        accessorKey: "status",
        id: "status",
        header: () => {
            return <div className="font-semibold pl-3">Status</div>;
        },
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
                            onClick={() =>
                                navigator.clipboard.writeText(user.userId)
                            }
                        >
                            Copy user ID
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                            Edit user
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => onDelete(user)}
                        >
                            Remove user
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
