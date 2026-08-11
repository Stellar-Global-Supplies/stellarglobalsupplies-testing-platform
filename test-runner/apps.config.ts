import type { AppConfig } from './src/types'

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  SGS Test Platform — App Registry                               │
 * │                                                                 │
 * │  Add a new AppConfig here to onboard any CF app to the         │
 * │  test platform. Tests run automatically after each deploy.     │
 * └─────────────────────────────────────────────────────────────────┘
 */
const apps: AppConfig[] = [
  // ────────────────────────────────────────────────────────────────
  // Example app 1 — Main SGS portal
  // ────────────────────────────────────────────────────────────────
  {
    name:        'sgs-portal',
    environment: 'production',
    pageUrl:     'https://portal.stellarglobalsupplies.com',
    workerUrl:   'https://sgs-portal-api.YOUR_SUBDOMAIN.workers.dev',
    apiRoutes: [
      { path: '/health' },
      { path: '/runs',        expectedStatus: 200 },
      { path: '/stats',       expectedStatus: 200 },
      { path: '/nonexistent', expectedStatus: 404 },
    ],
    // Remove loginEndpoint if you don't have a direct API login
    loginEndpoint: {
      url:             'https://YOUR_SUPABASE_URL/auth/v1/token?grant_type=password',
      method:          'POST',
      body: {
        email:    process.env.TEST_LOGIN_EMAIL    ?? '',
        password: process.env.TEST_LOGIN_PASSWORD ?? '',
      },
      expectStatusCode: 200,
      expectJsonKey:    'access_token',
    },
  },

  // ────────────────────────────────────────────────────────────────
  // Example app 2 — Inventory service (add as many as you need)
  // ────────────────────────────────────────────────────────────────
  // {
  //   name:        'sgs-inventory',
  //   environment: 'production',
  //   pageUrl:     'https://inventory.stellarglobalsupplies.com',
  //   workerUrl:   'https://sgs-inventory-api.YOUR_SUBDOMAIN.workers.dev',
  //   apiRoutes: [
  //     { path: '/health' },
  //     { path: '/items', expectedStatus: 200 },
  //   ],
  // },
]

export default apps
