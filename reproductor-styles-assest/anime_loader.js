// anime_loader.js

export function showAnimeLoader() {
  const animeLoaderAnimation = document.getElementById(
    "anime-loader-animation"
  );
  if (animeLoaderAnimation) {
    animeLoaderAnimation.classList.remove("hidden");
  }
}

export function hideAnimeLoader() {
  const animeLoaderAnimation = document.getElementById(
    "anime-loader-animation"
  );
  if (animeLoaderAnimation) {
    animeLoaderAnimation.classList.add("hidden");
  }
}
