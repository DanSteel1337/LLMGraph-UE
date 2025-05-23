/**
 * Purpose: Debug page for testing system components
 * Logic:
 * - Provides debug panels for testing various system components
 * - Shows system health and configuration
 * Runtime context: Server Component
 */
import { Card, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { DebugPanel } from "../../components/debug/debug-panel"

export default function DebugPage() {
  return (
    <div className="space-y-4">
      <Card className="border-none shadow-none">
        <CardHeader className="px-0">
          <CardTitle>Debug Panel</CardTitle>
          <CardDescription>Test and debug system components</CardDescription>
        </CardHeader>
      </Card>

      <DebugPanel />
    </div>
  )
}
