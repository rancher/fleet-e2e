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

export const uiPassword    = "rancherpassword"
export const roleTypeTemplate = "Global"

beforeEach(() => {
  cy.login();
  cy.visit('/');
});

Cypress.config();
describe('Test Fleet access with RBAC with custom roles using all verbs for User-Base and Standard User.', { tags: '@rbac' }, () => {

  qase(5,
    it('Test "User-Base" role user with custom role to "fleetworkspaces", "gitrepos" and "bundles" and  ALL verbs access CAN access "Workspaces", "Bundles" and "Git Repos" but NOT "Clusters" NOR "Clusters Groups"', { tags: '@fleet-5' }, () => {

      const baseUser      = "base-user"
      const customRoleName = "fleetworkspaces-bundles-gitrepos-all-verbs-role"
      // Create 'base-user' User using "User-Base"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(baseUser, uiPassword, "User-Base", true);

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

      // Ensuring the user IS able to access "Continuous Delivery" and
      // sub menu "GitRepo", "FleetWorkspaces" and "Bundles".
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.wait(500);
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspaces');
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Bundles');

      // Ensuring user cannot access Clusters nor Clusters Groups
      cy.accesMenuSelection('Continuous Delivery');
      cy.contains('Clusters').should('not.exist');
      cy.contains('Clusters Groups').should('not.exist');

      // Logout other user and login as admin user to perform user and role cleanup
      cypressLib.logout();
      cy.login();
      cy.deleteUser(baseUser);
      cy.deleteRole(customRoleName, roleTypeTemplate.toUpperCase());
    })
  )

});

describe('Test Fleet access with RBAC with custom roles using Standard User', { tags: '@rbac' }, () => {
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

  qase(42,
    it('Test "Standard User" role user with custom role to "fleetworkspaces", "gitrepos" and "bundles" and  ALL verbs access CAN access "Workspaces", "Bundles" and "Git Repos" but NOT "Cluster Registration Tokens" "BundleNamespaceMappings" and "GitRepoRestrictions"', { tags: '@fleet-42' }, () => {

      const baseUser      = "base-user"
      const customRoleName = "fleetworkspaces-bundles-gitrepos-all-verbs-role"

      // Create 'base-user' User using "Standard User"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(baseUser, uiPassword, "Standard User", true);

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

      // Ensuring the user IS able to access "Continuous Delivery" and
      // sub-menu "GitRepo", "FleetWorkspaces" and "Bundles".
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.wait(500);
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Workspaces');
      cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'Bundles');

      // Ensuring user is not able to access "Cluster Registration Tokens",
      // "GitRepoRestrictions', "BundleNamespaceMappings".
      cy.accesMenuSelection('Continuous Delivery', 'Advanced');
      cy.contains('Cluster Registration Tokens').should('not.exist');
      cy.contains('GitRepoRestrictions').should('not.exist');
      cy.contains('BundleNamespaceMappings').should('not.exist');

      // Logout other user and login as admin user to perform user and role cleanup
      cypressLib.logout();
      cy.login();
      cy.deleteUser(baseUser);
      cy.deleteRole(customRoleName, roleTypeTemplate.toUpperCase());
    })
  )
});

