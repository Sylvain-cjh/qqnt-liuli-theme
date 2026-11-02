const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { BrowserWindow, ipcMain, app } = require('electron');
const root = path.resolve(__dirname, '..'), configKey = 'liuli-theme-hot-update';
let runtime, watcher, timer, loginUid = '', stopped = false;
const registry = globalThis[Symbol.for('liuli.theme.supervisor')] ||= { current: null };
registry.current?.dispose();
const changed = new Set();
const visibilityListeners = new Map();
const state = { enabled: LiteLoader.api.config.get(configKey, { enabled: true }).enabled !== false,
    loadedVersion: '', lastUpdate: '', error: '', watching: false };
const controls = ['themeInfo','themeReload','themeAuto','themeMemory'];
const business = ['selfUid','openDevTools','openExternal','diagExport','diagOpenPath','dragStart'];
const channel = name => 'LiteLoader.liuli.' + name;
const valid = event => !event.sender.isDestroyed() && event.senderFrame === event.sender.mainFrame && !!BrowserWindow.fromWebContents(event.sender);
function info() {
    let version = '';
    try { version = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')).version; } catch {}
    return { ...state, installedVersion: version };
}
function windows() {
    return BrowserWindow.getAllWindows().filter(window => {
        try { return !window.isDestroyed() && !window.webContents.isDestroyed() && ['file:', 'local:', 'app:'].includes(new URL(window.webContents.getURL()).protocol); }
        catch { return false; }
    });
}
function watchVisibility(window) {
    if (!window || window.isDestroyed() || visibilityListeners.has(window)) return;
    const contents = window.webContents;
    const send = () => {
        if (window.isDestroyed() || contents.isDestroyed()) return;
        try { contents.send(channel('themeUpdate'), { type: 'visibility', visible: window.isVisible() && !window.isMinimized() }); } catch {}
    };
    const remove = () => {
        for (const name of ['show','hide','minimize','restore']) window.removeListener(name, send);
        contents.removeListener('did-finish-load', send);
        window.removeListener('closed', remove); visibilityListeners.delete(window);
    };
    for (const name of ['show','hide','minimize','restore']) window.on(name, send);
    contents.on('did-finish-load', send); window.once('closed', remove);
    visibilityListeners.set(window, remove);
}
function report() { for (const window of windows()) { try { window.webContents.send(channel('themeUpdate'), { type: 'status', ...info() }); } catch {} } }
function clean() {
    try { runtime?.dispose?.(); } finally {
        for (const name of business) ipcMain.removeHandler(channel(name));
        for (const name of ['diagLog','dragMove','dragStop']) ipcMain.removeAllListeners(channel(name));
    }
}
function load() {
    runtime = require('./runtime.js')();
    if (loginUid) runtime.onLogin?.(loginUid);
    for (const window of windows()) runtime.onBrowserWindowCreated?.(window);
    state.loadedVersion = info().installedVersion;
}
function clearCache() {
    for (const file of Object.keys(require.cache)) if (file.startsWith(__dirname + path.sep) && file !== __filename) delete require.cache[file];
}
function validate() {
    for (const name of fs.readdirSync(__dirname)) if (name.endsWith('.js')) new vm.Script(fs.readFileSync(path.join(__dirname, name), 'utf8'), { filename: name });
    for (const relative of ['main/runtime.js', 'preload/index.js', 'renderer/index.js']) {
        if (!fs.statSync(path.join(root, relative)).isFile()) throw Error('更新入口尚未写入完整：' + relative);
    }
    const seen = new Set();
    function imports(file) {
        if (seen.has(file)) return; seen.add(file);
        const source = fs.readFileSync(file, 'utf8');
        for (const match of source.matchAll(/(?:from|import)\s*['"](\.[^'"]+)['"]/g)) {
            const child = path.resolve(path.dirname(file), match[1]);
            if (!child.startsWith(root + path.sep)) throw Error('模块路径超出主题目录');
            imports(child);
        }
    }
    imports(path.join(root, 'renderer/index.js'));
}
function refresh() { for (const window of windows()) { try { window.webContents.reloadIgnoringCache(); } catch {} } }
function reloadRuntime() {
    validate();
    const previousVersion = state.loadedVersion;
    const cached = new Map(Object.entries(require.cache).filter(([file]) => file.startsWith(__dirname + path.sep) && file !== __filename));
    clean(); clearCache();
    try { load(); } catch (error) {
        try { clean(); } catch {}
        clearCache(); for (const [file, value] of cached) require.cache[file] = value;
        load(); state.loadedVersion = previousVersion; throw error;
    }
}
function apply(files, manual = false) {
    try {
        state.error = '';
        if (manual || files.some(file => !file.endsWith('.css'))) validate();
        if (files.includes('main/supervisor.js') || files.includes('main/index.js')) {
            validate();
            const previousVersion = state.loadedVersion;
            const cached = new Map(Object.entries(require.cache).filter(([file]) => file.startsWith(__dirname + path.sep)));
            stop(); clearCache(); delete require.cache[__filename];
            try { require(__filename); }
            catch (error) {
                for (const name of controls) ipcMain.removeHandler(channel(name));
                clean(); clearCache();
                for (const [file, value] of cached) require.cache[file] = value;
                stopped = false; start(); state.loadedVersion = previousVersion;
                throw error;
            }
            if (loginUid) registry.current.onLogin(loginUid);
            refresh(); return;
        }
        if (manual || files.some(file => file.startsWith('main/') || file === 'manifest.json')) reloadRuntime();
        if (manual || files.some(file => !file.endsWith('.css'))) refresh();
        else {
            const css = files.map(file => ({ name: path.basename(file), text: path.basename(file) === 'wallpaper.css' && !fs.existsSync(path.join(root, file)) ? '' : fs.readFileSync(path.join(root, file), 'utf8') }));
            for (const window of windows()) { try { window.webContents.send(channel('themeUpdate'), { type: 'css', css }); } catch {} }
        }
        state.lastUpdate = new Date().toISOString(); report();
    } catch (error) {
        state.error = error.message || String(error);
        for (const file of files.length ? files : ['main/runtime.js']) changed.add(file);
        // Wait for the next file write or manual request; never retry in a busy loop.
        report();
    }
    return info();
}
function schedule(file) {
    if (stopped || !state.enabled || !file) return;
    const relative = String(file).replaceAll('\\', '/');
    if (!(relative === 'manifest.json' || /^(main|renderer|preload)\/[^.].*\.(js|mjs|json)$/.test(relative) || /^assets\/[^/]+\.css$/.test(relative))) return;
    changed.add(relative); clearTimeout(timer);
    timer = setTimeout(() => { const files = [...changed]; changed.clear(); apply(files); }, 650);
}
function stop() {
    if (stopped) return;
    stopped = true; clearTimeout(timer); changed.clear(); watcher?.close(); state.watching = false;
    for (const remove of [...visibilityListeners.values()]) remove();
    for (const name of controls) ipcMain.removeHandler(channel(name));
    clean();
    runtime = null; watcher = null; timer = null;
    if (registry.current?.dispose === stop) registry.current = null;
}
function start() {
load();
for (const window of windows()) watchVisibility(window);
try {
    watcher = fs.watch(root, { recursive: true, persistent: false }, (_event, file) => schedule(file));
    state.watching = true;
    watcher.on('error', error => { state.error = error.message; state.watching = false; watcher.close(); report(); });
} catch (error) { state.error = error.message; }
ipcMain.handle(channel('themeInfo'), event => {
    if (!valid(event)) throw Error('Window unavailable');
    const window = BrowserWindow.fromWebContents(event.sender);
    return { ...info(), windowVisible: window.isVisible() && !window.isMinimized() };
});
ipcMain.handle(channel('themeMemory'), event => {
    if (!valid(event)) throw Error('Window unavailable');
    return { currentRendererPid: event.sender.getOSProcessId(), hardwareAcceleration: app.isHardwareAccelerationEnabled(), processes: app.getAppMetrics().map(metric => ({
        pid: metric.pid, type: metric.type, workingSetMB: Math.round(metric.memory.workingSetSize / 102.4) / 10,
        privateMB: metric.memory.privateBytes == null ? null : Math.round(metric.memory.privateBytes / 102.4) / 10
    })) };
});
ipcMain.handle(channel('themeReload'), event => {
    if (!valid(event)) throw Error('Window unavailable'); clearTimeout(timer); changed.clear();
    timer = setTimeout(() => apply([], true), 150);
    return { ok: true, message: '正在更新主题并刷新页面。' };
});
ipcMain.handle(channel('themeAuto'), (event, enabled) => {
    if (!valid(event) || typeof enabled !== 'boolean') throw Error('Invalid setting');
    state.enabled = enabled; LiteLoader.api.config.set(configKey, { enabled });
    if (!enabled) { clearTimeout(timer); changed.clear(); }
    report(); return info();
});
registry.current = {
    onLogin(uid) { loginUid = String(uid || ''); runtime?.onLogin?.(uid); },
    onBrowserWindowCreated(window) { watchVisibility(window); runtime?.onBrowserWindowCreated?.(window); },
    dispose: stop
};
}
start();
module.exports = {
    onLogin(uid) { registry.current?.onLogin(uid); },
    onBrowserWindowCreated(window) { registry.current?.onBrowserWindowCreated(window); },
    dispose() { registry.current?.dispose(); }
};
