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

import '~/support/commands';
import * as cypressLib from '@rancher-ecp-qa/cypress-library';
import { qase } from 'cypress-qase-reporter/dist/mocha';

beforeEach(() => {
  cy.login();
  cy.visit('/');
  cy.deleteAllFleetRepos();
});


Cypress.config();
describe('Test GitRepo Bundle name validation and max character trimming behavior in bundle', { tags: '@p1'}, () => {
  const branch = "master"
  const path = "simple-chart"
  const repoUrl = "https://github.com/rancher/fleet-test-data/"

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
            cy.deleteAllFleetRepos();
          })
        )
      }
    }
  )
});

describe('Test resource behavior after deleting GitRepo using keepResources option', () => {
  const repoName = "local-cluster-fleet-71"
  const branch = "master"
  const path = "qa-test-apps/nginx-app"
  const repoUrl = "https://github.com/rancher/fleet-test-data/"
  const appNamespace = 'nginx-keep'
  const appName = 'nginx-keep'
  const keepResourceData: testData[] = [
    { qase_id: 69,
      keepResources: 'true',
      test_description: 'RESOURCES will NOT be DELETED after GitRepo is deleted.',
    },
    { qase_id: 70,
      keepResources: 'false',
      test_explanation: 'RESOURCES will be DELETED after GitRepo is deleted.',
    },
  ]
  keepResourceData.forEach(
    ({ qase_id, keepResources, test_explanation}) => {
      qase(qase_id,
        it(`Test ${test_explanation}`, () => {
          cy.fleetNamespaceToggle('fleet-local')
          cy.addFleetGitRepo({ repoName, repoUrl, branch, path, keepResources });
          cy.clickButton('Create');
          cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
          cy.deleteAllFleetRepos();
          if (keepResources === 'true') {
            cy.checkApplicationStatus(appNamespace, appName);
            cy.deleteApplicationDeployment(appNamespace);
          }
        })
      )
    }
  )
});
