export function installDragHandle(handle, notify) {
    const api = window.liuli_api;
    const shape = document.createElement('span');
    shape.className = 'liuli-drag-shape';
    handle.appendChild(shape);
    if (!api?.startWindowDrag) return;
    handle.dataset.interactive = '1';
    let pointer = null, frame = 0, started = false;
    let lastFrame = 0, previous = null, movedAt = 0, vx = 0, vy = 0, needsMove = false;
    let x = 0, y = 0, dx = 0, dy = 0;
    function wake() {
        if (!frame) { lastFrame = performance.now(); frame = requestAnimationFrame(move); }
    }
    const move = now => {
        frame = 0;
        const dt = Math.min(32, Math.max(1, now - lastFrame)) / 1000;
        lastFrame = now;
        if (started && pointer !== null && needsMove) { api.moveWindowDrag(); needsMove = false; }
        if (pointer === null || now - movedAt > 40) { vx *= Math.exp(-dt / .07); vy *= Math.exp(-dt / .07); }
        const speed = Math.hypot(vx, vy);
        const strength = pointer === null ? 0 : Math.tanh(speed / 1.2);
        const tx = speed > .001 ? vx / speed * strength : 0;
        const ty = speed > .001 ? vy / speed * strength : 0;
        const steps = Math.ceil(dt / .008), h = dt / steps;
        for (let i = 0; i < steps; i++) {
            dx += ((tx - x) * 380 - dx * 34) * h;
            dy += ((ty - y) * 380 - dy * 34) * h;
            x += dx * h; y += dy * h;
        }
        const magnitude = Math.min(1, Math.hypot(x, y));
        const length = Math.hypot(x, y) || 1, nx = x / length, ny = y / length;
        const stretch = magnitude * .46, shear = stretch * nx * ny;
        shape.style.transform = `matrix(${1 + stretch * nx * nx},${shear},${shear},${1 + stretch * ny * ny},${nx * magnitude * 7},${ny * magnitude * 5})`;
        if (speed > .005 || Math.abs(x) + Math.abs(y) + Math.abs(dx) + Math.abs(dy) > .005) frame = requestAnimationFrame(move);
        else shape.style.removeProperty('transform');
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
        if (event.button !== 0 || !event.isPrimary || pointer !== null) return;
        event.preventDefault(); event.stopPropagation();
        pointer = event.pointerId;
        previous = { x: event.screenX, y: event.screenY, at: performance.now() };
        vx = vy = 0;
        handle.setPointerCapture(pointer);
        handle.dataset.pressed = '1';
        try {
            const ok = await api.startWindowDrag();
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
            vx += (((event.screenX - previous.x) / dt) - vx) * .35;
            vy += (((event.screenY - previous.y) / dt) - vy) * .35;
            movedAt = now;
            previous = { x: event.screenX, y: event.screenY, at: now };
        }
        needsMove = true; wake();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) handle.addEventListener(type, finish);
    window.addEventListener('blur', finish);
    window.addEventListener('pagehide', () => { finish(); cancelAnimationFrame(frame); frame = 0; }, { once: true });
}
