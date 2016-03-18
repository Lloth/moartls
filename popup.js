"use strict";

document.addEventListener('DOMContentLoaded', function() {

    {
        let lnkVersion = document.getElementById("lblVersion");
        lnkVersion.textContent = "v"+chrome.runtime.getManifest().version;
        lnkVersion.addEventListener("click", function() { chrome.runtime.openOptionsPage(); }, false);
    }

    {
        let lnkUnmark = document.getElementById("lnkUnmark");
        lnkUnmark.addEventListener("click", function() { 
            lnkUnmark.textContent = "";
            chrome.tabs.executeScript(null, {code:"{let u = document.querySelectorAll('.moarTLSUnsecure');for (let i = 0; i < u.length; i++) u[i].classList.remove('moarTLSUnsecure');}", allFrames: true, runAt:"document_idle"}, null);
        }, false);
    }

    chrome.tabs.query({active: true, currentWindow: true }, function(activeTabs) {
        if (activeTabs.length < 1) return; // impossible?

        let oUri = document.createElement("a");
        oUri.href = activeTabs[0].url;
        let sOrigin = "https://" + oUri.host +"/";

        let sProt = oUri.protocol.toLowerCase();

        if ((sProt === "http:") || (sProt === "ftp:"))
        {
            document.getElementById("lnkUnmark").style.display="inline";
        }

        if (sProt.indexOf("chrome") == 0)
        {
            document.getElementById("txtStatus").textContent = "Unfortunately, Chrome's internal pages cannot be analyzed.";
            return;
        }

        // http://stackoverflow.com/questions/11613371/chrome-extension-content-script-on-https-chrome-google-com-webstore
        if (oUri.href.toLowerCase().indexOf("https://chrome.google.com/webstore/") == 0)
        {
            document.getElementById("txtStatus").textContent = "Unfortunately, Chrome's Web Store pages cannot be analyzed.";
            return;
        }

        let lnkDomain = document.getElementById("lnkDomain");
        lnkDomain.href = "https://dev.ssllabs.com/ssltest/analyze.html?d=" + escape(oUri.hostname);
        lnkDomain.innerText = (((sProt == "http:") || (sProt =="ftp:")) ? (sProt.slice(0,-1)+"/") : "") + oUri.hostname;

        {
            document.getElementById("txtStatus").textContent = "Analyzing top-level page";

            // Mark top-level Page
            if (sProt == "https:")
            {
                document.getElementById("lnkDomain").classList.add("pageIsHTTPS");
            }

            // If HTTP/HTTPS, use XHR to check for HSTS
            if ((sProt == "http:") || (sProt == "https:"))
            {
                let oReq = new XMLHttpRequest();
                oReq.addEventListener("load",  function() { 
                    let sHSTS = oReq.getResponseHeader("Strict-Transport-Security"); 
                    let bHSTS = (sHSTS && sHSTS.includes("max-age=") && !sHSTS.includes("max-age=0"));
                    let l = document.getElementById("lnkDomain");
                    if (sProt != "https:") { l.classList.add("pageCanUpgrade"); }
                    if (bHSTS) { l.classList.add("pageIsHSTS");  l.classList.remove("pageIsHTTPS"); }

                    let arrLI = htLinks[sOrigin];
                    markLIs(arrLI, true, bHSTS);
                }, false);
                let fnErr = function() {
                    document.getElementById("lnkDomain").classList.add("pageCannotUpgrade");
                    let arrLI = htLinks[sOrigin];
                    markLIs(arrLI, false, false);
                };
                oReq.addEventListener("error", fnErr, false);
                oReq.addEventListener("timeout", fnErr, false);
                oReq.open("HEAD", sOrigin, true);
                oReq.setRequestHeader("Cache-Control", "no-cache");
                oReq.timeout = 5000;
                oReq.send();
            }
        }

        document.getElementById("txtStatus").textContent = "Analyzing page elements";

        chrome.tabs.insertCSS(null, {file:"injected.css", allFrames: true, runAt:"document_idle"}, function() {
            // If you try to inject into an extensions page or the webstore/NTP you'll get an error
            if (chrome.runtime.lastError) {
                // TODO: Log error in popup
                console.log('moarTLS error injecting css : \n' + chrome.runtime.lastError.message);
            }
        });

        chrome.tabs.executeScript(null, {file:"injected.js", allFrames: true, runAt:"document_idle"}, function() {
            // If you try to inject into an extensions page or the webstore/NTP you'll get an error
            if (chrome.runtime.lastError) {
                // TODO: Log error in popup
                console.log('moarTLS error injecting script : \n' + chrome.runtime.lastError.message);
            }
        });

    });
}, false);

