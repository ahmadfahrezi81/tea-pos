// // components/ProductList.tsx
// import React from "react";
// import { Product } from "../types/product";
// import { Edit, Power, PowerOff, Package } from "lucide-react";
// import Image from "next/image";

// interface ProductListProps {
//     products: Product[];
//     onEditProduct: (product: Product) => void;
//     onToggleActive: (product: Product) => void;
// }

// export const ProductList: React.FC<ProductListProps> = ({
//     products,
//     onEditProduct,
//     onToggleActive,
// }) => {
//     if (products.length === 0) {
//         return (
//             <div className="text-center py-12">
//                 <div className="flex flex-col items-center">
//                     <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
//                         <Package className="w-8 h-8 text-gray-400" />
//                     </div>
//                     <p className="text-gray-500 text-lg">No products found</p>
//                     <p className="text-gray-400 text-sm mt-1">
//                         Products matching your filters will appear here
//                     </p>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-4 pb-30">
//             {products.map((product) => (
//                 <div
//                     key={product.id}
//                     className={`bg-white rounded-xl shadow-sm border-1 border-gray-200 transition-all hover:shadow-md ${
//                         !product.is_active ? "opacity-80" : ""
//                     }`}
//                 >
//                     {/* Product Image Placeholder */}
//                     <div className="aspect-square bg-gray-100 rounded-t-xl flex items-center justify-center overflow-hidden relative">
//                         {product.image_url ? (
//                             <Image
//                                 src={product.image_url}
//                                 alt={product.name}
//                                 fill
//                                 className="object-cover rounded-t-xl p-2"
//                             />
//                         ) : (
//                             <div className="text-gray-400 z-10">
//                                 <Package className="w-12 h-12" />
//                             </div>
//                         )}
//                     </div>

//                     {/* Product Info */}
//                     <div className="p-4">
//                         <div className="flex items-start justify-between mb-2">
//                             <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
//                                 {product.name}
//                             </h3>
//                             <div className="flex items-center gap-1 ml-2">
//                                 {product.is_main && (
//                                     <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
//                                         Main
//                                     </span>
//                                 )}
//                             </div>
//                         </div>

//                         <div className="flex items-center justify-between mb-4">
//                             <p className="text-2xl font-bold text-blue-600">
//                                 Rp {product.price.toLocaleString()}
//                             </p>
//                             <span
//                                 className={`text-xs px-2 py-1 rounded-full font-medium ${
//                                     product.is_active
//                                         ? "bg-green-100 text-green-700"
//                                         : "bg-red-100 text-red-700"
//                                 }`}
//                             >
//                                 {product.is_active ? "Active" : "Inactive"}
//                             </span>
//                         </div>

//                         {/* Actions */}
//                         <div className="flex gap-2">
//                             <button
//                                 onClick={() => onEditProduct(product)}
//                                 className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
//                             >
//                                 <Edit className="w-4 h-4" />
//                                 Edit
//                             </button>
//                             <button
//                                 onClick={() => onToggleActive(product)}
//                                 className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
//                                     product.is_active
//                                         ? "bg-red-50 text-red-600 hover:bg-red-100"
//                                         : "bg-green-50 text-green-600 hover:bg-green-100"
//                                 }`}
//                             >
//                                 {product.is_active ? (
//                                     <>
//                                         <PowerOff className="w-4 h-4" />
//                                         Deactivate
//                                     </>
//                                 ) : (
//                                     <>
//                                         <Power className="w-4 h-4" />
//                                         Activate
//                                     </>
//                                 )}
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             ))}
//         </div>
//     );
// };

// // components/ProductList.tsx
// import React, { useState } from "react";
// import { Product } from "../types/product";
// import {
//     Power,
//     PowerOff,
//     Package,
//     MoreVertical,
//     Edit2,
//     Trash2,
// } from "lucide-react";
// import Image from "next/image";

// interface DropdownMenuProps {
//     onEdit: () => void;
//     onDelete: () => void;
// }

// interface ProductListProps {
//     products: Product[];
//     onEditProduct: (product: Product) => void;
//     onToggleActive: (product: Product) => void;
//     onDeleteProduct: (product: Product) => void;
// }

// // Dropdown Menu Component
// const DropdownMenu: React.FC<DropdownMenuProps> = ({ onEdit, onDelete }) => {
//     const [isOpen, setIsOpen] = useState<boolean>(false);

//     const handleAction = (action: () => void): void => {
//         action();
//         setIsOpen(false);
//     };

//     return (
//         <div className="relative">
//             <button
//                 onClick={() => setIsOpen(!isOpen)}
//                 className="p-1 rounded hover:bg-gray-100 transition-colors"
//                 type="button"
//             >
//                 <MoreVertical size={18} className="text-gray-600" />
//             </button>

//             {isOpen && (
//                 <>
//                     {/* Backdrop to close dropdown */}
//                     <div
//                         className="fixed inset-0 z-10"
//                         onClick={() => setIsOpen(false)}
//                     />

