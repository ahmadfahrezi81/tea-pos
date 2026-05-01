// "use client";

// import { useState } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import {
//     Dialog,
//     DialogContent,
//     DialogDescription,
//     DialogHeader,
//     DialogTitle,
// } from "@/components/ui/dialog";
// import {
//     Form,
//     FormControl,
//     FormField,
//     FormItem,
//     FormLabel,
//     FormMessage,
// } from "@/components/ui/form";
// import {
//     Select,
//     SelectContent,
//     SelectItem,
//     SelectTrigger,
//     SelectValue,
// } from "@/components/ui/select";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { CreateUserInput } from "@/lib/schemas/users";
// import useCreateUser from "@/lib/client/hooks/users/useCreateUser";
// import { Eye, EyeOff, Loader2 } from "lucide-react";
// import { toast } from "sonner"; // 👈 new import

// interface AddUserModalProps {
//     open: boolean;
//     onOpenChange: (open: boolean) => void;
//     onSuccess?: () => void;
// }

// export function AddUserModal({
//     open,
//     onOpenChange,
//     onSuccess,
// }: AddUserModalProps) {
//     const [showPassword, setShowPassword] = useState(false);
//     const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//     const { trigger, isMutating } = useCreateUser();

//     const form = useForm<CreateUserInput>({
//         resolver: zodResolver(CreateUserInput),
//         defaultValues: {
//             fullName: "",
//             email: "",
//             role: "staff",
//             password: "",
//             confirmPassword: "",
//         },
//     });

//     const onSubmit = async (data: CreateUserInput) => {
//         try {
//             await trigger(data);
//             toast.success("User created successfully"); // ✅ Sonner success toast
//             form.reset();
//             onOpenChange(false);
//             onSuccess?.();
//         } catch (error) {
//             toast.error(
//                 error instanceof Error ? error.message : "Failed to create user"
//             ); // ✅ Sonner error toast
//         }
//     };

//     return (
//         <Dialog open={open} onOpenChange={onOpenChange}>
//             <DialogContent className="sm:max-w-[420px]">
//                 <DialogHeader>
//                     <DialogTitle>Add New User</DialogTitle>
//                     <DialogDescription>
//                         Create new user here. Click save when you&apos;re done.
//                     </DialogDescription>
//                 </DialogHeader>

//                 <Form {...form}>
//                     <form
//                         onSubmit={form.handleSubmit(onSubmit)}
//                         className="space-y-6"
//                     >
//                         {/* Full Name */}
//                         <FormField
//                             control={form.control}
//                             name="fullName"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormLabel>Full Name</FormLabel>
//                                     <FormControl>
//                                         <Input
//                                             placeholder="John Doe"
//                                             {...field}
//                                         />
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         {/* Email */}
//                         <FormField
//                             control={form.control}
//                             name="email"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormLabel>Email</FormLabel>
//                                     <FormControl>
//                                         <Input
//                                             type="email"
//                                             placeholder="john.doe@example.com"
//                                             {...field}
//                                         />
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         {/* Role */}
//                         <FormField
//                             control={form.control}
//                             name="role"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormLabel>Role</FormLabel>
//                                     <Select
//                                         onValueChange={field.onChange}
//                                         defaultValue={field.value}
//                                     >
//                                         <FormControl>
//                                             <SelectTrigger>
//                                                 <SelectValue placeholder="Select a role" />
//                                             </SelectTrigger>
//                                         </FormControl>
//                                         <SelectContent>
//                                             <SelectItem value="staff">
//                                                 Staff
//                                             </SelectItem>
//                                             <SelectItem value="manager">
//                                                 Manager
//                                             </SelectItem>
//                                             <SelectItem value="owner">
//                                                 Owner
//                                             </SelectItem>
//                                         </SelectContent>
//                                     </Select>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         {/* Password */}
//                         <FormField
//                             control={form.control}
//                             name="password"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormLabel>Password</FormLabel>
//                                     <FormControl>
//                                         <div className="relative">
//                                             <Input
//                                                 type={
//                                                     showPassword
//                                                         ? "text"
//                                                         : "password"
//                                                 }
//                                                 placeholder="e.g., S3cur3P@ssw0rd"
//                                                 {...field}
//                                             />
//                                             <Button
//                                                 type="button"
//                                                 variant="ghost"
//                                                 size="icon"
//                                                 className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
//                                                 onClick={() =>
//                                                     setShowPassword(
//                                                         !showPassword
//                                                     )
//                                                 }
//                                             >
//                                                 {showPassword ? (
//                                                     <EyeOff className="h-4 w-4" />
//                                                 ) : (
//                                                     <Eye className="h-4 w-4" />
//                                                 )}
//                                             </Button>
//                                         </div>
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         {/* Confirm Password */}
//                         <FormField
//                             control={form.control}
//                             name="confirmPassword"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormLabel>Confirm Password</FormLabel>
//                                     <FormControl>
//                                         <div className="relative">
//                                             <Input
//                                                 type={
//                                                     showConfirmPassword
//                                                         ? "text"
//                                                         : "password"
//                                                 }
//                                                 placeholder="e.g., S3cur3P@ssw0rd"
//                                                 {...field}
//                                             />
//                                             <Button
//                                                 type="button"
//                                                 variant="ghost"
//                                                 size="icon"
//                                                 className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
//                                                 onClick={() =>
//                                                     setShowConfirmPassword(
//                                                         !showConfirmPassword
//                                                     )
//                                                 }
//                                             >
//                                                 {showConfirmPassword ? (
//                                                     <EyeOff className="h-4 w-4" />
//                                                 ) : (
//                                                     <Eye className="h-4 w-4" />
//                                                 )}
//                                             </Button>
//                                         </div>
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         {/* Submit Button */}
//                         <div className="flex justify-end">
//                             <Button type="submit" disabled={isMutating}>
//                                 {isMutating && (
//                                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                                 )}
//                                 Save changes
//                             </Button>
//                         </div>
//                     </form>
//                 </Form>
//             </DialogContent>
//         </Dialog>
//     );
// }

