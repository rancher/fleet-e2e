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

beforeEach(() => {
  cy.login();
  cy.visit('/');
  cy.deleteAllFleetRepos();
});


Cypress.config();
describe('Test GitRepo Bundle name validation and max character trimming behavior in bundle', { tags: '@p1'}, () => {
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
            cy.contains('No repositories have been added').should('be.visible')
          })
          )
      } else {
        qase(qase_id,
          it(`Fleet-${qase_id}: Test GitRepo bundle name TRIMMING behavior. GitRepo with "${test_explanation}"`, { tags: `@fleet-${qase_id}` }, () => {
            // Change namespace to fleet-local
            cy.fleetNamespaceToggle('fleet-local');

            // Add Fleet repository and create it
            cy.addFleetGitRepo({repoName, repoUrl, branch, path});
            cy.clickButton('Create');
            cy.verifyTableRow(0, 'Active', repoName);

            // Navigate to Bundles
            cypressLib.accesMenu("Advanced")
            cypressLib.accesMenu("Bundles")

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

describe('Test resource behavior after deleting GitRepo using keepResources option using YAML', { tags: '@p1' }, () => {
  qase(68, 
    it('Fleet-68: Test RESOURCES will be KEPT and NOT be DELETED after GitRepo is deleted when keepResources: true used in the GitRepo yaml file.', { tags: '@fleet-68' }, () => {
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.fleetNamespaceToggle('fleet-local')
      cy.clickButton('Add Repository');
      cy.contains('Git Repo:').should('be.visible');
      cy.clickButton('Edit as YAML');
      cy.addYamlFile('assets/git-repo-keep-resources-true.yaml');
      cy.clickButton('Create');
      cy.checkGitRepoStatus('local-cluster-fleet-68', '1 / 1');

      // Check application gets installed on the local cluster.
      cy.checkApplicationStatus(appName);

      // Delete GitRepo
      cy.deleteAllFleetRepos();

      // Check application is present after deleting GitRepo (keepResource option)
      cy.checkApplicationStatus(appName);
      cy.deleteApplicationDeployment();
    })
  )
})

describe('Test resource behavior after deleting GitRepo using keepResources option', { tags: '@p1'}, () => {
  const keepResourceData: testData[] = [
    { qase_id: 69,
      keepResources: 'yes',
      test_explanation: 'RESOURCES will be KEPT and NOT be DELETED after GitRepo is deleted.',
    },
    { qase_id: 70,
      keepResources: 'no',
      test_explanation: 'RESOURCES will NOT be KEPT and  will be DELETED after GitRepo is deleted.',
    },
  ]
  keepResourceData.forEach(
    ({ qase_id, keepResources, test_explanation}) => {
      qase(qase_id,
        it(`Fleet-${qase_id}: Test ${test_explanation}`, { tags: `@fleet-${qase_id}` }, () => {
          const repoName = `local-cluster-fleet-${qase_id}`
          cy.fleetNamespaceToggle('fleet-local')
          cy.addFleetGitRepo({ repoName, repoUrl, branch, path, keepResources });
          cy.clickButton('Create');
          cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
          cy.checkApplicationStatus(appName);
          cy.deleteAllFleetRepos();
          if (keepResources === 'yes') {
            cy.checkApplicationStatus(appName);
            cy.deleteApplicationDeployment();
          }
        })
      )
    }
  )
});

describe('Test Self-Healing of resource modification when correctDrift option used', { tags: '@p1'}, () => {
  const correctDriftData: testData[] = [
    { qase_id: 76,
      correctDrift: 'yes',
      test_explanation: 'MODIFICATION to resources will be self-healed when correctDrift is set to true in GitRepo.',
    },
    { qase_id: 113,
      correctDrift: 'no',
      test_explanation: 'MODIFICATION to resources will not be self-healed when correctDrift is set to false in GitRepo.',
    },
  ]
  correctDriftData.forEach(
    ({ qase_id, correctDrift, test_explanation}) => {
      qase(qase_id,
        it(`Fleet-${qase_id}: Test ${test_explanation}`, { tags: `@fleet-${qase_id}` }, () => {
          const repoName = `local-cluster-correct-${qase_id}`
          cy.fleetNamespaceToggle('fleet-local')
          cy.addFleetGitRepo({ repoName, repoUrl, branch, path, correctDrift });
          cy.clickButton('Create');
          cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
          cy.checkApplicationStatus(appName);

          // Modify deployment count of application
          cy.modifyDeployedApplication(appName);

          if (correctDrift === 'yes') {
            // Resources will be restored, hence count will be 1/1.
            cy.verifyTableRow(0, appName, '1/1');
          } else {
            // Resource count will get increased as resource will not be restored
            cy.verifyTableRow(0, appName, '2/2');
          }
          cy.deleteAllFleetRepos();
        })
      )
    }
  )
});

describe('Test Self-Healing of resource modification when correctDrift option used for exisiting GitRepo', { tags: '@p1'}, () => {
  qase(77,
    it("Fleet-77: Test MODIFICATION to resources will be self-healed when correctDrift is set to true in existing GitRepo.", { tags: '@fleet-77', retries: 1 }, () => {
      const repoName = "local-cluster-correct-77"
      cy.fleetNamespaceToggle('fleet-local')
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
      cy.checkApplicationStatus(appName);

      // Modify deployment count of application
      cy.modifyDeployedApplication(appName);

      // Resource count will get increased as resource will not be restored
      cy.verifyTableRow(0, appName, '2/2');

      // Update exising GitRepo by enabling 'correctDrift'
      cy.addFleetGitRepo({ repoName, correctDrift: 'yes', editConfig: true });
      cy.clickButton('Save');
      // This test is exception for using 'Force Update'.
      // Wait added to mitigate problems before force ipdate on 2.11 onwards
      // TODO: remove or rework when possible 
      cy.wait(2000);
      cy.open3dotsMenu(repoName, 'Force Update');

      // TODO: remove once this bug is fixed: 
      // https://github.com/rancher/dashboard/issues/14295#issuecomment-2862105017
      cy.closePopWindow('Warning')

      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
      cy.checkApplicationStatus(appName);

      // Modify deployment count of application
      cy.modifyDeployedApplication(appName);

      // Resources will be restored, hence count will be 1/1.
      cy.verifyTableRow(0, appName, '1/1');

      cy.deleteAllFleetRepos();
    })
  )
});

describe('Test resource behavior after deleting GitRepo using keepResources option for exisiting GitRepo', { tags: '@p1'}, () => {
  qase(71,
    it("Fleet-71: Test RESOURCES will be KEPT and NOT be DELETED after GitRepo is deleted when keepResources is set to true in existing GitRepo.", { tags: '@fleet-71' }, () => {
      const repoName = "local-cluster-keep-71"
      cy.fleetNamespaceToggle('fleet-local')
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
      cy.checkApplicationStatus(appName);

      // Edit existing GitRepo with 'keepResource: true' to prevent
      // application removal after GitRepo delete.
      cy.addFleetGitRepo({ repoName, keepResources: 'yes', editConfig: true });
      cy.clickButton('Save');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

      // Delete GitRepo to check application removed or not.
      cy.deleteAllFleetRepos();

      // Check application still exists after deleting existing GitRepo
      cy.checkApplicationStatus(appName);
      cy.deleteApplicationDeployment();
    })
  )
});

// Perform this test only if rancher_version does not contain "/2.7"
if (!/\/2\.7/.test(Cypress.env('rancher_version'))) {
  describe('Test local cluster behavior with New workspace', { tags: '@p1'}, () => {
    qase(107,
      it("Fleet-107: Test LOCAL CLUSTER cannot be moved to another workspace as no 'Change workspace' option available..", { tags: '@fleet-107' }, () => {
        cy.accesMenuSelection('Continuous Delivery', 'Clusters');
        cy.fleetNamespaceToggle('fleet-local');
        cy.open3dotsMenu('local', 'Change workspace', true);
      })
    )
  });
}

if (!/\/2\.7/.test(Cypress.env('rancher_version'))) {
  describe('Imagescan tests', { tags: '@p1'}, () => {
    qase(112,
      it("Fleet-112: Test imagescan app without expected semver range does not break fleet controller", { tags: '@fleet-112' }, () => {;
        const repoName = 'local-cluster-imagescan-112'
        const repoUrl = 'https://github.com/rancher/fleet-test-data'
        const branch = 'master'
        const path = 'imagescans'

        cy.fleetNamespaceToggle('fleet-local');
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
        cy.clickButton('Create');
        cy.verifyTableRow(0, 'Error', '1/1');
        cy.accesMenuSelection('local', 'Workloads');
        cy.nameSpaceMenuToggle('All Namespaces');
        cy.filterInSearchBox('fleet-controller');
        cy.verifyTableRow(0, 'Running', 'fleet-controller')
        cy.deleteAllFleetRepos();
      })
    )
  });
}

// RepoURLRegex is supported on v2.8 but error reporting is not working correctly there
// Ref. https://github.com/rancher/fleet/issues/2462 but it wont be fixed in v2.8
if (!/\/2\.7/.test(Cypress.env('rancher_version')) && !/\/2\.8/.test(Cypress.env('rancher_version'))) {
  describe('Private Helm Repository tests (helmRepoURLRegex)', { tags: '@p1'}, () => {

    const repoUrl = 'https://github.com/fleetqa/fleet-qa-examples-public.git'
    const branch = 'main'
    const userOrPublicKey = 'user'
    const pwdOrPrivateKey = 'password'
    const gitOrHelmAuth = 'Helm'
    const gitAuthType = "http"
    let helmUrlRegex

    const privateHelmData: testData[] = [
      { qase_id: 64,
        repoName: "local-private-helm-repo-64",
        path: 'helm-urlregex-repo',
        test_explanation: 'repo',
        helmUrlRegex_matching: '^http.*',
      },
      { qase_id: 65,
        repoName: "local-private-helm-chart-65",
        path: 'helm-urlregex-chart',
        test_explanation: 'chart',
        helmUrlRegex_matching: '^http.*app.*tgz$',
      },
    ]

    // Actually just a preparation step
    it("Prepare the private helm registry", { tags: '@preparation' }, () => {
      cy.importYaml({ clusterName: 'local', yamlFilePath: 'assets/helm-server-with-auth-and-data.yaml' });
      cy.nameSpaceMenuToggle('default');
      // The check doesn't wait for Active state, only its presence
      cy.checkApplicationStatus('nginx-helm-repo');
      // We keep the resources in cluster forever
    });

    privateHelmData.forEach(
      ({qase_id, repoName, path, helmUrlRegex_matching, test_explanation}) => {
        qase(qase_id,
          it(`Fleet-${qase_id}: Test private helm registries for \"helmRepoURLRegex\" matches with \"${test_explanation}\" URL specified in fleet.yaml file`, { tags: `@fleet-${qase_id}` }, () => {;
            // Positive test using matching regex
            helmUrlRegex = helmUrlRegex_matching
            cy.fleetNamespaceToggle('fleet-local');
            cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitOrHelmAuth, gitAuthType, userOrPublicKey, pwdOrPrivateKey, helmUrlRegex });
            cy.clickButton('Create');
            cy.verifyTableRow(0, 'Active', /([1-9]\d*)\/\1/);
            cy.accesMenuSelection('local', 'Storage', 'ConfigMaps');
            cy.nameSpaceMenuToggle('All Namespaces');
            cy.filterInSearchBox('local-chart-configmap');
            cy.wait(2000);
            cy.get('.col-link-detail').contains('local-chart-configmap').should('be.visible').click({ force: true });
            cy.get('section#data').should('contain', 'sample-cm').and('contain', 'sample-data-inside');
            cy.deleteAllFleetRepos();
            // Negative test using non-matching regex 1234.*
            helmUrlRegex = '1234.*'
            cy.fleetNamespaceToggle('fleet-local');
            cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitOrHelmAuth, gitAuthType, userOrPublicKey, pwdOrPrivateKey, helmUrlRegex });
            cy.clickButton('Create');
            cy.get('.text-error', { timeout: 120000 }).should('contain', 'code: 401');
            cy.deleteAllFleetRepos();
          })
        )
      })
  });
}

  describe('Test OCI support', { tags: '@p1'}, () => {
    qase(60,
      it("Fleet-60: Test OCI helm chart support on Github Container Registry", { tags: '@fleet-60' }, () => {;
        const repoName = 'default-oci-60'
        const repoUrl = 'https://github.com/rancher/fleet-test-data'
        const branch = 'master'
        const path = 'helm-oci'

        cy.fleetNamespaceToggle('fleet-default');
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
        cy.clickButton('Create');
        cy.verifyTableRow(0, 'Active', /([1-9]\d*)\/\1/);
        cy.accesMenuSelection(dsFirstClusterName, 'Storage', 'ConfigMaps');
        cy.nameSpaceMenuToggle('All Namespaces');
        cy.filterInSearchBox('fleet-test-configmap');
        cy.get('.col-link-detail').contains('fleet-test-configmap').should('be.visible').click({ force: true });
        cy.get('section#data').should('contain', 'default-name').and('contain', 'value');
        cy.deleteAllFleetRepos();
      })
    )
  
    qase(127,
      it("Fleet-127: Test PRIVATE OCI helm chart support on Github Container Registry", { tags: '@fleet-127' }, () => {;
        const repoName = 'default-oci-127'
        const repoUrl = 'https://github.com/fleetqa/fleet-qa-examples-public'
        const branch = 'main'
        const path = 'helm-oci-auth'
        const gitOrHelmAuth = 'Helm'
        const gitAuthType = "http"
        const userOrPublicKey = Cypress.env("gh_private_user")
        const pwdOrPrivateKey = Cypress.env("gh_private_pwd")
    
        cy.fleetNamespaceToggle('fleet-default');
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitOrHelmAuth, gitAuthType, userOrPublicKey, pwdOrPrivateKey});
        cy.clickButton('Create');
        cy.verifyTableRow(0, 'Active', /([1-9]\d*)\/\1/);
        cy.accesMenuSelection(dsFirstClusterName, 'Storage', 'ConfigMaps');
        cy.nameSpaceMenuToggle('All Namespaces');
        cy.filterInSearchBox('fleet-test-configmap');
        cy.get('.col-link-detail').contains('fleet-test-configmap').should('be.visible').click({ force: true });
        cy.get('section#data').should('contain', 'default-name').and('contain', 'value');
        cy.deleteAllFleetRepos();
      })
    )  
  });

