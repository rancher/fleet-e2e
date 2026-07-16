/*
Copyright © 2023 - 2026 SUSE LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import 'cypress/support/commands';

export const appName = 'nginx-keep';
export const clusterName = 'imported-0';
export const branch = 'main';
export const path = 'nginx';
export const sshString = ['Public key and private key for SSH', 'Public key and private key for SSH authentication'];
export const rancherVersion = Cypress.expose('rancher_version');
export const supported_versions_212_and_above = [
  /^(prime|prime-optimus|prime-optimus-alpha|prime-alpha|prime-rc|alpha)\/2\.(1[2-9]|[2-9]\d+)(\..*)?$/,
  /^head\/2\.(1[2-9])$/,
];

beforeEach(() => {
  cy.login();
  cy.visit('/');
  cy.deleteAllFleetRepos();
});

describe('Test Fleet on AWS EC2 imported cluster', { tags: '@cloud_ds' }, () => {
  // Cloud downstream cluster provisioning
  it(qase(186, 'Import EC2 cluster into Rancher'), () => {
    const cloudProvider = 'Amazon';
    const credentialName = 'qa-fleet-ec2-cloud-cred';
    const clusterName = 'qa-fleet-ec2-cluster';
    const accessKey = Cypress.expose('aws_access_key_id');
    const secretKey = Cypress.expose('aws_secret_access_key');
    const region = 'eu-central-1';
    const subnetId = 'fleetqa-mmt-subnet-public1-eu-central-1a';
    const cloudInstance = 'Amazon EC2';

    cy.createCloudCredential(cloudProvider, credentialName, accessKey, secretKey, region);
    cy.createCloudCluster(cloudInstance, clusterName, subnetId);
  });

  it(qase(187, 'Add gitrepo and deploy app to EC2 cluster'), () => {
    const repoName = 'nginx-app';
    const repoUrl = 'https://github.com/rancher/fleet-test-data/';
    const branch = 'master';
    const path = 'qa-test-apps/nginx-app';

    cy.addFleetGitRepo({ repoName, repoUrl, branch, path, local: false });
    cy.clickButton('Create');
    cy.wait(45000); // Adding 45 seconds due to slow comunication and size of ec2 cluster
    cy.verifyTableRow(0, 'Active', '4/4'); // 4 clusters means gitrepo was deployed to ec2 cluster
  });

  it(qase(188, 'Delete EC2 cluster'), () => {
    const clusterName = 'qa-fleet-ec2-cluster';

    cy.deleteDownstreamCluster(clusterName, false);
  });
});

if (!/\/2\.11/.test(Cypress.expose('rancher_version')) && !/\/2\.12/.test(Cypress.expose('rancher_version'))) {
  describe('Agent Scheduling Customization', { tags: '@special_tests' }, () => {
    it(
      qase(200, 'FLEET-200: Test agent scheduling customization for PDB and PriorityClass'),
      { tags: '@fleet-200' },
      () => {
        // Go to the cluster and edit it as YAML
        cy.accesMenuSelection('Continuous Delivery', 'Clusters ');
        cy.fleetNamespaceToggle('fleet-local');
        cy.open3dotsMenu('local', 'Edit Config');
        cy.clickButton('Edit as YAML');

        // Append the agent scheduling customization
        cy.get('.CodeMirror')
          .should(($el) => {
            expect(($el[0] as any).CodeMirror.getValue()).to.include('kind: Cluster');
          })
          .then((codeMirrorElement) => {
            const cm = (codeMirrorElement[0] as any).CodeMirror;
            const currentYaml = cm.getValue();
            // prettier-ignore
            const snippet = `\
  agentSchedulingCustomization:
    priorityClass:
      value: 888
    podDisruptionBudget:
      minAvailable: "3"`;
            const newYaml = currentYaml.replace(/(\nspec:)/, `$1\n${snippet}`);
            expect(newYaml, 'snippet was actually inserted').to.not.eq(currentYaml);
            cm.setValue(newYaml);
          });
        cy.clickButton('Save');

        // Verify the cluster is still Active
        cy.verifyTableRow(0, 'Active', '1', 600000);

        // Verify PriorityClass and PodDisruptionBudget
        cy.accesMenuSelection('local', 'Policy', 'Pod Disruption Budgets');
        cy.nameSpaceMenuToggle('All Namespaces');
        cy.verifyTableRow(0, 'fleet-agent', '3');
        cy.accesMenuSelection('local', 'More Resources');
        // prettier-ignore
        cy.get('nav.side-nav').contains(/^Scheduling$/).scrollIntoView().click();
        cy.contains('PriorityClasses').click();
        cy.verifyTableRow(0, 'fleet-agent', '888');
      },
    );
  });
}

describe(
  'Test move cluster to newly created workspace and deploy application to it.',
  { tags: '@special_tests' },
  () => {
    it(
      qase(51, 'Fleet-51: Test move cluster to newly created workspace and deploy application to it.'),
      { tags: '@fleet-51' },
      () => {
        const dsFirstClusterName = 'imported-0';
        const repoName = 'default-cluster-new-workspace-51';
        const branch = 'master';
        const path = 'simple';
        const repoUrl = 'https://github.com/rancher/fleet-examples';
        const newWorkspaceName = 'new-fleet-workspace';
        const fleetDefault = 'fleet-default';
        let timeout = 30000;

        //Version check for 2.12 (head)
        if (supported_versions_212_and_above.some((r) => r.test(rancherVersion))) {
          timeout = 70000;
        }

        // Create new workspace.
        cy.createNewFleetWorkspace(newWorkspaceName);

        // Switch to 'fleet-default' workspace
        cy.continuousDeliveryMenuSelection();
        cy.fleetNamespaceToggle(fleetDefault);
        cy.clickNavMenu(['Clusters']);

        // Move first cluster i.e. 'imported-0' to newly created workspace.
        cy.moveClusterToWorkspace(dsFirstClusterName, newWorkspaceName, timeout);

        // Create a GitRepo targeting to cluster available in newly created workspace.
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
        cy.fleetNamespaceToggle(newWorkspaceName);
        cy.clickButton('Create');

        // Review below line after all tests passed.
        cy.checkGitRepoStatus(repoName, '1 / 1', '6 / 6');

        // Delete GitRepo
        // In Fleet Workspace, namespace name similarly treated as namespace.
        cy.deleteAllFleetRepos(newWorkspaceName);

        // Move cluster back to 'fleet-default' workspace
        cy.fleetNamespaceToggle(newWorkspaceName);
        cy.restoreClusterToDefaultWorkspace(dsFirstClusterName, timeout);

        // Delete the newly created workspace
        cy.continuousDeliveryMenuSelection();
        cy.continuousDeliveryWorkspacesMenu();
        cy.filterInSearchBox(newWorkspaceName);
        cy.deleteAll(false);
      },
    );
  },
);

// Note: to be executed after the above test cases
// to avoid any interference (i.e: if continuous-delivery feature is not correctly enabled.)
// To be replaced into other spec file when required.
describe('Global settings related tests', { tags: '@special_tests' }, () => {
  it(
    qase(156, 'Fleet-156: Test gitrepoJobsCleanup is disabled when continuous-delivery feature is off'),
    { tags: '@fleet-156' },
    () => {
      // Verify is gitrepoJobsCleanup is enabled by default.
      cy.accesMenuSelection('local', 'Workloads', 'CronJobs');
      // Adding wait for CronJobs page to load correctly.
      cy.wait(5000);
      cy.nameSpaceMenuToggle('All Namespaces');
      cy.verifyTableRow(0, 'Active', 'fleet-cleanup-gitrepo-jobs');

      // Disable continuous-delivery feature flag and wait for restart.
      cy.accesMenuSelection('Global Settings', 'Feature Flags');
      cy.open3dotsMenu('continuous-delivery', 'Deactivate');
      cy.clickButton('Deactivate');
      cy.contains('Waiting for Restart', { timeout: 180000 }).should('not.exist');
      // Verify is gitrepoJobsCleanup job is not present
      cy.accesMenuSelection('local', 'Workloads', 'CronJobs');
      // Adding wait for CronJobs page to load correctly.
      cy.wait(5000);
      cy.contains('fleet-cleanup-gitrepo-jobs').should('not.exist');

      // Re-enable continuous-delivery feature flag and wait for restart.
      cy.accesMenuSelection('Global Settings', 'Feature Flags');
      cy.open3dotsMenu('continuous-delivery', 'Activate');
      cy.clickButton('Activate');
      cy.contains('Waiting for Restart', { timeout: 180000 }).should('not.exist');

      cy.accesMenuSelection('local', 'Workloads', 'CronJobs');
      // Adding wait for CronJobs page to load correctly.
      cy.wait(5000);
      cy.nameSpaceMenuToggle('All Namespaces');
      cy.filterInSearchBox('fleet-cleanup-gitrepo-jobs');
      cy.verifyTableRow(0, 'Active', 'fleet-cleanup-gitrepo-jobs');
    },
  );
});

describe('Test Appco - Fleet integration', { tags: '@appco' }, () => {
  it(qase(468, 'Fleet-468: Verify AppCo connection with Fleet'), { tags: '@fleet-468' }, () => {
    const appcoUsername = Cypress.expose('appco_username');
    const appcoAccessToken = Cypress.expose('appco_access_token');
    const namespaces = ['fleet-local', 'fleet-default'];

    namespaces.forEach((namespace) => {
      cy.accesMenuSelection('Continuous Delivery', 'App Bundles');
      cy.fleetNamespaceToggle(namespace);
      cy.clickButton('Create App Bundle');
      cy.contains('App Bundle: Create').should('be.visible');
      cy.contains('SUSE Application Collection').should('be.visible').click();
      cy.contains('Create an App Bundle from SUSE Application Collection').should('be.visible');
      cy.get('input[placeholder="user@domain.org"]').type(appcoUsername);
      cy.wait(1000);
      cy.get('textarea[placeholder="Your SUSE Application Collection access token"]').type(appcoAccessToken, {
        log: false,
      });
      cy.clickButton('Save');
      cy.contains('charts in total', { timeout: 120000 }).should('be.visible');
    });
  });

  it(qase(469, 'Fleet-469: Test AppCo charts can be installed in local cluster'), { tags: '@fleet-469' }, () => {
    const charts = ['alertmanager'];

    charts.forEach((chartName) => {
      cy.accesMenuSelection('Continuous Delivery', 'App Bundles');
      cy.fleetNamespaceToggle('fleet-local');
      cy.clickButton('Create App Bundle');
      cy.contains('App Bundle: Create').should('be.visible');
      cy.contains('SUSE Application Collection').should('be.visible').click();
      cy.contains('charts in total', { timeout: 60000 }).should('be.visible');

      cy.get('input[placeholder="Search the catalog..."]').clear().type(chartName);
      cy.wait(1000);
      cy.contains(chartName, { timeout: 15000 }).click();

      cy.contains('button', 'Install this version', { timeout: 15000 }).click();
      cy.get('input[placeholder="A unique name"]').clear().type(chartName);
      cy.clickButton('Create');

      cy.contains('App Bundles').should('be.visible');
      cy.filterInSearchBox(chartName);
      cy.verifyTableRow(0, 'Active', chartName, 120000);
      cy.verifyTableRow(0, chartName, '1/1');
    });
  });

  it(qase(470, 'Fleet-470: Test AppCo charts can be installed in downstream cluster'), { tags: '@fleet-470' }, () => {
    const charts = ['tika', 'valkey'];

    charts.forEach((chartName) => {
      cy.accesMenuSelection('Continuous Delivery', 'App Bundles');
      cy.fleetNamespaceToggle('fleet-default');
      cy.clickButton('Create App Bundle');
      cy.contains('App Bundle: Create').should('be.visible');
      cy.contains('SUSE Application Collection').should('be.visible').click();
      cy.contains('charts in total', { timeout: 60000 }).should('be.visible');

      cy.get('input[placeholder="Search the catalog..."]').clear().type(chartName);
      cy.wait(1000);
      cy.contains(chartName, { timeout: 15000 }).click();

      cy.contains('button', 'Install this version', { timeout: 15000 }).click();
      cy.get('input[placeholder="A unique name"]').clear().type(chartName);
      cy.clickButton('Create');

      cy.contains('App Bundles').should('be.visible');
      cy.filterInSearchBox(chartName);
      cy.verifyTableRow(0, 'Active', chartName, 180000);
      cy.verifyTableRow(0, chartName, /([1-9]\d*)\/\1/);
    });
  });
});
