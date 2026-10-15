import { useMemo, useState } from 'react'
import qrcode from 'qrcode-generator'
import { useSpinalix } from '../store'

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const syncMode = useSpinalix((s) => s.syncMode)
  const lan = useSpinalix((s) => s.lan)
  const exportJSON = useSpinalix((s) => s.exportJSON)
  const resetAll = useSpinalix((s) => s.resetAll)
  const [confirmReset, setConfirmReset] = useState(false)

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

  return (
    <div className="fixed inset-0 z-40">
      <button aria-label="閉じる" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[86vh] max-w-lg overflow-y-auto rounded-t-3xl border border-hairline bg-ink-2 px-5 pb-8 pt-4">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
        <h3 className="font-serif text-[17px] text-bone">この記憶について</h3>

        <section className="mt-5 rounded-2xl border border-hairline bg-white/[0.02] p-4">
          <p className="text-[11px] tracking-[0.24em] text-faint">記憶の在りか</p>
          {syncMode === 'brain' ? (
            <>
              <p className="mt-2 text-[13px] leading-relaxed text-bone">
                このMacが「脳」として常駐しています。スマホで下のQRを読むと、同じ記憶に触れられます。
              </p>
              {qrSvg && (
                <div
                  className="mx-auto mt-3 w-[168px] rounded-xl bg-[#ece7dc] p-3"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              )}
              <p className="mt-2 text-center text-[11px] text-amber">{lan}</p>
            </>
          ) : (
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              この画面の記憶は、このブラウザの中だけに保存されています（外部送信なし）。
              Macに「脳」を常駐させる（<code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px]">npm run brain</code>
              ）と、同じWi-FiのスマホからQRコードで同じ記憶に接続できます。
            </p>
          )}
        </section>

        <section className="mt-3 rounded-2xl border border-hairline bg-white/[0.02] p-4">
          <p className="text-[11px] tracking-[0.24em] text-faint">データ主権</p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            想起も、感情も、あなたの断片も、この端末（またはMacのJSONファイル）の外には出ません。いつでも書き出せます。
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

        <section className="mt-3 rounded-2xl border border-hairline bg-white/[0.02] p-4">
          <p className="text-[11px] tracking-[0.24em] text-faint">思想</p>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-muted">
            <li>・想起は捏造しない。すべての文に、実在の断片という出典がある。</li>
            <li>・忖度しない。あなたの矛盾は、隠さず指摘する。</li>
            <li>・依存させない。通知は1日2回まで。もっと使わせる設計をしない。</li>
          </ul>
        </section>

        <p className="mt-5 text-center text-[10.5px] text-faint">
          Spinalix — Built by Takumi Kawai for Next Founders Hackathon 2026. 記憶データは8ヶ月分のサンプル（架空+実体験）です。
        </p>
      </div>
    </div>
  )
}
