import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { dependencies, notifications, findOkrById, findUserById } from '../db/store.js'
import type { Dependency, Notification } from '../db/store.js'

const router = Router()

router.get('/graph', (req: Request, res: Response): void => {
  try {
    const okrIds = new Set<string>()
    dependencies.forEach(d => { okrIds.add(d.dependent_okr_id); okrIds.add(d.depended_okr_id) })
    const nodes = Array.from(okrIds).map(id => {
      const okr = findOkrById(id)
      if (!okr) return null
      return { id: okr.id, title: okr.title, level: okr.level, progress: okr.overall_progress }
    }).filter(Boolean)
    const edges = dependencies.map(d => ({
      source: d.depended_okr_id,
      target: d.dependent_okr_id,
      status: d.status,
    }))
    res.json({ success: true, data: { nodes, edges } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch dependency graph' })
  }
})

router.get('/notifications', (req: Request, res: Response): void => {
  try {
    const { user_id, is_read } = req.query
    let filtered = notifications.map(n => {
      const dep = dependencies.find(d => d.id === n.dependency_id)
      return {
        ...n,
        dependency_status: dep?.status ?? null,
        dependent_okr_id: dep?.dependent_okr_id ?? null,
        depended_okr_id: dep?.depended_okr_id ?? null,
      }
    })
    if (user_id) filtered = filtered.filter(n => n.user_id === user_id)
    if (is_read !== undefined) {
      const readVal = is_read === '1' || is_read === 'true'
      filtered = filtered.filter(n => n.is_read === readVal)
    }
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    res.json({ success: true, data: filtered })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' })
  }
})

router.put('/notifications/:id/read', (req: Request, res: Response): void => {
  try {
    const notif = notifications.find(n => n.id === req.params.id)
    if (!notif) { res.status(404).json({ success: false, error: 'Notification not found' }); return }
    notif.is_read = true
    res.json({ success: true, data: notif })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' })
  }
})

router.get('/', (req: Request, res: Response): void => {
  try {
    const { status } = req.query
    let filtered = dependencies.map(d => {
      const dependentOkr = findOkrById(d.dependent_okr_id)
      const dependedOkr = findOkrById(d.depended_okr_id)
      return {
        ...d,
        dependent_okr_title: dependentOkr?.title ?? null,
        depended_okr_title: dependedOkr?.title ?? null,
      }
    })
    if (status) filtered = filtered.filter(d => d.status === status)
    res.json({ success: true, data: filtered })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch dependencies' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { dependent_okr_id, depended_okr_id } = req.body
    const now = new Date().toISOString()
    const dependedOkr = findOkrById(depended_okr_id)
    let status: Dependency['status'] = 'healthy'
    if (dependedOkr) {
      if (dependedOkr.overall_progress < 15) {
        status = 'critical'
      } else if (dependedOkr.overall_progress < 30) {
        status = 'at_risk'
      }
    }
    const dep: Dependency = {
      id: uuidv4(),
      dependent_okr_id,
      depended_okr_id,
      status,
      created_at: now,
    }
    dependencies.push(dep)
    if (status === 'at_risk' || status === 'critical') {
      const dependentOkr = findOkrById(dependent_okr_id)
      const dependedOkrOwner = dependedOkr ? findUserById(dependedOkr.owner_id) : null
      const dependentOkrOwner = dependentOkr ? findUserById(dependentOkr.owner_id) : null
      if (dependentOkrOwner) {
        const riskLevel: Notification['risk_level'] = status === 'critical' ? 'critical' : 'warning'
        const msg = status === 'critical'
          ? `您依赖的OKR「${dependedOkr?.title ?? ''}」进度严重不足（${dependedOkr?.overall_progress ?? 0}%），请立即关注`
          : `您依赖的OKR「${dependedOkr?.title ?? ''}」进度落后（${dependedOkr?.overall_progress ?? 0}%），存在风险`
        notifications.push({
          id: uuidv4(),
          dependency_id: dep.id,
          user_id: dependentOkr.owner_id,
          message: msg,
          risk_level: riskLevel,
          is_read: false,
          created_at: now,
        })
      }
      if (dependedOkrOwner && (!dependentOkr || dependedOkr.owner_id !== dependentOkr.owner_id)) {
        const riskLevel: Notification['risk_level'] = status === 'critical' ? 'critical' : 'warning'
        const msg = status === 'critical'
          ? `OKR「${dependentOkr?.title ?? ''}」严重依赖您的OKR进度，请加速推进`
          : `OKR「${dependentOkr?.title ?? ''}」依赖您的OKR进度，请关注`
        notifications.push({
          id: uuidv4(),
          dependency_id: dep.id,
          user_id: dependedOkr.owner_id,
          message: msg,
          risk_level: riskLevel,
          is_read: false,
          created_at: now,
        })
      }
    }
    res.status(201).json({ success: true, data: dep })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create dependency' })
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const idx = dependencies.findIndex(d => d.id === req.params.id)
    if (idx === -1) { res.status(404).json({ success: false, error: 'Dependency not found' }); return }
    dependencies.splice(idx, 1)
    for (let i = notifications.length - 1; i >= 0; i--) {
      if (notifications[i].dependency_id === req.params.id) {
        notifications.splice(i, 1)
      }
    }
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete dependency' })
  }
})

export default router
