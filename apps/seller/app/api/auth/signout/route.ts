import { ok, handleError } from "@/lib/api/response";

export async function POST() {
    try {
        const response = ok({ success: true });
        response.cookies.set("x-user-info", "", { path: "/", maxAge: 0 });
        response.cookies.set("x-tenant-id", "", { path: "/", maxAge: 0 });
        return response;
    } catch (error) {
        return handleError("POST /api/auth/signout", error);
    }
}
