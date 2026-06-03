// dark mode
(function () {
  var t = localStorage.getItem("kutt-theme");
  if (t === "dark") document.documentElement.setAttribute("data-theme", "dark");
  var moon = document.querySelector(".dark-icon-moon");
  var sun = document.querySelector(".dark-icon-sun");
  if (t === "dark" && moon && sun) { moon.classList.add("hidden"); sun.classList.remove("hidden"); }
})();

function toggleDarkMode() {
  var root = document.documentElement;
  var isDark = root.getAttribute("data-theme") === "dark";
  var next = isDark ? "light" : "dark";
  root.setAttribute("data-theme", next);
  localStorage.setItem("kutt-theme", next);
  var moon = document.querySelector(".dark-icon-moon");
  var sun = document.querySelector(".dark-icon-sun");
  if (moon && sun) {
    moon.classList.toggle("hidden", next === "dark");
    sun.classList.toggle("hidden", next === "light");
  }
}

// log htmx on dev
// htmx.logAll();

// add text/html accept header to receive html instead of json for the requests
document.body.addEventListener("htmx:configRequest", function(evt) {
  evt.detail.headers["Accept"] = "text/html,*/*";

  // merge UTM params into target URL on shortener form submit
  if (evt.detail.elt && evt.detail.elt.id === "shortener-form") {
    var utmInputs = document.querySelectorAll("[data-utm]");
    var hasUtm = Array.from(utmInputs).some(function(i) { return i.value.trim(); });
    if (hasUtm && evt.detail.parameters.target) {
      try {
        var raw = evt.detail.parameters.target.trim();
        var base = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
        var url = new URL(base);
        utmInputs.forEach(function(input) {
          if (input.value.trim()) url.searchParams.set(input.dataset.utm, input.value.trim());
        });
        evt.detail.parameters.target = url.toString();
      } catch(e) {}
    }
  }
});

// ── UTM BUILDER ──────────────────────────────────────────────────────────────

var _utmLoaded = false;
var _utmData = { presets: [], campaign_history: [] };

var UTM_CONTENT_SUGGESTIONS = {
  instagram: ["bio", "feed-post", "stories-swipe", "reels", "link-sticker"],
  stories:   ["stories-swipe", "link-sticker", "mention"],
  reels:     ["reels", "description"],
  youtube:   ["descricao", "pinned-comment", "end-card"],
  email:     ["header", "botao-cta", "link-texto", "footer"],
  google:    ["search-ad", "display-banner"],
  whatsapp:  ["mensagem-direta", "grupo", "status"],
};

function loadUtmData() {
  if (_utmLoaded) return;
  _utmLoaded = true;
  fetch("/api/v2/utm-presets", { credentials: "include" })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _utmData = data;
      renderUtmPresets(data.presets);
    })
    .catch(function() {});
}

