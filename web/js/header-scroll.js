export function createHeaderScroll(header, {
  document: doc = header.ownerDocument,
  window: view = doc.defaultView,
  requestFrame = callback => typeof view.requestAnimationFrame === 'function' ? view.requestAnimationFrame(callback) : callback(),
  cancelFrame = id => view.cancelAnimationFrame?.(id)
} = {}) {
  let compact = header.classList.contains('header-compact');
  let scheduled = false, frame = 0, destroyed = false;

  function update() {
    if (destroyed) return;
    const detail = doc.body.classList.contains('detail-open') && doc.querySelector('.detail-modal');
    const position = Math.max(0, Number(detail ? detail.scrollTop : view.scrollY ?? doc.documentElement.scrollTop) || 0);
    const next = compact ? position > 16 : position >= 72;
    if (next !== compact) {
      compact = next;
      header.classList.toggle('header-compact', compact);
    }
  }
  function refresh() {
    if (destroyed || scheduled) return;
    scheduled = true;
    frame = requestFrame(() => { scheduled = false; frame = 0; update(); });
  }
  function changeContext() {
    if (scheduled) cancelFrame(frame);
    scheduled = false;
    frame = 0;
    update();
  }
  doc.addEventListener('scroll', refresh, { capture: true, passive: true });
  view.addEventListener('scroll', refresh, { passive: true });
  doc.addEventListener('header-contextchange', changeContext);
  update();
  return {
    refresh: changeContext,
    destroy() {
      destroyed = true;
      if (scheduled) cancelFrame(frame);
      doc.removeEventListener('scroll', refresh, true);
      view.removeEventListener('scroll', refresh);
      doc.removeEventListener('header-contextchange', changeContext);
    }
  };
}
