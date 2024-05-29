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
  const roleTypeTemplate = "Global"


  const rbacTestData: testData[] = [
    { 
      qase_id: 5,
      test_explanation: 'NOT "Clusters" NOR "Clusters Groups"',
      defaultBaseRole: "User-Base",
    },
    {
      qase_id: 42,
      test_explanation: 'NOT "Cluster Registration Tokens" "BundleNamespaceMappings" and "GitRepoRestrictions"',
      defaultBaseRole: "Standard User",
    }
  ]

  rbacTestData.forEach(
    ({qase_id, test_explanation, defaultBaseRole}) => {
      qase(`${qase_id}`,
      it(`Test ${defaultBaseRole} role user with custom role to "fleetworkspaces", "gitrepos" and "bundles" and  ALL verbs access CAN access "Workspaces", "Bundles" and "Git Repos" but ${test_explanation}`, { tags: `@fleet-${qase_id}` }, () => {
        const customRoleName = "fleetworkspaces-bundles-gitrepos-all-verbs-role"

        // Create User "User-Base"
        cypressLib.burgerMenuToggle();
        cypressLib.createUser(baseUser, uiPassword, defaultBaseRole, true);

        cy.createRoleTemplate({
          roleType: roleTypeTemplate,
          roleName: customRoleName,
          rules: [
            { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
            { resource: "gitrepos", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
            { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          ]
        });

        // Assign role to the created user
        cy.assignRoleToUser(baseUser, customRoleName);

        // Logout as admin and login as other user
        cypressLib.logout();
        cy.login(baseUser, uiPassword);

        // Ensuring the user IS able to "go to Continuous Delivery", "list" and "delete" workspaces.
        cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
        cy.wait(500);
        cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspaces');
        cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Bundles');

        // Ensuring user cannot access Clusters nor Clusters Groups
        cy.accesMenuSelection('Continuous Delivery');
        cy.contains('Clusters').should('not.exist');
        cy.contains('Clusters Groups').should('not.exist');

        // FLEET-42 test cases extra check.
        if (qase_id === 42) {
          cy.accesMenuSelection('Continuous Delivery', 'Advanced');
          cy.contains('Cluster Registration Tokens').should('not.exist');
          cy.contains('GitRepoRestrictions').should('not.exist');
          cy.contains('BundleNamespaceMappings').should('not.exist');
        }
        // Logout other user and login as admin user to perform user and role cleanup
        cypressLib.logout();
        cy.login();
        cy.deleteUser(baseUser);
        cy.deleteRole(customRoleName, roleTypeTemplate.toUpperCase());
      })
    )
    }
  )

  qase(43,
    it('Test "Standard Base" role user with "list" and "create" verbs for "fleetworkspaces" resource. User can NOT "edit" nor "delete" them', { tags: '@fleet-43' }, () => {
      
      const stduser = "std-user-43"
      const customRoleName = "fleetworkspaces-list-and-create-role"

      //  Create "Standard User"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(stduser, uiPassword);
      
      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName,
        rules: [
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

      // Ensuring the user IS able to "go to Continuous Delivery",
      //"go to Bundles" and "list" and "create" workspaces.
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.wait(500)
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Bundles');
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspaces');
      cy.verifyTableRow(0, 'Active', 'fleet-default');
      cy.verifyTableRow(1, 'Active', 'fleet-local');
      cy.get('a.btn.role-primary').contains('Create').should('be.visible');
      
      // Ensuring the user is not able to "edit" or "delete" workspaces.
      cy.open3dotsMenu('fleet-default', 'Delete', true);
      cy.open3dotsMenu('fleet-default', 'Edit Config', true);

      // Logout other user and login as admin user to perform user and role cleanup
      cypressLib.logout();
      cy.login();
      cy.deleteUser(stduser);
      cy.deleteRole(customRoleName, roleTypeTemplate.toUpperCase());
    })
  )

  qase(44,
    it('Test "Standard Base" role with custom role to "fleetworkspaces" with all verbs except "delete" can "edit" but can NOT "delete" them', { tags: '@fleet-44' }, () => {
      
      const stduser = "std-user-44"
      const customRoleName = "fleetworskspaces-all-but-delete-role"

      // Create "Standard User"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(stduser, uiPassword);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName)

      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // Ensuring the user IS able  to "list", "edit" and "create" workspaces.
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.wait(1000)
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Bundles');
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspace');
      cy.get('a.btn.role-primary').contains('Create').should('be.visible');
      cy.verifyTableRow(0, 'Active', 'fleet-default');
      cy.verifyTableRow(1, 'Active', 'fleet-local');
      cy.open3dotsMenu('fleet-default', 'Edit Config');
      cy.contains('allowedTargetNamespaces').should('be.visible');
      
      // Ensuring the user is not able to "delete" workspaces. 
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspace');
      cy.open3dotsMenu('fleet-default', 'Delete', true);

      // Logout other user and login as admin user to perform user and role cleanup
      cypressLib.logout();
      cy.login();
      cy.deleteUser(stduser);
      cy.deleteRole(customRoleName, roleTypeTemplate.toUpperCase());
    })
  )

  qase(45,
    it('Test "Standard-Base" role user with RESOURCE "fleetworkspaces" with ACTIONS "List", "Delete" can "list and delete" but can NOT "edit" them', { tags: '@fleet-45' }, () => {
      
      const stduser = "std-user-45"
      const customRoleName = "fleetworkspaces-list-and-delete-role"

      // Create "Standard User"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(stduser, uiPassword);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName,
        rules: [
          { resource: "fleetworkspaces", verbs: ["list", "delete"]},
          { resource: "gitrepos", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName)
      
      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // Ensuring the user IS able to "go to Continuous Delivery", "list" and "delete" workspaces.
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspace');
      cy.verifyTableRow(0, 'Active', 'fleet-default');
      cy.verifyTableRow(1, 'Active', 'fleet-local');
      cy.contains('Delete').should('be.visible');
    
      // Ensuring the user is NOT able to "edit" workspaces. 
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspace');
      cy.open3dotsMenu('fleet-default', 'Edit Config', true);

      // Logout other user and login as admin user to perform user and role cleanup
      cypressLib.logout();
      cy.login();
      cy.deleteUser(stduser);
      cy.deleteRole(customRoleName, roleTypeTemplate.toUpperCase());
    })
  )

});
