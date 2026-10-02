import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const THEME = {
    EasyPromptSwitch: { color: "#3b2f63", bgcolor: "#221d38" },
    EasyLoadImages: { color: "#1f4f5c", bgcolor: "#16313a" },
    EasySaveImage: { color: "#5c3d1f", bgcolor: "#382816" },
};

const style = document.createElement("style");
style.textContent = `
.easyload { font: 12px sans-serif; color: #ddd; box-sizing: border-box; width: 100%; height: 100%; display: flex; flex-direction: column; gap: 6px; }
.easyload * { box-sizing: border-box; }
.easyload-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; min-height: 0; border-radius: 6px; background: rgba(0,0,0,.25); padding: 6px; }
.easyload-scroll::-webkit-scrollbar { width: 8px; }
.easyload-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.2); border-radius: 4px; }
.easyload-btn { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15); color: #eee; border-radius: 5px; padding: 3px 8px; cursor: pointer; font-size: 12px; }
.easyload-btn:hover { background: rgba(255,255,255,.16); }
.easyload-bar { display: flex; gap: 6px; align-items: center; }
.easyload-muted { color: #999; font-size: 11px; }
.easyload-item { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 6px; padding: 6px; margin-bottom: 6px; transition: opacity .15s; }
.easyload-item.off { opacity: .45; }
.easyload-item-head { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
.easyload-title { flex: 1; min-width: 0; background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,.15); color: #fff; font-weight: bold; font-size: 12px; padding: 2px; outline: none; }
.easyload-text { width: 100%; min-height: 48px; resize: vertical; background: rgba(0,0,0,.3); color: #ddd; border: 1px solid rgba(255,255,255,.1); border-radius: 4px; padding: 4px; font: 12px monospace; outline: none; }
.easyload-toggle { position: relative; width: 34px; height: 18px; flex: none; border-radius: 9px; background: #4a4a4a !important; cursor: pointer; transition: background .15s; }
.easyload-toggle::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: left .15s; }
.easyload-toggle.on { background: #7c5cff !important; }
.easyload-toggle.on::after { left: 18px; }
.easyload-del { background: none; border: none; color: #999; cursor: pointer; font-size: 14px; padding: 0 2px; }
.easyload-del:hover { color: #ff6b6b; }
.easyload-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 6px; }
.easyload-cell { position: relative; aspect-ratio: 1; border-radius: 4px; overflow: hidden; background: repeating-conic-gradient(#333 0 25%, #2a2a2a 0 50%) 0 0 / 12px 12px; }
.easyload-cell img { width: 100%; height: 100%; object-fit: contain; display: block; }
.easyload-cell span { position: absolute; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.65); font-size: 10px; padding: 1px 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.easyload-grid.single { grid-template-columns: 1fr; }
.easyload-grid.single .easyload-cell { aspect-ratio: auto; height: 100%; min-height: 160px; }
.easyload-saved { font: 11px monospace; color: #cfa; word-break: break-all; }
`;
document.head.appendChild(style);

function el(tag, cls, props = {}) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return Object.assign(e, props);
}

// Ctrl+S inside our inputs must save the workflow, never open the browser's "save page" dialog.
// The event still bubbles to ComfyUI's keybinding handler, which runs the save.
function guardSaveKey(root) {
    root.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") e.preventDefault();
    });
}

