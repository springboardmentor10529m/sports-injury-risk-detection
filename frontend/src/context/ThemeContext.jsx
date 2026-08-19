import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sports-injury-theme') || 'system'
  })

  useEffect(() => {
    const root = document.documentElement

    root.classList.remove('light-theme', 'dark-theme')

    if (theme === 'light') {
      root.classList.add('light-theme')
    }

    if (theme === 'dark') {
      root.classList.add('dark-theme')
    }

    localStorage.setItem('sports-injury-theme', theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') {
      return
    }

    const mediaQuery = window.matchMedia(
      '(prefers-color-scheme: dark)'
    )

    const updateSystemTheme = () => {
      document.documentElement.classList.remove(
        'light-theme',
        'dark-theme'
      )

      if (mediaQuery.matches) {
        document.documentElement.classList.add('dark-theme')
      } else {
        document.documentElement.classList.add('light-theme')
      }
    }

    updateSystemTheme()

    mediaQuery.addEventListener(
      'change',
      updateSystemTheme
    )

    return () => {
      mediaQuery.removeEventListener(
        'change',
        updateSystemTheme
      )
    }
  }, [theme])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}