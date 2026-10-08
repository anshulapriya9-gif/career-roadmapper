import dotenv from 'dotenv'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') })

const app = express()
const port = Number(process.env.PORT || process.env.API_PORT || 3001)
const dataDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data')
const stateFile = path.join(dataDirectory, 'state.json')
const webDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

if (process.env.NODE_ENV === 'production' && !process.env.API_TOKEN) {
  console.error('API_TOKEN must be configured before running in production.')
  process.exit(1)
}

app.use(express.json({ limit: '256kb' }))
app.set('trust proxy', 1)

const generationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many roadmap generation requests. Please try again later.' },
})

app.use('/api', (request, response, next) => {
  if (request.path === '/health' || (request.method === 'POST' && request.path === '/roadmap/generate')) return next()

  const configuredToken = process.env.API_TOKEN
  if (!configuredToken) return next()

  const providedToken = request.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  const providedBuffer = Buffer.from(providedToken)
  const configuredBuffer = Buffer.from(configuredToken)
  if (providedBuffer.length !== configuredBuffer.length || !timingSafeEqual(providedBuffer, configuredBuffer)) {
    response.status(401).json({ error: 'A valid bearer token is required.' })
    return
  }

  next()
})

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.get('/api/state', async (_request, response, next) => {
  try {
    const savedState = await readFile(stateFile, 'utf8')
    response.json({ state: JSON.parse(savedState) })
  } catch (error) {
    if (error.code === 'ENOENT') {
      response.json({ state: null })
      return
    }
    next(error)
  }
})

app.put('/api/state', async (request, response, next) => {
  if (!isValidState(request.body)) {
    response.status(400).json({ error: 'Invalid roadmap state' })
    return
  }

  try {
    await mkdir(dataDirectory, { recursive: true })
    const temporaryFile = `${stateFile}.${process.pid}.tmp`
    await writeFile(temporaryFile, JSON.stringify(request.body, null, 2), 'utf8')
    await rename(temporaryFile, stateFile)
    response.json({ state: request.body })
  } catch (error) {
    next(error)
  }
})

app.post('/api/roadmap/generate', generationLimiter, async (request, response) => {
  const role = typeof request.body?.role === 'string' ? request.body.role.trim() : ''
  const skills = request.body?.skills

  if (!role || role.length > 120 || !Array.isArray(skills) || skills.length > 50) {
    response.status(400).json({ error: 'Provide a target role and a valid skills list.' })
    return
  }

  if (!process.env.GROQ_API_KEY) {
    response.status(503).json({ error: 'AI roadmap generation is not enabled yet.' })
    return
  }

  const skillSummary = skills
    .filter((skill) => typeof skill?.name === 'string' && Number.isFinite(skill.level))
    .map((skill) => `${skill.name}: ${Math.max(0, Math.min(100, skill.level))}% confidence`)
    .join('\n') || 'No skills have been added yet.'

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: groqModel,
        temperature: 0.35,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a practical career coach. Return only valid JSON matching {"phases":[{"title":"string","description":"string","milestones":[{"title":"string","detail":"string","duration":"string"}]}]}. Include exactly four phases and exactly three milestones per phase. Make milestones concrete, supportive, and appropriate for a 12-week career transition.',
          },
          {
            role: 'user',
            content: `Create a personalized 12-week career roadmap for the target role: ${role}\n\nCurrent skills and confidence:\n${skillSummary}\n\nMake the plan prioritize skill gaps, build on existing strengths, and end with a realistic job-search or portfolio milestone. Each phase needs a concise title, description, and exactly three actionable milestones. Each milestone needs a title, one-sentence detail, and a brief duration estimate.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    })

    if (!groqResponse.ok) {
      response.status(502).json({ error: 'Groq could not generate a roadmap. Check your API key, model, and account limits.' })
      return
    }

    const completion = await groqResponse.json()
    const content = completion.choices?.[0]?.message?.content
    let generatedPlan
    try {
      generatedPlan = JSON.parse(content)
    } catch {
      response.status(502).json({ error: 'Groq returned an unreadable roadmap. Please try again.' })
      return
    }

    if (!isValidGeneratedPlan(generatedPlan)) {
      response.status(502).json({ error: 'Groq returned an incomplete roadmap. Please try again.' })
      return
    }

    const phaseIds = ['discover', 'build', 'showcase', 'launch']
    const periods = ['WEEKS 1–2', 'WEEKS 3–6', 'WEEKS 7–9', 'WEEKS 10–12']
    response.json({
      phases: generatedPlan.phases.map((phase, index) => ({
        id: phaseIds[index],
        number: String(index + 1).padStart(2, '0'),
        period: periods[index],
        title: phase.title.trim(),
        description: phase.description.trim(),
        milestones: phase.milestones.map((milestone) => ({
          id: randomUUID(),
          title: milestone.title.trim(),
          detail: milestone.detail.trim(),
          duration: milestone.duration.trim(),
          done: false,
        })),
      })),
    })
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError'
    response.status(timedOut ? 504 : 502).json({
      error: timedOut ? 'Groq took too long to respond. Please try again.' : 'Could not connect to Groq. Check your connection and try again.',
    })
  }
})

app.use(express.static(webDirectory))

app.get('/{*path}', (request, response, next) => {
  if (request.path.startsWith('/api/')) return next()
  response.sendFile(path.join(webDirectory, 'index.html'), (error) => {
    if (error) next(error)
  })
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ error: 'Internal server error' })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`Career Roadmapper API listening on port ${port}`)
})

function isValidState(state) {
  return state !== null
    && typeof state === 'object'
    && typeof state.role === 'string'
    && state.role.length <= 120
    && Array.isArray(state.phases)
    && state.phases.length <= 20
    && state.phases.every((phase) =>
      typeof phase?.id === 'string'
      && typeof phase.title === 'string'
      && Array.isArray(phase.milestones)
      && phase.milestones.length <= 100
      && phase.milestones.every((milestone) =>
        typeof milestone?.id === 'string'
        && typeof milestone.title === 'string'
        && typeof milestone.done === 'boolean',
      ),
    )
    && Array.isArray(state.skills)
    && state.skills.length <= 100
    && state.skills.every((skill) =>
      typeof skill?.name === 'string'
      && Number.isFinite(skill.level)
      && skill.level >= 0
      && skill.level <= 100,
    )
    && Array.isArray(state.savedResources)
    && state.savedResources.length <= 100
    && state.savedResources.every((resource) => typeof resource === 'string')
}

function isValidGeneratedPlan(plan) {
  return Array.isArray(plan?.phases)
    && plan.phases.length === 4
    && plan.phases.every((phase) =>
      typeof phase?.title === 'string'
      && phase.title.trim().length > 0
      && phase.title.length <= 100
      && typeof phase.description === 'string'
      && phase.description.trim().length > 0
      && phase.description.length <= 240
      && Array.isArray(phase.milestones)
      && phase.milestones.length === 3
      && phase.milestones.every((milestone) =>
        typeof milestone?.title === 'string'
        && milestone.title.trim().length > 0
        && milestone.title.length <= 120
        && typeof milestone.detail === 'string'
        && milestone.detail.trim().length > 0
        && milestone.detail.length <= 280
        && typeof milestone.duration === 'string'
        && milestone.duration.trim().length > 0
        && milestone.duration.length <= 40,
      ),
    )
}