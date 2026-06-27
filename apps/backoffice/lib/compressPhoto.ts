import imageCompression from "browser-image-compression";

export async function compressPhoto(file: File): Promise<File> {
    const supportsWebP = await new Promise<boolean>((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        resolve(canvas.toDataURL("image/webp").startsWith("data:image/webp"));
    });

    const primaryOptions = {
        maxSizeMB: 0.4,
        maxWidthOrHeight: 1080,
        useWebWorker: true,
        fileType: supportsWebP ? ("image/webp" as const) : ("image/jpeg" as const),
        initialQuality: supportsWebP ? 0.6 : 0.7,
    };

    let compressed = await imageCompression(file, primaryOptions);

    if (
        compressed.type === "image/png" ||
        compressed.type === "image/heic" ||
        compressed.type === "image/heif"
    ) {
        compressed = await imageCompression(file, {
            maxSizeMB: 0.4,
            maxWidthOrHeight: 1080,
            useWebWorker: true,
            fileType: "image/jpeg" as const,
            initialQuality: 0.7,
        });
    }

    if (!["image/webp", "image/jpeg", "image/jpg"].includes(compressed.type)) {
        throw new Error(`Unsupported output format: ${compressed.type}`);
    }

    return compressed;
}
