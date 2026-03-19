import { useEffect } from 'react'

export default function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} | Believer Blog` : 'Believer Blog — GATE CS Knowledge Base'
    return () => { document.title = prev }
  }, [title])
}
