import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

async function browse(mode, initial) {
    const res = await api.fetchApi("/easyload/browse", { method: "POST", body: JSON.stringify({ mode, initial }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.paths;
}

function addBrowseButton(node, label, mode, widgetName, append) {
    const target = node.widgets.find((w) => w.name === widgetName);
    node.addWidget("button", label, null, async () => {
        const paths = await browse(mode, target.value.split("\n")[0].trim());
        if (!paths.length) return;
        target.value = append && target.value.trim() ? `${target.value.trim()}\n${paths.join("\n")}` : paths.join("\n");
        node.setDirtyCanvas(true, true);
    });
}

app.registerExtension({
    name: "easyload.browse",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "EasyLoadImages" && nodeData.name !== "EasySaveImage") return;
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            onNodeCreated?.apply(this, arguments);
            if (nodeData.name === "EasyLoadImages") {
                addBrowseButton(this, "Pick image files", "files", "paths", false);
                addBrowseButton(this, "Pick folder", "folder", "paths", false);
                addBrowseButton(this, "Add more files", "files", "paths", true);
            } else {
                addBrowseButton(this, "Pick save folder", "folder", "directory", false);
            }
        };
    },
});
