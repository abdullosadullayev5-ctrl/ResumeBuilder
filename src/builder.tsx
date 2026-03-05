import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
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
import { auth, firebaseInitError } from './firebase'

type Locale = 'uz' | 'en' | 'ru'
type Theme = 'light' | 'dark'
type Tab = 'personal' | 'experiences' | 'projects' | 'education' | 'skills' | 'languages' | 'cars' | 'profile'
type CarCategory = 'premium' | 'sport' | 'suv' | 'oddiy'

interface CarModel {
  id: string
  model: string
  brand: string
  category: CarCategory
  dailyRate: number
  image: string
}

interface BookingRecord {
  id: string
  userEmail: string
  carId: string
  carModel: string
  days: number
  totalPrice: number
  createdAt: number
}

interface UserActivity {
  id: string
  userEmail: string
  loggedInAt: number
}

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
    savePdf: 'Saqlash PDF',
    sample: 'Namuna ma`lumot',
    preparing: 'Tayyorlanmoqda...',
    personal: 'Shaxsiy',
    experiences: 'Tajriba',
    projects: 'Loyihalar',
    education: "Ta'lim",
    skills: "Ko'nikmalar",
    languages: 'Tillar',
    cars: 'Mashinalar',
    profile: 'Profil',
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
    savePdf: 'Save PDF',
    sample: 'Sample Data',
    preparing: 'Preparing...',
    personal: 'Personal',
    experiences: 'Experiences',
    projects: 'Projects',
    education: 'Education',
    skills: 'Skills',
    languages: 'Languages',
    cars: 'Cars',
    profile: 'Profile',
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
    savePdf: 'Сохранить PDF',
    sample: 'Пример данных',
    preparing: 'Подготовка...',
    personal: 'Личное',
    experiences: 'Опыт',
    projects: 'Проекты',
    education: 'Образование',
    skills: 'Навыки',
    languages: 'Языки',
    cars: 'Машины',
    profile: 'Профиль',
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
const hasText = (value: string) => value.trim().length > 0
const ADMIN_EMAILS = ['admin@rentpro.uz', 'abdullosadullayev5@gmail.com', 'abdullosadullayev5-ctrl@gmail.com']
const cars: CarModel[] = [
  { id: '1', model: 'Mercedes GLS 450', brand: 'Mercedes-Benz', category: 'premium', dailyRate: 320, image: 'https://www.mercedes-benz.com.au/content/dam/hq/passengercars/cars/gls/gls-suv-x167-fl-pi/overview/spa/02-2025/images/mercedes-benz-gls-suv-x167-spa-highlights-e-active-body-control-2400x2400-02-2025.jpg?im=Resize,width=1014' },
  { id: '2', model: 'BMW X7', brand: 'BMW', category: 'premium', dailyRate: 300, image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80' },
  { id: '3', model: 'Range Rover Sport', brand: 'Land Rover', category: 'premium', dailyRate: 310, image: 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80' },
  { id: '4', model: 'Porsche Cayenne', brand: 'Porsche', category: 'sport', dailyRate: 360, image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=80' },
  { id: '5', model: 'BMW X6 M', brand: 'BMW', category: 'sport', dailyRate: 390, image: 'https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1200&q=80' },
  { id: '6', model: 'Audi RS Q8', brand: 'Audi', category: 'sport', dailyRate: 380, image: 'https://images.unsplash.com/photo-1617814076668-7fa8a9f2bd3b?auto=format&fit=crop&w=1200&q=80' },
  { id: '7', model: 'Toyota Land Cruiser', brand: 'Toyota', category: 'suv', dailyRate: 240, image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80' },
  { id: '8', model: 'Kia Sorento', brand: 'Kia', category: 'suv', dailyRate: 170, image: 'https://images.unsplash.com/photo-1549921296-3ecf9fbe4765?auto=format&fit=crop&w=1200&q=80' },
  { id: '9', model: 'Hyundai Santa Fe', brand: 'Hyundai', category: 'suv', dailyRate: 160, image: 'https://images.unsplash.com/photo-1532581140115-3e355d1ed1de?auto=format&fit=crop&w=1200&q=80' },
  { id: '10', model: 'Chevrolet Malibu', brand: 'Chevrolet', category: 'oddiy', dailyRate: 90, image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80' },
  { id: '11', model: 'Toyota Camry', brand: 'Toyota', category: 'oddiy', dailyRate: 85, image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80' },
  { id: '12', model: 'Hyundai Elantra', brand: 'Hyundai', category: 'oddiy', dailyRate: 75, image: 'https://images.unsplash.com/photo-1617531653520-4893f7bbf978?auto=format&fit=crop&w=1200&q=80' },
]

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const sampleResume: ResumeData = {
  personal: {
    fullName: 'Ravshan Qahramonov',
    title: 'Software Engineer',
    email: 'r17ravshan@gmail.com',
    phone: '+998914017702',
    location: 'B. Naqshband',
    summary:
      'Software Engineer with 3 years of experience in software development, testing, and maintenance. Proven ability to build high-performance, secure, data-driven applications with quality code.',
    profileImage: null,
    links: [
      { label: 'LinkedIn', url: 'https://linkedin.com' },
      { label: 'Github', url: 'https://github.com' },
      { label: 'Website', url: 'https://example.com' },
    ],
  },
  experiences: [
    {
      id: 'exp-1',
      company: 'Codecraft',
      role: 'Frontend Developer and Teacher',
      startDate: '2022-07-01',
      endDate: '2023-01-01',
      description: 'My first work in Tashkent',
    },
    {
      id: 'exp-2',
      company: 'Stable Education',
      role: 'Frontend Developer and Teacher',
      startDate: '2023-02-01',
      endDate: '2023-09-01',
      description: '',
    },
    {
      id: 'exp-3',
      company: 'Shift Academy',
      role: 'Frontend Developer',
      startDate: '2023-02-01',
      endDate: 'Present',
      description: '',
    },
  ],
  projects: [
    { id: 'pr-1', name: 'Project-1', description: '', liveLink: 'https://example.com/live1', githubLink: 'https://github.com/example/repo1' },
    { id: 'pr-2', name: 'Project-2', description: '', liveLink: 'https://example.com/live2', githubLink: 'https://github.com/example/repo2' },
  ],
  education: [
    {
      id: 'ed-1',
      institution: 'Buxoro Inovatsion Tibbiyot Universiteti',
      degree: 'Bakalavr darajasi',
      field: 'Iqtisod',
      startDate: '2024-09-19',
      endDate: 'Present',
      description: '',
    },
  ],
  skills: [
    {
      id: 'sk-1',
      category: 'Frontend',
      items: ['HTML', 'CSS', 'SCSS', 'Tailwind', 'JS', 'TS', 'React', 'React Toolkit', 'Next', 'AntUI', 'Material UI'],
    },
  ],
  languages: [
    { id: 'ln-1', language: 'Russian', level: 'Advanced' },
    { id: 'ln-2', language: 'English', level: 'Intermediate' },
    { id: 'ln-3', language: 'Uzbek', level: 'Fluent' },
  ],
}

const minutesAgo = (timestamp: number) => Math.max(1, Math.floor((Date.now() - timestamp) / 60000))

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
  const [carSearch, setCarSearch] = useState('')
  const [carCategory, setCarCategory] = useState<'all' | CarCategory>('all')
  const [rentalDays, setRentalDays] = useState<Record<string, number>>({})
  const [bookedCarIds, setBookedCarIds] = useState<string[]>(() => safeParse<string[]>(localStorage.getItem('booked_car_ids'), []))
  const [bookingRecords, setBookingRecords] = useState<BookingRecord[]>(() => safeParse<BookingRecord[]>(localStorage.getItem('booking_records'), []))
  const [userActivities, setUserActivities] = useState<UserActivity[]>(() => safeParse<UserActivity[]>(localStorage.getItem('user_activities'), []))
  const [showPreview, setShowPreview] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  const t = (key: string) => TEXT[locale][key] || key
  const tabs: Tab[] = ['personal', 'experiences', 'projects', 'education', 'skills', 'languages', 'cars', 'profile']
  const filteredCars = cars.filter((car) => {
    const byCategory = carCategory === 'all' || car.category === carCategory
    const q = carSearch.trim().toLowerCase()
    const bySearch = q.length === 0 || `${car.brand} ${car.model}`.toLowerCase().includes(q)
    return byCategory && bySearch
  })
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  const resumeHasContent =
    hasText(resumeData.personal.fullName) ||
    hasText(resumeData.personal.title) ||
    hasText(resumeData.personal.summary) ||
    resumeData.experiences.some((item) => hasText(item.company) || hasText(item.role) || hasText(item.description)) ||
    resumeData.projects.some((item) => hasText(item.name) || hasText(item.description)) ||
    resumeData.education.some((item) => hasText(item.institution) || hasText(item.degree) || hasText(item.field)) ||
    resumeData.skills.some((item) => hasText(item.category) || item.items.length > 0) ||
    resumeData.languages.some((item) => hasText(item.language) || hasText(item.level))

  useEffect(() => {
    if (!auth) return
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthError('')
      if (currentUser?.email) {
        setUserActivities((prev) => [
          {
            id: `${Date.now()}-${currentUser.uid}`,
            userEmail: currentUser.email ?? 'unknown',
            loggedInAt: Date.now(),
          },
          ...prev,
        ].slice(0, 200))
      }
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
    localStorage.setItem('booked_car_ids', JSON.stringify(bookedCarIds))
  }, [bookedCarIds])

  useEffect(() => {
    localStorage.setItem('booking_records', JSON.stringify(bookingRecords))
  }, [bookingRecords])

  useEffect(() => {
    localStorage.setItem('user_activities', JSON.stringify(userActivities))
  }, [userActivities])

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
      setAuthError(`Firebase config error. ${firebaseInitError || 'Initialization failed'}`)
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
      setAuthError(`Firebase config error. ${firebaseInitError || 'Initialization failed'}`)
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

  const addPersonalLink = () => {
    setResumeData((prev) => ({
      ...prev,
      personal: { ...prev.personal, links: [...prev.personal.links, { label: '', url: '' }] },
    }))
  }

  const updatePersonalLink = (index: number, field: 'label' | 'url', value: string) => {
    setResumeData((prev) => {
      const links = [...prev.personal.links]
      links[index] = { ...links[index], [field]: value }
      return { ...prev, personal: { ...prev.personal, links } }
    })
  }

  const removePersonalLink = (index: number) => {
    setResumeData((prev) => ({
      ...prev,
      personal: { ...prev.personal, links: prev.personal.links.filter((_, idx) => idx !== index) },
    }))
  }

  const handleBookCar = (car: CarModel) => {
    if (!user?.email) return
    if (bookedCarIds.includes(car.id)) return
    const days = Math.max(1, Number(rentalDays[car.id] || 1))
    const discount = days >= 30 ? 0.88 : 1
    const totalPrice = Math.round(car.dailyRate * days * discount)

    setBookedCarIds((prev) => [...prev, car.id])
    setBookingRecords((prev) => [
      {
        id: `${Date.now()}-${car.id}`,
        userEmail: user.email ?? 'unknown',
        carId: car.id,
        carModel: `${car.brand} ${car.model}`,
        days,
        totalPrice,
        createdAt: Date.now(),
      },
      ...prev,
    ])
  }

  const handleReleaseCar = (carId: string) => {
    if (!isAdmin) return
    setBookedCarIds((prev) => prev.filter((id) => id !== carId))
  }

  const loadSampleResume = () => {
    setResumeData(sampleResume)
  }

  const exportToPDF = async () => {
    const target = exportRef.current || previewRef.current
    if (!target) return
    setIsExporting(true)
    try {
      const canvas = await html2canvas(target, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const margin = 8
      const imgWidth = 210 - margin * 2
      const pageHeight = 297 - margin * 2
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = margin

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft)
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`${resumeData.personal.fullName.trim() || 'resume'}.pdf`)
    } finally {
      setIsExporting(false)
    }
  }

  const renderResumeDocument = (ref?: { current: HTMLDivElement | null }) => (
    <div ref={ref} className="resume-sheet">
      <div className="resume-header">
        <h1>{resumeData.personal.fullName || 'Your Name'}</h1>
        <h2>{resumeData.personal.title || 'Professional Title'}</h2>
        <div className="resume-contact">
          {resumeData.personal.location && <span>{resumeData.personal.location}</span>}
          {resumeData.personal.phone && <span>{resumeData.personal.phone}</span>}
          {resumeData.personal.email && <span>{resumeData.personal.email}</span>}
        </div>
        {resumeData.personal.links.some((link) => hasText(link.url)) && (
          <div className="resume-links">
            {resumeData.personal.links
              .filter((link) => hasText(link.url))
              .map((link, idx) => (
                <a key={`${link.url}-${idx}`} href={link.url} target="_blank" rel="noreferrer">
                  {link.label || link.url}
                </a>
              ))}
          </div>
        )}
        {resumeData.personal.summary && <p className="resume-summary">{resumeData.personal.summary}</p>}
      </div>

      {resumeData.experiences.length > 0 && (
        <section className="resume-section">
          <h3>EXPERIENCE</h3>
          {resumeData.experiences.map((exp) => (
            <article key={exp.id} className="resume-item">
              <div className="resume-item-header">
                <div>
                  <h4>{exp.company || 'Company'}</h4>
                  <p>{exp.role || 'Role'}</p>
                </div>
                <span>
                  {exp.startDate || 'Start'} - {exp.endDate || 'Present'}
                </span>
              </div>
              {exp.description && <p className="resume-item-description">{exp.description}</p>}
            </article>
          ))}
        </section>
      )}

      {resumeData.projects.length > 0 && (
        <section className="resume-section">
          <h3>PROJECTS</h3>
          {resumeData.projects.map((proj) => (
            <article key={proj.id} className="resume-item">
              <h4>{proj.name || 'Project'}</h4>
              {proj.description && <p className="resume-item-description">{proj.description}</p>}
              <div className="resume-links">
                {proj.liveLink && (
                  <a href={proj.liveLink} target="_blank" rel="noreferrer">
                    Live Link
                  </a>
                )}
                {proj.githubLink && (
                  <a href={proj.githubLink} target="_blank" rel="noreferrer">
                    Github Link
                  </a>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {resumeData.education.length > 0 && (
        <section className="resume-section">
          <h3>EDUCATION</h3>
          {resumeData.education.map((edu) => (
            <article key={edu.id} className="resume-item">
              <div className="resume-item-header">
                <div>
                  <h4>{edu.institution || 'Institution'}</h4>
                  <p>{[edu.degree, edu.field].filter(Boolean).join(' - ') || 'Degree / Field'}</p>
                </div>
                <span>
                  {edu.startDate || 'Start'} - {edu.endDate || 'Present'}
                </span>
              </div>
              {edu.description && <p className="resume-item-description">{edu.description}</p>}
            </article>
          ))}
        </section>
      )}

      {resumeData.skills.length > 0 && (
        <section className="resume-section">
          <h3>SKILLS</h3>
          {resumeData.skills.map((skill) => (
            <p key={skill.id} className="resume-skill-line">
              <strong>{skill.category || 'Category'}: </strong>
              {skill.items.join(', ')}
            </p>
          ))}
        </section>
      )}

      {resumeData.languages.length > 0 && (
        <section className="resume-section">
          <h3>LANGUAGES</h3>
          <ul className="resume-lang-list">
            {resumeData.languages.map((lang) => (
              <li key={lang.id}>
                {lang.language || 'Language'} - {lang.level || 'Level'}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )

  const carCategoryLabel = (category: CarCategory) => {
    if (category === 'premium') return 'Premium'
    if (category === 'sport') return 'Sport'
    if (category === 'suv') return 'SUV'
    return 'Oddiy'
  }

  const controls = (
    <div className="d-flex align-items-center gap-2 ms-2">
      <div className="lang-switch">
        <button type="button" className={`lang-btn ${locale === 'uz' ? 'active' : ''}`} onClick={() => setLocale('uz')}>
          UZ
        </button>
        <button type="button" className={`lang-btn ${locale === 'ru' ? 'active' : ''}`} onClick={() => setLocale('ru')}>
          RU
        </button>
        <button type="button" className={`lang-btn ${locale === 'en' ? 'active' : ''}`} onClick={() => setLocale('en')}>
          EN
        </button>
      </div>
      <button type="button" className="btn btn-sm btn-outline-light theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
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

            <form onSubmit={handleAuth}>
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
              <button className="btn btn-light btn-sm" onClick={exportToPDF} disabled={isExporting || !resumeHasContent}>
                {isExporting ? t('preparing') : t('savePdf')}
              </button>
              {controls}
            </div>
          </div>
        </nav>

        <div className="container-lg py-5">{renderResumeDocument(previewRef)}</div>
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
            <button className="btn btn-outline-light btn-sm me-2" onClick={loadSampleResume}>
              {t('sample')}
            </button>
            <button className="btn btn-light btn-sm me-2" onClick={() => setShowPreview(true)}>
              {t('preview')}
            </button>
            {resumeHasContent && (
              <button className="btn btn-warning btn-sm me-2" onClick={exportToPDF} disabled={isExporting}>
                {isExporting ? t('preparing') : t('savePdf')}
              </button>
            )}
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

            <div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label fw-semibold mb-0">Social Links</label>
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={addPersonalLink}>
                  + Add Link
                </button>
              </div>
              {resumeData.personal.links.map((link, idx) => (
                <div key={`${idx}-${link.label}`} className="row g-2 mb-2">
                  <div className="col-md-4">
                    <input className="form-control" placeholder="LinkedIn" value={link.label} onChange={(e) => updatePersonalLink(idx, 'label', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <input className="form-control" placeholder="https://..." value={link.url} onChange={(e) => updatePersonalLink(idx, 'url', e.target.value)} />
                  </div>
                  <div className="col-md-2 d-grid">
                    <button type="button" className="btn btn-outline-danger" onClick={() => removePersonalLink(idx)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
                <div className="row mb-3">
                  <div className="col-md-6">
                    <input className="form-control" placeholder="Start date (YYYY-MM-DD)" value={exp.startDate} onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <input className="form-control" placeholder="End date or Present" value={exp.endDate} onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)} />
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
                <div className="row mb-3">
                  <div className="col-md-6">
                    <input className="form-control" placeholder="Degree" value={edu.degree} onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <input className="form-control" placeholder="Field" value={edu.field} onChange={(e) => updateEducation(edu.id, 'field', e.target.value)} />
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <input className="form-control" placeholder="Start date (YYYY-MM-DD)" value={edu.startDate} onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <input className="form-control" placeholder="End date or Present" value={edu.endDate} onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)} />
                  </div>
                </div>
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

        {activeTab === 'cars' && (
          <div className="card shadow-sm p-4 hover-rise">
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
              <h3 className="text-primary mb-0">Rent Cars</h3>
              <span className="text-muted small">{filteredCars.length} ta model topildi</span>
            </div>

            <div className="row g-2 mb-4">
              <div className="col-md-5">
                <input
                  className="form-control"
                  placeholder="Model yoki brand qidiring..."
                  value={carSearch}
                  onChange={(e) => setCarSearch(e.target.value)}
                />
              </div>
              <div className="col-md-7">
                <div className="d-flex flex-wrap gap-2">
                  {(['all', 'premium', 'sport', 'suv', 'oddiy'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`btn btn-sm ${carCategory === cat ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setCarCategory(cat)}
                    >
                      {cat === 'all' ? 'Hammasi' : carCategoryLabel(cat)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="row g-3">
              {filteredCars.map((car) => {
                const isBooked = bookedCarIds.includes(car.id)
                const daysValue = Math.max(1, Number(rentalDays[car.id] || 1))
                const totalPrice = Math.round(car.dailyRate * daysValue * (daysValue >= 30 ? 0.88 : 1))
                const monthPrice = Math.round(car.dailyRate * 30 * 0.88)
                return (
                  <div className="col-md-6 col-xl-4" key={car.id}>
                    <div className="car-card h-100">
                      <img src={car.image} alt={car.model} className="car-card-image" />
                      <div className="car-card-body">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h5 className="mb-1">{car.model}</h5>
                            <p className="small text-muted mb-0">{car.brand}</p>
                          </div>
                          <span className={`badge ${isBooked ? 'text-bg-danger' : 'text-bg-success'}`}>{isBooked ? 'Band qilingan' : 'Bo`sh'}</span>
                        </div>
                        <p className="small mb-1 text-muted">Kategoriya: {carCategoryLabel(car.category)}</p>
                        <div className="d-flex justify-content-between">
                          <span>1 kun</span>
                          <strong>${car.dailyRate}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>30 kun</span>
                          <strong>${monthPrice}</strong>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                          <input
                            type="number"
                            min={1}
                            className="form-control form-control-sm me-2"
                            value={daysValue}
                            onChange={(e) =>
                              setRentalDays((prev) => ({
                                ...prev,
                                [car.id]: Math.max(1, Number(e.target.value || 1)),
                              }))
                            }
                          />
                          <button type="button" className={`btn btn-sm ${isBooked ? 'btn-secondary' : 'btn-primary'}`} onClick={() => handleBookCar(car)} disabled={isBooked}>
                            {isBooked ? 'Band' : 'Rent'}
                          </button>
                        </div>
                        <div className="d-flex justify-content-between mt-2">
                          <span>{daysValue} kun uchun</span>
                          <strong>${totalPrice}</strong>
                        </div>
                        {isBooked && isAdmin && (
                          <button type="button" className="btn btn-sm btn-outline-danger w-100 mt-2" onClick={() => handleReleaseCar(car.id)}>
                            Bo`shatish (Admin)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {isAdmin && (
              <div className="admin-panel mt-4">
                <h5 className="mb-3">Admin panel</h5>
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Foydalanuvchi</th>
                        <th>Mashina</th>
                        <th>Kun</th>
                        <th>Narx</th>
                        <th>Qachon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookingRecords.map((record) => (
                        <tr key={record.id}>
                          <td>{record.userEmail}</td>
                          <td>{record.carModel}</td>
                          <td>{record.days}</td>
                          <td>${record.totalPrice}</td>
                          <td>{minutesAgo(record.createdAt)} min oldin</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h6 className="mt-3">Kirishlar</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Kirdi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userActivities.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.userEmail}</td>
                          <td>{minutesAgo(entry.loggedInAt)} min oldin</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="card shadow-sm p-4 hover-rise">
            <h3 className="text-primary mb-3">{t('profile')}</h3>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Email</label>
                <input className="form-control" value={user?.email ?? ''} disabled />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">User ID</label>
                <input className="form-control" value={user?.uid ?? ''} disabled />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Display Name</label>
                <input
                  className="form-control"
                  value={resumeData.personal.fullName}
                  onChange={(e) => updatePersonal('fullName', e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Role</label>
                <input className="form-control" value={isAdmin ? 'Admin' : 'User'} disabled />
              </div>
            </div>
            <div className="mt-3 small text-muted">
              {userActivities.length > 0 && <>Last login: {minutesAgo(userActivities[0].loggedInAt)} min ago</>}
            </div>
          </div>
        )}
      </div>

      <div className="pdf-export-shell" aria-hidden>
        {renderResumeDocument(exportRef)}
      </div>
    </div>
  )
}


