import { defineConfig } from 'cypress'
import { afterSpecHook } from 'cypress-qase-reporter/hooks';
import { writeFileSync } from 'fs';

const qaseAPIToken = process.env.QASE_API_TOKEN

export default defineConfig({
  viewportWidth: 1596,
  viewportHeight: 954,
  // defaultBrowser: 'chrome',
  defaultCommandTimeout: 10000,
  video: true,
  videoCompression: true,
  // numTestsKeptInMemory: 0, //This flag causes sporadic erros. Avoid using it.
  experimentalMemoryManagement: true,
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    reporterEnabled: 'cypress-mochawesome-reporter, cypress-qase-reporter',
    cypressMochawesomeReporterReporterOptions: {
      charts: true,
    },
    cypressQaseReporterReporterOptions: {
      // apiToken: qaseAPIToken,
      // projectCode: 'FLEET',
      // logging: false,
      // basePath: 'https://api.qase.io/v1',
      mode: "testops",
        debug: false,
        testops: {
          api: {
           token: qaseAPIToken,
          },
          project: 'FLEET',
          uploadAttachments: true,
          run: {
            complete: true,
          },
        },
      framework: {
        cypress: {
          screenshotsFolder: './screenshots',
        },
      },
      // Screenshots are not supported in cypress-qase-reporter@1.4.1 and broken in @1.4.3
      // screenshotFolder: 'screenshots',
      // sendScreenshot: true,
    },
  },
  env: {
    "grepFilterSpecs": true
  },
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      // Adding task logger
      on('task', {
        log(message) {
          console.log(message)
          return null
        },
      }),
      // Help for memory issues.
      // Ref: https://www.bigbinary.com/blog/how-we-fixed-the-cypress-out-of-memory-error-in-chromium-browsers
      on("before:browser:launch", (browser, launchOptions) => {
        
        if (["chrome", "edge"].includes(browser.name)) {
          if (browser.isHeadless) {
            launchOptions.args.push("--no-sandbox");
            launchOptions.args.push("--disable-gl-drawing-for-tests");
            launchOptions.args.push("--disable-gpu");
            launchOptions.args.push("--js-flags=--max-old-space-size=3500");
          }
        }
        return launchOptions;
      });  
      // // eslint-disable-next-line @typescript-eslint/no-var-requires
      // require('cypress/plugins/index.ts')(on, config)
      // // eslint-disable-next-line @typescript-eslint/no-var-requires
      // require('@cypress/grep/src/plugin')(config);

      require('./plugins/index.ts')(on, config);
      require('@cypress/grep/src/plugin')(config);
      require('cypress-qase-reporter/plugin')(on, config);
      require('cypress-qase-reporter/metadata')(on);
      
      on('after:spec', async (spec, results) => {
        await afterSpecHook(spec, config);
      });
      on('before:spec', () => {
        // Writes QASE_TESTOPS_RUN_ID to a file before running each spec
        // and overwrites it with the same content over and over again
        // but it is ok as the value is the same during the whole run.
        // Later this file is used as output value in .github/workflows/master-e2e.yaml for:
        // 1) Marking cancelled test run in Qase TestOps as Completed
        // 2) Linking the run in the summary
        const qaseRunId = process.env.QASE_TESTOPS_RUN_ID;
        if (qaseRunId) {
          // process.stdout.write(`QASE_TESTOPS_RUN_ID=${qaseRunId}\n`);
          writeFileSync('./QASE_TESTOPS_RUN_ID.txt', qaseRunId, { encoding: 'utf8' });
        } else {
          // process.stdout.write('QASE_TESTOPS_RUN_ID is not set.\n');
        }
        // Output all environment variables to stdout for debugging purposes
        // for (const [key, value] of Object.entries(process.env)) {
        //   process.stdout.write(`${key}=${value}\n`);
        // }
      });

      return config;
    },
    specPattern: 'cypress/e2e/unit_tests/*.spec.ts',
    
  },
})
