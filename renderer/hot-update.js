function showStatus(block, info) {
    const status = block.querySelector('[data-hot-status]');
    if (status) status.textContent = `已安装 ${info.installedVersion || '未知'} · 已载入 ${info.loadedVersion || '未知'} · ${info.enabled && info.watching ? '正在监听文件变化' : '自动更新已关闭或监听不可用'}${info.pendingWindows ? ' · 有后台窗口待应用更新' : ''}${info.error ? ' · ' + info.error : ''}`;
    for (const button of block.querySelectorAll('[data-hot-enabled]')) button.classList.toggle('is-active', info.enabled === (button.dataset.hotEnabled === 'true'));
}
import { isThemeActive, onThemeActivity, fastResumeEnabled, setFastResume, afterThemePaint } from './activity.js';
export function installThemeUpdates(files, style) {
    const chunks = new Map();
    const api = window.liuli_api;
    let ready = false;
    const pending = [];
    let needsApply = false;
    const apply = () => { if (ready && needsApply && isThemeActive()) { style().textContent = files.map(name => chunks.get(name) || '').join('\n'); needsApply = false; } };
    function update(event) {
        if (event.type === 'status') {
            for (const block of document.querySelectorAll('.liuli-hot-update')) showStatus(block, event);
            return;
        }
        if (event.type !== 'css') return;
        if (!ready) { pending.push(event); return; }
        for (const item of event.css || []) if (files.includes(item.name)) chunks.set(item.name, item.text);
        needsApply = true; apply();
    }
    const unsubscribe = api?.onThemeUpdate?.(update);
    const unsubscribeActivity = onThemeActivity(enabled => {
        if (!enabled || !needsApply) return;
        if (fastResumeEnabled()) afterThemePaint('theme-css', apply); else apply();
    });
    window.addEventListener('pagehide', () => { unsubscribe?.(); unsubscribeActivity(); pending.length = 0; chunks.clear(); }, { once: true });
    return entries => {
        for (const [name, text] of entries) chunks.set(name, text);
        ready = true;
        for (const event of pending.splice(0)) update(event);
    };
}
export function buildHotUpdateSettings(host) {
    const block = document.createElement('div'); block.className = 'liuli-wp-block liuli-hot-update'; host.append(block);
    const title = document.createElement('div'); title.className = 'liuli-wp-title'; title.textContent = '主题热更新'; block.append(title);
    const hint = document.createElement('div'); hint.className = 'liuli-field__hint';
    hint.textContent = 'CSS 原位更新。后台窗口的脚本更新可在回到前台后手动应用。'; block.append(hint);
    const status = document.createElement('div'); status.className = 'liuli-field__hint'; status.dataset.hotStatus = ''; status.textContent = '正在读取状态…'; block.append(status);
    const group = document.createElement('div'); group.className = 'liuli-seg'; block.append(group);
    const api = window.liuli_api;
    const resumeRow = document.createElement('div'); resumeRow.className = 'liuli-wp-fit liuli-mode-row';
    const resumeLabel = document.createElement('span'); resumeLabel.textContent = '快速恢复前台'; resumeRow.append(resumeLabel);
    const resumeGroup = document.createElement('div'); resumeGroup.className = 'liuli-seg'; resumeRow.append(resumeGroup);
    const resumeButtons = [true, false].map(enabled => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'liuli-seg__item';
        button.textContent = enabled ? '开启' : '关闭';
        button.onclick = () => {
            try { setFastResume(enabled); renderResume(); } catch (reason) { error(reason); }
        };
        resumeGroup.append(button);
        return [enabled, button];
    });
    function renderResume() {
        const value = fastResumeEnabled();
        for (const [enabled, button] of resumeButtons) {
            button.classList.toggle('is-active', enabled === value);
            button.setAttribute('aria-pressed', String(enabled === value));
        }
    }
    renderResume(); block.append(resumeRow);
    const resumeHint = document.createElement('div'); resumeHint.className = 'liuli-field__hint';
    resumeHint.textContent = '开启后优先显示现有界面，只补做后台发生变化的主题处理。'; block.append(resumeHint);
    function render(info) {
        showStatus(block, info);
    }
    const error = reason => { status.textContent = String(reason?.message).includes('No handler registered') || !api?.themeInfo
        ? '接口尚未载入，请在 LiteLoader 插件管理中重新加载琉璃。' : reason.message || String(reason); };
    for (const [label, enabled] of [['自动更新：开',true],['自动更新：关',false]]) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'liuli-seg__item'; button.textContent = label;
        button.dataset.hotEnabled = String(enabled);
        button.onclick = async () => { try { render(await api.themeAuto(enabled)); } catch (reason) { error(reason); } };
        group.append(button);
    }
    const reload = document.createElement('button'); reload.type = 'button'; reload.className = 'liuli-seg__item'; reload.textContent = '应用更新并刷新页面';
    reload.onclick = async () => { try { status.textContent = (await api.themeReload()).message; } catch (reason) { error(reason); } }; group.append(reload);
    const memory = document.createElement('button'); memory.type = 'button'; memory.className = 'liuli-seg__item'; memory.textContent = '读取进程内存'; group.append(memory);
    const output = document.createElement('pre'); output.className = 'liuli-field__hint'; output.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;'; block.append(output);
    memory.onclick = async () => {
        memory.disabled = true;
        try {
            const snapshot = await api.themeMemory();
            output.textContent = `硬件加速：${snapshot.hardwareAcceleration ? '已启用' : '未启用'}（不代表 JavaScript 在 GPU 执行）\n` + snapshot.processes.sort((a,b) => b.workingSetMB-a.workingSetMB).map(item =>
                `PID ${item.pid}${item.pid === snapshot.currentRendererPid ? '（当前窗口）' : ''} · ${item.type} · 工作集 ${item.workingSetMB}MB · 私有 ${item.privateMB ?? '—'}MB`).join('\n') + '\n进程包含 QQ 与同进程插件，不能据此分摊单个插件占用。';
        } catch (reason) { error(reason); }
        finally { memory.disabled = false; }
    };
    if (api?.themeInfo) api.themeInfo().then(render).catch(error); else error(new Error('接口尚未载入'));
}
