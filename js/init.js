if (localStorage.getItem('darkMode') === 'true') {
  document.documentElement.classList.add('dark');
}

function updateThemeColor() {
  const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-light').trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && color) meta.setAttribute('content', color);
}
document.addEventListener('DOMContentLoaded', updateThemeColor);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => {})
      .catch(err => {});
  });
}