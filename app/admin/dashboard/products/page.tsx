import ProductsPageComponents from "@/components/products/ProductsPageComponent";
import { checkManagerAccess } from "@/lib/supabase/checkManagerRole";

export default async function ProductsPage() {
    // await checkManagerAccess();

    return (
        <div>
            <ProductsPageComponents />
        </div>
    );
}
