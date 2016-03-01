// Background
// https://developer.chrome.com/extensions/event_pages

chrome.downloads.onCreated.addListener(function(item) {
    // https://developer.chrome.com/extensions/downloads#type-DownloadItem
    // https://src.chromium.org/viewvc/chrome/trunk/src/chrome/common/extensions/docs/examples/api/downloads/download_manager/background.js
    
    // Note: The download manager "creates" downloads for previously-downloaded items
    // So we actually need a different thing
    if (item.state == "in_progress") {
        if (item.url.substring(0, 5) == "http:")
        {
            alert("_WARNING_\nNon-secure download of: \n" + item.url);
        }
    }
});