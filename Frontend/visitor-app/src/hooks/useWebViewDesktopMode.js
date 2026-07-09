import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

function isIosWebView(userAgent) {
  const ua = (userAgent || '').toString()
  const isIos = /iPhone|iPad|iPod/i.test(ua)
  if (!isIos) return false
  // iOS Safari includes "Safari"; most in-app webviews omit it.
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)
  return !isSafari
}

function looksLikeWebView(userAgent) {
  const ua = (userAgent || '').toString()
  if (/wv\b/i.test(ua)) return true
  if (/WebView/i.test(ua)) return true
  if (isIosWebView(ua)) return true
  return false
}

export default function useWebViewDesktopMode() {
  const location = useLocation()

  return useMemo(() => {
    if (typeof window === 'undefined') return false

    const search = location?.search ?? window.location.search ?? ''
    const params = new URLSearchParams(search)

    const explicitWebView = params.get('webview')
    if (explicitWebView === '1' || explicitWebView === 'true') return true

    const layout = (params.get('layout') || '').toLowerCase()
    if (layout === 'desktop' || layout === 'webview') return true

    if (window.ReactNativeWebView) return true

    try {
      return looksLikeWebView(window.navigator?.userAgent ?? '')
    } catch {
      return false
    }
  }, [location?.search])
}

