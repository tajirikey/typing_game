# 漢字タイピングゲーム 🎮

小学1〜3年生向けの漢字が学べるタイピングゲーム（マインクラフト風デザイン）

## 🌟 特徴

- **440文字の漢字**: 小学1〜3年生で習う全ての漢字
- **3つのゲームモード**:
  - 練習モード: 10問をじっくり練習
  - チャレンジモード: 60秒間のタイムアタック
  - ローマ字モード: キーを1つずつ打つ練習。全8レベル（ホームポジション1行 → 上段・下段 → 2行 → ことば3行）。クリアで次のレベルが解放され、星の数はブラウザに保存。打った文字の読み方を声で読み上げ（F →「エフ」、K→A →「か」）
- **カスタマイズ機能**:
  - 学年別フィルター（1年/2年/3年）
  - カテゴリ別フィルター（動物、学校、自然など）
  - ふりがな表示のON/OFF
- **マインクラフト風デザイン**: ピクセルアート、ブロック感のあるUI
- **ゲーム機能**:
  - リアルタイムスコア計算
  - 正解率トラッキング
  - 連続正解ボーナス
  - 効果音とビジュアルフィードバック
  - ランクシステム（ブロンズ〜ダイヤモンド）

## 🚀 デプロイ

このプロジェクトはVercelにデプロイできます。

### Vercelでのデプロイ方法

1. GitHubにプッシュ
2. [Vercel](https://vercel.com)にログイン
3. 「New Project」をクリック
4. リポジトリを選択
5. デプロイ完了！

## 🎯 使い方

1. 学年とカテゴリを選択
2. モード（練習 or チャレンジ）を選択
3. 表示された漢字の読み方（ひらがな）を入力
4. Enterキーで次の問題へ
5. スコアとランクを確認！

## 🛠️ 技術スタック

- バニラHTML/CSS/JavaScript（フレームワーク不要）
- Web Audio API（効果音・読み上げ）
- Google Fonts（M PLUS Rounded 1c、Press Start 2P）

## 🔊 読み上げ音声

ローマ字モードの声は `voice/voice.mp3`（全部の言葉を1つにまとめた音声）と `voice/voice.json`（各言葉の位置）です。
ページを開いたときに読み込んでおき、打った瞬間に Web Audio API で鳴らします。読み込めないときはブラウザの読み上げ（Web Speech API）を使います。

音声は [Open JTalk](https://open-jtalk.sourceforge.net/)（pyopenjtalk）で作っています。作り直すときは:

```sh
pip install pyopenjtalk numpy   # ffmpeg も必要
python tools/make_voice.py path/to/mei_happy.htsvoice
```

## 🙏 クレジット

- 読み上げの声: HTS Voice "Mei"（mei_happy）
  Copyright (c) 2009-2018 Nagoya Institute of Technology, Department of Computer Science.
  [MMDAgent](https://www.mmdagent.jp/) — [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)

## 📝 ライセンス

MIT（読み上げの声のデータは上記のとおり CC BY 3.0）
