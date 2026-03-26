(function () {
  "use strict";

  let allCountries = [];

  // Convert ISO alpha-2 code to flag emoji (e.g., "us" → 🇺🇸)
  function codeToFlag(code) {
    const upper = code.toUpperCase();
    return String.fromCodePoint(
      ...upper.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
    );
  }

  // Build editor URLs for a given lat/lon
  function editorLinks(lat, lon) {
    const zoom = 12;
    const delta = 0.05;
    return {
      id: `https://www.openstreetmap.org/edit?editor=id#map=${zoom}/${lat}/${lon}`,
      rapid: `https://rapideditor.org/edit#map=${zoom}/${lat}/${lon}`,
      josm:
        `http://localhost:8111/load_and_zoom?left=${lon - delta}` +
        `&right=${lon + delta}&top=${lat + delta}&bottom=${lat - delta}`,
    };
  }

  // Parse HDYC pasted text into a Set of lowercase ISO alpha-2 codes
  // Format: "us United States - 3,354,284 (12,597)"
  // Entries may be on the same line (no separator other than the next 2-letter code)
  function parseHdyc(text) {
    const codes = new Set();
    // Match 2-letter codes that appear before a country name.
    // The HDYC format is: <2-letter code> <Country Name> - <number> (<number>)
    const regex = /\b([a-z]{2})\s+[A-ZÀ-Ž][a-zà-ž]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      codes.add(match[1].toLowerCase());
    }
    return codes;
  }

  // Render results
  function render(collectedCodes) {
    const resultsSection = document.getElementById("results-section");
    const summary = document.getElementById("summary");
    const collectedList = document.getElementById("collected-list");
    const missingList = document.getElementById("missing-list");

    const collected = [];
    const missing = [];

    for (const country of allCountries) {
      if (collectedCodes.has(country.code)) {
        collected.push(country);
      } else {
        missing.push(country);
      }
    }

    // Summary
    summary.innerHTML =
      `<span class="count-collected">${collected.length}</span> of ${allCountries.length} flags collected &mdash; ` +
      `<span class="count-missing">${missing.length}</span> remaining!`;

    // Section counts
    document.getElementById("collected-count").textContent = `(${collected.length})`;
    document.getElementById("missing-count").textContent = `(${missing.length})`;

    // Collected list (just flags + names, no editor links)
    collectedList.innerHTML = collected
      .map(
        (c) =>
          `<div class="country-card">` +
          `<span class="flag">${codeToFlag(c.code)}</span>` +
          `<span class="name">${c.name}</span>` +
          `</div>`
      )
      .join("");

    // Missing list (flags + names + editor links)
    missingList.innerHTML = missing
      .map((c) => {
        const links = editorLinks(c.lat, c.lon);
        return (
          `<div class="country-card">` +
          `<span class="flag">${codeToFlag(c.code)}</span>` +
          `<span class="name">${c.name}</span>` +
          `<span class="editors">` +
          `<a class="editor-link id" href="${links.id}" target="_blank" rel="noopener" title="Edit in iD">iD</a>` +
          `<a class="editor-link rapid" href="${links.rapid}" target="_blank" rel="noopener" title="Edit in RapiD">RapiD</a>` +
          `<a class="editor-link josm" href="${links.josm}" title="Open in JOSM (remote control)">JOSM</a>` +
          `</span>` +
          `</div>`
        );
      })
      .join("");

    resultsSection.classList.remove("hidden");
  }

  // Init
  async function init() {
    const response = await fetch("data/countries.json");
    allCountries = await response.json();

    document.getElementById("parse-btn").addEventListener("click", () => {
      const text = document.getElementById("hdyc-input").value.trim();
      if (!text) return;
      const codes = parseHdyc(text);
      render(codes);
    });
  }

  init();
})();
