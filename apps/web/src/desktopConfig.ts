const runtimeConfig = window.SMART_PME_CONFIG ?? {};
window.SMART_PME_CONFIG = {
  ...runtimeConfig,
  desktop: runtimeConfig.desktop === true
    || (import.meta.env.DEV && new URLSearchParams(window.location.search).get('desktopMode') === '1'),
};
