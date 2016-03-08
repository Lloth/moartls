// Background
// https://developer.chrome.com/extensions/event_pages

chrome.downloads.onCreated.addListener(function(item) {
    // https://developer.chrome.com/extensions/downloads#type-DownloadItem
    // https://src.chromium.org/viewvc/chrome/trunk/src/chrome/common/extensions/docs/examples/api/downloads/download_manager/background.js

    // Note: The download manager "creates" downloads for previously-downloaded items
    // So we actually need a different thing
    if (item.state == "in_progress") {
        chrome.storage.sync.get("bWarnOnNonSecureDownloads", function(obj) {
            if (!(obj && (true === obj.bWarnOnNonSecureDownloads))) return;
            if (item.url.substring(0, 5) == "http:")
            {
                alert("Non-secure download of: \n\n  " + item.url + "\n  " + item.referrer);
            }
        });
    }
});