function renderUtmPresets(presets) {
  var container = document.getElementById("utm-presets-list");
  if (!container) return;
  if (!presets || !presets.length) {
    container.innerHTML = "<span class='utm-hint'>No saved presets. <a href='/settings#utm-presets' target='_blank'>Create one</a>.</span>";
    return;
  }
  container.innerHTML = presets.map(function(p) {
    return "<button type='button' class='utm-channel-btn' onclick='applyPreset(" + JSON.stringify(p).replace(/'/g,"&#39;") + ")'>" + p.name + "</button>";
  }).join("");
}

function applyPreset(preset) {
  var fields = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"];
  fields.forEach(function(f) {
    var el = document.getElementById(f);
    if (el) el.value = preset[f] || "";
  });
  // select matching channel button
  var source = preset.utm_source || "";
  var medium = preset.utm_medium || "";
  document.querySelectorAll(".utm-channel-btn[data-source]").forEach(function(btn) {
    btn.classList.toggle("active", btn.dataset.source === source && btn.dataset.medium === medium);
  });
  renderContentSuggestions(source);
  updateUtmPreview();
}

function selectUtmChannel(btn) {
  document.querySelectorAll(".utm-channel-btn[data-source]").forEach(function(b) { b.classList.remove("active"); });
  btn.classList.add("active");
  var source = btn.dataset.source;
  var medium = btn.dataset.medium;
  var row = document.getElementById("utm-source-medium-row");
  var srcEl = document.getElementById("utm_source");
  var medEl = document.getElementById("utm_medium");
  if (source === "" && medium === "") {
    row.classList.remove("hidden");
    if (srcEl) srcEl.value = "";
    if (medEl) medEl.value = "";
  } else {
    row.classList.add("hidden");
    if (srcEl) srcEl.value = source;
    if (medEl) medEl.value = medium;
  }
  // show term block for Google CPC
  var termBlock = document.getElementById("utm-term-block");
  if (termBlock) termBlock.classList.toggle("hidden", !(source === "google" && medium === "cpc"));
  renderContentSuggestions(source);
  updateUtmPreview();
}

function renderContentSuggestions(source) {
  var container = document.getElementById("utm-content-suggestions");
  if (!container) return;
  var suggestions = UTM_CONTENT_SUGGESTIONS[source] || [];
  if (!suggestions.length) { container.innerHTML = ""; return; }
  var current = (document.getElementById("utm_content") || {}).value || "";
  container.innerHTML = suggestions.map(function(s) {
    return "<button type='button' class='utm-channel-btn utm-content-chip" + (current === s ? " active" : "") + "' onclick='selectContentChip(this,\"" + s + "\")'>" + s + "</button>";
  }).join("");
}

function selectContentChip(btn, value) {
  document.querySelectorAll(".utm-content-chip").forEach(function(b) { b.classList.remove("active"); });
  btn.classList.add("active");
  var el = document.getElementById("utm_content");
  if (el) { el.value = value; updateUtmPreview(); }
}

function filterCampaignHistory(val) {
  var history = document.getElementById("utm-campaign-history");
  if (!history) return;
  var items = (_utmData.campaign_history || []).filter(function(c) {
    return !val || c.toLowerCase().includes(val.toLowerCase());
  });
  if (!items.length) { history.classList.add("hidden"); return; }
  history.innerHTML = items.map(function(c) {
    return "<div class='utm-campaign-item' onclick='selectCampaign(\"" + c.replace(/"/g,"&quot;") + "\")'>" + c + "</div>";
  }).join("");
  history.classList.remove("hidden");
}

function selectCampaign(value) {
  var el = document.getElementById("utm_campaign");
  if (el) { el.value = value; updateUtmPreview(); }
  var history = document.getElementById("utm-campaign-history");
  if (history) history.classList.add("hidden");
}

function buildUtmUrl() {
  var targetInput = document.getElementById("target");
  if (!targetInput) return "";
  var raw = targetInput.value.trim();
  if (!raw) return "";
  var utmInputs = document.querySelectorAll("[data-utm]");
  var hasUtm = Array.from(utmInputs).some(function(i) { return i.value.trim(); });
  if (!hasUtm) return "";
  try {
    var base = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
    var url = new URL(base);
    utmInputs.forEach(function(input) {
      if (input.value.trim()) url.searchParams.set(input.dataset.utm, input.value.trim());
    });
    return url.toString();
  } catch(e) { return ""; }
}

function updateUtmPreview() {
  var preview = document.getElementById("utm-preview");
  var previewUrl = document.getElementById("utm-preview-url");
  if (!preview || !previewUrl) return;
  var url = buildUtmUrl();
  if (!url) { preview.classList.add("hidden"); return; }
  preview.classList.remove("hidden");
  previewUrl.textContent = url;
}

function clearUtmFields() {
  document.querySelectorAll("[data-utm]").forEach(function(i) { i.value = ""; });
  document.querySelectorAll(".utm-channel-btn").forEach(function(b) { b.classList.remove("active"); });
  var row = document.getElementById("utm-source-medium-row");
  if (row) row.classList.add("hidden");
  var termBlock = document.getElementById("utm-term-block");
  if (termBlock) termBlock.classList.add("hidden");
  var contentSugg = document.getElementById("utm-content-suggestions");
  if (contentSugg) contentSugg.innerHTML = "";
  updateUtmPreview();
}

// save campaign to history on shortener form submit
document.addEventListener("htmx:afterRequest", function(evt) {
  if (!evt.detail.elt || evt.detail.elt.id !== "shortener-form") return;
  if (evt.detail.xhr && evt.detail.xhr.status >= 400) return;
  var campaign = (document.getElementById("utm_campaign") || {}).value;
  if (campaign && campaign.trim()) {
    fetch("/api/v2/utm-presets/campaigns", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign: campaign.trim() })
    }).catch(function() {});
  }
});