// Error will occur when use ForceUpdate.
// In 2.9 we are skipping due flakiness in the test.
if (!/\/2\.9/.test(Cypress.env('rancher_version'))) {
  describe('Test Self-Healing on IMMUTABLE resources when correctDrift is enabled', { tags: '@p1'}, () => {
    const correctDriftTestData: testData[] = [
      { qase_id: 80,
        repoName: "ds-cluster-correct-80",
        resourceType: "ConfigMaps",
        resourceName: "mp-app-config",
        resourceLocation: "Storage",
        resourceNamespace: "test-fleet-mp-config",
        dataToAssert: "test, test_key",
      },
      { qase_id: 79,
        repoName: "ds-cluster-correct-79",
        resourceType: "Services",
        resourceName: "mp-app-service",
        resourceLocation: "Service Discovery",
        resourceNamespace: "test-fleet-mp-service",
        dataToAssert: "6341 ",
      },
    ]
  
    correctDriftTestData.forEach(
      ({qase_id, repoName, resourceType, resourceName, resourceLocation, resourceNamespace, dataToAssert}) => {
        qase(qase_id,
          it(`Fleet-${qase_id}: Test IMMUTABLE resource "${resourceType}" will NOT be self-healed when correctDrift is set to true.`, { tags: `@fleet-${qase_id}` }, () => {
            const path = "multiple-paths"
  
            // Add GitRepo by enabling 'correctDrift'
            cy.fleetNamespaceToggle('fleet-default')
            cy.addFleetGitRepo({ repoName, repoUrl, branch, path, correctDrift: 'yes' });
            cy.clickButton('Create');
            cy.checkGitRepoStatus(repoName, '2 / 2');
            cy.accesMenuSelection(dsFirstClusterName, resourceLocation, resourceType);
            cy.nameSpaceMenuToggle(resourceNamespace);
            cy.filterInSearchBox(resourceName);
            cy.get('.col-link-detail').contains(resourceName).should('be.visible');
            cy.verifyTableRow(0, resourceName);
            cy.open3dotsMenu(resourceName, 'Edit Config');
  
            if (resourceType === 'ConfigMaps') {
              cy.clickButton('Add');
              cy.get('[data-testid="input-kv-item-key-1"]').eq(0).focus().type('test_key');
              cy.get('div.code-mirror.as-text-area').eq(1).click().type("test_data_value");
              cy.clickButton('Add');
            }
            else if (resourceType === 'Services') {
              cy.get("input[type=number]").clear().type("6341");
            }
  
            else  {
              throw new Error(`Resource "${resourceType}" is invalid  / not implemented yet`);
            }

            cy.wait(500);
            cy.clickButton('Save');
            cy.filterInSearchBox(resourceName);
            cy.verifyTableRow(0, resourceName, dataToAssert);

            // Adding more wait for 30seconds to capture the error if occurred after modifying the resources.
            cy.wait(30000);
            cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
            cy.verifyTableRow(0, 'Active', repoName);

            // Check All clusters are in healthy state after performing any modification to the resources.
            dsAllClusterList.forEach((dsCluster) => {
              // Adding wait to load page correctly to avoid interference with hamburger-menu.
              cy.wait(500);
              cy.accesMenuSelection('Continuous Delivery', 'Clusters');
              cy.contains('.title', 'Clusters').should('be.visible');
              cy.filterInSearchBox(dsCluster);
              cy.verifyTableRow(0, 'Active', dsCluster);
            })

            // Any mutable resource will reconcile to it's original state immediately
            // But with ConfigMaps and Services, it is not because they are immutable i.e.
            // they didn't reconciled when `correctDrift` is enabled.
            cy.deleteAllFleetRepos();

            // Delete leftover resources if there are any on each downstream cluster.
            // Currently, service is getting deleted from cluster, hence adding check for it.
            dsAllClusterList.forEach((dsCluster) => {
              // Adding wait to load page correctly to avoid interference with hamburger-menu.
              cy.wait(500);
              cy.accesMenuSelection(dsCluster, "Service Discovery", "Services");
              cy.nameSpaceMenuToggle(resourceNamespace);
              cy.filterInSearchBox(resourceName);
              cy.deleteAll(false);
            })
          })
        )
      }
    )
  });
}

