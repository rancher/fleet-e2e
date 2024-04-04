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
 
  const branch = "main"
  const gitAuthType = "http"
  const repoNameGitlab = `default-cluster-fleet-6`
  const repoNameBitbucket = `default-cluster-fleet-7`
  const repoNameGithub = `default-cluster-fleet-8`
  const repoNameAzure = `default-cluster-fleet-98` 
  const repoUrlGitlab = "https://gitlab.com/qa1613907/gitlab-test-fleet.git"
  const repoUrlBitbucket = "https://bitbucket.org/fleet-test-bitbucket/bitbucket-fleet-test"
  const repoUrlGithub = "https://github.com/mmartinsuse/test-fleet"
  const repoUrlAzure = "https://dev.azure.com/mamartin0216/_git/mamartin"
  const pathGitlab = "test-fleet-main/nginx"
  const pathBitbucket = "test-fleet-main/nginx"
  const pathGithub = "nginx"
  const pathAzure = "nginx-helm"
  const userOrPublicKeyGitlab = Cypress.env("gitlab_private_user")
  const pwdOrPrivateKeyGitlab = Cypress.env("gitlab_private_pwd")
  const userOrPublicKeyBitbucket = Cypress.env("bitbucket_private_user")
  const pwdOrPrivateKeyBitbucket = Cypress.env("bitbucket_private_pwd")
  const userOrPublicKeyGithub = Cypress.env("gh_private_user")
  const pwdOrPrivateKeyGithub = Cypress.env("gh_private_pwd")
  const userOrPublicKeyAzure = Cypress.env("azure_private_user")
  const pwdOrPrivateKeyAzure = Cypress.env("azure_private_pwd")

  
  qase(6,
    it('FLEET-6: Test GITLAB Private Repository to install NGINX app using HTTP auth', { retries: 1 , tags: '@fleet-6' }, () => {
      // Looping 2 times due to error on 2.8-head
      for (let i = 0; i < 2; i++) {
        cy.fleetNamespaceToggle('fleet-local')
        cy.addFleetGitRepo({ repoName: repoNameGitlab, repoUrl: repoUrlGitlab, branch, path: pathGitlab, gitAuthType, userOrPublicKey: userOrPublicKeyGitlab, pwdOrPrivateKey: pwdOrPrivateKeyGitlab });
        cy.clickButton('Create');
        cy.open3dotsMenu({repoName: repoNameGitlab} , 'Force Update');
        cy.checkGitRepoStatus({repoName: repoNameGitlab}, '1 / 1', '1 / 1')
        cy.deleteAllFleetRepos();
      }
    })
  );

  qase(7,
    it('FLEET-7: Test BITBUCKET Private Repository to install NGINX app using HTTP auth', { tags: '@fleet-7' }, () => {
      cy.fleetNamespaceToggle('fleet-local')
      cy.addFleetGitRepo({ repoName: repoNameBitbucket, repoUrl: repoUrlBitbucket , branch, path: pathBitbucket , gitAuthType, userOrPublicKey: userOrPublicKeyBitbucket, pwdOrPrivateKey: pwdOrPrivateKeyBitbucket });
      cy.clickButton('Create');
      cy.open3dotsMenu({repoName: repoNameBitbucket}, 'Force Update');
      cy.checkGitRepoStatus({repoName: repoNameBitbucket}, '1 / 1', '1 / 1')
      cy.deleteAllFleetRepos();
    })
  );

  qase(8,
    it('FLEET-8: Test GITHUB Private Repository to install NGINX app using HTTP auth', { tags: '@fleet-8' }, () => {
      cy.fleetNamespaceToggle('fleet-local')
      cy.addFleetGitRepo({ repoName: repoNameGithub, repoUrl: repoUrlGithub , branch, path: pathGithub , gitAuthType, userOrPublicKey: userOrPublicKeyGithub , pwdOrPrivateKey: pwdOrPrivateKeyGithub });;
      cy.clickButton('Create');
      cy.open3dotsMenu({repoName: repoNameGithub}, 'Force Update');
      cy.checkGitRepoStatus({repoName: repoNameGithub}, '1 / 1', '1 / 1')
      cy.deleteAllFleetRepos();
    })
  );

  qase(98,
    it('FLEET-98: Test AZURE DEVOPS Private Repository to install NGINX app using HTTP auth', { tags: '@fleet-98' }, () => {
      cy.fleetNamespaceToggle('fleet-local')
      cy.addFleetGitRepo({ repoName: repoNameAzure, repoUrl: repoUrlAzure , branch, path: pathAzure , gitAuthType, userOrPublicKey: userOrPublicKeyAzure, pwdOrPrivateKey: pwdOrPrivateKeyAzure });
      cy.clickButton('Create');
      cy.open3dotsMenu({repoName: repoNameAzure}, 'Force Update');
      cy.checkGitRepoStatus({repoName: repoNameAzure}, '1 / 1', '1 / 1')
      cy.deleteAllFleetRepos();
    })
  );
});


