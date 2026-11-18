import { createClient } from "@libsql/client"

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url || !authToken) {
  throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required")
}

const client = createClient({ url, authToken })
const metrics = [
  {
    key: "ph",
    unit: "",
    values: [5.8, 5.9, 5.9, 6.0, 6.1, 6.0, 5.9, 6.0, 6.1, 6.0, 5.9, 6.0],
  },
  {
    key: "temperature",
    unit: "°C",
    values: [
      22.1, 22.4, 22.8, 23.2, 23.6, 24.0, 24.2, 24.1, 23.8, 23.5, 23.2, 23.0,
    ],
  },
  {
    key: "humidity",
    unit: "%",
    values: [62, 64, 66, 68, 69, 71, 70, 68, 67, 66, 65, 64],
  },
  {
    key: "tds",
    unit: "ppm",
    values: [810, 812, 816, 820, 824, 829, 833, 837, 840, 844, 848, 852],
  },
  {
    key: "light",
    unit: "lux",
    values: [
      4100, 5200, 6800, 8100, 9400, 10200, 10800, 10500, 9700, 8200, 6100, 4300,
    ],
  },
]

try {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id TEXT PRIMARY KEY,
      metric TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      recorded_at TEXT NOT NULL
    )
  `)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS plant_images (
      id TEXT PRIMARY KEY,
      camera TEXT NOT NULL,
      image_url TEXT NOT NULL,
      captured_at TEXT NOT NULL
    )
  `)
  await client.execute(
    "CREATE INDEX IF NOT EXISTS sensor_readings_metric_time ON sensor_readings (metric, recorded_at)",
  )

  const statements = []
  const anchor = new Date()
  anchor.setMinutes(0, 0, 0)

  for (const metric of metrics) {
    metric.values.forEach((value, index) => {
      const recordedAt = new Date(
        anchor.getTime() -
          (metric.values.length - index - 1) * 2 * 60 * 60 * 1000,
      ).toISOString()
      statements.push({
        sql: `
          INSERT INTO sensor_readings (id, metric, value, unit, recorded_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            metric = excluded.metric,
            value = excluded.value,
            unit = excluded.unit,
            recorded_at = excluded.recorded_at
        `,
        args: [
          `mock-${metric.key}-${String(index).padStart(2, "0")}`,
          metric.key,
          value,
          metric.unit,
          recordedAt,
        ],
      })
    })
  }

  const imageRows = [
    ["mock-pi-image", "Pi Camera", process.env.MOCK_PI_IMAGE_URL],
    ["mock-esp32-image", "ESP32-CAM", process.env.MOCK_ESP32_IMAGE_URL],
  ].filter(([, , imageUrl]) => imageUrl)

  for (const [id, camera, imageUrl] of imageRows) {
    const parsedUrl = new URL(imageUrl)
    if (parsedUrl.protocol !== "https:") {
      throw new Error("Mock image URLs must use HTTPS")
    }
    statements.push({
      sql: `
        INSERT INTO plant_images (id, camera, image_url, captured_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          camera = excluded.camera,
          image_url = excluded.image_url,
          captured_at = excluded.captured_at
      `,
      args: [id, camera, imageUrl, anchor.toISOString()],
    })
  }

  await client.batch(statements, "write")
  console.log(
    `Seeded ${metrics.reduce((sum, item) => sum + item.values.length, 0)} sensor readings.`,
  )
  console.log(`Seeded ${imageRows.length} image URL records.`)
  if (imageRows.length === 0) {
    console.log(
      "No Supabase image URLs configured; image records were not inserted.",
    )
  }
} finally {
  await client.close()
}
