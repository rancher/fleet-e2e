import { defineConfig } from 'cypress'

const qaseAPIToken = process.env.QASE_API_TOKEN

export default defineConfig({
  viewportWidth: 1314,
  viewportHeight: 954,
  defaultCommandTimeout: 10000,
  video: true,
  videoCompression: true,
  reporter: 'cypress-qase-reporter',
  reporterOptions: {
    'apiToken': qaseAPIToken,
    'projectCode': 'FLEET',
    'logging': true,
  },
  env: {
    "grepFilterSpecs": true
  },
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('./plugins/index.ts')(on, config)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@cypress/grep/src/plugin')(config);
      return config;
    },
    supportFile: './support/e2e.ts',
    fixturesFolder: './fixtures',
    screenshotsFolder: './screenshots',
    videosFolder: './videos',
    downloadsFolder: './downloads',
    specPattern: 'e2e/unit_tests/*.spec.ts',
  },
})
