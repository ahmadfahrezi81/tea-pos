// //app/[tenantSlug]/admin/users/_components/edit-user-modal.tsx
// "use client";

// import { useEffect } from "react";
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
// import { UpdateUserInput } from "@/lib/schemas/users";
// import useUpdateUser from "@/lib/client/hooks/users/useUpdateUser";
// import { Loader2 } from "lucide-react";
// import { toast } from "sonner";

// interface EditUserModalProps {
//     open: boolean;
//     onOpenChange: (open: boolean) => void;
//     onSuccess?: () => void;
//     userId: string;
//     initialData: {
//         fullName: string;
//         email: string;
//         role: "owner" | "manager" | "staff";
//     };
// }

// export function EditUserModal({
//     open,
//     onOpenChange,
//     onSuccess,
//     userId,
//     initialData,
// }: EditUserModalProps) {
//     const { trigger: updateUser, isMutating } = useUpdateUser();

//     const form = useForm({
//         resolver: zodResolver(UpdateUserInput),
//         defaultValues: {
//             fullName: initialData.fullName,
//             role: initialData.role,
//         },
//     });

//     // Reset form when initialData changes
//     useEffect(() => {
//         if (open) {
//             form.reset({
//                 fullName: initialData.fullName,
//                 role: initialData.role,
//             });
//         }
//     }, [initialData, open, form]);

//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     const onSubmit = async (data: any) => {
//         try {
//             await updateUser({ userId, ...data });
//             toast.success("User updated successfully");
//             onOpenChange(false);
//             onSuccess?.();
//         } catch (error) {
//             toast.error(
//                 error instanceof Error ? error.message : "Failed to update user"
//             );
//         }
//     };

//     return (
//         <Dialog open={open} onOpenChange={onOpenChange}>
//             <DialogContent className="sm:max-w-[420px]">
//                 <DialogHeader>
//                     <DialogTitle>Edit User</DialogTitle>
//                     <DialogDescription>
//                         Update user information. Click save when you&apos;re
//                         done.
//                     </DialogDescription>
//                 </DialogHeader>

//                 <Form {...form}>
//                     <form
//                         onSubmit={form.handleSubmit(onSubmit)}
//                         className="space-y-6"
//                         autoComplete="off"
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
//                                             autoComplete="off"
//                                             {...field}
//                                         />
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         {/* Email - Disabled in edit mode */}
//                         <div className="space-y-2">
//                             <FormLabel>Email</FormLabel>
//                             <Input
//                                 type="text"
//                                 value={initialData.email}
//                                 disabled
//                                 className="bg-muted"
//                             />
//                         </div>
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
//                                         value={field.value}
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

//                         {/* Submit Button */}
//                         <div className="flex justify-end gap-2">
//                             <Button
//                                 type="button"
//                                 variant="outline"
//                                 onClick={() => onOpenChange(false)}
//                                 disabled={isMutating}
//                             >
//                                 Cancel
//                             </Button>
//                             <Button type="submit" disabled={isMutating}>
//                                 {isMutating && (
//                                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                                 )}
//                                 Update
//                             </Button>
//                         </div>
//                     </form>
//                 </Form>
//             </DialogContent>
//         </Dialog>
//     );
// }

//app/[tenantSlug]/admin/users/_components/edit-user-modal.tsx
"use client";

import { useEffect, useState } from "react";
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
import { UpdateUserInput } from "@/lib/shared/schemas/users";
import useUpdateUser from "@/lib/client/hooks/users/useUpdateUser";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface EditUserModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    userId: string;
    initialData: {
        fullName: string;
        email: string;
        role: "owner" | "manager" | "staff";
        phoneNumber?: string | null;
        status: "active" | "inactive" | "pending" | "suspended";
    };
}

