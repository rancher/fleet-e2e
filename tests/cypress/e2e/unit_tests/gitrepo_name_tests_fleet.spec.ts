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
describe('Test Fleet GitRepo naming conventions', () => {
  qase(61,
    it('FLEET-61: Test GitRepo name is compliant with the Kubernetes object naming convention.', () => {
      const incorrectRepoName = "Test.1-repo-local-cluster"
      const correctRepoName = "test-1-repo"
      const branch = "master"
      const path = "simple-chart"
      const repoUrl = "https://github.com/rancher/fleet-test-data/"

      // Click on the Continuous Delivery's icon
      cypressLib.accesMenu('Continuous Delivery');
      cypressLib.accesMenu('Git Repos');

      // Change namespace to fleet-local
      cy.fleetNamespaceToggle('fleet-local')

      // Add Fleet repository and create it
      cy.addFleetGitRepo({ repoName: incorrectRepoName, repoUrl, branch, path });
      cy.clickButton('Create');

      // Assert errorMessage exists
      cy.get('[data-testid="banner-content"] > span')
        .should('contain', incorrectRepoName)
        .should('contain', 'RFC 1123');

      // Navigate back to GitRepo page
      cy.clickButton('Cancel')
      cy.contains('No repositories have been added').should('be.visible')

      // Add/Verify Fleet repository created and has deployed resources
      cy.addFleetGitRepo({ repoName: correctRepoName, repoUrl, branch, path });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(correctRepoName, '1 / 1', '1 / 1')

      // Deletes created all repository
      cy.deleteAllFleetRepos();
    })
  )
});
