// Edita este objeto para cambiar el contenido que se carga por defecto.

import { buildPlayerHTML } from "./dom_builder.js";
import { toggleFullscreen } from "./fullscreen_handler.js"; // Import fullscreen toggle function

document.addEventListener("DOMContentLoaded", async () => {
  window.fullscreenRequestedThisSession = false; // Make it a global flag

  console.log("DOMContentLoaded event fired.");
  console.log("contentConfig:", window.contentConfig); // Debug: Check contentConfig

  // Inject the HTML content
  // Access contentConfig from the global scope (defined in index.html)
  document.body.innerHTML = buildPlayerHTML(contentConfig);

  console.log(
    "After innerHTML assignment. Checking report-form directly:",
    document.getElementById("report-form")
  ); // Debug: Check report-form immediately after injection

  // --- OBTENER ELEMENTOS DEL DOM ---
  // Moved after HTML injection to ensure elements are available
  const dom = {
    wrapper: document.getElementById("player-wrapper"),
    video: document.getElementById("video-element"),
    iframe: document.getElementById("iframe-element"),
    poster: document.getElementById("poster-bg"),
    animeLoaderAnimation: document.getElementById("anime-loader-animation"),
    controls: document.getElementById("controls-overlay"),
    centerPlayControls: document.querySelector(".center-play-controls"),
    playPauseBtn: document.getElementById("play-pause-btn"),
    timeline: document.getElementById("timeline"),
    currentTime: document.getElementById("current-time"),
    duration: document.getElementById("duration"),
    fullscreenBtn: document.getElementById("fullscreen-btn"),
    rewindBtn: document.getElementById("rewind-btn"),
    forwardBtn: document.getElementById("forward-btn"),
    backBtn: document.getElementById("back-btn"),
    prevEpisodeBtn: document.getElementById("prev-episode-btn"),
    nextEpisodeBtn: document.getElementById("next-episode-btn"),
    langSelect: document.getElementById("lang-select"), // Reference to the language select
    serversSelect: document.getElementById("servers-select"), // Reference to the servers select
    // Vertical menu elements
    verticalMenuContainer: document.getElementById("vertical-menu-container"),
    langSelectVertical: document.getElementById("lang-select-vertical"),
    serversSelectVertical: document.getElementById("servers-select-vertical"),
    timelineVertical: document.getElementById("timeline-vertical"),
    currentTimeVertical: document.getElementById("current-time-vertical"),
    durationVertical: document.getElementById("duration-vertical"),
    prevEpisodeBtnVertical: document.getElementById(
      "prev-episode-btn-vertical"
    ),
    nextEpisodeBtnVertical: document.getElementById(
      "next-episode-btn-vertical"
    ),
    downloadBtnVertical: document.getElementById("download-btn-vertical"),
    popups: {
      episodes: document.getElementById("episodes-popup"),
      report: document.getElementById("report-popup"), // New: Report popup
      downloadServers: document.getElementById("download-servers-popup"), // New: Download Servers popup
      reportConfirmation: document.getElementById("report-confirmation-modal"), // New: Report Confirmation Modal
    },
    reportConfirmationOkBtn: document.getElementById(
      "report-confirmation-ok-btn"
    ), // New: OK button for confirmation modal
    closePopupBtns: document.querySelectorAll(".close-popup-btn"), // Botones para cerrar popups
    title: document.getElementById("episode-title-display"),
    openExternalBtn: document.getElementById("open-external-btn"),
    downloadBtn: document.getElementById("download-btn"),
    bottomBar: document.querySelector(".bottom-bar"), // Add reference to bottom bar
    reportBtn: document.getElementById("report-btn"), // New: Report button
    skipIntroContainer: document.getElementById("skip-intro-container"), // New: Skip intro container
    skipIntroBtn: document.getElementById("skip-intro-button"), // New: Skip intro button
    // Report form elements
    reportForm: document.getElementById("report-form"),
    reportIssueType: document.getElementById("report-issue-type"), // New: Report issue type select
    reportDescription: document.getElementById("report-description"), // New: Report description textarea
    reportServerSelect: document.getElementById("report-server"),
    reportLanguageSelect: document.getElementById("report-language"),
    reportTypeStreaming: document.getElementById("report-type-streaming"),
    reportTypeDownload: document.getElementById("report-type-download"),
    reportChatId: document.getElementById("report-chat-id"),
    reportToken: document.getElementById("report-token"),
    reportTopic: document.getElementById("report-topic"),
    // Download popup elements
    downloadServerSelect: document.getElementById("download-server-select"),
    startDownloadBtn: document.getElementById("start-download-btn"),
    downloadUnavailableMessage: document.getElementById(
      "download-unavailable-message"
    ), // New: Message for unavailable downloads
  };

  console.log("dom.popups.reportConfirmation:", dom.popups.reportConfirmation); // Debug: Check if element is found
  console.log("dom.reportConfirmationOkBtn:", dom.reportConfirmationOkBtn); // Debug: Check if element is found
  console.log("dom.reportForm:", dom.reportForm); // Debug line
  console.log("dom.reportServerSelect:", dom.reportServerSelect); // Debug line

  // Initialize continue watching modal
  window.initContinueWatchingModal(dom.video, getContentKey(contentConfig));

  // Import functions from external_handler.js
  const { showExternalPlayerModal, sendTelegramReport } = await import(
    "./external_handler.js"
  );

  // --- 1. CONFIGURACIÓN PRINCIPAL ---
  // --- ESTADO Y CONFIGURACIÓN ---
  let controlsTimeout;
  let currentServer = null; // To keep track of the currently loaded server
  let currentLanguage; // Will be set dynamically
  let playerInitialized = false; // New flag to track if player has been initialized
  let currentEpisodeTitle = ""; // Store the actual episode title
  let currentSeriesName = ""; // Store the series name
  let currentSeasonNumber = ""; // Store the season number
  let currentEpisodeNumber = ""; // Store the episode number
  // Removed currentContentSynopsis = ""; // Store the content synopsis
  let currentContentPosterUrl = ""; // Store the content poster URL

  // --- FUNCIONES PRINCIPALES ---

  // Helper function to get accurate video duration, acting as a small "library"
  const getAccurateVideoDuration = (videoElement) => {
    return new Promise((resolve) => {
      if (isFinite(videoElement.duration) && videoElement.duration > 0) {
        resolve(videoElement.duration);
        return;
      }

      const checkDuration = () => {
        if (isFinite(videoElement.duration) && videoElement.duration > 0) {
          resolve(videoElement.duration);
        } else {
          // Retry after a short delay if duration is not yet available
          setTimeout(checkDuration, 100);
        }
      };

      // Listen for metadata and duration changes
      videoElement.addEventListener("loadedmetadata", checkDuration, {
        once: true,
      });
      videoElement.addEventListener("durationchange", checkDuration, {
        once: true,
      });

      // Fallback: Start checking after a small initial delay in case events are missed or slow
      setTimeout(checkDuration, 500);
    });
  };

  // Helper function to parse time strings (e.g., "2m", "1h30m") into seconds
  const parseTimeToSeconds = (timeString) => {
    if (typeof timeString === "number") {
      return timeString; // Already in seconds
    }
    if (typeof timeString !== "string") {
      return 0; // Invalid input
    }

    let totalSeconds = 0;
    const hoursMatch = timeString.match(/(\d+)h/);
    const minutesMatch = timeString.match(/(\d+)m/);
    const mmssMatch = timeString.match(/(\d+):(\d+)/); // New: MM:SS format

    if (hoursMatch) {
      totalSeconds += parseInt(hoursMatch[1]) * 3600;
    }
    if (minutesMatch) {
      totalSeconds += parseInt(minutesMatch[1]) * 60;
    } else if (mmssMatch) {
      // If MM:SS format, parse minutes and seconds
      totalSeconds += parseInt(mmssMatch[1]) * 60; // Minutes
      totalSeconds += parseInt(mmssMatch[2]); // Seconds
    }
    return totalSeconds;
  };

  function getContentKey(config) {
    // Use a combination of type, title, season, and episode for a unique key
    // This ensures uniqueness without relying on an external ID like tmdbId
    const keyParts = [config.type, config.title || config.chapterName];
    if (config.season) keyParts.push(config.season);
    if (config.episode) keyParts.push(config.episode);
    return keyParts.join("-").replace(/[^a-zA-Z0-9-]/g, ""); // Sanitize for use as a key
  }

  async function fetchContentData() {
    console.log("Fetching content data...");

    let posterUrl = contentConfig.posterUrl || ""; // Use provided posterUrl if available
    currentEpisodeTitle =
      contentConfig.chapterName ||
      contentConfig.title ||
      "Título no disponible";
    dom.title.textContent = currentEpisodeTitle;

    // Set placeholder values for report form
    currentSeriesName = contentConfig.seriesName || "Contenido Personalizado";
    currentSeasonNumber = contentConfig.season || "N/A";
    currentEpisodeNumber = contentConfig.episode || "N/A";
    // Removed currentContentSynopsis = contentConfig.synopsis || "Sinopsis no disponible.";
    currentContentPosterUrl =
      contentConfig.reportPosterUrl || posterUrl || "N/A";

    console.log("Using custom content data.");
    return posterUrl; // Return the poster URL
  }

  // Helper para obtener el código de país y el nombre completo del idioma
  function getLanguageInfo(langCode) {
    const langInfoMap = {
      es: { country: "ES", name: "Español" },
      en: { country: "US", name: "English" },
      jp: { country: "JP", name: "Japonés" },
      mx: { country: "MX", name: "Mexicano" },
      // Añade más mapeos según sea necesario
    };
    const lowerLangCode = langCode.toLowerCase();

    if (langInfoMap[lowerLangCode]) {
      return langInfoMap[lowerLangCode];
    }

    // Fallback to Intl.DisplayNames for other languages
    try {
      const displayNames = new Intl.DisplayNames(["es"], { type: "language" });
      const languageName = displayNames.of(langCode);
      if (languageName) {
        return { country: langCode.toUpperCase(), name: languageName };
      }
    } catch (error) {
      console.warn("Intl.DisplayNames failed:", error);
    }

    // Final fallback to capitalized code
    return {
      country: langCode.toUpperCase(),
      name: lowerLangCode.charAt(0).toUpperCase() + lowerLangCode.slice(1),
    };
  }

  // Función para poblar las opciones de idioma en un select dado
  function populateLanguageSelect(selectElement) {
    selectElement.innerHTML = ""; // Clear existing options
    for (const langCode in window.languageServers) {
      const langInfo = getLanguageInfo(langCode);
      const option = document.createElement("option");
      option.value = langCode;
      option.textContent = langInfo.name;
      if (langCode === currentLanguage) {
        option.selected = true;
      }
      selectElement.appendChild(option);
    }
  }

  // Función para poblar las opciones de servidor para un idioma específico en un select dado
  function populateServersByLanguage(selectElement, langCode) {
    selectElement.innerHTML = ""; // Limpiar opciones existentes
    const servers = window.languageServers[langCode] || [];

    if (servers.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No hay servidores disponibles";
      option.disabled = true;
      selectElement.appendChild(option);
      selectElement.disabled = true;
      handleServerSelection(null); // No server selected
      return;
    }

    selectElement.disabled = false;
    servers.forEach((server) => {
      const option = document.createElement("option");
      option.value = server.url;
      option.textContent = server.name;
      option.dataset.mp4 = server.mp4; // Store mp4 type in dataset
      selectElement.appendChild(option);
    });

    let serverToSelect = null;
    // Try to keep the current server if it's in the new list
    if (currentServer && servers.some((s) => s.url === currentServer.url)) {
      serverToSelect = currentServer;
    } else {
      // Otherwise, select the first server in the new list
      serverToSelect = servers[0];
    }

    if (serverToSelect) {
      selectElement.value = serverToSelect.url;
      handleServerSelection(serverToSelect); // Load the selected server
    } else {
      // No servers available for this language
      handleServerSelection(null);
    }
  }

  // Manejador para la selección de idioma
  function handleLanguageSelection(langCode) {
    console.log("handleLanguageSelection called with:", langCode);
    currentLanguage = langCode;
    populateServersByLanguage(dom.serversSelect, currentLanguage);
    populateServersByLanguage(dom.serversSelectVertical, currentLanguage);
  }

  // Manejador para la selección de servidor
  function handleServerSelection(server) {
    console.log("handleServerSelection called with:", server);
    if (server) {
      loadSource(server);
    } else {
      // Handle case where no server is available or selected
      stopPlayback(); // Stop any ongoing playback
    }
  }

  function loadSource(server) {
    console.log("Loading source:", server.name);
    dom.poster.classList.remove("hidden"); // Always show poster when loading new source
    hideAllPopups();

    const urlToLoad = server.url; // Use direct URL
    console.log("URL to load:", urlToLoad);

    if (server.mp4) {
      dom.video.src = urlToLoad;
      dom.video.classList.add("hidden"); // Initially hide video until it can play
      dom.animeLoaderAnimation.classList.remove("hidden"); // Show loader
      dom.iframe.classList.add("hidden");
      dom.iframe.src = "about:blank"; // Clear iframe src
      dom.timeline.classList.remove("hidden"); // Show timeline for MP4
      dom.fullscreenBtn.classList.remove("hidden"); // Show fullscreen button for MP4
      dom.centerPlayControls.classList.remove("hidden"); // Show center play controls for MP4
      dom.timelineVertical.classList.remove("hidden"); // Show vertical timeline for MP4
      dom.currentTimeVertical.classList.remove("hidden"); // Show vertical current time for MP4
      dom.durationVertical.classList.remove("hidden"); // Show vertical duration for MP4
      dom.video.load(); // Explicitly load the video
      // Do not auto-play here, let the 'canplay' or 'play' event handle it after metadata is loaded
      dom.wrapper.classList.remove("iframe-active"); // Remove iframe-active class
      dom.bottomBar.classList.remove("hidden"); // Ensure bottom bar is visible for MP4 initially
      console.log("MP4 video source set. Waiting for metadata.");
      // Ensure video always fits within the container by default
      dom.video.classList.remove("object-fit-cover"); // Ensure it starts with contain
    } else {
      dom.iframe.src = urlToLoad;
      dom.iframe.classList.remove("hidden");
      dom.video.classList.add("hidden");
      dom.video.src = ""; // Clear video src
      dom.timeline.classList.add("hidden"); // Hide timeline for iframe
      dom.centerPlayControls.classList.add("hidden"); // Hide center play controls for iframe
      dom.timelineVertical.classList.add("hidden"); // Hide vertical timeline for iframe
      dom.currentTimeVertical.classList.add("hidden"); // Hide vertical current time for iframe
      dom.durationVertical.classList.add("hidden"); // Hide vertical duration for iframe
      dom.wrapper.classList.add("iframe-active"); // Add iframe-active class
      dom.bottomBar.classList.remove("hidden"); // Ensure bottom bar is visible for iframes
      console.log("Iframe source set.");
    }
    currentServer = server; // Store the currently loaded server
    dom.controls.classList.add("hidden"); // Hide controls initially when loading new source
    dom.bottomBar.classList.add("hidden"); // Hide bottom bar initially when loading new source
    clearTimeout(controlsTimeout); // Clear any existing timeout
    updateSkipIntroButtonVisibility(); // Update visibility after loading new source
  }

  // New function to manage skip intro button visibility
  function updateSkipIntroButtonVisibility() {
    const { introStartTime, introEndTime } = window.contentConfig;
    const introStartTimeInSeconds = parseTimeToSeconds(introStartTime); // Convert to seconds
    const introEndTimeInSeconds = parseTimeToSeconds(introEndTime); // Convert to seconds
    const isMp4 = currentServer && currentServer.mp4;
    const currentTime = dom.video.currentTime;

    console.log(
      "updateSkipIntroButtonVisibility:",
      "introStartTime:",
      introStartTime,
      "introStartTimeInSeconds:",
      introStartTimeInSeconds,
      "introEndTime:",
      introEndTime,
      "introEndTimeInSeconds:",
      introEndTimeInSeconds,
      "currentTime:",
      currentTime
    );

    if (
      isMp4 &&
      introStartTimeInSeconds !== undefined &&
      introEndTimeInSeconds !== undefined &&
      currentTime >= introStartTimeInSeconds &&
      currentTime < introEndTimeInSeconds
    ) {
      dom.skipIntroContainer.classList.add("active");
      dom.skipIntroBtn.textContent = "Omitir Intro"; // Removed time from button text
    } else {
      dom.skipIntroContainer.classList.remove("active");
      dom.skipIntroBtn.textContent = "Omitir Intro"; // Reset text when not active
    }
  }

  // Event listener for the skip intro button
  dom.skipIntroBtn.addEventListener("click", () => {
    const introEndTimeValue = window.contentConfig.introEndTime;
    if (introEndTimeValue !== undefined) {
      const introEndTimeInSeconds = parseTimeToSeconds(introEndTimeValue); // Convert to seconds
      console.log(
        "Skip intro button clicked. Attempting to skip to:",
        introEndTimeInSeconds,
        "Current video time:",
        dom.video.currentTime
      ); // Debug: Log introEndTime and current time
      dom.video.currentTime = introEndTimeInSeconds;
      dom.skipIntroContainer.classList.remove("active"); // Hide button after skipping
    }
  });

  window.changeEpisode = (newEpisode) => {
    const currentUrl = new URL(window.location);
    currentUrl.searchParams.set("e", newEpisode);
    window.location.href = currentUrl.href;
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return "00:00";
    const totalSeconds = Math.floor(timeInSeconds);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(seconds).padStart(2, "0")}`;
    } else {
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
        2,
        "0"
      )}`;
    }
  };
  const hideControls = () => {
    // Check if any popup is currently visible OR if a select element has focus
    const anyPopupOpen = Object.values(dom.popups).some(
      (popup) => !popup.classList.contains("hidden")
    );
    const selectHasFocus =
      document.activeElement === dom.langSelect ||
      document.activeElement === dom.serversSelect ||
      document.activeElement === dom.downloadServerSelect ||
      document.activeElement === dom.reportServerSelect ||
      document.activeElement === dom.reportLanguageSelect ||
      document.activeElement === dom.langSelectVertical || // Add vertical selects
      document.activeElement === dom.serversSelectVertical;

    if (anyPopupOpen || selectHasFocus) {
      // If a popup is open, or a select has focus, don't hide controls
      clearTimeout(controlsTimeout); // Ensure timeout is cleared
      controlsTimeout = setTimeout(hideControls, 3000); // Re-schedule check
      return;
    }

    // Check if intro is currently active
    const { introStartTime, introEndTime } = window.contentConfig;
    const introEndTimeInSeconds = parseTimeToSeconds(introEndTime);
    const isIntroActive =
      currentServer &&
      currentServer.mp4 &&
      introStartTime !== undefined &&
      introEndTimeInSeconds !== undefined &&
      dom.video.currentTime >= introStartTime &&
      dom.video.currentTime < introEndTimeInSeconds;

    dom.controls.classList.add("hidden");
    dom.bottomBar.classList.add("hidden"); // Hide bottom bar
    dom.verticalMenuContainer.classList.remove("active"); // Hide vertical menu

    // Always hide the skip intro button when controls are hidden.
    // Its visibility will be re-evaluated by updateSkipIntroButtonVisibility when controls are shown.
    dom.skipIntroContainer.classList.remove("active");
  };
  const showControls = () => {
    dom.controls.classList.remove("hidden");
    dom.bottomBar.classList.remove("hidden"); // Show bottom bar
    dom.verticalMenuContainer.classList.add("active"); // Show vertical menu

    clearTimeout(controlsTimeout);
    if (!dom.video.paused) {
      // Only set timeout if video is playing
      controlsTimeout = setTimeout(hideControls, 3000);
    }
    updateSkipIntroButtonVisibility(); // Re-evaluate visibility of skip intro button
  };
  const hideAllPopups = () => {
    dom.popups.episodes.classList.add("hidden");
    dom.popups.report.classList.add("hidden"); // Hide report popup
    dom.popups.downloadServers.classList.add("hidden"); // Hide download servers popup
    dom.popups.reportConfirmation.classList.add("hidden"); // Hide report confirmation modal
  };

  // Function to populate download servers dropdown
  function populateDownloadServersDropdown() {
    dom.downloadServerSelect.innerHTML = ""; // Clear existing options
    const servers = window.downloadServers[currentLanguage] || [];

    if (servers.length === 0) {
      dom.downloadServerSelect.classList.add("hidden"); // Hide server select
      dom.startDownloadBtn.classList.add("hidden"); // Hide start download button
      dom.downloadUnavailableMessage.classList.remove("hidden"); // Show unavailable message
      dom.downloadUnavailableMessage.innerHTML = `
        <div class="download-unavailable-content">
          <img src="https://image.myanimelist.net/ui/BQM6jEZ-UJLgGUuvrNkYUCG8p-X1WhZLiR4h-oxkqQdqHrJHiKZ4KaGQOmlUpp95VkOtHSiFmpA9dELbOu_ZUw" alt="Pronto disponible" class="download-unavailable-gif">
          <p>Pronto disponible para su descarga</p>
        </div>
      `;
      return;
    }

    dom.downloadServerSelect.classList.remove("hidden"); // Show server select
    dom.startDownloadBtn.classList.remove("hidden"); // Show start download button
    dom.downloadUnavailableMessage.classList.add("hidden"); // Hide unavailable message

    dom.downloadServerSelect.innerHTML = ""; // Clear existing options
    servers.forEach((server) => {
      const option = document.createElement("option");
      option.value = server.url;
      option.textContent = server.name;
      option.dataset.type = server.type; // Store download type in dataset
      dom.downloadServerSelect.appendChild(option);
    });
  }

  // Handler for initiating download
  function handleDownloadInitiation() {
    const selectedOption =
      dom.downloadServerSelect.options[dom.downloadServerSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) {
      alert("Por favor, selecciona un servidor de descarga.");
      return;
    }

    const serverUrl = selectedOption.value;
    const serverType = selectedOption.dataset.type;
    const serverName = selectedOption.textContent;

    hideAllPopups();

    if (serverType === "mp4") {
      const a = document.createElement("a");
      a.href = serverUrl;
      a.download = `${serverName}-${
        contentConfig.title || contentConfig.chapterName || "video"
      }-${contentConfig.season || ""}-${contentConfig.episode || ""}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(serverUrl, "_blank");
    }
  }

  // Function to populate report dropdowns
  function populateReportDropdowns() {
    // Populate language dropdown
    dom.reportLanguageSelect.innerHTML = "";
    for (const langCode in window.languageServers) {
      const langInfo = getLanguageInfo(langCode);
      const option = document.createElement("option");
      option.value = langCode;
      option.textContent = langInfo.name;
      if (langCode === currentLanguage) {
        option.selected = true;
      }
      dom.reportLanguageSelect.appendChild(option);
    }

    // Populate server dropdown based on current language
    dom.reportServerSelect.innerHTML = "";
    const serversForCurrentLang = window.languageServers[currentLanguage] || [];
    serversForCurrentLang.forEach((server, index) => {
      const option = document.createElement("option");
      option.value = server.name; // Or a unique ID for the server
      option.textContent = server.name;
      if (currentServer && currentServer.url === server.url) {
        option.selected = true;
      }
      dom.reportServerSelect.appendChild(option);
    });
    if (serversForCurrentLang.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No hay servidores disponibles";
      dom.reportServerSelect.appendChild(option);
      dom.reportServerSelect.disabled = true;
    } else {
      dom.reportServerSelect.disabled = false;
    }
  }

  // --- EVENTOS DEL REPRODUCTOR DE VIDEO ---
  dom.video.addEventListener("loadedmetadata", async () => {
    console.log("Video loadedmetadata event fired.");
    dom.animeLoaderAnimation.classList.remove("hidden"); // Show loader animation immediately
    dom.poster.classList.add("hidden"); // Hide poster while loading metadata

    const duration = await getAccurateVideoDuration(dom.video);

    if (isNaN(duration) || duration === 0) {
      console.warn(
        "Video metadata indicates 0 duration or invalid. Showing poster and loader."
      );
      dom.poster.classList.remove("hidden"); // Keep poster visible
      dom.animeLoaderAnimation.classList.remove("hidden"); // Keep loader visible
      dom.duration.textContent = "00:00";
      dom.timeline.max = 0;
      dom.durationVertical.textContent = "00:00";
      dom.timelineVertical.max = 0;
      dom.video.classList.add("hidden"); // Keep video hidden if metadata is invalid
    } else {
      dom.duration.textContent = formatTime(duration);
      dom.timeline.max = duration;
      dom.durationVertical.textContent = formatTime(duration); // Update vertical duration
      dom.timelineVertical.max = duration; // Update vertical timeline max
      dom.animeLoaderAnimation.classList.add("hidden"); // Hide loader if metadata is valid
      dom.video.classList.remove("hidden"); // Show video once metadata is loaded and valid
      // The "continue watching" logic is now handled by continueWatchingModal.js
      // Ensure poster is visible and controls are shown to allow user to start playback.
      if (dom.video.currentTime === 0) {
        dom.poster.classList.remove("hidden"); // Show poster if video is at the beginning
      } else {
        dom.poster.classList.add("hidden"); // Hide poster if video is not at the beginning
      }
    }
    // Removed showControls() here. Controls will be shown on user interaction (play)
  });

  dom.video.addEventListener("canplay", () => {
    console.log("Video canplay event fired.");
    dom.animeLoaderAnimation.classList.add("hidden"); // Hide loader when video can play
    // Removed autoplay: dom.video.play();
    showControls();
  });

  dom.video.addEventListener("loadeddata", () => {
    console.log("Video loadeddata event fired.");
  });

  dom.video.addEventListener("error", (e) => {
    const errorMsg = dom.video.error
      ? `Code: ${dom.video.error.code}, Message: ${dom.video.error.message}`
      : "Unknown error";
    console.error("Video error:", e, "MediaError:", errorMsg);
    dom.animeLoaderAnimation.classList.add("hidden"); // Hide loader on error
    // Instead of displaying a specific error message, just hide the loader and show the poster.
    // This allows for a more graceful fallback or silent failure as per user request.
    dom.poster.classList.remove("hidden"); // Show poster on error
    // Optionally, display a user-friendly message
    // dom.title.textContent = "Error al cargar el video. Intenta con otro servidor.";
  });

  dom.iframe.addEventListener("load", () => {
    dom.poster.classList.add("hidden"); // Hide poster when iframe content is loaded
  });

  dom.iframe.addEventListener("error", (e) => {
    console.error("Iframe error:", e);
    // dom.loadingText.textContent = "Error al cargar el contenido del servidor."; // No longer needed
  });

  dom.video.addEventListener("timeupdate", () => {
    const percentage = (dom.video.currentTime / dom.video.duration) * 100;
    dom.timeline.value = dom.video.currentTime;
    dom.timeline.style.setProperty(
      "--progress-value",
      `${percentage}%`
    ); /* Set CSS variable for progress fill */
    dom.currentTime.textContent = formatTime(dom.video.currentTime);

    dom.timelineVertical.value = dom.video.currentTime; // Update vertical timeline
    dom.timelineVertical.style.setProperty(
      "--progress-value",
      `${percentage}%`
    ); // Set CSS variable for vertical progress fill
    dom.currentTimeVertical.textContent = formatTime(dom.video.currentTime); // Update vertical current time

    localStorage.setItem(getContentKey(contentConfig), dom.video.currentTime);
    updateSkipIntroButtonVisibility(); // Update visibility on timeupdate
  });
  dom.video.addEventListener("play", () => {
    console.log("Video play event fired.");
    dom.playPauseBtn.textContent = "pause";
    dom.poster.classList.add("hidden"); // Hide poster when video starts playing
    showControls();
    updateSkipIntroButtonVisibility(); // Update visibility on play
  });
  dom.video.addEventListener("pause", () => {
    console.log("Video pause event fired.");
    dom.playPauseBtn.textContent = "play_arrow";
    showControls();
    clearTimeout(controlsTimeout);
    updateSkipIntroButtonVisibility(); // Update visibility on pause
  });
  dom.video.addEventListener("waiting", () => {
    console.log("Video waiting event fired.");
  });
  dom.video.addEventListener("playing", () => {
    console.log("Video playing event fired.");
  });
  dom.video.addEventListener("ended", () => {
    console.log("Video ended event fired.");
    localStorage.removeItem(getContentKey(contentConfig));
    dom.poster.classList.remove("hidden"); // Show poster again when video ends
  });

  // --- EVENTOS DE LOS CONTROLES ---

  // --- EVENTOS DE LOS CONTROLES ---
  dom.playPauseBtn.addEventListener("click", () => {
    if (dom.video.paused) {
      dom.video.play();
      // Request fullscreen when playing the video, if not already in fullscreen AND it hasn't been requested this session
      if (
        !document.fullscreenElement &&
        !window.fullscreenRequestedThisSession
      ) {
        toggleFullscreen(dom.wrapper);
        window.fullscreenRequestedThisSession = true; // Set flag to true for this session
      }
    } else {
      dom.video.pause();
    }
  });
  dom.timeline.addEventListener("input", () => {
    dom.video.currentTime = dom.timeline.value;
    dom.poster.classList.add("hidden"); // Hide poster while scrubbing
  });

  // Pinch-to-zoom functionality for video element
  let initialDistance = 0;
  let isPinching = false;

  dom.video.addEventListener("touchstart", (e) => {
    if (currentServer && currentServer.mp4 && e.touches.length === 2) {
      isPinching = true;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      initialDistance = Math.hypot(
        touch1.pageX - touch2.pageX,
        touch1.pageY - touch2.pageY
      );
    }
  });

  dom.video.addEventListener("touchmove", (e) => {
    if (isPinching && e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch1.pageX - touch2.pageX,
        touch1.pageY - touch2.pageY
      );

      const pinchThreshold = 20; // Minimum pixel change to consider it a pinch
      if (Math.abs(currentDistance - initialDistance) > pinchThreshold) {
        if (currentDistance > initialDistance) {
          // Pinch out (zoom in)
          dom.video.classList.add("object-fit-cover");
        } else {
          // Pinch in (zoom out)
          dom.video.classList.remove("object-fit-cover");
        }
        initialDistance = currentDistance; // Update initial distance for continuous pinching
      }
    }
  });

  dom.video.addEventListener("touchend", () => {
    isPinching = false;
  });

  // Event listener for vertical timeline
  dom.timelineVertical.addEventListener("input", () => {
    dom.video.currentTime = dom.timelineVertical.value;
    dom.poster.classList.add("hidden"); // Hide poster while scrubbing
  });

  dom.video.addEventListener("seeking", () => {
    dom.poster.classList.add("hidden"); // Hide poster when seeking
    dom.animeLoaderAnimation.classList.remove("hidden"); // Show loader animation
  });

  dom.video.addEventListener("seeked", () => {
    dom.animeLoaderAnimation.classList.add("hidden"); // Hide loader animation
  });
  dom.fullscreenBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      // If iframe is active, request fullscreen on the iframe itself or the wrapper
      if (!dom.iframe.classList.contains("hidden")) {
        // Attempt to request fullscreen on the iframe element
        // Note: Fullscreen on iframe content might be restricted by sandbox attributes or cross-origin policies.
        // Requesting fullscreen on the wrapper is a more reliable approach for the entire player.
        dom.wrapper
          .requestFullscreen()
          .catch((err) =>
            console.error("Error requesting fullscreen on wrapper:", err)
          );
      } else {
        // If video is active, request fullscreen on the wrapper
        dom.wrapper
          .requestFullscreen()
          .catch((err) =>
            console.error("Error requesting fullscreen on wrapper:", err)
          );
      }
    } else {
      document.exitFullscreen();
    }
  });
  dom.rewindBtn.addEventListener("click", () => (dom.video.currentTime -= 10));
  dom.forwardBtn.addEventListener("click", () => (dom.video.currentTime += 10));
  dom.wrapper.addEventListener("click", (e) => {
    // Only toggle controls if the click is directly on the wrapper or the video element
    // This prevents clicks on control buttons or popups from hiding controls
    if (e.target === dom.wrapper || e.target === dom.video) {
      if (dom.controls.classList.contains("hidden")) {
        showControls();
        // If "Haz clic para reproducir" is displayed, change it back to the episode title
        if (dom.title.textContent.trim() === "Haz clic para reproducir") {
          console.log(
            "Changing title from 'Haz clic para reproducir' to:",
            currentEpisodeTitle
          );
          dom.title.textContent = currentEpisodeTitle;
          dom.poster.classList.add("hidden"); // Hide poster when playback starts
        }
      } else {
        hideControls();
      }
    }
  });
  dom.backBtn.addEventListener("click", () => {
    const goBackId = dom.backBtn.dataset.goBackId;
    if (goBackId) {
      // If goBackId is present, navigate to the custom scheme
      window.location.href = `go:${goBackId}`;
    }
  });

  dom.prevEpisodeBtn.addEventListener("click", () => {
    const usePrevEpisode = dom.prevEpisodeBtn.dataset.usePrevEpisode === "true";
    const prevEpisodeUrl = dom.prevEpisodeBtn.dataset.prevEpisodeUrl;

    if (usePrevEpisode && prevEpisodeUrl) {
      window.location.href = prevEpisodeUrl;
    } else {
      const currentEpisode = parseInt(contentConfig.episode);
      if (currentEpisode > 1) {
        changeEpisode(currentEpisode - 1);
      } else {
        alert("Ya estás en el primer episodio.");
      }
    }
  });

  dom.nextEpisodeBtn.addEventListener("click", () => {
    const nextEpisodeUrl = dom.nextEpisodeBtn.dataset.nextEpisodeUrl;

    if (nextEpisodeUrl) {
      window.location.href = nextEpisodeUrl;
    } else {
      const currentEpisode = parseInt(contentConfig.episode);
      changeEpisode(currentEpisode + 1);
    }
  });

  // Event listeners for vertical episode navigation / rewind/forward
  dom.prevEpisodeBtnVertical.addEventListener("click", () => {
    const usePrevEpisode =
      dom.prevEpisodeBtnVertical.dataset.usePrevEpisode === "true";
    const prevEpisodeUrl = dom.prevEpisodeBtnVertical.dataset.prevEpisodeUrl;

    if (usePrevEpisode && prevEpisodeUrl) {
      window.location.href = prevEpisodeUrl;
    } else {
      const currentEpisode = parseInt(contentConfig.episode);
      if (currentEpisode > 1) {
        changeEpisode(currentEpisode - 1);
      } else {
        alert("Ya estás en el primer episodio.");
      }
    }
  });

  dom.nextEpisodeBtnVertical.addEventListener("click", () => {
    const nextEpisodeUrl = dom.nextEpisodeBtnVertical.dataset.nextEpisodeUrl;

    if (nextEpisodeUrl) {
      window.location.href = nextEpisodeUrl;
    } else {
      const currentEpisode = parseInt(contentConfig.episode);
      changeEpisode(currentEpisode + 1);
    }
  });

  // Eventos para los select de idioma y servidor
  dom.langSelect.addEventListener("change", (e) => {
    handleLanguageSelection(e.target.value);
  });

  dom.serversSelect.addEventListener("change", (e) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const selectedServer = {
      name: selectedOption.textContent,
      url: selectedOption.value,
      mp4: selectedOption.dataset.mp4 === "true",
    };
    handleServerSelection(selectedServer);
  });

  // Eventos para los select de idioma y servidor del menú vertical
  dom.langSelectVertical.addEventListener("change", (e) => {
    handleLanguageSelection(e.target.value);
  });

  dom.serversSelectVertical.addEventListener("change", (e) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const selectedServer = {
      name: selectedOption.textContent,
      url: selectedOption.value,
      mp4: selectedOption.dataset.mp4 === "true",
    };
    handleServerSelection(selectedServer);
  });

  // Eventos para cerrar popups
  dom.closePopupBtns.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      hideAllPopups();
    });
  });

  document.addEventListener("click", (e) => {
    // Hide all popups if click is outside of them and not on controls
    if (
      !e.target.closest(".popup") &&
      !e.target.closest(".bottom-controls") &&
      !e.target.closest(".top-bar") &&
      !e.target.closest(".vertical-menu-container") // Add vertical menu container
    ) {
      hideAllPopups();
    }
  });

  // --- NUEVOS BOTONES ---
  // --- NUEVOS BOTONES ---
  if (dom.openExternalBtn) {
    dom.openExternalBtn.addEventListener("click", () => {
      console.log("Open external button clicked.");
      console.log("currentServer:", currentServer);
      console.log(
        "currentServer.url:",
        currentServer ? currentServer.url : "N/A"
      );

      if (currentServer && currentServer.url) {
        const url = currentServer.url;
        const absoluteUrl = new URL(url, window.location.origin);
        const scheme = absoluteUrl.protocol.slice(0, -1); // "http" or "https"
        const urlWithoutScheme = absoluteUrl.href.replace(
          `${absoluteUrl.protocol}//`,
          ""
        );
        const intentUrl = `intent://${urlWithoutScheme}#Intent;action=android.intent.action.VIEW;type=video/*;scheme=${scheme};end`;
        window.open(intentUrl, "_system");
      } else {
        console.warn("No server URL selected for external opening."); // Log a warning
        alert("No hay URL de servidor seleccionada para abrir.");
      }
    });
  }

  if (dom.downloadBtn) {
    dom.downloadBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      hideAllPopups();
      dom.popups.downloadServers.classList.remove("hidden");
      populateDownloadServersDropdown();
    });
  }

  if (dom.downloadBtnVertical) {
    dom.downloadBtnVertical.addEventListener("click", (e) => {
      e.stopPropagation();
      hideAllPopups();
      dom.popups.downloadServers.classList.remove("hidden");
      populateDownloadServersDropdown();
    });
  }

  if (dom.startDownloadBtn) {
    dom.startDownloadBtn.addEventListener("click", handleDownloadInitiation);
  }

  // Evento para el botón de reporte
  if (dom.reportBtn) {
    dom.reportBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      hideAllPopups();
      dom.popups.report.classList.remove("hidden");
      populateReportDropdowns();

      // --- CONFIGURACIÓN DE TELEGRAM PARA EL REPORTE ---
      // IMPORTANTE: Reemplaza estos valores con los datos reales de tu bot y chat.
      // Estos valores se usarán para enviar el reporte a Telegram.
      dom.reportChatId.value = "-1003012512019"; // Ejemplo: "123456789"
      dom.reportToken.value = "7501592844:AAFR8K1wZEdie8g8F4FY3rVtKyM3EEZ8xg0"; // Ejemplo: "123456:ABC-DEF1234ghIkl-798989898989"
      dom.reportTopic.value = "102"; // Opcional, ejemplo: "123" (para un topic específico en un grupo)
      // --- FIN DE CONFIGURACIÓN DE TELEGRAM ---
    });
  }

  // Evento para el envío del formulario de reporte
  if (dom.reportForm) {
    dom.reportForm.addEventListener("submit", (e) => {
      e.preventDefault(); // Prevent default form submission
      const reportData = {
        server: dom.reportServerSelect.value,
        language: dom.reportLanguageSelect.value,
        reportType: dom.reportTypeStreaming.checked ? "streaming" : "download", // Get selected report type
        seriesName: currentSeriesName, // Add series name
        seasonNumber: currentSeasonNumber, // Add season number
        episodeNumber: currentEpisodeNumber, // Add episode number
        contentType: contentConfig.type, // Add content type
        // contentSynopsis: currentContentSynopsis, // Removed synopsis
        contentPosterUrl: currentContentPosterUrl, // Add poster URL
        currentUrl: window.location.href,
        currentServerUrl: currentServer ? currentServer.url : "N/A",
        chat_id: dom.reportChatId.value,
        token: dom.reportToken.value,
        topic: dom.reportTopic.value,
      };
      sendTelegramReport(reportData);
      hideAllPopups(); // Hide the report form
      dom.popups.reportConfirmation.classList.remove("hidden"); // Show the confirmation modal
    });
  }

  // Event for the OK button in the report confirmation modal
  if (dom.reportConfirmationOkBtn) {
    dom.reportConfirmationOkBtn.addEventListener("click", () => {
      dom.popups.reportConfirmation.classList.add("hidden"); // Hide the confirmation modal
    });
  }

  // --- INICIALIZACIÓN ---
  async function startPlayback() {
    if (playerInitialized) return; // Prevent re-initialization
    playerInitialized = true;

    const posterUrl = await fetchContentData(); // This will return contentConfig.posterUrl if available, or TMDB poster.

    const loadVideo = () => {
      // Initialize with the first server of the default language
      const defaultServers = window.languageServers[currentLanguage];
      if (defaultServers && defaultServers.length > 0) {
        loadSource(defaultServers[0]);
      } else {
        // dom.loadingText.textContent = "No hay servidores para este contenido en el idioma por defecto."; // No longer needed
      }
    };

    // If a poster URL is available (either from contentConfig or TMDB), set it.
    // The dom_builder already sets it if contentConfig.posterUrl is present,
    // but this ensures it's set if fetched from TMDB.
    if (posterUrl) {
      dom.poster.style.backgroundImage = `url(${posterUrl})`;
      dom.poster.classList.remove("hidden"); // Ensure poster is visible
    } else {
      dom.poster.classList.add("hidden"); // Hide poster if no URL is available
    }

    // Always load the video after handling the poster.
    loadVideo();
  }

  function stopPlayback() {
    if (dom.video) {
      dom.video.pause();
      dom.video.src = ""; // Clear video source
      dom.video.classList.add("hidden");
    }
    if (dom.iframe) {
      dom.iframe.src = "about:blank"; // Clear iframe source
      dom.iframe.classList.add("hidden");
    }
    dom.poster.classList.remove("hidden"); // Show poster when stopped
    dom.controls.classList.add("hidden"); // Hide controls
    dom.bottomBar.classList.add("hidden"); // Hide bottom bar
    playerInitialized = false;
  }

  // Initialize currentLanguage with the first available language or default to "es"
  const availableLanguages = Object.keys(window.languageServers || {});
  currentLanguage =
    availableLanguages.length > 0 ? availableLanguages[0] : "es";

  populateLanguageSelect(dom.langSelect); // Populate horizontal language select on load
  populateLanguageSelect(dom.langSelectVertical); // Populate vertical language select on load
  populateServersByLanguage(dom.serversSelect, currentLanguage); // Populate horizontal server select for the determined language
  populateServersByLanguage(dom.serversSelectVertical, currentLanguage); // Populate vertical server select for the determined language
  startPlayback();

  // Event listeners to keep controls visible on hover
  dom.controls.addEventListener("mouseover", showControls);
  dom.bottomBar.addEventListener("mouseover", showControls);

  dom.controls.addEventListener("mouseleave", () => {
    if (!dom.video.paused && !dom.wrapper.classList.contains("iframe-active")) {
      controlsTimeout = setTimeout(hideControls, 3000);
    }
  });
  dom.bottomBar.addEventListener("mouseleave", () => {
    if (!dom.video.paused && !dom.wrapper.classList.contains("iframe-active")) {
      controlsTimeout = setTimeout(hideControls, 3000);
    }
  });
  // Event listeners to keep vertical menu controls visible on hover
  dom.verticalMenuContainer.addEventListener("mouseover", showControls);
  dom.verticalMenuContainer.addEventListener("mouseleave", () => {
    if (!dom.video.paused && !dom.wrapper.classList.contains("iframe-active")) {
      controlsTimeout = setTimeout(hideControls, 3000);
    }
  });
});