describe('Test Fleet access with RBAC with custom roles and git repos using Standard User', { tags: '@rbac' }, () => {

  const repoName = "fleet-local-simple-chart"
  const branch = "master"
  const path = "simple-chart"
  const repoUrl = "https://github.com/rancher/fleet-test-data"
  const repoNameDefault = "fleet-default-nginx"
  const pathDefault = "qa-test-apps/nginx-app"
  
  before(() => {
    cy.login();
    // Create git repos
    cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
    cy.fleetNamespaceToggle('fleet-local');
    cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
    cy.clickButton('Create');
    cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

    cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
    cy.fleetNamespaceToggle('fleet-default');
    cy.addFleetGitRepo({ repoName: repoNameDefault, repoUrl, branch, path: pathDefault });
    cy.clickButton('Create');
    cy.checkGitRepoStatus(repoNameDefault, '1 / 1', '1 / 1');
  })

  after(() => {
    cy.login();
    cy.deleteAllFleetRepos();
  })

  qase(46,
    it('Test "Standard-Base" role user with RESOURCE "fleetworkspaces" and "bundles" with all verbs and "gitrepos" with  "List" only', { tags: '@fleet-46' }, () => {
      
      const stduser = "std-user-46"
      const customRoleName = "gitrepo-list-fleetworkspaces-bundles-all-role"
      
      // Create "Standard User"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(stduser, uiPassword);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["list"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName)
      
      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // Ensuring the user IS able go to Continuous Delivery  Dashboard and "list" girepos
      cy.accesMenuSelection('Continuous Delivery', 'Dashboard');
      cy.get("div[data-testid='collapsible-card-fleet-local']").contains(repoName).should('be.visible');
      cy.get("div[data-testid='collapsible-card-fleet-default']").contains(repoNameDefault).should('be.visible');
      
      // Ensuring the user is NOT able to "create", "edit" nor "delete" Git Repos. 
      // both in default and local gitrepos
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.get('.btn.role-primary').contains('Add Repository').should('not.exist');
      // Ensures list is possible but not edit or deletion
      cy.open3dotsMenu(repoNameDefault, 'Edit Config', true);
      cy.open3dotsMenu(repoNameDefault, 'Delete', true);
      // Now checking in local one
      cy.fleetNamespaceToggle('fleet-local');
      cy.open3dotsMenu(repoName, 'Edit Config', true);
      cy.open3dotsMenu(repoName, 'Delete', true);

    })
  )

  qase(47,
    it('Test "Standard-Base" role user with RESOURCE "fleetworkspaces" and "bundles" with all verbs and "gitrepos" with  "List, Create" only', { tags: '@fleet-47' }, () => {
      
      const stduser = "std-user-47"
      const customRoleName = "gitrepo-list-create-fleetworkspaces-bundles-all-role"
      
      // Create "Standard User"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(stduser, uiPassword);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["list", "create"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName)
      
      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // Ensuring the user IS able go to Continuous Delivery Dashboard and "list" girepos
      cy.accesMenuSelection('Continuous Delivery', 'Dashboard');
      cy.get("div[data-testid='collapsible-card-fleet-local']").contains(repoName).should('be.visible');
      cy.get("div[data-testid='collapsible-card-fleet-default']").contains(repoNameDefault).should('be.visible');
      // Able to create Git Repo
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.clickButton('Add Repository');
      cy.contains('Git Repo:').should('be.visible');

      // Ensuring the user is NOT able to "edit" nor "delete" Git Repos. 
      // both in default and local gitrepos
      // Ensures list is possible but not edit or deletion
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.open3dotsMenu(repoNameDefault, 'Edit Config', true);
      cy.open3dotsMenu(repoNameDefault, 'Delete', true);
      // Now checking in local one
      cy.fleetNamespaceToggle('fleet-local');
      cy.open3dotsMenu(repoName, 'Edit Config', true);
      cy.open3dotsMenu(repoName, 'Delete', true);

    })
  )

  qase(48,
    it('Test "Standard-Base" role user with RESOURCE "fleetworkspaces" and "bundles" with all verbs and "gitrepos" with  "List, Create" only', { tags: '@fleet-48' }, () => {
      
      const stduser = "std-user-48"
      const customRoleName = "gitrepo-list-create-update-get-fleetworkspaces-bundles-all-role"
      
      // Create "Standard User"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(stduser, uiPassword);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["list", "create", "update", "get"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName)

      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // Ensuring the user IS able go to Continuous Delivery Dashboard and "list" girepos
      cy.accesMenuSelection('Continuous Delivery', 'Dashboard');
      cy.get("div[data-testid='collapsible-card-fleet-local']").contains(repoName).should('be.visible');
      cy.get("div[data-testid='collapsible-card-fleet-default']").contains(repoNameDefault).should('be.visible');
      // Able to create Git Repo
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.clickButton('Add Repository');
      cy.contains('Git Repo:').should('be.visible');
      cy.clickButton('Cancel');
      cy.open3dotsMenu(repoNameDefault, 'Edit Config');

      // Ensuring the user is NOT able to "delete" Git Repos. 
      // both in default and local gitrepos
      // Ensures list is possible but not edit or deletion
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.open3dotsMenu(repoNameDefault, 'Delete', true);
      // Now checking in local one
      cy.fleetNamespaceToggle('fleet-local');
      cy.open3dotsMenu(repoName, 'Delete', true);
      // Able to edit config in local
      cy.open3dotsMenu(repoName, 'Edit Config');
    })
  )

  qase(50,
    it('Test "Standard-Base" role user with RESOURCE "fleetworkspaces" and "bundles" with all verbs and "gitrepos" with  "List, Delete" only', { tags: '@fleet-50' }, () => {
      
      const stduser = "std-user-50"
      const customRoleName = "gitrepo-list-delete-fleetworkspaces-bundles-all-role"
      
      // Create "Standard User"
      cypressLib.burgerMenuToggle();
      cypressLib.createUser(stduser, uiPassword);

      cy.createRoleTemplate({
        roleType: roleTypeTemplate,
        roleName: customRoleName,
        rules: [
          { resource: "fleetworkspaces", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
          { resource: "gitrepos", verbs: ["list", "delete"]},
          { resource: "bundles", verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]},
        ]
      });

      // Assign role to the created user
      cy.assignRoleToUser(stduser, customRoleName)

      // Logout as admin and login as other user
      cypressLib.logout();
      cy.login(stduser, uiPassword);

      // Ensuring the user IS able go to Continuous Delivery Dashboard and "list" girepos
      cy.accesMenuSelection('Continuous Delivery', 'Dashboard');
      cy.get("div[data-testid='collapsible-card-fleet-local']").contains(repoName).should('be.visible');
      cy.get("div[data-testid='collapsible-card-fleet-default']").contains(repoNameDefault).should('be.visible');
                 
      // Can't "Create" repos    
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.get('.btn.role-primary').contains('Add Repository').should('not.exist');
      // Cant't "Edit"
      cy.open3dotsMenu(repoNameDefault, 'Edit Config', true);
      // CAN "Delete"
      cy.open3dotsMenu(repoNameDefault, 'Delete');
      cy.clickButton('Cancel');

      // Now checking in local one
      cy.fleetNamespaceToggle('fleet-local');
      // Cant't "Edit"
      cy.log('Cant Edit')
      cy.open3dotsMenu(repoName, 'Edit Config', true);
      // CAN "Delete"
      cy.log('Can Delete')
      cy.open3dotsMenu(repoName, 'Delete');
      cy.clickButton('Cancel');
      
    })
  )
});
