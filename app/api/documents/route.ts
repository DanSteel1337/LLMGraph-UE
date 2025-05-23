import { NextResponse } from "next/server"

import { validateEnv } from "../../../lib/utils/env"
import { getDocuments } from "../../../lib/documents/storage"
import { createEdgeClient } from "../../../lib/supabase-server"

validateEnv()

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const supabase = createEdgeClient(request)
    const documents = await getDocuments(supabase)

    return NextResponse.json(documents)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
