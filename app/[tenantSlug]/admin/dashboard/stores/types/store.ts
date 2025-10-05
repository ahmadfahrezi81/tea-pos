// types/store.ts
export interface Store {
    id: string;
    name: string;
    address: string | null;
    created_at: string;
    updated_at?: string;
}

export interface User {
    id: string;
    full_name: string;
    email: string;
}

export interface Assignment {
    user_id: string;
    role: "seller" | "manager";
    is_default: boolean;
}

export interface StoresData {
    stores: Store[];
    users: User[];
    assignments: Record<string, Assignment[]>;
}

export interface AssignedUser {
    user: User;
    roles: string[];
    hasDefault: boolean;
}
