// あなたの声に差し替えるツール
// 使い方:
//   1) submission/video/demo.mp4 を再生しながら、同じ尺で声を録音（QuickTime等）
//   2) node scripts/remix-voice.mjs path/to/voice.m4a
//   → submission/video/demo-voice.mp4 が書き出されます（映像はそのまま・音声だけ差し替え）
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const voice = process.argv[2]
if (!voice || !existsSync(voice)) {
  console.error('使い方: node scripts/remix-voice.mjs path/to/voice.m4a')
  process.exit(1)
}
const video = 'submission/video/demo.mp4'
if (!existsSync(video)) {
  console.error('先に submission/video/demo.mp4 を用意してください')
  process.exit(1)
}
execFileSync(
  'ffmpeg',
  ['-y', '-i', video, '-i', voice, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', 'submission/video/demo-voice.mp4'],
  { stdio: 'inherit' },
)
console.log('書き出しました: submission/video/demo-voice.mp4')
