"use client";

import { useRef, useState, useEffect } from "react";
import { Camera, ImagePlus, Loader2, CircleMinus, X } from "lucide-react";
import { Drawer } from "vaul";
import { compressPhoto } from "@/lib/compressPhoto";

interface PhotoPickerProps {
    previewUrl: string | null;
    onCapture: (file: File, previewUrl: string) => void;
    onRemove: () => void;
    onError?: (message: string) => void;
    allowGallery?: boolean;
}

export function PhotoPicker({ previewUrl, onCapture, onRemove, onError, allowGallery = false }: PhotoPickerProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [permissionBlocked, setPermissionBlocked] = useState(false);
    const [cameraPermission, setCameraPermission] = useState<PermissionState | null>(null);

    useEffect(() => {
        let permStatus: PermissionStatus | null = null;
        navigator.permissions
            .query({ name: "camera" as PermissionName })
            .then((status) => {
                permStatus = status;
                setCameraPermission(status.state);
                status.onchange = () => setCameraPermission(status.state);
            })
            .catch(() => {
                // permissions API not supported — stays null, input handles it natively
            });
        return () => {
            if (permStatus) permStatus.onchange = null;
        };
    }, []);

    const handleClick = () => {
        if (cameraPermission === "denied") {
            setPermissionBlocked(true);
            return;
        }
        inputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setPermissionBlocked(true);
            return;
        }
        setIsCompressing(true);
        try {
            const compressed = await compressPhoto(file);
            onCapture(compressed, URL.createObjectURL(compressed));
        } catch (err) {
            console.error("Compression failed:", err);
            if (["image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
                onCapture(file, URL.createObjectURL(file));
            } else {
                onError?.("Failed to process photo. Please try again.");
            }
        } finally {
            setIsCompressing(false);
            e.target.value = "";
        }
    };

    return (
        <>
            <div
                className={`w-full h-52 rounded-xl overflow-hidden relative transition-transform active:scale-[0.97] ${
                    previewUrl && !isCompressing
                        ? "bg-black"
                        : "border-3 border-dashed border-brand"
                }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    {...(!allowGallery && { capture: "environment" })}
                    className="hidden"
                    onChange={handleFileChange}
                />

                {isCompressing ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <Loader2 size={28} className="text-brand animate-spin" />
                        <p className="text-sm text-gray-400">Compressing...</p>
                    </div>
                ) : previewUrl ? (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                        <button
                            onClick={onRemove}
                            className="absolute top-2 right-2 w-9 h-9 bg-black/70 rounded-lg flex items-center justify-center"
                        >
                            <CircleMinus size={24} className="text-white" />
                        </button>
                        <button
                            onClick={handleClick}
                            className="absolute bottom-2 right-2 bg-black/70 rounded-lg px-3 py-1.5"
                        >
                            <span className="text-white text-sm font-semibold">Retake</span>
                        </button>
                    </>
                ) : (
                    <button
                        onClick={handleClick}
                        className="w-full h-full flex flex-col items-center justify-center gap-1.5"
                    >
                        {allowGallery ? (
                            <ImagePlus size={40} strokeWidth={2} className="text-brand" />
                        ) : (
                            <Camera size={40} strokeWidth={2} className="text-brand" />
                        )}
                        <span className="text-sm font-medium text-gray-900">Tap to add photo</span>
                    </button>
                )}
            </div>

            <Drawer.Root open={permissionBlocked} onOpenChange={setPermissionBlocked}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl px-4 pt-5 pb-8 focus:outline-none">
                        <div className="absolute top-2 left-0 right-0 flex justify-center">
                            <div className="w-8 h-1 rounded-full bg-gray-300" />
                        </div>
                        <div className="flex items-center justify-between mb-1">
                            <Drawer.Title className="text-xl font-bold text-gray-900">
                                Camera Access Blocked
                            </Drawer.Title>
                            <button
                                onClick={() => setPermissionBlocked(false)}
                                className="p-1.5 rounded-full text-gray-900 hover:bg-gray-100 -mr-2"
                            >
                                <X size={26} />
                            </button>
                        </div>
                        <Drawer.Description className="sr-only">
                            Camera permission is required to take photos
                        </Drawer.Description>
                        <p className="text-sm text-gray-500 mb-4">
                            This app needs camera access to take photos.
                        </p>
                        <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside mb-6">
                            <li>Open your phone&apos;s <strong>Settings</strong></li>
                            <li>Go to <strong>Apps</strong> → your browser</li>
                            <li>Tap <strong>Permissions</strong> → <strong>Camera</strong> → Allow</li>
                            <li>Come back and try again</li>
                        </ol>
                        <button
                            onClick={() => setPermissionBlocked(false)}
                            className="w-full py-3 rounded-xl bg-brand text-white font-semibold"
                        >
                            Got it
                        </button>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </>
    );
}
