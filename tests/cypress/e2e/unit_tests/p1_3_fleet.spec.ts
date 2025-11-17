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
export const bannerMessageToAssert = /Matches 2 of 3 existing clusters, including "imported-\d"/
export const key = 'key_env'
export const value = 'value_testing'
export const clusterGroupName = 'cluster-group-env-prod'
export const dsAllClusterList = ['imported-0', 'imported-1', 'imported-2']
export const dsFirstClusterName = dsAllClusterList[0]
export const dsFirstTwoClusterList = dsAllClusterList.slice(0, 2)
export const dsThirdClusterName = dsAllClusterList[2]
export const NoAppBundleOrGitRepoPresentMessages = ['No repositories have been added', 'No App Bundles have been created']
export const rancherVersion = Cypress.env('rancher_version')
export const supported_versions_212_and_above = [
  /^(prime|prime-optimus|prime-optimus-alpha|prime-alpha|prime-rc|alpha)\/2\.(1[2-9]|[2-9]\d+)(\..*)?$/,
  /^head\/2\.(1[2-9])$/
];

beforeEach(() => {
  cy.login();
  cy.visit('/');
  cy.deleteAllFleetRepos();
});

Cypress.config()

describe('Test Helm app with Custom Values', { tags: '@p1_3' }, () => {
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

describe('Create specified bundles from GitRepo', { tags: '@p1_3' }, () => {
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

describe('Test Fleet bundle status for longhorn-crd', { tags: '@p1_3'}, () => {

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

describe('Test non-yaml file into bundle.', { tags: '@p1_3'}, () => {

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

describe('Test GitRepoRestrictions scenarios for GitRepo application deployment.', { tags: '@p1_3' }, () => {
  const branch = "master"
  const path = "qa-test-apps/nginx-app"
  const repoUrl = "https://github.com/rancher/fleet-test-data/"
  const appName = 'nginx-keep'
  const allowedTargetNamespace = 'allowed-namespace'

  beforeEach('Cleanup leftover GitRepo if any.', () => {
    cy.login();
    cy.visit('/');
    cy.deleteAllFleetRepos();
  })

  qase(39,
    it('Test "GitRepoRestrictions" on non-existent namespace throws error in the UI', { tags: '@fleet-39' }, () => {
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        cy.accesMenuSelection('Continuous Delivery', 'Resources', 'GitRepoRestrictions');
      }
      else {
        cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'GitRepoRestrictions');
      }
      cy.clickButton('Create from YAML');
      cy.readFile('assets/git-repo-restrictions-non-exists-ns.yaml').then((content) => {
        cy.get('.CodeMirror').then((codeMirrorElement) => {
          const cm = (codeMirrorElement[0] as any).CodeMirror;
          cm.setValue(content);
        });
      })
      cy.clickButton('Create');
      cy.get('[data-testid="banner-content"] > span').contains('namespaces "iamnotexists" not found');
      cy.clickButton('Cancel');
    })
  )

  qase(40,
    it('Test "GitRepoRestrictions" override "defaultNamespace" in fleet.yaml of application over "allowedTargetNamespace"', { tags: '@fleet-40' }, () => {
      const repoName = 'local-gitreporestrictions-fleet-40'

      // Create GitRepoRestrictions with allowedTargetNamespace
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        cy.accesMenuSelection('Continuous Delivery', 'Resources', 'GitRepoRestrictions');
      }
      else {
        cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'GitRepoRestrictions');
      }
      cy.clickButton('Create from YAML');
      cy.readFile('assets/git-repo-restrictions-allowed-target-ns.yaml').then((content) => {
        cy.get('.CodeMirror').then((codeMirrorElement) => {
          const cm = (codeMirrorElement[0] as any).CodeMirror;
          cm.setValue(content);
        });
      })
      cy.clickButton('Create');

      // Add Fleet repository and create it
      cy.wait(200);
      cy.addFleetGitRepo({repoName, repoUrl, branch, path, allowedTargetNamespace, local: true});

      cy.clickButton('Create');
      cy.verifyTableRow(0, 'Active', repoName);
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

      // Verify application is created in allowed namespace.
      cy.accesMenuSelection('local', 'Workloads', 'Pods');
      cy.nameSpaceMenuToggle(allowedTargetNamespace);
      cy.filterInSearchBox(appName);
      cy.get('.col-link-detail').contains(appName).should('be.visible');

      // Deleting GitRepoRestrictions from the fleet-local namespace
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        cy.accesMenuSelection('Continuous Delivery', 'Resources', 'GitRepoRestrictions');
      }
      else {
        cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'GitRepoRestrictions');
      }
      cy.fleetNamespaceToggle('fleet-local');
      cy.deleteAll(false);

      // Delete GitRepo
      cy.deleteAllFleetRepos();
    })
  )

  qase(41,
    it('Test "allowedTargetNamespace" from "GitRepoRestrictions" overrides "defaultNamespace" in fleet.yaml of application on existing GitRepo', { tags: '@fleet-41' }, () => {
      const repoName = 'local-gitreporestrictions-fleet-41'

      // Create GitRepoRestrictions with allowedTargetNamespace
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        cy.accesMenuSelection('Continuous Delivery', 'Resources', 'GitRepoRestrictions');
      }
      else {
        cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'GitRepoRestrictions');
      }
      cy.clickButton('Create from YAML');
      cy.readFile('assets/git-repo-restrictions-allowed-target-ns.yaml').then((content) => {
        cy.get('.CodeMirror').then((codeMirrorElement) => {
          const cm = (codeMirrorElement[0] as any).CodeMirror;
          cm.setValue(content);
        });
      })
      cy.clickButton('Create');

      // Add Fleet repository and create it
      cy.wait(200);
      cy.addFleetGitRepo({repoName, repoUrl, branch, path, local: true});
      cy.clickButton('Create');
      cy.verifyTableRow(0, 'Error', repoName);
      cy.get('td.text-error')
        .contains("Empty targetNamespace denied, because allowedTargetNamespaces restriction is present");

      // Edit GitRepo by adding allowed target namespace.
      cy.fleetNamespaceToggle('fleet-local');
      cy.addFleetGitRepo({repoName, allowedTargetNamespace, editConfig: true})
      cy.clickButton('Save');
      cy.verifyTableRow(0, 'Active', repoName);
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

      // Verify application is created in allowed namespace.
      cy.accesMenuSelection('local', 'Workloads', 'Pods');
      cy.nameSpaceMenuToggle(allowedTargetNamespace);
      cy.filterInSearchBox(appName);
      cy.get('.col-link-detail').contains(appName).should('be.visible');

      // Deleting GitRepoRestrictions from the fleet-local namespace
      if (supported_versions_212_and_above.some(r => r.test(rancherVersion))) {
        cy.accesMenuSelection('Continuous Delivery', 'Resources', 'GitRepoRestrictions');
      }
      else {
        cy.accesMenuSelection('Continuous Delivery', 'Advanced', 'GitRepoRestrictions');
      }
      cy.fleetNamespaceToggle('fleet-local');
      cy.deleteAll(false);

      // Delete GitRepo
      cy.deleteAllFleetRepos();
    })
  )
});

describe('Test Fleet `doNotDeploy: true` skips deploying resources to clusters.', { tags: '@p1_3'}, () => {

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

describe('Test Fleet `doNotDeploy: false` will deploy resources to all clusters.', { tags: '@p1_3'}, () => {

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
  
  describe('Test Git App with Fleet', { tags: '@p1_3'}, () => {
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