// update preview when target URL changes
document.addEventListener("input", function(evt) {
  if (evt.target && evt.target.id === "target") updateUtmPreview();
});

// close campaign history on outside click
document.addEventListener("click", function(evt) {
  var history = document.getElementById("utm-campaign-history");
  if (history && !history.contains(evt.target) && evt.target.id !== "utm_campaign") {
    history.classList.add("hidden");
  }
});

// redirect to homepage
document.body.addEventListener("redirectToHomepage", function() {
  setTimeout(() => {
    window.location.replace("/");
  }, 1500);
});

// reset form if event is sent from the backend
function resetForm(id) {
  return function() {
    const form = document.getElementById(id);
    if (!form) return;
    form.reset();
  }
}
document.body.addEventListener("resetChangePasswordForm", resetForm("change-password"));
document.body.addEventListener("resetChangeEmailForm", resetForm("change-email"));

// an htmx extension to use the specifed params in the path instead of the query or body
htmx.defineExtension("path-params", {
  onEvent: function(name, evt) {
    if (name === "htmx:configRequest") {
      evt.detail.path = evt.detail.path.replace(/{([^}]+)}/g, function(_, param) {
        var val = evt.detail.parameters[param]
        delete evt.detail.parameters[param]
        return val === undefined ? "{" + param + "}" : encodeURIComponent(val)
      })
    }
  }
})

// find closest element
function closest(selector, elm) {
  let element = elm || this;

  while (element && element.nodeType === 1) {
    if (element.matches(selector)) {
      return element;
    }

    element = element.parentNode;
  }

  return null;
};

// get url query param
function getQueryParams() {
  const search = window.location.search.replace("?", "");
  const query = {};
  search.split("&").map(q => {
    const keyvalue = q.split("=");
    query[keyvalue[0]] = keyvalue[1];
  });
  return query;
}

// trim text
function trimText(selector, length) {
  const element = document.querySelector(selector);
  if (!element) return;
  let text = element.textContent;
  if (typeof text !== "string") return;
  text = text.trim();
  if (text.length > length) {
    element.textContent = text.split("").slice(0, length).join("") + "...";
  }
}

function formatDateHour(selector) {
  const element = document.querySelector(selector);
  if (!element) return;
  const dateString = element.dataset.date;
  if (!dateString) return;
  const date = new Date(dateString);
  element.textContent = date.getHours() + ":" + date.getMinutes();
}

// show QR code
function handleQRCode(element, id) {
  const dialog = document.getElementById(id);
  const dialogContent = dialog.querySelector(".content-wrapper");
  if (!dialogContent) return;
  openDialog(id, "qrcode");
  dialogContent.textContent = "";
  const qrcode = new QRCode(dialogContent, {
    text: element.dataset.url,
    width: 200,
    height: 200,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
  });   
}

// copy the link to clipboard
function handleCopyLink(element) {
  navigator.clipboard.writeText(element.dataset.url);
}

// copy the link and toggle copy button style
function handleShortURLCopyLink(element) {
  handleCopyLink(element);
  const clipboard = element.parentNode.querySelector(".clipboard") || closest(".clipboard", element);
  if (!clipboard || clipboard.classList.contains("copied")) return;
  clipboard.classList.add("copied");
  setTimeout(function() {
    clipboard.classList.remove("copied");
  }, 1000);
}

