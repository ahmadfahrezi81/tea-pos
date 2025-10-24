"use client";

import { useState } from "react";
import {
    Bell,
    Smile,
    Grid3x3,
    Database,
    Shield,
    Users,
    User,
    Settings,
    SettingsIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from "@/components/ui/sidebar";
import { useTheme } from "next-themes";

const settingsNav = [
    { id: "general", name: "General", icon: Settings },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "personalization", name: "Personalization", icon: Smile },
    { id: "apps", name: "Apps & Connectors", icon: Grid3x3 },
    { id: "data", name: "Data controls", icon: Database },
    { id: "security", name: "Security", icon: Shield },
    { id: "parental", name: "Parental controls", icon: Users },
    { id: "account", name: "Account", icon: User },
];

export function SettingsDialog() {
    const [open, setOpen] = useState(false);
    const [activeSection, setActiveSection] = useState("general");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="flex items-center w-full gap-2">
                    <SettingsIcon className="h-4 w-4" />
                    <span>Settings</span>
                </div>
            </DialogTrigger>
            <DialogContent className="overflow-hidden p-0 md:max-h-[600px] md:max-w-[700px]">
                <DialogTitle className="sr-only">Settings</DialogTitle>
                <DialogDescription className="sr-only">
                    Customize your application settings here.
                </DialogDescription>

                <SidebarProvider className="items-start">
                    <Sidebar
                        collapsible="none"
                        className="hidden md:flex border-r w-[180px]"
                    >
                        <SidebarContent className="pt-16">
                            <SidebarGroup>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {settingsNav.map((item) => (
                                            <SidebarMenuItem key={item.id}>
                                                <SidebarMenuButton
                                                    isActive={
                                                        item.id ===
                                                        activeSection
                                                    }
                                                    onClick={() =>
                                                        setActiveSection(
                                                            item.id
                                                        )
                                                    }
                                                >
                                                    <item.icon className="h-4 w-4" />
                                                    <span>{item.name}</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </SidebarContent>
                    </Sidebar>

                    <main className="flex h-[600px] flex-1 flex-col overflow-hidden">
                        <header className="flex py-4 shrink-0 items-center gap-2 border-b px-4">
                            <h2 className="text-xl font-semibold">
                                {
                                    settingsNav.find(
                                        (item) => item.id === activeSection
                                    )?.name
                                }
                            </h2>
                        </header>

                        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
                            {activeSection === "general" && <GeneralSettings />}
                            {activeSection === "notifications" && (
                                <NotificationsSettings />
                            )}
                            {activeSection === "personalization" && (
                                <PersonalizationSettings />
                            )}
                            {activeSection === "apps" && <AppsSettings />}
                            {activeSection === "data" && <DataSettings />}
                            {activeSection === "security" && (
                                <SecuritySettings />
                            )}
                            {activeSection === "parental" && (
                                <ParentalSettings />
                            )}
                            {activeSection === "account" && <AccountSettings />}
                        </div>
                    </main>
                </SidebarProvider>
            </DialogContent>
        </Dialog>
    );
}

function GeneralSettings() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="text-sm font-medium">Theme</div>
                <select
                    className="w-[280px] px-3 py-2 border rounded-md bg-background"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                </select>
            </div>

            <div className="space-y-2">
                <div className="text-sm font-medium">Accent color</div>
                <select className="w-[280px] px-3 py-2 border rounded-md bg-background">
                    <option>Default</option>
                    <option>Blue</option>
                    <option>Green</option>
                    <option>Purple</option>
                </select>
            </div>

            <div className="space-y-2">
                <div className="text-sm font-medium">Language</div>
                <select className="w-[280px] px-3 py-2 border rounded-md bg-background">
                    <option>Auto-detect</option>
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                </select>
            </div>
        </div>
    );
}

function NotificationsSettings() {
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Configure how and when you receive notifications.
            </p>
            <div className="space-y-4">
                {[
                    "Email notifications",
                    "Push notifications",
                    "Desktop notifications",
                    "Sound alerts",
                ].map((item) => (
                    <div
                        key={item}
                        className="flex items-center justify-between py-2 border-b"
                    >
                        <span>{item}</span>
                        <Button variant="outline" size="sm">
                            Configure
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PersonalizationSettings() {
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Customize your experience with personalization options.
            </p>
            <div className="space-y-4">
                {[
                    "Custom instructions",
                    "Response style",
                    "Memory preferences",
                    "Conversation starters",
                ].map((item) => (
                    <div
                        key={item}
                        className="flex items-center justify-between py-2 border-b"
                    >
                        <span>{item}</span>
                        <Button variant="outline" size="sm">
                            Edit
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AppsSettings() {
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Manage connected applications and integrations.
            </p>
            <div className="grid gap-4">
                {["Slack", "Google Drive", "Microsoft Teams", "Notion"].map(
                    (app) => (
                        <div
                            key={app}
                            className="flex items-center justify-between p-4 border rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                    <Grid3x3 className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-medium">{app}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Not connected
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm">
                                Connect
                            </Button>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

function DataSettings() {
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Control your data and how it&apos;s used.
            </p>
            <div className="space-y-4">
                {[
                    "Export data",
                    "Delete conversations",
                    "Clear history",
                    "Data usage preferences",
                ].map((item) => (
                    <div
                        key={item}
                        className="flex items-center justify-between py-2 border-b"
                    >
                        <span>{item}</span>
                        <Button variant="outline" size="sm">
                            Manage
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SecuritySettings() {
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Keep your account secure with these settings.
            </p>
            <div className="space-y-4">
                {[
                    "Two-factor authentication",
                    "Active sessions",
                    "Password",
                    "Login history",
                ].map((item) => (
                    <div
                        key={item}
                        className="flex items-center justify-between py-2 border-b"
                    >
                        <span>{item}</span>
                        <Button variant="outline" size="sm">
                            Configure
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ParentalSettings() {
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Set up parental controls and content restrictions.
            </p>
            <div className="space-y-4">
                {[
                    "Content filters",
                    "Usage limits",
                    "Supervised mode",
                    "Activity reports",
                ].map((item) => (
                    <div
                        key={item}
                        className="flex items-center justify-between py-2 border-b"
                    >
                        <span>{item}</span>
                        <Button variant="outline" size="sm">
                            Setup
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AccountSettings() {
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Manage your account information and preferences.
            </p>
            <div className="space-y-4">
                {[
                    "Profile information",
                    "Email preferences",
                    "Subscription",
                    "Delete account",
                ].map((item) => (
                    <div
                        key={item}
                        className="flex items-center justify-between py-2 border-b"
                    >
                        <span>{item}</span>
                        <Button variant="outline" size="sm">
                            Edit
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
