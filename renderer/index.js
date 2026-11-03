// QQ service, screenshot and preallocated windows do not need theme startup.
const supported = /(?:^|\/)index\.html$/i.test(location.pathname);
let loading, disposed = false, checking = false, unsubscribe;
const load = () => loading ||= import('./theme.js');
function stopWaiting() {
    unsubscribe?.(); unsubscribe = null;
    document.removeEventListener('visibilitychange', check);
}
async function check() {
    if (!supported || disposed || loading || checking) return;
    checking = true;
    try {
        const api = window.liuli_api;
        const visible = api?.themeInfo ? (await api.themeInfo()).windowVisible : !document.hidden;
        if (!disposed && visible) { stopWaiting(); await load(); }
    } catch (error) { console.error('[liuli entry]', error); }
    finally { checking = false; }
}
if (supported) {
    unsubscribe = window.liuli_api?.onThemeUpdate?.(event => {
        if (event.type === 'visibility' && event.visible) check();
    });
    document.addEventListener('visibilitychange', check);
    check();
}
window.addEventListener('pagehide', () => { disposed = true; stopWaiting(); }, { once: true });
export async function onSettingWindowCreated(view) {
    if (supported && !disposed) { stopWaiting(); return (await load()).onSettingWindowCreated(view); }
}
