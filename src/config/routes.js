export const coreRoutes = [
  {
    path: '/',
    redirect: { name: 'AppHome' },
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/components/NotFound.vue'),
    meta: {
      title: 'Страница не найдена',
      requiresAuth: true,
      shellBackdrop: true,
    },
  },
  {
    path: '/logout',
    name: 'logout',
    component: () => import('@/components/header/Logout.vue'),
    meta: {
      title: '-',
    },
  },
]

export const authRoutes = [
  {
    path: '/start-page',
    name: 'StartPage',
    component: () => import('@/core/cms/adp/pages/StartPage.vue'),
    meta: {
      startRoute: true,
      requiresAuth: false,
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/core/cms/adp/pages/LoginPage.vue'),
    meta: {
      startRoute: true,
      requiresAuth: false,
    },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/core/cms/adp/pages/RegisterPage.vue'),
    meta: {
      startRoute: true,
      requiresAuth: false,
    },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/core/cms/adp/pages/ForgotPasswordPage.vue'),
    meta: {
      startRoute: true,
      requiresAuth: false,
    },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/core/cms/adp/pages/ResetPasswordPage.vue'),
    meta: {
      startRoute: true,
      requiresAuth: false,
    },
  },
]