const COUNTRY_CODES = [
    { code: "+1", country: "US/CA", flag: "🇺🇸" },
    { code: "+44", country: "UK", flag: "🇬🇧" },
    { code: "+62", country: "Indonesia", flag: "🇮🇩" },
    { code: "+91", country: "India", flag: "🇮🇳" },
    { code: "+86", country: "China", flag: "🇨🇳" },
    { code: "+81", country: "Japan", flag: "🇯🇵" },
    { code: "+82", country: "South Korea", flag: "🇰🇷" },
    { code: "+65", country: "Singapore", flag: "🇸🇬" },
    { code: "+60", country: "Malaysia", flag: "🇲🇾" },
    { code: "+66", country: "Thailand", flag: "🇹🇭" },
    { code: "+84", country: "Vietnam", flag: "🇻🇳" },
    { code: "+63", country: "Philippines", flag: "🇵🇭" },
    { code: "+61", country: "Australia", flag: "🇦🇺" },
    { code: "+64", country: "New Zealand", flag: "🇳🇿" },
];

// Define form schema type explicitly
type FormValues = z.infer<typeof UpdateUserInput>;

export function EditUserModal({
    open,
    onOpenChange,
    onSuccess,
    userId,
    initialData,
}: EditUserModalProps) {
    const { trigger: updateUser, isMutating } = useUpdateUser();

    // Parse existing phone number
    const parsePhoneNumber = (phone: string | null | undefined) => {
        if (!phone) return { countryCode: "+62", number: "" };

        const matchedCode = COUNTRY_CODES.find((c) => phone.startsWith(c.code));
        if (matchedCode) {
            return {
                countryCode: matchedCode.code,
                number: phone.slice(matchedCode.code.length),
            };
        }
        return { countryCode: "+62", number: phone };
    };

    const parsed = parsePhoneNumber(initialData.phoneNumber);
    const [countryCode, setCountryCode] = useState(parsed.countryCode);

    const form = useForm<FormValues>({
        resolver: zodResolver(UpdateUserInput),
        defaultValues: {
            fullName: initialData.fullName,
            role: initialData.role,
            phoneNumber: parsed.number,
            status: initialData.status,
        },
    });

    // Reset form when initialData changes
    useEffect(() => {
        if (open) {
            const parsed = parsePhoneNumber(initialData.phoneNumber);
            setCountryCode(parsed.countryCode);
            form.reset({
                fullName: initialData.fullName,
                role: initialData.role,
                phoneNumber: parsed.number,
                status: initialData.status,
            });
        }
    }, [initialData, open, form]);

    const onSubmit = async (data: FormValues) => {
        try {
            // Combine country code with phone number
            const phoneNumber = data.phoneNumber
                ? `${countryCode}${data.phoneNumber}`
                : undefined;

            await updateUser({
                userId,
                fullName: data.fullName,
                role: data.role,
                status: data.status,
                phoneNumber,
            });
            toast.success("User updated successfully");
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to update user",
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

                        {/* Phone Number */}
                        <FormField
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone Number</FormLabel>
                                    <div className="flex gap-2">
                                        <Select
                                            value={countryCode}
                                            onValueChange={setCountryCode}
                                        >
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COUNTRY_CODES.map((c) => (
                                                    <SelectItem
                                                        key={c.code}
                                                        value={c.code}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <span>
                                                                {c.flag}
                                                            </span>
                                                            <span>
                                                                {c.code}
                                                            </span>
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormControl>
                                            <Input
                                                placeholder="81234567890"
                                                type="tel"
                                                autoComplete="off"
                                                {...field}
                                                value={field.value ?? ""}
                                            />
                                        </FormControl>
                                    </div>
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

                        {/* Status */}
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="active">
                                                Active
                                            </SelectItem>
                                            <SelectItem value="inactive">
                                                Inactive
                                            </SelectItem>
                                            <SelectItem value="pending">
                                                Pending
                                            </SelectItem>
                                            <SelectItem value="suspended">
                                                Suspended
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
