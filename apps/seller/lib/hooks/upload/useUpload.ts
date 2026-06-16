import { useState, useCallback } from "react";
import { uploadApi, type UploadBucket } from "@/lib/api/upload";

export function useUpload() {
    const [isUploading, setIsUploading] = useState(false);

    const upload = useCallback(async (file: File, bucket: UploadBucket, subPath: string) => {
        setIsUploading(true);
        try {
            const { url } = await uploadApi.upload(file, bucket, subPath);
            return url;
        } finally {
            setIsUploading(false);
        }
    }, []);

    return { upload, isUploading };
}
