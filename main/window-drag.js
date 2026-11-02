const { ipcMain, BrowserWindow, screen } = require('electron');
module.exports = function installWindowDrag() {
    const sessions = new Map();
    const getWindow = event => !event.sender.isDestroyed() && event.senderFrame === event.sender.mainFrame
        ? BrowserWindow.fromWebContents(event.sender) : null;
    ipcMain.handle('LiteLoader.liuli.dragStart', (event, point) => {
        const window = getWindow(event);
        if (!window || window.isDestroyed() || window.isFullScreen()) return false;
        const cursor = point && Number.isFinite(point.x) && Number.isFinite(point.y) && Math.abs(point.x) < 50000 && Math.abs(point.y) < 50000
            ? { x: Math.round(point.x), y: Math.round(point.y) } : screen.getCursorScreenPoint();
        const previous = sessions.get(event.sender.id);
        if (previous) previous.contents.removeListener('destroyed', previous.cleanup);
        const id = event.sender.id, cleanup = () => sessions.delete(id);
        sessions.set(id, { window, cursor, bounds: window.getBounds(), contents: event.sender, cleanup });
        event.sender.once('destroyed', cleanup);
        return true;
    });
    const move = event => {
        const session = sessions.get(event.sender.id);
        if (!session || getWindow(event) !== session.window || session.window.isDestroyed()) return;
        const cursor = screen.getCursorScreenPoint();
        if (session.window.isMaximized()) {
            if (Math.abs(cursor.x - session.cursor.x) + Math.abs(cursor.y - session.cursor.y) < 3) return;
            const ratio = Math.max(0, Math.min(1, (session.cursor.x - session.bounds.x) / session.bounds.width));
            const normal = session.window.getNormalBounds();
            session.window.unmaximize();
            session.window.setPosition(Math.round(cursor.x - normal.width * ratio), cursor.y - 10);
            session.bounds = session.window.getBounds(); session.cursor = cursor;
        }
        const x = Math.round(session.bounds.x + cursor.x - session.cursor.x);
        const y = Math.round(session.bounds.y + cursor.y - session.cursor.y);
        const current = session.window.getPosition();
        if (current[0] !== x || current[1] !== y) session.window.setPosition(x, y);
    };
    const stop = event => {
        const session = sessions.get(event.sender.id);
        if (session) session.contents.removeListener('destroyed', session.cleanup);
        sessions.delete(event.sender.id);
    };
    ipcMain.on('LiteLoader.liuli.dragMove', move);
    ipcMain.on('LiteLoader.liuli.dragStop', stop);
    return () => {
        ipcMain.removeHandler('LiteLoader.liuli.dragStart');
        ipcMain.removeListener('LiteLoader.liuli.dragMove', move);
        ipcMain.removeListener('LiteLoader.liuli.dragStop', stop);
        for (const session of sessions.values()) session.contents.removeListener('destroyed', session.cleanup);
        sessions.clear();
    };
};
