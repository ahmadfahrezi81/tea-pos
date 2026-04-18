import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Product } from "@/lib/shared/schemas/products";

// export type Product = {
//     id: string;
//     name: string;
//     price: number;
//     imageUrl: string | null;
//     status: string | null;
//     categoryId: string | null;
//     categoryName: string | null;
//     isMain: boolean;
//     isActive: boolean | null;
//     tenantId: string;
//     createdAt: string | null;
//     updatedAt: string | null;
// };

type StatusType = "active" | "inactive" | "draft";

const STATUS_STYLES: Record<StatusType, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    inactive: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
    draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
};

export const createColumns = (
    onEdit: (product: Product) => void,
    onDelete: (product: Product) => void,
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
        accessorKey: "id",
        id: "id",
        header: () => <div className="font-semibold pl-3">Product ID</div>,
        cell: ({ row }) => {
            const id = row.original.id;
            const shortened = `${id.substring(0, 13).toUpperCase()}`;
            return (
                <div className="font-mono text-xs text-muted-foreground">
                    {shortened}
                </div>
            );
        },
        enableSorting: false,
    },

    {
        accessorKey: "name",
        id: "name",
        header: () => <div className="font-semibold pl-3">Product Name</div>,
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
    // {
    //     accessorKey: "status",
    //     id: "status",
    //     header: () => <div className="font-semibold pl-3">Status</div>,
    //     cell: ({ row }) => {
    //         const status = (row.original.status || "active") as StatusType;
    //         const styleClass = STATUS_STYLES[status] || STATUS_STYLES.active;

    //         return (
    //             <Badge variant="secondary" className={styleClass}>
    //                 {status.charAt(0).toUpperCase() + status.slice(1)}
    //             </Badge>
    //         );
    //     },
    //     filterFn: (row, columnId, filterValue) => {
    //         if (!Array.isArray(filterValue) || filterValue.length === 0)
    //             return true;
    //         const value = row.getValue(columnId) || "active";
    //         return filterValue.includes(value);
    //     },
    //     enableSorting: false,
    // },
    // {
    //     accessorKey: "categoryName",
    //     id: "category",
    //     header: () => <div className="font-semibold pl-3">Category</div>,
    //     cell: ({ row }) => {
    //         const categoryName = row.original.categoryName || "Uncategorized";
    //         return (
    //             <div className="flex items-center gap-2">
    //                 <span className="text-sm">{categoryName}</span>
    //             </div>
    //         );
    //     },
    //     filterFn: (row, columnId, filterValue) => {
    //         if (!Array.isArray(filterValue) || filterValue.length === 0)
    //             return true;
    //         const value = row.getValue(columnId) || "Uncategorized";
    //         return filterValue.includes(value);
    //     },
    //     enableSorting: false,
    // },
    {
        accessorKey: "status",
        id: "status",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-auto p-0 hover:bg-transparent justify-start font-semibold"
                        >
                            Status
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
            const status = (row.original.status || "active") as StatusType;
            const styleClass = STATUS_STYLES[status] || STATUS_STYLES.active;

            return (
                <Badge variant="secondary" className={styleClass}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
            );
        },
        filterFn: (row, columnId, filterValue) => {
            if (!Array.isArray(filterValue) || filterValue.length === 0)
                return true;
            const value = row.getValue(columnId) || "active";
            return filterValue.includes(value);
        },
        enableSorting: true,
    },
    {
        accessorKey: "categoryName",
        id: "category",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-auto p-0 hover:bg-transparent justify-start font-semibold"
                        >
                            Category
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
            const categoryName = row.original.categoryName || "Uncategorized";
            return (
                <div className="flex items-center gap-2">
                    <span className="text-sm">{categoryName}</span>
                </div>
            );
        },
        filterFn: (row, columnId, filterValue) => {
            if (!Array.isArray(filterValue) || filterValue.length === 0)
                return true;
            const value = row.getValue(columnId) || "Uncategorized";
            return filterValue.includes(value);
        },
        enableSorting: true,
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
                            Updated At
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
    // {
    //     id: "actions",
    //     cell: ({ row }) => {
    //         const product = row.original;

    //         return (
    //             <DropdownMenu>
    //                 <DropdownMenuTrigger asChild>
    //                     <Button
    //                         variant="ghost"
    //                         className="h-8 w-8 p-0"
    //                         disabled
    //                     >
    //                         <span className="sr-only">Open menu</span>
    //                         <MoreHorizontal className="h-4 w-4" />
    //                     </Button>
    //                 </DropdownMenuTrigger>
    //                 <DropdownMenuContent align="end">
    //                     <DropdownMenuItem
    //                         disabled
    //                         onClick={() =>
    //                             navigator.clipboard.writeText(product.id)
    //                         }
    //                     >
    //                         Copy Product ID
    //                     </DropdownMenuItem>
    //                     <DropdownMenuItem
    //                         disabled
    //                         onClick={() => onEdit(product)}
    //                     >
    //                         Edit Product
    //                     </DropdownMenuItem>
    //                     <DropdownMenuSeparator />
    //                     <DropdownMenuItem
    //                         className="text-red-600"
    //                         disabled
    //                         onClick={() => onDelete(product)}
    //                     >
    //                         Delete Product
    //                     </DropdownMenuItem>
    //                 </DropdownMenuContent>
    //             </DropdownMenu>
    //         );
    //     },
    // },
    {
        id: "actions",
        cell: ({ row }) => {
            const product = row.original;

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
                                navigator.clipboard.writeText(product.id);
                                toast.success("Product ID copied!");
                            }}
                        >
                            Copy Product ID
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(product)}>
                            Edit Product
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            disabled
                            className="text-red-600 focus:text-red-700"
                            onClick={() => onDelete(product)}
                        >
                            Delete Product
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