if (!/\/2\.7/.test(Cypress.env('rancher_version')) && !/\/2\.8/.test(Cypress.env('rancher_version'))) {

  describe('Tests with disablePolling', { tags: '@p1' }, () => {
  
    const gh_private_pwd = Cypress.env('gh_private_pwd');
    const repoName = 'test-disable-polling';

    // Function to prepare Github repo used in the test
    // It will make sure it starts with 2 replicas and changes it to 5
    // We use this instead of hook to make it more resilient
    function prepareGithubRepoReplicas() {

      // Ensuring Github repo has desired amount of replicas (2)
      cy.exec('bash assets/disable_polling_reset_2_replicas.sh', { env: { gh_private_pwd } }).then((result) => {
        cy.log(result.stdout, result.stderr);
      });

      cy.fleetNamespaceToggle('fleet-local');
      cy.clickButton('Add Repository');

      // Pass YAML file (no previous additions of Name, urls or paths)
      cy.clickButton('Edit as YAML');
      cy.addYamlFile('assets/disable_polling.yaml');
      cy.clickButton('Create');
      cy.checkGitRepoStatus('test-disable-polling', '1 / 1', '1 / 1');

      // Change replicas to 5
      cy.exec('bash assets/disable_polling_setting_5_replicas.sh').then((result) => {
        cy.log(result.stdout, result.stderr);
      });
    }
    
    if (!/\/2\.9/.test(Cypress.env('rancher_version'))) { 
    // Skipping in 2.9 due to https://github.com/rancher/fleet/issues/3048
    qase(126,
      it(
        'Fleet-126: Test when `disablePolling=true` and forcing update Gitrepo will sync latest changes from Github',
        { tags: '@fleet-126', retries: 1 }, // TODO: Retry added to avoid intermittent failures. Remove once fixed.
        () => {

          prepareGithubRepoReplicas()
          
          // Forcing 15 seconds of wait to check if changes occur after this time.
          cy.wait(15000);

          // Verify deployment is 2 despite having changed to 5 in original repo
          cy.accesMenuSelection('local', 'Workloads', 'Deployments');
          cy.filterInSearchBox('nginx-test-polling');
          cy.wait(500);

          // TODO: remove once this bug is fixed: 
          // https://github.com/rancher/dashboard/issues/14295#issuecomment-2862105017
          cy.closePopWindow('Warning')

          cy.log('HERE WE SHOULD SEE 2/2');
          cy.contains('tr.main-row', 'nginx-test-polling', { timeout: 20000 }).should('be.visible');
          cy.screenshot('Screenshot BEFORE reloading should be 2/2');
          cy.contains('tr.main-row', 'nginx-test-polling', { timeout: 20000 }).should('be.visible');
          cy.screenshot('Screenshot AFTER reloading should be 2/2');
          cy.verifyTableRow(0, 'Active', '2/2');

          cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
          cy.fleetNamespaceToggle('fleet-local');
          cy.open3dotsMenu('test-disable-polling', 'Force Update');
          cy.wait(2000); // Wait to let time for Update to take effect.
          cy.checkGitRepoStatus('test-disable-polling', '1 / 1', '1 / 1');

          // Verify deployment changes to 5
          cy.accesMenuSelection('local', 'Workloads', 'Deployments');
          cy.filterInSearchBox('nginx-test-polling');
          cy.verifyTableRow(0, 'Active', '5/5');
        }
      )
    )};

    qase(124,
      it(
        'Fleet-124: Test when `disablePolling=true` Gitrepo will not sync latest changes from Github',
        { tags: '@fleet-124' },
        () => {

          prepareGithubRepoReplicas()

          // Forcing 15 seconds of wait to check if changes occur after this time.
          cy.wait(15000);

          // Verify deployment is 2 despite having changed to 5 in original repo
          cy.accesMenuSelection('local', 'Workloads', 'Deployments');
          cy.filterInSearchBox('nginx-test-polling');
          cy.verifyTableRow(0, 'Active', '2/2');
        }
      )
    );

    qase(125,
      it(
        'Fleet-125: Test when `disablePolling=true` and pausing / unpausing Gitrepo will sync latest changes from Github',
        { tags: '@fleet-125' },
        () => {

          prepareGithubRepoReplicas()

          cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
          cy.fleetNamespaceToggle('fleet-local');
          cy.open3dotsMenu(repoName, 'Pause');

          // TODO: remove once this bug is fixed: 
          // https://github.com/rancher/dashboard/issues/14295#issuecomment-2862105017
          cy.closePopWindow('Warning')

          cy.verifyTableRow(0, 'Paused');
          cy.wait(2000); // Wait to let time for pause to take effect.
          cy.open3dotsMenu(repoName, 'Unpause');

          // TODO: remove once this bug is fixed: 
          // https://github.com/rancher/dashboard/issues/14295#issuecomment-2862105017
          cy.closePopWindow('Warning')

          cy.verifyTableRow(0, 'Active');
          // Verify deployment changes to 5?
          cy.accesMenuSelection('local', 'Workloads', 'Deployments');
          cy.filterInSearchBox('nginx-test-polling');
          cy.verifyTableRow(0, 'Active', '5/5');
        }
      )
    );
  });
}

