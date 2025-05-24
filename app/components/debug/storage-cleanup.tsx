"use client"

import { useState } from "react"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Separator } from "../../../components/ui/separator"
import { useToast } from "../../../hooks/use-toast"

interface StorageHealth {
  totalKeys: number
  totalDocuments: number
  orphanedKeys: number
  orphanedDocuments: string[]
  status: "healthy" | "needs_cleanup"
}

export function StorageCleanup() {
  const [health, setHealth] = useState<StorageHealth | null>(null)
  const [loading, setLoading] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const { toast } = useToast()

  const checkHealth = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/health/storage", {
        credentials: "include",
      })
      const data = await response.json()

      if (data.success) {
        setHealth(data.storage)
        toast({
          title: "Storage Health Check Complete",
          description: `Found ${data.storage.orphanedKeys} orphaned keys`,
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Health Check Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const performCleanup = async () => {
    setCleaning(true)
    try {
      const response = await fetch("/api/health/storage", {
        method: "POST",
        credentials: "include",
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: "Cleanup Complete",
          description: `Cleaned up ${data.cleanup.cleaned} orphaned entries`,
        })
        // Refresh health status
        await checkHealth()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Cleanup Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setCleaning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Health</CardTitle>
        <CardDescription>Monitor and clean up document storage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={checkHealth} disabled={loading}>
            {loading ? "Checking..." : "Check Health"}
          </Button>
          {health?.status === "needs_cleanup" && (
            <Button onClick={performCleanup} disabled={cleaning} variant="destructive">
              {cleaning ? "Cleaning..." : "Clean Up"}
            </Button>
          )}
        </div>

        {health && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium">Total Keys</div>
                <div className="text-2xl font-bold">{health.totalKeys}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Total Documents</div>
                <div className="text-2xl font-bold">{health.totalDocuments}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Orphaned Keys</div>
                <div className="text-2xl font-bold text-destructive">{health.orphanedKeys}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Status</div>
                <Badge variant={health.status === "healthy" ? "default" : "destructive"}>{health.status}</Badge>
              </div>
            </div>

            {health.orphanedDocuments.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Orphaned Documents</div>
                <div className="flex flex-wrap gap-1">
                  {health.orphanedDocuments.map((docId) => (
                    <Badge key={docId} variant="outline" className="text-xs">
                      {docId}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
