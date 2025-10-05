// // hooks/useProductActions.ts
// export const useProductActions = () => {
//     const createProduct = async (name: string, price: number) => {
//         const response = await fetch("/api/products", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ name, price }),
//         });

//         if (!response.ok) {
//             throw new Error("Failed to create product");
//         }

//         return response.json();
//     };

//     const updateProduct = async (id: string, name: string, price: number) => {
//         const response = await fetch("/api/products", {
//             method: "PUT",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ id, name, price }),
//         });

//         if (!response.ok) {
//             throw new Error("Failed to update product");
//         }

//         return response.json();
//     };

//     const toggleProductStatus = async (id: string, is_active: boolean) => {
//         const response = await fetch("/api/products", {
//             method: "PUT",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ id, is_active }),
//         });

//         if (!response.ok) {
//             throw new Error("Failed to update product status");
//         }

//         return response.json();
//     };

//     const deleteProduct = async (id: string) => {
//         const response = await fetch("/api/products", {
//             method: "DELETE",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ id }),
//         });

//         if (!response.ok) {
//             throw new Error("Failed to delete product");
//         }

//         return response.json();
//     };

//     return {
//         createProduct,
//         updateProduct,
//         toggleProductStatus,
//         deleteProduct,
//     };
// };

// hooks/useProductActions.ts
export const useProductActions = () => {
    const createProduct = async (
        name: string,
        price: number,
        imageUrl?: string,
        isMain: boolean = false // Changed from isActive to isMain with default false
    ) => {
        const response = await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                price,
                image_url: imageUrl,
                is_main: isMain, // Changed from is_active to is_main
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to create product");
        }

        return response.json();
    };

    const updateProduct = async (
        id: string,
        name: string,
        price: number,
        imageUrl?: string,
        isMain?: boolean // Changed from isActive to isMain
    ) => {
        const response = await fetch("/api/products", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id,
                name,
                price,
                image_url: imageUrl,
                is_main: isMain, // Changed from is_active to is_main
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to update product");
        }

        return response.json();
    };

    const toggleProductStatus = async (id: string, is_active: boolean) => {
        const response = await fetch("/api/products", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, is_active }),
        });

        if (!response.ok) {
            throw new Error("Failed to update product status");
        }

        return response.json();
    };

    const deleteProduct = async (id: string) => {
        const response = await fetch("/api/products", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });

        if (!response.ok) {
            throw new Error("Failed to delete product");
        }

        return response.json();
    };

    return {
        createProduct,
        updateProduct,
        toggleProductStatus,
        deleteProduct,
    };
};
