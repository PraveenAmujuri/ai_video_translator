"use client"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "../../context/ThemeContext"

function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  variant,
  fromCenter = false,
  ...props
}) => {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      style={{
        color: isDark ? "#ffffff" : "#000000"
      }}
      className={cn(
        "transition-colors duration-300",
        className
      )}
      {...props}
    >
      {isDark ? <Sun /> : <Moon />}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}