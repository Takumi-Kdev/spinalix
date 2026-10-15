// 動画収録用のオーバーレイ（可視カーソル + 英語字幕）
// 関数として addInitScript に渡す（文字列エスケープ問題を避ける）
export const CURSOR_SCRIPT = () => {
  const STYLE = [
    '#__cursor{position:fixed;left:960px;top:540px;z-index:999999;width:16px;height:16px;border-radius:50%;',
    'background:rgba(200,68,42,.92);border:2.5px solid #f1e9d8;box-shadow:0 2px 10px rgba(0,0,0,.5);',
    'pointer-events:none;transform:translate(-50%,-50%)}',
    '#__sub{position:fixed;left:50%;bottom:48px;transform:translateX(-50%);max-width:1480px;',
    'background:rgba(18,16,12,.86);color:#f1e9d8;font-family:system-ui,sans-serif;font-size:27px;',
    'line-height:1.55;padding:14px 26px;border-radius:6px;border:1px solid rgba(241,233,216,.2);',
    'opacity:0;transition:opacity .3s;text-align:center;z-index:999998}',
    '#__sub.on{opacity:1}',
  ].join('')
  const attach = () => {
    try {
      const style = document.createElement('style')
      style.textContent = STYLE
      document.documentElement.appendChild(style)
      const cur = document.createElement('div')
      cur.id = '__cursor'
      document.documentElement.appendChild(cur)
      const sub = document.createElement('div')
      sub.id = '__sub'
      document.documentElement.appendChild(sub)
      window.__sub = (t) => {
        window.__subText = t
        sub.textContent = t || ''
        sub.classList.toggle('on', !!t)
      }
      document.addEventListener('mousemove', (e) => {
        cur.style.left = e.clientX + 'px'
        cur.style.top = e.clientY + 'px'
      })
    } catch (err) {
      /* 収録を止めない */
    }
  }
  if (document.documentElement) attach()
  else document.addEventListener('DOMContentLoaded', attach)
}
