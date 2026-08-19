import { useEffect, useState } from 'react'

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyTheme(theme) {
  const root = document.documentElement

  if (theme === 'dark') {
    root.classList.add('dark-theme')
    return
  }

  if (theme === 'light') {
    root.classList.remove('dark-theme')
    return
  }

  const systemTheme = getSystemTheme()

  if (systemTheme === 'dark') {
    root.classList.add('dark-theme')
  } else {
    root.classList.remove('dark-theme')
  }
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sports-injury-theme') || 'system'
  })

  useEffect(() => {
    applyTheme(theme)

    localStorage.setItem('sports-injury-theme', theme)

    if (theme !== 'system') {
      return
    }

    const mediaQuery = window.matchMedia(
      '(prefers-color-scheme: dark)'
    )

    const handleSystemThemeChange = () => {
      applyTheme('system')
    }

    mediaQuery.addEventListener(
      'change',
      handleSystemThemeChange
    )

    return () => {
      mediaQuery.removeEventListener(
        'change',
        handleSystemThemeChange
      )
    }
  }, [theme])

  const handleThemeChange = (selectedTheme) => {
    setTheme(selectedTheme)
  }

  return (
    <div className="theme-selector">

      <button
        type="button"
        className={`theme-option ${
          theme === 'light' ? 'active' : ''
        }`}
        onClick={() => handleThemeChange('light')}
      >
        <span className="theme-option-icon">
          ☀
        </span>

        <span>
          Light
        </span>
      </button>


      <button
        type="button"
        className={`theme-option ${
          theme === 'dark' ? 'active' : ''
        }`}
        onClick={() => handleThemeChange('dark')}
      >
        <span className="theme-option-icon">
          ☾
        </span>

        <span>
          Dark
        </span>
      </button>


      <button
        type="button"
        className={`theme-option ${
          theme === 'system' ? 'active' : ''
        }`}
        onClick={() => handleThemeChange('system')}
      >
        <span className="theme-option-icon">
          ◉
        </span>

        <span>
          System
        </span>
      </button>

    </div>
  )
}

export default ThemeToggle