// API拡張モード — 「記憶がLLMに考えさせる」ための限定的な委譲
//
// 設計の核:
//  - このモジュールは「考えさせない」。思考（どの記憶がなぜ繋がるか）は、すでにローカルエンジンが
//    決定論的に組み終えている。LLMに渡すのは〈思考状態〉という構造化データだけ。
//  - LLMの仕事は「言葉を整える」ことのみ。禁止事項（新しい事実・人物・日付・助言・励まし・
//    引用なし）をプロンプトで明示し、返答を verify.ts で検証・棄却する。
//  - 検証に落ちた場合は1度だけ再試行し、それでもダメならローカルの文をそのまま使う。
//    → 「ありきたりなAIの回答」が構造的に混入できない。

import type { Fragment } from './types'
import type { ThoughtDraft } from './render'
import { verifyStylized } from './verify'
import { formatJP } from './dates'

export interface ApiConfig {
  provider: 'openai' | 'anthropic' | 'gemini'
  model: string
  apiKey: string
}

export const DEFAULT_MODELS: Record<ApiConfig['provider'], string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
  gemini: 'gemini-2.0-flash',
}

export interface StylizeOutcome {
  ok: boolean
  text?: string
  cited?: string[]
  attempts: number
  error?: string
}

function buildThoughtState(draft: ThoughtDraft, fragments: Fragment[]) {
  const byId = new Map(fragments.map((f) => [f.id, f]))
  return {
    mode: draft.mode,
    relation: draft.kind,
    fragments: draft.path
      .map((id) => byId.get(id))
      .filter((f): f is Fragment => Boolean(f))
      .map((f) => ({ id: f.id, date: formatJP(f.createdAt), text: f.text })),
    engineThinking: draft.text,
    steps: draft.steps.map((s) => `${s.label}: ${s.detail}`),
    constraints: [
      'engineThinking と同じ意味の流れを保つこと（新しい解釈を足さない）',
      'fragments に無い事実・人物・日付・数字を書かない',
      '直接引用（「」）を最低1つ、fragments からそのまま使う',
      '3文以内・160文字以内',
      '励まし・助言・決まり文句（頑張って、きっと大丈夫、など）を書かない',
      '一人称の観察として、静かに書く',
    ],
  }
}

const SYSTEM_PROMPT =
  'あなたはSpinalixの「文体家」です。Spinalixの記憶エンジンが決定論的に組み上げた〈思考状態〉を受け取り、それを日本語の自然な一文〜三文に整えるだけの役割です。' +
  'あなた自身の考え・解釈・励まし・提案を足してはいけません。与えられた断片の言葉だけを使ってください。' +
  '出力は必ず JSON: {"text": "...", "cited": ["断片ID", ...]}'

async function callProvider(config: ApiConfig, userPayload: string, retryNote?: string): Promise<string> {
  const user = retryNote ? `${userPayload}\n\n前回の出力は検証に失敗しました: ${retryNote}\n制約を守ってやり直してください。` : userPayload

  if (config.provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      }),
    })
    if (!res.ok) throw new Error(`OpenAI API ${res.status}`)
    const data = (await res.json()) as { choices: { message: { content: string } }[] }
    return data.choices[0].message.content
  }

  if (config.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: user }],
      }),
    })
    if (!res.ok) throw new Error(`Anthropic API ${res.status}`)
    const data = (await res.json()) as { content: { type: string; text?: string }[] }
    return data.content.map((c) => c.text ?? '').join('')
  }

  // gemini
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
    }),
  })
  if (!res.ok) throw new Error(`Gemini API ${res.status}`)
  const data = (await res.json()) as { candidates: { content: { parts: { text?: string }[] } }[] }
  return data.candidates[0].content.parts.map((p) => p.text ?? '').join('')
}

export async function stylizeWithApi(draft: ThoughtDraft, fragments: Fragment[], config: ApiConfig): Promise<StylizeOutcome> {
  const payload = JSON.stringify(buildThoughtState(draft, fragments), null, 2)
  let lastReason: string | undefined

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await callProvider(config, payload, lastReason)
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as { text?: string; cited?: string[] }
      if (!parsed.text) {
        lastReason = 'text フィールドがない'
        continue
      }
      const cited = parsed.cited ?? draft.path
      const verdict = verifyStylized(parsed.text, cited, fragments)
      if (verdict.ok) {
        return { ok: true, text: parsed.text, cited, attempts: attempt }
      }
      lastReason = verdict.reason
    } catch (e) {
      return { ok: false, attempts: attempt, error: String(e) }
    }
  }
  return { ok: false, attempts: 2, error: lastReason }
}
