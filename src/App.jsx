import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  ExternalLink,
  Map,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import './App.css'

const initialPhases = [
  {
    id: 'discover',
    number: '01',
    period: 'WEEKS 1–2',
    title: 'Find your direction',
    description: 'Get clear on what the role asks for and where you stand.',
    milestones: [
      { id: 'scan-roles', title: 'Review 8 frontend job descriptions', detail: 'Spot the skills that show up again and again.', duration: '45 min', done: true },
      { id: 'skills-gap', title: 'Map your current skills gap', detail: 'Be honest about strengths and stretch areas.', duration: '30 min', done: true },
      { id: 'choose-focus', title: 'Choose one project to build', detail: 'Pick a problem you would be proud to solve.', duration: '20 min', done: false },
    ],
  },
  {
    id: 'build',
    number: '02',
    period: 'WEEKS 3–6',
    title: 'Build real fluency',
    description: 'Turn your learning into something you can demonstrate.',
    milestones: [
      { id: 'react-patterns', title: 'Practice core React patterns', detail: 'Build with state, effects, and reusable components.', duration: '3 sessions', done: false },
      { id: 'typescript', title: 'Add TypeScript to your project', detail: 'Model the data and make the UI resilient.', duration: '2 sessions', done: false },
      { id: 'accessibility', title: 'Audit keyboard accessibility', detail: 'Make every interaction work without a mouse.', duration: '1 session', done: false },
    ],
  },
  {
    id: 'showcase',
    number: '03',
    period: 'WEEKS 7–9',
    title: 'Make your work visible',
    description: 'Show your thinking, not just the finished interface.',
    milestones: [
      { id: 'case-study', title: 'Write a short project case study', detail: 'Explain the problem, tradeoffs, and outcome.', duration: '90 min', done: false },
      { id: 'portfolio', title: 'Refresh your portfolio homepage', detail: 'Lead with your strongest, most relevant work.', duration: '2 sessions', done: false },
      { id: 'peer-review', title: 'Get feedback from two developers', detail: 'Ask for specific feedback on code and clarity.', duration: '1 week', done: false },
    ],
  },
  {
    id: 'launch',
    number: '04',
    period: 'WEEKS 10–12',
    title: 'Move with intention',
    description: 'Prepare your story and make the next step concrete.',
    milestones: [
      { id: 'resume', title: 'Tailor your resume to the role', detail: 'Connect evidence from your work to the job.', duration: '60 min', done: false },
      { id: 'mock-interview', title: 'Complete a mock interview', detail: 'Practice explaining your decisions out loud.', duration: '1 session', done: false },
      { id: 'applications', title: 'Send your first 3 applications', detail: 'Choose roles that fit your direction and values.', duration: '1 week', done: false },
    ],
  },
]

const initialSkills = [
  { name: 'JavaScript', category: 'Core language', level: 68, color: 'green' },
  { name: 'React', category: 'UI development', level: 54, color: 'blue' },
  { name: 'TypeScript', category: 'Type safety', level: 32, color: 'orange' },
  { name: 'Accessibility', category: 'Inclusive design', level: 41, color: 'purple' },
]

const resources = [
  { id: 'mdn', type: 'REFERENCE', title: 'MDN Web Docs', description: 'A dependable reference for HTML, CSS, and JavaScript.', href: 'https://developer.mozilla.org/' },
  { id: 'react', type: 'PRACTICE', title: 'React Learn', description: 'Build an understanding of components and state.', href: 'https://react.dev/learn' },
  { id: 'webdev', type: 'GUIDE', title: 'web.dev Learn', description: 'Practical learning paths for modern web development.', href: 'https://web.dev/learn' },
  { id: 'typescript', type: 'REFERENCE', title: 'TypeScript Handbook', description: 'Learn the type system at your own pace.', href: 'https://www.typescriptlang.org/docs/handbook/intro.html' },
]

function readStoredValue(key, fallback) {
  try {
    const savedValue = window.localStorage.getItem(key)
    return savedValue ? JSON.parse(savedValue) : fallback
  } catch {
    return fallback
  }
}

