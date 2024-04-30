/*
Copyright © 2023 - 2024 SUSE LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import 'cypress/support/commands';
import * as cypressLib from '@rancher-ecp-qa/cypress-library';
import { qase } from 'cypress-qase-reporter/dist/mocha';

export const appName = "nginx-keep"
export const branch = "master"
export const path = "qa-test-apps/nginx-app"
export const repoUrl = "https://github.com/rancher/fleet-test-data/"

beforeEach(() => {
  cy.login();
  cy.visit('/');
  cy.deleteAllFleetRepos();
});


Cypress.config();
describe('Test GitRepo Bundle name validation and max character trimming behavior in bundle', { tags: '@p1'}, () => {
  const repoTestData: testData[] = [
    { qase_id: 103,
      repoName: "test-test-test-test-test-test-test-test-test-t",
      test_explanation: "47 characters long is NOT TRIMMED but PATH is added with '-' to 53 characters" },
    { qase_id: 104,
      repoName: "test-test-test-test-test-test-test-test-test-test-test-test",
      test_explanation: "59 characters long is TRIMMED to 53 characters max" },
    { qase_id: 106,
      repoName: "test-test-test-test-123-456-789-0--test-test-test-test",
      test_explanation: "54 characters long is TRIMMED to 53 characters max" },
    { qase_id: 105,
      repoName: "Test.1-repo-local-cluster",
      test_explanation: "INVALID and NORMAL characters" },
    { qase_id: 61,
      repoName: "ryhhskh-123456789+-+abdhg%^/",
      test_explanation: "INVALID and SPECIAL characters" },
  ]

  repoTestData.forEach(
    ({ qase_id, repoName, test_explanation }) => {
      if ((qase_id === 105 || qase_id === 61)) {
        qase(qase_id,
          it(`Fleet-${qase_id}: Test GitRepo NAME with "${test_explanation}" displays ERROR message and does NOT get created`, { tags: `@fleet-${qase_id}` }, () => {
            // Add Fleet repository and create it
            cy.addFleetGitRepo({repoName, repoUrl, branch, path});
            cy.clickButton('Create');

            // Assert errorMessage exists
            cy.get('[data-testid="banner-content"] > span')
              .should('contain', repoName)
              .should('contain', 'RFC 1123')

            // Navigate back to GitRepo page
            cy.clickButton('Cancel')
            cy.contains('No repositories have been added').should('be.visible')
          })
          )
      } else {
        qase(qase_id,
          it(`Fleet-${qase_id}: Test GitRepo bundle name TRIMMING behavior. GitRepo with "${test_explanation}"`, { tags: `@fleet-${qase_id}` }, () => {
            // Change namespace to fleet-local
            cy.fleetNamespaceToggle('fleet-local');

            // Add Fleet repository and create it
            cy.addFleetGitRepo({repoName, repoUrl, branch, path});
            cy.clickButton('Create');
            cy.verifyTableRow(0, 'Active', repoName);

            // Navigate to Bundles
            cypressLib.accesMenu("Advanced")
            cypressLib.accesMenu("Bundles")

            // Check bundle name trimed to less than 53 characters
            cy.contains('tr.main-row[data-testid="sortable-table-1-row"]').should('not.be.empty', { timeout: 25000 });
            cy.get(`table > tbody > tr.main-row[data-testid="sortable-table-1-row"]`)
              .children({ timeout: 300000 })
              .should('not.have.text', 'fleet-agent-local')
              .should('not.be.empty')
              .should('include.text', 'test-')
              .should(($ele) => {
                expect($ele).have.length.lessThan(53)
              })
            cy.checkApplicationStatus(appName);
            cy.deleteAllFleetRepos();
          })
        )
      }
    }
  )
});

describe('Test resource behavior after deleting GitRepo using keepResources option', { tags: '@p1'}, () => {
  const keepResourceData: testData[] = [
    { qase_id: 69,
      keepResources: 'yes',
      test_explanation: 'RESOURCES will be KEPT and NOT be DELETED after GitRepo is deleted.',
    },
    { qase_id: 70,
      keepResources: 'no',
      test_explanation: 'RESOURCES will NOT be KEPT and  will be DELETED after GitRepo is deleted.',
    },
  ]
  keepResourceData.forEach(
    ({ qase_id, keepResources, test_explanation}) => {
      qase(qase_id,
        it(`Fleet-${qase_id}: Test ${test_explanation}`, { tags: `@fleet-${qase_id}` }, () => {
          const repoName = `local-cluster-fleet-${qase_id}`
          cy.fleetNamespaceToggle('fleet-local')
          cy.addFleetGitRepo({ repoName, repoUrl, branch, path, keepResources });
          cy.clickButton('Create');
          cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
          cy.checkApplicationStatus(appName);
          cy.deleteAllFleetRepos();
          if (keepResources === 'yes') {
            cy.checkApplicationStatus(appName);
            cy.deleteApplicationDeployment();
          }
        })
      )
    }
  )
});

describe('Test Self-Healing of resource modification when correctDrift option used', { tags: '@p1'}, () => {
  const correctDriftData: testData[] = [
    { qase_id: 76,
      correctDrift: 'yes',
      test_explanation: 'MODIFICATION to resources will be self-healed when correctDrift is set to true in GitRepo.',
    },
    { qase_id: 113,
      correctDrift: 'no',
      test_explanation: 'MODIFICATION to resources will not be self-healed when correctDrift is set to false in GitRepo.',
    },
  ]
  correctDriftData.forEach(
    ({ qase_id, correctDrift, test_explanation}) => {
      qase(qase_id,
        it(`Fleet-${qase_id}: Test ${test_explanation}`, { tags: `@fleet-${qase_id}` }, () => {
          const repoName = `local-cluster-correct-${qase_id}`
          cy.fleetNamespaceToggle('fleet-local')
          cy.addFleetGitRepo({ repoName, repoUrl, branch, path, correctDrift });
          cy.clickButton('Create');
          cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
          cy.checkApplicationStatus(appName);

          // Modify deployment count of application
          cy.modifyDeployedApplication(appName);

          if (correctDrift === 'yes') {
            // Resources will be restored, hence count will be 1/1.
            cy.verifyTableRow(0, appName, '1/1');
          } else {
            // Resource count will get increased as resource will not be restored
            cy.verifyTableRow(0, appName, '2/2');
          }
          cy.deleteAllFleetRepos();
        })
      )
    }
  )
});

describe('Test Self-Healing of resource modification when correctDrift option used for exisiting GitRepo', { tags: '@p1'}, () => {
  qase(77,
    it("Fleet-77: Test MODIFICATION to resources will be self-healed when correctDrift is set to true in existing GitRepo.", { tags: '@fleet-77', retries: 1 }, () => {
      const repoName = "local-cluster-correct-77"
      cy.fleetNamespaceToggle('fleet-local')
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
      cy.checkApplicationStatus(appName);

      // Modify deployment count of application
      cy.modifyDeployedApplication(appName);

      // Resource count will get increased as resource will not be restored
      cy.verifyTableRow(0, appName, '2/2');

      // Update exising GitRepo by enabling 'correctDrift'
      cy.addFleetGitRepo({ repoName, correctDrift: 'yes', editConfig: true });
      cy.clickButton('Save');
      cy.open3dotsMenu(repoName, 'Force Update');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
      cy.checkApplicationStatus(appName);

      // Modify deployment count of application
      cy.modifyDeployedApplication(appName);

      // Resources will be restored, hence count will be 1/1.
      cy.verifyTableRow(0, appName, '1/1');

      cy.deleteAllFleetRepos();
    })
  )
});

describe('Test resource behavior after deleting GitRepo using keepResources option for exisiting GitRepo', { tags: '@p1'}, () => {
  qase(71,
    it("Fleet-71: Test RESOURCES will be KEPT and NOT be DELETED after GitRepo is deleted when keepResources is set to true in existing GitRepo.", { tags: '@fleet-71' }, () => {
      const repoName = "local-cluster-keep-71"
      cy.fleetNamespaceToggle('fleet-local')
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
      cy.checkApplicationStatus(appName);

      // Edit existing GitRepo with 'keepResource: true' to prevent
      // application removal after GitRepo delete.
      cy.addFleetGitRepo({ repoName, keepResources: 'yes', editConfig: true });
      cy.clickButton('Save');
      cy.open3dotsMenu(repoName, 'Force Update');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

      // Delete GitRepo to check application removed or not.
      cy.deleteAllFleetRepos();

      // Check application still exists after deleting existing GitRepo
      cy.checkApplicationStatus(appName);
      cy.deleteApplicationDeployment();
    })
  )
});

// Perform this test only if rancher_version does not contain "/2.7"
if (!/\/2\.7/.test(Cypress.env('rancher_version'))) {
  describe('Test local cluster behavior with New workspace', { tags: '@p1'}, () => {
    qase(107,
      it("Fleet-107: Test LOCAL CLUSTER cannot be moved to another workspace as no 'Change workspace' option available..", { tags: '@fleet-107' }, () => {
        cy.accesMenuSelection('Continuous Deliver', 'Clusters');
        cy.fleetNamespaceToggle('fleet-local');
        cy.open3dotsMenu('local', 'Change workspace', true);
      })
    )
  });
}

if (!/\/2\.7/.test(Cypress.env('rancher_version'))) {
  describe('Imagescan tests', { tags: '@p1'}, () => {
    qase(112,
      it("Fleet-112: Test imagescan app without expected semver range does not break fleet controller", { tags: '@fleet-112' }, () => {;
        const repoName = 'local-cluster-imagescan-112'
        const repoUrl = 'https://github.com/rancher/fleet-test-data'
        const branch = 'master'
        const path = 'imagescans'

        cy.fleetNamespaceToggle('fleet-local');
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
        cy.clickButton('Create');
        cy.verifyTableRow(0, 'Error', '1/1');
        cy.accesMenuSelection('local', 'Workloads');
        cy.nameSpaceMenuToggle('All Namespaces');
        cy.filterInSearchBox('fleet-controller');
        cy.verifyTableRow(0, 'Running', 'fleet-controller')
        cy.deleteAllFleetRepos();
      })
    )
  });
}


if (!/\/2\.7/.test(Cypress.env('rancher_version'))) {
  describe('OCI', { tags: '@p1'}, () => {
    qase(60,
      it("Fleet-60: Test OCI helm chart support on Github Container Registry", { tags: '@fleet-60' }, () => {;
        const repoName = 'default-oci-60'
        const repoUrl = 'https://github.com/rancher/fleet-test-data'
        const branch = 'master'
        const path = 'helm-oci'

        cy.fleetNamespaceToggle('fleet-default');
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
        cy.clickButton('Create');
        cy.verifyTableRow(0, 'Active', '1/1');
        cy.accesMenuSelection('local', 'Storage', 'ConfigMaps');
        cy.nameSpaceMenuToggle('All Namespaces');
        cy.filterInSearchBox('fleet-test-configmap');
        cy.get('.col-link-detail').contains('fleet-test-configmap').should('be.visible').click({ force: true });
        cy.get('section#data').should('contain', 'default-name').and('contain', 'value');
        cy.deleteAllFleetRepos();
      })
    )
  });
}

