(function () {
  "use strict";

  let allRegions = [];

  // Return an <img> tag for the bundled flag SVG
  function codeToFlag(code) {
    return `<img src="flags/${code.toLowerCase()}.svg" alt="${code.toUpperCase()}" class="flag-img">`;
  }

  // Build editor URLs for a given lat/lon/zoom
  function editorLinks(lat, lon, zoom, name) {
    // Scale the JOSM bbox to match the zoom level
    // zoom 12 ≈ 0.05°, each zoom step halves/doubles
    const delta = 0.05 * Math.pow(2, 12 - zoom);
    return {
      id: `https://www.openstreetmap.org/edit?editor=id#map=${zoom}/${lat}/${lon}`,
      rapid: `https://rapideditor.org/edit#map=${zoom}/${lat}/${lon}`,
      josm:
        `http://localhost:8111/load_and_zoom?left=${lon - delta}` +
        `&right=${lon + delta}&top=${lat + delta}&bottom=${lat - delta}` +
        `&new_layer=true&layer_name=${encodeURIComponent(name)}&download_policy=never`,
    };
  }

  // Parse HDYC pasted text into a Set of lowercase ISO alpha-2 codes
  // Format: "us United States - 3,354,284 (12,597)"
  // Entries may be on the same line (no separator other than the next 2-letter code)
  function parseHdyc(text) {
    const codes = new Set();
    // Match 2-letter codes that appear before a region name.
    // The HDYC format is: <2-letter code> <Region Name> - <number> (<number>)
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

    for (const region of allRegions) {
      if (collectedCodes.has(region.code)) {
        collected.push(region);
      } else {
        missing.push(region);
      }
    }

    // Summary
    summary.innerHTML =
      `<span class="count-collected">${collected.length}</span> of ${allRegions.length} flags collected &mdash; ` +
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
        const links = editorLinks(c.lat, c.lon, c.zoom || 12, c.name);
        return (
          `<div class="country-card">` +
          `<span class="flag">${codeToFlag(c.code)}</span>` +
          `<span class="name">${c.name}</span>` +
          `<span class="editors">` +
          `<a class="editor-link id" href="${links.id}" target="_blank" rel="noopener" title="Edit in iD">iD</a>` +
          `<a class="editor-link rapid" href="${links.rapid}" target="_blank" rel="noopener" title="Edit in Rapid">Rapid</a>` +
          `<a class="editor-link josm" href="#" data-josm="${links.josm}" title="Open in JOSM (remote control)">JOSM</a>` +
          `</span>` +
          `</div>`
        );
      })
      .join("");

    resultsSection.classList.remove("hidden");
  }

  // Handle JOSM remote control links via background fetch
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-josm]");
    if (!link) return;
    e.preventDefault();
    const url = link.dataset.josm;
    link.classList.remove("josm-ok", "josm-err");
    fetch(url)
      .then(() => {
        link.classList.add("josm-ok");
      })
      .catch(() => {
        link.classList.add("josm-err");
      });
  });

  // Theme toggle
  const THEME_KEY = "flagcollector-theme";
  function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
  }
  let currentTheme = localStorage.getItem(THEME_KEY) || getSystemTheme();
  applyTheme(currentTheme);
  document.getElementById("theme-toggle").addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(currentTheme);
    localStorage.setItem(THEME_KEY, currentTheme);
  });

  const STORAGE_KEY = "flagcollector-hdyc-data";

  function saveAndRender(text) {
    const codes = parseHdyc(text);
    if (codes.size === 0) return;
    localStorage.setItem(STORAGE_KEY, text);
    render(codes);
    // Collapse input section and show clear button
    document.getElementById("input-section").removeAttribute("open");
    document.getElementById("clear-btn").classList.remove("hidden");
  }

  // Init
  async function init() {
    const response = await fetch("data/countries.json");
    allRegions = await response.json();

    const textarea = document.getElementById("hdyc-input");

    document.getElementById("parse-btn").addEventListener("click", () => {
      const text = textarea.value.trim();
      if (!text) return;
      saveAndRender(text);
    });

    document.getElementById("clear-btn").addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY);
      textarea.value = "";
      document.getElementById("results-section").classList.add("hidden");
      document.getElementById("clear-btn").classList.add("hidden");
      document.getElementById("input-section").setAttribute("open", "");
    });

    // Restore from localStorage on load
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      textarea.value = saved;
      saveAndRender(saved);
    }
  }

  init();
})();
