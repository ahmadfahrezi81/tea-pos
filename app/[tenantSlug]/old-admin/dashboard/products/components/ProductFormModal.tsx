// // components/ProductFormModal.tsx
// import React, { useState, useEffect } from "react";
// import { Product } from "../types/product";
// import { Package, X } from "lucide-react";

// interface ProductFormModalProps {
//     isOpen: boolean;
//     productForm: { name: string; price: string };
//     editingProduct: Product | null;
//     onSubmit: (e: React.FormEvent) => void;
//     onClose: () => void;
//     onFormChange: (form: { name: string; price: string }) => void;
//     isSubmitting?: boolean;
// }

// export const ProductFormModal: React.FC<ProductFormModalProps> = ({
//     isOpen,
//     productForm,
//     editingProduct,
//     onSubmit,
//     onClose,
//     onFormChange,
//     isSubmitting = false,
// }) => {
//     const [hasChanges, setHasChanges] = useState(false);

//     // Check for changes when form data changes
//     useEffect(() => {
//         if (editingProduct) {
//             // For editing: check if current form differs from original product data
//             const hasNameChange = productForm.name !== editingProduct.name;
//             const hasPriceChange =
//                 productForm.price !== editingProduct.price.toString();
//             setHasChanges(hasNameChange || hasPriceChange);
//         } else {
//             // For new product: check if any field has content
//             setHasChanges(
//                 productForm.name.trim() !== "" ||
//                     productForm.price.trim() !== ""
//             );
//         }
//     }, [productForm, editingProduct]);

//     const handleKeyPress = (e: React.KeyboardEvent) => {
//         if (e.key === "Escape") {
//             onClose();
//         }
//     };

//     const isFormValid =
//         productForm.name.trim() !== "" &&
//         productForm.price.trim() !== "" &&
//         !isNaN(Number(productForm.price)) &&
//         Number(productForm.price) > 0;
//     const canSubmit =
//         isFormValid && (editingProduct ? hasChanges : true) && !isSubmitting;

//     if (!isOpen) return null;

//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
//             {/* Backdrop */}
//             <div
//                 className="fixed inset-0 bg-black/50 transition-opacity"
//                 onClick={onClose}
//             />

//             {/* Modal */}
//             <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
//                 {/* Header */}
//                 <div className="flex items-center justify-between mb-4">
//                     <div className="flex items-center gap-3">
//                         <div className="p-2 bg-blue-100 rounded-lg">
//                             <Package className="w-5 h-5 text-blue-600" />
//                         </div>
//                         <h2 className="text-xl font-semibold text-gray-900">
//                             {editingProduct
//                                 ? "Edit Product"
//                                 : "Add New Product"}
//                         </h2>
//                     </div>
//                     <button
//                         onClick={onClose}
//                         className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
//                         disabled={isSubmitting}
//                     >
//                         <X className="w-5 h-5 text-gray-500" />
//                     </button>
//                 </div>

//                 {/* Form */}
//                 <form onSubmit={onSubmit} className="space-y-6">
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-2">
//                             Product Name
//                         </label>
//                         <input
//                             type="text"
//                             value={productForm.name}
//                             onChange={(e) =>
//                                 onFormChange({
//                                     ...productForm,
//                                     name: e.target.value,
//                                 })
//                             }
//                             onKeyDown={handleKeyPress}
//                             placeholder="Enter product name"
//                             className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm transition-colors focus:ring-purple-500 focus:border-purple-500"
//                             required
//                             disabled={isSubmitting}
//                             autoFocus
//                         />
//                     </div>

