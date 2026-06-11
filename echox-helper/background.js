chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "FETCH_YOUTUBE_PAGE") return false;

  const { videoId } = message;

  // Execute unrestricted background network fetch using host permissions
  fetch(`https://www.youtube.com/watch?v=${videoId}&bpctr=9999999999&has_verified=1`)
    .then(res => {
      if (!res.ok) throw new Error("Target player handshake connection exception.");
      return res.text();
    })
    .then(htmlContent => {
      const jsonRegex = /ytInitialPlayerResponse\s*=\s*({.+?});/;
      const configJsonMatch = htmlContent.match(jsonRegex);
      
      let directStreamUrl = "";

      if (configJsonMatch) {
        const playerResponse = JSON.parse(configJsonMatch[1]);
        const streamingData = playerResponse.streamingData || {};
        const adaptiveFormats = streamingData.adaptiveFormats || [];

        // Loop over and capture the highest fidelity pure audio stream container (m4a tracks)
        for (const format of adaptiveFormats) {
          if (format.mimeType && format.mimeType.startsWith("audio/") && format.url) {
            directStreamUrl = format.url;
            break;
          }
        }
      }

      sendResponse({ success: true, url: directStreamUrl });
    })
    .catch(error => {
      console.error("Background fetch pipeline error:", error);
      sendResponse({ success: false, error: error.message });
    });

  return true; // Keeps the sendResponse data channel channel open asynchronously
});