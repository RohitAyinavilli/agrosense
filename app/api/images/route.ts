
import { getDatabase } from "@/lib/database"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const database = getDatabase()

    const result = await database.execute(
      `SELECT id, camera, image_url, captured_at
       FROM plant_images
       ORDER BY captured_at DESC, id ASC`
    )

    const images = result.rows.map((row) => ({
      id: String(row.id),
      camera: String(row.camera),
      imageUrl: String(row.image_url),
      capturedAt: String(row.captured_at),
    }))

    return Response.json({
      images,
      total: images.length,
    })
  } catch (error) {
    console.error("Image data query failed:", error)

    return Response.json(
      { error: "Unable to load image data" },
      { status: 503 }
    )
  }
}
