(function () {
  "use strict";

  var SECTION_SELECTORS = {
    pg080_sec001: 'div[class*="max-w-[48rem]"][class*="bg-cyan-50"]',
    pg081_sec001: ".rounded-2xl",
    pg082_sec001: 'div[class*="border-sky-"]',
    pg083_sec001: ".flex.flex-wrap.gap-3",
    pg084_sec001: ".inline-flex[data-id-container]",
    pg085_sec001: ".bg-amber-50",
    pg086_sec001: 'div[class*="border-sky-"]',
    pg087_sec001: 'div[class*="border-sky-"]'
  };
  var KNOWN_SOUNDS = [
    "fl", "gl", "pl", "sl", "br", "cr", "dr", "fr", "gr", "pr",
    "tr", "sc", "sk", "sm", "sn", "sp", "st", "sw", "tw", "ch",
    "sh", "th", "ph", "ck", "ff", "ll", "ss", "ai", "ay", "oa",
    "oe", "ea", "ee"
  ];

  function findSound(strip, section) {
    var nodes = Array.prototype.slice.call(section.querySelectorAll("[data-id]"));
    var stripTop = strip.getBoundingClientRect().top;

    for (var i = nodes.length - 1; i >= 0; i -= 1) {
      var node = nodes[i];
      if (strip.contains(node) || node.getBoundingClientRect().top >= stripTop) continue;

      var text = (node.textContent || "").trim();
      var match = text.match(/(?:letter sound|sound of(?: the)?(?: letters?)?)\s+([a-z]{1,3})\b/i);
      if (match) return match[1].toLowerCase();
    }

    return "";
  }

  function replaceMatches(node, expression) {
    if (node.querySelector(".pdf-phonics-sound")) return;

    var text = node.textContent || "";
    if (!expression.test(text)) return;
    expression.lastIndex = 0;

    var fragment = document.createDocumentFragment();
    text.split(expression).forEach(function (part, index) {
      if (index % 2 === 1) {
        var highlight = document.createElement("span");
        highlight.className = "pdf-phonics-sound";
        highlight.textContent = part;
        fragment.appendChild(highlight);
      } else if (part) {
        fragment.appendChild(document.createTextNode(part));
      }
    });
    node.replaceChildren(fragment);
  }

  function markSound(node, sound) {
    if (!sound) return;
    replaceMatches(node, new RegExp("(" + sound + ")", "gi"));
  }

  function markInstruction(node) {
    var text = node.textContent || "";
    var match = text.match(/(?:letter sound|sound of(?: the)?(?: letters?)?)\s+([a-z]{1,3})\b/i);
    if (match) {
      var sound = match[1].toLowerCase();
      replaceMatches(node, new RegExp("\\b(" + sound + ")\\b", "gi"));
    }
  }

  function markSummary(node) {
    var text = node.textContent || "";
    if (!/\bwords with\b/i.test(text)) return;
    replaceMatches(node, new RegExp("\\b(" + KNOWN_SOUNDS.join("|") + ")\\b", "gi"));
  }

  function decoratePhonics() {
    Object.keys(SECTION_SELECTORS).forEach(function (sectionId) {
      var section = document.querySelector('[data-section-id="' + sectionId + '"]');
      if (!section) return;

      section.querySelectorAll(SECTION_SELECTORS[sectionId]).forEach(function (strip) {
        var sound = findSound(strip, section);
        if (!sound) return;

        strip.dataset.phonicsSound = sound;
        strip.querySelectorAll("[data-id]").forEach(function (node) {
          markSound(node, sound);
        });
      });

      section.querySelectorAll("h1[data-id], h2[data-id], p [data-id], p[data-id]").forEach(function (node) {
        markInstruction(node);
        markSummary(node);
      });
    });
  }

  var queued = false;
  function queueDecoration() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () {
      queued = false;
      decoratePhonics();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", queueDecoration, { once: true });
  } else {
    queueDecoration();
  }
  window.addEventListener("load", queueDecoration, { once: true });

  new MutationObserver(function (mutations) {
    var hasUndecoratedContent = mutations.some(function (mutation) {
      return Array.prototype.some.call(mutation.addedNodes, function (node) {
        return node.nodeType === Node.TEXT_NODE ||
          (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains("pdf-phonics-sound"));
      });
    });
    if (hasUndecoratedContent) queueDecoration();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