describe('Test application deployment based on clusterGroup', { tags: '@p1'}, () => {
  const value = 'value_prod'

  beforeEach('Cleanup leftover GitRepo, ClusterGroup or label etc. if any.', () => {
    cy.login();
    cy.visit('/');
    // Remove labels from the clusters.
    dsAllClusterList.forEach(
      (dsCluster) => {
        // Adding wait to load page correctly to avoid interference with hamburger-menu.
        cy.wait(500);
        cy.removeClusterLabels(dsCluster, key, value);
      }
    )
    cy.deleteClusterGroups();
    cy.deleteAllFleetRepos();
  })

  const clusterGroup: testData[] = [
    {
      qase_id: 25,
      test_explanation: "install single application to the all defined clusters in the 'clusterGroup'",
    },
    {
      qase_id: 27,
      test_explanation: "install existing application to the third cluster by adding it to the existing 'clusterGroup'",
    },
  ]

  clusterGroup.forEach(({ qase_id, test_explanation }) => {
      qase(qase_id,
        it(`Fleet-${qase_id}: Test ${test_explanation}`, { tags: `@fleet-${qase_id}` }, () => {
          const repoName = `default-single-app-cluster-group-${qase_id}`

          cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
          cy.clickNavMenu(['Clusters']);
          cy.contains('.title', 'Clusters').should('be.visible');

          // Assign label to the first 2 clusters i.e. imported-0 and imported-1
          dsFirstTwoClusterList.forEach(
            (dsCluster) => {
              cy.assignClusterLabel(dsCluster, key, value);
            }
          )

          // Create group of cluster consists of same label.
          cy.clickNavMenu(['Cluster Groups']);
          cy.contains('.title', 'Cluster Groups').should('be.visible');
          cy.createClusterGroup(clusterGroupName, key, value, bannerMessageToAssert);
          cy.clusterCountClusterGroup(clusterGroupName, 2);

          // Create a GitRepo targeting cluster group created.
          cy.addFleetGitRepo({ repoName, repoUrl, branch, path, deployToTarget: clusterGroupName });
          cy.clickButton('Create');
          cy.checkGitRepoStatus(repoName, '1 / 1');

          // Check application status on both clusters i.e. imported-0 and imported-1
          dsFirstTwoClusterList.forEach(
            (dsCluster) => {
              cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces');
            }
          )

          if (qase_id === 27) {
            cy.accesMenuSelection('Continuous Delivery', 'Clusters');
            cy.contains('.title', 'Clusters').should('be.visible');

            // Add label to the third cluster i.e. imported-2
            cy.assignClusterLabel(dsThirdClusterName, key, value);

            // Check existing clusterGroup for third cluster (imported-2) is added.
            cy.clusterCountClusterGroup(clusterGroupName, 3);

            // Check application is deployed on third cluster i.e. imported-2
            cy.checkApplicationStatus(appName, dsThirdClusterName, 'All Namespaces');

            // Remove label from the third cluster i.e. imported-2
            cy.wait(500);
            cy.removeClusterLabels(dsThirdClusterName, key, value);
          }

          // Remove labels from the All 3 clusters.
          dsAllClusterList.forEach(
            (dsCluster) => {
              // Adding wait to load page correctly to avoid interference with hamburger-menu.
              cy.wait(500);
              cy.removeClusterLabels(dsCluster, key, value);
            }
          )
          cy.deleteClusterGroups();
        })
      )
    }
  )

  qase(26,
    it("Fleet-26: Test install multiple applications to the all defined clusters in the 'clusterGroup'", { tags: '@fleet-26' }, () => {
      const repoName = 'default-single-app-cluster-group-26'
      const path2 = 'multiple-paths/config'

      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
      cy.contains('.title', 'Clusters').should('be.visible');

      // Assign label to the first 2 clusters i.e. imported-0 and imported-1
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          cy.assignClusterLabel(dsCluster, key, value);
        }
      )

      // Create group of cluster consists of same label.
      cy.clickNavMenu(['Cluster Groups']);
      cy.contains('.title', 'Cluster Groups').should('be.visible');
      cy.createClusterGroup(clusterGroupName, key, value, bannerMessageToAssert);

      // Create a GitRepo targeting cluster group created.
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, path2, deployToTarget: clusterGroupName });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '2 / 2');

      // Check first application status on both clusters i.e. imported-0 and imported-1
      dsFirstTwoClusterList.forEach((dsCluster) => {
        cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces');
      })

      dsFirstTwoClusterList.forEach((dsCluster) => {
        // Check second application status on both clusters i.e. imported-0 and imported-1
        // Adding wait to load page correctly to avoid interference with hamburger-menu.
        cy.wait(500);
        cy.accesMenuSelection(dsCluster, "Storage", "ConfigMaps");
        cy.nameSpaceMenuToggle("test-fleet-mp-config");
        cy.filterInSearchBox("mp-app-config");
        cy.get('td.col-link-detail > span').contains("mp-app-config").click();
      })

      // Remove labels from the clusters i.e. imported-0 and imported-1
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          // Adding wait to load page correctly to avoid interference with hamburger-menu.
          cy.wait(500);
          cy.removeClusterLabels(dsCluster, key, value);
        }
      )
    })
  )

  qase(28,
    it("Fleet-28: Test remove existing application from cluster-2 by removing it from an existing 'clusterGroup'", { tags: '@fleet-28' }, () => {
      const repoName = 'default-single-app-cluster-group-28'
      const dsSecondClusterName = dsAllClusterList[1]

      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
      cy.contains('.title', 'Clusters').should('be.visible');

      // Assign label to the clusters 
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          cy.assignClusterLabel(dsCluster, key, value);
        }
      )

      // Create group of cluster consists of same label.
      cy.clickNavMenu(['Cluster Groups']);
      cy.contains('.title', 'Cluster Groups').should('be.visible');
      cy.createClusterGroup(clusterGroupName, key, value, bannerMessageToAssert);

      // Create a GitRepo targeting cluster group created.
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, deployToTarget: clusterGroupName });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1');

      // Check first application status on both clusters.
      dsFirstTwoClusterList.forEach((dsCluster) => {
        cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces');
      })

      // Check application is not installed on third cluster i.e. imported-2
      cy.checkApplicationStatus(appName, dsThirdClusterName, 'All Namespaces', false);

      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
      cy.contains('.title', 'Clusters').should('be.visible');

      // Remove label from the Second cluster i.e. imported-1
      cy.wait(500);
      cy.removeClusterLabels(dsSecondClusterName, key, value);

      // Check application is absent i.e. removed from second cluster i.e. imported-1
      cy.checkApplicationStatus(appName, dsSecondClusterName, 'All Namespaces', false);

      // Check application is available on first cluster i.e. imported-0

      // Remove labels from the clusters.
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          // Adding wait to load page correctly to avoid interference with hamburger-menu.
          cy.wait(500);
          cy.removeClusterLabels(dsCluster, key, value);
        }
      )
      // Delete clusterGroups.
      cy.deleteClusterGroups();
    })
  )

  qase(29,
    it("Fleet-29: Test install app to new set of clusters from old set of clusters using 'clusterGroup'", { tags: '@fleet-29' }, () => {
      const repoName = 'default-single-app-cluster-group-29'
      const new_key = 'key_third_cluster'
      const new_value = 'value_third_cluster'
      const newClusterGroupName = 'cluster-group-env-third-cluster'

      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
      cy.contains('.title', 'Clusters').should('be.visible');

      // Check application status on both clusters i.e. imported-0 and imported-1
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          cy.assignClusterLabel(dsCluster, key, value);
        }
      )

      // Create group of cluster consists of same label.
      cy.clickNavMenu(['Cluster Groups']);
      cy.contains('.title', 'Cluster Groups').should('be.visible');
      cy.createClusterGroup(clusterGroupName, key, value, bannerMessageToAssert);

      // Create a GitRepo targeting cluster group created.
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, deployToTarget: clusterGroupName });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1');

      // Check first application status on both clusters i.e. imported-0 and imported-1
      dsFirstTwoClusterList.forEach((dsCluster) => {
        cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces');
      })

      // Add label to the third cluster
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.clickNavMenu(['Clusters']);
      cy.contains('.title', 'Clusters').should('be.visible');
      cy.assignClusterLabel(dsThirdClusterName, new_key, new_value);

      // Create another clusterGroup using third cluster.
      const newBannerMessageToAssert = /Matches 1 of 3 existing clusters: "imported-\d"/
      cy.clickNavMenu(['Cluster Groups']);
      cy.contains('.title', 'Cluster Groups').should('be.visible');
      cy.createClusterGroup(newClusterGroupName, new_key, new_value, newBannerMessageToAssert);

      // Update GitRepo with newly created clusterGroup.
      cy.addFleetGitRepo({ repoName, deployToTarget: newClusterGroupName, fleetNamespace: 'fleet-default', editConfig: true });
      cy.clickButton('Save');
      cy.checkGitRepoStatus(repoName, '1 / 1');

      // Check application is present on third cluster i.e. imported-2
      cy.checkApplicationStatus(appName, dsThirdClusterName, 'All Namespaces');

      // Check application status on first 2 clusters i.e. imported-0 and imported-1
      // Application should be removed from first 2 clusters i.e. imported-0 and imported-1
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces', false);
        }
      )

      // Remove labels from the clusters i.e. imported-0 and imported-1
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          // Adding wait to load page correctly to avoid interference with hamburger-menu.
          cy.wait(500);
          cy.removeClusterLabels(dsCluster, key, value);
        }
      )

      // Remove labels from third cluster i.e. imported-2
      cy.removeClusterLabels(dsThirdClusterName, new_key, new_value);

      // Delete clusterGroups.
      cy.deleteClusterGroups();
    })
  )
});

