
import { getDatabase } from "@/lib/database"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const database = getDatabase()

    const [readingsResult, imagesResult] = await Promise.all([
      database.execute(
        `SELECT id, metric, value, unit, recorded_at
         FROM sensor_readings
         WHERE metric IN ('temperature', 'humidity', 'light', 'ph', 'tds')
         ORDER BY recorded_at DESC`
      ),

      database.execute(
        `SELECT id, camera, image_url, captured_at
         FROM plant_images
         ORDER BY captured_at DESC, id ASC
         LIMIT 20`
      ),
    ])

    return Response.json({
      readings: readingsResult.rows.map((row) => ({
        id: String(row.id),
        metric: String(row.metric),
        value: Number(row.value),
        unit: String(row.unit),
        recordedAt: String(row.recorded_at),
      })),

      images: imagesResult.rows.map((row) => ({
        id: String(row.id),
        camera: String(row.camera),
        imageUrl: String(row.image_url),
        capturedAt: String(row.captured_at),
      })),
    })
  } catch (error) {
    console.error("Dashboard data query failed:", error)

    return Response.json(
      { error: "Unable to load dashboard data" },
      { status: 503 }
    )
  }
}
