// hooks/useProductForm.ts - UPDATE THIS
import { useState } from "react";
import { Product } from "../types/product";

export const useProductForm = () => {
    const [showProductForm, setShowProductForm] = useState(false);
    const [productForm, setProductForm] = useState({
        name: "",
        price: "",
        imageUrl: "",
        isMain: false, // Changed from isActive to isMain with default false
    });
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const openCreateForm = () => {
        setEditingProduct(null);
        setProductForm({
            name: "",
            price: "",
            imageUrl: "",
            isMain: false, // Changed from isActive to isMain
        });
        setShowProductForm(true);
    };

    const openEditForm = (product: Product) => {
        setEditingProduct(product);
        setProductForm({
            name: product.name,
            price: product.price.toString(),
            imageUrl: product.image_url || "",
            isMain: product.is_main, // Changed from is_active to is_main
        });
        setShowProductForm(true);
    };

    const closeForm = () => {
        setShowProductForm(false);
        setEditingProduct(null);
        setProductForm({
            name: "",
            price: "",
            imageUrl: "",
            isMain: false, // Changed from isActive to isMain
        });
    };

    return {
        showProductForm,
        productForm,
        editingProduct,
        openCreateForm,
        openEditForm,
        closeForm,
        setProductForm,
    };
};
