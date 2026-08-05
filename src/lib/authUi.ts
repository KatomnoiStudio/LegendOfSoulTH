const LAST_EMAIL_KEY = 'los:last-email'

export function getLastEmail(): string {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setLastEmail(email: string): void {
  try {
    localStorage.setItem(LAST_EMAIL_KEY, email.trim().toLowerCase())
  } catch {
    // private browsing / storage blocked
  }
}
