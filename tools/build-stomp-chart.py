#!/usr/bin/env python3
"""Build a beat map for an audio-backed song (Stomp the Beat and its successors).

    python tools/build-stomp-chart.py "Beat Stomp (Remastered).wav" stomp-the-beat
    python tools/build-stomp-chart.py "Stomp the Beat - senior 02.wav" stomp-the-beat-soul \
        --grid tools/grids/stomp-the-beat-soul.json

Writes content/<id>-beats.js (generated: do not edit) and prints a report.

The game follows the AUDIO, not a metronome: a generated track drifts (Stomp the
Beat runs 109 -> 120 bpm), so every beat's time is stored. The map is built in
three steps and checked against the audio itself:
  1. a beat tracker finds the rough pulse;
  2. each beat is moved onto the real kick hit near it (so the game's guide kick
     lands ON the band's kick, not a flam away from it);
  3. a smooth curve is fitted through those hits, so a missing or doubtful kick
     (the intro, the breakdowns) is filled in from its neighbours.

--bpm N      the tracker's first guess at the tempo (default 112, Stomp the Beat).
--grid FILE  a JSON list of rough beat times (seconds; beat 0 = the count-in
             "One") used INSTEAD of the tracker in step 1. For a song the tracker
             loses its place in: Stomp the Beat: Soul has eight bars with no drums
             at the start, and a syncopated fill and a pushed ending that pull a
             tracker half a beat off (it then stays there to the end). Its grid
             was checked by where the kick lands: on beats 1 and 3, every bar.
             With a grid, a beat with no kick near it is steered by the grid
             itself, lightly (ROUGH_WEIGHT), so the drumless intro still gets a map.
Needs: pip install librosa scipy numpy soundfile
"""
import argparse, json, os
import numpy as np, librosa
from scipy.interpolate import LSQUnivariateSpline
from scipy.signal import find_peaks

SR, HOP = 22050, 64                       # 2.9 ms per frame
ROUGH_WEIGHT = 0.2                        # how much a grid beat with no kick near it steers the curve
ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('song_id')
ap.add_argument('--bpm', type=float, default=112)
ap.add_argument('--grid')
args = ap.parse_args()
src, song_id = args.src, args.song_id
y, sr = librosa.load(src, sr=SR, mono=True)

# 1. the rough pulse (the same settings that matched Rob's ear on 2026-10-23),
#    or the checked grid given for this song
if args.grid:
    with open(args.grid) as fh:
        rough = np.array(json.load(fh), dtype=float)
else:
    H = 256
    oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=H)
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=H)); f = librosa.fft_frequencies(sr=sr, n_fft=2048)
    low = S[(f > 35) & (f < 120)].sum(0); lflux = np.maximum(0, np.diff(low, prepend=low[0])); lflux /= lflux.max()
    _, b = librosa.beat.beat_track(onset_envelope=oenv / oenv.max() + lflux, sr=sr, hop_length=H,
                                   tightness=40, start_bpm=args.bpm, trim=False)
    rough = librosa.frames_to_time(b, sr=sr, hop_length=H)

# 2. the real kick hits: peaks of the low band's rise, to a few ms
S2 = np.abs(librosa.stft(y, n_fft=1024, hop_length=HOP)); f2 = librosa.fft_frequencies(sr=sr, n_fft=1024)
lo2 = S2[(f2 > 35) & (f2 < 150)].sum(0)
rise = np.maximum(0, np.diff(lo2, prepend=lo2[0])); rise = np.convolve(rise, np.ones(3) / 3, 'same')
t2 = librosa.frames_to_time(np.arange(len(rise)), sr=sr, hop_length=HOP)
pk, _ = find_peaks(rise, height=np.percentile(rise, 85) * 0.4, distance=int(0.25 * sr / HOP))
kicks = t2[pk]
found = np.full(len(rough), np.nan)
for i, r in enumerate(rough):
    near = kicks[np.abs(kicks - r) < 0.07]
    if len(near): found[i] = near[np.argmin(np.abs(near - r))]
ok = ~np.isnan(found)

# 3. a smooth tempo curve through the hits. Drift is slow; detector noise (a bass
#    note, a handclap, a breakdown with almost no kick) is not, so the curve has a
#    knot only every KNOT beats and hits that disagree with it are thrown out.
KNOT = 12
idx = np.arange(len(rough))
use = ok.copy()
for _ in range(4):
    knots = np.arange(KNOT, len(rough) - KNOT, KNOT)
    if args.grid:
        # Every beat steers: a kick that agrees with the curve fully, the grid
        # lightly where there is no such kick (no drums, or a doubtful hit).
        spl = LSQUnivariateSpline(idx, np.where(use, found, rough), knots,
                                  w=np.where(use, 1.0, ROUGH_WEIGHT), k=3)
    else:
        spl = LSQUnivariateSpline(idx[use], found[use], knots, k=3)
    resid_all = found - spl(idx)
    use = ok & (np.abs(np.nan_to_num(resid_all, nan=9)) < 0.020)
beats = spl(idx)
resid = (found[use] - beats[use]) * 1000
ibi = np.diff(beats)
print("beats %d  first %.3f  last %.3f  (audio %.2f s)" % (len(beats), beats[0], beats[-1], len(y) / sr))
print("kick hit found for %d of %d beats; %d agree with the curve and steer it" % (ok.sum(), len(ok), use.sum()))
print("map vs real kick: median %.1f ms, 95%% within %.1f ms" % (np.median(abs(resid)), np.percentile(abs(resid), 95)))
print("tempo %.1f -> %.1f bpm, bar %.2f s -> %.2f s" % (60 / ibi[:16].mean(), 60 / ibi[-16:].mean(), 4 * ibi[:16].mean(), 4 * ibi[-16:].mean()))
print("largest beat-to-beat change %.0f ms" % (np.abs(np.diff(ibi)).max() * 1000))

out = os.path.join(os.path.dirname(__file__), '..', 'content', song_id + '-beats.js')
with open(out, 'w') as fh:
    fh.write('/* GENERATED by tools/build-stomp-chart.py from the audio. Do not edit by hand.\n'
             '   Beat k is at beats[k] seconds on the audio file\'s own clock; beat 0 is the first count-in "One"\n'
             '   and a bar is four beats (bar 0 = the count-in). */\n')
    fh.write('window.KR = window.KR || {};\nKR.stompBeats = KR.stompBeats || {};\n')
    fh.write("KR.stompBeats['%s'] = %s;\n" % (song_id, json.dumps([round(float(x), 4) for x in beats])))
print('wrote', os.path.abspath(out))
