import { loadEffects, subscribeEffects } from './effect-settings.js';
import { isThemeActive, onThemeActivity } from './activity.js';

export function installInputCaret() {
    const selector = '.chat-input-area [contenteditable="true"]';
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let enabled = loadEffects().animatedCaret;
    let editor, caret, blink, lastRect, composing, frame = 0, settleFrame = 0;

    function hide() {
        editor?.removeAttribute('data-liuli-animated-caret');
        caret?.remove();
        blink?.cancel();
        editor = caret = blink = lastRect = null;
    }

    function caretRect(range, activeEditor) {
        // Use the editor's own position mapping after its document transaction.
        // During IME composition the DOM selection is newer than editor state.
        const view = activeEditor.pmViewDesc?.view;
        if (!composing && view && !view.isDestroyed && view.state?.selection.empty) {
            try {
                const mapped = view.coordsAtPos(view.state.selection.head);
                if (mapped.bottom > mapped.top) {
                    return { left: mapped.left, top: mapped.top,
                        height: mapped.bottom - mapped.top, bottom: mapped.bottom };
                }
            } catch {}
        }
        const rect = range.getBoundingClientRect();
        if (rect.height) return rect;

        // The editor can put the selection on a paragraph node before its
        // placeholder BR, where a collapsed range has no text box.
        const anchor = range.startContainer;
        let line = (anchor.nodeType === Node.ELEMENT_NODE ? anchor : anchor.parentElement)
            ?.closest('p, div');
        if (!line || !activeEditor.contains(line)) line = activeEditor;
        if (line === activeEditor && anchor === activeEditor) {
            const child = anchor.childNodes[range.startOffset] || anchor.lastChild;
            if (child?.nodeType === Node.ELEMENT_NODE && child.matches('p, div')) line = child;
        }
        if (line.textContent.replace(/[\u200B\uFEFF]/g, '').length ||
            line.querySelector('img, video, canvas, [contenteditable="false"]')) return null;

        const placeholder = line.querySelector('br');
        const breakRect = placeholder?.getBoundingClientRect();
        if (breakRect?.height) return breakRect;

        // A totally empty editor may have no BR yet. Use its first line box
        // without inserting a node into the editable document.
        const box = line.getBoundingClientRect();
        const style = getComputedStyle(line);
        const px = value => parseFloat(value) || 0;
        const fontSize = px(style.fontSize);
        if (!box.width || !fontSize) return null;
        const lineHeight = px(style.lineHeight) || fontSize * 1.2;
        const leftEdge = box.left + px(style.borderLeftWidth) + px(style.paddingLeft);
        const rightEdge = box.right - px(style.borderRightWidth) - px(style.paddingRight);
        const indent = px(style.textIndent);
        const rtl = style.direction === 'rtl';
        const alignment = style.textAlign;
        const left = alignment === 'center' ? (leftEdge + rightEdge) / 2 :
            (alignment === 'right' || (alignment === 'end' && !rtl) || (alignment === 'start' && rtl))
                ? rightEdge - indent : leftEdge + indent;
        const height = Math.min(lineHeight, fontSize * 1.2);
        const top = box.top + px(style.borderTopWidth) + px(style.paddingTop) + (lineHeight - height) / 2;
        return { left, top, height, bottom: top + height };
    }

    function update() {
        frame = 0;
        if (!enabled || !isThemeActive() || reducedMotion.matches || !document.hasFocus()) {
            hide();
            return;
        }
        const activeEditor = document.activeElement?.closest(selector);
        const selection = window.getSelection();
        if (!activeEditor || !selection?.isCollapsed || !selection.rangeCount || !activeEditor.contains(selection.anchorNode)) {
            hide();
            return;
        }
        const rect = caretRect(selection.getRangeAt(0), activeEditor);
        const bounds = activeEditor.getBoundingClientRect();
        if (!rect || rect.left < bounds.left - 1 || rect.left > bounds.right + 1 ||
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
        const moved = !lastRect || Math.abs(rect.left - lastRect.left) > .25 ||
            Math.abs(rect.top - lastRect.top) > .25 || Math.abs(rect.height - lastRect.height) > .25;
        const nearby = !composing && lastRect && Math.abs(rect.left - lastRect.left) <= 36 && Math.abs(rect.top - lastRect.top) <= 4;
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
        } else if (moved) blink.currentTime = 0;
        if (composing) { blink.pause(); blink.currentTime = 0; }
        else if (blink.playState === 'paused') blink.play();
    }

    function schedule() {
        if (enabled && isThemeActive() && !reducedMotion.matches && !frame) frame = requestAnimationFrame(update);
    }

    function sync() {
        if (enabled && isThemeActive() && !reducedMotion.matches) schedule();
        else {
            cancelAnimationFrame(frame);
            cancelAnimationFrame(settleFrame); settleFrame = 0;
            frame = 0;
            composing = null;
            hide();
        }
    }

    const controller = new AbortController();
    const options = { signal: controller.signal };
    for (const type of ['selectionchange', 'input', 'focusin', 'compositionupdate']) document.addEventListener(type, schedule, options);
    document.addEventListener('focusout', event => {
        if (composing === event.target) composing = null;
        if (editor === event.target) hide();
        schedule();
    }, options);
    document.addEventListener('compositionstart', event => {
        if (!event.target.closest?.(selector)) return;
        composing = event.target;
        lastRect = null;
        schedule();
    }, options);
    document.addEventListener('compositionend', event => {
        if (!event.target.closest?.(selector)) return;
        composing = null;
        lastRect = null;
        schedule();
        // QQ may commit the editor selection in the following rendering frame.
        cancelAnimationFrame(settleFrame);
        settleFrame = requestAnimationFrame(() => {
            settleFrame = requestAnimationFrame(() => { settleFrame = 0; schedule(); });
        });
    }, options);
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
