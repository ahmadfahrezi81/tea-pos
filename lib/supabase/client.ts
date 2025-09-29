// import { createBrowserClient } from "@supabase/ssr";

// export function createClient() {
//     return createBrowserClient(
//         process.env.NEXT_PUBLIC_SUPABASE_URL!,
//         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
//     );
// }

// import { createBrowserClient } from "@supabase/ssr";
// import type { Database } from "@/lib/db.types";

// export function createClient() {
//     return createBrowserClient<Database>(
//         process.env.NEXT_PUBLIC_SUPABASE_URL!,
//         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
//     );
// }

//lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db.types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
    if (client) {
        return client;
    }

    client = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    return client;
}
