"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogPortal,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { CreateStoreInput } from "@/lib/shared/schemas/stores";
import useCreateStore from "@/lib/client/hooks/stores/useCreateStore";
import dynamic from "next/dynamic";
import { ScopeBadge } from "../../_components/scope-badge";

const DynamicMap = dynamic(
    () => import("./map-selector").then((m) => m.MapSelector),
    { ssr: false },
);

type CreateStoreFormValues = z.output<typeof CreateStoreInput>;

interface AddStoreModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function AddStoreModal({
    open,
    onOpenChange,
    onSuccess,
}: AddStoreModalProps) {
    const [position, setPosition] = useState<[number, number] | null>(null);
    const { trigger: createStore, isMutating } = useCreateStore();

    const form = useForm<CreateStoreFormValues>({
        resolver: zodResolver(CreateStoreInput),
        defaultValues: {
            name: "",
            address: "",
            latitude: null,
            longitude: null,
            isFake: false,
        },
    });

    const onSubmit = async (data: CreateStoreFormValues) => {
        try {
            await createStore({
                ...data,
                latitude: position?.[0] ?? null,
                longitude: position?.[1] ?? null,
            });
            toast.success("Store created successfully");
            form.reset();
            setPosition(null);
            onOpenChange(false);
            onSuccess?.();
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to create store",
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogContent className="sm:max-w-[500px]">
                    <div className="absolute -top-9 left-0 z-50">
                        <ScopeBadge />
                    </div>
                    <DialogHeader>
                        <DialogTitle>Add New Store</DialogTitle>
                        <DialogDescription>
                            Fill in the store details and pick its location on
                            the map.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-5"
                            autoComplete="off"
                        >
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Store Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Downtown Branch"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Address</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="123 Main St, City"
                                                {...field}
                                                value={field.value ?? ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="isFake"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                        <div>
                                            <FormLabel>
                                                Practice Store
                                            </FormLabel>
                                            <p className="text-sm text-muted-foreground">
                                                Fake store for training new
                                                employees
                                            </p>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <div>
                                <FormLabel className="mb-1">
                                    Map Location
                                </FormLabel>
                                <DynamicMap
                                    position={position}
                                    onSelect={(lat, lng) =>
                                        setPosition([lat, lng])
                                    }
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isMutating}>
                                    {isMutating && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Create
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </DialogPortal>
        </Dialog>
    );
}
