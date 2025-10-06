// import "./globals.css";
// import { Metadata } from "next";
// import { Analytics } from "@vercel/analytics/next";
// import { SWRConfig } from "swr";
// import { AuthProvider } from "@/lib/context/AuthContext";

// export const metadata: Metadata = {
//     title: "POS System",
//     description: "Point of Sale System",
// };

// export default function RootLayout({
//     children,
// }: {
//     children: React.ReactNode;
// }) {
//     return (
//         <html lang="en">
//             <body>
//                 <SWRConfig
//                     value={{
//                         dedupingInterval: 5000,
//                         revalidateOnFocus: true,
//                     }}
//                 >
//                     <AuthProvider>
//                         {children}
//                         <Analytics />
//                     </AuthProvider>
//                 </SWRConfig>
//             </body>
//         </html>
//     );
// }

import "./globals.css";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { SWRConfig } from "swr";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/lib/context/AuthContext";

export const metadata: Metadata = {
    title: "POS System",
    description: "Point of Sale System",
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("x-user-info");
    const initialUser = userCookie ? JSON.parse(userCookie.value) : null;

    return (
        <html lang="en">
            <body>
                <SWRConfig
                    value={{
                        dedupingInterval: 5000,
                        revalidateOnFocus: true,
                    }}
                >
                    <AuthProvider initialUser={initialUser}>
                        {children}
                        <Analytics />
                    </AuthProvider>
                </SWRConfig>
            </body>
        </html>
    );
}
