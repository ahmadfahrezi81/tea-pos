import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerComponentClient() {
    const cookieStore = await cookies(); // ✅ Await here

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );
}

export async function createRouteHandlerClient() {
    const cookieStore = await cookies(); // ✅ Await here

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                set(_name: string, _value: string, _options: CookieOptions) {
                    // In a Route Handler context, use appropriate Response methods instead
                },
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                remove(_name: string, _options: CookieOptions) {
                    // Same here
                },
            },
        }
    );
}
