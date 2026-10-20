"""ローマ字モードの読み上げ音声（voice/voice.mp3 と voice/voice.json）を作る。

読み上げる言葉はアルファベットの名前（romaji-mode.js の LETTER_NAMES）と、
script.js の hiraganaToRomaji にあるかな。すべてを 1 つの mp3 に並べ、
各言葉の開始位置と長さを voice.json に書き出す（オーディオスプライト）。

必要なもの:
  pip install pyopenjtalk numpy
  ffmpeg（libmp3lame）
  HTS Voice "Mei" の mei_happy.htsvoice（MMDAgent_Example-1.8 の Voice/mei/ に入っている）

使い方:
  python tools/make_voice.py path/to/mei_happy.htsvoice
"""

import json
import re
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np
import pyopenjtalk
from pyopenjtalk.htsengine import HTSEngine

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'voice'

# romaji-mode.js の LETTER_NAMES と同じ
LETTER_NAMES = [
    'エー', 'ビー', 'シー', 'ディー', 'イー', 'エフ', 'ジー', 'エイチ', 'アイ', 'ジェー',
    'ケー', 'エル', 'エム', 'エヌ', 'オー', 'ピー', 'キュー', 'アール', 'エス', 'ティー',
    'ユー', 'ブイ', 'ダブリュー', 'エックス', 'ワイ', 'ゼット',
]

SPEED = 1.1      # 少し速め
HALF_TONE = 1.0  # 半音上げて明るく
GAP = 0.3        # 言葉と言葉の間の無音（秒）。デコード時のずれを吸収する
SILENCE = 0.01   # 前後の無音を切るときのしきい値


def load_kana():
    """script.js の hiraganaToRomaji から、romaji-mode.js と同じ規則でかなを選ぶ。"""
    source = (ROOT / 'script.js').read_text(encoding='utf-8')
    table = source.split('const hiraganaToRomaji = {', 1)[1].split('};', 1)[0]
    pairs = re.findall(r"'([^']+)':\s*'([^']*)'", table)
    kana_by_romaji = {}
    for kana, roma in pairs:
        if roma and roma != '-' and roma not in kana_by_romaji:
            kana_by_romaji[roma] = kana
    return list(kana_by_romaji.values())


def to_katakana(text):
    # ひらがな 1 文字だと助詞として読まれることがある（「は」→「わ」）のでカタカナで合成する
    return ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in text)


def synthesize(engine, text):
    labels = pyopenjtalk.extract_fullcontext(to_katakana(text))
    x = engine.synthesize(labels) / 32768.0
    loud = np.where(np.abs(x) > SILENCE)[0]
    x = x[max(loud[0] - 240, 0):loud[-1] + 2400]  # 前は 5ms、後ろは 50ms 残す
    return x / np.max(np.abs(x)) * 0.9


def main():
    voice_path = sys.argv[1]
    engine = HTSEngine(voice_path.encode('utf-8'))
    engine.set_speed(SPEED)
    engine.add_half_tone(HALF_TONE)
    sr = engine.get_sampling_frequency()

    words = LETTER_NAMES + load_kana()
    gap = np.zeros(int(sr * GAP))
    chunks = [gap]
    clips = {}
    position = GAP
    for word in words:
        x = synthesize(engine, word)
        clips[word] = [round(position, 3), round(len(x) / sr, 3)]
        chunks += [x, gap]
        position += len(x) / sr + GAP

    audio = (np.concatenate(chunks) * 32767).astype(np.int16)
    OUT_DIR.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav_path = Path(tmp) / 'voice.wav'
        with wave.open(str(wav_path), 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes(audio.tobytes())
        subprocess.run([
            'ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav_path),
            '-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k',
            str(OUT_DIR / 'voice.mp3'),
        ], check=True)

    (OUT_DIR / 'voice.json').write_text(
        json.dumps(clips, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'{len(clips)} clips, {position:.1f}s')


if __name__ == '__main__':
    main()
