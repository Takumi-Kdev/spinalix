# 5分動画 台本（日本語ナレーション + 英語字幕）

対象: Next Founders Hackathon / 提出は5分以内（**4:50を目標に**）
構成は審査基準どおり: **Problem → Build → Demo → Scalability**（+ Business）

---

## 録画前の準備（15分）

1. デモをきれいな状態に戻す: ブラウザで `⋯ → リセット → 本当に戻す`（想起が「自己引用」から始まる形に戻る）
2. Mac常駐モードを起動: ターミナルで `npm run brain`（QR付きの状態にしておく）
3. iPhone: 設定の据え置き（通知オフ・横向きロック解除）、画面録画をControl Centerに追加
4. 音量: 静かな部屋。イヤホンマイク or Mac内蔵マイク。マイクテストを30秒
5. 画面: ブラウザのズームは100%・タブは spinalix だけ・余計な通知を切る
6. 解像度: Mac側は1080p（動画は1080pで書き出し）。iPhoneは画面収録（3:2や横でOK）

**使うもの**: QuickTime（画面収録・音声同時）or Shift+Cmd+5。iPhoneは「画面収録」。編集はiMovie/CapCut等でOK。

---

## シーン別台本

### S0. フック（0:00–0:20）— iPhone画面

**画面**: ホームの「自己引用」カードを映す（3月10日→9月5日の想起）

**ナレーション**:
> 「これは、AIが書いた文章です。でも、AIが使ったのは——私自身の言葉だけ。
> 3月10日の『心臓がうるさい』。9月5日の私が、それを自分で引用している。Spinalixは、それを勝手に、見つけてくる。」

**字幕（EN）**:
> "This was written by AI. But the only words it used were mine.
> 'My heart was pounding' — March 10. My September self quoted it. Spinalix found that — on its own."

---

### S1. 問題（0:20–0:50）— Mac画面（README/スライド）

**画面**: READMEの「これは何か」セクション、またはスライド1枚

**ナレーション**:
> 「メモは、貯まる。でも、読み返されない。
> チャットAIの答えは、抽象的で、自分ごとにならない。
> 問題は、記憶が足りないことじゃない。**自分の記憶が、使われないこと**です。」

**字幕**:
> "Notes pile up. Never read again. AI gives generic answers.
> The problem isn't a lack of memory. It's that our own memories never get used."

---

### S2. The Build（0:50–1:40）— Mac画面（コードと構成図）

**画面**:
1. `docs/ARCHITECTURE.md` のアーキテクチャ図（Mermaid）
2. `src/lib/engine.ts` を開き、`buildLinks`（6種類の回路: recall/echo/tension/…）をスクロール
3. `npm test` を実行して12件のテストが通るのを見せる
4. （余裕があれば）`src/lib/emotion.ts` の8感情ベクトル

**ナレーション**:
> 「Spinalixの心臓は、端末の中で動く記憶エンジンです。
> 断片のペアを全部見て、6種類の回路を張ります。自己引用、矛盾、反響、近さ、テーマ、人。
> たとえば『矛盾』は、同じテーマで感情の向きが正反対の記憶。5月の『諦めたほうがいい』と、10月の『明日、出す。』。
> すべて決定論的で、テストで守られています。外部のAI APIは使いません。だから、審査員の皆さんのブラウザでも、キーなしで全部動きます。」

**字幕**:
> "Spinalix's heart is a memory engine that runs on-device.
> It compares every pair of fragments and weaves 6 kinds of circuits — self-quote, tension, echo, closeness, theme, people.
> Everything is deterministic and covered by tests. No external AI APIs — so it runs for you with no keys."

---

### S3. The Demo（1:40–3:10）— iPhone中心（実演）

**3-1 捕獲（1:40–2:05）**
**画面**: `+ 記憶する` → 一行入力「今日は、先生に写真をほめられて嬉しかった。でも少し、恥ずかしかった。」→ 感情チップ「喜び」強さ4 → 記憶する

**ナレーション**:
> 「記録は5秒。一行と、感情ひとつ。整理は、一切いりません。」

**3-2 回路（2:05–2:25）**
**画面**: 「回路」タブ → グラフが広がる → 中心へ → タップで断片をひらく

**ナレーション**:
> 「断片は自動で回路になります。感情は色。リンクは種類。Obsidianの手動リンクの、正反対です。」

**3-3 想起と採否（2:25–2:55）**
**画面**: ホーム → 矛盾カード（5/6 ↔ 10/14）を表示 → 「これは私だ」→ 次の反響カード → 「これは私だ」

