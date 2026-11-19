
import Link from "next/link"
import { ArrowUpRight, Camera } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import type { DashboardData } from "@/lib/dashboard-types"

type PlantImage = DashboardData["images"][number]

type Props = {
  images: PlantImage[]
  loading: boolean
}

export function RecentImages({ images, loading }: Props) {
  const recent = [...images]
    .sort(
      (a, b) =>
        new Date(b.capturedAt).getTime() -
          new Date(a.capturedAt).getTime() ||
        b.id.localeCompare(a.id)
    )
    .slice(0, 4)

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Recent plant images</CardTitle>
          <CardDescription className="mt-1">
            Latest photographs of your hydroponic lettuce
          </CardDescription>
        </div>

        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/images" />}
        >
          View all
          <ArrowUpRight size={15} />
        </Button>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                className="aspect-square rounded-xl"
              />
            ))}
          </div>
        ) : recent.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {recent.map((image) => (
              <figure key={image.id} className="min-w-0">
                <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                  <img
                    src={image.imageUrl}
                    alt={`Hydroponic lettuce photograph from ${image.camera}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>

                <figcaption className="mt-2 text-xs text-muted-foreground">
                  {new Date(image.capturedAt).toLocaleDateString(
                    "en-IN",
                    {
                      timeZone: "Asia/Kolkata",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Camera size={26} />
            <p className="text-sm">
              No plant photographs available.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
