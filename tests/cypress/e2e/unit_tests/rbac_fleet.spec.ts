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

import 'cypress/support/commands';
import * as cypressLib from '@rancher-ecp-qa/cypress-library';
import { qase } from 'cypress-qase-reporter/dist/mocha';

beforeEach(() => {
  cy.login();
  cy.visit('/');
});

Cypress.config();
describe('Test Fleet access with RBAC with custom roles', () => {

  const baseUser      = "base-user"
  const uiPassword    = "rancherpassword"

  qase(5,
    it('Test "User-Base" user with custom role to "fleetworkspaces", "gitrepos" and "bundles" and  ALL verbs access can access "Workspaces", "Bundles" and "Git Repos" but not to "Clusters" and "Clusters Groups"', { tags: '@fleet-5' }, () => {

      // Create User "User-Base"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(baseUser, uiPassword, "User-Base", true);

      // Create role
      cy.createRoleTemplate({
        roleType: "Global",
        roleName: "fleetAllVerbsRole",
        newUserDefault: "Yes",
        resources: ["fleetworkspaces", "gitrepos", "bundles"],
        verbs: ["create", "delete", "get", "list", "patch", "update", "watch"],
        apiGroups: ["*"],
        nonResourcesURLs: ["*"]
      });

      // Assign role ti created user
      cy.assignRoleToUser(baseUser, "fleetAllVerbsRole");
      
      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(baseUser, uiPassword);

      // What the user should be able to access
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspaces');
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Bundles');

      // What the user should NOT be able to access
      cy.accesMenuSelection('Continuous Delivery');
      cy.contains('Clusters').should('not.exist');
      cy.contains('Clusters Groups').should('not.exist');
    })
  )

});
