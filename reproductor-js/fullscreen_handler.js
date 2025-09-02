export function toggleFullscreen(element) {
  if (!document.fullscreenElement) {
    element
      .requestFullscreen()
      .catch((err) =>
        console.error("Error requesting fullscreen on element:", err)
      );
  } else {
    document.exitFullscreen();
  }
}
