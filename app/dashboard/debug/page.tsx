/**
 * Purpose: Debug page for testing system components
 * Logic:
 * - Provides UI for testing Pinecone, OpenAI, and KV operations
 * - Displays detailed diagnostic information
 * Runtime context: Server Component
 */
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DebugPanel } from "@/app/components/debug/debug-panel"
import { Separator } from "@/components/ui/separator"

export default function DebugPage() {
  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none">
        <CardHeader className="px-0">
          <CardTitle>System Diagnostics</CardTitle>
          <CardDescription>Test and debug system components including Pinecone, OpenAI, and Vercel KV</CardDescription>
        </CardHeader>
      </Card>

      <DebugPanel />

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Debug Information</h3>
        <p className="text-sm text-muted-foreground">
          This page tests connectivity and functionality of all system components:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>
            <strong>Pinecone:</strong> Tests vector database connectivity, index stats, and vector operations
          </li>
          <li>
            <strong>OpenAI:</strong> Tests embedding generation with text-embedding-3-large model
          </li>
          <li>
            <strong>Vercel KV:</strong> Tests key-value storage operations for metadata and settings
          </li>
        </ul>
        <p className="text-sm text-muted-foreground mt-4">
          All tests run in Edge Runtime to validate the serverless environment configuration.
        </p>
      </div>
    </div>
  )
}
