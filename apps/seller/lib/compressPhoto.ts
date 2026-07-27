import imageCompression from "browser-image-compression";

// Phone cameras shoot whatever the OS decides, and staff occasionally submit
// ultrawide panoramas that blow out review screens. Clamp anything more extreme
// than 4:3 (landscape) or 3:4 (portrait) by centre-cropping to the nearest
// bound. Ordinary 4:3 / 3:4 / 1:1 shots are already in range and pass straight
// through, so the common case costs nothing and loses no quality.
const MAX_ASPECT = 4 / 3;
const MIN_ASPECT = 3 / 4;

export async function clampAspectRatio(file: File): Promise<File> {
    // "from-image" applies EXIF rotation, so width/height match what the user
    // actually saw — otherwise a rotated portrait reads as landscape here.
    const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
    });

    try {
        const { width, height } = bitmap;
        const aspect = width / height;
        if (aspect <= MAX_ASPECT && aspect >= MIN_ASPECT) return file;

        const cropWidth =
            aspect > MAX_ASPECT ? Math.round(height * MAX_ASPECT) : width;
        const cropHeight =
            aspect > MAX_ASPECT ? height : Math.round(width / MIN_ASPECT);

        const canvas = document.createElement("canvas");
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return file;

        ctx.drawImage(
            bitmap,
            Math.round((width - cropWidth) / 2),
            Math.round((height - cropHeight) / 2),
            cropWidth,
            cropHeight,
            0,
            0,
            cropWidth,
            cropHeight,
        );

        const type = file.type === "image/webp" ? "image/webp" : "image/jpeg";
        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, type, 0.85),
        );
        if (!blob) return file;

        return new File([blob], file.name, { type, lastModified: Date.now() });
    } finally {
        bitmap.close();
    }
}

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

    // iOS silent fallback: re-compress PNG/HEIC output as JPEG
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
