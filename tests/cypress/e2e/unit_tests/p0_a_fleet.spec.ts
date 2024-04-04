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
import '~/support/test_details';
import { qase } from 'cypress-qase-reporter/dist/mocha';

beforeEach(() => {
  cy.login();
  cy.visit('/');
  cy.deleteAllFleetRepos();
});


Cypress.config();

describe('Test Fleet deployment on PUBLIC repos', { tags: '@p3' }, () => {
  qase(62,
    it.skip('FLEET-62: Deploy application to local cluster', { tags: '@fleet-62' }, () => {
      const repoName = "local-cluster-fleet-62"
      const branch = "master"
      const path = "simple"
      const repoUrl = "https://github.com/rancher/fleet-examples"

      cy.fleetNamespaceToggle('fleet-local')
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1', '6 / 6')
      cy.verifyTableRow(1, 'Service', 'frontend');
      cy.verifyTableRow(3, 'Service', 'redis-master');
      cy.verifyTableRow(5, 'Service', 'redis-slave');
      cy.deleteAllFleetRepos();
    })
  );
})

describe('Fleet Deployment Test Cases on PRIVATE repos',  { tags: '@p0' }, () => {

  qase(6,
    it('FLEET-6: Test GITLAB Private Repository to install NGINX app using HTTP auth', { retries: 1 , tags: '@fleet-6' }, () => {
      cy.runPrivateRepoTests(6);
    })
  );

  qase(7,
    it('FLEET-7: Test BITBUCKET Private Repository to install NGINX app using HTTP auth', { tags: '@fleet-7' }, () => {
      cy.runPrivateRepoTests(7);
    })
  );

  qase(8,
    it('FLEET-8: Test GITHUB Private Repository to install NGINX app using HTTP auth', { tags: '@fleet-8' }, () => {
      cy.runPrivateRepoTests(8);
    })
  );

  qase(98,
    it('FLEET-98: Test AZURE DEVOPS Private Repository to install NGINX app using HTTP auth', { tags: '@fleet-98' }, () => {
      cy.runPrivateRepoTests(98);
    })
  );

});

