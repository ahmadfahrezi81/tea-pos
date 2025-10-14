import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    MoreHorizontal,
    Star,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type Product = {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    isActive: boolean | null;
    isMain: boolean;
    tenantId: string;
    createdAt: string | null;
    updatedAt: string | null;
};

export const createColumns = (
    onEdit: (product: Product) => void,
    onDelete: (product: Product) => void
): ColumnDef<Product>[] => [
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
        accessorKey: "name",
        id: "name",
        header: () => {
            return <div className="font-semibold pl-3">Product Name</div>;
        },
        cell: ({ row }) => {
            const product = row.original;
            const initials = product.name.charAt(0).toUpperCase();

            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage
                            src={product.imageUrl || undefined}
                            alt={product.name}
                        />
                        <AvatarFallback className="rounded-lg font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{product.name}</span>
                </div>
            );
        },
        enableSorting: false,
    },
    {
        accessorKey: "price",
        id: "price",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-auto p-0 hover:bg-transparent justify-start font-semibold"
                        >
                            Price
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
            const price = parseFloat(row.getValue("price"));
            return (
                <div className="font-medium">
                    Rp {price.toLocaleString("id-ID")}
                </div>
            );
        },
    },
    {
        accessorKey: "isActive",
        header: () => <div className="font-semibold pl-3">Status</div>,
        cell: ({ row }) => {
            const isActive = row.original.isActive ?? true;
            return (
                <Badge
                    variant={isActive ? "default" : "secondary"}
                    className={
                        isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                    }
                >
                    {isActive ? "Active" : "Inactive"}
                </Badge>
            );
        },
        filterFn: (row, columnId, filterValue) => {
            if (!Array.isArray(filterValue) || filterValue.length === 0)
                return true;
            const value = row.getValue(columnId);
            return filterValue.includes(value);
        },
        enableSorting: false,
    },
    {
        accessorKey: "isMain",
        id: "category",
        header: () => {
            return <div className="font-semibold pl-3">Category</div>;
        },
        cell: ({ row }) => {
            const isMain = row.original.isMain;
            return (
                <div className="flex items-center gap-2">
                    {isMain && (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    )}
                    <span className="text-sm">
                        {isMain ? "Main" : "Others"}
                    </span>
                </div>
            );
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },
    {
        accessorKey: "createdAt",
        id: "createdAt",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-auto p-0 hover:bg-transparent justify-start font-semibold"
                        >
                            Created At
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
            const date = row.original.createdAt
                ? new Date(row.original.createdAt).toLocaleDateString("id-ID")
                : "N/A";
            return <div className="text-sm">{date}</div>;
        },
    },
    {
        accessorKey: "updatedAt",
        id: "updatedAt",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-auto p-0 hover:bg-transparent justify-start font-semibold"
                        >
                            Last Updated
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
            const date = row.original.updatedAt
                ? new Date(row.original.updatedAt).toLocaleDateString("id-ID")
                : "N/A";
            return <div className="text-sm">{date}</div>;
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const product = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            disabled
                        >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            disabled
                            onClick={() =>
                                navigator.clipboard.writeText(product.id)
                            }
                        >
                            Copy Product ID
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled onClick={() => {}}>
                            Edit Product
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600"
                            disabled
                            onClick={() => {}}
                        >
                            Delete Product
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
