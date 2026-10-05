// Parser markdown kecil untuk halaman Catatan (tanpa library, tanpa HTML mentah).
// Didukung: judul (#, ##, ###), daftar (- / * / 1.), paragraf, **tebal**, _miring_ / *miring*,
// `kode`, [teks](url), dan URL polos. Link hanya http(s) dan mailto.

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'em'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; children: Inline[] }

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; children: Inline[] }
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'list'; ordered: boolean; items: Inline[][] }

const SAFE_HREF = /^(https?:\/\/|mailto:)/i

const INLINE_RE =
  /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<]*[^\s<.,:;"')\]])|(?<![\w])_([^_]+)_(?![\w])|\*([^*\s][^*]*)\*/g

export function parseInline(text: string): Inline[] {
  const result: Inline[] = []
  let last = 0
  const pushText = (value: string) => {
    if (!value) return
    const prev = result.at(-1)
    if (prev?.type === 'text') prev.text += value
    else result.push({ type: 'text', text: value })
  }

  for (const match of text.matchAll(INLINE_RE)) {
    const [whole, strong, code, linkText, linkHref, bareUrl, emUnderscore, emStar] = match
    pushText(text.slice(last, match.index))
    last = match.index + whole.length

    if (strong !== undefined) result.push({ type: 'strong', children: parseInline(strong) })
    else if (code !== undefined) result.push({ type: 'code', text: code })
    else if (linkText !== undefined && linkHref !== undefined) {
      if (SAFE_HREF.test(linkHref)) result.push({ type: 'link', href: linkHref, children: parseInline(linkText) })
      else pushText(linkText)
    } else if (bareUrl !== undefined) result.push({ type: 'link', href: bareUrl, children: [{ type: 'text', text: bareUrl }] })
    else {
      const em = emUnderscore ?? emStar ?? ''
      result.push({ type: 'em', children: parseInline(em) })
    }
  }
  pushText(text.slice(last))
  return result
}

const HEADING_RE = /^(#{1,3})\s+(.*)$/
const BULLET_RE = /^\s*[-*]\s+(.*)$/
const ORDERED_RE = /^\s*\d+[.)]\s+(.*)$/

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', children: parseInline(paragraph.join(' ')) })
    if (list) blocks.push({ type: 'list', ordered: list.ordered, items: list.items.map(parseInline) })
    paragraph = []
    list = null
  }

  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      flush()
      continue
    }
    const heading = HEADING_RE.exec(line)
    if (heading) {
      flush()
      blocks.push({ type: 'heading', level: heading[1]!.length as 1 | 2 | 3, children: parseInline(heading[2]!.trim()) })
      continue
    }
    const bullet = BULLET_RE.exec(line)
    const ordered = bullet ? null : ORDERED_RE.exec(line)
    const item = bullet ?? ordered
    if (item) {
      const isOrdered = ordered !== null
      if (paragraph.length || (list && list.ordered !== isOrdered)) flush()
      list ??= { ordered: isOrdered, items: [] }
      list.items.push(item[1]!.trim())
      continue
    }
    if (list) flush()
    paragraph.push(line.trim())
  }
  flush()
  return blocks
}
