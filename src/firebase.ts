import { initializeApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

export let firebaseInitError = ''

const firebaseConfig = {
  apiKey: 'AIzaSyCoTvYoc-9rJingUTFxDomXgaAQ0bvnKv0',
  authDomain: 'sayt-9e245.firebaseapp.com',
  projectId: 'sayt-9e245',
  storageBucket: 'sayt-9e245.firebasestorage.app',
  messagingSenderId: '57903143719',
  appId: '1:57903143719:web:e4ffd3911174d4e49de702',
  measurementId: 'G-GHRT1FMTZL',
}

let auth: Auth | null = null

try {
  const app = initializeApp(firebaseConfig)
  auth = getAuth(app)
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown Firebase initialization error'
  firebaseInitError = message
  auth = null
}

export { auth }
