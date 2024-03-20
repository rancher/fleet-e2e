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
describe('Test GitRepo name (more than or less than) 47 characters and see bundle name trims it.', () => {
  const branch = "master"
  const path = "simple-chart"
  const repoUrl = "https://github.com/rancher/fleet-test-data/"
  const allRepoNames = new Map([
    [103, "test-test-test-test-test-test-test-test-test-t"],
    [104, "test-test-test-test-test-test-test-test-test-test-test-test"],
    [106, "test-test-test-test-123-456-789-0--test-test-test-test"],
    [105, "Test.1-repo-local-cluster"],
    [61, "ryhhskh-123456789+-+abdhg%^/"],
  ]);
  allRepoNames.forEach(
    (repoName, qase_id) => {
      if ((qase_id === 105 || qase_id === 61)) {
        qase(qase_id,
          it(`Fleet-${qase_id}: Test GitRepo min or max supported characters and and not supported names (see QASE test case)`, () => {
            // Add Fleet repository and create it
            cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
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
          it(`Fleet-${qase_id}: Test GitRepo min or max supported characters and and not supported names (see QASE test case)`, () => {
            // Change namespace to fleet-local
            cy.fleetNamespaceToggle('fleet-local');

            // Add Fleet repository and create it
            cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
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
