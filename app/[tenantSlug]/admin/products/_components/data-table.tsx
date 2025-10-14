// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

"use client";

import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Settings2, Plus, X, ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
}

const CATEGORIES = [
    { id: true, label: "Main" },
    { id: false, label: "Others" },
];

const STATUS_OPTIONS = [
    { id: true, label: "Active" },
    { id: false, label: "Inactive" },
];

export function DataTable<TData, TValue>({
    columns,
    data,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
        {}
    );
    const [rowSelection, setRowSelection] = useState({});
    const [categoryFilter, setCategoryFilter] = useState<boolean[]>([]);
    const [statusFilter, setStatusFilter] = useState<boolean[]>([]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    });

    const handleCategoryFilterChange = (category: boolean) => {
        const newCategoryFilter = categoryFilter.includes(category)
            ? categoryFilter.filter((c) => c !== category)
            : [...categoryFilter, category];

        setCategoryFilter(newCategoryFilter);

        if (newCategoryFilter.length === 0) {
            table.getColumn("category")?.setFilterValue(undefined);
        } else {
            table.getColumn("category")?.setFilterValue(newCategoryFilter);
        }
    };

    const handleStatusFilterChange = (status: boolean) => {
        const newStatusFilter = statusFilter.includes(status)
            ? statusFilter.filter((s) => s !== status)
            : [...statusFilter, status];

        setStatusFilter(newStatusFilter);

        if (newStatusFilter.length === 0) {
            table.getColumn("isActive")?.setFilterValue(undefined);
        } else {
            table.getColumn("isActive")?.setFilterValue(newStatusFilter);
        }
    };

    const clearFilters = () => {
        setCategoryFilter([]);
        setStatusFilter([]);
        table.resetColumnFilters();
    };

    const hasFilters =
        categoryFilter.length > 0 ||
        statusFilter.length > 0 ||
        table.getColumn("name")?.getFilterValue();

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                    <Input
                        placeholder="Search by product name..."
                        value={
                            (table
                                .getColumn("name")
                                ?.getFilterValue() as string) ?? ""
                        }
                        onChange={(event) =>
                            table
                                .getColumn("name")
                                ?.setFilterValue(event.target.value)
                        }
                        className="max-w-sm w-60"
                    />

                    {/* Status Filter */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="gap-2 border-dashed h-auto min-h-8 py-2"
                            >
                                <Plus className="h-4 w-4" />
                                Status
                                {statusFilter.length > 0 && (
                                    <>
                                        <div className="h-4 w-px bg-border" />
                                        <div className="flex gap-1">
                                            {statusFilter.map((status) => {
                                                const label = status
                                                    ? "Active"
                                                    : "Inactive";
                                                return (
                                                    <Badge
                                                        key={String(status)}
                                                        variant="secondary"
                                                        className="rounded-sm px-1 font-normal"
                                                    >
                                                        {label}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="start">
                            <div className="p-2">
                                <div className="flex items-center justify-between px-2 py-1.5">
                                    <span className="text-sm font-medium">
                                        Status
                                    </span>
                                    {statusFilter.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto p-0 text-xs"
                                            onClick={() => {
                                                setStatusFilter([]);
                                                table
                                                    .getColumn("isActive")
                                                    ?.setFilterValue(undefined);
                                            }}
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {STATUS_OPTIONS.map((option) => {
                                        const isSelected =
                                            statusFilter.includes(option.id);
                                        return (
                                            <div
                                                key={String(option.id)}
                                                className="flex items-center gap-2 rounded-sm px-2 py-1.5 cursor-pointer hover:bg-accent"
                                                onClick={() =>
                                                    handleStatusFilterChange(
                                                        option.id
                                                    )
                                                }
                                            >
                                                <div
                                                    className={`h-4 w-4 rounded-sm border ${
                                                        isSelected
                                                            ? "bg-primary border-primary"
                                                            : "border-input"
                                                    } flex items-center justify-center`}
                                                >
                                                    {isSelected && (
                                                        <svg
                                                            className="h-3 w-3 text-primary-foreground"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={3}
                                                                d="M5 13l4 4L19 7"
                                                            />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className="text-sm">
                                                    {option.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Category Filter */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="gap-2 border-dashed h-auto min-h-8 py-2"
                            >
                                <Plus className="h-4 w-4" />
                                Category
                                {categoryFilter.length > 0 && (
                                    <>
                                        <div className="h-4 w-px bg-border" />
                                        <div className="flex gap-1">
                                            {categoryFilter.map((category) => {
                                                const label = category
                                                    ? "Main"
                                                    : "Others";
                                                return (
                                                    <Badge
                                                        key={String(category)}
                                                        variant="secondary"
                                                        className="rounded-sm px-1 font-normal"
                                                    >
                                                        {label}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="start">
                            <div className="p-2">
                                <div className="flex items-center justify-between px-2 py-1.5">
                                    <span className="text-sm font-medium">
                                        Category
                                    </span>
                                    {categoryFilter.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto p-0 text-xs"
                                            onClick={() => {
                                                setCategoryFilter([]);
                                                table
                                                    .getColumn("category")
                                                    ?.setFilterValue(undefined);
                                            }}
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {CATEGORIES.map((category) => {
                                        const isSelected =
                                            categoryFilter.includes(
                                                category.id
                                            );
                                        return (
                                            <div
                                                key={String(category.id)}
                                                className="flex items-center gap-2 rounded-sm px-2 py-1.5 cursor-pointer hover:bg-accent"
                                                onClick={() =>
                                                    handleCategoryFilterChange(
                                                        category.id
                                                    )
                                                }
                                            >
                                                <div
                                                    className={`h-4 w-4 rounded-sm border ${
                                                        isSelected
                                                            ? "bg-primary border-primary"
                                                            : "border-input"
                                                    } flex items-center justify-center`}
                                                >
                                                    {isSelected && (
                                                        <svg
                                                            className="h-3 w-3 text-primary-foreground"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={3}
                                                                d="M5 13l4 4L19 7"
                                                            />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className="text-sm">
                                                    {category.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {hasFilters && (
                        <Button
                            variant="ghost"
                            onClick={clearFilters}
                            className="h-8 px-2 lg:px-3"
                        >
                            Reset
                            <X className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* View Options */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-auto">
                            <Settings2 className="mr-2 h-4 w-4" />
                            View
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => {
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) =>
                                            column.toggleVisibility(!!value)
                                        }
                                    >
                                        {column.id
                                            .replace(/([A-Z])/g, " $1")
                                            .trim()}
                                    </DropdownMenuCheckboxItem>
                                );
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Active Sorts Display */}
            {sorting.length > 0 && (
                <div className="flex items-center gap-2">
                    {sorting.map((sort) => {
                        const columnName =
                            sort.id === "price"
                                ? "Price"
                                : sort.id === "createdAt"
                                ? "Created At"
                                : sort.id === "updatedAt"
                                ? "Last Updated"
                                : sort.id.charAt(0).toUpperCase() +
                                  sort.id.slice(1);
                        return (
                            <Badge
                                key={sort.id}
                                variant="secondary"
                                className="rounded-sm px-2 py-1 font-normal border"
                            >
                                {sort.desc ? (
                                    <ArrowDown className="mr-1 h-3 w-3" />
                                ) : (
                                    <ArrowUp className="mr-1 h-3 w-3" />
                                )}
                                <span>{columnName}</span>
                                <button
                                    className="ml-1 rounded-full hover:bg-accent"
                                    onClick={() => {
                                        setSorting(
                                            sorting.filter(
                                                (s) => s.id !== sort.id
                                            )
                                        );
                                    }}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        );
                    })}
                </div>
            )}

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef
                                                          .header,
                                                      header.getContext()
                                                  )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && "selected"
                                    }
                                >
                                    {row
                                        .getVisibleCells()
                                        .map((cell, index) => {
                                            const isFirstColumn =
                                                cell.column.id === "select" ||
                                                index === 0;
                                            return (
                                                <TableCell
                                                    key={cell.id}
                                                    className={
                                                        !isFirstColumn
                                                            ? "pl-5"
                                                            : ""
                                                    }
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef
                                                            .cell,
                                                        cell.getContext()
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Rows per page</p>
                        <select
                            value={table.getState().pagination.pageSize}
                            onChange={(e) => {
                                table.setPageSize(Number(e.target.value));
                            }}
                            className="h-8 w-[70px] rounded-md border border-input bg-background px-2 text-sm"
                        >
                            {[10, 25, 50, 100].map((pageSize) => (
                                <option key={pageSize} value={pageSize}>
                                    {pageSize}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                        Page {table.getState().pagination.pageIndex + 1} of{" "}
                        {table.getPageCount()}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to first page</span>«
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to previous page</span>
                            ‹
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to next page</span>›
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() =>
                                table.setPageIndex(table.getPageCount() - 1)
                            }
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to last page</span>»
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
