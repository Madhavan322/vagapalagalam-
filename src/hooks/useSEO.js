import { useEffect } from 'react'

export function useSEO(title, description) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | Vangapalagalam`
    }
    
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]')
      if (!metaDesc) {
        metaDesc = document.createElement('meta')
        metaDesc.name = 'description'
        document.head.appendChild(metaDesc)
      }
      metaDesc.setAttribute('content', description)
    }
  }, [title, description])
}
