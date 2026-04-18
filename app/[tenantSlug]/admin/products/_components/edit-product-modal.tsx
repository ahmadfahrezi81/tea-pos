// "use client";

// import { useState, useEffect } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
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
// import { Loader2, Upload, Plus, X } from "lucide-react";
// import { toast } from "sonner";
// import { createClient } from "@/lib/client/supabase";
// import { useCategories } from "@/lib/client/hooks/products/useCategories";

// const EditProductSchema = z.object({
//     name: z.string().min(1, "Product name is required"),
//     price: z.number().min(0, "Price must be positive"),
//     status: z.enum(["active", "inactive", "draft"]),
//     categoryId: z.string().min(1, "Category is required"),
// });

// type EditProductFormData = z.infer<typeof EditProductSchema>;

// interface EditProductModalProps {
//     open: boolean;
//     onOpenChange: (open: boolean) => void;
//     product: Product | null;
//     onSuccess?: () => void;
// }

// export function EditProductModal({
//     open,
//     onOpenChange,
//     product,
//     onSuccess,
// }: EditProductModalProps) {
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [imageFile, setImageFile] = useState<File | null>(null);
//     const [imagePreview, setImagePreview] = useState<string | null>(null);
//     const [showAddCategory, setShowAddCategory] = useState(false);
//     const [newCategoryName, setNewCategoryName] = useState("");
//     const [isAddingCategory, setIsAddingCategory] = useState(false);

//     const { data: categories, mutate: mutateCategories } = useCategories();
//     const supabase = createClient();

//     const form = useForm<EditProductFormData>({
//         resolver: zodResolver(EditProductSchema),
//         defaultValues: {
//             name: "",
//             price: 0,
//             status: "active",
//             categoryId: "",
//         },
//     });

//     // Prefill data when modal opens or product changes
//     useEffect(() => {
//         if (product) {
//             form.reset({
//                 name: product.name || "",
//                 price: product.price || 0,
//                 status: product.status || "active",
//                 categoryId: product.category_id || "",
//             });

//             setImagePreview(product.image_url || null);
//         }
//     }, [product, form]);

//     const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         const file = e.target.files?.[0];
//         if (!file) return;

//         if (!file.type.startsWith("image/")) {
//             toast.error("Please select a valid image file");
//             return;
//         }

//         if (file.size > 5 * 1024 * 1024) {
//             toast.error("Image must be less than 5MB");
//             return;
//         }

//         setImageFile(file);
//         setImagePreview(URL.createObjectURL(file));
//     };

//     const removeImage = () => {
//         setImageFile(null);
//         if (imagePreview) {
//             URL.revokeObjectURL(imagePreview);
//             setImagePreview(null);
//         }
//     };

//     const handleAddCategory = async () => {
//         if (!newCategoryName.trim()) {
//             toast.error("Category name is required");
//             return;
//         }

//         setIsAddingCategory(true);
//         try {
//             const slug = newCategoryName
//                 .toLowerCase()
//                 .replace(/[^a-z0-9]+/g, "-")
//                 .replace(/^-|-$/g, "");

//             const response = await fetch("/api/categories", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ name: newCategoryName, slug }),
//             });

//             if (!response.ok) {
//                 const error = await response.json();
//                 throw new Error(error.error || "Failed to create category");
//             }

//             const result = await response.json();
//             toast.success("Category created successfully");
//             mutateCategories();
//             form.setValue("categoryId", result.category.id);
//             setNewCategoryName("");
//             setShowAddCategory(false);
//         } catch (error) {
//             toast.error(
//                 error instanceof Error
//                     ? error.message
//                     : "Failed to create category"
//             );
//         } finally {
//             setIsAddingCategory(false);
//         }
//     };

//     const onSubmit = async (data: EditProductFormData) => {
//         if (!product) return;

//         setIsSubmitting(true);
//         try {
//             let imageUrl = product.image_url;
//             let imagePath = product.image_path;

//             // If user uploaded a new image
//             if (imageFile) {
//                 // Delete old image if exists
//                 if (imagePath) {
//                     await supabase.storage
//                         .from("product-images")
//                         .remove([imagePath]);
//                 }

//                 // Upload new one
//                 const fileExt = imageFile.name.split(".").pop();
//                 const fileName = `${Math.random()
//                     .toString(36)
//                     .substring(2)}_${Date.now()}.${fileExt}`;
//                 imagePath = fileName;

//                 const { error: uploadError } = await supabase.storage
//                     .from("product-images")
//                     .upload(fileName, imageFile);

//                 if (uploadError) {
//                     throw new Error(`Upload failed: ${uploadError.message}`);
//                 }

//                 const {
//                     data: { publicUrl },
//                 } = supabase.storage
//                     .from("product-images")
//                     .getPublicUrl(fileName);

