import { useEffect, useState } from 'react'

import { getPaymentConfig } from '../api/payment.js'

/**
 * Returns whether online payments are enabled in Settings → Payment.
 * Payment-related UI (fee prompts, the Pay button, the Payments page/nav)
 * should only appear when this is true.
 */
export default function usePaymentEnabled() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      getPaymentConfig()
        .then((cfg) => {
          if (!cancelled) setEnabled(Boolean(cfg?.enabled))
        })
        .catch(() => {
          if (!cancelled) setEnabled(false)
        })

    load()
    // Re-check when payment settings are saved (so the UI updates without reload).
    const onUpdated = () => load()
    window.addEventListener('vm:payment-updated', onUpdated)
    return () => {
      cancelled = true
      window.removeEventListener('vm:payment-updated', onUpdated)
    }
  }, [])

  return enabled
}

