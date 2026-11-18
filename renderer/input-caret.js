import { loadEffects, subscribeEffects } from './effect-settings.js';
import { isThemeActive, onThemeActivity } from './activity.js';

export function installInputCaret() {
    const selector = '.chat-input-area [contenteditable="true"]';
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let enabled = loadEffects().animatedCaret;
    let editor, caret, blink, lastRect, composing, frame = 0;

    function hide() {
        editor?.removeAttribute('data-liuli-animated-caret');
        caret?.remove();
        blink?.cancel();
        editor = caret = blink = lastRect = null;
    }

    function update() {
        frame = 0;
        if (!enabled || !isThemeActive() || reducedMotion.matches || composing || !document.hasFocus()) {
            hide();
            return;
        }
        const activeEditor = document.activeElement?.closest(selector);
        const selection = window.getSelection();
        if (!activeEditor || !selection?.isCollapsed || !selection.rangeCount || !activeEditor.contains(selection.anchorNode)) {
            hide();
            return;
        }
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        const bounds = activeEditor.getBoundingClientRect();
        if (!rect.height || rect.left < bounds.left - 1 || rect.left > bounds.right + 1 ||
            rect.top < Math.max(0, bounds.top) - 1 || rect.bottom > Math.min(innerHeight, bounds.bottom) + 1) {
            hide();
            return;
        }
        if (activeEditor !== editor) {
            hide();
            editor = activeEditor;
            caret = document.createElement('span');
            caret.className = 'liuli-input-caret';
            caret.setAttribute('aria-hidden', 'true');
            document.body.append(caret);
            editor.setAttribute('data-liuli-animated-caret', '');
        }
        const nearby = lastRect && Math.abs(rect.left - lastRect.left) <= 36 && Math.abs(rect.top - lastRect.top) <= 4;
        caret.style.transitionDuration = nearby ? '' : '0ms';
        caret.style.transform = 'translate(' + rect.left + 'px, ' + rect.top + 'px)';
        caret.style.height = rect.height + 'px';
        lastRect = rect;
        if (!blink) {
            blink = caret.animate([
                { opacity: 1, offset: 0 },
                { opacity: 1, offset: .5 },
                { opacity: .12, offset: .76 },
                { opacity: 1, offset: 1 }
            ], { duration: 1000, iterations: Infinity, easing: 'ease-in-out' });
        } else blink.currentTime = 0;
    }

    function schedule() {
        if (enabled && isThemeActive() && !reducedMotion.matches && !frame) frame = requestAnimationFrame(update);
    }

    function sync() {
        if (enabled && isThemeActive() && !reducedMotion.matches) schedule();
        else {
            cancelAnimationFrame(frame);
            frame = 0;
            composing = null;
            hide();
        }
    }

    const controller = new AbortController();
    const options = { signal: controller.signal };
    for (const type of ['selectionchange', 'input', 'focusin']) document.addEventListener(type, schedule, options);
    document.addEventListener('focusout', event => {
        if (composing === event.target) composing = null;
        if (editor === event.target) hide();
        schedule();
    }, options);
    document.addEventListener('compositionstart', event => {
        if (!event.target.closest?.(selector)) return;
        composing = event.target;
        hide();
    }, options);
    document.addEventListener('compositionend', () => { composing = null; schedule(); }, options);
    document.addEventListener('scroll', () => { if (editor) schedule(); }, { ...options, capture: true, passive: true });
    window.addEventListener('resize', schedule, options);
    window.addEventListener('focus', schedule, options);
    window.addEventListener('blur', hide, options);
    reducedMotion.addEventListener('change', sync, options);
    const unsubscribeEffects = subscribeEffects(config => {
        enabled = config.animatedCaret;
        sync();
    });
    const unsubscribeActivity = onThemeActivity(sync);
    window.addEventListener('pagehide', () => {
        enabled = false;
        sync();
        controller.abort();
        unsubscribeEffects();
        unsubscribeActivity();
    }, { once: true });
    sync();
}
