/**
 * Purpose: Settings page for the application
 * Logic:
 * - Provides basic settings for the application
 * - Allows configuration of RAG parameters
 * Runtime context: Server Component
 * Services: Vercel KV (for settings storage)
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SettingsForm } from "@/app/components/settings/settings-form"
import { kv } from "@vercel/kv"

// Default settings
const DEFAULT_SETTINGS = {
  topK: 5,
  temperature: 0.7,
  hybridSearch: true,
  chunkSize: {
    text: 300,
    code: 1000,
  },
}

async function getSettings() {
  try {
    const settings = await kv.get("settings")
    return settings || DEFAULT_SETTINGS
  } catch (error) {
    console.error("Failed to get settings:", error)
    return DEFAULT_SETTINGS
  }
}

export default async function SettingsPage() {
  const settings = await getSettings()

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-none">
        <CardHeader className="px-0">
          <CardTitle>Settings</CardTitle>
          <CardDescription>Configure your RAG dashboard</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RAG Configuration</CardTitle>
          <CardDescription>Adjust parameters for retrieval and generation</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm initialSettings={settings} />
        </CardContent>
      </Card>
    </div>
  )
}
