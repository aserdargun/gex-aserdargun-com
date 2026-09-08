"""Rebuild named Blender masters and web assets using a local Blender installation."""
import os
import shutil
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
blender = os.environ.get("GEX_BLENDER") or shutil.which("blender")
if not blender and Path("/Applications/Blender.app/Contents/MacOS/Blender").exists():
    blender = "/Applications/Blender.app/Contents/MacOS/Blender"
if not blender:
    raise SystemExit("Set GEX_BLENDER to the Blender executable. Prebuilt GLBs remain usable.")
subprocess.run([blender, "--background", "--python", str(root / "blender/build_scene.py")], check=True)
