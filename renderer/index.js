// QQ service, screenshot and preallocated windows do not need theme startup.
const supported = /(?:^|\/)index\.html$/i.test(location.pathname);
function shouldLoadTheme() {
    const route = location.hash;
    return !!route && !/^#\/(?:blank|image-viewer)(?:[/?#]|$)/i.test(route);
}
let loading, disposed = false, checking = false, unsubscribe;
const load = () => loading ||= import('./theme.js');
function stopWaiting() {
    unsubscribe?.(); unsubscribe = null;
    document.removeEventListener('visibilitychange', check);
    window.removeEventListener('hashchange', check);
}
async function check() {
    if (!supported || disposed || loading || checking || !shouldLoadTheme()) return;
    checking = true;
    try {
        const api = window.liuli_api;
        const visible = api?.themeInfo ? (await api.themeInfo()).windowVisible : !document.hidden;
        if (!disposed && visible && shouldLoadTheme()) { stopWaiting(); await load(); }
    } catch (error) { console.error('[liuli entry]', error); }
    finally { checking = false; }
}
if (supported) {
    unsubscribe = window.liuli_api?.onThemeUpdate?.(event => {
        if (event.type === 'visibility' && event.visible) check();
    });
    document.addEventListener('visibilitychange', check);
    window.addEventListener('hashchange', check);
    check();
}
window.addEventListener('pagehide', () => { disposed = true; stopWaiting(); }, { once: true });
export async function onSettingWindowCreated(view) {
    if (supported && !disposed) { stopWaiting(); return (await load()).onSettingWindowCreated(view); }
}