describe("Test Application deployment based on 'clusterSelector'", { tags: '@p1'}, () => {
  const key = 'key_env'
  const value = 'value_testing'
  let gitRepoFile

  beforeEach('Cleanup leftover GitRepo if any.', () => {
    cy.login();
    cy.visit('/');
    // Remove labels from the clusters.
    dsAllClusterList.forEach(
      (dsCluster) => {
        // Adding wait to load page correctly to avoid interference with hamburger-menu.
        cy.wait(500);
        cy.removeClusterLabels(dsCluster, key, value);
      }
    )
    

    cy.deleteAllFleetRepos();
  })

  const clusterSelector: testData[] = [
    {
      qase_id: 9,
      app: 'single-app',
      test_explanation: "single-app to the 2 clusters",
      bundle_count: '1 / 1',
    },
    {
      qase_id: 18,
      app: 'multiple-apps',
      test_explanation: "multiple-apps to the 2 clusters",
      bundle_count: '2 / 2',
    },
    {
      qase_id: 20,
      app: 'single-app',
      test_explanation: "install existing application to the third cluster by adding it to the existing",
      bundle_count: '1 / 1',
    },
  ]

  clusterSelector.forEach(({ qase_id, app, test_explanation, bundle_count }) => {
    qase(qase_id,
      it(`Test install ${test_explanation} using clusterSelector(matchLabels) in GitRepo`, { tags: `@fleet-${qase_id}` }, () => {

        cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
        cy.clickNavMenu(['Clusters']);
        cy.contains('.title', 'Clusters').should('be.visible');
  
        // Assign label to the clusters 
        dsFirstTwoClusterList.forEach(
          (dsCluster) => {
            cy.assignClusterLabel(dsCluster, key, value);
          }
        )

        // Get GitRepo YAML file according to test.
        if (qase_id === 9 || qase_id === 20) {
          gitRepoFile = 'assets/git-repo-single-app-cluster-selector.yaml'
        }
        else if (qase_id === 18){
          gitRepoFile = 'assets/git-repo-multiple-app-cluster-selector.yaml'
        }
        else {
          throw Error("There is not GitRepo file present for given test case.")
        }

        // Create a GitRepo targeting cluster group created from YAML.
        cy.clickNavMenu(['Git Repos']);
        cy.wait(500);


        // TODO: remove once this bug is fixed: 
        // https://github.com/rancher/dashboard/issues/14295#issuecomment-2862105017
        cy.closePopWindow('Warning')

        cy.clickButton('Add Repository');
        cy.contains('Git Repo:').should('be.visible');
        cy.clickButton('Edit as YAML');
        cy.addYamlFile(gitRepoFile);
        cy.clickButton('Create');
        cy.checkGitRepoStatus(`default-${app}-cluster-selector`, `${bundle_count}`);

        // Check application status on both clusters.
        dsFirstTwoClusterList.forEach(
          (dsCluster) => {
            cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces');
          }
        )

        // Add same label on third cluster
        if (qase_id === 20) {
          cy.accesMenuSelection('Continuous Delivery', 'Clusters');
          cy.contains('.title', 'Clusters').should('be.visible');

          // Add label to the third cluster
          cy.assignClusterLabel(dsThirdClusterName, key, value);

          // Check application deployed to third cluster
          cy.wait(500);
          cy.checkApplicationStatus(appName, dsThirdClusterName, 'All Namespaces');

          // Remove label from the third cluster.
          cy.wait(500);
          cy.removeClusterLabels(dsThirdClusterName, key, value);
        }

        // Check another application on each cluster.
        // This check is valid for deploy muilple application
        // on cluster selector test only.
        if (qase_id === 18) {
          dsFirstTwoClusterList.forEach((dsCluster) => {
            // Check second application status on both clusters.
            // Adding wait to load page correctly to avoid interference with hamburger-menu.
            cy.wait(500);
            cy.accesMenuSelection(dsCluster, "Storage", "ConfigMaps");
            cy.nameSpaceMenuToggle("test-fleet-mp-config");
            cy.filterInSearchBox("mp-app-config");
            cy.get('td.col-link-detail > span').contains("mp-app-config").click();
          })
        }

        // Remove labels from the clusters.
        dsFirstTwoClusterList.forEach(
          (dsCluster) => {
            // Adding wait to load page correctly to avoid interference with hamburger-menu.
            cy.wait(500);
            cy.removeClusterLabels(dsCluster, key, value);
          }
        )
      })
    )
  })

  qase(19,
    it("Fleet-19: Test remove label from cluster-2 to remove application from it when application deployed using clusterSelector(matchLabels)", { tags: '@fleet-19' }, () => {
      const dsSecondClusterName = dsAllClusterList[1]
      gitRepoFile = 'assets/git-repo-multiple-app-cluster-selector.yaml'

      cy.accesMenuSelection('Continuous Delivery', 'Clusters');
      cy.contains('.title', 'Clusters').should('be.visible');

      // Assign label to the clusters 
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          cy.assignClusterLabel(dsCluster, key, value);
        }
      )

      // Create a GitRepo targeting cluster group created from YAML.
      cy.clickNavMenu(['Git Repos']);
      cy.wait(500);
      
      
      // TODO: remove once this bug is fixed: 
      // https://github.com/rancher/dashboard/issues/14295#issuecomment-2862105017
      cy.closePopWindow('Warning')
      
      cy.clickButton('Add Repository');
      cy.contains('Git Repo:').should('be.visible');
      cy.clickButton('Edit as YAML');
      cy.addYamlFile(gitRepoFile);
      cy.clickButton('Create');
      cy.checkGitRepoStatus('default-multiple-apps-cluster-selector', '2 / 2');

      // Check first application status on both clusters.
      dsFirstTwoClusterList.forEach((dsCluster) => {
        cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces');
      })

      // Remove label from the Second cluster i.e. imported-1
      cy.wait(500);
      cy.removeClusterLabels(dsSecondClusterName, key, value);

      // Check application is absent i.e. removed from second cluster i.e. imported-1
      cy.checkApplicationStatus(appName, dsSecondClusterName, 'All Namespaces', false);

      // Check application is available on first cluster i.e. imported-0
      cy.checkApplicationStatus(appName, dsFirstClusterName, 'All Namespaces');

      // Remove labels from the clusters.
      dsFirstTwoClusterList.forEach(
        (dsCluster) => {
          // Adding wait to load page correctly to avoid interference with hamburger-menu.
          cy.wait(500);
          cy.removeClusterLabels(dsCluster, key, value);
        }
      )
    })
  )
});

