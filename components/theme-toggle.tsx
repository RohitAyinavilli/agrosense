"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
  }, [])

  function toggleTheme() {
    const nextIsDark = !document.documentElement.classList.contains("dark")
    document.documentElement.classList.toggle("dark", nextIsDark)
    window.localStorage.setItem(
      "agrosense-theme",
      nextIsDark ? "dark" : "light"
    )
    setIsDark(nextIsDark)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}
