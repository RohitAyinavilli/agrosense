import { createClient, type Client } from "@libsql/client"

let client: Client | undefined

export function getDatabase() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url || !authToken) {
    throw new Error("Turso database credentials are not configured")
  }

  client ??= createClient({ url, authToken })
  return client
}
