import { EMOTION_META } from '../lib/emotion'

const PIPELINE = [
  {
    n: '01',
    name: '活性化',
    en: 'activation.ts',
    body: '感情の強さ × 忘却曲線 × 参照された回数で、いま心の中で温まっている記憶を計算する。直近の断片と強い感情が「今のあなた」になる。',
    math: 'A(f) = 0.5·I + 0.3·2^(−age/180) + 0.14·R + s',
  },
  {
    n: '02',
    name: '回路',
    en: 'engine.ts',
    body: '記憶の全ペアから6種のリンクを張る。自己引用・矛盾・反響・近さ・テーマ・人。種類ごとの上限で「少数精鋭」に保つ。',
    math: 'recall 1.0 / tension 0.85 / echo 0.8 / similar 0.5 / person 0.4 / theme 0.3',
  },
  {
    n: '03',
    name: '分析',
    en: 'analysis.ts',
    body: 'テーマの弧、開いた輪（言ったのに、やっていないこと）、人プロフィール、問い。思考の材料になる構造を先に見つける。',
    math: 'open loop = wants(f) − 0.6·actions(f)',
  },
  {
    n: '04',
    name: '思考歩行',
    en: 'walk.ts',
    body: '活性の高い記憶から、グラフをビーム探索で歩く。5つの歩き方で道筋を探し、時間の往復は減点する。',
    math: 'beam width 5 / hops ≤ 3 / decay 0.55',
  },
  {
    n: '05',
    name: '言語化',
    en: 'render.ts',
    body: '断片から「いちばん強い一節」を抽出し、道筋を文につなぐ。引用はあなたの言葉のまま、接続だけをエンジンが与える。',
    math: 'quote = argmax(clause score)',
  },
  {
    n: '06',
    name: '検証',
    en: 'verify.ts',
    body: 'AI文体モードでも、引用の実在・日付の捏造・ありきたりな励ましを検査し、違反した出力は破棄する。',
    math: 'reject: fabricated quote / new date / generic advice',
  },
]

const WALK_MODES = [
  ['共鳴', 'resonance', '過去の自分の言葉が、今に効いている道'],
  ['対照', 'contrast', '向きが変わった道（矛盾）'],
  ['反すう', 'dwell', '同じ感情が続いている道'],
  ['軌跡', 'arc', '一本の道（最大3ホップ）'],
  ['跳躍', 'leap', '言葉は無関係で、感情だけが同じ道'],
]

const POSITIONING: [string, string, string, string, string][] = [
  ['記憶の構造化', '手動リンク', 'なし（フラット）', 'なし', '自動（6種の回路）'],
  ['感情の扱い', '文字列', 'なし', 'プロンプトの材料', '第一級データ（強度・推移）'],
  ['想起の生成', 'なし', 'なし', '書いた時の応答', 'システムが先に話す'],
  ['矛盾の指摘', 'なし', 'なし', '稀に', '設計として行う'],
  ['データの場所', 'ローカル', 'クラウド', 'クラウド', 'ローカル（JSONを持ち出せる）'],
  ['AIの役割', 'なし', 'モデルが記憶を持つ', 'モデルが応答', 'AIは文体のみ・検証つき'],
]

