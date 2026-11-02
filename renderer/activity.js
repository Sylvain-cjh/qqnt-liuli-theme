// Native visibility supplements document.hidden when QQ disables throttling.
let nativeVisible = true, active = !document.hidden;
const subscribers = new Set();
let surfaces = [];
export const isThemeActive = () => active;
export function refreshSurfaceState() {
    if (!active) {
        if (surfaces.length || !document.body) return;
        for (const node of document.querySelectorAll('.recent-contact:not(.liuli-contact-projection), .group-box, .container-sidebar, .liuli-panel')) {
            const fields = ['backdrop-filter','-webkit-backdrop-filter','box-shadow'].map(property => ({ property,
                value: node.style.getPropertyValue(property), priority: node.style.getPropertyPriority(property) }));
            surfaces.push({ node: new WeakRef(node), fields });
            for (const field of fields) node.style.setProperty(field.property, 'none', 'important');
        }
    } else {
        for (const record of surfaces) {
            const node = record.node.deref();
            if (!node?.isConnected) continue;
            for (const field of record.fields) if (node.style.getPropertyValue(field.property) === 'none') {
                if (field.value) node.style.setProperty(field.property, field.value, field.priority);
                else node.style.removeProperty(field.property);
            }
        }
        surfaces = [];
    }
}
function update() {
    const next = nativeVisible && !document.hidden;
    document.body?.toggleAttribute('data-liuli-idle', !next);
    if (next === active) { refreshSurfaceState(); return; }
    active = next;
    refreshSurfaceState();
    for (const callback of [...subscribers]) {
        try { callback(active); } catch (error) { console.error('[liuli activity]', error); }
    }
}
export function onThemeActivity(callback) { subscribers.add(callback); return () => subscribers.delete(callback); }
export function activeInterval(callback, delay) {
    let timer = 0;
    const change = enabled => {
        clearInterval(timer); timer = 0;
        if (enabled) timer = setInterval(() => { if (active) callback(); }, delay);
    };
    const unsubscribe = onThemeActivity(change); change(active);
    return () => { unsubscribe(); clearInterval(timer); };
}
const api = window.liuli_api;
const unsubscribeIPC = api?.onThemeUpdate?.(event => {
    if (event.type === 'visibility') { nativeVisible = event.visible; update(); }
});
api?.themeInfo?.().then(info => { if (typeof info.windowVisible === 'boolean') { nativeVisible = info.windowVisible; update(); } }).catch(() => {});
document.addEventListener('visibilitychange', update);
if (document.body) update(); else document.addEventListener('DOMContentLoaded', update, { once: true });
window.addEventListener('pagehide', () => {
    nativeVisible = false; update(); unsubscribeIPC?.(); subscribers.clear();
    document.removeEventListener('visibilitychange', update);
}, { once: true });
