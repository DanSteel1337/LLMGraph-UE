/**
 * Purpose: Settings form component
 * Logic:
 * - Allows configuration of RAG parameters
 * - Saves settings to Vercel KV
 * Runtime context: Client Component
 * Services: Vercel KV (via API route)
 */
"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface SettingsFormProps {
  initialSettings: {
    topK: number
    temperature: number
    hybridSearch: boolean
    chunkSize: {
      text: number
      code: number
    }
  }
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to save settings")
      }

      toast({
        title: "Settings saved",
        description: "Your settings have been saved successfully.",
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="topK">Top K Results</Label>
          <div className="flex items-center gap-4">
            <Slider
              id="topK"
              min={1}
              max={10}
              step={1}
              value={[settings.topK]}
              onValueChange={(value) => setSettings({ ...settings, topK: value[0] })}
              className="flex-1"
            />
            <span className="w-12 text-center">{settings.topK}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Number of chunks to retrieve from the vector database.</p>
        </div>

        <div>
          <Label htmlFor="temperature">Temperature</Label>
          <div className="flex items-center gap-4">
            <Slider
              id="temperature"
              min={0}
              max={1}
              step={0.1}
              value={[settings.temperature]}
              onValueChange={(value) => setSettings({ ...settings, temperature: value[0] })}
              className="flex-1"
            />
            <span className="w-12 text-center">{settings.temperature.toFixed(1)}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Controls randomness in response generation.</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="hybridSearch">Hybrid Search</Label>
            <p className="text-sm text-muted-foreground">Combine vector similarity with keyword matching.</p>
          </div>
          <Switch
            id="hybridSearch"
            checked={settings.hybridSearch}
            onCheckedChange={(checked) => setSettings({ ...settings, hybridSearch: checked })}
          />
        </div>

        <div>
          <Label htmlFor="textChunkSize">Text Chunk Size</Label>
          <Input
            id="textChunkSize"
            type="number"
            min={100}
            max={1000}
            value={settings.chunkSize.text}
            onChange={(e) =>
              setSettings({
                ...settings,
                chunkSize: {
                  ...settings.chunkSize,
                  text: Number.parseInt(e.target.value),
                },
              })
            }
          />
          <p className="text-sm text-muted-foreground mt-1">Size of text chunks in tokens (200-500 recommended).</p>
        </div>

        <div>
          <Label htmlFor="codeChunkSize">Code Chunk Size</Label>
          <Input
            id="codeChunkSize"
            type="number"
            min={500}
            max={2000}
            value={settings.chunkSize.code}
            onChange={(e) =>
              setSettings({
                ...settings,
                chunkSize: {
                  ...settings.chunkSize,
                  code: Number.parseInt(e.target.value),
                },
              })
            }
          />
          <p className="text-sm text-muted-foreground mt-1">Size of code chunks in tokens (750-1500 recommended).</p>
        </div>
      </div>

      <Button type="submit" disabled={isSaving}>
        {isSaving ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  )
}
