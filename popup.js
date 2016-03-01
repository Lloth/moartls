document.addEventListener('DOMContentLoaded', function() {

    chrome.tabs.query({active: true, currentWindow: true /**/ }, function(activeTabs) {
        if (activeTabs.length < 1) return; // impossible?
        /*for (var i=0; i<activeTabs.length; i++)    	{
      		alert("Tab:\n" + JSON.stringify(activeTabs[i]) + activeTabs[i].url + activeTabs[i].title);
      	// https://developer.chrome.com/extensions/tabs#type-Tab
      	// https://chrome.google.com/webstore/detail/chrome-dev-editor-develop/pnoffddplpippgcfjdhbmhkofpnaalpg?hl=en-US
      	// https://developer.chrome.com/extension
      	s/activeTab
      	}*/

        var oUri = document.createElement("a");
        oUri.href = activeTabs[0].url;

        var sProt = oUri.protocol.toLowerCase();

        if (sProt == "chrome:")
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

        var lnkDomain = document.getElementById("lnkDomain");
        lnkDomain.href = "https://www.ssllabs.com/ssltest/analyze.html?d=" + escape(oUri.hostname);
        lnkDomain.innerText = (((sProt == "http:") || (sProt =="ftp:")) ? (sProt.slice(0,-1)+"/") : "") + oUri.hostname;

        // https://developer.chrome.com/extensions/tabs#method-executeScript
        // https://developer.chrome.com/extensions/content_scripts#pi
        chrome.tabs.executeScript(null, {file:"injected.js", allFrames: true, runAt:"document_idle"}, function() {
        // If you try and inject into an extensions page or the webstore/NTP you'll get an error
        if (chrome.runtime.lastError) {
            // TODO: Log error in popup
            console.log('moarTLS error injecting script : \n' + chrome.runtime.lastError.message);
        }
  });

    /*
      d = document;      var f = d.createElement('form');      f.action = 'http://gtmetrix.com/analyze.html?bm';      f.method = 'post';
      var i = d.createElement('input');      i.type = 'hidden'; i.name = 'url';      i.value = tab.url;      f.appendChild(i);      d.body.appendChild(f);
      f.submit(); */
    });
  }, false);
// var checkPageButton = document.getElementById('checkPage'); //checkPageButton.addEventListener('click', function() {}, false);

var slUnsecure = [];
var cTotalLinks = 0;

function computeDisplayString(cTotal, cInsecure)
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

chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {
    cTotalLinks += request.cLinks;
    slUnsecure = slUnsecure.concat(request.unsecure);

    var bAnyInsecure = (slUnsecure.length > 0);

    document.getElementById("txtStatus").innerText = computeDisplayString(cTotalLinks, slUnsecure.length);

    document.body.style.backgroundColor= (bAnyInsecure) ? "#FEE696" : "#68FF68";


    document.getElementById("txtUnsecureList").innerHTML = (!bAnyInsecure) ? "": //"&#x1f604;" :
     "<ol><li>" + slUnsecure.join("<li>") + "</ol>";   // TODO: GAPING SECURITY BUG
    /*alert(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");*/
   /* if (request.greeting == "hello") sendResponse({farewell: "goodbye"});*/
  });

window.addEventListener('click', function(e) {
  if ((e.target.nodeName == "A") && 
      (e.target.href !== undefined)) {
        chrome.tabs.create({
            url: e.target.href
        })
    }
})