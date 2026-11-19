
"use client"

import { useEffect, useMemo, useState } from "react"
import { Database, RefreshCw } from "lucide-react"

import type { DashboardData } from "@/lib/dashboard-types"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { DataSummary } from "@/components/data/data-summary"
import { ReadingsTable } from "@/components/data/readings-table"
import { getDateKey } from "@/components/data/data-utils"

type Status = "loading" | "loaded" | "error"

export default function DataPage() {
  const [data, setData] = useState<DashboardData>({
    readings: [],
    images: [],
  })

  const [status, setStatus] = useState<Status>("loading")
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadData() {
      setStatus("loading")

      try {
        const response = await fetch("/api/dashboard", {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Unable to fetch sensor readings")
        }

        const result: DashboardData = await response.json()

        if (controller.signal.aborted) return

        setData(result)
        setStatus("loaded")
      } catch (error) {
        if (controller.signal.aborted) return

        console.error("Sensor data error:", error)
        setStatus("error")
      }
    }

    loadData()

    return () => controller.abort()
  }, [refreshKey])

  const readings = data.readings

  const summary = useMemo(() => ({
    totalReadings: readings.length,
    recordedDates: new Set(
      readings.map((reading) => getDateKey(reading.recordedAt))
    ).size,
    sensorMetrics: new Set(
      readings.map((reading) => reading.metric)
    ).size,
  }), [readings])

  function refreshData() {
    setRefreshKey((key) => key + 1)
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <Database size={17} />
              Historical records
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              Sensor data
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Explore collected readings from the hydroponic
              monitoring system.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={refreshData}
            disabled={status === "loading"}
          >
            <RefreshCw
              size={16}
              className={
                status === "loading" ? "animate-spin" : ""
              }
            />
            Refresh
          </Button>
        </header>

        {status === "error" ? (
          <Card className="border-destructive/30">
            <CardContent className="py-12 text-center">
              <Database
                className="mx-auto mb-3 text-destructive"
                size={30}
              />

              <p className="font-semibold">
                Unable to load sensor readings
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                Check your database connection and try again.
              </p>

              <Button
                variant="outline"
                className="mt-5"
                onClick={refreshData}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <DataSummary
              {...summary}
              loading={status === "loading"}
            />

            <ReadingsTable
              readings={readings}
              loading={status === "loading"}
            />
          </>
        )}
      </div>
    </main>
  )
}
