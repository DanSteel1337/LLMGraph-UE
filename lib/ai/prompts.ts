/**
 * Purpose: Prompt templates for RAG
 * Logic:
 * - Builds prompts for the OpenAI API
 * - Formats context and questions
 * Runtime context: Edge Function
 */
import type { Message } from "ai"
import type { SearchResult } from "../pinecone/search"
import { buildContextFromSearchResults, formatMessagesForOpenAI } from "./chat"

export function buildPrompt(
  messages: Message[],
  searchResults: SearchResult[],
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const context = buildContextFromSearchResults(searchResults)
  return formatMessagesForOpenAI(messages, context)
}

export function buildSystemPrompt(context: string): string {
  return `You are a helpful assistant that answers questions based on the provided context.
Only use information from the context to answer the question.
If you don't know the answer based on the context, say so.
Always cite your sources using the numbers in brackets, e.g. [1], [2], etc.

Context:
${context}`
}
