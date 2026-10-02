# comfyui_esayload_save_node

ComfyUI custom nodes, category `easyload`.

## Prompt Switch (Easy)

Type up to 10 prompts and pick one with `select`. Outputs the chosen prompt as `STRING`. No inputs.

## Load Images From Path (Easy)

`paths` takes image files or folders, one per line. Use **Pick image files** (one or many), **Pick folder** (every image in it), or **Add more files** to open a Windows file dialog, or type paths directly.

Outputs lists of `image`, `mask`, and `filename` (name without extension), so the next nodes run once per image. Images of different sizes are fine.

## Save Image To Path (Easy)

Saves to `directory` (pick with **Pick save folder** or type it; empty = ComfyUI `output`).
File name is `prefix + filename + suffix`. Connect `filename` from the loader to keep original names.
`extension`: png / jpg / webp. PNG keeps the workflow metadata.
If `overwrite` is off, an existing file gets `_0001`, `_0002`, ... added.

## Install

```
cd ComfyUI/custom_nodes
git clone https://github.com/choidevhi/comfyui_esayload_save_node.git
```

The file dialogs open on the machine running ComfyUI, so they are meant for local use.
