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
describe('Fleet Deployment Test Cases',  { tags: '@p0' }, () => {
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

  qase(6,
    it('FLEET-6: Test GITLAB Private Repository to install NGINX app using HTTP auth', { retries: 1 , tags: '@fleet-6' }, () => {
      const repoName = "default-cluster-fleet-6"
      const branch = "main"
      const path = "test-fleet-main/nginx"
      const repoUrl = "https://gitlab.com/qa1613907/gitlab-test-fleet.git"
      const gitAuthType = "http"
      const userOrPublicKey = Cypress.env("gitlab_private_user");
      const pwdOrPrivateKey = Cypress.env("gitlab_private_pwd");

      // Looping 2 times due to error on 2.8-head
      for (let i = 0; i < 2; i++) {
        cy.fleetNamespaceToggle('fleet-default')
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey });
        cy.clickButton('Create');
        cy.open3dotsMenu(repoName, 'Force Update');
        cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1')
        cy.deleteAllFleetRepos();
      }
    })
  );

  qase(7,
    it('FLEET-7: Test BITBUCKET Private Repository to install NGINX app using HTTP auth', { tags: '@fleet-7' }, () => {
      const repoName = "default-cluster-fleet-7"
      const branch = "main"
      const path = "test-fleet-main/nginx"
      const repoUrl = "https://bitbucket.org/fleet-test-bitbucket/bitbucket-fleet-test"
      const gitAuthType = "http"
      const userOrPublicKey = Cypress.env("bitbucket_private_user");
      const pwdOrPrivateKey = Cypress.env("bitbucket_private_pwd");

      cy.fleetNamespaceToggle('fleet-default')
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey });
      cy.clickButton('Create');
      cy.open3dotsMenu(repoName, 'Force Update');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1')
      cy.deleteAllFleetRepos();
    })
  );

  qase(8,
    it('FLEET-8: Test GITHUB Private Repository to install NGINX app using HTTP auth', { tags: '@fleet-8' }, () => {
      const repoName = "default-cluster-fleet-8"
      const branch = "main"
      const path = "nginx"
      const repoUrl = "https://github.com/mmartinsuse/test-fleet"
      const gitAuthType = "http"
      const userOrPublicKey = Cypress.env("gh_private_user");
      const pwdOrPrivateKey = Cypress.env("gh_private_pwd");

      cy.fleetNamespaceToggle('fleet-default')
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey });
      cy.clickButton('Create');
      cy.open3dotsMenu(repoName, 'Force Update');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1')
      cy.deleteAllFleetRepos();
    })
  );

  qase(98,
    it('FLEET-98: Test AZURE DEVOPS Private Repository to install NGINX app using HTTP auth', { tags: '@fleet-98' }, () => {
      const repoName = "default-cluster-fleet-52"
      const branch = "main"
      const path = "nginx-helm"
      const repoUrl = "https://dev.azure.com/mamartin0216/_git/mamartin"
      const gitAuthType = "http"
      const userOrPublicKey = Cypress.env("azure_private_user");
      const pwdOrPrivateKey = Cypress.env("azure_private_pwd");

      cy.fleetNamespaceToggle('fleet-default')
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey });
      cy.clickButton('Create');
      cy.open3dotsMenu(repoName, 'Force Update');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1')
      cy.deleteAllFleetRepos();
    })
  );

  qase(2,
    it('FLEET-2: Test GITLAB Private Repository to install NGINX app using SSH auth', { tags: '@fleet-2' }, () => {
      const repoName = "default-cluster-fleet-2"
      const branch = "main"
      const path = "nginx"
      const repoUrl = "git@gitlab.com:fleetqa/fleet-qa-examples.git"
      const gitAuthType = "ssh"
      const userOrPublicKey = Cypress.env("rsa_private_key_qa")
      const pwdOrPrivateKey = Cypress.env("rsa_public_key_qa")
      
      cy.fleetNamespaceToggle('fleet-default')
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey });
      cy.clickButton('Create');
      cy.open3dotsMenu(repoName, 'Force Update');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1')
      cy.deleteAllFleetRepos();
    })
  );

  qase(3,
    it('FLEET-3: Test BITBUCKET Private Repository to install NGINX app using SSH auth', { tags: '@fleet-3' }, () => {
      const repoName = "default-cluster-fleet-3"
      const branch = "main"
      const path = "nginx"
      const repoUrl = "git@bitbucket.org:fleetqa-bb/fleet-qa-examples.git"
      const gitAuthType = "ssh"
      const userOrPublicKey = Cypress.env("rsa_private_key_qa")
      const pwdOrPrivateKey = Cypress.env("rsa_public_key_qa")
      
      cy.fleetNamespaceToggle('fleet-default')
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey });
      cy.clickButton('Create');
      cy.open3dotsMenu(repoName, 'Force Update');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1')
      cy.deleteAllFleetRepos();
    })
  );

  qase(4,
    it('FLEET-4: Test GITHUB Private Repository to install NGINX app using SSH auth', { tags: '@fleet-4' }, () => {
      const repoName = "default-cluster-fleet-4"
      const branch = "main"
      const path = "nginx"
      const repoUrl = "git@github.com:fleetqa/fleet-qa-examples.git"
      const gitAuthType = "ssh"
      const userOrPublicKey = Cypress.env("rsa_private_key_qa")
      const pwdOrPrivateKey = Cypress.env("rsa_public_key_qa")
      
      cy.fleetNamespaceToggle('fleet-default')
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey });
      cy.clickButton('Create');
      cy.open3dotsMenu(repoName, 'Force Update');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1')
      cy.deleteAllFleetRepos();
    })
  );

  qase(97,
    it('FLEET-97: Test AZURE Private Repository to install NGINX app using SSH auth', { tags: '@fleet-97' }, () => {
      const repoName = "default-cluster-fleet-97"
      const branch = "main"
      const path = "nginx"
      const repoUrl = "git@ssh.dev.azure.com:v3/fleetqateam/fleet-qa-examples/fleet-qa-examples"
      const gitAuthType = "ssh"
      const userOrPublicKey = Cypress.env("rsa_private_key_qa")
      const pwdOrPrivateKey = Cypress.env("rsa_public_key_qa")
      
      cy.fleetNamespaceToggle('fleet-default')
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey });
      cy.clickButton('Create');
      cy.open3dotsMenu(repoName, 'Force Update');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1')
      cy.deleteAllFleetRepos();
    })
  );


});

