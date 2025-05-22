/**
 * Purpose: Login page for the application
 * Logic:
 * - Renders the authentication form
 * Runtime context: Server Component
 */
import { AuthForm } from "@/app/components/auth/auth-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your email and password to access the dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm />
      </CardContent>
    </Card>
  )
}
