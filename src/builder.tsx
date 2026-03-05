import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, firebaseInitError, missingFirebaseEnv } from './firebase'

type Locale = 'uz' | 'en' | 'ru'
type Theme = 'light' | 'dark'
type Tab = 'personal' | 'experiences' | 'projects' | 'education' | 'skills' | 'languages'

interface ResumeData {
  personal: {
    fullName: string
    title: string
    email: string
    phone: string
    location: string
    summary: string
    profileImage: string | null
    links: { label: string; url: string }[]
  }
  experiences: Array<{
    id: string
    company: string
    role: string
    startDate: string
    endDate: string
    description: string
  }>
  projects: Array<{
    id: string
    name: string
    description: string
    liveLink: string
    githubLink: string
  }>
  education: Array<{
    id: string
    institution: string
    degree: string
    field: string
    startDate: string
    endDate: string
    description: string
  }>
  skills: Array<{
    id: string
    category: string
    items: string[]
  }>
  languages: Array<{
    id: string
    language: string
    level: string
  }>
}

const TEXT: Record<Locale, Record<string, string>> = {
  uz: {
    appTitle: 'Resume Pro',
    appSubtitle: 'Professional rezyume yarating',
    signIn: 'Kirish',
    signUp: "Ro'yxatdan o'tish",
    createAccount: 'Akkaunt yaratish',
    alreadyHave: 'Akkauntingiz bormi? Kirish',
    noAccount: "Akkaunt yo'qmi? Ro'yxatdan o'tish",
    email: 'Email',
    password: 'Parol',
    google: 'Google bilan kirish',
    logout: 'Chiqish',
    preview: "Ko'rish",
    back: 'Orqaga',
    downloadPdf: 'PDF yuklab olish',
    preparing: 'Tayyorlanmoqda...',
    personal: 'Shaxsiy',
    experiences: 'Tajriba',
    projects: 'Loyihalar',
    education: "Ta'lim",
    skills: "Ko'nikmalar",
    languages: 'Tillar',
    light: 'Light',
    dark: 'Dark',
  },
  en: {
    appTitle: 'Resume Pro',
    appSubtitle: 'Build your professional resume',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    createAccount: 'Create Account',
    alreadyHave: 'Already have an account? Sign In',
    noAccount: "Don't have an account? Sign Up",
    email: 'Email',
    password: 'Password',
    google: 'Continue with Google',
    logout: 'Logout',
    preview: 'Preview',
    back: 'Back',
    downloadPdf: 'Download PDF',
    preparing: 'Preparing...',
    personal: 'Personal',
    experiences: 'Experiences',
    projects: 'Projects',
    education: 'Education',
    skills: 'Skills',
    languages: 'Languages',
    light: 'Light',
    dark: 'Dark',
  },
  ru: {
    appTitle: 'Resume Pro',
    appSubtitle: 'Создайте профессиональное резюме',
    signIn: 'Вход',
    signUp: 'Регистрация',
    createAccount: 'Создать аккаунт',
    alreadyHave: 'Уже есть аккаунт? Войти',
    noAccount: 'Нет аккаунта? Регистрация',
    email: 'Email',
    password: 'Пароль',
    google: 'Войти через Google',
    logout: 'Выйти',
    preview: 'Предпросмотр',
    back: 'Назад',
    downloadPdf: 'Скачать PDF',
    preparing: 'Подготовка...',
    personal: 'Личное',
    experiences: 'Опыт',
    projects: 'Проекты',
    education: 'Образование',
    skills: 'Навыки',
    languages: 'Языки',
    light: 'Светлая',
    dark: 'Темная',
  },
}

const emptyResume: ResumeData = {
  personal: {
    fullName: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    profileImage: null,
    links: [{ label: '', url: '' }],
  },
  experiences: [],
  projects: [],
  education: [],
  skills: [],
  languages: [],
}

const googleProvider = new GoogleAuthProvider()
const HERO_IMAGE_URL = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQJRzQPmMs9y7dgFuE4HK_g0EDzlJ4SOgLlKA&s'

