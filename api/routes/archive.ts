import { Router, type Request, type Response } from 'express'
import { okrs, findOkrById, findUserById } from '../db/store.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const { quarter, year } = req.query
    let filtered = okrs.filter(o => o.status === 'archived')
    if (quarter) filtered = filtered.filter(o => o.quarter === quarter)
    if (year) filtered = filtered.filter(o => o.year === Number(year))
    const result = filtered.map(o => {
      const owner = findUserById(o.owner_id)
      return { ...o, owner_name: owner?.name ?? null }
    }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch archived OKRs' })
  }
})

router.post('/:id', (req: Request, res: Response): void => {
  try {
    const okr = findOkrById(req.params.id)
    if (!okr) { res.status(404).json({ success: false, error: 'OKR not found' }); return }
    okr.status = 'archived'
    okr.updated_at = new Date().toISOString()
    const owner = findUserById(okr.owner_id)
    res.json({ success: true, data: { ...okr, owner_name: owner?.name ?? null } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to archive OKR' })
  }
})

export default router
