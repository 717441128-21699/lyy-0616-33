import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { okrs, keyResults, recalcOkrProgress, findOkrById, findUserById, updateDependencyRisks, saveData, addActivityLog } from '../db/store.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const { level, quarter, year, status, owner_id, department_id, parent_okr_id } = req.query
    let filtered = okrs.map(o => {
      const owner = findUserById(o.owner_id)
      return { ...o, owner_name: owner?.name ?? null }
    })
    if (level) filtered = filtered.filter(o => o.level === level)
    if (quarter) filtered = filtered.filter(o => o.quarter === quarter)
    if (year) filtered = filtered.filter(o => o.year === Number(year))
    if (status) filtered = filtered.filter(o => o.status === status)
    if (owner_id) filtered = filtered.filter(o => o.owner_id === owner_id)
    if (department_id) filtered = filtered.filter(o => o.department_id === department_id)
    if (parent_okr_id !== undefined) {
      if (parent_okr_id === 'null') {
        filtered = filtered.filter(o => o.parent_okr_id === null)
      } else {
        filtered = filtered.filter(o => o.parent_okr_id === parent_okr_id)
      }
    }
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    res.json({ success: true, data: filtered })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch OKRs' })
  }
})

interface TreeNode {
  id: string
  title: string
  description: string
  level: string
  owner_id: string
  owner_name: string | null
  department_id: string | null
  parent_okr_id: string | null
  quarter: string
  year: number
  status: string
  overall_progress: number
  created_at: string
  updated_at: string
  key_results: typeof keyResults
  children: TreeNode[]
}

function buildTree(okrId: string): TreeNode | null {
  const okr = findOkrById(okrId)
  if (!okr) return null
  const owner = findUserById(okr.owner_id)
  const krs = keyResults.filter(kr => kr.okr_id === okrId)
  const children = okrs
    .filter(o => o.parent_okr_id === okrId)
    .map(child => buildTree(child.id))
    .filter((n): n is TreeNode => n !== null)
  return {
    ...okr,
    owner_name: owner?.name ?? null,
    key_results: krs,
    children,
  }
}

