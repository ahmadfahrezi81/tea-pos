import AuthForm from "@/components/auth/AuthForm";

export default function Login() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8">
                <AuthForm />
            </div>
        </div>
    );
}
