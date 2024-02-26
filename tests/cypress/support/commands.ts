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
import * as cypressLib from '@rancher-ecp-qa/cypress-library';

// Generic commands

// Fleet commands

// Add path on "Git Repo:Create"
Cypress.Commands.add('addPathOnGitRepoCreate', (path) => {
  cy.clickButton('Add Path');
  cy.get('input[placeholder="e.g. /directory/in/your/repo"]').type(path);
})

Cypress.Commands.add('gitRepoAuth', (gitAuthType, userOrPublicKey, pwdOrPrivateKey) => {
  cy.contains('Git Authentication').click()
  // Select the Git auth method
  cy.get('div.option-kind-highlighted', { timeout: 15000 }).contains(gitAuthType, { matchCase: false }).should('be.visible').click();

  if (gitAuthType === 'http') {
    cy.typeValue('Username', userOrPublicKey);
    cy.typeValue('Password', pwdOrPrivateKey);
  }
  else if (gitAuthType === 'ssh') {
    // Ugly implementation needed because 'typeValue' does not work here
    cy.get('textarea.no-resize.no-ease').eq(0).focus().clear().type(userOrPublicKey);
    cy.get('textarea.no-resize.no-ease').eq(1).focus().clear().type(pwdOrPrivateKey);
  }
});


// Command add Fleet Git Repository
Cypress.Commands.add('addFleetGitRepo', ({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey }) => {
  cy.clickButton('Add Repository');
  cy.contains('Git Repo:').should('be.visible');
  cy.typeValue('Name', repoName);
  cy.typeValue('Repository URL', repoUrl);
  cy.typeValue('Branch Name', branch);
  // Path is not required wwhen git repo contains 1 application folder only.
  if (path) {
    cy.addPathOnGitRepoCreate(path);
  }
  if (gitAuthType) {
    cy.gitRepoAuth(gitAuthType, userOrPublicKey, pwdOrPrivateKey);
  }
  cy.clickButton('Next');
})

// 3 dots menu selection
Cypress.Commands.add('open3dotsMenu', (name, selection) => {
  // Open 3 dots button
  cy.contains('tr.main-row', name).within(() => {
    cy.get('.icon.icon-actions', { timeout: 5000 }).click();
  });
  if (selection) {
    // Open edit config and select option
    cy.get('.list-unstyled.menu > li > span', { timeout: 15000 }).contains(selection).should('be.visible');
    cy.get('.list-unstyled.menu > li > span', { timeout: 15000 }).contains(selection).click({ force: true });
    // Ensure dropdown is not present
    cy.contains('Edit Config').should('not.exist')
  }
});

// Verify textvalues in table giving the row number
// More items can be added with new ".and"
Cypress.Commands.add('verifyTableRow', (rowNumber, expectedText1, expectedText2) => {
  // Adding small wait to give time for things to settle a bit
  // Could not find a better way to wait, but can be improved
  cy.wait(1000)
  // Ensure table is loaded and visible
  cy.contains('tr.main-row[data-testid="sortable-table-0-row"]').should('not.be.empty', { timeout: 25000 });
  cy.get(`table > tbody > tr.main-row[data-testid="sortable-table-${rowNumber}-row"]`)
    .children({ timeout: 300000 })
    .should('contain', expectedText1 )
    .should('contain', expectedText2 ); // TODO: refactor this so it is not mandatory value
});

// Namespace Toggle
Cypress.Commands.add('nameSpaceMenuToggle', (namespaceName) => {
  cy.get('.top > .ns-filter').should('be.visible');
  cy.get('.top > .ns-filter').click({ force: true });
  // Typing in filter for better targeting the namespece
  cy.get('div.ns-input').should('exist').type(namespaceName);
  cy.get('.ns-dropdown-menu', { timeout: 5000 }).contains(new RegExp("^" + namespaceName + "$", "g"), { matchCase: true }).should('be.visible').click();
  cy.get('.icon.icon-chevron-up').click({ force: true });
})

// Go to specific Continuous Delivery Sub Menu
Cypress.Commands.add('accesMenuSelection', (firstAccessMenu='Continuous Delivery',secondAccessMenu) => {
     cypressLib.burgerMenuToggle();
     cypressLib.accesMenu(firstAccessMenu);
     cypressLib.accesMenu(secondAccessMenu);
});

// Fleet namespace toggle
Cypress.Commands.add('fleetNamespaceToggle', (toggleOption='local') => {
  cy.contains('fleet-').click();
  cy.contains(toggleOption).should('be.visible').click();
});

// Command to delete all rows if check box and delete button are present
// Note: This function may be substituted by 'cypressLib.deleteAllResources' 
// when hardcoded texts present can be parameterized
Cypress.Commands.add('deleteAll', () => {
  cy.get('body').then(($body) => {
    if ($body.text().includes('Delete')) {
      cy.get('[width="30"] > .checkbox-outer-container.check').click();
      cy.get('.btn').contains('Delete').click({ctrlKey: true});
      cy.get('.btn').contains('Delete').should('not.exist');
    };
  });
});
