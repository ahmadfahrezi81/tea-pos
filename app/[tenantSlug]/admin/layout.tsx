import "./theme.css"; // optional: import admin-specific styles
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TenantProvider } from "./TenantProvider";
import { cookies } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar";
import {
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { DynamicBreadcrumb } from "./_components/dynamic-breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";

import type { Metadata } from "next";
import { DateTimeDisplay } from "./_components/date-time-display";

export const metadata: Metadata = {
    title: "Admin Dashboard",
    description: "Admin area for tenant management",
};

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const tenantId = cookieStore.get("x-tenant-id")?.value || null; // Match the cookie name
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    {/* <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                        <div className="flex items-center gap-2 px-4">
                            <SidebarTrigger className="-ml-1" />

                            <Separator
                                orientation="vertical"
                                className="mr-2 data-[orientation=vertical]:h-4"
                            />
                            <DynamicBreadcrumb />


                        </div>
                    </header> */}

                    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 px-4">
                        {/* Left Side (Sidebar + Breadcrumb) */}
                        <div className="flex items-center gap-2">
                            <SidebarTrigger className="-ml-1" />
                            <Separator
                                orientation="vertical"
                                className="mr-2 data-[orientation=vertical]:h-4"
                            />
                            <DynamicBreadcrumb />
                        </div>

                        {/* Right Side (Date & Time) */}
                        <DateTimeDisplay />
                    </header>

                    <TenantProvider initialTenantId={tenantId}>
                        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                            <div className="mx-auto w-full max-w-7xl">
                                {children}
                                <Toaster richColors />
                            </div>
                        </div>
                    </TenantProvider>
                </SidebarInset>
            </SidebarProvider>
        </ThemeProvider>
    );
}
