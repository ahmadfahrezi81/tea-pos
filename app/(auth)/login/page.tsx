import AuthForm from "@/components/auth/AuthForm";

export default function Login() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8">
                {/* <div>
                    <h2 className="text-center text-3xl font-bold text-gray-900">
                        Sign in to your account
                    </h2>
                </div> */}
                <AuthForm mode="login" />
            </div>
        </div>
    );
}
