import { Router, type Request, type Response } from 'express'
import { users, okrs, departments } from '../db/store.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const { quarter, year } = req.query
    let filteredOkrs = okrs.filter(o => o.status === 'active')
    if (quarter) filteredOkrs = filteredOkrs.filter(o => o.quarter === quarter)
    if (year) filteredOkrs = filteredOkrs.filter(o => o.year === Number(year))

    const ownerIds = new Set(filteredOkrs.map(o => o.owner_id))
    const members = users
      .filter(u => ownerIds.has(u.id))
      .map(u => {
        const dept = departments.find(d => d.id === u.department_id)
        return {
          user_id: u.id,
          user_name: u.name,
          department_name: dept?.name ?? null,
        }
      })

    const okrList = filteredOkrs.map(o => ({
      okr_id: o.id,
      owner_id: o.owner_id,
      title: o.title,
      progress: o.overall_progress,
      level: o.level,
      quarter: o.quarter,
      year: o.year,
    }))

    res.json({ success: true, data: { members, okrs: okrList } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch heatmap data' })
  }
})

export default router
