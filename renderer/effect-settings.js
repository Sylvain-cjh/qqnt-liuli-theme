const KEY = 'liuli-conversation-effects';
const EVENT = 'liuli-conversation-effects-changed';
export const EFFECT_DEFAULTS = Object.freeze({ enabled: true, scale: 1.25, tilt: 1,
    enterMs: 420, exitMs: 340, holdMs: 140, spacing: true, shareSpace: true, jelly: .55 });
const limits = { scale: [1, 1.4], tilt: [0, 1.5], enterMs: [120, 700], exitMs: [120, 650], holdMs: [0, 300], jelly: [0, 1] };
export function loadEffects() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
    const result = { ...EFFECT_DEFAULTS };
    for (const key of ['enabled', 'spacing', 'shareSpace']) if (typeof raw[key] === 'boolean') result[key] = raw[key];
    for (const [key, [min, max]] of Object.entries(limits)) {
        if (typeof raw[key] === 'number' && Number.isFinite(raw[key])) result[key] = Math.max(min, Math.min(max, raw[key]));
    }
    return result;
}
function saveEffects(config) {
    localStorage.setItem(KEY, JSON.stringify(config));
    window.dispatchEvent(new Event(EVENT));
}
export function subscribeEffects(callback) {
    const update = event => { if (event.type === EVENT || event.key === KEY || event.key === null) callback(loadEffects()); };
    window.addEventListener('storage', update); window.addEventListener(EVENT, update);
    return () => { window.removeEventListener('storage', update); window.removeEventListener(EVENT, update); };
}
export function buildEffectSettings(host) {
    const block = document.createElement('div'); block.className = 'liuli-wp-block'; host.append(block);
    const title = document.createElement('div'); title.className = 'liuli-wp-title'; title.textContent = '会话与拖动效果'; block.append(title);
    const hint = document.createElement('div'); hint.className = 'liuli-field__hint';
    hint.textContent = '保存后同步到已打开的窗口；关闭会话效果不影响消息动画。'; block.append(hint);
    const controls = [];
    for (const [key, label] of [['enabled','会话 3D 效果'],['spacing','放大时让位'],['shareSpace','相邻会话复用空间']]) {
        const row = document.createElement('div'); row.className = 'liuli-wp-fit liuli-mode-row';
        const text = document.createElement('span'); text.textContent = label; row.append(text);
        const group = document.createElement('div'); group.className = 'liuli-seg'; row.append(group);
        for (const [value, name] of [[true,'开启'],[false,'关闭']]) {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'liuli-seg__item'; button.textContent = name;
            button.onclick = () => commit({ ...loadEffects(), [key]: value });
            group.append(button); controls.push(config => button.classList.toggle('is-active', config[key] === value));
        }
        block.append(row);
    }
    for (const [key, label, step, unit] of [['scale','最大放大倍率',.01,'倍'],['tilt','倾斜幅度',.05,''],
        ['enterMs','放大时间',10,'ms'],['exitMs','回落时间',10,'ms'],['holdMs','空间保留时间',10,'ms'],['jelly','拖动条果冻强度',.05,'']]) {
        const wrap = document.createElement('div'); wrap.className = 'liuli-field';
        const row = document.createElement('div'); row.className = 'liuli-field__row';
        const text = document.createElement('label'); text.textContent = label;
        const value = document.createElement('span'); value.className = 'liuli-field__value'; row.append(text, value);
        const input = document.createElement('input'); input.type = 'range'; input.className = 'liuli-slider';
        input.min = limits[key][0]; input.max = limits[key][1]; input.step = step; input.setAttribute('aria-label', label);
        input.oninput = () => { value.textContent = Number(input.value).toFixed(step < 1 ? 2 : 0) + unit; };
        input.onchange = () => commit({ ...loadEffects(), [key]: Number(input.value) });
        controls.push(config => { input.value = config[key]; value.textContent = Number(config[key]).toFixed(step < 1 ? 2 : 0) + unit;
            input.style.setProperty('--liuli-pct', (config[key] - input.min) / (input.max - input.min) * 100 + '%'); });
        wrap.append(row, input); block.append(wrap);
    }
    const reset = document.createElement('button'); reset.className = 'liuli-seg__item'; reset.textContent = '恢复效果默认值';
    reset.onclick = () => commit({ ...EFFECT_DEFAULTS }); block.append(reset);
    function commit(config) {
        try { saveEffects(config); hint.textContent = '已保存，已同步到打开的窗口。'; refresh(); }
        catch (error) { hint.textContent = '保存失败：' + (error.message || String(error)); }
    }
    function refresh() { const config = loadEffects(); controls.forEach(update => update(config)); }
    refresh();
}
