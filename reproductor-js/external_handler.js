/**
 * Abre una URL con el selector de apps de Android ("Abrir con...").
 * @param {string} url
 */
export function openWithAndroidChooser(url) {
  if (!url) {
    alert("La URL no es válida.");
    return;
  }

  // Ensure the URL is absolute before creating the intent
  const absoluteUrl = new URL(url, window.location.origin);
  const scheme = absoluteUrl.protocol.slice(0, -1); // "http" or "https"
  const urlWithoutScheme = absoluteUrl.href.replace(
    `${absoluteUrl.protocol}//`,
    ""
  );

  const intentUrl = `intent://${urlWithoutScheme}#Intent;action=android.intent.action.VIEW;type=video/*;scheme=${scheme};end`;
  window.open(intentUrl, "_system");
}

/**
 * Muestra un modal para seleccionar cómo abrir el video.
 * @param {string} url
 */
export function showExternalPlayerModal(url) {
  if (!url) {
    alert("Por favor, proporciona una URL válida de video.");
    return;
  }

  // Elimina modal existente
  const existingModal = document.getElementById("external-player-modal");
  if (existingModal) existingModal.remove();

  // Crea el modal
  const modalOverlay = document.createElement("div");
  modalOverlay.id = "external-player-modal";
  modalOverlay.className =
    "fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50";

  const modalContent = document.createElement("div");
  modalContent.className =
    "bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4";
  modalContent.innerHTML = `
    <h3 class="text-lg font-bold text-white mb-4">Seleccionar Reproductor</h3>
    <div class="flex flex-col space-y-4">
      <button id="open-with-button" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center">
        <i class="fas fa-external-link-alt mr-2"></i> Abrir con...
      </button>
      <button id="cancel-button" class="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700">
        Cancelar
      </button>
    </div>
  `;

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Eventos
  document.getElementById("open-with-button").addEventListener("click", () => {
    openWithAndroidChooser(url);
    modalOverlay.remove();
  });
  document.getElementById("cancel-button").addEventListener("click", () => {
    modalOverlay.remove();
  });

  // Cierra el modal si se hace clic fuera
  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) {
      modalOverlay.remove();
    }
  });
}

/**
 * Envía un reporte a Telegram.
 * @param {object} reportData - Los datos del reporte.
 */
export async function sendTelegramReport(reportData) {
  console.log("Attempting to send report to Telegram:", reportData);

  const TELEGRAM_BOT_TOKEN = reportData.token;
  const TELEGRAM_CHAT_ID = reportData.chat_id;
  const TELEGRAM_TOPIC_ID = reportData.topic;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    alert(
      "Error: El token del bot de Telegram y el ID del chat son necesarios para enviar reportes."
    );
    console.error("Telegram API credentials (token or chat_id) are missing.");
    return;
  }

  let message = `<b>Nuevo Reporte de Reproductor:</b>\n\n`;
  message += `<b>Nombre de la Serie:</b> ${reportData.seriesName}\n`;
  if (reportData.contentType === "tv") {
    message += `<b>Temporada:</b> ${reportData.seasonNumber}\n`;
    message += `<b>Episodio:</b> ${reportData.episodeNumber}\n`;
  } else {
    message += `<b>Tipo:</b> Película\n`;
  }
  message += `<b>Idioma:</b> ${reportData.language}\n`;
  message += `<b>Tipo de Reporte:</b> ${reportData.reportType}\n`; // Use reportType
  message += `<b>Servidor Reportado:</b> ${reportData.server}\n`;
  if (reportData.contentPosterUrl && reportData.contentPosterUrl !== "N/A") {
    message += `<b>Poster:</b> <a href="${reportData.contentPosterUrl}">Ver Poster</a>\n`; // Provide a clickable link with generic text
  } else {
    message += `<b>Poster:</b> No disponible\n`;
  }
  message += `<b>URL del Servidor:</b> <a href="${reportData.currentServerUrl}">${reportData.currentServerUrl}</a>\n`;

  const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const params = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "HTML",
  };
  if (TELEGRAM_TOPIC_ID) {
    params.message_thread_id = TELEGRAM_TOPIC_ID;
  }

  try {
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await response.json();
    if (data.ok) {
      alert("Reporte enviado con éxito a Telegram!");
      console.log("Telegram report sent successfully:", data);
    } else {
      alert(
        `Error al enviar el reporte a Telegram: ${
          data.description || "Error desconocido"
        }`
      );
      console.error("Telegram API error:", data);
    }
  } catch (error) {
    alert("Error de red al enviar el reporte a Telegram.");
    console.error("Network error sending Telegram report:", error);
  }
}
