import { useEffect } from 'react'

const APP = 'AI Travel Assistant'

// Sets the browser tab title so each page is distinguishable in history, tabs and screen readers
export const usePageTitle = (title) => {
  useEffect(() => {
    document.title = title ? `${title} - ${APP}` : APP
  }, [title])
}
