import { describe, expect, it } from 'vitest'
import { averageScore, executionScore, scoreStatus, weeklyScores } from './scoring'

describe('executionScore', () => {
  it('menghitung persen dibulatkan', () => {
    expect(executionScore(7, 8)).toBe(88)
    expect(executionScore(2, 3)).toBe(67)
    expect(executionScore(0, 5)).toBe(0)
    expect(executionScore(5, 5)).toBe(100)
  })

  it('null kalau belum ada taktik', () => {
    expect(executionScore(0, 0)).toBeNull()
  })

  it('menolak angka tidak valid', () => {
    expect(() => executionScore(6, 5)).toThrow(RangeError)
    expect(() => executionScore(-1, 5)).toThrow(RangeError)
  })
})

describe('scoreStatus', () => {
  it('memakai batas 85 dan 60', () => {
    expect(scoreStatus(100)).toBe('tercapai')
    expect(scoreStatus(85)).toBe('tercapai')
    expect(scoreStatus(84)).toBe('hampir')
    expect(scoreStatus(60)).toBe('hampir')
    expect(scoreStatus(59)).toBe('di_bawah')
    expect(scoreStatus(0)).toBe('di_bawah')
  })
})

describe('weeklyScores', () => {
  it('menghitung skor tiap minggu', () => {
    const scores = weeklyScores(
      [
        { weekNumber: 1, done: true },
        { weekNumber: 1, done: false },
        { weekNumber: 2, done: true },
        { weekNumber: 13, done: true },
      ],
      3,
    )
    expect(scores).toEqual([50, 100, null])
  })
})

describe('averageScore', () => {
  it('mengabaikan minggu tanpa skor', () => {
    expect(averageScore([80, null, 90])).toBe(85)
    expect(averageScore([null, null])).toBeNull()
    expect(averageScore([])).toBeNull()
  })
})
