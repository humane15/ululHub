import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('header, baris, CRLF', () => {
    expect(toCsv(['a', 'b'], [[1, 'x'], [2, null]])).toBe('a,b\r\n1,x\r\n2,\r\n')
  })

  it('mengutip koma, kutip, baris baru, dan spasi di tepi', () => {
    expect(toCsv(['catatan'], [['makan, minum'], ['dia "bilang"'], ['baris\nbaru'], [' spasi']])).toBe(
      'catatan\r\n"makan, minum"\r\n"dia ""bilang"""\r\n"baris\nbaru"\r\n" spasi"\r\n',
    )
  })

  it('angka rupiah tetap integer tanpa pemisah ribuan', () => {
    expect(toCsv(['jumlah'], [[3_900_000]])).toBe('jumlah\r\n3900000\r\n')
  })
})