//                     {/* Dropdown content */}
//                     <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px] p-2 space-y-2">
//                         <button
//                             onClick={() => handleAction(onEdit)}
//                             className="w-full px-2 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 rounded"
//                             type="button"
//                         >
//                             <Edit2 size={14} />
//                             Edit Product
//                         </button>
//                         <button
//                             onClick={() => handleAction(onDelete)}
//                             className="w-full px-2 py-1 text-left text-sm text-red-600 hover:bg-red-100 flex items-center gap-2 rounded"
//                             type="button"
//                         >
//                             <Trash2 size={14} />
//                             Delete Product
//                         </button>
//                     </div>
//                 </>
//             )}
//         </div>
//     );
// };

// export const ProductList: React.FC<ProductListProps> = ({
//     products,
//     onEditProduct,
//     onToggleActive,
//     onDeleteProduct,
// }) => {
//     if (products.length === 0) {
//         return (
//             <div className="text-center py-12">
//                 <div className="flex flex-col items-center">
//                     <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
//                         <Package className="w-8 h-8 text-gray-400" />
//                     </div>
//                     <p className="text-gray-500 text-lg">No products found</p>
//                     <p className="text-gray-400 text-sm mt-1">
//                         Products matching your filters will appear here
//                     </p>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-4 pb-30">
//             {products.map((product) => (
//                 // <div
//                 //     key={product.id}
//                 //     className={`bg-white rounded-xl shadow-sm border transition-all hover:shadow-md ${
//                 //         !product.is_active ? "opacity-75" : ""
//                 //     }`}
//                 // >
//                 <div
//                     key={product.id}
//                     className={`bg-white rounded-xl shadow-sm border-1 border-gray-200 transition-all ${
//                         !product.is_active ? "opacity-80" : ""
//                     }`}
//                 >
//                     {/* Product Image with dropdown overlaid */}
//                     {/* <div className="aspect-square bg-gray-100 rounded-t-xl flex items-center justify-center overflow-hidden relative">
//                         {product.image_url ? (
//                             <Image
//                                 src={product.image_url}
//                                 alt={product.name}
//                                 fill
//                                 className="rounded-t-xl rounded-lg m-4"
//                             />
//                         ) : (
//                             <div className="text-gray-400 z-10">
//                                 <Package className="w-12 h-12" />
//                             </div>
//                         )}

//                         <div className="absolute top-2 right-2 z-20">
//                             <DropdownMenu
//                                 onEdit={() => onEditProduct(product)}
//                                 onDelete={() => onDeleteProduct(product)}
//                             />
//                         </div>
//                     </div> */}
//                     <div className="aspect-square rounded-t-xl flex items-center justify-center overflow-hidden relative p-3 pb-0">
//                         {product.image_url ? (
//                             <Image
//                                 src={product.image_url}
//                                 alt={product.name}
//                                 width={300} // set fixed size instead of fill
//                                 height={300}
//                                 className="object-contain rounded-lg"
//                             />
//                         ) : (
//                             <div className="text-gray-400 z-10">
//                                 <Package className="w-12 h-12" />
//                             </div>
//                         )}

//                         {/* Dropdown button on top of image */}
//                         <div className="absolute top-3 right-3 z-20">
//                             <DropdownMenu
//                                 onEdit={() => onEditProduct(product)}
//                                 onDelete={() => onDeleteProduct(product)}
//                             />
//                         </div>
//                     </div>

//                     {/* Product Info */}
//                     <div className="p-4 bg-gray-50 rounded-b-xl">
//                         <div className="flex items-start justify-between">
//                             <h3 className="text-lg font-bold text-gray-900 line-clamp-1 flex-1">
//                                 {product.name}
//                             </h3>
//                             <div className="flex items-center gap-1 ml-2">
//                                 {product.is_main ? (
//                                     <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
//                                         Main
//                                     </span>
//                                 ) : (
//                                     <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
//                                         Non-Main
//                                     </span>
//                                 )}
//                             </div>
//                         </div>

//                         <div className="flex items-center justify-between">
//                             <p className="text-1xl font-bold text-blue-600">
//                                 Rp {product.price.toLocaleString()}
//                             </p>
//                             <span
//                                 className={`text-xs px-2 py-1 rounded-full font-semibold ${
//                                     product.is_active
//                                         ? "bg-green-100 text-green-700"
//                                         : "bg-red-100 text-red-700"
//                                 }`}
//                             >
//                                 {product.is_active ? "Active" : "Inactive"}
//                             </span>
//                         </div>

//                         {/* Single Toggle Action Button */}
//                         {/* <button
//                             onClick={() => onToggleActive(product)}
//                             className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
//                                 product.is_active
//                                     ? "bg-red-500 text-white hover:bg-red-600"
//                                     : "bg-green-50 text-green-600 hover:bg-green-100"
//                             }`}
//                         >
//                             {product.is_active ? (
//                                 <>
//                                     Deactivate
//                                 </>
//                             ) : (
//                                 <>
//                                     <Power className="w-4 h-4" />
//                                     Activate
//                                 </>
//                             )}
//                         </button> */}