describe("Test Application deployment based on 'clusterGroupSelector'", { tags: '@p1'}, () => {
  const clusterGroupLabelKey = 'cluster_group_selector_env'
  const clusterGroupLabelValue = 'cluster_group_selector_test'
  let clusterGroupSelectorFile

  beforeEach('Cleanup leftover GitRepo if any.', () => {
    cy.login();
    cy.visit('/');
    // Remove labels from the clusters.
    dsAllClusterList.forEach(
      (dsCluster) => {
        // Adding wait to load page correctly to avoid interference with hamburger-menu.
        cy.wait(500);
        cy.removeClusterLabels(dsCluster, key, value);
      }
    )

    // TODO: remove once this bug is fixed: 
    // https://github.com/rancher/dashboard/issues/14295#issuecomment-2862105017
    cy.closePopWindow('Warning')

    cy.deleteClusterGroups();
    cy.deleteAllFleetRepos();
  })

  const clusterSelector: testData[] = [
    {
      qase_id: 30,
      app: 'single-app',
      test_explanation: "single-app to the multiple",
      bundle_count: '1 / 1',
    },
    {
      qase_id: 31,
      app: 'multi-apps',
      test_explanation: "multiple-apps to the multiple",
      bundle_count: '2 / 2',
    },
    {
      qase_id: 32,
      app: 'single-app',
      test_explanation: "install existing application to the third cluster by adding it to the existing",
      bundle_count: '1 / 1',
    },
  ]

  clusterSelector.forEach(({ qase_id, app, test_explanation, bundle_count }) => {
    qase(qase_id,
      it(`Fleet-${qase_id}: Test install ${test_explanation}  cluster using "clusterGroupSelector"`, { tags: `@fleet-${qase_id}` }, () => {

        cy.accesMenuSelection('Continuous Delivery', 'Clusters');
        cy.contains('.title', 'Clusters').should('be.visible');

        // Assign label to the first 2 clusters i.e. imported-0 and imported-1
        dsFirstTwoClusterList.forEach(
          (dsCluster) => {
            cy.assignClusterLabel(dsCluster, key, value);
          }
        )

        // Create group of cluster consists of same label.
        cy.clickNavMenu(['Cluster Groups']);
        cy.contains('.title', 'Cluster Groups').should('be.visible');
        cy.createClusterGroup(clusterGroupName, key, value, bannerMessageToAssert, true, clusterGroupLabelKey, clusterGroupLabelValue);

        // Get GitRepo YAML file according to test.
        if (qase_id === 30 || qase_id === 32) {
          clusterGroupSelectorFile = 'assets/gitrepo-single-app-cluster-group-selector.yaml'
        }
        else if (qase_id === 31){
          clusterGroupSelectorFile = 'assets/gitrepo-multi-app-cluster-group-selector.yaml'
        }
        else {
          throw Error("There is not GitRepo file present for given test case.")
        }

        // Create a GitRepo targeting cluster group created from YAML.
        cy.clickNavMenu(['Git Repos']);
        cy.wait(500);

        // TODO: remove once this bug is fixed: 
        // https://github.com/rancher/dashboard/issues/14295#issuecomment-2862105017
        cy.closePopWindow('Warning')

        cy.clickButton('Add Repository');
        cy.contains('Git Repo:').should('be.visible');
        cy.clickButton('Edit as YAML');
        cy.addYamlFile(clusterGroupSelectorFile);
        cy.clickButton('Create');
        cy.checkGitRepoStatus(`default-${app}-cluster-group-selector`, `${bundle_count}`);

        // Check application status on both clusters.
        dsFirstTwoClusterList.forEach(
          (dsCluster) => {
            cy.checkApplicationStatus(appName, dsCluster, 'All Namespaces');
          }
        )

        // Ensure application is not present on third cluster i.e. imported-2
        // by passing 'present: false' to 'checkApplicationStatus'
        cy.checkApplicationStatus(appName, dsThirdClusterName, 'All Namespaces', false);

        // Add same label on third cluster i.e. imported-2
        if (qase_id === 32) {
          cy.accesMenuSelection('Continuous Delivery', 'Clusters');
          cy.contains('.title', 'Clusters').should('be.visible');

          // Add label to the third cluster i.e. imported-2
          cy.assignClusterLabel(dsThirdClusterName, key, value);

          // Check application deployed to third cluster(imported-2)
          // Along with other 2 clusters (imported-0 and imported-1).
          cy.wait(500);
          cy.checkApplicationStatus(appName, dsThirdClusterName, 'All Namespaces');

          // Remove label from the third cluster.
          cy.wait(500);
          cy.removeClusterLabels(dsThirdClusterName, key, value);
        }

        // Check another application on each cluster.
        // This check is valid for deploy muilple application
        // on cluster selector test only.
        if (qase_id === 31) {
          dsFirstTwoClusterList.forEach((dsCluster) => {
            // Check second application status on both clusters.
            // Adding wait to load page correctly to avoid interference with hamburger-menu.
            cy.wait(500);
            cy.accesMenuSelection(dsCluster, "Storage", "ConfigMaps");
            cy.nameSpaceMenuToggle("test-fleet-mp-config");
            cy.filterInSearchBox("mp-app-config");
            cy.get('td.col-link-detail > span').contains("mp-app-config").click();
          })
        }

        // Remove labels from the clusters.
        dsFirstTwoClusterList.forEach(
          (dsCluster) => {
            // Adding wait to load page correctly to avoid interference with hamburger-menu.
            cy.wait(500);
            cy.removeClusterLabels(dsCluster, key, value);
          }
        )
      })
    )
  })
});

