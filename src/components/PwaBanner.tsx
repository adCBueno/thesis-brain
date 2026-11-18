import { useRegisterSW } from 'virtual:pwa-register/react'
import { flush } from '../lib/storage'

/** Small toast: "ready to work offline" once, and "new version" when an update is waiting. */
export function PwaBanner() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Check for a new version every hour while the app stays open.
      if (reg) setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000)
    },
  })

  if (!offlineReady && !needRefresh) return null

  return (
    <div className="toast" role="status">
      {needRefresh ? (
        <>
          <span>✨ Hay una versión nueva de Thesis Brain.</span>
          <button
            className="btn sm primary"
            onClick={async () => {
              await flush() // make sure nothing is pending before the reload
              await updateServiceWorker(true)
            }}
          >
            Actualizar
          </button>
          <button className="btn sm ghost" onClick={() => setNeedRefresh(false)}>
            Luego
          </button>
        </>
      ) : (
        <>
          <span>✅ Lista para usar sin internet.</span>
          <button className="btn sm ghost" onClick={() => setOfflineReady(false)}>
            OK
          </button>
        </>
      )}
    </div>
  )
}
