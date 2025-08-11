import StoresPageComponents from "@/components/stores/StoresPageComponent";
import { checkManagerAccess } from "@/lib/supabase/checkManagerRole";

export default async function StoresPage() {
    await checkManagerAccess();

    return (
        <div>
            <h1>Only for Managers</h1>
            <StoresPageComponents />
        </div>
    );
}