export function LandingView() {
  return (
    <div className="min-h-full">
      {/* 上部 */}
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-[1080px] items-baseline justify-between px-6 py-4">
          <div className="flex items-baseline gap-2.5">
            <span className="font-serif text-[19px] text-bone">Spinalix</span>
            <span className="seal text-[10px]">脊</span>
          </div>
          <nav className="flex items-baseline gap-6 text-[12.5px] text-muted">
            <a href="#engine" className="transition hover:text-bone">
              エンジン
            </a>
            <a href="#system" className="transition hover:text-bone">
              システム
            </a>
            <a href="#position" className="transition hover:text-bone">
              位置づけ
            </a>
            <a href="#/app" className="text-shu underline-offset-4 transition hover:underline">
              アプリを開く
            </a>
          </nav>
        </div>
      </header>

      {/* ヒーロー（左右非対称の編集レイアウト） */}
      <section className="mx-auto grid max-w-[1080px] gap-10 px-6 pb-16 pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14 lg:pt-20">
        <div>
          <h1 className="font-serif text-[30px] leading-[1.6] text-bone lg:text-[38px] lg:leading-[1.55]">
            記憶を貯めるのではない。
            <br />
            記憶に、考えさせる。
          </h1>
          <p className="mt-6 max-w-[520px] text-[14.5px] leading-[2] text-muted">
            断片を一行残すと、エンジンが回路を組み、あなたの内側から「ふと思い浮かぶ思考」を組み上げる。
            自己引用、矛盾、開いた輪。すべての想起には出典と思考の足跡が付く。思考はエンジンが行い、AIには文体だけを許す。
          </p>
          <div className="mt-8 flex flex-wrap items-baseline gap-6 text-[13.5px]">
            <a href="#/app" className="rounded-[6px] bg-shu px-5 py-3 font-bold text-paper transition active:translate-y-px">
              デモを開く
            </a>
            <a
              href="https://github.com/Takumi-Kdev/spinalix/releases/latest"
              className="text-bone underline-offset-4 transition hover:underline"
            >
              Macアプリをダウンロード
            </a>
          </div>
          <p className="mt-4 text-[11.5px] text-faint">キー不要。デモはブラウザ内だけで動きます（外部送信なし）。</p>
        </div>

        {/* 右：実物の想起（便箋）と余白の注記 */}
        <div className="lg:pt-2">
          <article className="letter px-6 pb-5 pt-5">
            <header className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="seal text-[15px]">引</span>
                <div>
                  <p className="text-[13px] text-sumi">自己引用</p>
                  <p className="tnum text-[10.5px] text-[#5f584a]">10月15日</p>
                </div>
              </div>
              <p className="text-[10.5px] text-[#5f584a]">ローカル思考</p>
            </header>
            <p className="mt-4 font-serif text-[16px] leading-[1.95] text-sumi">
              「心臓がうるさい」——3月10日のこの一行を、179日後の9月5日、あなたは自分で引用している。「あれが、たぶん答えだ」
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 text-[12px] text-sumi/85">
              <span className="text-[#5f584a]">出典</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: EMOTION_META.anticipation.color }} />
                3月10日
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: EMOTION_META.joy.color }} />
                9月5日
              </span>
            </div>
          </article>
          <div className="mt-5 border-t border-rule pt-4">
            <p className="text-[11.5px] leading-relaxed text-faint">
              デモの記憶（実測）: 64の断片 / 265の回路 / 7種の思考 / 17のテスト
              <br />
              8ヶ月分のサンプル記憶から、エンジンが実際に見つけた想起です。
            </p>
          </div>
        </div>
      </section>

      {/* 問題 */}
      <section className="border-t border-rule">
        <div className="mx-auto grid max-w-[1080px] gap-8 px-6 py-14 lg:grid-cols-3">
          <p className="text-[13px] text-faint">問題</p>
          <div className="lg:col-span-2">
            <p className="text-[15.5px] leading-[2.1] text-bone">
              メモは貯まるが、二度と読み返されない。AIに考えさせると、平均的な答えが返ってくる。
              問題は、記憶が足りないことではなく、
              <span className="border-b border-shu pb-0.5">自分の記憶が使われないこと</span>です。
            </p>
          </div>
        </div>
      </section>

      {/* エンジン */}
      <section id="engine" className="border-t border-rule">
        <div className="mx-auto max-w-[1080px] px-6 py-14">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-[24px] text-bone">エンジン</h2>
            <p className="text-[11.5px] text-faint">すべて端末内・決定論的。同じ入力からは、同じ想起が出ます。</p>
          </div>

          <div className="mt-8 divide-y divide-rule border-y border-rule">
            {PIPELINE.map((p) => (
              <div key={p.n} className="grid gap-3 py-5 lg:grid-cols-[64px_180px_1fr_300px] lg:items-baseline lg:gap-6">
                <span className="tnum text-[11px] text-faint">{p.n}</span>
                <div>
                  <p className="text-[15px] text-bone">{p.name}</p>
                  <p className="tnum text-[10.5px] text-faint">{p.en}</p>
                </div>
                <p className="text-[13px] leading-[1.95] text-muted">{p.body}</p>
                <p className="tnum text-[10.5px] leading-relaxed text-faint">{p.math}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[240px_1fr]">
            <div>
              <p className="text-[13px] text-bone">5つの歩き方</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-faint">
                ビーム探索で記憶グラフを歩き、道筋のスコアを比較して、いちばん強い道を選ぶ。
              </p>
            </div>
            <div className="grid gap-x-10 gap-y-2 lg:grid-cols-2">
              {WALK_MODES.map(([jp, en, desc]) => (
                <div key={en} className="flex items-baseline gap-3 py-1">
                  <span className="w-10 shrink-0 text-[13px] text-bone">{jp}</span>
                  <span className="tnum w-20 shrink-0 text-[10.5px] text-faint">{en}</span>
                  <span className="text-[12px] text-muted">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 border-t border-rule pt-6">
            <p className="text-[13.5px] leading-[2] text-muted">
              <span className="text-bone">AIに考えさせない、という設計。</span>{' '}
              API文体モードでも、渡すのはエンジンが組み上げた〈思考状態〉だけです。LLMは日本語を整える「文体家」で、返答は検証層を通ります。
              記憶にない引用、出典にない日付、ありきたりな励ましは、破棄されてローカルの文に戻ります。
            </p>
          </div>
        </div>
      </section>

      {/* システム */}
      <section id="system" className="border-t border-rule">
        <div className="mx-auto grid max-w-[1080px] gap-10 px-6 py-14 lg:grid-cols-[1fr_420px]">
          <div>
            <h2 className="font-serif text-[24px] text-bone">システム</h2>
            <p className="mt-4 max-w-[520px] text-[13.5px] leading-[2] text-muted">
              単体のアプリではありません。Macに常駐する脳、スマホからの接続、Obsidianの取り込み、検証つきのAI文体、そしてローカルの記憶ファイル。ひとつの記憶が、複数の面で使われます。
            </p>
            <ul className="mt-6 space-y-3 text-[13px] text-muted">
              <li className="flex gap-3">
                <span className="tnum w-5 text-faint">1</span>
                <span>
                  <span className="text-bone">Macアプリ（Electron）</span> — メニューバーに常駐。どこからでも ⌥Space で記録。
                </span>
              </li>
              <li className="flex gap-3">
                <span className="tnum w-5 text-faint">2</span>
                <span>
                  <span className="text-bone">スマホ（PWA）</span> — 同じWi-FiからQRコードひとつで、同じ脳に接続。
                </span>
              </li>
              <li className="flex gap-3">
                <span className="tnum w-5 text-faint">3</span>
                <span>
                  <span className="text-bone">Obsidian取り込み</span> — 既存のVaultのMarkdownを断片として回路に組み込む。
                </span>
              </li>
              <li className="flex gap-3">
                <span className="tnum w-5 text-faint">4</span>
                <span>
                  <span className="text-bone">API文体モード</span> — Gemini / OpenAI / Anthropic。検証に落ちた出力は使いません。
                </span>
              </li>
              <li className="flex gap-3">
                <span className="tnum w-5 text-faint">5</span>
                <span>
                  <span className="text-bone">brain.json</span> — 記憶は1つのJSONファイル。いつでも書き出せて、読める形。
                </span>
              </li>
            </ul>
          </div>

          {/* システム図（線と文字だけ） */}
          <div className="border border-rule p-5">
            <svg viewBox="0 0 380 300" className="w-full">
              <g fontFamily="Zen Kaku Gothic New, sans-serif" fontSize="11" fill="#9a9182">
                <rect x="10" y="60" width="150" height="80" fill="none" stroke="#e7dfcf" strokeOpacity="0.5" />
                <text x="24" y="86" fill="#e7dfcf" fontSize="12">Macアプリ（常駐）</text>
                <text x="24" y="106">⌥Space 捕獲 / メニューバー</text>
                <text x="24" y="124">brain.json（ローカル）</text>

                <rect x="220" y="20" width="150" height="52" fill="none" stroke="#e7dfcf" strokeOpacity="0.5" />
                <text x="234" y="42" fill="#e7dfcf" fontSize="12">スマホ（PWA）</text>
                <text x="234" y="60">QRで同一Wi-Fi接続</text>

                <rect x="220" y="100" width="150" height="52" fill="none" stroke="#e7dfcf" strokeOpacity="0.5" />
                <text x="234" y="122" fill="#e7dfcf" fontSize="12">Obsidian Vault</text>
                <text x="234" y="140">Markdownを取り込み</text>

                <rect x="220" y="180" width="150" height="52" fill="none" stroke="#c8442a" strokeOpacity="0.7" />
                <text x="234" y="202" fill="#e06a4a" fontSize="12">API文体 + 検証</text>
                <text x="234" y="220">違反は破棄される</text>

                <rect x="10" y="200" width="150" height="62" fill="none" stroke="#e7dfcf" strokeOpacity="0.5" />
                <text x="24" y="224" fill="#e7dfcf" fontSize="12">記憶エンジン</text>
                <text x="24" y="242">活性化 → 歩行 → 言語化</text>

                <line x1="160" y1="230" x2="220" y2="206" stroke="#e7dfcf" strokeOpacity="0.35" />
                <line x1="160" y1="100" x2="220" y2="46" stroke="#e7dfcf" strokeOpacity="0.35" />
                <line x1="160" y1="100" x2="220" y2="126" stroke="#e7dfcf" strokeOpacity="0.35" />
                <line x1="85" y1="140" x2="85" y2="200" stroke="#e7dfcf" strokeOpacity="0.35" />
              </g>
            </svg>
            <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
              すべての面が、同じエンジンと同じ記憶を共有する。
            </p>
          </div>
        </div>
      </section>

      {/* 画面 */}
      <section id="screens" className="border-t border-rule">
        <div className="mx-auto max-w-[1080px] px-6 py-14">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-[24px] text-bone">画面</h2>
            <a href="#/app" className="text-[12px] text-shu underline-offset-4 transition hover:underline">
              デモを自分で触る
            </a>
          </div>
          <figure className="mt-6">
            <img src="./gallery/03-flow.png" alt="流れ — 8ヶ月の感情の川" className="w-full border border-rule" loading="lazy" />
            <figcaption className="mt-2 text-[11.5px] text-faint">
              流れ — 8ヶ月の記憶を感情の川として見る。棒は断片（高さ＝感情の強さ、色＝感情）、朱の線は月ごとの快-不快の平均。
            </figcaption>
          </figure>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <figure>
              <img src="./gallery/02-circuit.png" alt="回路 — 記憶回路" className="w-full border border-rule" loading="lazy" />
              <figcaption className="mt-2 text-[11.5px] leading-relaxed text-faint">
                回路 — 6種のリンクで結ばれた記憶。想起の道筋が朱の粒として走る。
              </figcaption>
            </figure>
            <figure>
              <img src="./gallery/04-stream.png" alt="思考 — 自立思考の記録" className="w-full border border-rule" loading="lazy" />
              <figcaption className="mt-2 text-[11.5px] leading-relaxed text-faint">
                思考 — 自立思考モードの記録。すべての想起に言語化・検証までの足跡が残る。
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* テスト */}
      <section className="border-t border-rule">
        <div className="mx-auto grid max-w-[1080px] gap-8 px-6 py-14 lg:grid-cols-[240px_1fr]">
          <div>
            <h2 className="font-serif text-[24px] text-bone">テスト</h2>
            <p className="mt-2 text-[11.5px] leading-relaxed text-faint">17のテストが、エンジンの約束を守ります。</p>
          </div>
          <ul className="max-w-[620px] space-y-2 text-[12.5px] leading-relaxed text-muted">
            <li>仕込んだ自己引用（「心臓がうるさい」）が、実際に検出されること</li>
            <li>仕込んだ矛盾（5月の諦めと10月の決断）が、実際に検出されること</li>
            <li>1件目の想起が自己引用、2件目が矛盾になること（デモの筋書き）</li>
            <li>想起の出典が、すべて実在の断片であること</li>
            <li>同じ入力からは、同じ想起が出ること（決定論性）</li>
            <li>使った記憶の組み合わせを、二度使わないこと</li>
            <li>採用した想起が、機械の断片として回路に定着すること</li>
            <li>思考結晶が、根拠つきの洞察と矛盾を返すこと</li>
          </ul>
        </div>
      </section>

      {/* 設計判断の記録 */}
      <section className="border-t border-rule">
        <div className="mx-auto grid max-w-[1080px] gap-8 px-6 py-14 lg:grid-cols-[240px_1fr]">
          <h2 className="font-serif text-[24px] text-bone">設計判断</h2>
          <div className="max-w-[620px] space-y-4 text-[13.5px] leading-[2] text-muted">
            <p>
              <span className="text-bone">リンクは、少数精鋭に。</span>{' '}
              最初の実装は回路が多すぎて、矛盾がノイズになった。ノードごと・種類ごとに上限を設け、上位だけを残すようにした。
            </p>
            <p>
              <span className="text-bone">AIには、考えさせない。</span>{' '}
              LLMに想起を作らせると、平均的な答えに寄っていく。思考はエンジンが決定論的に組み、AIには文体だけを許して、門番が検証する形にした。
            </p>
            <p>
              <span className="text-bone">足すより、削る。</span>{' '}
              発光するノード、紫のグラデーション、等間隔のカード。いわゆる「AIらしい見た目」を全部削って、墨と紙と朱だけにした。
            </p>
            <p>
              <span className="text-bone">説明できない想起は、出さない。</span>{' '}
              起点の活性値、検討した道筋、選ばなかった候補。すべてを解剖として開示することを、機能の一部にした。
            </p>
          </div>
        </div>
      </section>

      {/* 位置づけ */}
      <section id="position" className="border-t border-rule">
        <div className="mx-auto max-w-[1080px] px-6 py-14">
          <h2 className="font-serif text-[24px] text-bone">位置づけ</h2>
          <p className="mt-3 text-[12.5px] text-muted">既存の道具との違い。「AIメモリー」の隣に置くと、役割がはっきりします。</p>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-rule text-[12px] text-faint">
                  <th className="py-3 pr-4 font-normal"></th>
                  <th className="py-3 pr-4 font-normal">Obsidian</th>
                  <th className="py-3 pr-4 font-normal">ChatGPTの記憶</th>
                  <th className="py-3 pr-4 font-normal">AI日記アプリ</th>
                  <th className="py-3 pr-4 font-normal text-shu">Spinalix</th>
                </tr>
              </thead>
              <tbody>
                {POSITIONING.map(([row, a, b, c, d]) => (
                  <tr key={row} className="border-b border-rule align-top text-[12.5px]">
                    <td className="py-3 pr-4 text-muted">{row}</td>
                    <td className="py-3 pr-4 text-faint">{a}</td>
                    <td className="py-3 pr-4 text-faint">{b}</td>
                    <td className="py-3 pr-4 text-faint">{c}</td>
                    <td className="py-3 pr-4 text-bone">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 倫理 */}
      <section className="border-t border-rule">
        <div className="mx-auto grid max-w-[1080px] gap-8 px-6 py-14 lg:grid-cols-[240px_1fr]">
          <h2 className="font-serif text-[24px] text-bone">倫理</h2>
          <div className="max-w-[620px] space-y-4 text-[13.5px] leading-[2] text-muted">
            <p>
              <span className="text-bone">捏造しない。</span> 生成物は実在の断片に接地し、思考の足跡を必ず表示する。
            </p>
            <p>
              <span className="text-bone">忖度しない。</span> 同意や励ましではなく、矛盾と開いた輪を提示する。
            </p>
            <p>
              <span className="text-bone">依存させない。</span> 通知は多くしない。使わせ続ける設計をしない。
            </p>
            <p>
              <span className="text-bone">渡さない。</span> 感情データは端末の外に出さない。いつでもJSONで持ち出せる。
            </p>
            <p>
              <span className="text-bone">AIに考えさせない。</span> 思考はエンジンが行い、AIには文体だけを許す。
            </p>
          </div>
        </div>
      </section>

      {/* 事業 */}
      <section className="border-t border-rule">
        <div className="mx-auto grid max-w-[1080px] gap-8 px-6 py-14 lg:grid-cols-[240px_1fr]">
          <h2 className="font-serif text-[24px] text-bone">事業</h2>
          <div className="max-w-[620px]">
            <p className="text-[13.5px] leading-[2] text-muted">
              無料はローカル完結のまま。Proは月780円（端末間同期・音声・感情レポート）。年1回の「記憶の本」は4,800円。
              処理の大半が端末内で完結するため、粗利率は95%を超える構造です。AIジャーナルのRosebudは月12.99ドルで600万ドルを調達し、
              デジタル日記アプリの市場は2026年に6,300〜7,300億円規模と推計されています。
            </p>
            <p className="mt-4 text-[12.5px] text-faint">
              詳細: <span className="tnum">business/BUSINESS-MODEL.md / financial-model.csv</span>（このリポジトリ内）
            </p>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-baseline justify-between gap-4 px-6 py-8 text-[11.5px] text-faint">
          <p>
            Spinalix — Built by Takumi Kawai for Next Founders Hackathon 2026. デモの記憶は8ヶ月分のサンプルです。
          </p>
          <div className="flex gap-6">
            <a href="#/app" className="transition hover:text-bone">
              アプリ
            </a>
            <a href="https://github.com/Takumi-Kdev/spinalix" className="transition hover:text-bone">
              GitHub
            </a>
            <a href="https://github.com/Takumi-Kdev/spinalix/releases/latest" className="transition hover:text-bone">
              Macアプリ
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