// open and close dialog
function openDialog(id, name) {
  const dialog = document.getElementById(id);
  if (!dialog) return;
  dialog.classList.add("open");
  if (name) {
    dialog.classList.add(name);
  }
}

function closeDialog() {
  const dialog = document.querySelector(".dialog");
  if (!dialog) return;
  while (dialog.classList.length > 0) {
    dialog.classList.remove(dialog.classList[0]);
  }
  dialog.classList.add("dialog");
}

window.addEventListener("click", function(event) {
  const dialog = document.querySelector(".dialog");
  if (dialog && event.target === dialog) {
    closeDialog();
  }
});

// handle navigation in the table of links
function setLinksLimit(event) {
  const buttons = Array.from(document.querySelectorAll("table .nav .limit button"));
  const limitInput = document.querySelector("#limit");
  if (!limitInput || !buttons || !buttons.length) return;
  limitInput.value = event.target.textContent;
  buttons.forEach(b => {
    b.disabled = b.textContent === event.target.textContent;
  });
}

function setLinksSkip(event, action) {
  const buttons = Array.from(document.querySelectorAll("table .nav .pagination button"));
  const limitElm = document.querySelector("#limit");
  const totalElm = document.querySelector("#total");
  const skipElm = document.querySelector("#skip");
  if (!buttons || !limitElm || !totalElm || !skipElm) return;
  const skip = parseInt(skipElm.value);
  const limit = parseInt(limitElm.value);
  const total = parseInt(totalElm.value);
  skipElm.value = action === "next" ? skip + limit : Math.max(skip - limit, 0);
  document.querySelectorAll(".pagination .next").forEach(elm => {
    elm.disabled = total <= parseInt(skipElm.value) + limit;
  });
  document.querySelectorAll(".pagination .prev").forEach(elm => {
    elm.disabled = parseInt(skipElm.value) <= 0;
  });
}

function updateLinksNav() {
  const totalElm = document.querySelector("#total");
  const skipElm = document.querySelector("#skip");
  const limitElm = document.querySelector("#limit");
  if (!totalElm || !skipElm || !limitElm) return;
  const total = parseInt(totalElm.value);
  const skip = parseInt(skipElm.value);
  const limit = parseInt(limitElm.value);
  document.querySelectorAll(".pagination .next").forEach(elm => {
    elm.disabled = total <= skip + limit;
  });
  document.querySelectorAll(".pagination .prev").forEach(elm => {
    elm.disabled = skip <= 0;
  });
}

function resetTableNav() {
  const totalElm = document.querySelector("#total");
  const skipElm = document.querySelector("#skip");
  const limitElm = document.querySelector("#limit");
  if (!totalElm || !skipElm || !limitElm) return;
  skipElm.value = 0;
  limitElm.value = 10;
  const total = parseInt(totalElm.value);
  const skip = parseInt(skipElm.value);
  const limit = parseInt(limitElm.value);
  document.querySelectorAll(".pagination .next").forEach(elm => {
    elm.disabled = total <= skip + limit;
  });
  document.querySelectorAll(".pagination .prev").forEach(elm => {
    elm.disabled = skip <= 0;
  });
  document.querySelectorAll("table .nav .limit button").forEach(b => {
    b.disabled = b.textContent === limit.toString();
  });
}

// tab click
function setTab(event, targetId) {
  const tabs = Array.from(closest("nav", event.target).children);
  tabs.forEach(function (tab) {
    tab.classList.remove("active");
  });
  if (targetId) {
    document.getElementById(targetId).classList.add("active");
  } else {
    event.target.classList.add("active");
  }
}

// show clear search button
function onSearchChange(event) {
  const clearButton = event.target.parentElement.querySelector("button.clear");
  if (!clearButton) return;
  clearButton.style.display = event.target.value.length > 0 ? "block" : "none";
}

function clearSeachInput(event) {
  event.preventDefault();
  const button = closest("button", event.target);
  const input = button.parentElement.querySelector("input");
  if (!input) return;
  input.value = "";
  button.style.display = "none";
  htmx.trigger("body", "reloadMainTable");
}

