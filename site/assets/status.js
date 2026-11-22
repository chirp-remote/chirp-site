// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Fabrintek Engenharia Digital Ltda
//
// The status page: fetches the status service's figures (cmd/chirp-status)
// and shows them, every round. Everything it shows comes from the API and is
// written as text, never parsed as HTML. It never shows old figures as
// current: their age is always on the page, measured by the service's clock,
// not the visitor's.
(function () {
  "use strict";

  var main = document.getElementById("status");
  if (!main) return;
  var API = main.getAttribute("data-api");
  var HISTORY_EVERY = 5 * 60 * 1000;
  var DAYS = 90;

  var S = {
    en: {
      loading: "Loading the figures…",
      upOf: function (up, n) { return up + " of " + n + (n === 1 ? " server" : " servers") + " up"; },
      none: "Nothing to probe yet",
      checked: function (ago, v) { return "Checked " + ago + " ago, from " + v; },
      down: "The monitor is not answering",
      downNote: "This page can't say anything about the servers until it answers. It asks again every 30 seconds.",
      lost: function (ago) { return "The monitor stopped answering. These are its figures from " + ago + " ago."; },
      stale: function (ago) { return "The monitor answers, but its latest figures are " + ago + " old: it has stopped probing."; },
      state: { up: "Up", failing: "Failing", offline: "Off-line", unknown: "Unknown" },
      offlineFor: function (d) { return "Off-line for " + d; },
      failingFor: function (d) { return "Failing for " + d; },
      unknownFor: function (d) { return "Not probed for " + d; },
      notYet: "Not probed yet",
      lastAnswered: function (t) { return "last answered " + t; },
      neverAnswered: "has never answered",
      err: {
        timeout: "no answer within 5 s", dns: "name not found", connect: "could not connect",
        tls: "TLS certificate or handshake failed", status: "answered with an error", other: "failed"
      },
      dedicated: "Dedicated", "new": "New", suspended: "Suspended", cdn: "behind a CDN",
      w24h: "24 hours", w30d: "30 days", w90d: "90 days", latency: "Latency",
      shortHistory: "short history", noData: "no data",
      strip: function (n, low) { return "Last 90 days: " + n + " with data" + (low ? ", the lowest " + low : ""); },
      dayTitle: function (d, p) { return d + ": " + p; },
      ago90: "90 days ago", today: "today",
      noMatch: "No server matches this filter."
    },
    "pt-BR": {
      loading: "Carregando os números…",
      upOf: function (up, n) { return up + " de " + n + (n === 1 ? " servidor" : " servidores") + " no ar"; },
      none: "Nada para sondar ainda",
      checked: function (ago, v) { return "Verificado há " + ago + ", a partir de " + v; },
      down: "O monitor não está respondendo",
      downNote: "Esta página não consegue dizer nada sobre os servidores até ele responder. Ela pergunta de novo a cada 30 segundos.",
      lost: function (ago) { return "O monitor parou de responder. Estes são os números dele de " + ago + " atrás."; },
      stale: function (ago) { return "O monitor responde, mas os números mais recentes têm " + ago + ": ele parou de sondar."; },
      state: { up: "No ar", failing: "Falhando", offline: "Fora do ar", unknown: "Desconhecido" },
      offlineFor: function (d) { return "Fora do ar há " + d; },
      failingFor: function (d) { return "Falhando há " + d; },
      unknownFor: function (d) { return "Sem sondagem há " + d; },
      notYet: "Ainda não sondado",
      lastAnswered: function (t) { return "última resposta em " + t; },
      neverAnswered: "nunca respondeu",
      err: {
        timeout: "sem resposta em 5 s", dns: "nome não encontrado", connect: "não conectou",
        tls: "falha no certificado ou na negociação TLS", status: "respondeu com erro", other: "falhou"
      },
      dedicated: "Dedicado", "new": "Novo", suspended: "Suspenso", cdn: "atrás de uma CDN",
      w24h: "24 horas", w30d: "30 dias", w90d: "90 dias", latency: "Latência",
      shortHistory: "histórico curto", noData: "sem dados",
      strip: function (n, low) { return "Últimos 90 dias: " + n + " com dados" + (low ? ", o menor " + low : ""); },
      dayTitle: function (d, p) { return d + ": " + p; },
      ago90: "há 90 dias", today: "hoje",
      noMatch: "Nenhum servidor neste filtro."
    }
  };

  var lang = S[document.documentElement.lang] ? document.documentElement.lang : "en";
  function t() { return S[lang]; }

  // State: the latest snapshot, when it arrived, and the service's clock.
  var snap = null;        // the parsed /v1/servers
  var skew = 0;           // service clock minus this one, in ms
  var failing = false;    // the latest request failed
  var history = {};       // id -> days, from /v1/servers/{id}/history
  var historyAt = 0;
  var filter = "all";
  var cards = {};         // id -> the card's parts, for updating in place
  var cardsLang = "";

  function serverNow() { return Date.now() + skew; }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // Durations, coarsest two units: "12 s", "3 min", "2 h 5 min", "4 d 3 h".
  function dur(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    if (s < 60) return s + " s";
    var m = Math.floor(s / 60);
    if (m < 60) return m + " min";
    var h = Math.floor(m / 60);
    if (h < 24) return h + " h" + (m % 60 ? " " + (m % 60) + " min" : "");
    var d = Math.floor(h / 24);
    return d + " d" + (h % 24 ? " " + (h % 24) + " h" : "");
  }
  function when(iso) {
    var f = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
    return f.format(new Date(iso)) + " UTC";
  }
  // The service has already cut each figure to three decimals, so showing
  // at most three never rounds it.
  function pct(p) {
    return new Intl.NumberFormat(lang, { maximumFractionDigits: 3 }).format(p) + "%";
  }
  function hasPercent(fig) {
    return Boolean(fig) && typeof fig.percent === "number";
  }
  // A window counts only when something was observed in it.
  function measured(w) {
    return hasPercent(w) && Boolean(w.observed_minutes);
  }
  function level(w) {
    if (!measured(w)) return "none";
    if (w.percent >= 99.9) return "ok";
    if (w.percent >= 99) return "warn";
    return "bad";
  }

  var SEVERITY = { offline: 0, failing: 1, unknown: 2, up: 3 };
  // A state the page does not know is shown, and sorted, as unknown.
  function stateOf(s) {
    return SEVERITY[s.state] === undefined ? "unknown" : s.state;
  }
  function byConcern(a, b) {
    var d = SEVERITY[stateOf(a)] - SEVERITY[stateOf(b)];
    if (d) return d;
    if (a.id === b.id) return 0;
    return a.id < b.id ? -1 : 1;
  }
  function shown(s) {
    switch (filter) {
      case "dedicated": return s.kind === "node";
      case "new": return !!s["new"];
      case "offline": return s.state === "offline";
    }
    return true;
  }

  // A card is built once, and its figures are then rewritten in place, so a
  // round of new figures never moves the focus or the scroll.
  function append(parent) {
    for (var i = 1; i < arguments.length; i++) parent.appendChild(arguments[i]);
    return parent;
  }
  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }
  // A figure: its label, and a link to how it is made.
  function figure(label, def) {
    var a = el("a");
    a.href = def;
    return { box: append(el("div"), el("dt", "", label), append(el("dd"), a)), link: a };
  }

  // A card is built once, and its figures are then rewritten in place, so a
  // round of new figures never moves the focus or the scroll.
  function buildCard(s) {
    var c = { li: el("li", "server") };
    c.li.appendChild(buildHead(c, s));
    c.meta = append(c.li, el("p", "srv-meta")).lastChild;
    c.since = append(c.li, el("p", "srv-since")).lastChild;
    c.li.appendChild(buildFigures(c));
    c.li.appendChild(buildStrip(c));
    c.li.appendChild(append(el("div", "strip-axis"), el("span", "", t().ago90), el("span", "", t().today)));
    return c;
  }
  function buildHead(c, s) {
    c.pillText = el("span");
    c.pill = append(el("span", "pill-state"), el("span", "dot"), c.pillText);
    c.pillLink = append(el("a"), c.pill);
    c.badges = el("span", "badges");
    return append(el("div", "srv-head"), c.pillLink, el("h3", "", s.id), c.badges);
  }
  function buildFigures(c) {
    var figs = el("dl", "figures");
    c.fig = {};
    [["24h", t().w24h], ["30d", t().w30d], ["90d", t().w90d]].forEach(function (w) {
      var f = figure(w[1], "#def-uptime");
      figs.appendChild(f.box);
      c.fig[w[0]] = f.link;
    });
    var lat = figure(t().latency, "#def-latency");
    figs.appendChild(lat.box);
    c.lat = lat.link;
    return figs;
  }
  function buildStrip(c) {
    c.strip = el("div", "strip");
    c.strip.setAttribute("role", "img");
    c.bars = [];
    for (var i = 0; i < DAYS; i++) {
      var b = el("i");
      b.setAttribute("data-level", "none");
      c.strip.appendChild(b);
      c.bars.push(b);
    }
    return c.strip;
  }

  function badge(text, def, cls) {
    var a = el("a", "badge" + (cls ? " " + cls : ""), text);
    a.href = def;
    return a;
  }

  function updateCard(c, s) {
    var L = t();
    showState(c, stateOf(s), L);
    showBadges(c, s, L);
    c.meta.textContent = metaLine(s, L);
    showUptime(c, s, L);
    c.lat.textContent = typeof s.latency_ms === "number" ? s.latency_ms + " ms" : "—";
    showStrip(c, history[s.id], L);
    c.s = s;
    tickCard(c);
  }
  function showState(c, state, L) {
    c.li.setAttribute("data-state", state);
    c.pill.setAttribute("data-state", state);
    c.pillText.textContent = L.state[state];
    c.pillLink.href = state === "up" ? "#def-probe" : "#def-" + state;
  }
  function showBadges(c, s, L) {
    clear(c.badges);
    if (s.kind === "node") c.badges.appendChild(badge(L.dedicated, "#def-dedicated"));
    if (s["new"]) c.badges.appendChild(badge(L["new"], "#def-new", "new"));
    if (s.listing === "suspended") c.badges.appendChild(badge(L.suspended, "#def-suspended", "suspended"));
  }
  function hostOf(url) {
    try { return new URL(url).host; } catch (e) { return String(url || ""); }
  }
  function metaLine(s, L) {
    return [s.operator, s.region, hostOf(s.url), s.behind_cdn ? L.cdn : ""].filter(Boolean).join(" · ");
  }
  // What one uptime window shows, and the definition it links to. A new
  // server's 90 days are a short history, not a figure.
  function uptimeText(w, fig, s, L) {
    if (w === "90d" && s["new"]) return [L.shortHistory, "#def-new"];
    if (hasPercent(fig)) return [pct(fig.percent), "#def-uptime"];
    return [L.noData, "#def-nodata"];
  }
  function showUptime(c, s, L) {
    var up = s.uptime || {};
    ["24h", "30d", "90d"].forEach(function (w) {
      var fig = up[w], a = c.fig[w], view = uptimeText(w, fig, s, L);
      a.textContent = view[0];
      a.href = view[1];
      a.title = fig ? fig.up_minutes + " / " + fig.observed_minutes + " min" : "";
    });
  }
  function dayTitle(d, lv, L) {
    if (!d) return "";
    return L.dayTitle(d.day, lv === "none" ? L.noData : pct(d.percent));
  }
  // The last DAYS days, oldest first, one bar each; a day missing from the
  // history is a blank bar.
  function showStrip(c, days, L) {
    var withData = 0, low = null;
    for (var i = 0; i < DAYS; i++) {
      var d = days && days[days.length - DAYS + i];
      var lv = level(d);
      c.bars[i].setAttribute("data-level", lv);
      c.bars[i].title = dayTitle(d, lv, L);
      if (lv === "none") continue;
      withData++;
      low = low === null ? d.percent : Math.min(low, d.percent);
    }
    c.strip.setAttribute("aria-label", L.strip(withData, low === null ? "" : pct(low)));
  }

  // The one line that ages between rounds: since when a server is down.
  function tickCard(c) {
    var s = c.s;
    c.since.hidden = s.state === "up";
    if (c.since.hidden) return;
    var down = s.state === "offline" || s.state === "failing";
    var parts = down ? downParts(s, t(), serverNow()) : unknownParts(s, t(), serverNow());
    c.since.textContent = parts.join(" · ");
  }
  function downParts(s, L, now) {
    var parts;
    if (s.last_ok) {
      var forDur = s.state === "offline" ? L.offlineFor : L.failingFor;
      parts = [forDur(dur(now - Date.parse(s.last_ok))), L.lastAnswered(when(s.last_ok))];
    } else {
      parts = [L.state[s.state], L.neverAnswered];
    }
    if (L.err[s.last_error]) parts.push(L.err[s.last_error]);
    return parts;
  }
  function unknownParts(s, L, now) {
    var parts = [s.last_checked ? L.unknownFor(dur(now - Date.parse(s.last_checked))) : L.notYet];
    if (s.last_ok) parts.push(L.lastAnswered(when(s.last_ok)));
    return parts;
  }

  function render() {
    var servers = snap && Array.isArray(snap.servers) ? snap.servers : [];
    document.getElementById("st-toolbar").hidden = servers.length === 0;
    document.getElementById("st-empty").hidden = !snap || servers.length > 0;
    if (snap) renderServers(servers);
    else renderWaiting();
    tick();
  }
  // No figures yet: either the first answer is on its way, or none came.
  function renderWaiting() {
    var L = t(), note = document.getElementById("st-monitor");
    document.getElementById("st-headline").textContent = failing ? L.down : L.loading;
    note.hidden = !failing;
    note.textContent = L.downNote;
  }
  function renderServers(servers) {
    var L = t();
    var up = servers.filter(function (s) { return s.state === "up"; }).length;
    document.getElementById("st-headline").textContent = servers.length ? L.upOf(up, servers.length) : L.none;
    var visible = placeCards(document.getElementById("st-servers"), servers.slice().sort(byConcern));
    var nomatch = document.getElementById("st-nomatch");
    nomatch.hidden = servers.length === 0 || visible > 0;
    nomatch.textContent = L.noMatch;
  }
  // Puts a card for each server in list, in order, and drops the cards of
  // servers that are gone. Returns how many the filter shows.
  function placeCards(list, order) {
    if (cardsLang !== lang) {
      clear(list);
      cards = {};
      cardsLang = lang;
    }
    var seen = {}, visible = 0;
    order.forEach(function (s, i) {
      seen[s.id] = true;
      var c = cards[s.id] || (cards[s.id] = buildCard(s));
      updateCard(c, s);
      c.li.hidden = !shown(s);
      if (!c.li.hidden) visible++;
      // Moved only when out of place: moving a card takes the focus off it.
      if (list.children[i] !== c.li) list.insertBefore(c.li, list.children[i] || null);
    });
    Object.keys(cards).forEach(function (id) {
      if (seen[id]) return;
      list.removeChild(cards[id].li);
      delete cards[id];
    });
    return visible;
  }

  // Every second: the ages on the page.
  function tick() {
    var checked = document.getElementById("st-checked");
    if (!snap) {
      checked.textContent = "";
      return;
    }
    var L = t(), age = serverNow() - Date.parse(snap.generated_at);
    checked.textContent = L.checked(dur(age), snap.vantage || "?");
    var warning = monitorWarning(age, L), note = document.getElementById("st-monitor");
    note.hidden = !warning;
    if (warning) note.textContent = warning;
    Object.keys(cards).forEach(function (id) { tickCard(cards[id]); });
  }
  // What to say about the monitor itself, if anything: it stopped
  // answering, or it answers with figures too old to be current.
  function monitorWarning(age, L) {
    if (failing) return L.lost(dur(age));
    var interval = (snap.interval_seconds || 30) * 1000;
    if (age > 3 * interval) return L.stale(dur(age));
    return "";
  }

  function get(path) {
    return fetch(API + path, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" }).then(function (r) {
      if (!r.ok) throw new Error(path + ": " + r.status);
      var date = Date.parse(r.headers.get("Date") || "");
      if (!isNaN(date)) skew = date - Date.now();
      return r.json();
    });
  }

  function loadHistory(servers) {
    historyAt = Date.now();
    return Promise.all(servers.map(function (s) {
      return get("/v1/servers/" + encodeURIComponent(s.id) + "/history?days=" + DAYS).then(function (h) {
        if (h && Array.isArray(h.days)) history[s.id] = h.days;
      }, function () { /* the strip keeps what it had */ });
    }));
  }

  function isSnapshot(data) {
    if (!data || !Array.isArray(data.servers)) return false;
    return typeof data.generated_at === "string";
  }

  var timer;
  function poll() {
    clearTimeout(timer);
    get("/v1/servers").then(function (data) {
      if (!isSnapshot(data)) throw new Error("unexpected answer");
      snap = data;
      failing = false;
      var unseen = data.servers.some(function (s) { return !history[s.id]; });
      if (unseen || Date.now() - historyAt > HISTORY_EVERY) {
        return loadHistory(data.servers);
      }
    }).catch(function () {
      failing = true;
    }).then(function () {
      render();
      if (!document.hidden) {
        timer = setTimeout(poll, ((snap && snap.interval_seconds) || 30) * 1000);
      }
    });
  }

  document.querySelectorAll("[data-filter]").forEach(function (b) {
    b.addEventListener("click", function () {
      filter = b.getAttribute("data-filter");
      document.querySelectorAll("[data-filter]").forEach(function (o) {
        o.setAttribute("aria-pressed", String(o === b));
      });
      render();
    });
  });
  document.addEventListener("chirp:lang", function (e) {
    lang = S[e.detail] ? e.detail : "en";
    render();
  });
  // A hidden tab stops asking, and asks at once when it is seen again.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) clearTimeout(timer);
    else poll();
  });

  render();
  poll();
  setInterval(tick, 1000);
})();