function computeDisplayString(cInsecure, cTotal)
{
    if (cTotal < 1) return "This page does not contain any links.";
    if (cInsecure < 1) {
        if (cTotal == 1) return "The only link on this page is secure.";
        if (cTotal == 2) return "Both links on this page are secure.";
        return "All " + cTotal + " links on this page are secure.";
    }
    if (cInsecure == cTotal) {
        if (cTotal == 1) return "The only link on this page is non-secure.";
        if (cTotal == 2) return "Both links on this page are non-secure.";
        return "All " + cTotal + " links on this page are non-secure.";
    }
    return (cInsecure + " of " + cTotal + " links " + ((cInsecure == 1) ? "is" : "are") + " non-secure.");
}

function markLIs(arrLI, bHTTPS, bHSTS)
{
    // No links yet
    if (!arrLI) { return; }
    for (let i=0; i < arrLI.length; i++)
    {
        if (arrLI[i].textContent.substring(0, 11) == "[Checking] ") {
            arrLI[i].textContent = arrLI[i].textContent.substring(11);
        }
    
        if (bHTTPS) {
            arrLI[i].classList.add("isHTTPSyes");
            if (bHSTS) arrLI[i].classList.add("isHSTS");
            arrLI[i].title = "This URL is available via HTTPS" + ((bHSTS) ? " + HSTS!" : ".");
        }
        else {
            arrLI[i].classList.add("isHTTPSno");
            arrLI[i].title = "This URL is NOT available by simply changing the protocol to HTTPS."; 
        }
    }
}

// TODO: Switch to FETCH and handle cases of redirections
function checkForHTTPS(lnk)
{
    if ((lnk.title.substring(0,11) == "This URL is") || 
        (lnk.title.substring(0,11) == "[Checking] ")) return;

    let oUri = document.createElement("a");
    oUri.href = lnk.textContent;
    // Wipe path entirely to prevent cases where e.g. a HEAD example.com/buy 
    // isn't idempotent    // if (oUri.pathname.includes("logout"))
    // TODO if we ever remove this: ensure proper Path encoding when calling oReq.open
    let sOrigin = "https://" + oUri.host +"/";

    let arrLI = htLinks[sOrigin];
    for (let i=0; i < arrLI.length; i++)
    {
        arrLI[i].textContent = "[Checking] " + arrLI[i].textContent;
        arrLI[i].title = "[Checking] Using XmlHttpRequest to check for a HTTPS version of this url...";
    }

    let oReq = new XMLHttpRequest();
    oReq.addEventListener("load",  function() { 
        let sHSTS = oReq.getResponseHeader("Strict-Transport-Security"); 
        let bHSTS = (sHSTS && sHSTS.includes("max-age=") && !sHSTS.includes("max-age=0"));

        markLIs(arrLI, true, bHSTS);
    }, false);

    let fnErr = function() { markLIs(arrLI, false, false); };

    oReq.addEventListener("error", fnErr, false);
    oReq.addEventListener("timeout", fnErr, false);

    oReq.open("HEAD", sOrigin, true);
    oReq.setRequestHeader("Cache-Control", "no-cache");
    oReq.timeout = 5000;
    oReq.send();
}

// Total number of elements evaluated in the page
var cTotalLinks = 0;
// Total number of non-secure elements in the page
var cTotalUnsecure = 0;
// Hashtable mapping Origin->ListItem[]
var htLinks = {};

chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {

    cTotalLinks += request.cLinks;
    cTotalUnsecure += (request.unsecure) ? request.unsecure.length : 0;

    let bAnyInsecure = (cTotalUnsecure > 0);

    document.getElementById("txtStatus").innerText = computeDisplayString(cTotalUnsecure, cTotalLinks);
    if (bAnyInsecure) {
        document.body.style.backgroundColor = "#FFFF40";
        document.getElementById("lnkUnmark").style.display="inline";
        document.getElementById("lnkTips").style.display="inline";
    }
    else
    {
        if (document.getElementById("lnkDomain").classList.contains("pageIsHTTPS"))
        {
            document.body.style.backgroundColor = "#68FF68";
        }
    }

    let listUnsecure = document.getElementById("olUnsecureList");
    if (!listUnsecure)
    {
        listUnsecure = document.createElement("ol");
        listUnsecure.id = "olUnsecureList";
        document.getElementById("divUnsecureList").appendChild(listUnsecure);
    }

    for (let i=0; i < request.unsecure.length; i++) {
        let listItem = document.createElement("li");
        let text = document.createTextNode(request.unsecure[i]);
        listItem.appendChild(text);

        let oUri = document.createElement("a");
        oUri.href = request.unsecure[i];
        let sOrigin = "https://" + oUri.host +"/";
        if (undefined === htLinks[sOrigin])
        {
            htLinks[sOrigin] = [];
        }
        htLinks[sOrigin].push(listItem);

        listItem.addEventListener('click', function(e) { 

            if ((e.altKey || e.ctrlKey) || (1 == e.button))
            {
                document.getElementById("lnkTips").style.display = "none";
                checkForHTTPS(this);
                return;
            }

        }, false);
        listUnsecure.appendChild(listItem);
    }
});

window.addEventListener('click', function(e) {
    if ((e.target.nodeName == "A") && (e.target.href !== undefined)) {
        chrome.tabs.create({ url: e.target.href });
    }
})