"use client";
import Link from "next/link";
import { useProfile } from "@/lib/hooks/useData";

export default function Dashboard() {
    // const [user, setUser] = useState<unknown>(null);
    // const [profile, setProfile] = useState<Profile>();
    // const [loading, setLoading] = useState(true);
    // const supabase = createClient();

    const { data: profile, isLoading } = useProfile();

    // useEffect(() => {
    //     getUser();
    // }, []);

    // const getUser = async () => {
    //     const {
    //         data: { user },
    //     } = await supabase.auth.getUser();
    //     if (user) {
    //         setUser(user);
    //         const { data } = await supabase
    //             .from("profiles")
    //             .select("*")
    //             .eq("id", user.id)
    //             .single();
    //         setProfile(data);
    //     }
    //     setLoading(false);
    // };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="py-4">
            <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

            {profile && (
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                    <h2 className="text-xl font-semibold mb-4">
                        Welcome, {profile.full_name}
                    </h2>
                    <p className="text-gray-600">Role: {profile.role}</p>
                    <p className="text-gray-600">Email: {profile.email}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link
                    href="/admin/dashboard/pos"
                    className="bg-white p-6 rounded-lg shadow hover:shadow-md"
                >
                    <h3 className="text-lg font-semibold mb-2">
                        Point of Sale
                    </h3>
                    <p className="text-gray-600">Process customer orders</p>
                </Link>

                <Link
                    href="/admin/dashboard/orders"
                    className="bg-white p-6 rounded-lg shadow hover:shadow-md"
                >
                    <h3 className="text-lg font-semibold mb-2">Orders</h3>
                    <p className="text-gray-600">View order history</p>
                </Link>

                <Link
                    href="/admin/dashboard/products"
                    className="bg-white p-6 rounded-lg shadow hover:shadow-md"
                >
                    <h3 className="text-lg font-semibold mb-2">Products</h3>
                    <p className="text-gray-600">Manage products</p>
                </Link>

                <Link
                    href="/admin/dashboard/stores"
                    className="bg-white p-6 rounded-lg shadow hover:shadow-md"
                >
                    <h3 className="text-lg font-semibold mb-2">Stores</h3>
                    <p className="text-gray-600">Manage stores</p>
                </Link>

                <Link
                    href="/admin/dashboard/analytics"
                    className="bg-white p-6 rounded-lg shadow hover:shadow-md"
                >
                    <h3 className="text-lg font-semibold mb-2">Analytics</h3>
                    <p className="text-gray-600">Daily summaries & reports</p>
                </Link>

                {/* {profile?.role === "manager" && (
                    <Link
                        href="/admin/dashboard/products"
                        className="bg-white p-6 rounded-lg shadow hover:shadow-md"
                    >
                        <h3 className="text-lg font-semibold mb-2">Products</h3>
                        <p className="text-gray-600">Manage products</p>
                    </Link>
                )}

                {profile?.role === "manager" && (
                    <Link
                        href="/admin/dashboard/stores"
                        className="bg-white p-6 rounded-lg shadow hover:shadow-md"
                    >
                        <h3 className="text-lg font-semibold mb-2">Stores</h3>
                        <p className="text-gray-600">Manage stores</p>
                    </Link>
                )}

                {profile?.role === "manager" && (
                    <Link
                        href="/admin/dashboard/analytics"
                        className="bg-white p-6 rounded-lg shadow hover:shadow-md"
                    >
                        <h3 className="text-lg font-semibold mb-2">
                            Analytics
                        </h3>
                        <p className="text-gray-600">
                            Daily summaries & reports
                        </p>
                    </Link>
                )} */}
            </div>
        </div>
    );
}
