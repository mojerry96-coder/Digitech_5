#!/bin/sh
# TEMPORARY narration with a macOS system voice, used only while ElevenLabs is unreachable.
# The real narration is ElevenLabs "Ifeoma Odumodu - Nigerian Narrator" (see README); replace
# narration/s1.wav … s15.wav with those files and rerun the pipeline from record.mjs.
cd "$(dirname "$0")"
python3 - <<'PY'
import json, subprocess, os
for i, l in enumerate(json.load(open("lines.json")), 1):
    aiff = f"narration/raw/s{i}.aiff"
    subprocess.run(["say", "-v", "Flo (English (UK))", "-r", "168", "-o", aiff, l["text"]], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", aiff, "-ar", "24000", "-ac", "1", f"narration/s{i}.wav"], check=True)
    os.remove(aiff)
print("placeholder narration written")
PY
