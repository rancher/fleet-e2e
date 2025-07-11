// Check the Cypress tags
// Implemented but not used yet
import { qase } from 'cypress-qase-reporter/dist/mocha';

export const isCypressTag = (tag: string) => {
  return (new RegExp(tag)).test(Cypress.env("cypress_tags"));
}

// Check the K8s version
export const isK8sVersion = (version: string) => {
  version = version.toLowerCase();
  return (new RegExp(version)).test(Cypress.env("k8s_version"));
}

// Check Rancher Manager version
export const isRancherManagerVersion = (version: string) => {
  return (new RegExp(version)).test(Cypress.env("rancher_version"));
}

// Run `It()` block based on allowedVersions
export function versionedIt(
  allowedVersions: string | string[],  
  testId: number | string,  
  testName: string,  
  options: { tags?: string },  
  testFn: () => void  
): void {
  // Ensure 'allowedVersions' is always an array
  const versions = Array.isArray(allowedVersions) ? allowedVersions : [allowedVersions];
  const versionRegex = new RegExp(versions.map(v => v === 'head' ? 'head' : v).join('|'));
  const rancherVersion = Cypress.env('rancher_version') as string;

  if (rancherVersion.includes('head') || versionRegex.test(rancherVersion)) {
    qase(testId,
      it(testName, options, () => {
        cy.log(`Rancher Version: ${rancherVersion}`);
        cy.log(`Version matched. Running test: ${testName}`);
        // Run the actual test function (testFn)
        testFn();
      })
    );
  } else {
    // If version doesn't match, skip the test
    qase(testId,
      it.skip(testName, options, () => {
        cy.log(`Test skipped for version: ${rancherVersion}`);
      })
    );
  }
}
