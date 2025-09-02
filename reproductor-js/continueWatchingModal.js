// continueWatchingModal.js

(function () {
  const MODAL_ID = "continueWatchingModal";
  const VIDEO_PROGRESS_KEY = "videoProgress";
  let videoElement = null;
  let videoId = null;

  /**
   * Creates and appends the continue watching modal to the body.
   */
  function createModal() {
    const modalHtml = `
            <div id="${MODAL_ID}" class="popup" style="display: none;">
                <div class="popup-header" style="justify-content: center;">
                    <h3>Continuar Viendo</h3>
                </div>
                <div class="popup-content" style="text-align: center;">
                    <p>Parece que dejaste de ver en <span id="lastWatchedTime"></span>.</p>
                    <button id="continueBtn" class="btn-primary" style="margin-bottom: 10px;">Continuar</button>
                    <button id="startOverBtn" class="btn-primary" style="background-color: #f44336;">Empezar de Nuevo</button>
                </div>
            </div>
        `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
  }

  /**
   * Shows the modal with the last watched time.
   * @param {number} timeInSeconds - The time in seconds to display.
   */
  function showModal(timeInSeconds) {
    const modal = document.getElementById(MODAL_ID);
    const lastWatchedTimeSpan = document.getElementById("lastWatchedTime");
    if (modal && lastWatchedTimeSpan) {
      lastWatchedTimeSpan.textContent = formatTime(timeInSeconds);
      modal.style.display = "flex";
    }
  }

  /**
   * Hides the modal.
   */
  function hideModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) {
      modal.style.display = "none";
    }
  }

  /**
   * Saves the current video progress to local storage.
   */
  function saveVideoProgress() {
    if (videoElement && videoId) {
      const progress = {
        time: videoElement.currentTime,
        timestamp: Date.now(),
      };
      localStorage.setItem(
        `${VIDEO_PROGRESS_KEY}_${videoId}`,
        JSON.stringify(progress)
      );
      console.log(
        `Video progress saved for ${videoId}: ${formatTime(progress.time)}`
      );
    }
  }

  /**
   * Retrieves the last saved video progress from local storage.
   * @returns {object|null} The progress object or null if not found.
   */
  function getSavedVideoProgress() {
    if (videoId) {
      const savedProgress = localStorage.getItem(
        `${VIDEO_PROGRESS_KEY}_${videoId}`
      );
      return savedProgress ? JSON.parse(savedProgress) : null;
    }
    return null;
  }

  /**
   * Formats time in seconds to HH:MM:SS string.
   * @param {number} seconds - The time in seconds.
   * @returns {string} Formatted time string.
   */
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s]
      .map((v) => (v < 10 ? "0" + v : v))
      .filter((v, i) => v !== "00" || i > 0 || h > 0) // Only show hours if present
      .join(":");
  }

  /**
   * Initializes the continue watching modal functionality.
   * @param {HTMLVideoElement} video - The video element to track.
   * @param {string} id - A unique ID for the video (e.g., its source URL or a custom ID).
   */
  window.initContinueWatchingModal = function (video, id) {
    if (!video || !(video instanceof HTMLVideoElement)) {
      console.error(
        "Invalid video element provided to initContinueWatchingModal."
      );
      return;
    }
    if (!id) {
      console.error(
        "A unique video ID is required for initContinueWatchingModal."
      );
      return;
    }

    videoElement = video;
    videoId = id;

    // Create modal if it doesn't exist
    if (!document.getElementById(MODAL_ID)) {
      createModal();
    }

    // Initially hide the modal
    hideModal();

    // Event listener for when video metadata is loaded
    videoElement.addEventListener("loadedmetadata", () => {
      const savedProgress = getSavedVideoProgress();

      // If saved progress is greater than 1 second, pause the video and show the modal
      if (savedProgress && savedProgress.time > 1) {
        videoElement.pause(); // Ensure video is paused if modal is shown
        showModal(savedProgress.time);
      } else {
        // If no significant progress, ensure video starts from beginning
        videoElement.currentTime = 0;
        // Ensure the video doesn't autoplay here, let the user click play.
        videoElement.pause();
      }
    });

    // Event listeners for modal buttons
    const continueBtn = document.getElementById("continueBtn");
    const startOverBtn = document.getElementById("startOverBtn");

    if (continueBtn) {
      continueBtn.addEventListener("click", () => {
        const savedProgress = getSavedVideoProgress(); // Re-fetch in case it changed
        if (savedProgress) {
          videoElement.currentTime = savedProgress.time;
        }
        videoElement.play();
        document.getElementById("poster-bg").classList.add("hidden"); // Hide poster
        hideModal();
      });
    }

    if (startOverBtn) {
      startOverBtn.addEventListener("click", () => {
        videoElement.currentTime = 0;
        videoElement.play();
        document.getElementById("poster-bg").classList.add("hidden"); // Hide poster
        hideModal();
      });
    }

    // Save progress every 5 seconds while playing
    let saveInterval;
    videoElement.addEventListener("play", () => {
      saveInterval = setInterval(saveVideoProgress, 5000);
    });

    videoElement.addEventListener("pause", () => {
      clearInterval(saveInterval);
      saveVideoProgress(); // Save immediately on pause
    });

    videoElement.addEventListener("ended", () => {
      clearInterval(saveInterval);
      localStorage.removeItem(`${VIDEO_PROGRESS_KEY}_${videoId}`); // Clear progress on video end
      console.log(`Video progress cleared for ${videoId} as video ended.`);
    });

    // Save progress when the user navigates away or closes the tab
    window.addEventListener("beforeunload", saveVideoProgress);
  };
})();
