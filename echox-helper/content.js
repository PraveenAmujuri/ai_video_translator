// Listen for messages from the web application window frame
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data.type === "EXTRACT_YOUTUBE") {
    const { videoId } = event.data;
    console.log(`EchoX Content Script intercepting request for Video ID: ${videoId}`);

    // Forward the message cleanly down the internal runtime pipeline to background.js
    chrome.runtime.sendMessage({ type: "FETCH_YOUTUBE_PAGE", videoId }, (response) => {
      if (response && response.success && response.url) {
        // Post the clean tracking URL back up to your React listener
        window.postMessage({
          type: "YOUTUBE_EXTRACT_SUCCESS",
          url: response.url
        }, "*");
      } else {
        window.postMessage({
          type: "YOUTUBE_EXTRACT_FAILED",
          error: response ? response.error : "Unknown connection failure"
        }, "*");
      }
    });
  }
});