//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-2">
//                             Price
//                         </label>
//                         <div className="relative">
//                             <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
//                                 Rp
//                             </span>
//                             <input
//                                 type="number"
//                                 step="100"
//                                 min="0"
//                                 value={productForm.price}
//                                 onChange={(e) =>
//                                     onFormChange({
//                                         ...productForm,
//                                         price: e.target.value,
//                                     })
//                                 }
//                                 placeholder="000000"
//                                 className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm transition-colors focus:ring-purple-500 focus:border-purple-500"
//                                 required
//                                 disabled={isSubmitting}
//                             />
//                         </div>
//                         {productForm.price &&
//                             (isNaN(Number(productForm.price)) ||
//                                 Number(productForm.price) <= 0) && (
//                                 <p className="mt-1 text-xs text-red-600">
//                                     Please enter a valid price greater than 0
//                                 </p>
//                             )}
//                     </div>

//                     {/* Actions */}
//                     <div className="flex gap-3 justify-end">
//                         <button
//                             type="button"
//                             onClick={onClose}
//                             className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
//                             disabled={isSubmitting}
//                         >
//                             Cancel
//                         </button>
//                         <button
//                             type="submit"
//                             disabled={!canSubmit}
//                             className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
//                                 !canSubmit
//                                     ? "bg-gray-300 text-gray-500 cursor-not-allowed"
//                                     : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md"
//                             }`}
//                         >
//                             {isSubmitting ? (
//                                 <>
//                                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
//                                     {editingProduct
//                                         ? "Updating..."
//                                         : "Creating..."}
//                                 </>
//                             ) : (
//                                 <>
//                                     <Package className="w-4 h-4" />
//                                     {editingProduct
//                                         ? "Update Product"
//                                         : "Create Product"}
//                                 </>
//                             )}
//                         </button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// };

// // components/ProductFormModal.tsx
// import React, { useState, useEffect } from "react";
// import Image from "next/image";
// import { Product } from "../types/product";
// import { Package, X, ImageIcon } from "lucide-react";

// interface ProductFormModalProps {
//     isOpen: boolean;
//     productForm: {
//         name: string;
//         price: string;
//         imageUrl: string;
//         isMain: boolean;
//     };
//     editingProduct: Product | null;
//     onSubmit: (e: React.FormEvent) => void;
//     onClose: () => void;
//     onFormChange: (form: {
//         name: string;
//         price: string;
//         imageUrl: string;
//         isMain: boolean;
//     }) => void;
//     isSubmitting?: boolean;
// }

// export const ProductFormModal: React.FC<ProductFormModalProps> = ({
//     isOpen,
//     productForm,
//     editingProduct,
//     onSubmit,
//     onClose,
//     onFormChange,
//     isSubmitting = false,
// }) => {
//     const [hasChanges, setHasChanges] = useState(false);
//     const [imageError, setImageError] = useState(false);

//     // Check for changes when form data changes
//     useEffect(() => {
//         if (editingProduct) {
//             // For editing: check if current form differs from original product data
//             const hasNameChange = productForm.name !== editingProduct.name;
//             const hasPriceChange =
//                 productForm.price !== editingProduct.price.toString();
//             const hasImageChange =
//                 productForm.imageUrl !== (editingProduct.image_url || "");
//             const hasMainChange = productForm.isMain !== editingProduct.is_main;
//             setHasChanges(
//                 hasNameChange ||
//                     hasPriceChange ||
//                     hasImageChange ||
//                     hasMainChange
//             );
//         } else {
//             // For new product: check if any field has content
//             setHasChanges(
//                 productForm.name.trim() !== "" ||
//                     productForm.price.trim() !== "" ||
//                     productForm.imageUrl.trim() !== "" ||
//                     productForm.isMain !== false // default is false for new products
//             );
//         }
//     }, [productForm, editingProduct]);

//     const handleKeyPress = (e: React.KeyboardEvent) => {
//         if (e.key === "Escape") {
//             onClose();
//         }
//     };

//     const isFormValid =
//         productForm.name.trim() !== "" &&
//         productForm.price.trim() !== "" &&
//         !isNaN(Number(productForm.price)) &&
//         Number(productForm.price) > 0;
//     const canSubmit =
//         isFormValid && (editingProduct ? hasChanges : true) && !isSubmitting;

//     if (!isOpen) return null;

