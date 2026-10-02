import json
import subprocess
import sys

from aiohttp import web
from server import PromptServer

# The dialog runs in a child process so Tk never touches the server's event loop thread.
DIALOG_SCRIPT = r"""
import json, sys, tkinter
from tkinter import filedialog
mode, initial = sys.argv[1], sys.argv[2]
root = tkinter.Tk()
root.withdraw()
root.attributes("-topmost", True)
types = [("Images", "*.png *.jpg *.jpeg *.webp *.bmp *.tif *.tiff"), ("All files", "*.*")]
if mode == "files":
    result = list(filedialog.askopenfilenames(parent=root, initialdir=initial or None, filetypes=types))
else:
    result = filedialog.askdirectory(parent=root, initialdir=initial or None, mustexist=False)
    result = [result] if result else []
print(json.dumps(result))
"""


@PromptServer.instance.routes.post("/easyload/browse")
async def browse(request):
    body = await request.json()
    mode = "files" if body.get("mode") == "files" else "folder"
    proc = subprocess.run([sys.executable, "-c", DIALOG_SCRIPT, mode, body.get("initial", "")], capture_output=True, text=True, encoding="utf-8")
    if proc.returncode != 0:
        return web.json_response({"error": proc.stderr.strip()}, status=500)
    return web.json_response({"paths": json.loads(proc.stdout)})
