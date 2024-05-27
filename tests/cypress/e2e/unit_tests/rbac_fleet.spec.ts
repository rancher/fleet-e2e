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
describe('Test Fleet access with RBAC with custom roles', { tags: '@rbac' }, () => {

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
        resources: [
          { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(baseUser, "fleetAllVerbsRole");
      
      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(baseUser, uiPassword);

      // What the user should be able to access
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.wait(500)
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspaces');
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Bundles');
      
      // What the user should NOT be able to access
      cy.accesMenuSelection('Continuous Delivery');
      cy.contains('Clusters').should('not.exist');
      cy.contains('Clusters Groups').should('not.exist');
    })
  )

  qase(43,
    it('Test "Std-Base" user with custom role "list" and "create" to "fleetworkspaces" can list and create workspaces but NOT  "edit" nor "delete" them', { tags: '@fleet-43' }, () => {
      
      const stduser = "std-user-43"
      const customRoleName = "fleetListAndCreateRole"

      //  Create "Standard User"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(stduser, uiPassword);
      
      cy.createRoleTemplate({
        roleType: "Global",
        roleName: customRoleName,
        resources: [
          { resource: "fleetworkspaces", verbs: ["list", "create"]},
          { resource: "gitrepos", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName)

      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // What the user should be able to access
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.wait(500)
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Bundles');
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspaces');
      cy.verifyTableRow(0, 'Active', 'fleet-default');
      cy.verifyTableRow(1, 'Active', 'fleet-local');
      cy.get('a.btn.role-primary').contains('Create').should('be.visible');
      
      // What the user should NOT be able to access
      cy.open3dotsMenu('fleet-default', 'Delete', true);
      cy.open3dotsMenu('fleet-default', 'Edit Config', true);
    })
  )

  qase(44,
    it('Test "Std-Base" user with custom roles to "fleetworkspaces" all verbs except "Delete can "edit" but not "delete" them', { tags: '@fleet-44' }, () => {
      
      const stduser = "std-user-44"
      const customRoleName = "fleetAllExceptDeleteFleetWorkspaces"

      // Create "Standard User"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(stduser, uiPassword);

      cy.createRoleTemplate({
        roleType: "Global",
        roleName: customRoleName,
        resources: [
          { resource: "fleetworkspaces", verbs: ["create", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName)
      
      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // What the user should be able to access
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.wait(1000)
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Bundles');
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspace');
      cy.get('a.btn.role-primary').contains('Create').should('be.visible');
      cy.verifyTableRow(0, 'Active', 'fleet-default');
      cy.verifyTableRow(1, 'Active', 'fleet-local');
      cy.open3dotsMenu('fleet-default', 'Edit Config');
      
      // What the user should NOT be able to access (once in Fleet Workspace menu)
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspace');
      cy.open3dotsMenu('fleet-default', 'Delete', true);
    })
  )

});