//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
//             {/* Backdrop */}
//             <div
//                 className="fixed inset-0 bg-black/50 transition-opacity"
//                 onClick={onClose}
//             />

//             {/* Modal */}
//             <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
//                 {/* Header */}
//                 <div className="flex items-center justify-between mb-4">
//                     <div className="flex items-center gap-3">
//                         <div className="p-2 bg-blue-100 rounded-lg">
//                             <Package className="w-5 h-5 text-blue-600" />
//                         </div>
//                         <h2 className="text-xl font-semibold text-gray-900">
//                             {editingProduct
//                                 ? "Edit Product"
//                                 : "Add New Product"}
//                         </h2>
//                     </div>
//                     <button
//                         onClick={onClose}
//                         className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
//                         disabled={isSubmitting}
//                     >
//                         <X className="w-5 h-5 text-gray-500" />
//                     </button>
//                 </div>

//                 {/* Form */}
//                 <form onSubmit={onSubmit} className="space-y-6">
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-2">
//                             Product Name
//                         </label>
//                         <input
//                             type="text"
//                             value={productForm.name}
//                             onChange={(e) =>
//                                 onFormChange({
//                                     ...productForm,
//                                     name: e.target.value,
//                                 })
//                             }
//                             onKeyDown={handleKeyPress}
//                             placeholder="Enter product name"
//                             className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm transition-colors focus:ring-purple-500 focus:border-purple-500"
//                             required
//                             disabled={isSubmitting}
//                             autoFocus
//                         />
//                     </div>

//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-2">
//                             Price
//                         </label>
//                         <div className="relative">
//                             <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
//                                 Rp
//                             </span>
//                             <input
//                                 type="number"
//                                 step="100"
//                                 min="0"
//                                 value={productForm.price}
//                                 onChange={(e) =>
//                                     onFormChange({
//                                         ...productForm,
//                                         price: e.target.value,
//                                     })
//                                 }
//                                 placeholder="000000"
//                                 className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm transition-colors focus:ring-purple-500 focus:border-purple-500"
//                                 required
//                                 disabled={isSubmitting}
//                             />
//                         </div>
//                         {productForm.price &&
//                             (isNaN(Number(productForm.price)) ||
//                                 Number(productForm.price) <= 0) && (
//                                 <p className="mt-1 text-xs text-red-600">
//                                     Please enter a valid price greater than 0
//                                 </p>
//                             )}
//                     </div>

//                     {/* Image URL Input */}
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-2">
//                             Image URL
//                         </label>
//                         <input
//                             type="url"
//                             value={productForm.imageUrl}
//                             onChange={(e) => {
//                                 onFormChange({
//                                     ...productForm,
//                                     imageUrl: e.target.value,
//                                 });
//                                 setImageError(false);
//                             }}
//                             placeholder="Paste image URL from imgbb.com"
//                             className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm transition-colors focus:ring-purple-500 focus:border-purple-500"
//                             disabled={isSubmitting}
//                         />
//                         <p className="mt-1 text-xs text-gray-500">
//                             Upload your image to imgbb.com and paste the URL
//                             here
//                         </p>
//                         {productForm.imageUrl &&
//                             !productForm.imageUrl.startsWith(
//                                 "https://i.ibb.co"
//                             ) && (
//                                 <p className="mt-1 text-xs text-red-600">
//                                     Please use a valid imgbb.com URL that starts
//                                     with https://i.ibb.co
//                                 </p>
//                             )}
//                     </div>

//                     {/* Image Preview */}
//                     {/* {productForm.imageUrl && !imageError && (
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Image Preview
//                             </label>
//                             <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
//                                 <Image
//                                     src={productForm.imageUrl}
//                                     alt="Product preview"
//                                     fill
//                                     className="object-cover"
//                                     onError={() => setImageError(true)}
//                                     onLoad={() => setImageError(false)}
//                                 />
//                             </div>
//                         </div>
//                     )} */}