function App() {
  const [phases, setPhases] = useState(() => readStoredValue('roadmapper-phases', initialPhases))
  const [skills, setSkills] = useState(() => readStoredValue('roadmapper-skills', initialSkills))
  const [goalRole, setGoalRole] = useState(() => readStoredValue('roadmapper-role', 'Frontend developer'))
  const [savedResources, setSavedResources] = useState(() => readStoredValue('roadmapper-resources', []))
  const [activeView, setActiveView] = useState('roadmap')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingRole, setEditingRole] = useState(false)
  const [roleDraft, setRoleDraft] = useState(goalRole)
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [milestoneDraft, setMilestoneDraft] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [apiAvailable, setApiAvailable] = useState(false)
  const [syncStatus, setSyncStatus] = useState('connecting')
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false)
  const [generationError, setGenerationError] = useState('')

  useEffect(() => {
    window.localStorage.setItem('roadmapper-phases', JSON.stringify(phases))
  }, [phases])

  useEffect(() => {
    window.localStorage.setItem('roadmapper-skills', JSON.stringify(skills))
  }, [skills])

  useEffect(() => {
    window.localStorage.setItem('roadmapper-role', JSON.stringify(goalRole))
  }, [goalRole])

  useEffect(() => {
    window.localStorage.setItem('roadmapper-resources', JSON.stringify(savedResources))
  }, [savedResources])

  useEffect(() => {
    let cancelled = false

    async function loadServerState() {
      try {
        const response = await fetch('/api/state')
        if (!response.ok) throw new Error('Unable to load saved roadmap')
        const { state } = await response.json()
        if (cancelled) return

        if (state) {
          if (Array.isArray(state.phases)) setPhases(state.phases)
          if (Array.isArray(state.skills)) setSkills(state.skills)
          if (typeof state.role === 'string') setGoalRole(state.role)
          if (Array.isArray(state.savedResources)) setSavedResources(state.savedResources)
        }
        setApiAvailable(true)
        setSyncStatus('saved')
      } catch {
        if (!cancelled) setSyncStatus('offline')
      } finally {
        if (!cancelled) setIsHydrated(true)
      }
    }

    loadServerState()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isHydrated || !apiAvailable) return undefined

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setSyncStatus('saving')
      try {
        const response = await fetch('/api/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: goalRole, phases, skills, savedResources }),
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Unable to save roadmap')
        setSyncStatus('saved')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setApiAvailable(false)
          setSyncStatus('offline')
        }
      }
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [isHydrated, apiAvailable, goalRole, phases, skills, savedResources])

  const milestones = phases.flatMap((phase) => phase.milestones)
  const completedCount = milestones.filter((milestone) => milestone.done).length
  const progress = Math.round((completedCount / milestones.length) * 100)
  const nextMilestones = phases.flatMap((phase) =>
    phase.milestones
      .filter((milestone) => !milestone.done)
      .map((milestone) => ({ ...milestone, phaseId: phase.id, phaseTitle: phase.title })),
  ).slice(0, 3)
  const filteredPhases = phases
    .map((phase) => ({
      ...phase,
      milestones: phase.milestones.filter((milestone) =>
        `${milestone.title} ${milestone.detail} ${phase.title}`.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((phase) => phase.milestones.length > 0)

  function toggleMilestone(phaseId, milestoneId) {
    setPhases((currentPhases) => currentPhases.map((phase) =>
      phase.id === phaseId
        ? { ...phase, milestones: phase.milestones.map((milestone) =>
          milestone.id === milestoneId ? { ...milestone, done: !milestone.done } : milestone,
        ) }
        : phase,
    ))
  }

  function saveRole(event) {
    event.preventDefault()
    const nextRole = roleDraft.trim()
    if (nextRole) setGoalRole(nextRole)
    setEditingRole(false)
  }

  function addMilestone(event) {
    event.preventDefault()
    const title = milestoneDraft.trim()
    if (!title) return
    setPhases((currentPhases) => currentPhases.map((phase) =>
      phase.id === 'launch'
        ? { ...phase, milestones: [...phase.milestones, {
          id: `custom-${Date.now()}`,
          title,
          detail: 'A milestone you added to your plan.',
          duration: 'Your pace',
          done: false,
        }] }
        : phase,
    ))
    setMilestoneDraft('')
    setAddingMilestone(false)
  }

  async function generateRoadmap() {
    const shouldReplace = window.confirm('Replace your current roadmap with a new Groq-generated plan? Your role and skill levels will stay saved.')
    if (!shouldReplace) return

    setIsGeneratingRoadmap(true)
    setGenerationError('')
    try {
      const response = await fetch('/api/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: goalRole, skills }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to generate a roadmap.')
      if (!Array.isArray(result.phases) || result.phases.length !== 4) {
        throw new Error('Groq returned an incomplete roadmap. Please try again.')
      }
      setPhases(result.phases)
      setAddingMilestone(false)
    } catch (error) {
      setGenerationError(error.message)
    } finally {
      setIsGeneratingRoadmap(false)
    }
  }

  function updateSkill(skillName, level) {
    setSkills((currentSkills) => currentSkills.map((skill) =>
      skill.name === skillName ? { ...skill, level: Number(level) } : skill,
    ))
  }

  function toggleSavedResource(resourceId) {
    setSavedResources((currentSaved) => currentSaved.includes(resourceId)
      ? currentSaved.filter((savedId) => savedId !== resourceId)
      : [...currentSaved, resourceId],
    )
  }

  function navigate(view) {
    setActiveView(view)
    setMobileNavOpen(false)
    setSearchQuery('')
  }

  return (
    <div className="app-shell">
      {mobileNavOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#roadmap" onClick={(event) => { event.preventDefault(); navigate('roadmap') }}>
          <span className="brand-mark"><Compass size={21} strokeWidth={2.1} /></span>
          <span className="brand-name">Northstar<span>CAREER STUDIO</span></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          <button className={`nav-link ${activeView === 'roadmap' ? 'active' : ''}`} onClick={() => navigate('roadmap')}>
            <Map size={18} /><span>My roadmap</span><ChevronRight className="nav-chevron" size={15} />
          </button>
          <button className={`nav-link ${activeView === 'skills' ? 'active' : ''}`} onClick={() => navigate('skills')}>
            <Target size={18} /><span>Skill tracker</span><ChevronRight className="nav-chevron" size={15} />
          </button>
          <button className={`nav-link ${activeView === 'library' ? 'active' : ''}`} onClick={() => navigate('library')}>
            <BookOpen size={18} /><span>Learning shelf</span><ChevronRight className="nav-chevron" size={15} />
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon"><Sparkles size={16} /></span>
            <p>Small steps add up.<br /><strong>Keep your pace.</strong></p>
          </div>
          <button className="nav-link quiet-link" onClick={() => navigate('library')}><CircleHelp size={17} /><span>Help & resources</span></button>
          <div className="profile-row">
            <div className="avatar">JD</div>
            <div className="profile-copy"><strong>Your workspace</strong><span>Personal plan</span></div>
            <Settings size={17} className="profile-settings" aria-hidden="true" />
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{activeView === 'roadmap' ? 'My roadmap' : activeView === 'skills' ? 'Skill tracker' : 'Learning shelf'}</strong></div>
          <div className="topbar-actions">
            <div className={`sync-indicator sync-${syncStatus}`} aria-live="polite">
              <span />
              {syncStatus === 'connecting' ? 'Connecting' : syncStatus === 'saving' ? 'Saving' : syncStatus === 'offline' ? 'Offline · saved on device' : 'All changes saved'}
            </div>
            <label className="search-box">
              <Search size={17} />
              <input aria-label="Search your roadmap" placeholder="Search your plan" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
              <kbd>/</kbd>
            </label>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><span /></button>
            <div className="top-avatar" aria-label="Your profile">JD</div>
          </div>
        </header>

        <main className="page-content">
          {activeView === 'roadmap' && (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">YOUR CAREER, WITH A CLEAR NEXT STEP</p>
                  <h1>Your next move, <em>mapped.</em></h1>
                  <p className="page-subtitle">A thoughtful plan for getting where you want to go.</p>
                </div>
                <div className="goal-editor">
                  <span className="goal-icon"><Target size={17} /></span>
                  <div className="goal-copy"><span>MY TARGET ROLE</span>
                    {editingRole ? (
                      <form className="role-form" onSubmit={saveRole}>
                        <input aria-label="Target role" autoFocus value={roleDraft} onChange={(event) => setRoleDraft(event.target.value)} onKeyDown={(event) => event.key === 'Escape' && setEditingRole(false)} />
                        <button aria-label="Save target role" type="submit"><Check size={15} /></button>
                      </form>
                    ) : (
                      <button className="goal-role" onClick={() => { setRoleDraft(goalRole); setEditingRole(true) }}>{goalRole}<span>Edit</span></button>
                    )}
                  </div>
                </div>
              </section>

              <section className="progress-banner" aria-label="Roadmap progress">
                <div className="progress-main">
                  <div className="progress-heading"><span className="progress-label">YOUR 12-WEEK ROADMAP</span><span className="progress-count">{completedCount} <span>/ {milestones.length} milestones</span></span></div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                  <div className="progress-foot"><span>{progress}% complete</span><span>{milestones.length - completedCount} steps to go</span></div>
                </div>
                <div className="progress-note"><span className="progress-note-icon"><Sparkles size={18} /></span><p>Progress is built one<br /><strong>small win at a time.</strong></p></div>
              </section>

              <div className="section-bar">
                <div><p className="eyebrow">THE PLAN</p><h2>Your roadmap</h2></div>
                <div className="section-actions">
                  <button className="ai-generate-button" onClick={generateRoadmap} disabled={isGeneratingRoadmap}>
                    <Sparkles size={15} />{isGeneratingRoadmap ? 'Generating…' : 'Generate with Groq'}
                  </button>
                  <button className="add-button" onClick={() => setAddingMilestone((isOpen) => !isOpen)}>
                    {addingMilestone ? <X size={16} /> : <Plus size={16} />}{addingMilestone ? 'Cancel' : 'Add milestone'}
                  </button>
                </div>
              </div>

              {generationError && <p className="generation-error" role="alert">{generationError}</p>}

              {addingMilestone && (
                <form className="quick-add" onSubmit={addMilestone}>
                  <div><span className="quick-add-icon"><Plus size={18} /></span><input autoFocus aria-label="New milestone" placeholder="What would you like to work toward?" value={milestoneDraft} onChange={(event) => setMilestoneDraft(event.target.value)} /></div>
                  <button type="submit" disabled={!milestoneDraft.trim()}>Add to plan <ArrowRight size={15} /></button>
                </form>
              )}

              <div className="dashboard-grid">
                <section className="roadmap-column" aria-label="Roadmap milestones">
                  {filteredPhases.length > 0 ? (
                    <div className="phase-grid">
                      {filteredPhases.map((phase) => {
                        const phaseComplete = phase.milestones.filter((milestone) => milestone.done).length
                        const originalPhase = phases.find((item) => item.id === phase.id)
                        return (
                          <article className={`phase-card phase-${phase.id}`} key={phase.id}>
                            <div className="phase-topline"><span className="phase-number">{phase.number}</span><span className="phase-period">{phase.period}</span><span className="phase-count">{phaseComplete}/{originalPhase.milestones.length}</span></div>
                            <h3>{phase.title}</h3>
                            <p className="phase-description">{phase.description}</p>
                            <div className="phase-rule"><span style={{ width: `${(phaseComplete / originalPhase.milestones.length) * 100}%` }} /></div>
                            <div className="milestone-list">
                              {phase.milestones.map((milestone) => (
                                <button className={`milestone-row ${milestone.done ? 'milestone-done' : ''}`} key={milestone.id} onClick={() => toggleMilestone(phase.id, milestone.id)} aria-pressed={milestone.done}>
                                  <span className="milestone-check">{milestone.done && <Check size={13} strokeWidth={2.5} />}</span>
                                  <span className="milestone-copy"><strong>{milestone.title}</strong><span>{milestone.detail}</span></span>
                                  <span className="milestone-duration">{milestone.duration}</span>
                                </button>
                              ))}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  ) : <div className="empty-state"><Search size={22} /><strong>No milestones found</strong><span>Try another search term.</span></div>}
                </section>

                <aside className="right-rail">
                  <section className="rail-section focus-section">
                    <div className="rail-title"><div><p className="eyebrow">KEEP THE MOMENTUM</p><h3>Next up</h3></div><CalendarDays size={18} /></div>
                    <p className="rail-intro">A few good places to begin this week.</p>
                    <div className="next-list">
                      {nextMilestones.length ? nextMilestones.map((milestone, index) => (
                        <button className="next-item" key={milestone.id} onClick={() => toggleMilestone(milestone.phaseId, milestone.id)}>
                          <span className={`next-index index-${index + 1}`}>{String(index + 1).padStart(2, '0')}</span>
                          <span className="next-copy"><strong>{milestone.title}</strong><span>{milestone.phaseTitle}</span></span>
                          <ArrowUpRight size={15} />
                        </button>
                      )) : <p className="all-done">You have completed every milestone. Add a new one to keep going.</p>}
                    </div>
                    <button className="text-action" onClick={() => setAddingMilestone(true)}>Add a personal milestone <ArrowRight size={15} /></button>
                  </section>

                  <section className="rail-section skills-snapshot">
                    <div className="rail-title"><div><p className="eyebrow">GROW AS YOU GO</p><h3>Skills in focus</h3></div><button className="small-arrow" aria-label="Open skill tracker" onClick={() => navigate('skills')}><ArrowUpRight size={17} /></button></div>
                    <div className="skill-mini-list">
                      {skills.slice(0, 3).map((skill) => <div className="skill-mini" key={skill.name}><div><span>{skill.name}</span><strong>{skill.level}%</strong></div><div className="skill-track"><span className={`skill-fill fill-${skill.color}`} style={{ width: `${skill.level}%` }} /></div></div>)}
                    </div>
                    <button className="text-action" onClick={() => navigate('skills')}>View all skills <ArrowRight size={15} /></button>
                  </section>
                </aside>
              </div>
            </>
          )}

          {activeView === 'skills' && (
            <>
              <section className="page-heading simple-heading"><div><p className="eyebrow">A CLEAR VIEW OF YOUR GROWTH</p><h1>Skill <em>tracker.</em></h1><p className="page-subtitle">Keep your strengths visible and choose what to practice next.</p></div><div className="skills-total"><span>{skills.length}</span><small>skills in focus</small></div></section>
              <section className="skills-panel">
                <div className="panel-heading"><div><p className="eyebrow">YOUR TOOLKIT</p><h2>Current confidence</h2></div><span className="editable-note"><span /> Drag a slider to update</span></div>
                <div className="skills-table">
                  {skills.map((skill) => (
                    <div className="skill-row" key={skill.name}>
                      <div className="skill-name-cell"><span className={`skill-dot dot-${skill.color}`} /><div><strong>{skill.name}</strong><span>{skill.category}</span></div></div>
                      <div className="skill-range-cell"><input aria-label={`${skill.name} confidence`} type="range" min="0" max="100" value={skill.level} style={{ '--range-value': `${skill.level}%` }} onChange={(event) => updateSkill(skill.name, event.target.value)} /><div className="range-labels"><span>Learning</span><span>Confident</span></div></div>
                      <div className="skill-level"><strong>{skill.level}%</strong><span>{skill.level < 40 ? 'Building' : skill.level < 70 ? 'Growing' : 'Strong'}</span></div>
                    </div>
                  ))}
                </div>
                <div className="skills-footer"><Sparkles size={17} /><span>Confidence grows through practice. Update these whenever your experience changes.</span></div>
              </section>
              <section className="skills-tip"><div className="tip-art"><Target size={24} /></div><div><p className="eyebrow">A GOOD NEXT STEP</p><h3>Choose one skill to stretch this week.</h3><p>Small, focused practice is easier to sustain than trying to learn everything at once.</p></div><button className="secondary-button" onClick={() => navigate('roadmap')}>Back to roadmap <ArrowRight size={15} /></button></section>
            </>
          )}

          {activeView === 'library' && (
            <>
              <section className="page-heading simple-heading"><div><p className="eyebrow">TOOLS FOR YOUR NEXT CHAPTER</p><h1>Learning <em>shelf.</em></h1><p className="page-subtitle">Useful references to support the work in your roadmap.</p></div><div className="skills-total"><span>{savedResources.length}</span><small>saved resources</small></div></section>
              <div className="library-grid">
                {resources.map((resource, index) => {
                  const isSaved = savedResources.includes(resource.id)
                  return <article className={`resource-card resource-${index + 1}`} key={resource.id}>
                    <div className="resource-card-top"><span>{resource.type}</span><button className={`bookmark-button ${isSaved ? 'is-saved' : ''}`} aria-label={isSaved ? `Remove ${resource.title} from saved` : `Save ${resource.title}`} onClick={() => toggleSavedResource(resource.id)}><Bookmark size={17} fill={isSaved ? 'currentColor' : 'none'} /></button></div>
                    <h2>{resource.title}</h2><p>{resource.description}</p>
                    <a className="resource-link" href={resource.href} target="_blank" rel="noreferrer">Open resource <ExternalLink size={15} /></a>
                  </article>
                  })}
              </div>
              <div className="library-note"><BookOpen size={19} /><span>Save the references you want to come back to. Your shelf is stored on this device.</span><ChevronRight size={17} /></div>
            </>
          )}

          <footer className="page-footer"><span>Make progress at your own pace.</span><span>CAREER STUDIO <span className="footer-dot">•</span> 2026</span></footer>
        </main>
      </div>
    </div>
  )
}

export default App
