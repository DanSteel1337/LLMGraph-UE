/**
 * Purpose: Chat utilities
 * Logic:
 * - Provides functions for chat message handling
 * - Formats messages for OpenAI API
 * Runtime context: Edge Function
 * Services: OpenAI
 */
import type { Message } from "ai"
import type { SearchResult } from "../pinecone/search"

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export function formatMessagesForOpenAI(messages: Message[], context?: string): ChatMessage[] {
  const formattedMessages: ChatMessage[] = []

  // Add system message with context if provided
  if (context) {
    formattedMessages.push({
      role: "system",
      content: `You are a helpful assistant that answers questions based on the provided context. 
      Only use information from the context to answer the question. 
      If you don't know the answer based on the context, say so.
      
      Context:
      ${context}`,
    })
  } else {
    formattedMessages.push({
      role: "system",
      content: "You are a helpful assistant that answers questions about API documentation.",
    })
  }

  // Add user and assistant messages
  for (const message of messages) {
    if (message.role === "user" || message.role === "assistant") {
      formattedMessages.push({
        role: message.role,
        content: message.content,
      })
    }
  }

  return formattedMessages
}

export function buildContextFromSearchResults(searchResults: SearchResult[]): string {
  if (!searchResults.length) {
    return ""
  }

  return searchResults
    .map((result, index) => {
      const metadata = result.metadata || {}

      return `[${index + 1}] ${metadata.source || "Unknown source"}
Section: ${metadata.section || "N/A"}
Content:
${result.text}
`
    })
    .join("\n\n")
}
