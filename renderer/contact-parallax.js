import { loadEffects, subscribeEffects } from './effect-settings.js';
import { isThemeActive, onThemeActivity, afterThemePaint, fastResumeEnabled } from './activity.js';
let hoveredRow = () => null;
export const getHoveredContact = () => hoveredRow();
// Pointer coordinates use the resting row bounds, never the transformed bounds.
export function installContactParallax() {
    const selector = '.recent-contact .recent-contact-item:not([data-liuli-projection])';
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    let options = loadEffects(), scale = options.scale, expansion = (scale - 1) / 2;
    const layout = { styles: new Map() };
    const offsets = new Map();
    const spacing = new Map();
    let layoutRoot = null, layoutRows = null, geometryDirty = false, hoverAfter = 0;
    let lastFrame = 0;
    let active = null, frame = 0;
    hoveredRow = () => active?.row || null;
    const returning = new Map();
    const cards = new Map();
    const dirtyCards = new Set();
    const keyOf = row => row.getAttribute('data-contact-id') || row;
    function transition(state, phase) {
        state.phase = phase;
        state.goal = phase === 'entering' || phase === 'hovered' ? 1 : 0;
        if (phase === 'leaving') returning.set(state, true); else returning.delete(state);
        if (phase !== 'disposed') state.row.setAttribute('data-liuli-depth', phase === 'leaving' ? 'return' : 'active');
    }
    const listeners = [];
    const clamp = n => Math.max(-1, Math.min(1, n));
    function retainRow(state) {
        if (state.row.isConnected && state.row.getAttribute('data-contact-id') === state.contactId) return true;
        if (!state.contactId) return false;
        const row = [...document.querySelectorAll(selector)].find(row => row.getAttribute('data-contact-id') === state.contactId);
        if (!row) return false;
        releaseStyles(state);
        state.row = row;
        own(state, row, 'opacity', '0');
        const bounds = row.getBoundingClientRect(); bounds.y -= offsets.get(row) || 0;
        state.bounds = bounds; state.overlay.style.left = `${bounds.left}px`;
        dirtyCards.add(state);
        return true;
    }
    function syncProjection(state, animate = false) {
        if (!state.row.isConnected || state.row.getAttribute('data-contact-id') !== state.contactId) {
            if (active === state) reset(true);
            else restore(state);
            return;
        }
        const selected = state.row.classList.contains('recent-contact-item--selected');
        state.pinned = state.row.classList.contains('recent-contact-item--top');
        const visual = state.row.cloneNode(true);
        visual.setAttribute('data-liuli-projection', '');
        visual.removeAttribute('id');
        for (const child of visual.querySelectorAll('[id]')) child.removeAttribute('id');
        visual.style.cssText += `;position:relative!important;inset:auto!important;margin:0!important;width:${state.bounds.width}px!important;height:${state.bounds.height}px!important;min-height:0!important;max-height:none!important;zoom:${scale}!important;transform:none!important;translate:none!important;opacity:1!important;transition:none!important;pointer-events:none!important;`;
        const computed = getComputedStyle(state.row);
        for (const property of computed) {
            if (property.startsWith('--')) state.overlay.style.setProperty(property, computed.getPropertyValue(property));
        }
        state.selectionAnimation?.cancel();
        state.overlay.replaceChildren(visual);
        if (animate && selected && !state.selected) state.selectionStarted = performance.now();
        if (!selected) state.selectionStarted = null;
        const elapsed = state.selectionStarted == null ? 380 : performance.now() - state.selectionStarted;
        if (selected && elapsed < 380 && visual.animate) {
            const dy = state.selectionOrigin ? (state.selectionOrigin.top - state.bounds.top) / scale : 0;
            state.selectionAnimation = visual.animate([
                { opacity: 0.35, transform: `translateY(${dy}px) scale(.96)` },
                { opacity: 1, transform: 'translateY(0) scale(1)' }
            ], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::before' });
            state.selectionAnimation.currentTime = elapsed;
        }
        state.selected = selected;
        const current = state.row.parentElement.querySelector('.recent-contact-item--selected');
        if (current && current !== state.row) state.selectionOrigin = current.getBoundingClientRect();
    }
    const listen = (target, type, handler, options) => {
        target.addEventListener(type, handler, options);
        listeners.push(() => target.removeEventListener(type, handler, options));
    };
    function own(state, node, property, value) {
        if (!node) return;
        let fields = state.styles.get(node);
        if (!fields) state.styles.set(node, fields = new Map());
        let record = fields.get(property);
        if (!record) {
            record = { node, property, value: node.style.getPropertyValue(property),
                priority: node.style.getPropertyPriority(property), written: '' };
            fields.set(property, record);
        }
        if (record.input === value) return;
        record.input = value;
        node.style.setProperty(property, value, 'important');
        // CSSOM normalizes decimals and shorthand syntax. Compare its serialized
        // value during cleanup, rather than the unnormalized input string.
        record.written = node.style.getPropertyValue(property);
    }
    function releaseFields(fields) {
        for (const r of fields.values()) {
            if (r.node.style.getPropertyValue(r.property) !== r.written) continue;
            if (r.value) r.node.style.setProperty(r.property, r.value, r.priority);
            else r.node.style.removeProperty(r.property);
        }
    }
    function releaseStyles(state) {
        for (const fields of state.styles.values()) releaseFields(fields);
        state.row?.removeAttribute('data-liuli-depth');
        state.styles.clear();
    }
    function restore(state) {
        // Returning states are advanced by the shared frame loop.
        returning.delete(state);
        state.phase = 'disposed';
        if (cards.get(state.key) === state) cards.delete(state.key);
        dirtyCards.delete(state);
        state.selectionAnimation?.cancel();
        state.exitAnimation?.cancel();
        releaseStyles(state);
        state.overlay?.remove();
    }
    function wake() {
        if (!isThemeActive()) return;
        if (!frame) { lastFrame = performance.now(); frame = requestAnimationFrame(draw); }
    }
    function reset(immediate = false) {
        if (!active) return;
        const state = active;
        active = null;
        if (immediate) restore(state);
        else { transition(state, 'leaving'); wake(); }
    }
    function enter(row) {
        reset();
        const existing = cards.get(keyOf(row));
        if (existing) {
            active = existing; retainRow(existing); transition(existing, 'entering'); wake(); return;
        }
        const bounds = row.getBoundingClientRect();
        const shifted = offsets.get(row) || 0;
        bounds.y -= shifted;
        if (!bounds.width || !bounds.height) return;
        // Preserve native positioning without freezing an in-flight entrance animation.
        const transform = row.style.getPropertyValue('transform') || 'none';
        const state = { row, bounds, base: transform === 'none' ? 'none' : transform,
            progress: 0, eased: 0, goal: 1, rx: 0, ry: 0, renderTop: bounds.top, pinUntil: 0,
            styles: new Map(), x: 0, y: 0, contactId: row.getAttribute('data-contact-id'),
            selected: row.classList.contains('recent-contact-item--selected'),
            pinned: row.classList.contains('recent-contact-item--top'),
            selectionOrigin: row.parentElement.querySelector('.recent-contact-item--selected')?.getBoundingClientRect() };
        active = state;
        state.key = keyOf(row); cards.set(state.key, state); transition(state, 'entering');
        // One shared list observer handles all projected cards.
        row.setAttribute('data-liuli-depth', 'active');
        const overlay = document.createElement('div');
        overlay.className = 'recent-contact liuli-contact-projection';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('popover', 'manual');
        const computed = getComputedStyle(row);
        for (const property of computed) {
            if (property.startsWith('--')) overlay.style.setProperty(property, computed.getPropertyValue(property));
        }
        overlay.style.cssText += `;position:fixed!important;inset:auto!important;left:${bounds.left}px!important;top:${bounds.top - bounds.height * expansion}px!important;width:${bounds.width * scale}px!important;height:${bounds.height * scale}px!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;overflow:visible!important;pointer-events:none!important;z-index:2147483000!important;transition:none!important;transform-origin:left center;transform:perspective(900px) scale(${1 / scale});`;
        document.body.append(overlay);
        if (overlay.showPopover) overlay.showPopover();
        state.overlay = overlay;
        syncProjection(state);
        own(state, row, 'opacity', '0');
        wake();
    }
    function draw(now) {
        frame = 0;
        if (!isThemeActive()) { clearForScroll(); return; }
        if (geometryDirty) {
            geometryDirty = false;
            const positions = [...cards.values()].filter(retainRow).map(state => ({ state, rect: state.row.getBoundingClientRect() }));
            for (const { state, rect } of positions) {
                rect.y -= offsets.get(state.row) || 0;
                state.bounds = rect;
                state.overlay.style.left = `${rect.left}px`;
            }
        }
        for (const state of dirtyCards) {
            if (state.phase === 'disposed') continue;
            if (!retainRow(state)) { restore(state); if (active === state) active = null; }
            else syncProjection(state, true);
        }
        dirtyCards.clear();
        const dt = Math.min(40, Math.max(0, now - lastFrame)); lastFrame = now;
        const states = [...cards.values()];
        let moving = false;
        for (const state of states) {
            if (!retainRow(state)) { restore(state); if (active === state) active = null; continue; }
            state.progress = Math.max(0, Math.min(1, state.progress + (state.goal ? dt / options.enterMs : -dt / options.exitMs)));
            if (state.goal && state.progress === 1 && state.phase !== 'hovered') transition(state, 'hovered');
            const t = state.progress;
            state.eased = t * t * (3 - 2 * t);
            const follow = 1 - Math.exp(-dt / 65);
            state.rx += ((state.goal ? -state.y * 9 * options.tilt : 0) - state.rx) * follow;
            state.ry += ((state.goal ? state.x * 7 * options.tilt : 0) - state.ry) * follow;
            if (!state.goal && t === 0) { restore(state); continue; }
            if (state.progress !== state.goal || Math.abs(state.rx - (state.goal ? -state.y * 9 * options.tilt : 0)) > .01 || Math.abs(state.ry - (state.goal ? state.x * 7 * options.tilt : 0)) > .01) moving = true;
        }
        const live = states.filter(state => state.row.isConnected && (state === active || returning.has(state)));
        const root = live[0]?.row.parentElement || layoutRoot;
        if (!root) {
            releaseStyles(layout); offsets.clear(); spacing.clear(); return;
        }
        if (layoutRoot !== root) layoutRows = null;
        layoutRoot = root;
        const rows = layoutRows ||= [...root.querySelectorAll(selector)].filter(row => !row.closest('.viewport-list__measure'));
        for (const row of rows) {
            let above = 0, below = 0;
            for (const state of live) {
                if (row === state.row) continue;
                const extra = options.spacing ? (state.bounds.height * expansion + 4) * state.eased : 0;
                if (row.compareDocumentPosition(state.row) & Node.DOCUMENT_POSITION_FOLLOWING) above = options.shareSpace ? Math.max(above, extra) : above + extra;
                else below = options.shareSpace ? Math.max(below, extra) : below + extra;
            }
            const target = below - above;
            const motion = spacing.get(row) || { value: offsets.get(row) || 0, releaseAt: 0 };
            const shrinking = Math.abs(target) < Math.abs(motion.value) - .01 && target * motion.value >= 0;
            if (!shrinking) motion.releaseAt = 0;
            else if (!motion.releaseAt) motion.releaseAt = now + options.holdMs;
            if (!shrinking || now >= motion.releaseAt) motion.value += (target - motion.value) * (1 - Math.exp(-dt / (shrinking ? 135 : 60)));
            if (Math.abs(target - motion.value) < .02) motion.value = target;
            const shift = motion.value;
            spacing.set(row, motion);
            if (Math.abs(target - shift) > .02) moving = true;
            own(layout, row, 'transition', 'none');
            own(layout, row, 'translate', '0px ' + shift + 'px');
            offsets.set(row, shift);
        }
        for (const state of live) {
            state.renderTop += (state.bounds.top - state.renderTop) * (1 - Math.exp(-dt / 85));
            state.overlay.style.top = `${state.renderTop - state.bounds.height * expansion}px`;
            if (Math.abs(state.renderTop - state.bounds.top) > .05) moving = true;
            const actualScale = 1 + (scale - 1) * state.eased;
            const shift = offsets.get(state.row) || 0;
            state.overlay.style.transform = 'translateY(' + shift + 'px) perspective(900px) rotateX(' + state.rx + 'deg) rotateY(' + state.ry + 'deg) scale(' + actualScale / scale + ')';
        }
        if (moving) frame = requestAnimationFrame(draw);
        else if (!live.length) { releaseStyles(layout); offsets.clear(); spacing.clear(); layoutRoot = layoutRows = null; }
    }
    function move(event) {
        if (!options.enabled || !isThemeActive()) return;
        if (performance.now() < hoverAfter) return;
        if (!observedList?.isConnected) observeList();
        if (event.buttons && active) return;
        if (event.pointerType === 'touch' || !fine.matches || event.buttons ||
            document.body?.dataset.liuliScope !== 'main') { reset(); return; }
        const hit = event.target instanceof Element ? event.target.closest(selector) : null;
        if (active) {
            const b = active.bounds;
            const inside = event.clientX >= b.left && event.clientX <= b.left + b.width * (1 + (scale - 1) * active.eased) &&
                event.clientY >= b.top + (offsets.get(active.row) || 0) - b.height * expansion * active.eased && event.clientY <= b.bottom + (offsets.get(active.row) || 0) + b.height * expansion * active.eased;
            if ((!inside && performance.now() > active.pinUntil) || !retainRow(active)) reset();
        }
        if (!active && hit) {
            enter(hit);
            if (active) {
                const b = active.bounds;
                if (event.clientX < b.left || event.clientX > b.right ||
                    event.clientY < b.top + (offsets.get(active.row) || 0) || event.clientY > b.bottom + (offsets.get(active.row) || 0)) reset(true);
            }
        }
        if (!active) return;
        const b = active.bounds;
        active.x = clamp((event.clientX - b.left) / b.width * 2 - 1);
        active.y = clamp((event.clientY - b.top - (offsets.get(active.row) || 0)) / b.height * 2 - 1);
        wake();
    }
    listen(document, 'pointermove', move, { passive: true });
    // The projection is visual only. Route clicks in its enlarged overhang to
    // the real Vue row, retaining QQ's existing click/context-menu handlers.
    for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu']) {
        listen(document, type, event => {
            if (active && event.isTrusted && (type === 'pointerdown' || type === 'mousedown')) active.pinUntil = performance.now() + 220;
            if (!active || active.row.contains(event.target) || !event.isTrusted) return;
            const b = active.bounds;
            if (event.clientX < b.left || event.clientX > b.left + b.width * (1 + (scale - 1) * active.eased) ||
                event.clientY < b.top + (offsets.get(active.row) || 0) - b.height * expansion * active.eased || event.clientY > b.bottom + (offsets.get(active.row) || 0) + b.height * expansion * active.eased) return;
            const row = active.row;
            event.preventDefault();
            event.stopImmediatePropagation();
            const EventType = type.startsWith('pointer') ? PointerEvent : MouseEvent;
            row.dispatchEvent(new EventType(type, { bubbles: true, cancelable: true,
                pointerId: event.pointerId, pointerType: event.pointerType, isPrimary: event.isPrimary,
                clientX: b.left + b.width / 2, clientY: b.top + b.height / 2,
                button: event.button, buttons: event.buttons, detail: event.detail,
                ctrlKey: event.ctrlKey, shiftKey: event.shiftKey, altKey: event.altKey, metaKey: event.metaKey }));
        }, true);
    }
    listen(document, 'pointerout', event => { if (!event.relatedTarget) reset(); }, { passive: true });
    for (const type of ['pointercancel', 'dragstart', 'contextmenu']) listen(document, type, () => reset());
    function clearForScroll() {
        reset(true);
        for (const state of [...returning.keys()]) restore(state);
        cancelAnimationFrame(frame); frame = 0;
        releaseStyles(layout); offsets.clear(); spacing.clear(); layoutRoot = layoutRows = null;
        geometryDirty = false;
        dirtyCards.clear();
    }
    // Clear before wheel scrolling changes native virtual-list geometry. Scroll
    // also covers scrollbar dragging, keyboard navigation and programmatic moves.
    const isListScroll = event => event.target instanceof Element &&
        !!event.target.closest('.recent-contact:not(.liuli-contact-projection)');
    listen(document, 'wheel', event => { if (isListScroll(event)) clearForScroll(); }, { capture: true, passive: true });
    listen(document, 'scroll', event => { if (isListScroll(event)) clearForScroll(); }, { capture: true, passive: true });
    listen(window, 'resize', clearForScroll);
    listen(window, 'blur', clearForScroll);
    listen(document, 'visibilitychange', () => { if (document.hidden) clearForScroll(); });
    listen(fine, 'change', clearForScroll);
    const unsubscribeEffects = subscribeEffects(next => {
        clearForScroll(); options = next; scale = next.scale; expansion = (scale - 1) / 2;
    });
    let reorderFrame = 0, selectedSnapshot = null, reorderAnimation = null, reorderDelta = 0, scrollAt = 0;
    const sampleSelected = () => {
        reorderFrame = 0;
        const row = document.querySelector('.recent-contact:not(.liuli-contact-projection) .recent-contact-item--selected');
        if (!row) { selectedSnapshot = null; return; }
        const rect = row.getBoundingClientRect();
        const key = row.getAttribute('data-contact-id') || row;
        if ([...returning.keys(), ...(active ? [active] : [])].some(state => state.row === row)) {
            selectedSnapshot = { key, top: rect.top - (offsets.get(row) || 0) };
            return;
        }
        const timing = reorderAnimation?.effect?.getComputedTiming();
        const residual = timing?.progress == null ? 0 : reorderDelta * (1 - timing.progress);
        if (selectedSnapshot?.key === key && performance.now() - scrollAt > 160) {
            const delta = selectedSnapshot.top + residual - (rect.top - residual);
            if (Math.abs(delta) > 1 && Math.abs(delta) < innerHeight) {
                reorderAnimation?.cancel();
                reorderDelta = delta;
                reorderAnimation = row.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
                    { duration: 280, easing: 'cubic-bezier(.22,1,.36,1)', composite: 'add' });
                selectedSnapshot = { key, top: rect.top - residual };
                return;
            }
        }
        selectedSnapshot = { key, top: rect.top - residual };
    };
    const reorderObserver = new MutationObserver(records => {
        if (!isThemeActive()) return;
        records = records.filter(record => {
            const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
            return target?.closest('.recent-contact:not(.liuli-contact-projection)') && !target.closest('.liuli-contact-projection');
        });
        for (const record of records) {
            const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
            const row = target?.closest(selector);
            const state = row && cards.get(keyOf(row));
            if (state && (record.type !== 'attributes' || target !== row ||
                row.classList.contains('recent-contact-item--selected') !== state.selected ||
                row.classList.contains('recent-contact-item--top') !== state.pinned)) dirtyCards.add(state);
            if (record.attributeName === 'data-contact-id') {
                for (const card of cards.values()) if (card.row === target && card.contactId !== target.getAttribute('data-contact-id')) dirtyCards.add(card);
            }
        }
        if (dirtyCards.size || [...cards.values()].some(state => !state.row.isConnected)) wake();
        const structural = records.some(record => record.type === 'childList' &&
            record.target instanceof Element && (record.target === layoutRoot || record.target.matches('.viewport-list__inner')) &&
            record.target.closest('.recent-contact:not(.liuli-contact-projection)'));
        const selection = records.some(record => record.type === 'attributes' &&
            record.target.matches('.recent-contact-item:not([data-liuli-projection])') &&
            record.target.classList.contains('recent-contact-item--selected'));
        if (!structural && !selection) return;
        if (structural) {
            layoutRows = null;
            for (const [node, fields] of layout.styles) if (!node.isConnected) {
                releaseFields(fields);
                layout.styles.delete(node);
            }
            for (const row of offsets.keys()) if (!row.isConnected) { offsets.delete(row); spacing.delete(row); }
            if (cards.size) { geometryDirty = true; wake(); }
        }
        if (!reorderFrame) reorderFrame = requestAnimationFrame(sampleSelected);
    });
    let observedList = null;
    function observeList() {
        if (!isThemeActive()) return;
        const root = document.querySelector('.recent-contact:not(.liuli-contact-projection)');
        if (root === observedList) return;
        reorderObserver.disconnect(); observedList = root;
        reorderAnimation?.cancel(); reorderAnimation = null; selectedSnapshot = null;
        if (root) reorderObserver.observe(root, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-contact-id'] });
        for (const card of cards.values()) dirtyCards.add(card);
        if (cards.size) wake();
    }
    const rootObserver = new MutationObserver(() => {
        if (document.body.dataset.liuliScope === 'main' && !observedList?.isConnected) observeList();
    });
    observeList();
    if (isThemeActive()) rootObserver.observe(document.body, { childList: true, subtree: true });
    if (isThemeActive()) sampleSelected();
    const unsubscribeActivity = onThemeActivity(enabled => {
        clearForScroll(); reorderObserver.disconnect(); rootObserver.disconnect(); observedList = null;
        cancelAnimationFrame(reorderFrame); reorderFrame = 0;
        reorderAnimation?.cancel(); reorderAnimation = null; selectedSnapshot = null;
        if (enabled) {
            hoverAfter = performance.now() + 120;
            observeList();
            rootObserver.observe(document.body, { childList: true, subtree: true });
            if (fastResumeEnabled()) afterThemePaint('contact-selection', sampleSelected); else sampleSelected();
        }
    });
    listen(document, 'scroll', event => {
        if (!isListScroll(event)) return;
        scrollAt = performance.now(); hoverAfter = scrollAt + 100;
        reorderAnimation?.cancel(); reorderAnimation = null;
        if (!reorderFrame) reorderFrame = requestAnimationFrame(sampleSelected);
    }, { capture: true, passive: true });
    function dispose() {
        hoveredRow = () => null;
        unsubscribeEffects();
        unsubscribeActivity();
        clearForScroll();
        reorderObserver.disconnect(); rootObserver.disconnect(); observedList = null;
        cancelAnimationFrame(reorderFrame); reorderAnimation?.cancel();
        for (const remove of listeners) remove();
    }
    listen(window, 'pagehide', dispose, { once: true });
    return dispose;
}
