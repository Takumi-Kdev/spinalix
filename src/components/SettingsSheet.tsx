import { useMemo, useRef, useState } from 'react'
import qrcode from 'qrcode-generator'
import { useSpinalix } from '../store'
import { DEFAULT_MODELS } from '../lib/apiBrain'

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const syncMode = useSpinalix((s) => s.syncMode)
  const lan = useSpinalix((s) => s.lan)
  const exportJSON = useSpinalix((s) => s.exportJSON)
  const resetAll = useSpinalix((s) => s.resetAll)
  const api = useSpinalix((s) => s.api)
  const setApi = useSpinalix((s) => s.setApi)
  const autonomous = useSpinalix((s) => s.autonomous)
  const setAutonomous = useSpinalix((s) => s.setAutonomous)
  const importVault = useSpinalix((s) => s.importVault)
  const [confirmReset, setConfirmReset] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const dirRef = useRef<HTMLInputElement>(null)

  const qrSvg = useMemo(() => {
    if (syncMode !== 'brain' || !lan) return null
    try {
      const qr = qrcode(0, 'M')
      qr.addData(lan)
      qr.make()
      return qr.createSvgTag({ cellSize: 4, margin: 2 })
    } catch {
      return null
    }
  }, [syncMode, lan])

  if (!open) return null

  const download = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spinalix-memory-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setImporting(true)
    setImportResult(null)
    const list = Array.from(files)
    const n = await importVault(list)
    setImportResult(n > 0 ? `${n}の断片を取り込みました。回路を再構築しました。` : '取り込めるファイルが見つかりませんでした（.md / .txt）')
    setImporting(false)
  }

  return (
    <div className="fixed inset-0 z-40">
      <button aria-label="閉じる" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] max-w-lg overflow-y-auto rounded-t-3xl border border-hairline bg-ink-2 px-5 pb-10 pt-4">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
        <h3 className="font-serif text-[17px] text-bone">設定 — この記憶について</h3>

        {/* 思考モード */}
        <section className="mt-5 panel rounded-xl p-4">
          <p className="mono text-faint">思考モード</p>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-[13px] text-bone">自立思考</p>
              <p className="mt-0.5 text-[11px] text-faint">オンの間、24秒ごとに記憶を歩いて考えます</p>
            </div>
            <button
              onClick={() => setAutonomous(!autonomous)}
              className={`relative rounded-full transition ${autonomous ? 'bg-amber/80' : 'bg-white/10'}`}
              style={{ height: 20, width: 38 }}
              aria-label="自立思考"
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink transition-all ${autonomous ? 'left-[19px]' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="mt-4 border-t border-hairline pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-bone">AI文体モード（API）</p>
                <p className="mt-0.5 text-[11px] text-faint">
                  思考はエンジンが行い、AIは言葉を整えるだけ。出力は引用の実在などを検証し、違反は破棄します。
                </p>
              </div>
              <button
                onClick={() => setApi({ enabled: !api.enabled })}
                className={`relative ml-3 shrink-0 rounded-full transition ${api.enabled ? 'bg-sky/70' : 'bg-white/10'}`}
                style={{ height: 20, width: 38 }}
                aria-label="AI文体モード"
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink transition-all ${api.enabled ? 'left-[19px]' : 'left-0.5'}`} />
              </button>
            </div>
            {api.enabled && (
              <div className="fadein mt-3 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={api.provider}
                    onChange={(e) => setApi({ provider: e.target.value as typeof api.provider, model: DEFAULT_MODELS[e.target.value as typeof api.provider] })}
                    className="rounded-lg border border-hairline bg-white/[0.03] px-2.5 py-2 text-[12px] text-bone outline-none"
                  >
                    <option value="gemini">Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                  <input
                    value={api.model}
                    onChange={(e) => setApi({ model: e.target.value })}
                    placeholder="model"
                    className="flex-1 rounded-lg border border-hairline bg-white/[0.03] px-3 py-2 text-[12px] text-bone outline-none focus:border-sky/40"
                  />
                </div>
                <input
                  type="password"
                  value={api.apiKey}
                  onChange={(e) => setApi({ apiKey: e.target.value })}
                  placeholder="APIキー（この端末にだけ保存・同期されません）"
                  className="w-full rounded-lg border border-hairline bg-white/[0.03] px-3 py-2 text-[12px] text-bone outline-none focus:border-sky/40"
                />
                <p className="text-[10.5px] leading-relaxed text-faint">
                  キーは localStorage にのみ保存され、brain.json には含まれません。検証に通らない出力は捨てられ、ローカルの文が使われます。
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Obsidian取り込み */}
        <section className="mt-3 panel rounded-xl p-4">
          <p className="mono text-faint">Obsidian Vault 取り込み</p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            あなたのVault（フォルダ）を選ぶと、Markdownから断片を取り込み、回路を組み直します。日付はfrontmatter・ファイル名・更新日時から推定します。
          </p>
          <input
            ref={dirRef}
            type="file"
            multiple
            // @ts-expect-error webkitdirectory はReactの型に無いが主要ブラウザで動作する
            webkitdirectory=""
            className="hidden"
            onChange={(e) => void onImport(e.target.files)}
          />
          <button
            onClick={() => dirRef.current?.click()}
            disabled={importing}
            className="mt-3 rounded-lg border border-amber/40 px-3 py-1.5 text-[12px] text-amber transition hover:bg-amber/10 disabled:opacity-40"
          >
            {importing ? '取り込み中…' : 'Vaultフォルダを選ぶ'}
          </button>
          {importResult && <p className="mt-2 text-[12px] text-teal">{importResult}</p>}
        </section>

        {/* 接続 */}
        <section className="mt-3 panel rounded-xl p-4">
          <p className="mono text-faint">記憶の在りか</p>
          {syncMode === 'brain' ? (
            <>
              <p className="mt-2 text-[13px] leading-relaxed text-bone">
                このMacが「脳」として常駐しています。スマホで下のQRを読むと、同じ記憶に触れられます。
              </p>
              {qrSvg && <div className="mx-auto mt-3 w-[168px] rounded-xl bg-[#ece7dc] p-3" dangerouslySetInnerHTML={{ __html: qrSvg }} />}
              <p className="mt-2 text-center text-[11px] text-amber">{lan}</p>
            </>
          ) : (
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              この画面の記憶は、このブラウザの中だけに保存されています（外部送信なし）。Macに「脳」を常駐させる（
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px]">npm run brain</code>
              ）と、同じWi-FiのスマホからQRコードで同じ記憶に接続できます。ダウンロード版アプリでは自動で常駐します。
            </p>
          )}
        </section>

        {/* データ主権 */}
        <section className="mt-3 panel rounded-xl p-4">
          <p className="mono text-faint">データ主権</p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            想起も、感情も、断片も、この端末（またはMacのJSONファイル）の外には出ません。いつでも書き出せます。
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={download} className="rounded-lg border border-amber/40 px-3 py-1.5 text-[12px] text-amber transition hover:bg-amber/10">
              記憶を書き出す（JSON）
            </button>
            {!confirmReset ? (
              <button onClick={() => setConfirmReset(true)} className="rounded-lg border border-hairline px-3 py-1.5 text-[12px] text-faint transition hover:text-bone">
                リセット
              </button>
            ) : (
              <button
                onClick={() => {
                  resetAll()
                  setConfirmReset(false)
                  onClose()
                }}
                className="rounded-lg border border-coral/50 px-3 py-1.5 text-[12px] text-coral"
              >
                本当に戻す
              </button>
            )}
          </div>
        </section>

        {/* 思想 */}
        <section className="mt-3 panel rounded-xl p-4">
          <p className="mono text-faint">思想</p>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-muted">
            <li>・想起は捏造しない。すべての文に、実在の断片という出典がある。</li>
            <li>・忖度しない。あなたの矛盾は、隠さず指摘する。</li>
            <li>・依存させない。通知は1日2回まで。もっと使わせる設計をしない。</li>
            <li>・AIに考えさせない。思考はエンジンが行い、AIは文体だけを借りる。</li>
          </ul>
        </section>

        <p className="mt-5 text-center text-[10.5px] text-faint">
          Spinalix — Built by Takumi Kawai for Next Founders Hackathon 2026.
        </p>
      </div>
    </div>
  )
}
