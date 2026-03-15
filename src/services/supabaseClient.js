import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pzyvwakizibzrnyginst.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eXZ3YWtpemlienJueWdpbnN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNzcyNjIsImV4cCI6MjA4ODk1MzI2Mn0.UYVaKapwNhzzrZ96djCILfl38sSCVK1yHNJXQoUnijI'

export const isConfigMissing = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project')

if (isConfigMissing) {
  console.error('❌ SUPABASE CONFIGURATION MISSING: \n' +
    'Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel Environment Variables.\n' +
    'Guide: https://vercel.com/docs/projects/environment-variables')
}

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey, 
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
)

// Auth helpers with timeout
export const withTimeout = (promise, ms = 20000, errorMsg = 'Connection timed out. Please try again.') => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMsg)), ms);
  });

  return Promise.race([
    promise.then(result => {
      clearTimeout(timeoutId);
      return result;
    }).catch(err => {
      clearTimeout(timeoutId);
      throw err;
    }),
    timeoutPromise
  ]);
}

// Retry helper
export const withRetry = async (fn, retries = 2, delay = 1000) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === retries) throw err
      console.warn(`Retry ${i + 1} failed, waiting ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

// Auth helpers
export const signUp = async (email, password, username) => {
  console.log('Attempting to create account for:', email)
  try {
    const { data, error } = await withTimeout(
      supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { username }
        }
      }),
      25000,
      'Account creation timed out. Your connection might be slow or Supabase is busy. Please try again.'
    )
    if (error) {
      console.error('Supabase Sign Up Error:', error)
      throw error
    }
    console.log('Account created successfully!')
    return data
  } catch (error) {
    console.error('Sign Up failed:', error)
    throw error
  }
}

export const signIn = async (email, password) => {
  console.log('Attempting sign in for:', email)
  try {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      20000,
      'Login timed out. Please check your internet connection and try again.'
    )
    if (error) {
      console.error('Supabase Sign In Error:', error)
      throw error
    }
    console.log('Signed in successfully!')
    return data
  } catch (error) {
    console.error('Sign In failed:', error)
    throw error
  }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async () => {
  try {
    // 1. Get the auth user first
    const { data: { user }, error: userError } = await withTimeout(supabase.auth.getUser(), 12000)
    if (userError || !user) {
      console.error('Auth getUser failed or no user:', userError)
      return null
    }

    // 2. Try to get the profile from the 'users' table with retry
    try {
      const { data, error } = await withRetry(() => 
        withTimeout(
          supabase.from('users').select('*').eq('id', user.id).single(),
          15000
        )
      )
      
      if (error) {
        console.warn('Profile fetch from DB failed, using metadata fallback:', error)
        return { 
          id: user.id, 
          email: user.email, 
          username: user.user_metadata?.username || user.email.split('@')[0],
          avatar: user.user_metadata?.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${user.id}`
        }
      }
      return data
    } catch (dbErr) {
      console.warn('DB error in getCurrentUser after retries, using meta fallback:', dbErr)
      return { 
        id: user.id, 
        email: user.email, 
        username: user.user_metadata?.username || user.email.split('@')[0]
      }
    }
  } catch (error) {
    console.error('getCurrentUser critical failure:', error)
    return null
  }
}

// Upload helpers
export const uploadMedia = async (file, bucket = 'media') => {
  const ext = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file)
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName)
  return publicUrl
}
