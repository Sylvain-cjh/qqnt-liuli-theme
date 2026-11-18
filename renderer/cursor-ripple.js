import { loadEffects, subscribeEffects } from './effect-settings.js';
import { isThemeActive, onThemeActivity } from './activity.js';

export function installCursorRipple() {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let enabled = loadEffects().cursorRipple;
    let ripple;

    function clear() {
        ripple?.remove();
        ripple = null;
    }

    function press(event) {
        if (event.pointerType !== 'mouse' || event.button !== 0 || !event.isTrusted) return;
        clear();
        const ring = document.createElement('span');
        ring.className = 'liuli-cursor-ripple';
        ring.setAttribute('aria-hidden', 'true');
        ring.style.left = event.clientX + 'px';
        ring.style.top = event.clientY + 'px';
        ring.addEventListener('animationend', () => {
            if (ripple === ring) clear();
        }, { once: true });
        ripple = ring;
        document.body.append(ring);
    }

    function sync() {
        if (enabled && isThemeActive() && !reducedMotion.matches) {
            document.addEventListener('pointerdown', press, { capture: true, passive: true });
        } else {
            document.removeEventListener('pointerdown', press, true);
            clear();
        }
    }

    const unsubscribeEffects = subscribeEffects(config => {
        enabled = config.cursorRipple;
        sync();
    });
    const unsubscribeActivity = onThemeActivity(sync);
    reducedMotion.addEventListener('change', sync);
    window.addEventListener('pagehide', () => {
        enabled = false;
        sync();
        unsubscribeEffects();
        unsubscribeActivity();
        reducedMotion.removeEventListener('change', sync);
    }, { once: true });
    sync();
}
