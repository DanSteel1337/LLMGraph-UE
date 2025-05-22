/**
 * Purpose: Debug page for testing system components
 * Logic:
 * - Provides UI for testing Pinecone, OpenAI, and KV operations
 * - Displays detailed diagnostic information
 * Runtime context: Server Component
 */
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DebugPanel } from "@/app/components/debug/debug-panel"

export default function DebugPage() {
  return (
    <div className="space-y-4">
      <Card className="border-none shadow-none">
        <CardHeader className="px-0">
          <CardTitle>System Diagnostics</CardTitle>
          <CardDescription>Test and debug system components</CardDescription>
        </CardHeader>
      </Card>

      <DebugPanel />
    </div>
  )
}
