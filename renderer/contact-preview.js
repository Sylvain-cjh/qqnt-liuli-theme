import { loadEffects, subscribeEffects } from './effect-settings.js';
import { isThemeActive, onThemeActivity } from './activity.js';
import { getHoveredContact } from './contact-parallax.js';

export function installContactPreview() {
    const selector = '.recent-contact:not(.liuli-contact-projection) .recent-contact-item';
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    let config = loadEffects(), row = null, identity = '', timer = 0, frame = 0, popup = null, described = null;
    let dismissed = null, pointer = null;
    const listeners = [];
    const listen = (target, event, callback, options) => {
        target.addEventListener(event, callback, options);
        listeners.push(() => target.removeEventListener(event, callback, options));
    };
    const key = node => node?.getAttribute('data-contact-id') || '';
    const text = node => {
        if (!node) return '';
        const title = node.getAttribute('title') || node.getAttribute('aria-label');
        if (title) return title.trim().slice(0, 4000);
        // Keep emoji alt text without cloning the row or its images.
        const parts = [], walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let current;
        while ((current = walker.nextNode())) {
            if (current.nodeType === Node.TEXT_NODE) parts.push(current.nodeValue);
            else if (current.tagName === 'IMG') parts.push(current.alt || '');
        }
        return parts.join('').replace(/\s+/g, ' ').trim().slice(0, 4000);
    };
    function close() {
        clearTimeout(timer); timer = 0; cancelAnimationFrame(frame); frame = 0;
        observer.disconnect();
        if (popup && described?.isConnected) {
            const ids = (described.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== popup.id);
            if (ids.length) described.setAttribute('aria-describedby', ids.join(' '));
            else described.removeAttribute('aria-describedby');
        }
        popup?.remove(); popup = null; described = null; row = null; identity = '';
    }
    function valid() { return config.preview && isThemeActive() && row?.isConnected && key(row) === identity; }
    function content() {
        const title = text(row.querySelector('.contact-name__text')) || text(row.querySelector('.contact-name, .item__title')) || '未命名会话';
        const summary = text(row.querySelector('.item__summary')) || text(row.querySelector('.summary-main'));
        const time = text(row.querySelector('.item__time, .secondary-info [class*="time"], .secondary-info time, .secondary-info'));
        popup.querySelector('[data-preview-name]').textContent = title;
        popup.querySelector('[data-preview-summary]').textContent = summary || '暂无可预览的消息摘要';
        const metadata = [row.classList.contains('recent-contact-item--top') ? '置顶' : '', row.querySelector('.no-disturb-icon') ? '免打扰' : '', time].filter(Boolean);
        popup.querySelector('[data-preview-meta]').textContent = metadata.join(' · ');
    }
    function place() {
        const bounds = row.getBoundingClientRect();
        const width = Math.min(340, innerWidth - 24);
        popup.style.width = width + 'px';
        const extra = config.enabled ? bounds.width * (config.scale - 1) : 0;
        let left = bounds.right + extra + 12;
        if (left + width > innerWidth - 12) left = Math.max(12, bounds.left - width - 12);
        left = Math.max(12, Math.min(left, innerWidth - width - 12));
        popup.style.left = left + 'px';
        popup.style.top = Math.max(12, Math.min(bounds.top, innerHeight - popup.getBoundingClientRect().height - 12)) + 'px';
    }
    function show() {
        timer = 0;
        if (!valid()) { close(); return; }
        const visual = [...document.querySelectorAll('.liuli-contact-projection .recent-contact-item')].find(node => key(node) === identity);
        const bounds = (visual || row).getBoundingClientRect();
        if (!pointer || pointer.x < bounds.left || pointer.x > bounds.right || pointer.y < bounds.top || pointer.y > bounds.bottom) { close(); return; }
        popup = document.createElement('div'); popup.className = 'liuli-contact-preview';
        popup.id = 'liuli-contact-preview'; popup.setAttribute('role', 'tooltip'); popup.setAttribute('popover', 'manual');
        for (const [tag, field] of [['div','name'],['div','meta'],['div','summary']]) {
            const node = document.createElement(tag); node.dataset['preview' + field[0].toUpperCase() + field.slice(1)] = ''; popup.append(node);
        }
        const hint = document.createElement('div'); hint.className = 'liuli-preview-hint'; hint.textContent = '列表已加载的消息摘要'; popup.append(hint);
        content(); document.body.append(popup);
        popup.showPopover?.(); place();
        described = row;
        row.setAttribute('aria-describedby', ((row.getAttribute('aria-describedby') || '') + ' ' + popup.id).trim());
        observer.observe(row, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-contact-id', 'title'] });
        const list = row.closest('.recent-contact');
        if (list) observer.observe(list, { subtree: true, childList: true });
    }
    const observer = new MutationObserver(records => {
        if (!valid()) { close(); return; }
        if (!records.some(record => row.contains(record.target))) return;
        if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (valid() && popup) { content(); place(); } else close(); });
    });
    function move(event) {
        if (!config.preview || !fine.matches || !isThemeActive()) return;
        pointer = { x: event.clientX, y: event.clientY };
        if (event.buttons || event.pointerType === 'touch' || document.body.dataset.liuliScope !== 'main') { close(); return; }
        const candidate = getHoveredContact() || (event.target instanceof Element ? event.target.closest(selector) : null);
        if (dismissed && candidate !== dismissed) dismissed = null;
        if (dismissed && candidate === dismissed) return;
        if (candidate === row && identity === key(candidate)) return;
        close();
        if (!candidate) return;
        row = candidate; identity = key(row);
        timer = setTimeout(show, config.previewDelay);
    }
    const dismiss = () => { dismissed = row; close(); };
    listen(document, 'pointermove', move, { passive: true });
    listen(document, 'pointerdown', dismiss, true);
    listen(document, 'contextmenu', dismiss, true);
    listen(document, 'wheel', dismiss, { passive: true, capture: true });
    listen(document, 'scroll', dismiss, { passive: true, capture: true });
    listen(document, 'keydown', event => { if (event.key === 'Escape') dismiss(); });
    listen(document.documentElement, 'pointerleave', dismiss);
    listen(window, 'blur', dismiss); listen(window, 'resize', dismiss);
    const unsubscribeEffects = subscribeEffects(value => { config = value; close(); });
    const unsubscribeActivity = onThemeActivity(enabled => { if (!enabled) { dismissed = null; close(); } });
    listen(window, 'pagehide', () => { close(); unsubscribeEffects(); unsubscribeActivity(); for (const remove of listeners) remove(); }, { once: true });
}
