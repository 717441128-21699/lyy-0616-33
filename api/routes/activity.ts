import { Router, type Request, type Response } from 'express'
import { activityLogs, findOkrById, findUserById, weeklyUpdates, keyResults, reviews, dependencies } from '../db/store.js'

const router = Router()

router.get('/:okrId', (req: Request, res: Response): void => {
  try {
    const { okrId } = req.params
    const okr = findOkrById(okrId)
    if (!okr) {
      res.status(404).json({ success: false, error: 'OKR not found' })
      return
    }

    const logs = activityLogs
      .filter(log => log.okr_id === okrId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const enrichedLogs = logs.map(log => {
      let detail: Record<string, unknown> = {}
      if (log.type === 'weekly_update' && log.related_id) {
        const wu = weeklyUpdates.find(w => w.id === log.related_id)
        if (wu) {
          detail = {
            week_number: wu.week_number,
            year: wu.year,
            progress_description: wu.progress_description,
            confidence_index: wu.confidence_index,
          }
        }
      } else if ((log.type === 'kr_update' || log.type === 'kr_sync') && log.related_id) {
        const kr = keyResults.find(k => k.id === log.related_id)
        if (kr) {
          detail = {
            kr_title: kr.title,
            kr_unit: kr.unit,
            kr_target: kr.target_value,
            kr_current: kr.current_value,
            kr_progress: kr.progress,
            kr_method: kr.update_method,
            kr_source_url: kr.data_source_url,
          }
        }
      } else if (log.type === 'review' && log.related_id) {
        const review = reviews.find(r => r.id === log.related_id)
        if (review) {
          detail = {
            quarter: review.quarter,
            year: review.year,
            overall_score: review.overall_score,
            what_went_well: review.what_went_well,
            what_to_improve: review.what_to_improve,
            next_actions: review.next_actions,
          }
        }
      } else if (log.type === 'dependency_risk' && log.related_id) {
        const dep = dependencies.find(d => d.id === log.related_id)
        if (dep) {
          const dependent = findOkrById(dep.dependent_okr_id)
          const depended = findOkrById(dep.depended_okr_id)
          detail = {
            dependent_okr_title: dependent?.title ?? null,
            depended_okr_title: depended?.title ?? null,
            dependency_status: dep.status,
          }
        }
      } else if (log.type === 'status_change') {
        detail = {
          okr_title: okr.title,
          okr_level: okr.level,
        }
      }
      return { ...log, detail }
    })

    res.json({ success: true, data: enrichedLogs })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch activity logs' })
  }
})

export default router
