/* Shared touch / pointer controls for Mint Arcade games.
 *
 * Exposes window.Touch with:
 *   Touch.enabled            — true on touch / coarse-pointer devices (phones, tablets)
 *   Touch.swipe(el, h)       — h = { onSwipe(dir), onTap(), threshold } ; dir = up|down|left|right
 *   Touch.hold(btn, on, off) — continuous press: on() while held, off() on release
 *   Touch.press(btn, fn, o)  — discrete press: fn() on tap; o.repeat keeps firing while held
 *   Touch.bar()              — a styled horizontal control bar element
 *   Touch.button(label)      — a large styled control button
 *
 * Handlers attach to game-owned elements (the canvas / buttons inside #board), which are
 * discarded when the board is cleared between games — so there's nothing to tear down.
 */
(function () {
  "use strict";

  const coarse =
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0;

  // Swipe + tap detection on an element.
  function swipe(el, handlers) {
    const TH = handlers.threshold || 24;
    let sx = 0, sy = 0;
    el.style.touchAction = "none";
    el.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      sx = t.clientX; sy = t.clientY;
    }, { passive: true });
    el.addEventListener("touchmove", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
    el.addEventListener("touchend", (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < TH && Math.abs(dy) < TH) { if (handlers.onTap) handlers.onTap(); return; }
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      if (handlers.onSwipe) handlers.onSwipe(dir);
    }, { passive: false });
  }

  // Continuous press: onDown when pressed, onUp when released.
  function hold(btn, onDown, onUp) {
    btn.style.touchAction = "none";
    let active = false;
    const down = (e) => { if (e.cancelable) e.preventDefault(); if (active) return; active = true; if (onDown) onDown(); };
    const up = () => { if (!active) return; active = false; if (onUp) onUp(); };
    btn.addEventListener("touchstart", down, { passive: false });
    btn.addEventListener("touchend", up);
    btn.addEventListener("touchcancel", up);
    btn.addEventListener("mousedown", down);
    btn.addEventListener("mouseup", up);
    btn.addEventListener("mouseleave", up);
  }

  // Discrete press: fires fn() once on press; with opts.repeat keeps firing while held.
  function press(btn, fn, opts) {
    opts = opts || {};
    btn.style.touchAction = "none";
    let timer = null;
    const start = (e) => {
      if (e.cancelable) e.preventDefault();
      if (timer) return;
      fn();
      if (opts.repeat) timer = setInterval(fn, opts.interval || 110);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    btn.addEventListener("touchstart", start, { passive: false });
    btn.addEventListener("touchend", stop);
    btn.addEventListener("touchcancel", stop);
    btn.addEventListener("mousedown", start);
    btn.addEventListener("mouseup", stop);
    btn.addEventListener("mouseleave", stop);
  }

  function bar() {
    const b = document.createElement("div");
    b.className = "touch-bar";
    return b;
  }
  function button(label) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "touch-btn";
    b.innerHTML = label;
    return b;
  }

  window.Touch = { enabled: coarse, swipe: swipe, hold: hold, press: press, bar: bar, button: button };
})();
