/**
 * Purpose: Document chunking logic
 * Logic:
 * - Splits documents into semantic chunks
 * - Handles different document types
 * - Adds metadata to chunks
 * Runtime context: Edge Function
 */
export interface Chunk {
  id: string
  text: string
  metadata: {
    source: string
    section?: string
    documentId: string
    chunkIndex: number
    timestamp: string
    heading?: string
  }
}

export interface ChunkingOptions {
  chunkSize: {
    text: number
    code: number
  }
  overlap?: number
}

export function chunkDocument(
  documentId: string,
  content: string,
  filename: string,
  type: string,
  options: ChunkingOptions,
): Chunk[] {
  const chunks: Chunk[] = []
  const { chunkSize, overlap = 100 } = options

  // Determine if content is code-heavy
  const isCode =
    type.includes("code") || filename.endsWith(".js") || filename.endsWith(".ts") || filename.endsWith(".py")

  // Choose appropriate chunk size
  const targetSize = isCode ? chunkSize.code : chunkSize.text

  // Split content into sections based on headings
  const sections = splitIntoSections(content)

  let chunkIndex = 0

  for (const section of sections) {
    const { heading, text } = section

    // If section is small enough, use it as a chunk
    if (text.length <= targetSize) {
      chunks.push({
        id: `${documentId}-chunk-${chunkIndex}`,
        text,
        metadata: {
          source: filename,
          section: heading,
          documentId,
          chunkIndex,
          timestamp: new Date().toISOString(),
          heading,
        },
      })
      chunkIndex++
      continue
    }

    // Otherwise, split section into chunks
    let startIndex = 0

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + targetSize, text.length)

      // Try to find a good break point (sentence or paragraph)
      let breakPoint = endIndex
      if (endIndex < text.length) {
        const searchEndIndex = Math.max(endIndex - 100, startIndex)
        const lastPeriod = text.lastIndexOf(".", endIndex)
        const lastNewline = text.lastIndexOf("\n", endIndex)

        if (lastPeriod > searchEndIndex) {
          breakPoint = lastPeriod + 1
        } else if (lastNewline > searchEndIndex) {
          breakPoint = lastNewline + 1
        }
      }

      const chunkText = text.substring(startIndex, breakPoint).trim()

      if (chunkText) {
        chunks.push({
          id: `${documentId}-chunk-${chunkIndex}`,
          text: chunkText,
          metadata: {
            source: filename,
            section: heading,
            documentId,
            chunkIndex,
            timestamp: new Date().toISOString(),
            heading,
          },
        })
        chunkIndex++
      }

      // Move start index for next chunk, accounting for overlap
      startIndex = breakPoint - overlap
      if (startIndex < 0) startIndex = breakPoint
    }
  }

  return chunks
}

interface Section {
  heading?: string
  text: string
}

function splitIntoSections(content: string): Section[] {
  const sections: Section[] = []
  const lines = content.split("\n")

  let currentHeading: string | undefined
  let currentText: string[] = []

  for (const line of lines) {
    // Check if line is a heading (markdown or HTML)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/) || line.match(/<h[1-6][^>]*>(.+?)<\/h[1-6]>/)

    if (headingMatch) {
      // Save previous section if it exists
      if (currentText.length > 0) {
        sections.push({
          heading: currentHeading,
          text: currentText.join("\n"),
        })
      }

      // Start new section
      currentHeading = headingMatch[2] || headingMatch[1]
      currentText = []
    } else {
      currentText.push(line)
    }
  }

  // Add the last section
  if (currentText.length > 0) {
    sections.push({
      heading: currentHeading,
      text: currentText.join("\n"),
    })
  }

  return sections
}
