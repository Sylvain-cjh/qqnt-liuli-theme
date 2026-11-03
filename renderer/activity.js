// Native visibility supplements document.hidden when QQ disables throttling.
let nativeVisible = true, active = !document.hidden;
const subscribers = new Set();
// Resume maintenance after the first paint, one job per frame. Hiding cancels
// the queue immediately, including rapid minimize/restore cycles.
const resumeJobs = new Map();
let resumeFrame = 0, resumeTimer = 0, activityEpoch = 0;
function cancelResume() {
    cancelAnimationFrame(resumeFrame); clearTimeout(resumeTimer);
    resumeFrame = resumeTimer = 0; resumeJobs.clear();
}
function drainResume() {
    resumeFrame = 0;
    if (!active || !resumeJobs.size) return;
    const [key, callback] = resumeJobs.entries().next().value;
    resumeJobs.delete(key);
    try { callback(); } catch (error) { console.error('[liuli resume]', error); }
    if (resumeJobs.size) resumeFrame = requestAnimationFrame(drainResume);
}
export function afterThemePaint(key, callback) {
    if (!active) return;
    resumeJobs.set(key, callback);
    if (resumeFrame || resumeTimer) return;
    resumeFrame = requestAnimationFrame(() => {
        resumeFrame = 0;
        resumeTimer = setTimeout(() => { resumeTimer = 0; if (active) resumeFrame = requestAnimationFrame(drainResume); }, 0);
    });
}
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
    activityEpoch++;
    cancelResume();
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
    if (event.type === 'visibility') { activityEpoch++; nativeVisible = event.visible; update(); }
});
const initialEpoch = activityEpoch;
api?.themeInfo?.().then(info => { if (initialEpoch === activityEpoch && typeof info.windowVisible === 'boolean') { nativeVisible = info.windowVisible; update(); } }).catch(() => {});
document.addEventListener('visibilitychange', update);
if (document.body) update(); else document.addEventListener('DOMContentLoaded', update, { once: true });
window.addEventListener('pagehide', () => {
    nativeVisible = false; update(); cancelResume(); unsubscribeIPC?.(); subscribers.clear();
    document.removeEventListener('visibilitychange', update);
}, { once: true });
