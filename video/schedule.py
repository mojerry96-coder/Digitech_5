"""Place each narration line on the recording's timeline (writes sched.json for compose.py).

Run from this folder after record.mjs. A line starts at its anchor (a fixed time, or a mark that
record.mjs set when the matching action began), but never before the previous line has ended.
The lines live in lines.json (shared with record.mjs and the narration scripts).
"""
import json, os, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
NARR = os.path.join(HERE, "narration")
GAP = 0.25


def duration(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "csv=p=0", path]).decode())


if __name__ == "__main__":
    os.chdir(HERE)
    lines = json.load(open("lines.json"))
    marks = json.load(open("timeline.json"))["marks"]
    sched, end = [], 0.0
    for i, line in enumerate(lines, 1):
        d = round(duration(os.path.join(NARR, f"s{i}.wav")), 2)
        anchor = line["anchor"]
        at = marks[anchor] if isinstance(anchor, str) else (anchor or 0.0)
        s = round(max(at, end + GAP) if i > 1 else at, 2)
        sched.append({"i": i, "s": s, "d": d, "t": line["text"]})
        end = s + d
    json.dump(sched, open("sched.json", "w"), indent=1)
    for o in sched:
        print(f"s{o['i']:<3}{o['s']:6.2f} +{o['d']:4.2f}  {o['t'][:64]}")
