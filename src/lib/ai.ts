/**
 * Optional AI synthesis with the Anthropic API, using YOUR key.
 * The key is stored only in this browser (localStorage) and sent straight to api.anthropic.com.
 * Never commit a key to the repo or bake it into a deployed build.
 */
export interface AISettings {
  apiKey: string
  model: string
}

const KEY = 'tb-ai'
const DEFAULTS: AISettings = { apiKey: '', model: 'claude-sonnet-5-5' }

export function getAI(): AISettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...DEFAULTS }
  }
}

export function setAI(s: AISettings) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export interface PromptNote {
  citation: string
  loc: string
  quote: boolean
  text: string
  mine: string
}

export function buildSynthesisPrompt(theme: string, notes: PromptNote[], lang: 'en' | 'es'): string {
  const data = notes
    .map((n, i) => `[${i + 1}] (${n.citation})${n.loc ? ' ' + n.loc : ''}: ${n.quote ? `DIRECT QUOTE "${n.text}"` : n.text}${n.mine ? ' | Student comment: ' + n.mine : ''}`)
    .join('\n')
  const language = lang === 'en' ? 'academic English' : 'Spanish (español académico)'
  return `You help a master's student draft a literature-review synthesis paragraph for her thesis.
Theme: "${theme}".
Her reading notes (each with its source citation):
${data}

Task: Write ONE synthesis paragraph (150-250 words) in ${language}. Organize by ideas, not source by source: show where sources agree, where they differ, and what gap remains. Cite inline as (Author, Year) using exactly the citations given. Use ONLY information in the notes; never invent findings or sources. Where a claim needs a source that is not in the notes, write [CITA?].
Then write a line containing only "---" and 2-3 short bullets (${lang === 'en' ? 'English' : 'Spanish'}) on tensions or gaps worth exploring.
Return only the paragraph, the separator and the bullets.`
}

export async function synthesize(prompt: string, signal?: AbortSignal): Promise<string> {
  const { apiKey, model } = getAI()
  if (!apiKey) throw new Error('Configura tu API key de Anthropic en ⚙️ Datos y ajustes.')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) {
    let msg = `Error ${res.status}`
    try {
      const j = await res.json()
      msg = j?.error?.message || msg
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  const j = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (j.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
}

/** The paragraph part of the model's answer (before the "---" separator). */
export const paragraphPart = (text: string) => text.split(/\n\s*-{3,}\s*\n?/)[0].trim()
