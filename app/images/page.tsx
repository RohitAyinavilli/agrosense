
"use client"

import { useEffect, useMemo, useState } from "react"
import { ImageOff, Images, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  GallerySkeleton,
  PhotoGallery,
  type PlantImage,
} from "@/components/images/photo-gallery"
import { ImageViewer } from "@/components/images/image-viewer"

type ImagesResponse = {
  images: PlantImage[]
  total: number
}

type LoadStatus = "loading" | "loaded" | "error"

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

function getDateKey(timestamp: string) {
  const parts = dateFormatter.formatToParts(
    new Date(timestamp)
  )

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? ""

  return `${get("year")}-${get("month")}-${get("day")}`
}

export default function ImagesPage() {
  const [images, setImages] = useState<PlantImage[]>([])
  const [status, setStatus] = useState<LoadStatus>("loading")

  const [selectedDate, setSelectedDate] = useState("")
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    null
  )

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadImages() {
      setStatus("loading")

      try {
        const response = await fetch("/api/images", {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(
            `Image API returned ${response.status}`
          )
        }

        const data: ImagesResponse = await response.json()

        if (controller.signal.aborted) return

        setImages(data.images)
        setStatus("loaded")
      } catch (error) {
        if (controller.signal.aborted) return

        console.error("Gallery loading failed:", error)
        setStatus("error")
      }
    }

    loadImages()

    return () => controller.abort()
  }, [refreshKey])

  const groupedImages = useMemo(() => {
    const groups: Record<string, PlantImage[]> = {}

    for (const image of images) {
      const date = getDateKey(image.capturedAt)

      if (!groups[date]) groups[date] = []

      groups[date].push(image)
    }

    for (const group of Object.values(groups)) {
      group.sort((a, b) => {
        const difference =
          new Date(a.capturedAt).getTime() -
          new Date(b.capturedAt).getTime()

        return difference || a.id.localeCompare(b.id)
      })
    }

    return groups
  }, [images])

  const dates = useMemo(
    () => Object.keys(groupedImages).sort().reverse(),
    [groupedImages]
  )

  const activeDate = dates.includes(selectedDate)
    ? selectedDate
    : (dates[0] ?? "")

  const currentImages = groupedImages[activeDate] ?? []

  function changeDate(date: string) {
    setSelectedDate(date)
    setSelectedIndex(null)
  }

  function refreshImages() {
    setSelectedIndex(null)
    setRefreshKey((key) => key + 1)
  }

  return (
    <main className="min-h-screen bg-[#f5f7f5] px-4 py-10 text-[#14201c] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Card className="border-[#dfe8e0] bg-white shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-[#edf7ef] text-[#3d8b61]">
                <Images size={24} />
              </div>

              <div className="min-w-0 flex-1">
                <CardTitle className="text-2xl sm:text-3xl">
                  Image monitoring
                </CardTitle>

                <CardDescription className="mt-2">
                  Explore plant growth photographs by capture date.
                </CardDescription>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={refreshImages}
                disabled={status === "loading"}
                aria-label="Refresh photographs"
                title="Refresh photographs"
              >
                <RefreshCw
                  size={17}
                  className={
                    status === "loading" ? "animate-spin" : ""
                  }
                />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {status === "loading" && <GallerySkeleton />}

            {status === "error" && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
                <ImageOff className="mx-auto mb-3 text-destructive" />

                <p className="font-medium">
                  Unable to load photographs
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Please check your connection and try again.
                </p>

                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={refreshImages}
                >
                  Try again
                </Button>
              </div>
            )}

            {status === "loaded" && dates.length === 0 && (
              <div className="py-20 text-center text-muted-foreground">
                <ImageOff className="mx-auto mb-3" size={32} />
                No photographs available yet.
              </div>
            )}

            {status === "loaded" && dates.length > 0 && (
              <div className="space-y-8">
                <div className="flex flex-wrap gap-8 border-b pb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total photographs
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                      {images.length}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Dates recorded
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                      {dates.length}
                    </p>
                  </div>
                </div>

                <PhotoGallery
                  images={currentImages}
                  dates={dates}
                  activeDate={activeDate}
                  onDateChange={changeDate}
                  onImageOpen={setSelectedIndex}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ImageViewer
        images={currentImages}
        selectedIndex={selectedIndex}
        date={activeDate}
        onClose={() => setSelectedIndex(null)}
        onIndexChange={setSelectedIndex}
      />
    </main>
  )
}
