"use client";

import { useEffect } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function canScrollInside(element: Element | null, deltaY: number) {
  let current: Element | null = element;

  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const scrollable = /(auto|scroll|overlay)/.test(overflowY) && current.scrollHeight > current.clientHeight;

    if (scrollable) {
      const scrollTop = current.scrollTop;
      const maxScroll = current.scrollHeight - current.clientHeight;
      if ((deltaY < 0 && scrollTop > 0) || (deltaY > 0 && scrollTop < maxScroll)) return true;
    }

    current = current.parentElement;
  }

  return false;
}

function isEditableTarget(element: Element | null) {
  return Boolean(element?.closest("input, textarea, select, [contenteditable='true'], [data-smooth-scroll-ignore]"));
}

function normalizeWheelDelta(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 42;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

function shouldKeepNativeWheel(event: WheelEvent, deltaY: number) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL && Math.abs(deltaY) < 48) return true;
  return Math.abs(deltaY) < 1;
}

export function PublicSmoothScroll() {
  useEffect(() => {
    if (!document.querySelector(".kdm-public-shell")) return;

    const finePointer = window.matchMedia("(pointer: fine)");
    const touchOnly = navigator.maxTouchPoints > 0 && !finePointer.matches;
    if (touchOnly) return;

    let frameId = 0;
    let currentY = window.scrollY;
    let targetY = window.scrollY;
    let lastWheelAt = 0;

    const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const stopAnimation = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      currentY = window.scrollY;
      targetY = window.scrollY;
    };

    const animate = () => {
      const distance = targetY - currentY;
      currentY += distance * 0.16;

      if (Math.abs(distance) < 0.45) {
        currentY = targetY;
        window.scrollTo({ top: currentY, left: 0, behavior: "auto" });
        frameId = 0;
        return;
      }

      window.scrollTo({ top: currentY, left: 0, behavior: "auto" });
      frameId = window.requestAnimationFrame(animate);
    };

    const smoothTo = (nextTarget: number) => {
      targetY = clamp(nextTarget, 0, maxScroll());
      if (!frameId) {
        currentY = window.scrollY;
        frameId = window.requestAnimationFrame(animate);
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey) return;

      const target = event.target instanceof Element ? event.target : null;
      if (isEditableTarget(target)) return;

      const deltaY = normalizeWheelDelta(event);
      if (shouldKeepNativeWheel(event, deltaY) || canScrollInside(target, deltaY)) return;

      event.preventDefault();

      const now = performance.now();
      if (now - lastWheelAt > 180) {
        currentY = window.scrollY;
        targetY = window.scrollY;
      }
      lastWheelAt = now;

      const intensity = Math.min(420, Math.max(86, Math.abs(deltaY)));
      smoothTo(targetY + Math.sign(deltaY) * intensity);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      if (target.target && target.target !== "_self") return;

      const url = new URL(target.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;

      const element = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!element) return;

      event.preventDefault();
      const offset = window.innerWidth >= 1024 ? 92 : 72;
      smoothTo(element.getBoundingClientRect().top + window.scrollY - offset);
      window.history.pushState(null, "", url.hash);
    };

    const syncNativeScroll = () => {
      if (!frameId) {
        currentY = window.scrollY;
        targetY = window.scrollY;
      }
    };

    document.documentElement.dataset.kdmSmoothScroll = "aigocy-safe";
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", syncNativeScroll, { passive: true });
    window.addEventListener("resize", stopAnimation, { passive: true });
    document.addEventListener("click", onClick);

    return () => {
      delete document.documentElement.dataset.kdmSmoothScroll;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", syncNativeScroll);
      window.removeEventListener("resize", stopAnimation);
      document.removeEventListener("click", onClick);
      stopAnimation();
    };
  }, []);

  return null;
}
