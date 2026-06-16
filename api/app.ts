import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import okrsRouter from './routes/okrs.js'
import weeklyRouter from './routes/weekly.js'
import reviewsRouter from './routes/reviews.js'
import dependenciesRouter from './routes/dependencies.js'
import heatmapRouter from './routes/heatmap.js'
import archiveRouter from './routes/archive.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/okrs', okrsRouter)
app.use('/api/weekly-updates', weeklyRouter)
app.use('/api/reviews', reviewsRouter)
app.use('/api/dependencies', dependenciesRouter)
app.use('/api/heatmap', heatmapRouter)
app.use('/api/archive', archiveRouter)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
