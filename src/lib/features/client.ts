'use client'

import { useState, useEffect, useCallback } from 'react'
import { FeatureFlags, featureDefaults } from './index'

const STORAGE_KEY = 'pgchat:features'

function loadFromStorage(): FeatureFlags {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...featureDefaults }
    // Merge stored values over defaults so newly added flags get their default
    return { ...featureDefaults, ...JSON.parse(raw) }
  } catch {
    return { ...featureDefaults }
  }
}

export function useFeatures() {
  // Start with defaults to avoid SSR/hydration mismatch
  const [flags, setFlags] = useState<FeatureFlags>({ ...featureDefaults })

  // Hydrate from localStorage after mount
  useEffect(() => {
    setFlags(loadFromStorage())
  }, [])

  const setFlag = useCallback(<K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) => {
    setFlags((prev) => {
      const next = { ...prev, [key]: value }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  return { flags, setFlag }
}