//                 imageUrl = publicUrl;
//             }

//             // Send update
//             const response = await fetch("/api/products", {
//                 method: "PUT",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                     id: product.id,
//                     name: data.name,
//                     price: data.price,
//                     status: data.status,
//                     categoryId: data.categoryId,
//                     imageUrl,
//                     imagePath,
//                 }),
//             });

//             if (!response.ok) {
//                 const error = await response.json();
//                 throw new Error(error.error || "Failed to update product");
//             }

//             toast.success("Product updated successfully");
//             onOpenChange(false);
//             onSuccess?.();
//         } catch (error) {
//             toast.error(
//                 error instanceof Error
//                     ? error.message
//                     : "Failed to update product"
//             );
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     return (
//         <Dialog open={open} onOpenChange={onOpenChange}>
//             <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
//                 <DialogHeader>
//                     <DialogTitle>Edit Product</DialogTitle>
//                     <DialogDescription>
//                         Update product details and save your changes.
//                     </DialogDescription>
//                 </DialogHeader>

//                 <Form {...form}>
//                     <form
//                         onSubmit={form.handleSubmit(onSubmit)}
//                         className="space-y-4"
//                     >
//                         {/* Image Upload */}
//                         <div className="space-y-2">
//                             <label className="text-sm font-medium">
//                                 Product Image
//                             </label>
//                             {imagePreview ? (
//                                 <div className="relative w-full h-48 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden">
//                                     <img
//                                         src={imagePreview}
//                                         alt="Preview"
//                                         className="object-cover w-full h-full"
//                                     />
//                                     <Button
//                                         type="button"
//                                         variant="destructive"
//                                         size="icon"
//                                         className="absolute top-2 right-2"
//                                         onClick={removeImage}
//                                     >
//                                         <X className="h-4 w-4" />
//                                     </Button>
//                                 </div>
//                             ) : (
//                                 <label className="w-full h-48 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors">
//                                     <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
//                                     <span className="text-sm text-muted-foreground">
//                                         Click to upload new image
//                                     </span>
//                                     <input
//                                         type="file"
//                                         accept="image/*"
//                                         className="hidden"
//                                         onChange={handleImageChange}
//                                         disabled={isSubmitting}
//                                     />
//                                 </label>
//                             )}
//                         </div>

//                         {/* Name */}
//                         <FormField
//                             control={form.control}
//                             name="name"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormLabel>Product Name</FormLabel>
//                                     <FormControl>
//                                         <Input {...field} />
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         {/* Price */}
//                         <FormField
//                             control={form.control}
//                             name="price"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormLabel>Price</FormLabel>
//                                     <FormControl>
//                                         <Input
//                                             type="number"
//                                             min={0}
//                                             step={100}
//                                             {...field}
//                                             onChange={(e) =>
//                                                 field.onChange(
//                                                     parseFloat(
//                                                         e.target.value
//                                                     ) || 0
//                                                 )
//                                             }
//                                         />
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         {/* Status */}
//                         <FormField
//                             control={form.control}
//                             name="status"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormLabel>Status</FormLabel>
//                                     <Select
//                                         onValueChange={field.onChange}
//                                         value={field.value}
//                                     >
//                                         <FormControl>
//                                             <SelectTrigger>
//                                                 <SelectValue />
//                                             </SelectTrigger>
//                                         </FormControl>
//                                         <SelectContent>
//                                             <SelectItem value="active">
//                                                 Active
//                                             </SelectItem>
//                                             <SelectItem value="inactive">
//                                                 Inactive
//                                             </SelectItem>
//                                             <SelectItem value="draft">
//                                                 Draft
//                                             </SelectItem>
//                                         </SelectContent>
//                                     </Select>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         {/* Category */}
//                         <FormField
//                             control={form.control}
//                             name="categoryId"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormLabel>Category</FormLabel>
//                                     {showAddCategory ? (
//                                         <div className="flex gap-2">
//                                             <Input
//                                                 placeholder="New category name"
//                                                 value={newCategoryName}
//                                                 onChange={(e) =>
//                                                     setNewCategoryName(
//                                                         e.target.value
//                                                     )
//                                                 }
//                                             />
//                                             <Button
//                                                 type="button"
//                                                 onClick={handleAddCategory}
//                                                 disabled={isAddingCategory}
//                                             >
//                                                 {isAddingCategory ? (
//                                                     <Loader2 className="h-4 w-4 animate-spin" />
//                                                 ) : (
//                                                     "Add"
//                                                 )}
//                                             </Button>
//                                             <Button
//                                                 type="button"
//                                                 variant="outline"
//                                                 onClick={() => {
//                                                     setShowAddCategory(false);
//                                                     setNewCategoryName("");
//                                                 }}
//                                             >
//                                                 Cancel
//                                             </Button>
//                                         </div>
//                                     ) : (
//                                         <div className="flex gap-2">
//                                             <Select
//                                                 onValueChange={field.onChange}
//                                                 value={field.value || ""}
//                                             >
//                                                 <FormControl>
//                                                     <SelectTrigger className="flex-1">
//                                                         <SelectValue placeholder="Select category" />
//                                                     </SelectTrigger>
//                                                 </FormControl>
//                                                 <SelectContent>
//                                                     {categories?.map((cat) => (
//                                                         <SelectItem
//                                                             key={cat.id}
//                                                             value={cat.id}
//                                                         >
//                                                             {cat.name}
//                                                         </SelectItem>
//                                                     ))}
//                                                 </SelectContent>
//                                             </Select>
//                                             <Button
//                                                 type="button"
//                                                 variant="outline"
//                                                 size="icon"
//                                                 onClick={() =>
//                                                     setShowAddCategory(true)
//                                                 }
//                                             >
//                                                 <Plus className="h-4 w-4" />
//                                             </Button>
//                                         </div>
//                                     )}
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         <div className="flex justify-end gap-2 pt-4">
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
//                                 Save Changes
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
import { Loader2, Upload, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/client/supabase";
import { useCategories } from "@/lib/client/hooks/products/useCategories";
import { UpdateProductInput } from "@/lib/shared/schemas/products";
import type { Product } from "@/lib/shared/schemas/products";

type EditProductFormData = Omit<UpdateProductInput, "id">;

interface EditProductModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
    onSuccess?: () => void;
}

export function EditProductModal({
    open,
    onOpenChange,
    product,
    onSuccess,
}: EditProductModalProps) {
    const supabase = createClient();
    const { data: categories, mutate: mutateCategories } = useCategories();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const form = useForm<EditProductFormData>({
        resolver: zodResolver(UpdateProductInput.omit({ id: true })),
        defaultValues: {
            name: "",
            price: 0,
            categoryId: "",
            status: "active",
            imageUrl: null,
            imagePath: null,
        },
    });

    useEffect(() => {
        if (product) {
            form.reset({
                name: product.name,
                price: product.price,
                status:
                    product.status === "active" ||
                    product.status === "inactive" ||
                    product.status === "draft"
                        ? product.status
                        : "active",
                categoryId: product.categoryId ?? "",
                imageUrl: product.imageUrl ?? null,
                imagePath: product.imagePath ?? null,
            });
            setImagePreview(product.imageUrl || null);
        }
    }, [product, form]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be less than 5MB");
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const removeImage = () => {
        setImageFile(null);
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
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

            const res = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCategoryName, slug }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to create category");
            }

            const { category } = await res.json();
            toast.success("Category added");
            mutateCategories();
            form.setValue("categoryId", category.id);
            setShowAddCategory(false);
            setNewCategoryName("");
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Error creating category",
            );
        } finally {
            setIsAddingCategory(false);
        }
    };

    const onSubmit = async (data: EditProductFormData) => {
        if (!product) return;

        setIsSubmitting(true);
        try {
            let imageUrl = data.imageUrl ?? product.imageUrl;
            let imagePath = data.imagePath ?? product.imagePath;

            // Handle image upload if new file selected
            if (imageFile) {
                if (imagePath) {
                    await supabase.storage
                        .from("product-images")
                        .remove([imagePath]);
                }

                const fileExt = imageFile.name.split(".").pop();
                const fileName = `${crypto.randomUUID()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from("product-images")
                    .upload(fileName, imageFile);

                if (uploadError) throw new Error(uploadError.message);

                const {
                    data: { publicUrl },
                } = supabase.storage
                    .from("product-images")
                    .getPublicUrl(fileName);

                imageUrl = publicUrl;
                imagePath = fileName;
            }

            const res = await fetch("/api/products", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    id: product.id,
                    imageUrl,
                    imagePath,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to update product");
            }

            toast.success("Product updated");
            onSuccess?.();
            onOpenChange(false);
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to update product",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Product</DialogTitle>
                    <DialogDescription>
                        Update the product details below.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        {/* Image Upload */}
                        <div className="space-y-2">
                            <FormLabel>Product Image</FormLabel>
                            {imagePreview ? (
                                <div className="relative w-full h-48 border-2 border-dashed rounded-lg overflow-hidden">
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
                                <label className="w-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition">
                                    <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        Click to upload new image
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

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Price</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step={100}
                                            min={0}
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(
                                                    parseFloat(
                                                        e.target.value,
                                                    ) || 0,
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
                                                        e.target.value,
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
                                                onClick={() =>
                                                    setShowAddCategory(false)
                                                }
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value || ""}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="flex-1">
                                                        <SelectValue placeholder="Select category" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
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
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
