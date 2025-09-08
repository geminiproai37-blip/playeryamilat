// player_error_handler.js

// player_error_handler.js

const serverUnavailableModal = document.getElementById(
  "server-unavailable-modal"
);
const closeButton = document.getElementById("close-server-unavailable-modal");
const okButton = document.getElementById("server-unavailable-ok-btn");

export function showServerUnavailableModal() {
  if (serverUnavailableModal) {
    serverUnavailableModal.style.display = "flex";
  }
}

export function hideServerUnavailableModal() {
  if (serverUnavailableModal) {
    serverUnavailableModal.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (closeButton) {
    closeButton.addEventListener("click", hideServerUnavailableModal);
  }

  if (okButton) {
    okButton.addEventListener("click", hideServerUnavailableModal);
  }

  // Example of a simple server health check (requires a backend endpoint)
  // This is a placeholder and would need a real API endpoint.
  async function checkServerHealth() {
    try {
      const response = await fetch("/api/health-check"); // Replace with your actual health check endpoint
      if (!response.ok) {
        throw new Error("Server not responding");
      }
      console.log("Server is healthy.");
      hideServerUnavailableModal();
    } catch (error) {
      console.error("Server health check failed:", error);
      showServerUnavailableModal();
    }
  }

  // You might want to call checkServerHealth periodically or on specific events
  // checkServerHealth(); // Call on page load
  // setInterval(checkServerHealth, 60000); // Check every minute
});
