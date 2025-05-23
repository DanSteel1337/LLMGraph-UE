/**
 * Purpose: Main dashboard page with chat interface
 * Logic:
 * - Renders the chat window component
 * Runtime context: Server Component
 */
import { ChatWindow } from "../components/chat/chat-window"
import { Card, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <Card className="border-none shadow-none">
        <CardHeader className="px-0">
          <CardTitle>RAG Chat Interface</CardTitle>
          <CardDescription>Ask questions about your API documentation</CardDescription>
        </CardHeader>
      </Card>
      <ChatWindow />
    </div>
  )
}
