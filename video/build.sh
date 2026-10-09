#!/bin/sh
# Full walkthrough rebuild. Start the app first (npm run dev); run nothing heavy alongside it,
# because the recorder films in real time and a busy machine stretches the recording.
set -e
cd "$(dirname "$0")/.."
# keep the Mac awake: sleep mid-recording stalls the headless browser
caffeinate -dimsu -w $$ &
node video/record.mjs
cd video
python3 schedule.py
python3 compose.py
python3 pace.py
python3 finish.py
