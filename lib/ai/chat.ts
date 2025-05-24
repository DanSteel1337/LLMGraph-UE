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

// Missing export - streaming chat completion
export async function streamChatCompletion(
  messages: ChatMessage[],
  onChunk?: (chunk: string) => void,
): Promise<ReadableStream> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable")
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader()
      if (!reader) {
        controller.close()
        return
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = new TextDecoder().decode(value)
          const lines = chunk.split("\n").filter((line) => line.trim())

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") {
                controller.close()
                return
              }

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  onChunk?.(content)
                  controller.enqueue(new TextEncoder().encode(content))
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (error) {
        controller.error(error)
      } finally {
        reader.releaseLock()
      }
    },
  })

  return stream
}
