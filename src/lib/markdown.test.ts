import { describe, expect, it } from 'vitest'
import { parseInline, parseMarkdown } from './markdown'

describe('parseInline', () => {
  it('teks biasa', () => {
    expect(parseInline('halo dunia')).toEqual([{ type: 'text', text: 'halo dunia' }])
  })

  it('tebal, miring, kode', () => {
    expect(parseInline('a **b** _c_ *d* `e`')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'strong', children: [{ type: 'text', text: 'b' }] },
      { type: 'text', text: ' ' },
      { type: 'em', children: [{ type: 'text', text: 'c' }] },
      { type: 'text', text: ' ' },
      { type: 'em', children: [{ type: 'text', text: 'd' }] },
      { type: 'text', text: ' ' },
      { type: 'code', text: 'e' },
    ])
  })

  it('garis bawah di tengah kata bukan miring', () => {
    expect(parseInline('snake_case_name')).toEqual([{ type: 'text', text: 'snake_case_name' }])
  })

  it('link markdown dan URL polos', () => {
    expect(parseInline('[Bandit](https://overthewire.org) dan https://pwn.college.')).toEqual([
      { type: 'link', href: 'https://overthewire.org', children: [{ type: 'text', text: 'Bandit' }] },
      { type: 'text', text: ' dan ' },
      { type: 'link', href: 'https://pwn.college', children: [{ type: 'text', text: 'https://pwn.college' }] },
      { type: 'text', text: '.' },
    ])
  })

  it('link berbahaya jadi teks biasa', () => {
    expect(parseInline('[klik](javascript:alert(1))')).toEqual([{ type: 'text', text: 'klik)' }])
    expect(parseInline('[klik](data:text/html,x)')).toEqual([{ type: 'text', text: 'klik' }])
  })

  it('HTML tetap teks (dirender React sebagai teks)', () => {
    expect(parseInline('<img src=x onerror=alert(1)>')).toEqual([{ type: 'text', text: '<img src=x onerror=alert(1)>' }])
  })
})

describe('parseMarkdown', () => {
  it('judul, paragraf, daftar', () => {
    const blocks = parseMarkdown('# Judul\n\nbaris satu\nbaris dua\n\n- a\n- b\n\n1. x\n2. y\nteks')
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'list', 'list', 'paragraph'])
    expect(blocks[1]).toEqual({ type: 'paragraph', children: [{ type: 'text', text: 'baris satu baris dua' }] })
    expect(blocks[2]).toMatchObject({ ordered: false, items: [[{ text: 'a' }], [{ text: 'b' }]] })
    expect(blocks[3]).toMatchObject({ ordered: true })
  })

  it('teks kosong', () => {
    expect(parseMarkdown('')).toEqual([])
    expect(parseMarkdown('\n\n  \n')).toEqual([])
  })
})
