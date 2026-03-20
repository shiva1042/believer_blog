/**
 * Attach scroll-to-zoom on mermaid diagram containers.
 * Just scroll on the diagram to zoom — no Ctrl needed.
 * Double-click to reset.
 */
export function attachMermaidZoom(container) {
  if (!container) return () => {}

  const cleanups = []

  const diagrams = container.querySelectorAll('.mermaid[data-processed]')
  diagrams.forEach((div) => {
    if (div.dataset.zoomAttached) return
    div.dataset.zoomAttached = 'true'

    let scale = 1
    const MIN_SCALE = 0.5
    const MAX_SCALE = 3
    const STEP = 0.1

    const target = div.querySelector('svg')
    if (!target) return

    const handleWheel = (e) => {
      e.preventDefault()
      e.stopPropagation()

      const delta = e.deltaY > 0 ? -STEP : STEP
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta))
      target.style.transform = `scale(${scale})`
      target.style.transformOrigin = 'center top'
    }

    const handleDblClick = (e) => {
      e.preventDefault()
      scale = 1
      target.style.transform = 'scale(1)'
    }

    div.addEventListener('wheel', handleWheel, { passive: false })
    div.addEventListener('dblclick', handleDblClick)

    cleanups.push(() => {
      div.removeEventListener('wheel', handleWheel)
      div.removeEventListener('dblclick', handleDblClick)
      delete div.dataset.zoomAttached
    })
  })

  return () => cleanups.forEach((fn) => fn())
}
