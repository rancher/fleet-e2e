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
import { qase } from 'cypress-qase-reporter/dist/mocha';

beforeEach(() => {
  cy.login();
  cy.visit('/');
  cy.deleteAllFleetRepos();
});


Cypress.config();
describe('Test Fleet deployment on PUBLIC repos', { tags: '@p3' }, () => {
  qase(62,
    it('FLEET-62: Deploy application to local cluster', { tags: '@fleet-62' }, () => {
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

describe('Test Fleet deployment on PRIVATE repos with HTTP auth', { tags: '@p3' }, () => {
  const branch = "main"
  const gitAuthType = "http"
  const repoTestData: testData[] = [
    { qase_id: 6, test: "GITLAB", repoName: "local-cluster-fleet-6", repoUrl: "https://gitlab.com/qa1613907/gitlab-test-fleet.git",
      path: "test-fleet-main/nginx", userOrPublicKey: Cypress.env("gitlab_private_user"), pwdOrPrivateKey: Cypress.env("gitlab_private_pwd") },
    { qase_id: 7, test: "BITBUCKET", repoName: "local-cluster-fleet-7", repoUrl: "https://bitbucket.org/fleet-test-bitbucket/bitbucket-fleet-test",
      path: "test-fleet-main/nginx", userOrPublicKey: Cypress.env("bitbucket_private_user"), pwdOrPrivateKey: Cypress.env("bitbucket_private_pwd") },
    { qase_id: 8, test: "GITHUB", repoName: "local-cluster-fleet-8", repoUrl: "https://github.com/mmartinsuse/test-fleet",
      path: "nginx", userOrPublicKey: Cypress.env("gh_private_user"), pwdOrPrivateKey: Cypress.env("gh_private_pwd") },
    { qase_id: 98, test: "AZURE", repoName: "local-cluster-fleet-98", repoUrl: "https://dev.azure.com/mamartin0216/_git/mamartin",
      path: "nginx-helm", userOrPublicKey: Cypress.env("azure_private_user"), pwdOrPrivateKey: Cypress.env("azure_private_pwd") },
  ]

  repoTestData.forEach(({ qase_id, test, path, repoName, repoUrl, userOrPublicKey, pwdOrPrivateKey }) => {
    qase(qase_id,
      it(`FLEET-${qase_id}: Test "${test}" PRIVATE repository to install "NGINX" app using "HTTP" auth`, { retries: 3, tags: `@fleet-${qase_id}` }, () => {
        if (test === "GITLAB") {
          // Running 2 times due to error on 2.8-head
          for (let i = 0; i < 2; i++) {
            cy.fleetNamespaceToggle('fleet-local')
            cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey });
            cy.clickButton('Create');
            cy.open3dotsMenu(repoName, 'Force Update');
            cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1')
            cy.deleteAllFleetRepos();
          }
        }
        // Just run test once
        else {
          cy.fleetNamespaceToggle('fleet-local')
          cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey });
          cy.clickButton('Create');
          cy.open3dotsMenu(repoName, 'Force Update');
          cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1')
          cy.deleteAllFleetRepos();
        }
      })
    );
  })
});

