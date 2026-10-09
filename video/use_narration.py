"""Install recorded narration (ElevenLabs MP3s or a human voiceover) as narration/s1.wav … s15.wav.

Usage:  python3 use_narration.py "<voice label>" line1.mp3 line2.mp3 … line15.mp3
Files must be given in the order of lines.json. Each is converted to 24 kHz mono WAV; the originals
are copied to narration/raw/. Then rerun the chain from record.mjs (the recorder reads the new lengths).
"""
import json, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
lines = json.load(open(os.path.join(HERE, "lines.json")))
label, files = sys.argv[1], sys.argv[2:]
if len(files) != len(lines):
    sys.exit(f"need {len(lines)} files in lines.json order, got {len(files)}")
os.makedirs(os.path.join(HERE, "narration", "raw"), exist_ok=True)
for i, f in enumerate(files, 1):
    shutil.copy(f, os.path.join(HERE, "narration", "raw", f"s{i}{os.path.splitext(f)[1]}"))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f, "-ar", "24000", "-ac", "1",
                    os.path.join(HERE, "narration", f"s{i}.wav")], check=True)
open(os.path.join(HERE, "narration", "VOICE"), "w").write(label + "\n")
print(f"installed {len(files)} lines · {label}")
