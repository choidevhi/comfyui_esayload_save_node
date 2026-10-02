import hashlib
import json
import os
import re

import numpy as np
import torch
from PIL import Image, ImageOps
from PIL.PngImagePlugin import PngInfo

import folder_paths
from comfy.cli_args import args

PROMPT_SLOTS = 10
IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff")
SAVE_FORMATS = {"png": "PNG", "jpg": "JPEG", "webp": "WEBP"}
INVALID_NAME_CHARS = re.compile(r'[\/:*?"<>|\x00-\x1f]')


class PromptSwitch:
    @classmethod
    def INPUT_TYPES(s):
        prompts = {f"prompt_{i}": ("STRING", {"multiline": True, "default": ""}) for i in range(1, PROMPT_SLOTS + 1)}
        return {"required": {"select": ("INT", {"default": 1, "min": 1, "max": PROMPT_SLOTS}), **prompts}}

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("prompt",)
    FUNCTION = "switch"
    CATEGORY = "easyload"

    def switch(self, select, **prompts):
        return (prompts[f"prompt_{select}"],)


def collect_image_paths(paths):
    files = []
    for line in paths.splitlines():
        path = line.strip().strip('"')
        if not path:
            continue
        if os.path.isdir(path):
            files += sorted(os.path.join(path, f) for f in os.listdir(path) if f.lower().endswith(IMAGE_EXTENSIONS))
        else:
            files.append(path)
    if not files:
        raise ValueError("No images found. Pick files or a folder first.")
    return files


class LoadImagesFromPaths:
    @classmethod
    def INPUT_TYPES(s):
        return {"required": {"paths": ("STRING", {"multiline": True, "default": "", "placeholder": "Image files or folders, one per line"})}}

    RETURN_TYPES = ("IMAGE", "MASK", "STRING")
    RETURN_NAMES = ("image", "mask", "filename")
    OUTPUT_IS_LIST = (True, True, True)
    FUNCTION = "load"
    CATEGORY = "easyload"

    def load(self, paths):
        images, masks, names = [], [], []
        for path in collect_image_paths(paths):
            img = ImageOps.exif_transpose(Image.open(path))
            images.append(torch.from_numpy(np.array(img.convert("RGB")).astype(np.float32) / 255.0)[None,])
            if "A" in img.getbands():
                masks.append(1.0 - torch.from_numpy(np.array(img.getchannel("A")).astype(np.float32) / 255.0)[None,])
            else:
                masks.append(torch.zeros((1, 64, 64), dtype=torch.float32))
            names.append(os.path.splitext(os.path.basename(path))[0])
        return (images, masks, names)

    @classmethod
    def IS_CHANGED(s, paths):
        m = hashlib.sha256()
        for path in collect_image_paths(paths):
            m.update(f"{path}|{os.path.getmtime(path)}".encode())
        return m.hexdigest()


class SaveImageToPath:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "images": ("IMAGE",),
                "directory": ("STRING", {"default": "", "placeholder": "Save folder (empty = ComfyUI output)"}),
                "filename": ("STRING", {"default": "image"}),
                "prefix": ("STRING", {"default": ""}),
                "suffix": ("STRING", {"default": ""}),
                "extension": (list(SAVE_FORMATS),),
                "overwrite": ("BOOLEAN", {"default": False}),
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ()
    FUNCTION = "save"
    OUTPUT_NODE = True
    CATEGORY = "easyload"

    def save(self, images, directory, filename, prefix, suffix, extension, overwrite, prompt=None, extra_pnginfo=None):
        if extension not in SAVE_FORMATS:
            raise ValueError(f"Unsupported extension: {extension}")
        directory = directory.strip().strip('"') or folder_paths.get_output_directory()
        os.makedirs(directory, exist_ok=True)
        base = INVALID_NAME_CHARS.sub("_", f"{prefix}{filename}{suffix}").strip(" .") or "image"

        metadata = None
        if extension == "png" and not args.disable_metadata:
            metadata = PngInfo()
            if prompt is not None:
                metadata.add_text("prompt", json.dumps(prompt))
            for k, v in (extra_pnginfo or {}).items():
                metadata.add_text(k, json.dumps(v))

        saved = []
        for i, image in enumerate(images):
            img = Image.fromarray(np.clip(255.0 * image.cpu().float().numpy(), 0, 255).astype(np.uint8))
            name = base if len(images) == 1 else f"{base}_{i + 1:03}"
            path = os.path.join(directory, f"{name}.{extension}")
            n = 1
            while not overwrite and os.path.exists(path):
                path = os.path.join(directory, f"{name}_{n:04}.{extension}")
                n += 1
            if extension == "png":
                img.save(path, pnginfo=metadata, compress_level=4)
            else:
                img.save(path, SAVE_FORMATS[extension], quality=95)
            saved.append(path)
        return {"ui": {"text": saved}}


NODE_CLASS_MAPPINGS = {
    "EasyPromptSwitch": PromptSwitch,
    "EasyLoadImages": LoadImagesFromPaths,
    "EasySaveImage": SaveImageToPath,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "EasyPromptSwitch": "Prompt Switch (Easy)",
    "EasyLoadImages": "Load Images From Path (Easy)",
    "EasySaveImage": "Save Image To Path (Easy)",
}
