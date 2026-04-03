// app/[tenantSlug]/mobile/profile/_components/IconPickerDrawer.tsx
"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { X, Check, Panda, Shrimp, Origami } from "lucide-react";
import {
    Bird,
    Cat,
    Dog,
    Fish,
    Rabbit,
    Squirrel,
    Turtle,
    Snail,
    Bug,
    Shell,
    Egg,
    PawPrint,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ============================================================================
// CONSTANTS
// ============================================================================

export const ICON_OPTIONS: { id: string; icon: LucideIcon; label: string }[] = [
    { id: "origami", icon: Origami, label: "Origami" },
    { id: "panda", icon: Panda, label: "Panda" },
    { id: "bird", icon: Bird, label: "Bird" },
    { id: "cat", icon: Cat, label: "Cat" },
    { id: "dog", icon: Dog, label: "Dog" },
    { id: "fish", icon: Fish, label: "Fish" },
    { id: "rabbit", icon: Rabbit, label: "Rabbit" },
    { id: "squirrel", icon: Squirrel, label: "Squirrel" },
    { id: "turtle", icon: Turtle, label: "Turtle" },
    { id: "snail", icon: Snail, label: "Snail" },
    { id: "bug", icon: Bug, label: "Bug" },
    { id: "shrimp", icon: Shrimp, label: "Shrimp" },
];

export const DEFAULT_ICON_ID = "bird";
export const PROFILE_ICON_KEY = "profile_icon_id";

export function getStoredIconId(): string {
    if (typeof window === "undefined") return DEFAULT_ICON_ID;
    return localStorage.getItem(PROFILE_ICON_KEY) ?? DEFAULT_ICON_ID;
}

export function getIconById(id: string): LucideIcon {
    return ICON_OPTIONS.find((o) => o.id === id)?.icon ?? Bird;
}

// ============================================================================
// COMPONENT
// ============================================================================

interface IconPickerDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    currentIconId: string;
    onConfirm: (iconId: string) => void;
}

export function IconPickerDrawer({
    isOpen,
    onClose,
    currentIconId,
    onConfirm,
}: IconPickerDrawerProps) {
    const [selectedId, setSelectedId] = useState(currentIconId);

    const handleConfirm = () => {
        localStorage.setItem(PROFILE_ICON_KEY, selectedId);
        onConfirm(selectedId);
        onClose();
    };

    return (
        <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl px-4 pt-5 pb-10 focus:outline-none">
                    {/* Pull tab */}
                    <div className="absolute top-2 left-0 right-0 flex justify-center">
                        <div className="w-8 h-1 rounded-full bg-gray-300" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <Drawer.Title className="text-lg font-semibold text-gray-900">
                            Pick your icon
                        </Drawer.Title>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                        >
                            <X size={22} />
                        </button>
                    </div>

                    {/* Icon Grid */}
                    <div className="grid grid-cols-4 gap-3 mb-6">
                        {ICON_OPTIONS.map(({ id, icon: Icon, label }) => {
                            const isSelected = selectedId === id;
                            return (
                                <button
                                    key={id}
                                    onClick={() => setSelectedId(id)}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95 ${
                                        isSelected
                                            ? "bg-brand/10 ring-2 ring-brand"
                                            : "bg-gray-50 hover:bg-gray-100"
                                    }`}
                                >
                                    <Icon
                                        size={28}
                                        className={
                                            isSelected
                                                ? "text-brand"
                                                : "text-gray-600"
                                        }
                                    />
                                    <span
                                        className={`text-xs font-medium ${
                                            isSelected
                                                ? "text-brand"
                                                : "text-gray-500"
                                        }`}
                                    >
                                        {label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Confirm */}
                    <button
                        onClick={handleConfirm}
                        className="w-full bg-brand text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                        Confirm
                    </button>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