**ナレーション**:
> 「ホームを開くと、システムの側から想起が届いています。
> 『5月のあなたは、諦めたほうがいいと言った。10月のあなたは——明日、出す。どちらが本当のあなた?』
> 不快になることもあります。でも、これは**忖度しない**ということです。
> 気に入った想起だけ『これは私だ』で定着させる。その選択から、システムは私の感覚を学びます。」

**字幕（要訳）**:
> "It speaks first. 'In May you said: give up. In October you said: I'll submit it tomorrow. Which is the real you?'
> Uncomfortable — but that's what it means to not flatter. I keep the ones that are true. It learns from my choice."

**3-4 目的モード（2:55–3:10）**
**画面**: 目的タブ → 「留学に行くべきか、迷っている」→ 思考結晶（感情の弧・想起・洞察・矛盾・次の一歩）

**ナレーション**:
> 「決断したい時は、目的モード。私の8ヶ月分の断片から、思考結晶が組み上がります。引用は全部、実在の私の記憶。」

---

### S4. Scalability（3:10–3:45）— Mac画面（アーキテクチャ図とターミナル）

**画面**: アーキテクチャ図 → `server.mjs` の起動画面（LAN URL）→ 設定シートのQR → iPhoneでQRを読み、同じ記憶が出る（2台並べると◎）

**ナレーション**:
> 「スケーラビリティは、2つの設計で担保します。
> 1つ目、**処理が端末内**であること。AIのクラウド原価がゼロで、ユーザーが増えてもコストが増えません。
> 2つ目、**同期は最小限**。Macに常駐する『脳』と同じWi-Fiのスマホが、QRひとつで同じ記憶に接続します。将来はE2E暗号化で、複数端末へ。
> 断片が1万を超えるようなら、回路計算はバケット化して、ローカルのキャッシュに載せ替えます。」

**字幕（要訳）**:
> "Processing is on-device: no cloud AI cost, no cost per user. The 'brain' lives on my Mac; my phone joins over the LAN with one QR scan. Next step: E2E-encrypted sync."

---

### S5. Business（3:45–4:35）— Mac画面（BUSINESS-MODEL.md / financial-model.csv）

**画面**: ビジネス文書の表（価格・市場・LTV）→ 財務モデルのCSV（24ヶ月のグラフがあればなおよい）

**ナレーション**:
> 「ビジネスです。無料はローカル完結のまま。Proは月780円で、端末間同期や音声、感情レポートがつきます。
> 前例: AIジャーナルのRosebudは月12.99ドルで、600万ドルを調達しています。デジタル日記の市場は6600億円規模、年10%で伸びています。
> 原価の大半は端末内——だから粗利率は95%。さらに年1回、想起を本にする『記憶の本』4,800円が乗ります。
> 3年で5万人の有料課金で、年4.7億円。数字はすべて仮定としてモデル化してあります。」

**字幕（要訳）**:
> "Free stays local. Pro is ¥780/mo. Rosebud proved AI journals pay ($12.99/mo, $6M raised). 95% gross margin. Plus a yearly printed 'Book of Memory'. All assumptions documented."

---

### S6. クローズ（4:35–4:55）— ホーム画面

**画面**: ホームの想起カードに戻る

**ナレーション**:
> 「Spinalixは、あなたを評価しません。励ましもしません。ただ、**あなたが忘れていたあなた**を、返してきます。
> 記憶は、あなたの手元に。AIに、あなたの内面を渡さない。
> Spinalix——記憶が、あなたに話しかける。」

**字幕**:
> "Spinalix doesn't rate you. It doesn't flatter you. It just gives you back the parts of you you'd forgotten.
> Your memory stays with you. Spinalix — a memory that speaks to you."

---

## 編集メモ

- ナレーションは**先に録ってから**画面を合わせると失敗が少ない（編集で尺を合わせる）
- 英語字幕はCapCut等の自動字幕でもよいが、**上記の訳文をそのまま貼る**方が正確
- 早口にならないこと。5分は意外と長い。沈黙は恐れない
- 冒頭のフック（S0）だけは何度でも撮り直す価値あり
- 書き出し: 1080p / 30fps / MP4

## 提出前チェック

- [ ] 再生時間 ≤ 5:00
- [ ] Problem → Build（コード/構成の画面共有）→ Demo（実動作）→ Scalability の順
- [ ] 音声が聞こえる・字幕が正確
- [ ] Devpostの動画欄（YouTube限定公開 or Vimeo、**限定公開**にする）にURLを貼る
