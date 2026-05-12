import { cookies } from "next/headers";

export type RequestUser = {
    id: string;
    role: string;
    fullName: string;
    email: string;
};

export async function getRequestUser(): Promise<RequestUser | null> {
    const cookieStore = await cookies();
    const raw = cookieStore.get("x-user-info")?.value;
    if (!raw) return null;
    try {
        return JSON.parse(raw) as RequestUser;
    } catch {
        return null;
    }
}