router.get('/alignment-tree', (req: Request, res: Response): void => {
  try {
    const roots = okrs.filter(o => o.parent_okr_id === null)
    const tree = roots.map(root => buildTree(root.id)).filter((n): n is TreeNode => n !== null)
    res.json({ success: true, data: tree })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch alignment tree' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const okr = findOkrById(req.params.id)
    if (!okr) { res.status(404).json({ success: false, error: 'OKR not found' }); return }
    const owner = findUserById(okr.owner_id)
    const krs = keyResults.filter(kr => kr.okr_id === okr.id)
    res.json({ success: true, data: { ...okr, owner_name: owner?.name ?? null, key_results: krs } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch OKR' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { title, description, level, owner_id, department_id, parent_okr_id, quarter, year, status } = req.body
    const now = new Date().toISOString()
    const okr = {
      id: uuidv4(),
      title,
      description: description || '',
      level,
      owner_id,
      department_id: department_id || null,
      parent_okr_id: parent_okr_id || null,
      quarter,
      year,
      status: status || 'draft',
      overall_progress: 0,
      created_at: now,
      updated_at: now,
    }
    okrs.push(okr)
    saveData()
    const owner = findUserById(okr.owner_id)
    res.status(201).json({ success: true, data: { ...okr, owner_name: owner?.name ?? null } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create OKR' })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const okr = findOkrById(req.params.id)
    if (!okr) { res.status(404).json({ success: false, error: 'OKR not found' }); return }
    const { title, description, level, owner_id, department_id, parent_okr_id, quarter, year, status } = req.body
    if (title !== undefined) okr.title = title
    if (description !== undefined) okr.description = description
    if (level !== undefined) okr.level = level
    if (owner_id !== undefined) okr.owner_id = owner_id
    if (department_id !== undefined) okr.department_id = department_id
    if (parent_okr_id !== undefined) okr.parent_okr_id = parent_okr_id
    if (quarter !== undefined) okr.quarter = quarter
    if (year !== undefined) okr.year = year
    if (status !== undefined) okr.status = status
    okr.updated_at = new Date().toISOString()
    saveData()
    const owner = findUserById(okr.owner_id)
    res.json({ success: true, data: { ...okr, owner_name: owner?.name ?? null } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update OKR' })
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const idx = okrs.findIndex(o => o.id === req.params.id)
    if (idx === -1) { res.status(404).json({ success: false, error: 'OKR not found' }); return }
    okrs.splice(idx, 1)
    for (let i = keyResults.length - 1; i >= 0; i--) {
      if (keyResults[i].okr_id === req.params.id) {
        keyResults.splice(i, 1)
      }
    }
    saveData()
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete OKR' })
  }
})

router.post('/:id/key-results', (req: Request, res: Response): void => {
  try {
    const okr = findOkrById(req.params.id)
    if (!okr) { res.status(404).json({ success: false, error: 'OKR not found' }); return }
    const { title, target_value, unit, update_method, data_source_url } = req.body
    const now = new Date().toISOString()
    const kr = {
      id: uuidv4(),
      okr_id: req.params.id,
      title,
      target_value,
      current_value: 0,
      unit: unit || '%',
      update_method: update_method || 'manual',
      data_source_url: data_source_url || null,
      progress: 0,
      created_at: now,
      updated_at: now,
    }
    keyResults.push(kr)
    recalcOkrProgress(req.params.id)
    saveData()
    res.status(201).json({ success: true, data: kr })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create key result' })
  }
})

router.put('/:id/key-results/:krId', (req: Request, res: Response): void => {
  try {
    const kr = keyResults.find(k => k.id === req.params.krId && k.okr_id === req.params.id)
    if (!kr) { res.status(404).json({ success: false, error: 'Key result not found' }); return }
    const { title, target_value, unit, update_method, data_source_url } = req.body
    if (title !== undefined) kr.title = title
    if (target_value !== undefined) kr.target_value = target_value
    if (unit !== undefined) kr.unit = unit
    if (update_method !== undefined) kr.update_method = update_method
    if (data_source_url !== undefined) kr.data_source_url = data_source_url
    kr.updated_at = new Date().toISOString()
    saveData()
    res.json({ success: true, data: kr })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update key result' })
  }
})

router.delete('/:id/key-results/:krId', (req: Request, res: Response): void => {
  try {
    const idx = keyResults.findIndex(k => k.id === req.params.krId && k.okr_id === req.params.id)
    if (idx === -1) { res.status(404).json({ success: false, error: 'Key result not found' }); return }
    keyResults.splice(idx, 1)
    recalcOkrProgress(req.params.id)
    saveData()
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete key result' })
  }
})

router.put('/:id/key-results/:krId/progress', (req: Request, res: Response): void => {
  try {
    const kr = keyResults.find(k => k.id === req.params.krId && k.okr_id === req.params.id)
    if (!kr) { res.status(404).json({ success: false, error: 'Key result not found' }); return }
    const { current_value, updated_by } = req.body
    const oldValue = `${Math.round(kr.current_value * 100) / 100}${kr.unit}`
    kr.current_value = current_value
    kr.progress = kr.target_value > 0 ? Math.min((current_value / kr.target_value) * 100, 100) : 0
    kr.updated_at = new Date().toISOString()
    recalcOkrProgress(req.params.id)
    updateDependencyRisks(req.params.id)
    addActivityLog(
      req.params.id,
      'kr_update',
      kr.id,
      updated_by || null,
      `更新了KR「${kr.title}」当前值`,
      oldValue,
      `${Math.round(current_value * 100) / 100}${kr.unit}`,
    )
    saveData()
    res.json({ success: true, data: kr })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update key result progress' })
  }
})

router.put('/:id/key-results/:krId/sync', (req: Request, res: Response): void => {
  try {
    const kr = keyResults.find(k => k.id === req.params.krId && k.okr_id === req.params.id)
    if (!kr) { res.status(404).json({ success: false, error: 'Key result not found' }); return }
    const oldValue = `${Math.round(kr.current_value * 100) / 100}${kr.unit}`
    const currentProgress = kr.progress
    const minProgress = currentProgress
    const maxProgress = Math.min(100, currentProgress + (100 - currentProgress) * 0.3)
    const newProgress = minProgress + Math.random() * (maxProgress - minProgress)
    const newValue = (newProgress / 100) * kr.target_value
    kr.current_value = Math.round(newValue * 100) / 100
    kr.progress = Math.round(newProgress * 100) / 100
    kr.updated_at = new Date().toISOString()
    recalcOkrProgress(req.params.id)
    updateDependencyRisks(req.params.id)
    addActivityLog(
      req.params.id,
      'kr_sync',
      kr.id,
      null,
      `自动同步了KR「${kr.title}」数据`,
      oldValue,
      `${Math.round(newValue * 100) / 100}${kr.unit}`,
    )
    saveData()
    res.json({ success: true, data: kr })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to sync key result' })
  }
})

export default router
