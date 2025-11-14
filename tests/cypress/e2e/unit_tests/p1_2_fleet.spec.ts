/*
Copyright © 2023 - 2025 SUSE LLC

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
import { qase } from 'cypress-qase-reporter/dist/mocha';

export const appName = "nginx-keep"
export const branch = "master"
export const path = "qa-test-apps/nginx-app"
export const repoUrl = "https://github.com/rancher/fleet-test-data/"
export const dsAllClusterList = ['imported-0', 'imported-1', 'imported-2']
export const dsFirstClusterName = dsAllClusterList[0]
export const NoAppBundleOrGitRepoPresentMessages = ['No repositories have been added', 'No App Bundles have been created']
export const rancherVersion = Cypress.env('rancher_version')
export const supported_versions_212_and_above = [
  /^(prime|prime-optimus|prime-optimus-alpha|alpha)\/2\.(1[2-9]|[2-9]\d+)(\..*)?$/,
  /^head\/2\.(1[2-9])$/
];

beforeEach(() => {
  cy.login();
  cy.visit('/');
  cy.deleteAllFleetRepos();
});


Cypress.config();
describe('Test GitRepo Bundle name validation and max character trimming behavior in bundle', { tags: '@p1_2'}, () => {
  const repoTestData: testData[] = [
    { qase_id: 103,
      repoName: "test-test-test-test-test-test-test-test-test-t",
      test_explanation: "47 characters long is NOT TRIMMED but PATH is added with '-' to 53 characters" },
    { qase_id: 104,
      repoName: "test-test-test-test-test-test-test-test-test-test-test-test",
      test_explanation: "59 characters long is TRIMMED to 53 characters max" },
    { qase_id: 106,
      repoName: "test-test-test-test-123-456-789-0--test-test-test-test",
      test_explanation: "54 characters long is TRIMMED to 53 characters max" },
    { qase_id: 105,
      repoName: "Test.1-repo-local-cluster",
      test_explanation: "INVALID and NORMAL characters" },
    { qase_id: 61,
      repoName: "ryhhskh-123456789+-+abdhg%^/",
      test_explanation: "INVALID and SPECIAL characters" },
  ]

  repoTestData.forEach(
    ({ qase_id, repoName, test_explanation }) => {
      if ((qase_id === 105 || qase_id === 61)) {
        qase(qase_id,
          it(`Fleet-${qase_id}: Test GitRepo NAME with "${test_explanation}" displays ERROR message and does NOT get created`, { tags: `@fleet-${qase_id}` }, () => {
            // Add Fleet repository and create it
            cy.addFleetGitRepo({repoName, repoUrl, branch, path});
            cy.clickButton('Create');

            // Skipping this in 2.10 until this bug is resolved:
            // https://github.com/rancher/dashboard/issues/12444
            // TODO: decide what to do with this upon bug resolution
            if (!/\/2\.10/.test(Cypress.env('rancher_version'))) {
            // Assert errorMessage exists
            cy.get('[data-testid="banner-content"] > span')
              .should('contain', repoName)
              .should('contain', 'RFC 1123')
            }
            
            // Navigate back to GitRepo page
            cy.clickButton('Cancel')
            cy.contains(new RegExp(NoAppBundleOrGitRepoPresentMessages.join('|'))).should('be.visible')
          })
          )
      } else {
        qase(qase_id,
          it(`Fleet-${qase_id}: Test GitRepo bundle name TRIMMING behavior. GitRepo with "${test_explanation}"`, { tags: `@fleet-${qase_id}` }, () => {
            // Change namespace to fleet-local

            // Add Fleet repository and create it
            cy.addFleetGitRepo({repoName, repoUrl, branch, path, local: true});
            cy.clickButton('Create');
            cy.verifyTableRow(0, 'Active', repoName);

            // Navigate to Bundles
            cy.continuousDeliveryBundlesMenu();

            // Check bundle name trimed to less than 53 characters
            cy.contains('tr.main-row[data-testid="sortable-table-1-row"]').should('not.be.empty', { timeout: 25000 });
            cy.get(`table > tbody > tr.main-row[data-testid="sortable-table-1-row"]`)
              .children({ timeout: 300000 })
              .should('not.have.text', 'fleet-agent-local')
              .should('not.be.empty')
              .should('include.text', 'test-')
              .should(($ele) => {
                expect($ele).have.length.lessThan(53)
              })
            cy.checkApplicationStatus(appName);
            cy.deleteAllFleetRepos();
          })
        )
      }
    }
  )
});

describe('Test namespace deletion when bundle is deleted', { tags: '@p1_2'}, () => {
  
  qase(131,
    it("Fleet-131: Test NAMESPACE will be DELETED after GitRepo is deleted.", { tags: '@fleet-131' }, () => {
      const repoName = 'test-ns-deleted-when-bundle-deleted'
      const namespaceName = 'my-custom-namespace'

      cy.fleetNamespaceToggle('fleet-local');
      cy.clickCreateGitRepo();
      cy.clickButton('Edit as YAML');
      cy.addYamlFile('assets/131-ns-deleted-when-bundle-deleted.yaml');
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

      // Check namespace is created 
      cy.accesMenuSelection('local', 'Projects/Namespaces');
      cy.filterInSearchBox(namespaceName);
      cy.verifyTableRow(0, 'Active', namespaceName);

      // Delete GitRepo
      cy.deleteAllFleetRepos();

      // Check namespace is deleted
      cy.accesMenuSelection('local', 'Projects/Namespaces');
      cy.filterInSearchBox(namespaceName);
      cy.contains(namespaceName).should('not.exist');
    })
  )

  qase(164,
    it("Fleet-164: Test NAMESPACE will be DELETED after main NESTED GitRepo is deleted.", { tags: '@fleet-164' }, () => {
      const repoName = 'test-ns-deleted-with-nested-bundle'
      const repoName2= 'my-gitrepo'
      const namespaceName = 'my-custom-namespace'
      const repoUrl = 'https://github.com/fleetqa/fleet-qa-examples-public'
      const branch = 'main'
      const path = 'bundles-delete-namespaces-nested'

      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, local: true });
      cy.clickButton('Create');
      // As 2 gitrepos are created, we need to wait for both to be displayed
      // before we can check the status
      cy.wait(2000);
      cy.verifyTableRow(1, 'Active', repoName);
      cy.verifyTableRow(0, 'Active', repoName2);

      // Check namespace is created 
      cy.accesMenuSelection('local', 'Projects/Namespaces');
      cy.filterInSearchBox(namespaceName);
      cy.verifyTableRow(0, 'Active', namespaceName);

      // Go back to the GitRepos and delete only the main one
      cy.continuousDeliveryMenuSelection();
      cy.fleetNamespaceToggle('fleet-local');
      cy.filterInSearchBox(repoName); // this is the main one
      
      // Since whe expeect that the deletion of the main one also
      // deletes the nested one, the 'deleteAll' function will check this
      cy.deleteAll();

      // Check namespace is deleted
      cy.accesMenuSelection('local', 'Projects/Namespaces');
      cy.filterInSearchBox(namespaceName);
      cy.contains(namespaceName, {timeout: 20000 }).should('not.exist');
    })
  )
})

describe('Test Fleet Resource Count', { tags: '@p1_2'}, () => {
  qase(155,
    it("Fleet-155: Test clusters resource count is correct", { tags: '@fleet-155' }, () => {

      const repoName = 'default-cluster-count-155'
      const branch = "master"
      const path = "simple"
      const repoUrl = "https://github.com/rancher/fleet-examples"
      const timeout = 50000
      let resourceCount = '18 / 18'
      let multipliedResourceCount = true

      if (/\/2\.10/.test(Cypress.env('rancher_version')) || /\/2\.9/.test(Cypress.env('rancher_version'))) {
        resourceCount = '6 / 6'
        multipliedResourceCount = false
      }

      // Get Default Resources from single cluster before GitRepo.
      cy.currentClusterResourceCount(dsFirstClusterName);

      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1', resourceCount, timeout);

      // Get the Resource count from GitRepo and store it.
      cy.gitRepoResourceCountAsInteger(repoName, 'fleet-default');

      // Get Actual Resources from single cluster by subtracting default resources.
      cy.actualResourceOnCluster(dsFirstClusterName);

      // Compare Resource count from GitRepo with Cluster resource.
      cy.compareClusterResourceCount(multipliedResourceCount);

      cy.deleteAllFleetRepos();
    })
  )
});

describe('Test move cluster to newly created workspace and deploy application to it.', { tags: '@p1_2'}, () => {
  qase(51,
    it("Fleet-51: Test move cluster to newly created workspace and deploy application to it.", { tags: '@fleet-51' }, () => {
      const repoName = 'default-cluster-new-workspace-51'
      const branch = "master"
      const path = "simple"
      const repoUrl = "https://github.com/rancher/fleet-examples"
      const flagName = "provisioningv2-fleet-workspace-back-population"
      const newWorkspaceName = "new-fleet-workspace"
      const fleetDefault = "fleet-default"
      let timeout = 30000

      //Version check for 2.12 (head)
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        timeout = 60000
      }

      // Enable cluster can move to another Fleet workspace feature flag.
      cy.enableFeatureFlag(flagName);

      // Create new workspace.
      cy.createNewFleetWorkspace(newWorkspaceName);

      // Switch to 'fleet-default' workspace
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
      cy.continuousDeliveryMenuSelection()
      cy.continuousDeliveryWorkspacesMenu()
      cy.filterInSearchBox(newWorkspaceName)
      cy.deleteAll(false);
    })
  )
});

if (!/\/2\.11/.test(Cypress.env('rancher_version'))) {
  describe('Test HelmOps', { tags: '@p1_2' }, () => {

    qase(165, 
      it('FLEET-165: Test basic HelmOps creation', { tags: '@fleet-165' }, () => {

        cy.addHelmOp({ 
          fleetNamespace: 'fleet-local', 
          repoName: 'helmapp-grafana',
          repoUrl: 'https://grafana.github.io/helm-charts',
          chart: 'grafana',
        });

        cy.verifyTableRow(0, 'Active', '1/1');
      })
    );

    qase(197,
      it('FLEET-197: Test Helmops creation with a fixed version', { tags: '@fleet-197' }, () => {

        cy.addHelmOp({ 
          fleetNamespace: 'fleet-default', 
          repoName: 'helmapp-grafana-fixed-version',
          repoUrl: 'https://grafana.github.io/helm-charts',
          chart: 'grafana',
          version: '10.1.0',
          deployTo: 'All Clusters'
        });

        cy.verifyTableRow(0, 'Active', '10.1.0');
      })
    );
        
    qase(198,
      it('FLEET-198: Test incorrect chart version cannot be installed', { tags: '@fleet-198' }, () => {

        cy.addHelmOp({ 
          fleetNamespace: 'fleet-local', 
          repoName: 'helmapp-grafana-bad-version',
          repoUrl: 'https://grafana.github.io/helm-charts',
          chart: 'grafana',
          version: '999999999'
        });

        cy.verifyTableRow(0, 'Error', '0/0');
        cy.contains('Could not get a chart version: no chart version found for grafana-999999999').should('be.visible');
      })
    );

    qase(190,
      it('FLEET-190: Test Faulty Helm Ops display short error message', { tags: '@fleet-190' }, () => { 

        cy.addHelmOp({ 
          fleetNamespace: 'fleet-local', 
          repoName: 'faulty-helm-ops',
          repoUrl: 'https://github.com/rancher',
          chart: 'fleet-examples/tree/master/single-cluster/helm',
        });

        cy.contains('Could not get a chart version: failed to read helm repo from https://github.com/rancher/index.yaml, error code: 404').should('be.visible');      
        cy.contains('DOCTYPE html').should('not.exist');

      })
    );
  })
};

describe('Test Helm app with Custom Values', { tags: '@p1_2' }, () => {
  const configMapName = "test-map"
  const repoTestData: testData[] = [
    {qase_id: 173, message: '`valuesFrom` with empty', path:'qa-test-apps/helm-app/values-from-with-empty-values' },
    {qase_id: 174, message: '`valuesFrom` with NO', path:'qa-test-apps/helm-app/values-from-with-no-values' },
    {qase_id: 175, message: '`valuesFiles` with empty', path: 'qa-test-apps/helm-app/values-files-with-empty-values' },
    {qase_id: 176, message: '`valuesFiles` with NO', path: 'qa-test-apps/helm-app/values-files-with-no-values' }
  ]

  beforeEach('Cleanup leftover GitRepo and ConfigMap if any.', () => {
    cy.login();
    cy.visit('/');
    cy.deleteConfigMap(configMapName);
    cy.deleteAllFleetRepos();
  })

  repoTestData.forEach(({ qase_id, message, path }) => {
    qase(qase_id,
      it(`FLEET-${qase_id}: Test helm-app using "${message}" values in the fleet.yaml file.`, { tags: `@fleet-${qase_id}`}, () => {
        const repoName = `local-cluster-fleet-${qase_id}`

        // Create ConfigMap before create GitRepo
        if (qase_id === 173 || qase_id === 174) {
          cy.createConfigMap(configMapName);
        }

        // Create GitRepo
        cy.continuousDeliveryMenuSelection();
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path, local: true });
        cy.clickButton('Create');
        cy.verifyTableRow(0, 'Active', repoName);
        cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

        // Delete GitRepo
        cy.deleteAllFleetRepos();
      })
    );
  });
});

describe('Create specified bundles from GitRepo', { tags: '@p1_2' }, () => {
  const repoTestData: testData[] = [
    {
      qase_id: 180,
      test_name: 'Test GitRepo creates bundles specified under bundles: without option: field',
      repoName: 'test-bundle',
      gitrepo_file: 'assets/gitrepo-bundle-create-tests/180-gitrepo-create-bundle.yaml',
      bundle_count: '3 / 3',
      resource_count: '12 / 12',
      expectedBundles: [
        "test-bundle-driven-helm",
        "test-bundle-driven-kustomize",
        "test-bundle-driven-simple",
      ],
    },
    {
      qase_id: 181,
      test_name: 'Test GitRepo creates bundles specified under bundles: with option: field',
      repoName: 'test-bundle-dev-prod',
      gitrepo_file: 'assets/gitrepo-bundle-create-tests/181-gitrepo-create-dev-prod-bundle.yaml',
      bundle_count: '4 / 4',
      resource_count: '15 / 15',
      expectedBundles: [
        "test-bundle-dev-prod-driven-helm",
        "test-bundle-dev-prod-driven-kustomize-dev",
        "test-bundle-dev-prod-driven-kustomize-prod",
        "test-bundle-dev-prod-driven-simple",
      ],
    },
    {
      qase_id: 182,
      test_name: 'Test update GitRepo by removing prod.yaml from option and verify that prod bundle should not be created.',
      repoName: 'test-bundle-dev',
      gitrepo_file: 'assets/gitrepo-bundle-create-tests/182-gitrepo-create-dev-bundle.yaml',
      bundle_count: '3 / 3',
      resource_count: '12 / 12',
      expectedBundles: [
        "test-bundle-dev-driven-helm",
        "test-bundle-dev-driven-kustomize-dev",
        "test-bundle-dev-driven-simple",
      ],
    },
    {
      qase_id: 183,
      test_name: 'Test update GitRepo by adding test.yaml under option and verify that prod bundle should not be created.',
      repoName: 'test-bundle-dev-test',
      gitrepo_file: 'assets/gitrepo-bundle-create-tests/183-gitrepo-create-dev-test-bundle.yaml',
      bundle_count: '4 / 4',
      resource_count: '15 / 15',
      expectedBundles: [
        "test-bundle-dev-test-driven-helm",
        "test-bundle-dev-test-driven-kustomize-dev",
        "test-bundle-dev-test-driven-kustomize-test",
        "test-bundle-dev-test-driven-simple",
      ],
    },
  ]

  if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
    beforeEach('Cleanup leftover GitRepo', () => {
      cy.login();
      cy.visit('/');
      cy.deleteAllFleetRepos();
    })

    repoTestData.forEach(({ qase_id, test_name, repoName, gitrepo_file, bundle_count, resource_count, expectedBundles }) => {
      it(`FLEET-${qase_id}: ${test_name}`, { tags: `@fleet-${qase_id}`}, () => {
        // Create GitRepo
        cy.continuousDeliveryMenuSelection()
        cy.clickCreateGitRepo();
        cy.clickButton('Edit as YAML');
        cy.wait(1000);
        cy.addYamlFile(gitrepo_file);
        cy.clickButton('Create');
        cy.checkGitRepoStatus(repoName, bundle_count, resource_count);
        cy.continuousDeliveryBundlesMenu();
        expectedBundles.forEach((bundle_name: string) => {
          cy.filterInSearchBox(bundle_name);
          cy.verifyTableRow(0, 'Active', bundle_name);
        });

        // Delete GitRepo
        cy.deleteAllFleetRepos();
      })
    });
  }
});

describe('Test Fleet bundle status for longhorn-crd', { tags: '@p1_2'}, () => {

  qase(139,

    it("Fleet-139: Test CRD's for longhorn application should be in active state not in modified state when correctDrift enabled", { tags: '@fleet-139' }, () => {

      const repoName = 'default-longhorn-crd-bundle-status'
      const path = "qa-test-apps/longhorn-crd"

      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, correctDrift: 'yes' });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1', '66 / 66');

      // Check bundle status of longhorn-crd
      cy.continuousDeliveryBundlesMenu();
      cy.filterInSearchBox(repoName);
      cy.verifyTableRow(0, 'Active', repoName);

      cy.deleteAllFleetRepos();

    })
  )
});

describe('Test non-yaml file into bundle.', { tags: '@p1_2'}, () => {

  qase(87,

    it("Fleet-87: Test .fleetignore ignores content of non-yaml file into bundle.", { tags: '@fleet-87' }, () => {

      const repoName = 'test-resource-ignore'
      const path = "qa-test-apps/fleet-ignore-test"

      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.clickButton('Create');

      cy.checkGitRepoStatus(repoName, '1 / 1', '3 / 3');

      dsAllClusterList.forEach(
        (dsCluster) => {
          // Verify only nginx application created on each cluster.
          cy.checkApplicationStatus("nginx-not-to-be-ignore", dsCluster, 'All Namespaces');

          // Verify that No ConfigMaps is created which is present on the path.
          cy.checkApplicationStatus("test-config-map-ignored", dsCluster, 'All Namespaces', false, 'Storage', 'ConfigMaps');
          cy.checkApplicationStatus("config-map-ignored", dsCluster, 'All Namespaces', false, 'Storage', 'ConfigMaps');
        }
      )

      cy.deleteAllFleetRepos();

    })
  )
});

describe('Test Fleet `doNotDeploy: true` skips deploying resources to clusters.', { tags: '@p1_2'}, () => {

  const key = "key_resources"
  const value = "deploy_true"

  beforeEach('Cleanup leftover Cluster labels if any.', () => {
    cy.login();
    cy.visit('/');
    // Remove labels from the clusters.
    cy.accesMenuSelection('Continuous Delivery', 'Clusters');
    dsAllClusterList.forEach(
      (dsCluster) => {
        // Adding wait to load page correctly to avoid interference with hamburger-menu.
        cy.wait(500);
        cy.removeClusterLabels(dsCluster, key, value);
      }
    )
  })

  qase(88,

    it("Fleet-88: Test bundle did not get deployed when 'doNotDeploy' value set to `true` option is used in the 'fleet.yaml' file.", { tags: '@fleet-88' }, () => {

      const repoName = 'test-donot-deploy-true'
      const path = "qa-test-apps/do-not-deploy/true"
      let gitRepoWord = "git repo"

      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        gitRepoWord = "GitRepo"
      }

      // Assign label (similar to label mentioned in fleet.yaml file.) to All the clusters
      dsAllClusterList.forEach(
        (dsCluster) => {
          cy.assignClusterLabel(dsCluster, key, value);
        }
      )

      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.clickButton('Create');

      // Verify GitRepo is not targeting to any clusters as doNotDeploy is set true.
      cy.verifyTableRow(0, 'Active', repoName);
      cy.contains(repoName).click()
      cy.get('.primaryheader > h1, h1 > span.resource-name.masthead-resource-title').contains(repoName).should('be.visible')
      cy.get("[data-testid='banner-content']").should('exist').contains(`This ${gitRepoWord} is not targeting any clusters`);

      // Verify nginx application not deployed clusters as doNotDeploy is set true.
      dsAllClusterList.forEach(
        (dsCluster) => {
          // 'false' option in below command is used to check the absence of given resource.
          cy.checkApplicationStatus("nginx-donot-deploy", dsCluster, 'All Namespaces', false);
        }
      )

      cy.deleteAllFleetRepos();

    })
  )
});

describe('Test Fleet `doNotDeploy: false` will deploy resources to all clusters.', { tags: '@p1_2'}, () => {

  qase(89,

    it("Fleet-89: Test bundle gets deploy to all clusters when `doNotDeploy: false` is used in the fleet.yaml.", { tags: '@fleet-89' }, () => {

      const repoName = 'test-donot-deploy-false'
      const path = "qa-test-apps/do-not-deploy/false"

      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.clickButton('Create');
      cy.verifyTableRow(0, 'Active', repoName);
      cy.checkGitRepoStatus(repoName, '1 / 1', '3 / 3');

      // Verify nginx application is deployed on all clusters as doNotDeploy is set false.
      dsAllClusterList.forEach(
        (dsCluster) => {
          cy.checkApplicationStatus("nginx-donot-deploy", dsCluster, 'All Namespaces');
        }
      )

      cy.deleteAllFleetRepos();

    })
  )
});

if (!/\/2\.11/.test(Cypress.env('rancher_version')) && !/\/2\.12/.test(Cypress.env('rancher_version'))) {
  
  describe('Test Git App with Fleet', { tags: '@p1_2'}, () => {
    qase(199,
      it("Fleet-199: Test Git App deployment using Fleet.", { tags: '@fleet-199' }, () => {

        const github_app_id = Cypress.env("gh_app_id")
        const github_app_installation_id = Cypress.env("gh_app_installation_id")
        const github_app_private_key = Cypress.env("gh_app_private_key")

        // Create secret from UI
        cy.accesMenuSelection('local', 'Storage', 'Secrets');
        cy.nameSpaceMenuToggle('All Namespaces');
        cy.clickButton('Create');
        cy.get('div.title.with-description').contains('Opaque').should('be.visible').click();
        cy.get('div[data-testid="name-ns-description-namespace"]').should('exist').click();
  
        // This is necessary to select 'fleet-local' from the dropdown and not 'cattle-fleet-local-system' option
        cy.contains("div.vs__option-kind", "fleet-local ").should('exist').click();
        cy.typeValue('Name', 'github-app-secret');  

        cy.get("section[id='data'] input[placeholder='e.g. foo']").type('github_app_id');
        cy.get("section[id='data'] textarea[placeholder='e.g. bar']").type(github_app_id);
        cy.clickButton('Add');
        
        cy.get("section[id='data'] input[placeholder='e.g. foo']").eq(1).type('github_app_installation_id');
        cy.get("section[id='data'] textarea[placeholder='e.g. bar']").eq(1).type(github_app_installation_id);
        cy.clickButton('Add');

        cy.get("section[id='data'] input[placeholder='e.g. foo']").eq(2).type('github_app_private_key');
        cy.get("section[id='data'] textarea[placeholder='e.g. bar']").eq(2).type(github_app_private_key, false);
        cy.wait(2000);
        cy.clickButton('Create');

        // Create GitRepo and validate active status
        cy.addFleetRepoFromYaml('assets/gitapp-test/fleet.yaml');
        cy.verifyTableRow(0, 'Active', '1/1');
      })
    )
  }); 
};
