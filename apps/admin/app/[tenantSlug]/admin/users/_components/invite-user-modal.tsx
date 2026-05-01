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
// import { Loader2, Send } from "lucide-react";

// import { toast } from "sonner";
// import { InviteUserSchema } from "@/lib/schemas/tenantInvites";

// interface InviteUserModalProps {
//     open: boolean;
//     onOpenChange: (open: boolean) => void;
//     tenantId: string;
//     onSuccess?: () => void;
// }

// export function InviteUserModal({
//     open,
//     onOpenChange,
//     tenantId,
//     onSuccess,
// }: InviteUserModalProps) {
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     const form = useForm({
//         resolver: zodResolver(InviteUserSchema),
//         defaultValues: {
//             fullName: "",
//             email: "",
//             role: undefined,
//         },
//     });

//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     const onSubmit = async (data: any) => {
//         setIsSubmitting(true);
//         try {
//             const response = await fetch("/api/tenant-invites", {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify({
//                     tenantId,
//                     invitedEmail: data.email,
//                     role: data.role,
//                     description: data.description,
//                 }),
//             });

//             if (!response.ok) {
//                 const error = await response.json();
//                 throw new Error(error.error || "Failed to send invitation");
//             }

//             toast.success("Invitation sent successfully", {
//                 description: `An invite has been sent to ${data.email}`,
//             });

//             form.reset();
//             onOpenChange(false);
//             onSuccess?.();
//         } catch (error) {
//             toast.error(
//                 error instanceof Error
//                     ? error.message
//                     : "Failed to send invitation"
//             );
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     return (
//         <Dialog open={open} onOpenChange={onOpenChange}>
//             <DialogContent className="sm:max-w-[500px]">
//                 <DialogHeader>
//                     <DialogTitle className="flex items-center gap-2">
//                         <Send className="h-5 w-5" />
//                         Invite User
//                     </DialogTitle>
//                     <DialogDescription>
//                         Invite new user to join your team by sending them an
//                         email invitation. Assign a role to define their access
//                         level.
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
//                                             type="text"
//                                             placeholder="eg: John Doe"
//                                             autoComplete="off"
//                                             data-form-type="other"
//                                             data-lpignore="true"
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
//                                             placeholder="eg: john.doe@gmail.com"
//                                             autoComplete="off"
//                                             data-form-type="other"
//                                             data-lpignore="true"
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
//                                         value={field.value}
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

//                         {/* Submit Buttons */}
//                         <div className="flex justify-end gap-2">
//                             <Button
//                                 type="button"
//                                 variant="outline"
//                                 onClick={() => onOpenChange(false)}
//                                 disabled={isSubmitting}
//                             >
//                                 Cancel
//                             </Button>
//                             <Button type="submit" disabled={isSubmitting}>
//                                 {isSubmitting && (
//                                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                                 )}
//                                 <Send className="mr-2 h-4 w-4" />
//                                 Invite
//                             </Button>
//                         </div>
//                     </form>
//                 </Form>
//             </DialogContent>
//         </Dialog>
//     );
// }

"use client";

import { useState } from "react";
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
import { Loader2, Send } from "lucide-react";

import { toast } from "sonner";
import { InviteUserInput } from "@/lib/shared/schemas/tenantInvites";

interface InviteUserModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tenantId: string;
    onSuccess?: () => void;
}

export function InviteUserModal({
    open,
    onOpenChange,
    tenantId,
    onSuccess,
}: InviteUserModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        resolver: zodResolver(InviteUserInput),
        defaultValues: {
            fullName: "",
            email: "",
            role: undefined,
        },
    });

    const onSubmit = async (data: InviteUserInput) => {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/tenant-invites", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fullName: data.fullName,
                    tenantId,
                    invitedEmail: data.email,
                    role: data.role,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to send invitation");
            }

            toast.success("Invitation sent successfully", {
                description: `An invite has been sent to ${data.email}`,
            });

            form.reset();
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to send invitation",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        Invite User
                    </DialogTitle>
                    <DialogDescription>
                        Invite new user to join your team by sending them an
                        email invitation. Assign a role to define their access
                        level.
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
                                            type="text"
                                            placeholder="eg: John Doe"
                                            autoComplete="off"
                                            data-form-type="other"
                                            data-lpignore="true"
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
                                            placeholder="eg: john.doe@gmail.com"
                                            autoComplete="off"
                                            data-form-type="other"
                                            data-lpignore="true"
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
                                        value={field.value}
                                        defaultValue={field.value}
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

                        {/* Submit Buttons */}
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                <Send className="mr-2 h-4 w-4" />
                                Invite
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
