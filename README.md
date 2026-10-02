# comfyui_esayload_save_node

ComfyUI custom nodes, category `easyload`.

## Prompt Switch (Easy)

A list of prompts, each with a title, an on/off toggle, and text. **+ Add prompt** adds one, ✕ deletes it.
Only one prompt can be on: turning one on turns the others off. Outputs the text of the prompt that is on (empty if all are off). No inputs.

## Load Images From Path (Easy)

`paths` takes image files or folders, one per line. Use **Pick image files** (one or many), **Pick folder** (every image in it), or **Add more files** to open a Windows file dialog, or type paths directly.

The node shows a thumbnail preview: one image fills the box, several are shown as a grid that scrolls inside the node, so the node does not grow.

Outputs lists of `image`, `mask`, and `filename` (name without extension), so the next nodes run once per image. Images of different sizes are fine.

## Save Image To Path (Easy)

`directory`:
- a name like `my_folder` saves to `output/my_folder`
- a full path like `C:\images` saves there
- empty saves to `output`

**Pick save folder** opens a folder dialog. The node shows where it will save and the files saved by the last run.
File name is `prefix + filename + suffix`. Connect `filename` from the loader to keep original names.
`extension`: png / jpg / webp. PNG keeps the workflow metadata.
If `overwrite` is off, an existing file gets `_0001`, `_0002`, ... added.

Ctrl+S inside the nodes saves the workflow as usual (it never opens the browser's save page dialog).

## Install

```
cd ComfyUI/custom_nodes
git clone https://github.com/choidevhi/comfyui_esayload_save_node.git
```

The file dialogs open on the machine running ComfyUI, so they are meant for local use.
