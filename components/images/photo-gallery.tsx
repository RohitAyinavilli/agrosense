
"use client"

import { useState } from "react"
import {
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  ImageOff,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

export type PlantImage = {
  id: string
  camera: string
  imageUrl: string
  capturedAt: string
}

type PhotoGalleryProps = {
  images: PlantImage[]
  dates: string[]
  activeDate: string
  onDateChange: (date: string) => void
  onImageOpen: (index: number) => void
}

export function formatDate(dateKey: string) {
  if (!dateKey) return ""

  return new Date(
    `${dateKey}T12:00:00+05:30`
  ).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function PhotoCard({
  image,
  index,
  date,
  onOpen,
}: {
  image: PlantImage
  index: number
  date: string
  onOpen: () => void
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={failed}
      aria-label={`View photograph ${index + 1}`}
      className="group overflow-hidden rounded-xl border bg-card text-left transition-all duration-200 hover:border-emerald-300 hover:shadow-md disabled:cursor-not-allowed"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {!loaded && !failed && (
          <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
        )}

        {failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff size={28} />
            <span className="text-xs">Image unavailable</span>
          </div>
        ) : (
          <img
            src={image.imageUrl}
            alt={`Plant photograph captured on ${date}`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
      </div>

      <div className="flex items-center justify-between px-3 py-3">
        <span className="text-xs font-medium">
          Photo {index + 1}
        </span>

        <Camera size={14} className="text-muted-foreground" />
      </div>
    </button>
  )
}

export function PhotoGallery({
  images,
  dates,
  activeDate,
  onDateChange,
  onImageOpen,
}: PhotoGalleryProps) {
  const dateIndex = dates.indexOf(activeDate)

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays size={16} />
            Capture date
          </p>

          <h2 className="text-xl font-semibold">
            {formatDate(activeDate)}
          </h2>

          <Badge variant="secondary">
            {images.length} photographs
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous date"
            disabled={dateIndex >= dates.length - 1}
            onClick={() => onDateChange(dates[dateIndex + 1])}
          >
            <ChevronLeft size={18} />
          </Button>

          <Select
            value={activeDate}
            onValueChange={(value) => {
              if (value !== null) onDateChange(value)
            }}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>

            <SelectContent>
              {dates.map((date) => (
                <SelectItem key={date} value={date}>
                  {formatDate(date)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            aria-label="Next date"
            disabled={dateIndex <= 0}
            onClick={() => onDateChange(dates[dateIndex - 1])}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <PhotoCard
            key={image.id}
            image={image}
            index={index}
            date={formatDate(activeDate)}
            onOpen={() => onImageOpen(index)}
          />
        ))}
      </div>
    </div>
  )
}

export function GallerySkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex gap-10 border-b pb-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-16" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-24" />
        </div>

        <Skeleton className="h-10 w-44" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border bg-card"
          >
            <Skeleton className="aspect-square w-full rounded-none" />

            <div className="p-3">
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
