import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { reviews, krScores, findUserById, findOkrById } from '../db/store.js'

const router = Router()

router.get('/okr/:okr_id', (req: Request, res: Response): void => {
  try {
    const okrReviews = reviews.filter(r => r.okr_id === req.params.okr_id)
    const result = okrReviews.map(review => {
      const reviewer = findUserById(review.reviewed_by)
      const scores = krScores.filter(ks => ks.review_id === review.id)
      return { ...review, reviewer_name: reviewer?.name ?? null, kr_scores: scores }
    }).sort((a, b) => new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime())
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch reviews' })
  }
})

router.get('/', (req: Request, res: Response): void => {
  try {
    const { quarter, year } = req.query
    let filtered = reviews.map(r => {
      const okr = findOkrById(r.okr_id)
      const reviewer = findUserById(r.reviewed_by)
      return { ...r, okr_title: okr?.title ?? null, reviewer_name: reviewer?.name ?? null }
    })
    if (quarter) filtered = filtered.filter(r => r.quarter === quarter)
    if (year) filtered = filtered.filter(r => r.year === Number(year))
    filtered.sort((a, b) => new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime())
    res.json({ success: true, data: filtered })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch reviews' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { okr_id, quarter, year, what_went_well, what_to_improve, next_actions, reviewed_by, kr_scores: krScoresInput } = req.body
    const now = new Date().toISOString()
    let overallScore = 0
    const reviewId = uuidv4()
    const createdKrScores: { id: string; review_id: string; kr_id: string; score: number }[] = []
    if (Array.isArray(krScoresInput) && krScoresInput.length > 0) {
      overallScore = krScoresInput.reduce((sum: number, ks: { score: number }) => sum + ks.score, 0) / krScoresInput.length
      for (const ks of krScoresInput) {
        const krScore = { id: uuidv4(), review_id: reviewId, kr_id: ks.kr_id, score: ks.score }
        krScores.push(krScore)
        createdKrScores.push(krScore)
      }
    }
    const review = {
      id: reviewId,
      okr_id,
      quarter,
      year,
      overall_score: Math.round(overallScore * 100) / 100,
      what_went_well: what_went_well || '',
      what_to_improve: what_to_improve || '',
      next_actions: next_actions || '',
      reviewed_by,
      reviewed_at: now,
    }
    reviews.push(review)
    res.status(201).json({ success: true, data: { ...review, kr_scores: createdKrScores } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create review' })
  }
})

export default router
