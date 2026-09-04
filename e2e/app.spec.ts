import { test, expect } from '@playwright/test'

test.describe('Health Check', () => {
  test('returns healthy status', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data).toHaveProperty('auth')
    expect(data).toHaveProperty('r2')
  })
})

test.describe('Login Page', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/r2-drive/)
  })

  test('shows login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="text"], input[name="username"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})

test.describe('Unauthenticated Access', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL('**/login', { timeout: 10000 })
    expect(page.url()).toContain('/login')
  })

  test('redirects to login for protected routes', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('**/login', { timeout: 10000 })
    expect(page.url()).toContain('/login')
  })

  test('API returns 401 for unauthenticated requests', async ({ request }) => {
    const response = await request.get('/api/buckets')
    expect(response.status()).toBe(401)
  })
})

test.describe('Auth API', () => {
  test('login rejects invalid credentials', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { username: 'wrong', password: 'wrong' },
      headers: { 'Content-Type': 'application/json' }
    })
    expect(response.status()).toBe(401)
  })

  test('me returns 401 when not authenticated', async ({ request }) => {
    const response = await request.get('/api/auth/me')
    expect(response.status()).toBe(401)
  })
})

test.describe('R2 API requires auth', () => {
  test('objects endpoint requires auth', async ({ request }) => {
    const response = await request.get('/api/objects?bucket=test')
    expect(response.status()).toBe(401)
  })

  test('search endpoint requires auth', async ({ request }) => {
    const response = await request.get('/api/search?bucket=test&q=test')
    expect(response.status()).toBe(401)
  })
})
