import { Router, type Request, type Response } from 'express'
import { activityLogs, findOkrById, findUserById, weeklyUpdates, keyResults } from '../db/store.js'

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
          }
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
