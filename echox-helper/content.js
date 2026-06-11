// Intercept extraction triggers from EchoX React framework window layer
window.addEventListener("message", (event) => {
  if (event.source !== window || event.data.type !== "EXTRACT_YOUTUBE") return;

  const { videoId } = event.data;
  console.log("EchoX Content Script passing extraction sequence to Background Worker for Video ID:", videoId);

  // Safely communicate across the internal pipeline to execute an unrestricted fetch
  chrome.runtime.sendMessage({ type: "FETCH_YOUTUBE_PAGE", videoId }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Communication with background worker broken:", chrome.runtime.lastError);
      window.postMessage({ type: "YOUTUBE_EXTRACT_FAILED", error: "Worker offline" }, "*");
      return;
    }

    if (response && response.success) {
      window.postMessage({ type: "YOUTUBE_EXTRACT_SUCCESS", url: response.url }, "*");
    } else {
      window.postMessage({ type: "YOUTUBE_EXTRACT_FAILED", error: response?.error || "Extraction empty" }, "*");
    }
  });
});