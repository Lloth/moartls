"use strict";

if (typeof chrome.runtime === "undefined") chrome = browser;

document.addEventListener('DOMContentLoaded', function() {
    {

    }

    chrome.tabs.query({active: true, currentWindow: true }, function(activeTabs) {
        if (activeTabs.length < 1) return; // impossible?

        const oUri = document.createElement("a");
        oUri.href = activeTabs[0].url;
        const sOrigin = "https://" + oUri.host +"/";

        const sProt = oUri.protocol.toLowerCase();

        if (sProt.indexOf("chrome") == 0) {
            if (oUri.host === "newtab") {
                // injecting into newtab is permitted
                document.getElementById("lnkDomain").style.display = "none";
            }
            else {
                // otherwise, bail out.
                document.getElementById("txtStatus").textContent = "Unfortunately, Chrome's internal pages cannot be analyzed.";
                return;
            }
        }

        // http://stackoverflow.com/questions/11613371/chrome-extension-content-script-on-https-chrome-google-com-webstore
        if (oUri.href.toLowerCase().indexOf("https://chrome.google.com/webstore/") == 0)
        {
            document.getElementById("txtStatus").textContent = "Unfortunately, Chrome's Web Store pages cannot be analyzed.";
            // Bail out.
            return;
        }
	
        document.getElementById("txtStatus").textContent = "Analyzing page elements";

        chrome.tabs.insertCSS(null, {file:"injected.css", allFrames: true, runAt:"document_idle"}, function() {
            // If you try to inject into an extensions page or the webstore/NTP you'll get an error
            if (chrome.runtime.lastError) {
                console.log('moarTLS error injecting css : \n' + chrome.runtime.lastError.message);
                chrome.runtime.sendMessage(null, {"error": chrome.runtime.lastError.message, "context": "insertCSS"});
            }
        });

        chrome.tabs.executeScript(null, {file:"injected.js", allFrames: true, runAt:"document_idle"}, function() {
            // If you try to inject into an extensions page or the webstore/NTP you'll get an error
            if (chrome.runtime.lastError) {
                console.log('moarTLS error injecting script : \n' + chrome.runtime.lastError.message);
                chrome.runtime.sendMessage(null, {"error": chrome.runtime.lastError.message, "context": "executeScript"});
            }
        });

    });
}, false);


// Total number of non-secure elements in the page
var cTotalUnsecure = 0;
// Hashtable mapping Origin->ListItem[]
var htLinks = {};

chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {

    if (request.error)
    {
        let divError = document.createElement("div");
        divError.className = "scanErrorMessage";
        divError.textContent = "Error in " + request.context + ": " + request.error;
        document.body.appendChild(divError);
        return;
    }

    cTotalUnsecure += (request.unsecure) ? request.unsecure.length : 0;

    const bAnyInsecure = (cTotalUnsecure > 0);

 
    if (bAnyInsecure) {  // If any link is insecure
        document.body.style.backgroundColor = "#FFFF40";  // Yellow

    }
    else
    {
        if (document.getElementById("lnkDomain").classList.contains("pageIsHTTPS"))
        {
            document.body.style.backgroundColor = "#68FF68";  // Green
        }
    }

});

window.addEventListener('click', function(e) {
    if ((e.target.nodeName == "A") && (e.target.href !== undefined)) {
        chrome.tabs.create({ url: e.target.href });
    }
});