"use client";

import { useState, useEffect } from "react";
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
import { CreateUserInput, UpdateUserInput } from "@/lib/shared/schemas/users";
import useCreateUser from "@/lib/client/hooks/users/useCreateUser";
import useUpdateUser from "@/lib/client/hooks/users/useUpdateUser";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UserFormModalProps {
    mode: "add" | "edit";
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    userId?: string;
    initialData?: {
        fullName: string;
        email: string;
        role: "owner" | "manager" | "staff";
    };
}

export function UserFormModal({
    mode,
    open,
    onOpenChange,
    onSuccess,
    userId,
    initialData,
}: UserFormModalProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { trigger: createUser, isMutating: isCreating } = useCreateUser();
    const { trigger: updateUser, isMutating: isUpdating } = useUpdateUser();

    const isEditMode = mode === "edit";
    const isMutating = isCreating || isUpdating;

    // Use different schemas based on mode
    const formSchema = isEditMode ? UpdateUserInput : CreateUserInput;

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: isEditMode
            ? {
                  fullName: initialData?.fullName || "",
                  email: initialData?.email || "",
                  role: initialData?.role || "staff",
              }
            : {
                  fullName: "",
                  email: "",
                  role: "staff" as const,
                  password: "",
                  confirmPassword: "",
              },
    });

    // Reset form when initialData changes (for edit mode)
    useEffect(() => {
        if (isEditMode && initialData && open) {
            form.reset({
                fullName: initialData.fullName,
                email: initialData.email,
                role: initialData.role,
            });
        }
    }, [isEditMode, initialData, open, form]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onSubmit = async (data: any) => {
        try {
            if (isEditMode && userId) {
                await updateUser({ userId, ...data });
                toast.success("User updated successfully");
            } else {
                await createUser(data);
                toast.success("User created successfully");
            }
            form.reset();
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : `Failed to ${isEditMode ? "update" : "create"} user`,
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditMode ? "Edit User" : "Add New User"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditMode
                            ? "Update user information. Click save when you're done."
                            : "Create new user here. Click save when you're done."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit, (errors) =>
                            console.log("Validation errors:", errors),
                        )}
                        className="space-y-6"
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
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Email */}
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="john.doe@example.com"
                                            disabled={isEditMode} // Can't change email in edit mode
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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

                        {/* Password fields - only show in add mode */}
                        {!isEditMode && (
                            <>
                                {/* Password */}
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type={
                                                            showPassword
                                                                ? "text"
                                                                : "password"
                                                        }
                                                        placeholder="e.g., S3cur3P@ssw0rd"
                                                        {...field}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                        onClick={() =>
                                                            setShowPassword(
                                                                !showPassword,
                                                            )
                                                        }
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Confirm Password */}
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Confirm Password
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type={
                                                            showConfirmPassword
                                                                ? "text"
                                                                : "password"
                                                        }
                                                        placeholder="e.g., S3cur3P@ssw0rd"
                                                        {...field}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                        onClick={() =>
                                                            setShowConfirmPassword(
                                                                !showConfirmPassword,
                                                            )
                                                        }
                                                    >
                                                        {showConfirmPassword ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

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
                                {isEditMode ? "Update" : "Create"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
