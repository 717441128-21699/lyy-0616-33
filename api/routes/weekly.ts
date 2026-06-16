import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { weeklyUpdates, okrs, keyResults, recalcOkrProgress, findUserById } from '../db/store.js'

const router = Router()

function getCurrentQuarterWeek(): { weekNumber: number; year: number } {
  const now = new Date()
  const year = now.getFullYear()
  const start = new Date(year, 0, 1)
  const diffMs = now.getTime() - start.getTime()
  const weekNumber = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
  return { weekNumber, year }
}

router.get('/pending', (req: Request, res: Response): void => {
  try {
    const { weekNumber, year } = getCurrentQuarterWeek()
    const activeOkrs = okrs.filter(o => o.status === 'active')
    const pending = activeOkrs.filter(okr => {
      const krs = keyResults.filter(kr => kr.okr_id === okr.id)
      return krs.some(kr => {
        return !weeklyUpdates.some(wu => wu.okr_id === okr.id && wu.kr_id === kr.id && wu.week_number === weekNumber && wu.year === year)
      })
    }).map(okr => {
      const owner = findUserById(okr.owner_id)
      return {
        id: okr.id,
        title: okr.title,
        owner_id: okr.owner_id,
        owner_name: owner?.name ?? null,
        week_number: weekNumber,
        year,
      }
    })
    res.json({ success: true, data: pending })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch pending updates' })
  }
})

router.get('/', (req: Request, res: Response): void => {
  try {
    const { okr_id, week_number, year } = req.query
    let filtered = weeklyUpdates.map(wu => {
      const user = findUserById(wu.updated_by)
      return { ...wu, updated_by_name: user?.name ?? null }
    })
    if (okr_id) filtered = filtered.filter(wu => wu.okr_id === okr_id)
    if (week_number) filtered = filtered.filter(wu => wu.week_number === Number(week_number))
    if (year) filtered = filtered.filter(wu => wu.year === Number(year))
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    res.json({ success: true, data: filtered })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch weekly updates' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { okr_id, kr_id, week_number, year, progress_description, confidence_index, kr_current_value, updated_by } = req.body
    const now = new Date().toISOString()
    const wu = {
      id: uuidv4(),
      okr_id,
      kr_id,
      week_number,
      year,
      progress_description,
      confidence_index,
      kr_current_value,
      updated_by,
      created_at: now,
    }
    weeklyUpdates.push(wu)
    const kr = keyResults.find(k => k.id === kr_id)
    if (kr) {
      kr.current_value = kr_current_value
      kr.progress = kr.target_value > 0 ? Math.min((kr_current_value / kr.target_value) * 100, 100) : 0
      kr.updated_at = now
      recalcOkrProgress(okr_id)
    }
    res.status(201).json({ success: true, data: wu })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create weekly update' })
  }
})

export default router
