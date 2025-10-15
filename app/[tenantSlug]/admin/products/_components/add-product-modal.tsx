"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Loader2, Upload, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useCategories } from "@/lib/hooks/products/useCategories";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AddProductSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    price: z.number().min(0, "Price must be positive"),
    status: z.enum(["active", "inactive", "draft"]),
    categoryId: z.string().min(1, "Category is required"),
});

type AddProductFormData = z.infer<typeof AddProductSchema>;

interface AddProductModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function AddProductModal({
    open,
    onOpenChange,
    onSuccess,
}: AddProductModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [isAddingCategory, setIsAddingCategory] = useState(false);

    const { data: categories, mutate: mutateCategories } = useCategories();
    const supabase = createClient();

    const form = useForm<AddProductFormData>({
        resolver: zodResolver(AddProductSchema),
        defaultValues: {
            name: "",
            price: 0,
            status: "active",
            categoryId: "",
        },
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        // Validate file size (1MB)
        if (file.size > 1 * 1024 * 1024) {
            toast.error("Image must be less than 1MB");
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const removeImage = () => {
        setImageFile(null);
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) {
            toast.error("Category name is required");
            return;
        }

        setIsAddingCategory(true);
        try {
            const slug = newCategoryName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

            const response = await fetch("/api/product-categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCategoryName, slug }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to create category");
            }

            const result = await response.json();
            toast.success("Category created successfully");
            mutateCategories();
            form.setValue("categoryId", result.category.id);
            setNewCategoryName("");
            setShowAddCategory(false);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to create category"
            );
        } finally {
            setIsAddingCategory(false);
        }
    };

    const onSubmit = async (data: AddProductFormData) => {
        setIsSubmitting(true);
        try {
            let imageUrl: string | null = null;
            let imagePath: string | null = null;

            // Upload image if provided
            if (imageFile) {
                const fileExt = imageFile.name.split(".").pop();
                const fileName = `${Math.random()
                    .toString(36)
                    .substring(2)}_${Date.now()}.${fileExt}`;
                imagePath = fileName;

                const { error: uploadError } = await supabase.storage
                    .from("product-images")
                    .upload(fileName, imageFile);

                if (uploadError) {
                    throw new Error(`Upload failed: ${uploadError.message}`);
                }

                // Get public URL
                const {
                    data: { publicUrl },
                } = supabase.storage
                    .from("product-images")
                    .getPublicUrl(fileName);

                imageUrl = publicUrl;
            }

            // Create product
            const response = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: data.name,
                    price: data.price,
                    status: data.status,
                    categoryId: data.categoryId,
                    imageUrl,
                    imagePath,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to create product");
            }

            toast.success("Product created successfully");
            form.reset();
            removeImage();
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to create product"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>
                        Create a new product. Click save when you&apos;re done.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        {/* Image Upload */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Product Image
                            </label>
                            {imagePreview ? (
                                <div className="relative w-full h-48 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="object-cover w-full h-full"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2"
                                        onClick={removeImage}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <label className="w-full h-48 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors">
                                    <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        Click to upload image
                                    </span>
                                    <span className="text-xs text-muted-foreground mt-1">
                                        Max 5MB (JPG, PNG, WEBP)
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageChange}
                                        disabled={isSubmitting}
                                    />
                                </label>
                            )}
                        </div>

                        {/* Name */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Product Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g., Iced Lemon Tea"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Price */}
                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Price</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="15000"
                                            step={100}
                                            min={0}
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(
                                                    parseFloat(
                                                        e.target.value
                                                    ) || 0
                                                )
                                            }
                                        />
                                    </FormControl>
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
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="active">
                                                Active
                                            </SelectItem>
                                            <SelectItem value="inactive">
                                                Inactive
                                            </SelectItem>
                                            <SelectItem value="draft">
                                                Draft
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Category */}
                        <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    {showAddCategory ? (
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="New category name"
                                                value={newCategoryName}
                                                onChange={(e) =>
                                                    setNewCategoryName(
                                                        e.target.value
                                                    )
                                                }
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleAddCategory}
                                                disabled={isAddingCategory}
                                            >
                                                {isAddingCategory ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    "Add"
                                                )}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setShowAddCategory(false);
                                                    setNewCategoryName("");
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Select
                                                onValueChange={(value) =>
                                                    field.onChange(
                                                        value === "null"
                                                            ? ""
                                                            : value
                                                    )
                                                }
                                                value={field.value || "null"}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="flex-1">
                                                        <SelectValue placeholder="Select category" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="null">
                                                        No Category
                                                    </SelectItem>
                                                    {categories?.map((cat) => (
                                                        <SelectItem
                                                            key={cat.id}
                                                            value={cat.id}
                                                        >
                                                            {cat.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() =>
                                                    setShowAddCategory(true)
                                                }
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Submit */}
                        <div className="flex justify-end gap-2 pt-4">
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
                                Create Product
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
