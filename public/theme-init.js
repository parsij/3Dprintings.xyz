(() => {
  const storageKey = "theme-preference";
  const allowedThemes = new Set(["light", "dark"]);
  let theme;

  try {
    const storedTheme = window.localStorage.getItem(storageKey);
    if (allowedThemes.has(storedTheme)) {
      theme = storedTheme;
    }
  } catch {
    theme = undefined;
  }

  if (!theme) {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
})();
