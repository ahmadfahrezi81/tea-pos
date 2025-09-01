import StoresPageComponents from "@/components/stores/StoresPageComponent";
import { checkManagerAccess } from "@/lib/supabase/checkManagerRole";

export default async function StoresPage() {
    // await checkManagerAccess();

    return (
        <div>
            <StoresPageComponents />
        </div>
    );
}