//                         {/* Product Creation Date */}
//                         {/* <div className="text-xs text-gray-500 mt-2">
//                             Created:{" "}
//                             {new Date(product.created_at).toLocaleDateString()}
//                         </div> */}
//                     </div>
//                 </div>
//             ))}
//         </div>
//     );
// };

// components/ProductList.tsx
import React, { useState } from "react";
import { Product } from "../types/product";
import {
    Power,
    PowerOff,
    Package,
    MoreVertical,
    Edit2,
    Trash2,
} from "lucide-react";
import Image from "next/image";

interface DropdownMenuProps {
    onToggleActive: () => void;
    isActive: boolean;
    onEdit: () => void;
    onDelete: () => void;
}

interface ProductListProps {
    products: Product[];
    onEditProduct: (product: Product) => void;
    onToggleActive: (product: Product) => void;
    onDeleteProduct: (product: Product) => void;
}

// Dropdown Menu Component
const DropdownMenu: React.FC<DropdownMenuProps> = ({
    onToggleActive,
    isActive,
    onEdit,
    onDelete,
}) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const handleAction = (action: () => void): void => {
        action();
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                type="button"
            >
                <MoreVertical size={18} className="text-gray-600" />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop to close dropdown */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown content */}
                    <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px] p-2 space-y-2">
                        {/* Toggle Active/Inactive Button */}
                        <button
                            onClick={() => handleAction(onToggleActive)}
                            className={`w-full px-2 py-1 text-left text-sm flex items-center gap-2 rounded cursor-pointer ${
                                isActive
                                    ? "bg-red-500 text-white hover:bg-red-600"
                                    : "bg-green-500 text-white hover:bg-green-600"
                            }`}
                            type="button"
                        >
                            {isActive ? (
                                <>
                                    <PowerOff size={14} />
                                    Deactivate
                                </>
                            ) : (
                                <>
                                    <Power size={14} />
                                    Activate
                                </>
                            )}
                        </button>

                        {/* Divider */}
                        <div className="border-t border-gray-200 my-2"></div>

                        {/* Edit Button */}
                        <button
                            onClick={() => handleAction(onEdit)}
                            className="w-full px-2 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 rounded cursor-pointer"
                            type="button"
                        >
                            <Edit2 size={14} />
                            Edit Product
                        </button>

                        {/* Delete Button */}
                        <button
                            onClick={() => handleAction(onDelete)}
                            className="w-full px-2 py-1 text-left text-sm text-red-600 hover:bg-red-100 flex items-center gap-2 rounded cursor-pointer"
                            type="button"
                        >
                            <Trash2 size={14} />
                            Delete Product
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export const ProductList: React.FC<ProductListProps> = ({
    products,
    onEditProduct,
    onToggleActive,
    onDeleteProduct,
}) => {
    if (products.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Package className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg">No products found</p>
                    <p className="text-gray-400 text-sm mt-1">
                        Products matching your filters will appear here
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-4 pb-30">
            {products.map((product) => (
                <div
                    key={product.id}
                    className={`bg-gray-50 rounded-xl shadow-sm border-1 border-gray-200 transition-all ${
                        !product.is_active ? "opacity-80" : ""
                    }`}
                >
                    {/* Product Image with dropdown overlaid */}
                    <div className="aspect-square rounded-t-xl flex items-center justify-center overflow-hidden relative p-3">
                        {product.image_url ? (
                            <Image
                                src={product.image_url}
                                alt={product.name}
                                width={300}
                                height={300}
                                className="object-contain rounded-lg"
                            />
                        ) : (
                            <div className="text-gray-400 z-10">
                                <Package className="w-12 h-12" />
                            </div>
                        )}

                        {/* Dropdown button on top of image */}
                        <div className="absolute top-3 right-3 z-20">
                            <DropdownMenu
                                onToggleActive={() => onToggleActive(product)}
                                isActive={product.is_active}
                                onEdit={() => onEditProduct(product)}
                                onDelete={() => onDeleteProduct(product)}
                            />
                        </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-4 bg-white rounded-b-xl">
                        <div className="flex items-start justify-between">
                            <h3 className="text-lg font-bold text-gray-900 line-clamp-1 flex-1">
                                {product.name}
                            </h3>
                            <div className="flex items-center gap-1 ml-2">
                                {product.is_main ? (
                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                                        Main
                                    </span>
                                ) : (
                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
                                        Non-Main
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-1xl font-bold text-blue-600">
                                Rp {product.price.toLocaleString()}
                            </p>
                            <span
                                className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                    product.is_active
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                }`}
                            >
                                {product.is_active ? "Active" : "Inactive"}
                            </span>
                        </div>
                        {/* Product Creation Date */}

                        <div className="text-xs text-gray-500 mt-3">
                            Product Created:{" "}
                            {new Date(product.created_at).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
