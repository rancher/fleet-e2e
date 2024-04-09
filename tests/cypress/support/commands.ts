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
    cy.typeValue('Username', userOrPublicKey, false,  false );
    cy.typeValue('Password', pwdOrPrivateKey, false,  false );
  }
  else if (gitAuthType === 'ssh') {
    // Ugly implementation needed because 'typeValue' does not work here
    cy.get('textarea.no-resize.no-ease').eq(0).focus().clear().type(userOrPublicKey, {log: false}).blur();
    cy.get('textarea.no-resize.no-ease').eq(1).focus().clear().type(userOrPublicKey, {log: false}).blur();
  }
});


// Command add Fleet Git Repository
Cypress.Commands.add('addFleetGitRepo', ({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey, keepResources }) => {
  cy.clickButton('Add Repository');
  cy.contains('Git Repo:').should('be.visible');
  cy.typeValue('Name', repoName);
  cy.typeValue('Repository URL', repoUrl);
  cy.typeValue('Branch Name', branch);
  // Path is not required when git repo contains 1 application folder only.
  if (path) {
    cy.addPathOnGitRepoCreate(path);
  }
  if (gitAuthType) {
    cy.gitRepoAuth(gitAuthType, userOrPublicKey, pwdOrPrivateKey);
  }
  // Check the checkbox of keepResources if option 'yes' is given.
  // After checked check-box, `keepResources: true` is set
  // in the GitRepo YAML.
  if (keepResources === 'yes') {
    cy.get('.checkbox-outer-container.check').contains('Always Keep Resources').click();
  }
  cy.clickButton('Next');
  cy.get('button.btn').contains('Previous').should('be.visible');
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
  cy.get('div.ns-input').should('exist').clear().type(namespaceName);
  cy.get('.ns-dropdown-menu', { timeout: 5000 }).contains(new RegExp("^" + namespaceName + "$", "g"), { matchCase: true }).should('be.visible').click();
  cy.get('div.ns-dropdown.ns-open > i.icon.icon-chevron-up').click({ force: true });
})

// Go to specific Sub Menu from Access Menu
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
Cypress.Commands.add('deleteAll', (fleetCheck=true) => {
  cy.get('body').then(($body) => {
    if ($body.text().includes('Delete')) {
      cy.get('[width="30"] > .checkbox-outer-container.check', { timeout: 50000 }).click();
      cy.get('.btn').contains('Delete').click({ctrlKey: true});
      cy.get('.btn', { timeout: 20000 }).contains('Delete').should('not.exist');
      if (fleetCheck === true) {
        cy.contains('No repositories have been added', { timeout: 20000 }).should('be.visible')
      } else {
        cy.contains('There are no rows to show.', { timeout: 20000 }).should('be.visible')
      }
    };
  });
});

// Command to delete all repos pressent in Fleet local and default
Cypress.Commands.add('deleteAllFleetRepos', () => {
  cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
  cy.fleetNamespaceToggle('fleet-local')
  cy.deleteAll();
  cy.fleetNamespaceToggle('fleet-default')
  cy.deleteAll();
});

// Check Git repo deployment status
Cypress.Commands.add('checkGitRepoStatus', (repoName, bundles, resources) => {
  cy.verifyTableRow(0, 'Active', repoName);
  cy.contains(repoName).click()
  cy.get('.primaryheader > h1').contains(repoName).should('be.visible')
  cy.log(`Checking ${bundles} Bundles and ${resources} Resources`)
  if (bundles) {
    cy.get('div.fleet-status', { timeout: 30000 }).eq(0).contains(` ${bundles} Bundles ready `, { timeout: 30000 }).should('be.visible')
  }
  if (resources) {
    cy.get('div.fleet-status', { timeout: 30000 }).eq(1).contains(` ${resources} Resources ready `, { timeout: 30000 }).should('be.visible')
  }
});

// Check deployed application status (present or not)
Cypress.Commands.add('checkApplicationStatus', (appName, clusterName='local') => {
  cypressLib.burgerMenuToggle();
  cypressLib.accesMenu(clusterName);
  cy.clickNavMenu(['Workloads', 'Pods']);
  cy.contains('tr.main-row[data-testid="sortable-table-0-row"]').should('not.be.empty', { timeout: 25000 });
  cy.get(`table > tbody > tr.main-row[data-testid="sortable-table-0-row"]`)
    .children({ timeout: 300000 })
    .should('contain.text', appName);
});

// Delete the leftover applications
Cypress.Commands.add('deleteApplicationDeployment', (clusterName='local') => {
  cypressLib.burgerMenuToggle();
  cypressLib.accesMenu(clusterName);
  cy.clickNavMenu(['Workloads', 'Deployments']);
  // For certain reason deleteAll() is not working
  // TODO: Investigate and fix it.
  cy.deleteAllResources();
});