//                     {productForm.imageUrl && !imageError && (
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Image Preview
//                             </label>
//                             <div className="relative w-56 h-56 bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
//                                 <Image
//                                     src={productForm.imageUrl}
//                                     alt="Product preview"
//                                     fill
//                                     className="object-cover"
//                                     onError={() => setImageError(true)}
//                                     onLoad={() => setImageError(false)}
//                                 />
//                                 {/* Overlay with "Preview" text */}
//                                 <div className="absolute inset-0 flex items-center justify-center bg-black/10">
//                                     <span className="text-white text-lg font-semibold">
//                                         Preview
//                                     </span>
//                                 </div>
//                             </div>
//                         </div>
//                     )}

//                     {/* Image Error State */}
//                     {productForm.imageUrl && imageError && (
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                                 Image Preview
//                             </label>
//                             <div className="w-full h-48 bg-gray-100 rounded-lg border flex items-center justify-center">
//                                 <div className="text-center">
//                                     <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
//                                     <p className="text-sm text-red-600">
//                                         Failed to load image
//                                     </p>
//                                     <p className="text-xs text-gray-500">
//                                         Please check the URL
//                                     </p>
//                                 </div>
//                             </div>
//                         </div>
//                     )}

//                     {/* Main Product Switch */}
//                     <div>
//                         <label className="flex items-center justify-between">
//                             <span className="text-sm font-medium text-gray-700">
//                                 Main Product
//                             </span>
//                             <div className="relative inline-flex items-center">
//                                 <button
//                                     type="button"
//                                     onClick={() =>
//                                         !isSubmitting &&
//                                         onFormChange({
//                                             ...productForm,
//                                             isMain: !productForm.isMain,
//                                         })
//                                     }
//                                     disabled={isSubmitting}
//                                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
//                                         productForm.isMain
//                                             ? "bg-purple-600"
//                                             : "bg-gray-300"
//                                     } ${
//                                         isSubmitting
//                                             ? "opacity-50 cursor-not-allowed"
//                                             : "cursor-pointer"
//                                     }`}
//                                 >
//                                     <span
//                                         className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
//                                             productForm.isMain
//                                                 ? "translate-x-6"
//                                                 : "translate-x-1"
//                                         }`}
//                                     />
//                                 </button>
//                                 <span
//                                     className={`ml-3 text-sm ${
//                                         productForm.isMain
//                                             ? "text-purple-700 font-medium"
//                                             : "text-gray-500"
//                                     }`}
//                                 >
//                                     {productForm.isMain ? "Yes" : "No"}
//                                 </span>
//                             </div>
//                         </label>
//                         <p className="mt-1 text-xs text-gray-500">
//                             Main products will be featured prominently on your
//                             storefront
//                         </p>
//                     </div>

//                     {/* Actions */}
//                     <div className="flex gap-3 justify-end">
//                         <button
//                             type="button"
//                             onClick={onClose}
//                             className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
//                             disabled={isSubmitting}
//                         >
//                             Cancel
//                         </button>
//                         <button
//                             type="submit"
//                             disabled={!canSubmit}
//                             className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
//                                 !canSubmit
//                                     ? "bg-gray-300 text-gray-500 cursor-not-allowed"
//                                     : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md"
//                             }`}
//                         >
//                             {isSubmitting ? (
//                                 <>
//                                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
//                                     {editingProduct
//                                         ? "Updating..."
//                                         : "Creating..."}
//                                 </>
//                             ) : (
//                                 <>
//                                     <Package className="w-4 h-4" />
//                                     {editingProduct
//                                         ? "Update Product"
//                                         : "Create Product"}
//                                 </>
//                             )}
//                         </button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// };

// components/ProductFormModal.tsx
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Product } from "../types/product";
import { Package, X, ImageIcon } from "lucide-react";

