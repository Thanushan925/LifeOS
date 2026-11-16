// Apply the theme before React and styles load to avoid a light flash.
(() => {
  let saved
  try { saved = localStorage.getItem('lifeos-theme') } catch { /* Storage may be blocked. */ }
  const theme = saved === 'light' || saved === 'dark'
    ? saved
    : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
})()
