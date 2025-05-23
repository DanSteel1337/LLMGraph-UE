import { AuthForm } from "../../components/auth/auth-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">RAG Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to access your RAG dashboard</p>
        </div>
        <AuthForm />
      </div>
    </div>
  )
}
