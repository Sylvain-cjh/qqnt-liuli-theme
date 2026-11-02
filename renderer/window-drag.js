export function installDragHandle(handle, notify) {
    const api = window.liuli_api;
    if (!api?.startWindowDrag) return;
    handle.dataset.interactive = '1';
    let pointer = null, frame = 0, started = false;
    const move = () => {
        frame = 0;
        if (started && pointer !== null) api.moveWindowDrag();
    };
    function finish() {
        const id = pointer;
        pointer = null; started = false;
        cancelAnimationFrame(frame); frame = 0;
        handle.removeAttribute('data-pressed');
        if (id !== null) {
            api.stopWindowDrag();
            if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
        }
    }
    handle.addEventListener('pointerdown', async event => {
        if (event.button !== 0 || !event.isPrimary || pointer !== null) return;
        event.preventDefault(); event.stopPropagation();
        pointer = event.pointerId;
        handle.setPointerCapture(pointer);
        handle.dataset.pressed = '1';
        try {
            const ok = await api.startWindowDrag();
            if (pointer !== event.pointerId) return;
            if (!ok) { finish(); return; }
            started = true;
            if (!frame) frame = requestAnimationFrame(move);
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
        if (started && !frame) frame = requestAnimationFrame(move);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) handle.addEventListener(type, finish);
    window.addEventListener('blur', finish);
    window.addEventListener('pagehide', finish, { once: true });
}