interface ProductFormModalProps {
    isOpen: boolean;
    productForm: {
        name: string;
        price: string;
        imageUrl: string;
        isMain: boolean;
    };
    editingProduct: Product | null;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
    onFormChange: (form: {
        name: string;
        price: string;
        imageUrl: string;
        isMain: boolean;
    }) => void;
    isSubmitting?: boolean;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
    isOpen,
    productForm,
    editingProduct,
    onSubmit,
    onClose,
    onFormChange,
    isSubmitting = false,
}) => {
    const [hasChanges, setHasChanges] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Enhanced validation function for imgbb URLs
    const isValidImageUrl = (url: string): boolean => {
        if (!url.trim()) return true; // Empty URLs are allowed
        return url.startsWith("https://i.ibb.co");
    };

    // Check for changes when form data changes
    useEffect(() => {
        if (editingProduct) {
            // For editing: check if current form differs from original product data
            const hasNameChange = productForm.name !== editingProduct.name;
            const hasPriceChange =
                productForm.price !== editingProduct.price.toString();
            const hasImageChange =
                productForm.imageUrl !== (editingProduct.image_url || "");
            const hasMainChange = productForm.isMain !== editingProduct.is_main;
            setHasChanges(
                hasNameChange ||
                    hasPriceChange ||
                    hasImageChange ||
                    hasMainChange
            );
        } else {
            // For new product: check if any field has content
            setHasChanges(
                productForm.name.trim() !== "" ||
                    productForm.price.trim() !== "" ||
                    productForm.imageUrl.trim() !== "" ||
                    productForm.isMain !== false // default is false for new products
            );
        }
    }, [productForm, editingProduct]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            onClose();
        }
    };

    // Enhanced form validation including image URL
    const isFormValid =
        productForm.name.trim() !== "" &&
        productForm.price.trim() !== "" &&
        !isNaN(Number(productForm.price)) &&
        Number(productForm.price) > 0 &&
        isValidImageUrl(productForm.imageUrl); // Added image URL validation

    const canSubmit =
        isFormValid && (editingProduct ? hasChanges : true) && !isSubmitting;

    // Enhanced submit handler with additional validation
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Double-check validation before submitting
        if (!isValidImageUrl(productForm.imageUrl)) {
            return; // Prevent submission
        }

        onSubmit(e);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {editingProduct
                                ? "Edit Product"
                                : "Add New Product"}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={isSubmitting}
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Product Name
                        </label>
                        <input
                            type="text"
                            value={productForm.name}
                            onChange={(e) =>
                                onFormChange({
                                    ...productForm,
                                    name: e.target.value,
                                })
                            }
                            onKeyDown={handleKeyPress}
                            placeholder="Enter product name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm transition-colors focus:ring-purple-500 focus:border-purple-500"
                            required
                            disabled={isSubmitting}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Price
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                Rp
                            </span>
                            <input
                                type="number"
                                step="100"
                                min="0"
                                value={productForm.price}
                                onChange={(e) =>
                                    onFormChange({
                                        ...productForm,
                                        price: e.target.value,
                                    })
                                }
                                placeholder="000000"
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm transition-colors focus:ring-purple-500 focus:border-purple-500"
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                        {productForm.price &&
                            (isNaN(Number(productForm.price)) ||
                                Number(productForm.price) <= 0) && (
                                <p className="mt-1 text-xs text-red-600">
                                    Please enter a valid price greater than 0
                                </p>
                            )}
                    </div>

                    {/* Image URL Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Image URL{" "}
                            <span className="text-gray-500">(Optional)</span>
                        </label>
                        <input
                            type="url"
                            value={productForm.imageUrl}
                            onChange={(e) => {
                                onFormChange({
                                    ...productForm,
                                    imageUrl: e.target.value,
                                });
                                setImageError(false);
                            }}
                            placeholder="Paste image URL from imgbb.com (must start with https://i.ibb.co)"
                            className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:ring-purple-500 focus:border-purple-500 ${
                                productForm.imageUrl &&
                                !isValidImageUrl(productForm.imageUrl)
                                    ? "border-red-300 bg-red-50"
                                    : "border-gray-300"
                            }`}
                            disabled={isSubmitting}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Only imgbb.com URLs are supported. Upload your image
                            to imgbb.com and paste the direct link here.
                        </p>
                        {productForm.imageUrl &&
                            !isValidImageUrl(productForm.imageUrl) && (
                                <p className="mt-1 text-xs text-red-600">
                                    ⚠️ Invalid URL: Only imgbb.com URLs starting
                                    with https://i.ibb.co are allowed
                                </p>
                            )}
                    </div>

                    {/* Image Preview - Only show if valid ibb.co URL */}
                    {productForm.imageUrl &&
                        isValidImageUrl(productForm.imageUrl) &&
                        !imageError && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Image Preview
                                </label>
                                <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border">
                                    <Image
                                        src={productForm.imageUrl}
                                        alt="Product preview"
                                        fill
                                        className="object-cover"
                                        onError={() => setImageError(true)}
                                        onLoad={() => setImageError(false)}
                                    />
                                </div>
                            </div>
                        )}

                    {/* Show message for non-ibb.co URLs */}
                    {productForm.imageUrl &&
                        !isValidImageUrl(productForm.imageUrl) && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Image Preview
                                </label>
                                <div className="w-full h-48 bg-red-50 rounded-lg border-2 border-red-200 flex items-center justify-center">
                                    <div className="text-center">
                                        <ImageIcon className="w-8 h-8 text-red-400 mx-auto mb-2" />
                                        <p className="text-sm text-red-600 font-medium">
                                            Invalid Image URL
                                        </p>
                                        <p className="text-xs text-red-500">
                                            Only imgbb.com URLs are supported
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                    {/* Image Error State */}
                    {productForm.imageUrl &&
                        imageError &&
                        isValidImageUrl(productForm.imageUrl) && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Image Preview
                                </label>
                                <div className="w-full h-48 bg-gray-100 rounded-lg border flex items-center justify-center">
                                    <div className="text-center">
                                        <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-red-600">
                                            Failed to load image
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Please check the URL
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                    {/* Main Product Switch */}
                    <div>
                        <label className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                                Main Product
                            </span>
                            <div className="relative inline-flex items-center">
                                <button
                                    type="button"
                                    onClick={() =>
                                        !isSubmitting &&
                                        onFormChange({
                                            ...productForm,
                                            isMain: !productForm.isMain,
                                        })
                                    }
                                    disabled={isSubmitting}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                                        productForm.isMain
                                            ? "bg-purple-600"
                                            : "bg-gray-300"
                                    } ${
                                        isSubmitting
                                            ? "opacity-50 cursor-not-allowed"
                                            : "cursor-pointer"
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                            productForm.isMain
                                                ? "translate-x-6"
                                                : "translate-x-1"
                                        }`}
                                    />
                                </button>
                                <span
                                    className={`ml-3 text-sm ${
                                        productForm.isMain
                                            ? "text-purple-700 font-medium"
                                            : "text-gray-500"
                                    }`}
                                >
                                    {productForm.isMain ? "Yes" : "No"}
                                </span>
                            </div>
                        </label>
                        <p className="mt-1 text-xs text-gray-500">
                            Main products will be featured prominently on your
                            storefront
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                                !canSubmit
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md"
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    {editingProduct
                                        ? "Updating..."
                                        : "Creating..."}
                                </>
                            ) : (
                                <>
                                    <Package className="w-4 h-4" />
                                    {editingProduct
                                        ? "Update Product"
                                        : "Create Product"}
                                </>
                            )}
                        </button>
                    </div>

                    {/* Form Validation Summary - Only show when form is invalid and user tried to submit */}
                    {!canSubmit &&
                        productForm.imageUrl &&
                        !isValidImageUrl(productForm.imageUrl) && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-700 font-medium">
                                    🚫 Cannot submit: Invalid image URL
                                </p>
                                <p className="text-xs text-red-600 mt-1">
                                    Please use a valid imgbb.com URL or leave
                                    the image field empty.
                                </p>
                            </div>
                        )}
                </form>
            </div>
        </div>
    );
};
