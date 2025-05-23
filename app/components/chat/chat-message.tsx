/**
 * Purpose: Chat message component
 * Logic:
 * - Renders individual chat messages
 * - Formats user and assistant messages differently
 * - Renders markdown content
 * Runtime context: Client Component
 */
"use client"

import type { Message } from "ai"
import { User, Bot } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { cn } from "../../../lib/utils"

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div className={cn("flex items-start gap-4 py-4", message.role === "user" ? "justify-end" : "justify-start")}>
      {message.role === "assistant" && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          "rounded-lg px-4 py-2 max-w-[80%]",
          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {message.role === "assistant" ? (
          <ReactMarkdown className="prose dark:prose-invert prose-sm">{message.content}</ReactMarkdown>
        ) : (
          <p>{message.content}</p>
        )}
      </div>
      {message.role === "user" && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-background">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}
