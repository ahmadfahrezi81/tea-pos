// app/[tenantSlug]/admin/[storeId]/users/_components/add-assignment-modal.tsx
"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/shared/utils/cn";
import { toast } from "sonner";
import useTenantUsers from "@/lib/client/hooks/tenants/useTenantUsers";
import { useTenant } from "@/app/[tenantSlug]/TenantProvider";
import { useStoreScope } from "@/app/[tenantSlug]/admin/StoreScopeProvider";
import useStoreUsers from "@/lib/client/hooks/stores/useStoreUsers";
import { ScopeBadge } from "../../../_components/scope-badge";

interface PendingAssignment {
    userId: string;
    userName: string;
    userEmail: string;
    role: "seller" | "manager";
    isDefault: boolean;
}

interface AddAssignmentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function AddAssignmentModal({
    open,
    onOpenChange,
    onSuccess,
}: AddAssignmentModalProps) {
    const { tenantId } = useTenant();
    const { storeId } = useStoreScope();
    const { data: tenantUsers } = useTenantUsers(tenantId);
    const { data: storeUsers } = useStoreUsers(
        storeId ?? null,
        tenantId ?? null
    );

    const [searchOpen, setSearchOpen] = useState(false);
    const [pendingAssignments, setPendingAssignments] = useState<
        PendingAssignment[]
    >([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter out users who already have the same role in this store
    const availableUsers = (tenantUsers || []).filter((tenantUser) => {
        // Check if user already has assignments in this store
        const existingAssignments = (storeUsers || []).filter(
            (storeUser) => storeUser.userId === tenantUser.userId
        );

        // If user has no assignments, they're available
        if (existingAssignments.length === 0) return true;

        // Check if they already have both roles
        const hasSellerRole = existingAssignments.some(
            (a) => a.role === "seller"
        );
        const hasManagerRole = existingAssignments.some(
            (a) => a.role === "manager"
        );

        // Don't show if they already have both roles
        return !(hasSellerRole && hasManagerRole);
    });

    const handleSelectUser = (user: {
        userId: string;
        profiles: { fullName: string; email: string } | null;
    }) => {
        if (!user.profiles) return;

        // Check what roles this user already has
        const existingAssignments = (storeUsers || []).filter(
            (storeUser) => storeUser.userId === user.userId
        );
        const hasSellerRole = existingAssignments.some(
            (a) => a.role === "seller"
        );

        // Default to the role they don't have yet
        const defaultRole = hasSellerRole ? "manager" : "seller";

        const newAssignment: PendingAssignment = {
            userId: user.userId,
            userName: user.profiles.fullName,
            userEmail: user.profiles.email,
            role: defaultRole,
            isDefault: false,
        };

        setPendingAssignments([...pendingAssignments, newAssignment]);
        setSearchOpen(false);
    };

    const handleRemovePending = (index: number) => {
        setPendingAssignments(pendingAssignments.filter((_, i) => i !== index));
    };

    const handleRoleChange = (index: number, role: "seller" | "manager") => {
        const updated = [...pendingAssignments];
        updated[index].role = role;
        setPendingAssignments(updated);
    };

    const handleDefaultChange = (index: number, checked: boolean) => {
        const updated = pendingAssignments.map((assignment, i) => ({
            ...assignment,
            // Only set the clicked one to true, rest to false
            isDefault: i === index ? checked : false,
        }));
        setPendingAssignments(updated);
    };

    const handleSubmit = async () => {
        if (pendingAssignments.length === 0) {
            toast.error("Please select at least one user");
            return;
        }

        // Validate: can't assign same user with same role twice
        const roleMap = new Map<string, Set<string>>();
        for (const assignment of pendingAssignments) {
            const key = assignment.userId;
            if (!roleMap.has(key)) {
                roleMap.set(key, new Set());
            }
            const roles = roleMap.get(key)!;
            if (roles.has(assignment.role)) {
                toast.error(
                    `Cannot assign ${assignment.userName} as ${assignment.role} twice`
                );
                return;
            }
            roles.add(assignment.role);
        }

        setIsSubmitting(true);

        try {
            // Create assignments one by one
            const results = await Promise.allSettled(
                pendingAssignments.map(async (assignment) => {
                    const response = await fetch("/api/stores/assignments", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            userId: assignment.userId,
                            storeId,
                            role: assignment.role,
                            isDefault: assignment.isDefault,
                        }),
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(
                            error.error || "Failed to create assignment"
                        );
                    }

                    return response.json();
                })
            );

            // Check results
            const failed = results.filter((r) => r.status === "rejected");
            const succeeded = results.filter((r) => r.status === "fulfilled");

            if (failed.length > 0) {
                toast.error(
                    `${failed.length} assignment(s) failed. ${succeeded.length} succeeded.`
                );
            } else {
                toast.success(
                    `Successfully added ${succeeded.length} assignment(s)`
                );
            }

            // Reset and close
            setPendingAssignments([]);
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to create assignments"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                {/* Badge positioned top-left */}
                <div className="absolute -top-9 left-0 z-50">
                    <ScopeBadge />
                </div>
                <DialogHeader>
                    <DialogTitle>Add Store Assignment</DialogTitle>
                    <DialogDescription>
                        Search and select users to assign to this store.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* User Search */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Search Users
                        </label>
                        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={searchOpen}
                                    className="w-full justify-between"
                                >
                                    Select user...
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[460px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search users..." />
                                    <CommandList>
                                        <CommandEmpty>
                                            No users found.
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {availableUsers.map((user) => {
                                                const alreadyPending =
                                                    pendingAssignments.some(
                                                        (p) =>
                                                            p.userId ===
                                                            user.userId
                                                    );

                                                return (
                                                    <CommandItem
                                                        key={user.userId}
                                                        value={`${user.profiles?.fullName} ${user.profiles?.email}`}
                                                        onSelect={() =>
                                                            handleSelectUser(
                                                                user
                                                            )
                                                        }
                                                        disabled={
                                                            alreadyPending
                                                        }
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                alreadyPending
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">
                                                                {user.profiles
                                                                    ?.fullName ||
                                                                    "N/A"}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {user.profiles
                                                                    ?.email ||
                                                                    "N/A"}
                                                            </span>
                                                        </div>
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Pending Assignments */}
                    {/* {pendingAssignments.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Selected Users ({pendingAssignments.length})
                            </label>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-3">
                                {pendingAssignments.map((assignment, index) => (
                                    <div
                                        key={`${assignment.userId}-${index}`}
                                        className="flex items-start gap-3 p-3 border rounded-md bg-muted/50"
                                    >
                                        <div className="flex-1 space-y-2">
                                            <div>
                                                <div className="font-medium text-sm">
                                                    {assignment.userName}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {assignment.userEmail}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Select
                                                    value={assignment.role}
                                                    onValueChange={(
                                                        value:
                                                            | "seller"
                                                            | "manager"
                                                    ) =>
                                                        handleRoleChange(
                                                            index,
                                                            value
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="h-8 w-[120px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="seller">
                                                            Seller
                                                        </SelectItem>
                                                        <SelectItem value="manager">
                                                            Manager
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`default-${index}`}
                                                        checked={
                                                            assignment.isDefault
                                                        }
                                                        onCheckedChange={(
                                                            checked
                                                        ) =>
                                                            handleDefaultChange(
                                                                index,
                                                                checked as boolean
                                                            )
                                                        }
                                                    />
                                                    <label
                                                        htmlFor={`default-${index}`}
                                                        className="text-xs text-muted-foreground cursor-pointer"
                                                    >
                                                        Default
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() =>
                                                handleRemovePending(index)
                                            }
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )} */}

                    {/* Pending Assignments */}
                    {pendingAssignments.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Selected Users ({pendingAssignments.length})
                            </label>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {pendingAssignments.map((assignment, index) => (
                                    <div
                                        key={`${assignment.userId}-${index}`}
                                        className="flex items-start justify-between rounded-md bg-muted/30 p-2 pl-3 hover:bg-muted/50 transition"
                                    >
                                        <div className="flex-1 space-y-1">
                                            <div className="font-medium text-sm">
                                                {assignment.userName}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {assignment.userEmail}
                                            </div>

                                            <div className="flex items-center gap-3 pt-1">
                                                <Select
                                                    value={assignment.role}
                                                    onValueChange={(
                                                        value:
                                                            | "seller"
                                                            | "manager"
                                                    ) =>
                                                        handleRoleChange(
                                                            index,
                                                            value
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="h-8 w-[120px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="seller">
                                                            Seller
                                                        </SelectItem>
                                                        <SelectItem value="manager">
                                                            Manager
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`default-${index}`}
                                                        checked={
                                                            assignment.isDefault
                                                        }
                                                        onCheckedChange={(
                                                            checked
                                                        ) =>
                                                            handleDefaultChange(
                                                                index,
                                                                checked as boolean
                                                            )
                                                        }
                                                    />
                                                    <label
                                                        htmlFor={`default-${index}`}
                                                        className="text-xs text-muted-foreground cursor-pointer"
                                                    >
                                                        Default
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() =>
                                                handleRemovePending(index)
                                            }
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={
                                isSubmitting || pendingAssignments.length === 0
                            }
                        >
                            {isSubmitting && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Add ({pendingAssignments.length})
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
