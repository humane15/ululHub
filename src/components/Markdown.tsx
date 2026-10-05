import { Fragment, useMemo } from 'react'
import { parseMarkdown, type Inline } from '../lib/markdown'

function renderInline(nodes: readonly Inline[]) {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text':
        return <Fragment key={i}>{node.text}</Fragment>
      case 'strong':
        return <strong key={i}>{renderInline(node.children)}</strong>
      case 'em':
        return <em key={i}>{renderInline(node.children)}</em>
      case 'code':
        return (
          <code key={i} className="num rounded bg-surface-2 px-1 py-0.5 text-[0.9em]">
            {node.text}
          </code>
        )
      case 'link':
        return (
          <a key={i} href={node.href} target="_blank" rel="noopener noreferrer" className="break-words text-primary underline">
            {renderInline(node.children)}
          </a>
        )
    }
  })
}

/** Menampilkan markdown sederhana. Teks selalu dirender sebagai teks (tanpa HTML mentah). */
export function Markdown({ source }: { source: string }) {
  const blocks = useMemo(() => parseMarkdown(source), [source])
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          const size = block.level === 1 ? 'text-lg' : block.level === 2 ? 'text-base' : 'text-sm'
          return (
            <p key={i} className={`${size} font-semibold`} role="heading" aria-level={block.level + 2}>
              {renderInline(block.children)}
            </p>
          )
        }
        if (block.type === 'list') {
          const List = block.ordered ? 'ol' : 'ul'
          return (
            <List key={i} className={`space-y-1 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </List>
          )
        }
        return <p key={i}>{renderInline(block.children)}</p>
      })}
    </div>
  )
}
