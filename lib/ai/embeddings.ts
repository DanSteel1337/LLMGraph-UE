/**
 * Purpose: Embedding generation utilities
 * Logic:
 * - Generates embeddings for text using OpenAI
 * - Handles batching and rate limiting
 * Runtime context: Edge Function
 * Services: OpenAI
 */
import { retry } from "../utils/retry"

export async function createEmbedding(text: string): Promise<number[]> {
  const response = await retry(
    async () => {
      const result = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          input: text,
          model: "text-embedding-3-large",
          dimensions: 3072,
        }),
      })

      if (!result.ok) {
        const error = await result.json()
        throw new Error(`OpenAI API error: ${error.error?.message || "Unknown error"}`)
      }

      return result.json()
    },
    {
      retries: 3,
      minTimeout: 1000,
      factor: 2,
    },
  )

  return response.data[0].embedding
}

export async function createEmbeddingBatch(texts: string[], batchSize = 20): Promise<number[][]> {
  const embeddings: number[][] = []

  // Process in batches to avoid rate limits
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)

    const response = await retry(
      async () => {
        const result = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            input: batch,
            model: "text-embedding-3-large",
            dimensions: 3072,
          }),
        })

        if (!result.ok) {
          const error = await result.json()
          throw new Error(`OpenAI API error: ${error.error?.message || "Unknown error"}`)
        }

        return result.json()
      },
      {
        retries: 3,
        minTimeout: 1000,
        factor: 2,
      },
    )

    const batchEmbeddings = response.data.map((item: any) => item.embedding)
    embeddings.push(...batchEmbeddings)

    // Sleep to avoid rate limits if not the last batch
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  return embeddings
}
