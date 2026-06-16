import { Router, type Request, type Response } from 'express'
import { okrs, keyResults, findOkrById, findUserById, isQuarterEnded, saveData, dependencies, reviews, krScores } from '../db/store.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const { quarter, year } = req.query
    let needsSave = false
    for (const okr of okrs) {
      if (isQuarterEnded(okr.quarter, okr.year)) {
        if (okr.status === 'active' || okr.status === 'completed') {
          okr.status = 'archived'
          okr.updated_at = new Date().toISOString()
          needsSave = true
        }
      }
    }
    if (needsSave) {
      saveData()
    }
    let filtered = okrs.filter(o => o.status === 'archived' && isQuarterEnded(o.quarter, o.year))
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

router.get('/report', (req: Request, res: Response): void => {
  try {
    const { quarter, year } = req.query
    if (!quarter || !year) {
      res.status(400).json({ success: false, error: 'Quarter and year are required' })
      return
    }

    const q = quarter as string
    const y = Number(year)

    let needsSave = false
    for (const okr of okrs) {
      if (okr.quarter === q && okr.year === y && isQuarterEnded(q, y)) {
        if (okr.status === 'active' || okr.status === 'completed') {
          okr.status = 'archived'
          okr.updated_at = new Date().toISOString()
          needsSave = true
        }
      }
    }
    if (needsSave) saveData()

    const archivedOkrs = okrs.filter(o => o.quarter === q && o.year === y && o.status === 'archived')

    const okrReports = archivedOkrs.map(okr => {
      const owner = findUserById(okr.owner_id)
      const krs = keyResults.filter(kr => kr.okr_id === okr.id)
      const deps = dependencies.filter(d => d.depended_okr_id === okr.id || d.dependent_okr_id === okr.id)
      const okrReviews = reviews.filter(r => r.okr_id === okr.id && r.quarter === q && r.year === y)
      const reviewScores = okrReviews.length > 0
        ? krScores.filter(ks => okrReviews.some(r => r.id === ks.review_id))
        : []

      const completedKRs = krs.filter(kr => kr.progress >= 100).length
      const avgProgress = krs.length > 0 ? krs.reduce((sum, kr) => sum + kr.progress, 0) / krs.length : 0

      const riskRecords = deps.map(dep => {
        const otherOkr = dep.depended_okr_id === okr.id
          ? findOkrById(dep.dependent_okr_id)
          : findOkrById(dep.depended_okr_id)
        return {
          dependency_id: dep.id,
          type: dep.depended_okr_id === okr.id ? '被依赖' : '依赖他人',
          other_okr_title: otherOkr?.title ?? null,
          status: dep.status,
        }
      })

      return {
        okr_id: okr.id,
        title: okr.title,
        description: okr.description,
        level: okr.level,
        owner_name: owner?.name ?? null,
        overall_progress: okr.overall_progress,
        status: okr.status,
        key_results: krs.map(kr => ({
          id: kr.id,
          title: kr.title,
          target_value: kr.target_value,
          current_value: kr.current_value,
          unit: kr.unit,
          progress: kr.progress,
          completed: kr.progress >= 100,
        })),
        kr_completed_count: completedKRs,
        kr_total_count: krs.length,
        kr_avg_progress: Math.round(avgProgress * 100) / 100,
        reviews: okrReviews.map(r => {
          const reviewer = findUserById(r.reviewed_by)
          const scores = reviewScores.filter(s => s.review_id === r.id)
          return {
            id: r.id,
            overall_score: r.overall_score,
            what_went_well: r.what_went_well,
            what_to_improve: r.what_to_improve,
            next_actions: r.next_actions,
            reviewer_name: reviewer?.name ?? null,
            reviewed_at: r.reviewed_at,
            kr_scores: scores.map(s => {
              const kr = keyResults.find(k => k.id === s.kr_id)
              return {
                kr_id: s.kr_id,
                kr_title: kr?.title ?? null,
                score: s.score,
              }
            }),
          }
        }),
        dependencies: riskRecords,
      }
    })

    const totalOkrs = archivedOkrs.length
    const completedOkrs = archivedOkrs.filter(o => o.overall_progress >= 100).length
    const avgOkrProgress = totalOkrs > 0 ? archivedOkrs.reduce((sum, o) => sum + o.overall_progress, 0) / totalOkrs : 0

    const totalKRs = okrReports.reduce((sum, o) => sum + o.kr_total_count, 0)
    const completedKRs = okrReports.reduce((sum, o) => sum + o.kr_completed_count, 0)

    const atRiskDeps = okrReports.reduce((sum, o) => sum + o.dependencies.filter(d => d.status !== 'healthy').length, 0)

    const report = {
      quarter: q,
      year: y,
      generated_at: new Date().toISOString(),
      summary: {
        total_okrs: totalOkrs,
        completed_okrs: completedOkrs,
        avg_okr_progress: Math.round(avgOkrProgress * 100) / 100,
        total_krs: totalKRs,
        completed_krs: completedKRs,
        at_risk_dependencies: atRiskDeps,
      },
      okrs: okrReports,
    }

    res.json({ success: true, data: report })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate report' })
  }
})

router.post('/:id', (req: Request, res: Response): void => {
  try {
    const okr = findOkrById(req.params.id)
    if (!okr) { res.status(404).json({ success: false, error: 'OKR not found' }); return }
    okr.status = 'archived'
    okr.updated_at = new Date().toISOString()
    saveData()
    const owner = findUserById(okr.owner_id)
    res.json({ success: true, data: { ...okr, owner_name: owner?.name ?? null } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to archive OKR' })
  }
})

export default router