// detect if search inputs have value on load to show clear button
function onSearchInputLoad() {
  const linkSearchInput = document.getElementById("search");
  if (!linkSearchInput) return;
  const linkClearButton = linkSearchInput.parentElement.querySelector("button.clear")
  linkClearButton.style.display = linkSearchInput.value.length > 0 ? "block" : "none";

  const userSearchInput = document.getElementById("search_user");
  if (!userSearchInput) return;
  const userClearButton = userSearchInput.parentElement.querySelector("button.clear")
  userClearButton.style.display = userSearchInput.value.length > 0 ? "block" : "none";

  const domainSearchInput = document.getElementById("search_domain");
  if (!domainSearchInput) return;
  const domainClearButton = domainSearchInput.parentElement.querySelector("button.clear")
  domainClearButton.style.display = domainSearchInput.value.length > 0 ? "block" : "none";
}

onSearchInputLoad();

// create user checkbox control
function canSendVerificationEmail() {
  const canSendVerificationEmail = !document.getElementById("create-user-verified").checked && !document.getElementById("create-user-banned").checked;
  const checkbox = document.getElementById("send-email-label");
  if (canSendVerificationEmail)
    checkbox.classList.remove("hidden");
  if (!canSendVerificationEmail && !checkbox.classList.contains("hidden"))
    checkbox.classList.add("hidden");
}

// htmx prefetch extension
// https://github.com/bigskysoftware/htmx-extensions/blob/main/src/preload/README.md
htmx.defineExtension("preload", {
  onEvent: function(name, event) {
    if (name !== "htmx:afterProcessNode") {
      return
    }
    var attr = function(node, property) {
      if (node == undefined) { return undefined }
      return node.getAttribute(property) || node.getAttribute("data-" + property) || attr(node.parentElement, property)
    }
    var load = function(node) {
      var done = function(html) {
        if (!node.preloadAlways) {
          node.preloadState = "DONE"
        }

        if (attr(node, "preload-images") == "true") {
          document.createElement("div").innerHTML = html
        }
      }

      return function() {
        if (node.preloadState !== "READY") {
          return
        }
        var hxGet = node.getAttribute("hx-get") || node.getAttribute("data-hx-get")
        if (hxGet) {
          htmx.ajax("GET", hxGet, {
            source: node,
            handler: function(elt, info) {
              done(info.xhr.responseText)
            }
          })
          return
        }
        if (node.getAttribute("href")) {
          var r = new XMLHttpRequest()
          r.open("GET", node.getAttribute("href"))
          r.onload = function() { done(r.responseText) }
          r.send()
        }
      }
    }
    var init = function(node) {
      if (node.getAttribute("href") + node.getAttribute("hx-get") + node.getAttribute("data-hx-get") == "") {
        return
      }
      if (node.preloadState !== undefined) {
        return
      }
      var on = attr(node, "preload") || "mousedown"
      const always = on.indexOf("always") !== -1
      if (always) {
        on = on.replace("always", "").trim()
      }
      node.addEventListener(on, function(evt) {
        if (node.preloadState === "PAUSE") {
          node.preloadState = "READY"
          if (on === "mouseover") {
            window.setTimeout(load(node), 100)
          } else {
            load(node)()
          }
        }
      })
      switch (on) {
        case "mouseover":
          node.addEventListener("touchstart", load(node))
          node.addEventListener("mouseout", function(evt) {
            if ((evt.target === node) && (node.preloadState === "READY")) {
              node.preloadState = "PAUSE"
            }
          })
          break

        case "mousedown":
          node.addEventListener("touchstart", load(node))
          break
      }
      node.preloadState = "PAUSE"
      node.preloadAlways = always
      htmx.trigger(node, "preload:init")
    }
    const parent = event.target || event.detail.elt;
    parent.querySelectorAll("[preload]").forEach(function(node) {
      init(node)
      node.querySelectorAll("a,[hx-get],[data-hx-get]").forEach(init)
    })
  }
})