export interface Document {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: string
  status: "uploaded" | "processing" | "processed" | "error"
  error?: string
  chunkCount?: number
  vectorCount?: number
  processingStartedAt?: string
  processingCompletedAt?: string
}

interface DocumentListProps {
  documents: Document[]
}

export function DocumentList({ documents }: DocumentListProps) {}