async function browse(mode, initial) {
    const res = await api.fetchApi("/easyload/browse", { method: "POST", body: JSON.stringify({ mode, initial }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.paths;
}

function setWidgetValue(node, widget, value) {
    widget.value = value;
    widget.callback?.(value);
    node.setDirtyCanvas(true, true);
}

function addBrowseButton(node, label, mode, widget, append) {
    node.addWidget("button", label, null, async () => {
        const paths = await browse(mode, widget.value.split("\n")[0].trim());
        if (!paths.length) return;
        setWidgetValue(node, widget, append && widget.value.trim() ? `${widget.value.trim()}\n${paths.join("\n")}` : paths.join("\n"));
    });
}

function setupPromptSwitch(node) {
    const index = node.widgets.findIndex((w) => w.name === "items");
    node.widgets.splice(index, 1);

    let items = [];
    const root = el("div", "easyload");
    const bar = el("div", "easyload-bar");
    const add = el("button", "easyload-btn", { textContent: "+ Add prompt" });
    const count = el("span", "easyload-muted");
    bar.append(add, count);
    const list = el("div", "easyload-scroll");
    root.append(bar, list);
    guardSaveKey(root);

    const updateCount = () => (count.textContent = `${items.filter((i) => i.on).length} / ${items.length} on`);

    function render() {
        list.replaceChildren();
        items.forEach((item, i) => {
            const box = el("div", "easyload-item" + (item.on ? "" : " off"));
            const head = el("div", "easyload-item-head");
            const toggle = el("div", "easyload-toggle" + (item.on ? " on" : ""), { title: "On / off" });
            toggle.onclick = () => {
                item.on = !item.on;
                toggle.classList.toggle("on", item.on);
                box.classList.toggle("off", !item.on);
                updateCount();
            };
            const title = el("input", "easyload-title", { value: item.title, placeholder: `Prompt ${i + 1}` });
            title.oninput = () => (item.title = title.value);
            const del = el("button", "easyload-del", { textContent: "✕", title: "Delete" });
            del.onclick = () => {
                items.splice(i, 1);
                render();
            };
            const text = el("textarea", "easyload-text", { value: item.text, placeholder: "Prompt text" });
            text.oninput = () => (item.text = text.value);
            head.append(toggle, title, del);
            box.append(head, text);
            list.append(box);
        });
        updateCount();
    }

    add.onclick = () => {
        items.push({ title: "", text: "", on: true });
        render();
        list.scrollTop = list.scrollHeight;
    };

    const widget = node.addDOMWidget("items", "easyload_prompts", root, {
        getValue: () => JSON.stringify(items),
        setValue: (v) => {
            let parsed;
            try {
                parsed = JSON.parse(v || "[]");
            } catch {
                parsed = null;
            }
            if (!Array.isArray(parsed)) return;
            items = parsed;
            render();
        },
        getMinHeight: () => 260,
    });
    node.widgets.splice(node.widgets.indexOf(widget), 1);
    node.widgets.splice(index, 0, widget);

    items = [{ title: "", text: "", on: true }];
    render();
    node.setSize([380, 420]);
}

function setupLoadImages(node) {
    const pathsWidget = node.widgets.find((w) => w.name === "paths");
    addBrowseButton(node, "Pick image files", "files", pathsWidget, false);
    addBrowseButton(node, "Pick folder", "folder", pathsWidget, false);
    addBrowseButton(node, "Add more files", "files", pathsWidget, true);

    const root = el("div", "easyload");
    const info = el("div", "easyload-muted", { textContent: "No images" });
    const scroll = el("div", "easyload-scroll");
    const grid = el("div", "easyload-grid");
    scroll.append(grid);
    root.append(info, scroll);
    guardSaveKey(root);

    let timer;
    async function refresh() {
        const res = await api.fetchApi("/easyload/list", { method: "POST", body: JSON.stringify({ paths: pathsWidget.value }) });
        const { files } = await res.json();
        const stamp = Date.now();
        info.textContent = files.length ? `${files.length} image${files.length > 1 ? "s" : ""}` : "No images";
        grid.classList.toggle("single", files.length === 1);
        grid.replaceChildren(
            ...files.map((f) => {
                const cell = el("div", "easyload-cell", { title: f });
                const name = f.split(/[\\/]/).pop();
                cell.append(el("img", "", { src: api.apiURL(`/easyload/thumb?path=${encodeURIComponent(f)}&t=${stamp}`), loading: "lazy", alt: name }), el("span", "", { textContent: name }));
                return cell;
            })
        );
    }
    const scheduleRefresh = () => {
        clearTimeout(timer);
        timer = setTimeout(refresh, 300);
    };

    const callback = pathsWidget.callback;
    pathsWidget.callback = function () {
        scheduleRefresh();
        return callback?.apply(this, arguments);
    };
    pathsWidget.element?.addEventListener("input", scheduleRefresh);

    // Fixed height: the grid scrolls inside, the node never grows with the image count.
    node.addDOMWidget("preview", "easyload_preview", root, { serialize: false, getMinHeight: () => 220, getMaxHeight: () => 220 });
    node.easyloadRefresh = scheduleRefresh;
    node.setSize([360, 520]);
}

function setupSaveImage(node) {
    const dirWidget = node.widgets.find((w) => w.name === "directory");
    addBrowseButton(node, "Pick save folder", "folder", dirWidget, false);

    const root = el("div", "easyload");
    const hint = el("div", "easyload-muted");
    const saved = el("div", "easyload-scroll easyload-saved", { textContent: "Not saved yet" });
    root.append(hint, saved);
    guardSaveKey(root);

    const updateHint = () => {
        const d = (dirWidget.value || "").trim();
        hint.textContent = /^([a-zA-Z]:[\\/]|[\\/]{2})/.test(d) ? `Save to: ${d}` : `Save to: output${d ? "/" + d : ""}`;
    };
    const callback = dirWidget.callback;
    dirWidget.callback = function () {
        updateHint();
        return callback?.apply(this, arguments);
    };
    updateHint();

    node.addDOMWidget("saved", "easyload_saved", root, { serialize: false, getMinHeight: () => 90, getMaxHeight: () => 90 });
    node.easyloadShowSaved = (paths) => (saved.textContent = paths.join("\n"));
    node.easyloadUpdateHint = updateHint;
}

app.registerExtension({
    name: "easyload.nodes",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (!THEME[nodeData.name]) return;
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            onNodeCreated?.apply(this, arguments);
            Object.assign(this, THEME[nodeData.name]);
            if (nodeData.name === "EasyPromptSwitch") setupPromptSwitch(this);
            else if (nodeData.name === "EasyLoadImages") setupLoadImages(this);
            else setupSaveImage(this);
        };

        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (info) {
            onConfigure?.apply(this, arguments);
            // v1.0 saved [select, prompt_1..prompt_10]; turn it into the toggle list.
            const values = info?.widgets_values;
            if (nodeData.name === "EasyPromptSwitch" && typeof values?.[0] === "number") {
                const items = values.slice(1).map((text, i) => ({ title: `Prompt ${i + 1}`, text: text ?? "", on: i + 1 === values[0] })).filter((item) => item.text || item.on);
                this.widgets.find((w) => w.name === "items").value = JSON.stringify(items);
                this.widgets.find((w) => w.name === "separator").value = ", ";
            }
            this.easyloadRefresh?.();
            this.easyloadUpdateHint?.();
        };

        const onExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (output) {
            onExecuted?.apply(this, arguments);
            if (output?.saved) this.easyloadShowSaved?.(output.saved);
        };
    },
});
