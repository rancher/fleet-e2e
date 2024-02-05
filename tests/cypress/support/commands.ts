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

// Generic commands
// ////////////////

Cypress.Commands.overwrite('type', (originalFn, subject, text, options = {}) => {
  options.delay = 100;
  return originalFn(subject, text, options);
});

// Add a delay between command without using cy.wait()
// https://github.com/cypress-io/cypress/issues/249#issuecomment-443021084
const COMMAND_DELAY = 1000;

for (const command of ['visit', 'click', 'trigger', 'type', 'clear', 'reload', 'contains']) {
  Cypress.Commands.overwrite(command, (originalFn, ...args) => {
    const origVal = originalFn(...args);

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(origVal);
      }, COMMAND_DELAY);
    });
  });
};

// Fleet commands

// Add path on "Git Repo:Create"
Cypress.Commands.add('addPathOnGitRepoCreate', (path) => {
  cy.clickButton('Add Path');
  cy.get("input[data-testid='input-0'][placeholder='e.g. /directory/in/your/repo']").
    type(path);
})

// Command add Fleet Git Repository
Cypress.Commands.add('addFleetGitRepo', (repoName, repoUrl, branch, path) => {
  cy.clickButton('Add Repository');
  cy.typeValue('Name', repoName);
  cy.typeValue('Repository URL', repoUrl);
  cy.typeValue('Branch Name', branch);
  // Path is not required wwhen git repo contains 1 application folder only.
  if (path !== null) {
    cy.addPathOnGitRepoCreate(path);
  }
  cy.clickButton('Next');
})

// Verify  texvalues in table giving the row number
// More items can be added with new ".and"
Cypress.Commands.add('verifyTableRow', (rowNumber, expectedText1, expectedText2) => {
  // Ensure table is loaded and visible
  cy.contains('tr.main-row[data-testid="sortable-table-0-row"').should('not.be.empty', { timeout: 25000 });
  cy.get(`table > tbody > tr.main-row[data-testid="sortable-table-${rowNumber}-row"]`)
    .children()
    .should('contain', expectedText1, { timeout: 30000 })
    .and('contain', expectedText2, { timeout: 30000 });
});

// Namespace Toggle
Cypress.Commands.add('nameSpaceMenuToggle', (namespaceName) => {
  cy.get('.top > .ns-filter').should('be.visible');
  cy.get('.top > .ns-filter').click({ force: true });
  // Typing in filter for better targetting the namespece
  cy.get('div.ns-input').should('exist').type(namespaceName);
  cy.get('.ns-dropdown-menu', { timeout: 5000 }).contains(new RegExp("^" + namespaceName + "$", "g"), { matchCase: true }).should('be.visible').click();
  cy.get('.icon.icon-chevron-up').click({ force: true });
})