if (!/\/2\.7/.test(Cypress.env('rancher_version')) && !/\/2\.8/.test(Cypress.env('rancher_version'))){

  describe('Test namespace deletion when bundle is deleted', { tags: '@p1'}, () => {
    
    qase(131,
      it("Fleet-131: Test NAMESPACE will be DELETED after GitRepo is deleted.", { tags: '@fleet-131' }, () => {
        const repoName = 'test-ns-deleted-when-bundle-deleted'
        const namespaceName = 'my-custom-namespace'

        cy.fleetNamespaceToggle('fleet-local');
        cy.clickButton('Add Repository');
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

        cy.fleetNamespaceToggle('fleet-local');
        // cy.clickButton('Add Repository');
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
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
        cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
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
};

if (!/\/2\.7/.test(Cypress.env('rancher_version')) && !/\/2\.8/.test(Cypress.env('rancher_version'))) {
  describe('Test Fleet Resource Count', { tags: '@p1'}, () => {
    qase(155,
      it("Fleet-155: Test clusters resource count is correct", { tags: '@fleet-155' }, () => {

        const repoName = 'default-cluster-count-155'
        const branch = "master"
        const path = "simple"
        const repoUrl = "https://github.com/rancher/fleet-examples"
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
        cy.checkGitRepoStatus(repoName, '1 / 1', resourceCount);

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
}

describe('Test move cluster to newly created workspace and deploy application to it.', { tags: '@p1'}, () => {
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

      //Version check for 2.11 (head) onwards
      const rancherVersion = Cypress.env('rancher_version')
      const alpha_or_prime_versions = [/^(prime|prime-optimus|alpha)\/2\.(1[1-9]|[2-9]\d*)(\..*)?$/];
      const devel_or_head_versions = ["latest/devel/head", "latest/devel/2.11"]

      if (devel_or_head_versions.includes(rancherVersion) || alpha_or_prime_versions.some(regex => regex.test(rancherVersion))) {
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
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1', '6 / 6');

      // Delete GitRepo
      // In Fleet Workspace, namespace name similarly treated as namespace.
      cy.deleteAllFleetRepos(newWorkspaceName);

      // Move cluster back to 'fleet-default' workspace
      cy.fleetNamespaceToggle(newWorkspaceName);
      cy.restoreClusterToDefaultWorkspace(dsFirstClusterName, timeout);

      // Delete the newly created workspace
      cy.clickNavMenu(['Advanced', 'Workspaces']);
      cy.filterInSearchBox(newWorkspaceName)
      cy.deleteAll(false);
    })
  )
});

describe('Test Helm app with Custom Values', { tags: '@p1' }, () => {
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
        cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
        cy.fleetNamespaceToggle('fleet-local')
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
        cy.clickButton('Create');
        cy.verifyTableRow(0, 'Active', repoName);
        cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

        // Create ConfigMap before create GitRepo
        if (qase_id === 173 || qase_id === 174) {
          cy.deleteConfigMap(configMapName);
        }
        // Delete GitRepo
        cy.deleteAllFleetRepos();
      })
    );
  });
});
