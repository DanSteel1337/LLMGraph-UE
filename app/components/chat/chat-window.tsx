/**
 * Purpose: Chat window component
 * Logic:
 * - Manages chat state using useChat hook
 * - Renders chat messages and input
 * - Handles error states and loading
 * Runtime context: Client Component
 * Services: OpenAI (via AI SDK)
 */
"use client"

import { useRef, useEffect } from "react"
import { useChat } from "ai/react"
import { ChatInput } from "./chat-input"
import { ChatMessage } from "./chat-message"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Bot } from "lucide-react"
import { ErrorBoundary, useErrorBoundaryWithToast } from "../ui/error-boundary"
import { Button } from "@/components/ui/button"

// Separate the chat content into its own component to be wrapped by ErrorBoundary
function ChatContent() {
  const { messages, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: "Hello! I can answer questions about your API documentation. What would you like to know?",
      },
    ],
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  return (
    <>
      <CardContent className="p-4 overflow-y-auto h-[calc(100%-80px)]">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "An error occurred while processing your request."}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="space-y-2 max-w-[80%]">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </CardContent>

      <CardFooter className="p-4 border-t">
        <ChatInput
          onSubmit={(message) => {
            handleSubmit(new Event("submit") as any, { message })
          }}
          isLoading={isLoading}
        />
      </CardFooter>
    </>
  )
}

// Main ChatWindow component that includes the ErrorBoundary
export function ChatWindow() {
  const { handleError } = useErrorBoundaryWithToast()

  return (
    <Card className="h-[calc(100vh-12rem)]">
      <ErrorBoundary
        onError={(error) => handleError(error)}
        fallback={
          <div className="p-6 flex flex-col items-center justify-center h-full">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-xl font-semibold mb-2">Chat Error</h3>
            <p className="text-muted-foreground text-center mb-6">
              An error occurred in the chat interface. Please try again or refresh the page.
            </p>
            <Button onClick={() => window.location.reload()} variant="default">
              Refresh Page
            </Button>
          </div>
        }
      >
        <ChatContent />
      </ErrorBoundary>
    </Card>
  )
}
