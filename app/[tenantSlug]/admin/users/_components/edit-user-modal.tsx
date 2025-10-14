"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UpdateUserInput } from "@/lib/schemas/users";
import useUpdateUser from "@/lib/hooks/users/useUpdateUser";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditUserModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    userId: string;
    initialData: {
        fullName: string;
        email: string;
        role: "owner" | "manager" | "staff";
    };
}

export function EditUserModal({
    open,
    onOpenChange,
    onSuccess,
    userId,
    initialData,
}: EditUserModalProps) {
    const { trigger: updateUser, isMutating } = useUpdateUser();

    const form = useForm({
        resolver: zodResolver(UpdateUserInput),
        defaultValues: {
            fullName: initialData.fullName,
            role: initialData.role,
        },
    });

    // Reset form when initialData changes
    useEffect(() => {
        if (open) {
            form.reset({
                fullName: initialData.fullName,
                role: initialData.role,
            });
        }
    }, [initialData, open, form]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onSubmit = async (data: any) => {
        try {
            await updateUser({ userId, ...data });
            toast.success("User updated successfully");
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Failed to update user"
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>Edit User</DialogTitle>
                    <DialogDescription>
                        Update user information. Click save when you&apos;re
                        done.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                        autoComplete="off"
                    >
                        {/* Full Name */}
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="John Doe"
                                            autoComplete="off"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Email - Disabled in edit mode */}
                        <div className="space-y-2">
                            <FormLabel>Email</FormLabel>
                            <Input
                                type="text"
                                value={initialData.email}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        {/* Role */}
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="staff">
                                                Staff
                                            </SelectItem>
                                            <SelectItem value="manager">
                                                Manager
                                            </SelectItem>
                                            <SelectItem value="owner">
                                                Owner
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Submit Button */}
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isMutating}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isMutating}>
                                {isMutating && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Update
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
