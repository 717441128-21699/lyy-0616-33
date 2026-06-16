import { Router, type Request, type Response } from 'express'
import { users, okrs, departments, dependencies } from '../db/store.js'

const router = Router()

function getOkrRiskStatus(okrId: string): 'healthy' | 'at_risk' | 'critical' | null {
  const dep = dependencies.find(d => d.depended_okr_id === okrId || d.dependent_okr_id === okrId)
  if (!dep) return null
  return dep.status
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const { quarter, year, level, department_id, risk_status } = req.query
    let filteredOkrs = okrs.filter(o => o.status === 'active')
    if (quarter) filteredOkrs = filteredOkrs.filter(o => o.quarter === quarter)
    if (year) filteredOkrs = filteredOkrs.filter(o => o.year === Number(year))
    if (level) filteredOkrs = filteredOkrs.filter(o => o.level === level)
    if (department_id) filteredOkrs = filteredOkrs.filter(o => o.department_id === department_id)
    if (risk_status) {
      filteredOkrs = filteredOkrs.filter(o => {
        const risk = getOkrRiskStatus(o.id)
        if (risk_status === 'none') return risk === null
        return risk === risk_status
      })
    }

    const ownerIds = new Set(filteredOkrs.map(o => o.owner_id))
    let memberUsers = users.filter(u => ownerIds.has(u.id))
    if (department_id) memberUsers = memberUsers.filter(u => u.department_id === department_id)

    const members = memberUsers.map(u => {
      const dept = departments.find(d => d.id === u.department_id)
      return {
        user_id: u.id,
        user_name: u.name,
        department_name: dept?.name ?? null,
        department_id: u.department_id,
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
      department_id: o.department_id,
      risk_status: getOkrRiskStatus(o.id),
    }))

    res.json({ success: true, data: { members, okrs: okrList } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch heatmap data' })
  }
})

export default router