export default function ResumeBuilder() {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem('resume_locale') as Locale) || 'uz')
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('resume_theme') as Theme) || 'light')
  const [resumeData, setResumeData] = useState<ResumeData>(emptyResume)
  const [activeTab, setActiveTab] = useState<Tab>('personal')
  const [showPreview, setShowPreview] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const t = (key: string) => TEXT[locale][key] || key
  const tabs: Tab[] = ['personal', 'experiences', 'projects', 'education', 'skills', 'languages']

  useEffect(() => {
    if (!auth) return
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthError('')
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('resume_theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('resume_locale', locale)
  }, [locale])

  useEffect(() => {
    if (!user?.email) return
    setResumeData((prev) => ({
      ...prev,
      personal: { ...prev.personal, email: prev.personal.email || user.email || '' },
    }))
  }, [user])

  const getAuthMessage = (error: unknown): string => {
    if (error instanceof FirebaseError) {
      if (error.code.includes('invalid-credential')) return 'Invalid email or password'
      if (error.code.includes('popup-closed-by-user')) return 'Google sign-in popup was closed'
      if (error.code.includes('email-already-in-use')) return 'Email is already in use'
      if (error.code.includes('weak-password')) return 'Password should be at least 6 characters'
      if (error.code.includes('network-request-failed')) return 'Network error, try again'
    }
    return 'Authentication failed'
  }

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault()
    setAuthError('')
    if (!auth) {
      const reason = missingFirebaseEnv.length > 0 ? `Missing env: ${missingFirebaseEnv.join(', ')}` : firebaseInitError
      setAuthError(`Firebase config error. ${reason}`)
      return
    }
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      setEmail('')
      setPassword('')
    } catch (error) {
      setAuthError(getAuthMessage(error))
    }
  }

  const handleGoogleAuth = async () => {
    setAuthError('')
    if (!auth) {
      const reason = missingFirebaseEnv.length > 0 ? `Missing env: ${missingFirebaseEnv.join(', ')}` : firebaseInitError
      setAuthError(`Firebase config error. ${reason}`)
      return
    }
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      setAuthError(getAuthMessage(error))
    }
  }

  const handleLogout = async () => {
    if (!auth) return
    await signOut(auth)
    setShowPreview(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setResumeData((prev) => ({
        ...prev,
        personal: { ...prev.personal, profileImage: event.target?.result as string },
      }))
    }
    reader.readAsDataURL(file)
  }

  const updatePersonal = (field: keyof ResumeData['personal'], value: string) => {
    setResumeData((prev) => ({
      ...prev,
      personal: { ...prev.personal, [field]: value },
    }))
  }

  const addExperience = () => {
    setResumeData((prev) => ({
      ...prev,
      experiences: [...prev.experiences, { id: Date.now().toString(), company: '', role: '', startDate: '', endDate: '', description: '' }],
    }))
  }

  const updateExperience = (id: string, field: string, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      experiences: prev.experiences.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)),
    }))
  }

  const deleteExperience = (id: string) => {
    setResumeData((prev) => ({ ...prev, experiences: prev.experiences.filter((exp) => exp.id !== id) }))
  }

  const addProject = () => {
    setResumeData((prev) => ({
      ...prev,
      projects: [...prev.projects, { id: Date.now().toString(), name: '', description: '', liveLink: '', githubLink: '' }],
    }))
  }

  const updateProject = (id: string, field: string, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      projects: prev.projects.map((proj) => (proj.id === id ? { ...proj, [field]: value } : proj)),
    }))
  }

  const deleteProject = (id: string) => {
    setResumeData((prev) => ({ ...prev, projects: prev.projects.filter((proj) => proj.id !== id) }))
  }

  const addEducation = () => {
    setResumeData((prev) => ({
      ...prev,
      education: [...prev.education, { id: Date.now().toString(), institution: '', degree: '', field: '', startDate: '', endDate: '', description: '' }],
    }))
  }

  const updateEducation = (id: string, field: string, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      education: prev.education.map((edu) => (edu.id === id ? { ...edu, [field]: value } : edu)),
    }))
  }

  const deleteEducation = (id: string) => {
    setResumeData((prev) => ({ ...prev, education: prev.education.filter((edu) => edu.id !== id) }))
  }

  const addSkill = () => {
    setResumeData((prev) => ({ ...prev, skills: [...prev.skills, { id: Date.now().toString(), category: '', items: [] }] }))
  }

  const updateSkill = (id: string, field: string, value: string | string[]) => {
    setResumeData((prev) => ({
      ...prev,
      skills: prev.skills.map((skill) => (skill.id === id ? { ...skill, [field]: value } : skill)),
    }))
  }

  const deleteSkill = (id: string) => {
    setResumeData((prev) => ({ ...prev, skills: prev.skills.filter((skill) => skill.id !== id) }))
  }

  const addLanguage = () => {
    setResumeData((prev) => ({ ...prev, languages: [...prev.languages, { id: Date.now().toString(), language: '', level: '' }] }))
  }

  const updateLanguage = (id: string, field: string, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      languages: prev.languages.map((lang) => (lang.id === id ? { ...lang, [field]: value } : lang)),
    }))
  }

  const deleteLanguage = (id: string) => {
    setResumeData((prev) => ({ ...prev, languages: prev.languages.filter((lang) => lang.id !== id) }))
  }

  const exportToPDF = async () => {
    if (!previewRef.current) return
    setIsExporting(true)
    try {
      window.print()
    } finally {
      setIsExporting(false)
    }
  }

  const controls = (
    <div className="d-flex align-items-center gap-2 ms-2">
      <select className="form-select form-select-sm locale-select" value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
        <option value="uz">UZ</option>
        <option value="en">EN</option>
        <option value="ru">RU</option>
      </select>
      <button className="btn btn-sm btn-outline-light theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        {theme === 'light' ? t('dark') : t('light')}
      </button>
    </div>
  )

  if (!user) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center p-4" style={{ background: 'var(--auth-bg)' }}>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
        <div className="container d-flex justify-content-center align-items-center min-vh-100">
          <div className="auth-card rounded-4 p-4 p-md-5 fade-in auth-panel" style={{ maxWidth: '460px', width: '100%' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 className="mb-1">{t('appTitle')}</h1>
                <p className="text-muted mb-0">{t('appSubtitle')}</p>
              </div>
              {controls}
            </div>

            <div className="auth-hero mb-4">
              <img src={HERO_IMAGE_URL} alt="Resume style preview" className="auth-hero-image" />
              <div className="auth-hero-overlay" />
              <div className="auth-hero-text">Modern CV Design</div>
            </div>

            <form onSubmit={handleAuth}>
              {missingFirebaseEnv.length > 0 && (
                <div className="alert alert-warning">
                  Firebase env not set: {missingFirebaseEnv.join(', ')}. Set them in Vercel Project Settings.
                </div>
              )}
              {missingFirebaseEnv.length === 0 && firebaseInitError && (
                <div className="alert alert-warning">Firebase init failed: {firebaseInitError}</div>
              )}
              <div className="mb-3">
                <label className="form-label fw-semibold">{t('email')}</label>
                <input type="email" className="form-control form-control-lg" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">{t('password')}</label>
                <input type="password" className="form-control form-control-lg" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {authError && <div className="alert alert-danger">{authError}</div>}
              <button type="submit" className="btn btn-custom w-100 btn-lg mb-2" disabled={!auth}>
                {isSignUp ? t('createAccount') : t('signIn')}
              </button>
              <button type="button" className="btn btn-outline-primary w-100 mb-3" onClick={handleGoogleAuth} disabled={!auth}>
                {t('google')}
              </button>
            </form>

            <button
              className="btn btn-link w-100 text-decoration-none"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setAuthError('')
              }}
            >
              {isSignUp ? t('alreadyHave') : t('noAccount')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showPreview) {
    return (
      <div className="min-vh-100" style={{ background: 'var(--bg-soft)' }}>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
        <nav className="navbar navbar-dark bg-primary sticky-top">
          <div className="container-lg">
            <span className="navbar-brand mb-0 h1">{t('appTitle')}</span>
            <div className="d-flex align-items-center">
              <button className="btn btn-outline-light btn-sm me-2" onClick={() => setShowPreview(false)}>
                {t('back')}
              </button>
              <button className="btn btn-light btn-sm" onClick={exportToPDF} disabled={isExporting}>
                {isExporting ? t('preparing') : t('downloadPdf')}
              </button>
              {controls}
            </div>
          </div>
        </nav>

        <div className="container-lg py-5">
          <div ref={previewRef} className="bg-white p-5 rounded-3 shadow-lg">
            <div className="row align-items-center mb-4 pb-4 border-bottom">
              {resumeData.personal.profileImage && (
                <div className="col-md-2 text-center">
                  <img src={resumeData.personal.profileImage} alt="Profile" className="img-fluid rounded-circle shadow" style={{ maxWidth: '120px', border: '4px solid #0d6efd' }} />
                </div>
              )}
              <div className={resumeData.personal.profileImage ? 'col-md-10' : 'col-12'}>
                <h1 className="mb-0 text-primary fw-bold">{resumeData.personal.fullName}</h1>
                <h4 className="text-secondary mb-3">{resumeData.personal.title}</h4>
                <div className="small text-muted mb-2">
                  {resumeData.personal.email && <span>{resumeData.personal.email}</span>}
                  {resumeData.personal.phone && <span className="ms-3">{resumeData.personal.phone}</span>}
                  {resumeData.personal.location && <span className="ms-3">{resumeData.personal.location}</span>}
                </div>
              </div>
            </div>

            {resumeData.personal.summary && <p className="text-dark mb-4">{resumeData.personal.summary}</p>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-vh-100" style={{ background: 'var(--bg-soft)' }}>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
      <nav className="navbar navbar-dark bg-primary sticky-top">
        <div className="container-lg">
          <span className="navbar-brand mb-0 h1">{t('appTitle')}</span>
          <div className="d-flex align-items-center">
            <button className="btn btn-light btn-sm me-2" onClick={() => setShowPreview(true)}>
              {t('preview')}
            </button>
            <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
              {t('logout')}
            </button>
            {controls}
          </div>
        </div>
      </nav>

      <div className="container-lg py-4">
        <ul className="nav nav-tabs mb-4" role="tablist">
          {tabs.map((tab) => (
            <li className="nav-item" key={tab}>
              <button className={`nav-link fw-semibold ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                {t(tab)}
              </button>
            </li>
          ))}
        </ul>

        {activeTab === 'personal' && (
          <div className="card shadow-sm p-4">
            <h3 className="mb-4 text-primary">Personal Information</h3>
            <div className="row mb-4">
              <div className="col-md-4 text-center">
                {resumeData.personal.profileImage ? (
                  <div className="position-relative d-inline-block">
                    <img src={resumeData.personal.profileImage} alt="Profile" className="img-fluid rounded-circle shadow" style={{ maxWidth: '150px', border: '4px solid #0d6efd' }} />
                    <button
                      className="btn btn-sm btn-danger position-absolute top-0 start-100 translate-middle rounded-circle"
                      onClick={() => setResumeData((prev) => ({ ...prev, personal: { ...prev.personal, profileImage: null } }))}
                    >
                      x
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed p-4 rounded" style={{ borderColor: '#0d6efd' }}>
                    <div className="upload-icon mb-2">UP</div>
                    <p className="text-muted">Upload Photo</p>
                  </div>
                )}
                <label className="btn btn-outline-primary btn-sm mt-3">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="d-none" />
                  Upload Photo
                </label>
              </div>

              <div className="col-md-8">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Full Name</label>
                    <input type="text" className="form-control" value={resumeData.personal.fullName} onChange={(e) => updatePersonal('fullName', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Professional Title</label>
                    <input type="text" className="form-control" value={resumeData.personal.title} onChange={(e) => updatePersonal('title', e.target.value)} />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Email</label>
                    <input type="email" className="form-control" value={resumeData.personal.email} onChange={(e) => updatePersonal('email', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Phone</label>
                    <input type="tel" className="form-control" value={resumeData.personal.phone} onChange={(e) => updatePersonal('phone', e.target.value)} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Location</label>
                  <input type="text" className="form-control" value={resumeData.personal.location} onChange={(e) => updatePersonal('location', e.target.value)} />
                </div>
              </div>
            </div>

            <label className="form-label fw-semibold">Professional Summary</label>
            <textarea className="form-control mb-3" rows={4} value={resumeData.personal.summary} onChange={(e) => updatePersonal('summary', e.target.value)} />
          </div>
        )}

        {activeTab === 'experiences' && (
          <div>
            {resumeData.experiences.map((exp) => (
              <div key={exp.id} className="card shadow-sm p-4 mb-3">
                <div className="d-flex justify-content-between mb-3">
                  <h5 className="text-primary">{exp.company || 'New Experience'}</h5>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteExperience(exp.id)}>
                    Delete
                  </button>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <input className="form-control" placeholder="Company" value={exp.company} onChange={(e) => updateExperience(exp.id, 'company', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <input className="form-control" placeholder="Role" value={exp.role} onChange={(e) => updateExperience(exp.id, 'role', e.target.value)} />
                  </div>
                </div>
                <textarea className="form-control" rows={3} placeholder="Description" value={exp.description} onChange={(e) => updateExperience(exp.id, 'description', e.target.value)} />
              </div>
            ))}
            <button className="btn btn-outline-primary w-100 py-3" onClick={addExperience}>
              + Add Experience
            </button>
          </div>
        )}

        {activeTab === 'projects' && (
          <div>
            {resumeData.projects.map((proj) => (
              <div key={proj.id} className="card shadow-sm p-4 mb-3">
                <div className="d-flex justify-content-between mb-3">
                  <h5 className="text-primary">{proj.name || 'New Project'}</h5>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteProject(proj.id)}>
                    Delete
                  </button>
                </div>
                <input className="form-control mb-3" placeholder="Project Name" value={proj.name} onChange={(e) => updateProject(proj.id, 'name', e.target.value)} />
                <textarea className="form-control mb-3" rows={3} placeholder="Description" value={proj.description} onChange={(e) => updateProject(proj.id, 'description', e.target.value)} />
                <div className="row">
                  <div className="col-md-6">
                    <input className="form-control" placeholder="Live Link" value={proj.liveLink} onChange={(e) => updateProject(proj.id, 'liveLink', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <input className="form-control" placeholder="Github Link" value={proj.githubLink} onChange={(e) => updateProject(proj.id, 'githubLink', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            <button className="btn btn-outline-primary w-100 py-3" onClick={addProject}>
              + Add Project
            </button>
          </div>
        )}

        {activeTab === 'education' && (
          <div>
            {resumeData.education.map((edu) => (
              <div key={edu.id} className="card shadow-sm p-4 mb-3">
                <div className="d-flex justify-content-between mb-3">
                  <h5 className="text-primary">{edu.institution || 'New Education'}</h5>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteEducation(edu.id)}>
                    Delete
                  </button>
                </div>
                <input className="form-control mb-3" placeholder="Institution" value={edu.institution} onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)} />
                <textarea className="form-control" rows={3} placeholder="Description" value={edu.description} onChange={(e) => updateEducation(edu.id, 'description', e.target.value)} />
              </div>
            ))}
            <button className="btn btn-outline-primary w-100 py-3" onClick={addEducation}>
              + Add Education
            </button>
          </div>
        )}

        {activeTab === 'skills' && (
          <div>
            {resumeData.skills.map((skill) => (
              <div key={skill.id} className="card shadow-sm p-4 mb-3">
                <div className="d-flex justify-content-between mb-3">
                  <h5 className="text-primary">{skill.category || 'New Skill'}</h5>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteSkill(skill.id)}>
                    Delete
                  </button>
                </div>
                <input className="form-control mb-3" placeholder="Category" value={skill.category} onChange={(e) => updateSkill(skill.id, 'category', e.target.value)} />
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="React, TypeScript"
                  value={skill.items.join(', ')}
                  onChange={(e) => updateSkill(skill.id, 'items', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                />
              </div>
            ))}
            <button className="btn btn-outline-primary w-100 py-3" onClick={addSkill}>
              + Add Skill Category
            </button>
          </div>
        )}

        {activeTab === 'languages' && (
          <div>
            {resumeData.languages.map((lang) => (
              <div key={lang.id} className="card shadow-sm p-4 mb-3">
                <div className="d-flex justify-content-between mb-3">
                  <h5 className="text-primary">{lang.language || 'New Language'}</h5>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteLanguage(lang.id)}>
                    Delete
                  </button>
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <input className="form-control" placeholder="Language" value={lang.language} onChange={(e) => updateLanguage(lang.id, 'language', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <input className="form-control" placeholder="Level" value={lang.level} onChange={(e) => updateLanguage(lang.id, 'level', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            <button className="btn btn-outline-primary w-100 py-3" onClick={addLanguage}>
              + Add Language
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
