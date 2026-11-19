
import { NextResponse } from "next/server"
import { createClient } from "@libsql/client"
import { Resend } from "resend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const METRICS = [
  "temperature",
  "humidity",
  "ph",
  "tds",
  "light",
  "voltage",
]

const SIX_HOURS = 6 * 60 * 60 * 1000

function database() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url || !authToken) {
    throw new Error("Missing Turso credentials")
  }

  return createClient({ url, authToken })
}

async function prepareTables(
  db: ReturnType<typeof database>
) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notification_subscribers (
      email TEXT PRIMARY KEY,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notification_state (
      metric TEXT PRIMARY KEY,
      status TEXT NOT NULL
    )
  `)
}

type Reading = {
  value: number
  unit: string
  time: number
}

type SensorStatus = {
  metric: string
  code: string
  message: string
}

function detectIssue(
  metric: string,
  latest?: Reading,
  previous?: Reading
): SensorStatus {
  function result(code: string, message: string) {
    return { metric, code, message }
  }

  if (!latest) {
    return result("no-data", "")
  }

  // Ignore old historical measurements.
  // An old reading is not a current sensor warning.
  if (
    latest.time > Date.now() ||
    Date.now() - latest.time > SIX_HOURS
  ) {
    return result("stale", "")
  }

  const v = latest.value
  const unit = latest.unit

  if (!Number.isFinite(v)) {
    return result("invalid", "Invalid numeric reading")
  }

  // Possible sensor faults
  if (metric === "ph" && (v <= 0 || v > 14)) {
    return result(
      "fault",
      `Invalid pH value: ${v}`
    )
  }

  if (
    metric === "humidity" &&
    (v <= 0 || v > 100)
  ) {
    return result(
      "fault",
      `Invalid humidity value: ${v}%`
    )
  }

  if (
    (metric === "tds" || metric === "voltage") &&
    v <= 0
  ) {
    return result(
      "fault",
      `Suspicious reading: ${v} ${unit}`
    )
  }

  if (metric === "light" && v < 0) {
    return result(
      "fault",
      `Invalid light value: ${v} lux`
    )
  }

  if (
    metric === "temperature" &&
    (v < -10 || v > 60)
  ) {
    return result(
      "fault",
      `Implausible temperature: ${v}°C`
    )
  }

  // Configurable growing-condition ranges
  const ranges: Record<
    string,
    { min: number; max: number }
  > = {
    ph: { min: 6, max: 7 },
    humidity: { min: 50, max: 70 },
    temperature: { min: 18, max: 28 },
  }

  const range = ranges[metric]

  if (range && v < range.min) {
    return result(
      "low",
      `${v} ${unit} is below the configured range ` +
        `(${range.min}–${range.max} ${unit})`
    )
  }

  if (range && v > range.max) {
    return result(
      "high",
      `${v} ${unit} is above the configured range ` +
        `(${range.min}–${range.max} ${unit})`
    )
  }

  // Sudden changes
  const limits: Record<string, number> = {
    ph: 0.4,
    temperature: 5,
    humidity: 25,
    tds: 250,
  }

  const limit = limits[metric]

  if (
    previous &&
    limit !== undefined &&
    Number.isFinite(previous.value) &&
    latest.time > previous.time &&
    latest.time - previous.time <= SIX_HOURS &&
    Math.abs(v - previous.value) >= limit
  ) {
    return result(
      "spike",
      `Sudden change from ${previous.value} to ` +
        `${v} ${unit}`
    )
  }

  return result("normal", "")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const action = body.action


    // Send a test email without checking sensor readings.
    if (action === "test") {
      const apiKey = process.env.RESEND_API_KEY
      const recipient = process.env.ALERT_TEST_EMAIL

      if (!apiKey || !recipient) {
        return NextResponse.json(
          { error: "Resend is not configured." },
          { status: 500 }
        )
      }

      const resend = new Resend(apiKey)

      const { error } = await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "AgroSense <onboarding@resend.dev>",
        to: [recipient],
        subject: "AgroSense - Test Notification",
        text: [
          "AgroSense Test Notification",
          "",
          "Your email notification system is working!",
          "",
          "You will receive alerts here when AgroSense",
          "detects sensor faults or unusual growing conditions.",
          "",
          "This is a test email. No sensor fault was detected.",
        ].join("\n"),
      })

      if (error) {
        console.error("Test email failed:", error)

        return NextResponse.json(
          { error: "Failed to send test email." },
          { status: 502 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "Test email sent! Check your inbox.",
      })
    }


    if (action !== "subscribe" && action !== "check") {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      )
    }

    const db = database()
    await prepareTables(db)

    // Subscribe
    if (action === "subscribe") {
      const email = String(body.email ?? "")
        .trim()
        .toLowerCase()

      const allowed = process.env.ALERT_TEST_EMAIL
        ?.trim()
        .toLowerCase()

      if (!allowed) {
        return NextResponse.json(
          { error: "ALERT_TEST_EMAIL is missing" },
          { status: 500 }
        )
      }

      if (email !== allowed) {
        return NextResponse.json(
          {
            error:
              "For now, use the email associated " +
              "with your Resend account.",
          },
          { status: 400 }
        )
      }

      await db.execute({
        sql: `
          INSERT OR IGNORE INTO notification_subscribers
          (email) VALUES (?)
        `,
        args: [email],
      })

      return NextResponse.json({
        success: true,
        message: "Subscribed successfully!",
      })
    }

    // Check latest readings
    const subscribers = await db.execute(
      "SELECT email FROM notification_subscribers"
    )

    if (subscribers.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No subscribers yet",
      })
    }

    const readings = await db.execute(`
      SELECT metric, value, unit, recorded_at
      FROM (
        SELECT
          metric,
          value,
          unit,
          recorded_at,
          ROW_NUMBER() OVER (
            PARTITION BY metric
            ORDER BY recorded_at DESC
          ) AS position
        FROM sensor_readings
      )
      WHERE position <= 2
      ORDER BY metric, recorded_at DESC
    `)

    const grouped = new Map<string, Reading[]>()

    for (const row of readings.rows) {
      const metric = String(row.metric)
      const time = new Date(
        String(row.recorded_at)
      ).getTime()

      if (!Number.isFinite(time)) continue

      const samples = grouped.get(metric) ?? []

      samples.push({
        value:
          row.value === null
            ? Number.NaN
            : Number(row.value),
        unit: String(row.unit ?? ""),
        time,
      })

      grouped.set(metric, samples)
    }

    const statuses = METRICS.map((metric) => {
      const samples = grouped.get(metric) ?? []

      return detectIssue(
        metric,
        samples[0],
        samples[1]
      )
    })

    const oldStates = await db.execute(
      "SELECT metric, status FROM notification_state"
    )

    const previousStatuses = new Map(
      oldStates.rows.map((row) => [
        String(row.metric),
        String(row.status),
      ])
    )

    const alerts = statuses.filter(
      (status) =>
        status.message &&
        previousStatuses.get(status.metric) !== status.code
    )

    // Only email when the condition changes.
    if (alerts.length > 0) {
      const apiKey = process.env.RESEND_API_KEY
      const recipient = process.env.ALERT_TEST_EMAIL
        ?.trim()
        .toLowerCase()

      if (!apiKey || !recipient) {
        throw new Error("Missing Resend configuration")
      }

      const resend = new Resend(apiKey)

      const text = [
        "AgroSense Sensor Alert",
        "",
        "New sensor issues detected:",
        "",
        ...alerts.map(
          (alert) =>
            `${alert.metric.toUpperCase()}\n${alert.message}`
        ),
        "",
        "Open AgroSense to inspect your sensor data.",
      ].join("\n\n")

      const { error } = await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "AgroSense <onboarding@resend.dev>",
        to: [recipient],
        subject:
          `AgroSense: ${alerts.length} sensor warning(s)`,
        text,
      })

      if (error) {
        console.error("Resend error:", error)

        return NextResponse.json(
          { error: "Failed to send alert email" },
          { status: 502 }
        )
      }
    }

    // Remember the conditions so refreshing
    // doesn't resend unchanged alerts.
    for (const status of statuses) {
      await db.execute({
        sql: `
          INSERT INTO notification_state (metric, status)
          VALUES (?, ?)
          ON CONFLICT(metric) DO UPDATE SET
            status = excluded.status
        `,
        args: [status.metric, status.code],
      })
    }

    return NextResponse.json({
      success: true,
      checked: METRICS.length,
      alertsSent: alerts.length,
      message:
        alerts.length > 0
          ? "Alert email sent"
          : "No new alerts",
    })
  } catch (error) {
    console.error("Notification error:", error)

    return NextResponse.json(
      { error: "Notification request failed" },
      { status: 500 }
    )
  }
}
