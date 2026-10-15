import { useMemo, useRef, useState } from 'react'
import qrcode from 'qrcode-generator'
import { useSpinalix } from '../store'
import { DEFAULT_MODELS } from '../lib/apiBrain'

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button onClick={onToggle} aria-label={label} className="flex items-center gap-2">
      <span className={`h-[1px] w-6 ${on ? 'bg-shu' : 'bg-rule'}`} />
      <span className={`tnum text-[11px] ${on ? 'text-shu' : 'text-faint'}`}>{on ? '入' : '切'}</span>
    </button>
  )
}

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
      return qr.createSvgTag({ cellSize: 4, margin: 1 })
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
    const n = await importVault(Array.from(files))
    setImportResult(n > 0 ? `${n}の断片を取り込み、回路を再構築しました。` : '取り込めるファイルが見つかりませんでした（.md / .txt）')
    setImporting(false)
  }

  return (
    <div className="fixed inset-0 z-40">
      <button aria-label="閉じる" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] max-w-lg overflow-y-auto border-t border-rule bg-ink-2 px-6 pb-10 pt-6">
        <div className="flex items-baseline justify-between">
          <h3 className="font-serif text-[17px] text-bone">設定</h3>
          <button onClick={onClose} className="text-[12px] text-muted underline-offset-4 hover:underline">
            閉じる
          </button>
        </div>

        {/* 思考 */}
        <section className="mt-6 border-t border-rule pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13.5px] text-bone">自立思考</p>
              <p className="mt-0.5 text-[11.5px] text-faint">オンの間、24秒ごとに記憶を歩いて考えます</p>
            </div>
            <Toggle on={autonomous} onToggle={() => setAutonomous(!autonomous)} label="自立思考" />
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div>
              <p className="text-[13.5px] text-bone">AI文体モード（API）</p>
              <p className="mt-0.5 max-w-[300px] text-[11.5px] leading-relaxed text-faint">
                思考はエンジンが行います。AIには文体だけを許し、引用の実在・日付・決まり文句を検証して、違反は破棄します。
              </p>
            </div>
            <Toggle on={api.enabled} onToggle={() => setApi({ enabled: !api.enabled })} label="AI文体モード" />
          </div>

          {api.enabled && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-3">
                <select
                  value={api.provider}
                  onChange={(e) => setApi({ provider: e.target.value as typeof api.provider, model: DEFAULT_MODELS[e.target.value as typeof api.provider] })}
                  className="border-b border-rule bg-transparent py-1 text-[12.5px] text-bone outline-none"
                >
                  <option value="gemini">Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
                <input
                  value={api.model}
                  onChange={(e) => setApi({ model: e.target.value })}
                  className="flex-1 border-b border-rule bg-transparent py-1 text-[12.5px] text-bone outline-none focus:border-shu"
                />
              </div>
              <input
                type="password"
                value={api.apiKey}
                onChange={(e) => setApi({ apiKey: e.target.value })}
                placeholder="APIキー（この端末にだけ保存・同期されません）"
                className="w-full border-b border-rule bg-transparent py-1 text-[12.5px] text-bone outline-none placeholder:text-faint focus:border-shu"
              />
              <p className="text-[10.5px] leading-relaxed text-faint">
                キーは localStorage にのみ保存され、brain.json には含まれません。検証に落ちた出力は捨てられ、ローカルの文が使われます。
              </p>
            </div>
          )}
        </section>

        {/* Obsidian */}
        <section className="mt-6 border-t border-rule pt-4">
          <p className="text-[13.5px] text-bone">Obsidian Vault 取り込み</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-faint">
            あなたのVault（フォルダ）を選ぶと、Markdownの本文が断片として回路に組み込まれます。日付はfrontmatter・ファイル名・更新日時から推定します。
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
          <button onClick={() => dirRef.current?.click()} disabled={importing} className="mt-2 text-[12.5px] text-shu underline-offset-4 transition hover:underline disabled:opacity-40">
            {importing ? '取り込み中…' : 'Vaultフォルダを選ぶ'}
          </button>
          {importResult && <p className="mt-2 text-[11.5px] text-bone">{importResult}</p>}
        </section>

        {/* 接続 */}
        <section className="mt-6 border-t border-rule pt-4">
          <p className="text-[13.5px] text-bone">記憶の在りか</p>
          {syncMode === 'brain' ? (
            <>
              <p className="mt-1 text-[11.5px] leading-relaxed text-faint">
                このMacが脳として常駐しています。スマホで下の印を読むと、同じ記憶に触れられます。
              </p>
              <div className="mt-3 flex items-center gap-5">
                {qrSvg && <div className="letter w-[150px] p-2.5" dangerouslySetInnerHTML={{ __html: qrSvg }} />}
                <p className="tnum text-[11px] text-muted">{lan}</p>
              </div>
            </>
          ) : (
            <p className="mt-1 text-[11.5px] leading-relaxed text-faint">
              記憶はこのブラウザの中だけに保存されています（外部送信なし）。Macに脳を常駐させる（
              <span className="tnum text-muted">npm run brain</span>
              ）か、配布アプリでは自動で常駐し、同じWi-Fiのスマホから印ひとつで接続できます。
            </p>
          )}
        </section>

        {/* データ */}
        <section className="mt-6 border-t border-rule pt-4">
          <p className="text-[13.5px] text-bone">データ主権</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-faint">
            想起も、感情も、断片も、この端末（またはMacのJSONファイル）の外には出ません。いつでも書き出せます。
          </p>
          <div className="mt-2 flex items-center gap-5">
            <button onClick={download} className="text-[12.5px] text-shu underline-offset-4 transition hover:underline">
              記憶を書き出す（JSON）
            </button>
            {!confirmReset ? (
              <button onClick={() => setConfirmReset(true)} className="text-[12.5px] text-faint underline-offset-4 transition hover:text-bone hover:underline">
                リセット
              </button>
            ) : (
              <button
                onClick={() => {
                  resetAll()
                  setConfirmReset(false)
                  onClose()
                }}
                className="text-[12.5px] text-shu underline"
              >
                本当に戻す
              </button>
            )}
          </div>
        </section>

        {/* 思想 */}
        <section className="mt-6 border-t border-rule pt-4">
          <p className="text-[13.5px] text-bone">思想</p>
          <ul className="mt-1.5 space-y-1 text-[11.5px] leading-relaxed text-faint">
            <li>想起は捏造しない。すべての文に、実在の断片という出典がある。</li>
            <li>忖度しない。あなたの矛盾は、隠さず指摘する。</li>
            <li>依存させない。通知は多くしない。</li>
            <li>AIに考えさせない。思考はエンジンが行い、AIは文体だけを借りる。</li>
          </ul>
        </section>

        <p className="mt-6 text-[10.5px] text-faint">Spinalix — Built by Takumi Kawai for Next Founders Hackathon 2026.</p>
      </div>
    </div>
  )
}
