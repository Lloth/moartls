// Entire frame is insecure?
var sProt = document.location.protocol.toLowerCase();
if ((sProt === "http:") || (sProt === "ftp:")) 
{
    document.body.style.backgroundColor="#E04343";
}

chrome.storage.sync.get("bRotateNonSecureImages", function(obj) {
    if (obj && (false === obj.bRotateNonSecureImages)) return;
    var imgs = document.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++)
    {
        if (imgs[i].src.substring(0,5) === "http:") {
            imgs[i].style.transform="rotate(180deg)";
        }
    }
});

var lnks = document.querySelectorAll("a[href]");
var arrUnsecure = [];
var cLinks = 0;
for (var i = 0; i < lnks.length; i++) {
  var thisLink = lnks[i];
  if (thisLink.getAttribute("href")[0] === "#") continue; // Not a cross-page 'link'
  cLinks++;
  var sProtocol = thisLink.protocol.toLowerCase();
  if ((sProtocol == "http:") || (sProtocol == "ftp:")) {
    arrUnsecure.push(thisLink.href);
    thisLink.style.backgroundColor = "rgba(222, 106, 106, 0.6)";
    thisLink.style.borderRadius = "4px";
    thisLink.style.border = "2px groove red";
    thisLink.style.padding = "6px 6px 6px 6px";
    thisLink.style.margin = "3px 3px 3px 3px";
    thisLink.title = lnks[i].protocol + "//" + lnks[i].hostname;
  }
}

//https://developer.chrome.com/extensions/messaging
chrome.runtime.sendMessage({cLinks: cLinks, unsecure: arrUnsecure }, null);
