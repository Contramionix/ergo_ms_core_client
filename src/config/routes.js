export default {
  "coreRoutes": [
    {
      "path": "/",
      "redirect": { "name": "AppHome" },
      "meta": {
        "requiresAuth": true
      }
    },
    {
      "path": "/:pathMatch(.*)*",
      "name": "NotFound",
      "component": "@/components/NotFound.vue",
      "meta": {
        "title": "Страница не найдена",
        "requiresAuth": true,
        "shellBackdrop": true
      }
    },
    {
      "path": "/logout",
      "name": "logout",
      "component": "@/components/header/Logout.vue",
      "meta": {
        "title": "-"
      }
    }
  ],
  
  "authRoutes": [
    {
      "path": "/start-page",
      "name": "StartPage",
      "component": "@/core/cms/adp/pages/StartPage.vue",
      "meta": {
        "startRoute": true,
        "requiresAuth": false
      }
    },
    {
      "path": "/login",
      "name": "Login",
      "component": "@/core/cms/adp/pages/LoginPage.vue",
      "meta": {
        "startRoute": true,
        "requiresAuth": false
      }
    },
    {
      "path": "/register",
      "name": "Register",
      "component": "@/core/cms/adp/pages/RegisterPage.vue",
      "meta": {
        "startRoute": true,
        "requiresAuth": false
      }
    },
    {
      "path": "/forgot-password",
      "name": "ForgotPassword",
      "component": "@/core/cms/adp/pages/ForgotPasswordPage.vue",
      "meta": {
        "startRoute": true,
        "requiresAuth": false
      }
    },
    {
      "path": "/reset-password",
      "name": "ResetPassword",
      "component": "@/core/cms/adp/pages/ResetPasswordPage.vue",
      "meta": {
        "startRoute": true,
        "requiresAuth": false
      }
    }
  ]
};

