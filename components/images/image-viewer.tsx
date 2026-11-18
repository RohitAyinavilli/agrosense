
"use client"

import { useEffect, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

import {
  formatDate,
  type PlantImage,
} from "./photo-gallery"

type ImageViewerProps = {
  images: PlantImage[]
  selectedIndex: number | null
  date: string
  onClose: () => void
  onIndexChange: (index: number) => void
}

export function ImageViewer({
  images,
  selectedIndex,
  date,
  onClose,
  onIndexChange,
}: ImageViewerProps) {
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [failedId, setFailedId] = useState<string | null>(null)

  const isOpen = selectedIndex !== null
  const image =
    selectedIndex === null ? null : images[selectedIndex]

  const loaded = image !== undefined &&
    image !== null &&
    loadedId === image.id

  const failed = image !== undefined &&
    image !== null &&
    failedId === image.id

  function navigate(direction: number) {
    if (selectedIndex === null || images.length === 0) return

    const next =
      (selectedIndex + direction + images.length) %
      images.length

    onIndexChange(next)
  }

  useEffect(() => {
    if (!isOpen || images.length === 0) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        navigate(-1)
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()
        navigate(1)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, selectedIndex, images.length, onIndexChange])

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className="!w-[96vw] !max-w-[96vw] h-[94dvh] max-h-[94dvh] gap-3 overflow-hidden border-none bg-[#111a15] p-4 text-white sm:!max-w-[96vw]"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>
            {date ? formatDate(date) : "Photograph"}
          </DialogTitle>

          <DialogDescription className="text-white/60">
            {selectedIndex !== null
              ? `Photo ${selectedIndex + 1} of ${images.length}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {image && (
          <div className="relative flex min-h-64 items-center justify-center">
            {!loaded && !failed && (
              <Skeleton className="absolute inset-0 h-full w-full rounded-lg bg-white/10" />
            )}

            {failed ? (
              <div className="flex h-80 flex-col items-center justify-center gap-3 text-white/60">
                <ImageOff size={32} />
                <p className="text-sm">Unable to load photograph</p>
              </div>
            ) : (
              <img
                key={image.id}
                src={image.imageUrl}
                alt={`Plant photograph captured on ${formatDate(date)}`}
                onLoad={() => setLoadedId(image.id)}
                onError={() => setFailedId(image.id)}
                className={`max-h-[75vh] max-w-full rounded-lg object-contain ${
                  loaded ? "opacity-100" : "opacity-0"
                }`}
              />
            )}

            {images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 z-10 rounded-full"
                  onClick={() => navigate(-1)}
                  aria-label="Previous photograph"
                >
                  <ChevronLeft />
                </Button>

                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 z-10 rounded-full"
                  onClick={() => navigate(1)}
                  aria-label="Next photograph"
                >
                  <ChevronRight />
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
