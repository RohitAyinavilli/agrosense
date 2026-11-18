
"use client"

import { useMemo, useState } from "react"
import {
  ArrowDownUp,
  CalendarDays,
  Download,
  Search,
  SlidersHorizontal,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

import {
  exportReadingsCSV,
  formatDate,
  formatDateTime,
  getDateKey,
  METRIC_STYLES,
  metricLabel,
  PAGE_SIZE,
  type Reading,
} from "./data-utils"

type ReadingsTableProps = {
  readings: Reading[]
  loading?: boolean
}

export function ReadingsTable({
  readings,
  loading = false,
}: ReadingsTableProps) {
  const [metric, setMetric] = useState("all")
  const [date, setDate] = useState("all")
  const [search, setSearch] = useState("")
  const [sortOrder, setSortOrder] = useState<
    "newest" | "oldest"
  >("newest")
  const [page, setPage] = useState(1)

  const metrics = useMemo(
    () => [...new Set(readings.map((r) => r.metric))].sort(),
    [readings]
  )

  const dates = useMemo(
    () =>
      [
        ...new Set(
          readings.map((r) => getDateKey(r.recordedAt))
        ),
      ].sort().reverse(),
    [readings]
  )

  const filteredReadings = useMemo(() => {
    const query = search.trim().toLowerCase()

    return readings
      .filter((reading) => {
        if (metric !== "all" && reading.metric !== metric) {
          return false
        }

        if (
          date !== "all" &&
          getDateKey(reading.recordedAt) !== date
        ) {
          return false
        }

        if (query) {
          const searchable = [
            reading.id,
            reading.metric,
            reading.value,
            reading.unit,
          ].join(" ").toLowerCase()

          if (!searchable.includes(query)) return false
        }

        return true
      })
      .sort((a, b) => {
        const difference =
          new Date(a.recordedAt).getTime() -
          new Date(b.recordedAt).getTime()

        return sortOrder === "newest"
          ? -difference
          : difference
      })
  }, [readings, metric, date, search, sortOrder])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReadings.length / PAGE_SIZE)
  )

  const currentPage = Math.min(page, totalPages)

  const visibleReadings = filteredReadings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  function updateMetric(value: string | null) {
    if (value === null) return
    setMetric(value)
    setPage(1)
  }

  function updateDate(value: string | null) {
    if (value === null) return
    setDate(value)
    setPage(1)
  }

  return (
    <Card className="border-[#dfe8e0] bg-white shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              Collected readings
            </CardTitle>

            <CardDescription className="mt-1">
              Search, filter, and inspect individual sensor records.
            </CardDescription>
          </div>

          {loading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {filteredReadings.length.toLocaleString()} results
              </Badge>

              <Button
                variant="outline"
                size="sm"
                disabled={filteredReadings.length === 0}
                onClick={() => exportReadingsCSV(filteredReadings)}
              >
                <Download size={15} />
                Export CSV
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {loading ? (
          <>
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-10 min-w-48 flex-1" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-36" />
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <Skeleton className="h-9 w-full" />

              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-11 w-full"
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-48 flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search readings..."
                  className="pl-9"
                />
              </div>

              <Select
                value={metric}
                onValueChange={updateMetric}
              >
                <SelectTrigger className="w-40">
                  <SlidersHorizontal size={15} />
                  <SelectValue placeholder="Metric" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    All metrics
                  </SelectItem>

                  {metrics.map((item) => (
                    <SelectItem key={item} value={item}>
                      {metricLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={date}
                onValueChange={updateDate}
              >
                <SelectTrigger className="w-48">
                  <CalendarDays size={15} />
                  <SelectValue placeholder="Date" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    All dates
                  </SelectItem>

                  {dates.map((item) => (
                    <SelectItem key={item} value={item}>
                      {formatDate(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSortOrder((current) =>
                    current === "newest"
                      ? "oldest"
                      : "newest"
                  )
                  setPage(1)
                }}
              >
                <ArrowDownUp size={15} />
                {sortOrder === "newest"
                  ? "Newest first"
                  : "Oldest first"}
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="border-b bg-[#f7faf7] text-xs text-[#718078]">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      Metric
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Value
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Unit
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Recorded at
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#edf1ed]">
                  {visibleReadings.map((reading) => (
                    <tr
                      key={reading.id}
                      className="transition-colors hover:bg-[#f7faf7]"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${
                            METRIC_STYLES[reading.metric.toLowerCase()] ??
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {metricLabel(reading.metric)}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono tabular-nums">
                        {reading.value.toLocaleString("en-IN", {
                          maximumFractionDigits: 3,
                        })}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {reading.unit || "—"}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(reading.recordedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {visibleReadings.length === 0 && (
                <div className="py-14 text-center text-sm text-muted-foreground">
                  No readings match your filters.
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {filteredReadings.length === 0
                  ? "Showing 0 readings"
                  : `Showing ${
                      (currentPage - 1) * PAGE_SIZE + 1
                    }–${Math.min(
                      currentPage * PAGE_SIZE,
                      filteredReadings.length
                    )} of ${filteredReadings.length}`}
              </p>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous
                </Button>

                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
