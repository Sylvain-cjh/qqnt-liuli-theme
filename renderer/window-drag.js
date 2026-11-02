import { isThemeActive, onThemeActivity } from './activity.js';
import { loadEffects, subscribeEffects } from './effect-settings.js';
export function installDragHandle(handle, notify) {
    const api = window.liuli_api;
    const shape = document.createElement('span');
    shape.className = 'liuli-drag-shape';
    handle.appendChild(shape);
    if (!api?.startWindowDrag) return;
    handle.dataset.interactive = '1';
    let pointer = null, frame = 0, started = false;
    let options = loadEffects();
    const unsubscribe = subscribeEffects(next => { options = next; });
    const thickness = { value: 0, velocity: 0 };
    let lastFrame = 0, previous = null, movedAt = 0, vx = 0, vy = 0, needsMove = false;
    const left = { x: 0, y: 0, dx: 0, dy: 0 }, right = { x: 0, y: 0, dx: 0, dy: 0 };
    let pullX = 0, pullY = 0, direction = 1;
    const samples = [];
    const limit = (value, maximum) => Math.max(-maximum, Math.min(maximum, value));
    function wake() {
        if (!isThemeActive()) return;
        if (!frame) { lastFrame = performance.now(); frame = requestAnimationFrame(move); }
    }
    const move = now => {
        frame = 0;
        const dt = Math.min(32, Math.max(1, now - lastFrame)) / 1000;
        lastFrame = now;
        if (started && pointer !== null && needsMove) { api.moveWindowDrag(); needsMove = false; }
        if (pointer === null || now - movedAt > 40) { vx *= Math.exp(-dt / .07); vy *= Math.exp(-dt / .07); }
        const speed = Math.hypot(vx, vy);
        const decay = Math.exp(-dt / (pointer === null ? .045 : .11));
        pullX *= decay; pullY *= decay;
        if (Math.abs(vx) > .02) direction = Math.sign(vx);
        samples.push({ at: now, x: pullX, y: pullY });
        while (samples.length > 2 && samples[1].at <= now - 55) samples.shift();
        while (samples.length > 16) samples.shift();
        const tail = samples[0] || { x: 0, y: 0 };
        const steps = Math.ceil(dt / .008), h = dt / steps;
        for (let i = 0; i < steps; i++) {
            for (const end of [left, right]) {
                const leading = end === (direction < 0 ? left : right);
                const stiffness = leading ? 1050 : 340, damping = leading ? 43 : 22;
                end.dx += (((leading ? pullX : tail.x) - end.x) * stiffness - end.dx * damping) * h;
                end.dy += (((leading ? pullY : tail.y) - end.y) * stiffness - end.dy * damping) * h;
                end.x = limit(end.x + end.dx * h, 7);
                end.y = limit(end.y + end.dy * h, 3);
            }
        }
        const extension = limit((right.x - left.x) / 56, .16);
        const slope = limit((right.y - left.y) / 56, .065);
        const centerX = limit((left.x + right.x) / 2, 4);
        const centerY = limit((left.y + right.y) / 2, 2);
        const thicknessTarget = limit((-extension * .85 + (Math.abs(vy) - Math.abs(vx)) * .04) * options.jelly / .55, .18);
        for (let i = 0; i < steps; i++) {
            thickness.velocity += ((thicknessTarget - thickness.value) * 650 - thickness.velocity * 29) * h;
            thickness.value += thickness.velocity * h;
        }
        shape.style.transform = 'matrix(' + (1 + extension) + ',' + slope + ',' + (-slope * .15) + ',' + (1 + thickness.value) + ',' + centerX + ',' + centerY + ')';
        const energy = Math.abs(thickness.value) + Math.abs(thickness.velocity) + [left, right].reduce((sum, end) => sum + Math.abs(end.x) + Math.abs(end.y) + Math.abs(end.dx) + Math.abs(end.dy), 0);
        if (speed > .005 || Math.abs(pullX) + Math.abs(pullY) > .02 || energy > .03) frame = requestAnimationFrame(move);
        else {
            shape.style.removeProperty('transform'); pullX = pullY = 0; samples.length = 0;
            for (const end of [left, right]) end.x = end.y = end.dx = end.dy = 0;
            thickness.value = thickness.velocity = 0;
        }
    };
    function finish() {
        const id = pointer;
        pointer = null; started = false;
        needsMove = false; previous = null;
        handle.removeAttribute('data-pressed');
        if (id !== null) {
            api.stopWindowDrag();
            if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
        }
        if (id !== null) wake();
    }
    handle.addEventListener('pointerdown', async event => {
        if (!isThemeActive() || event.button !== 0 || !event.isPrimary || pointer !== null) return;
        event.preventDefault(); event.stopPropagation();
        pointer = event.pointerId;
        previous = { x: event.screenX, y: event.screenY, at: performance.now() };
        vx = vy = 0; pullX = pullY = 0;
        samples.length = 0;
        samples.push({ at: performance.now() - 60, x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 });
        handle.setPointerCapture(pointer);
        handle.dataset.pressed = '1';
        try {
            const ok = await api.startWindowDrag(event.screenX, event.screenY);
            if (pointer !== event.pointerId) return;
            if (!ok) { finish(); return; }
            started = true;
            needsMove = true; wake();
        } catch (error) {
            finish();
            notify(String(error?.message).includes('No handler registered')
                ? '拖动交互接口尚未载入，请在 LiteLoader 中重新加载琉璃。'
                : error.message || String(error));
        }
    });
    handle.addEventListener('pointermove', event => {
        if (event.pointerId !== pointer) return;
        if (!(event.buttons & 1)) { finish(); return; }
        const now = performance.now();
        if (previous && (event.screenX !== previous.x || event.screenY !== previous.y)) {
            const dt = Math.max(4, now - previous.at);
            const gain = options.jelly / .55;
            const mx = event.screenX - previous.x, my = event.screenY - previous.y;
            pullX = limit(pullX + mx * .42 * gain, 8);
            pullY = limit(pullY + my * .25 * gain, 3);
            const leading = mx < 0 || (mx === 0 && direction < 0) ? left : right;
            leading.x = limit(leading.x + mx * .14 * gain, 7);
            leading.y = limit(leading.y + my * .1 * gain, 3);
            vx += (((event.screenX - previous.x) / dt) - vx) * .7;
            vy += (((event.screenY - previous.y) / dt) - vy) * .7;
            movedAt = now;
            previous = { x: event.screenX, y: event.screenY, at: now };
        }
        needsMove = true; wake();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) handle.addEventListener(type, finish);
    const unsubscribeActivity = onThemeActivity(enabled => {
        if (enabled) return;
        finish(); cancelAnimationFrame(frame); frame = 0;
        pullX = pullY = vx = vy = 0; samples.length = 0;
        for (const end of [left, right]) end.x = end.y = end.dx = end.dy = 0;
        thickness.value = thickness.velocity = 0; shape.style.removeProperty('transform');
    });
    window.addEventListener('blur', finish);
    window.addEventListener('pagehide', () => { finish(); cancelAnimationFrame(frame); frame = 0; unsubscribe(); unsubscribeActivity(); }, { once: true });
}
