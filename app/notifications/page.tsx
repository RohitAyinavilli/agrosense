
"use client"

import { useState } from "react"
import { Bell, Mail, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function NotificationsPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [testing, setTesting] = useState(false)

  async function subscribe(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    setLoading(true)
    setMessage("")
    setError("")

    try {
      const response = await fetch(
        "/api/notifications",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "subscribe",
            email,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Subscription failed")
      }

      setMessage(result.message)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      )
    } finally {
      setLoading(false)
    }
  }

  async function checkNow() {
    setChecking(true)
    setMessage("")
    setError("")

    try {
      const response = await fetch(
        "/api/notifications",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "check" }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Check failed")
      }

      setMessage(result.message)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      )
    } finally {
      setChecking(false)
    }
  }


  async function sendTestEmail() {
    setTesting(true)
    setMessage("")
    setError("")

    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "test",
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to send test email"
        )
      }

      setMessage(result.message)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      )
    } finally {
      setTesting(false)
    }
  }


  return (
    <main className="min-w-0 bg-background">
      <div className="mx-auto max-w-3xl space-y-7 px-5 py-8 sm:px-8 lg:px-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Receive email alerts for unusual sensor readings
            and hydroponic growing conditions.
          </p>
        </div>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <Bell size={22} />
            </div>
            <CardTitle>Email alerts</CardTitle>
            <CardDescription>
              Subscribe to receive sensor fault and warning
              notifications.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <form onSubmit={subscribe} className="space-y-3">
              <label
                htmlFor="email"
                className="text-sm font-medium"
              >
                Email address
              </label>

              <div className="relative">
                <Mail
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                For now, use your Resend account email.
              </p>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading
                  ? "Subscribing..."
                  : "Subscribe"}
              </Button>
            </form>

            <div className="border-t border-border pt-5">
              <p className="mb-3 text-sm font-medium">
                Test notifications
              </p>

              <Button
                variant="outline"
                onClick={checkNow}
                disabled={checking}
                className="w-full"
              >
                <RefreshCw
                  size={16}
                  className={checking ? "animate-spin" : ""}
                />
                {checking
                  ? "Checking..."
                  : "Check for alerts now"}
              </Button>


              <Button
                type="button"
                variant="outline"
                onClick={sendTestEmail}
                disabled={testing}
                className="mt-3 w-full"
              >
                <Mail size={16} />
                {testing ? "Sending..." : "Send test email"}
              </Button>


              <p className="mt-2 text-xs text-muted-foreground">
                Checks the latest sensor readings and emails
                you only if a new issue is detected.
              </p>
            </div>

            {message && (
              <p
                role="status"
                className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
              >
                {message}
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              How it works
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              AgroSense checks sensor readings when you open
              or refresh the Overview page.
            </p>
            <p>
              While the Overview remains open, another check
              runs every three hours.
            </p>
            <p>
              You receive an email when a new abnormal
              condition is detected. Unchanged warnings
              won't trigger repeated emails.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
