// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
    },
  },

  compatibilityDate: '2025-01-01',
})
