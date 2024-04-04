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

// In this file you can write your custom commands and overwrite existing commands.

import 'cypress-file-upload';
import '~/support/commands';

// PO tests cases
Cypress.Commands.add('runPrivateRepoTests', (qase_id, testName) => {
    const repoName = `default-cluster-fleet-${qase_id}`
    const branch = "main"
    const gitAuthType = "http"

    cy.fleetNamespaceToggle('fleet-local')
    
    switch (qase_id) {
        case 6:
            cy.addFleetGitRepo({ repoName, repoUrl: "https://gitlab.com/qa1613907/gitlab-test-fleet.git", branch, path: "test-fleet-main/nginx", gitAuthType, userOrPublicKey: Cypress.env("gitlab_private_user"), pwdOrPrivateKey: Cypress.env("gitlab_private_pwd") });
            break;
        case 7:
            cy.addFleetGitRepo({ repoName, repoUrl: "https://bitbucket.org/fleet-test-bitbucket/bitbucket-fleet-test", branch, path: "test-fleet-main/nginx", gitAuthType, userOrPublicKey: Cypress.env("bitbucket_private_user"), pwdOrPrivateKey: Cypress.env("bitbucket_private_pwd") });
            break;
        case 8:
            cy.addFleetGitRepo({ repoName, repoUrl: "https://github.com/mmartinsuse/test-fleet" , branch, path: "nginx", gitAuthType, userOrPublicKey: Cypress.env("gh_private_user"), pwdOrPrivateKey: Cypress.env("gh_private_pwd") });
            break;
        case 9:
            cy.addFleetGitRepo({ repoName, repoUrl: "https://dev.azure.com/mamartin0216/_git/mamartin", branch, path: "nginx-helm", gitAuthType, userOrPublicKey: Cypress.env("azure_private_user") , pwdOrPrivateKey: Cypress.env("azure_private_pwd") });
    }
    
    cy.clickButton("Create");
    cy.open3dotsMenu(repoName, "Force Update");
    cy.checkGitRepoStatus(repoName, "1 / 1", "1 / 1");
    cy.deleteAllFleetRepos();

});

