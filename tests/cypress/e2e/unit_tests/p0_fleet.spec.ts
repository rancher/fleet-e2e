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
import { qase } from 'cypress-qase-reporter/dist/mocha';

export const appName = "nginx-keep";
export const clusterName = "imported-0";
export const branch = "main";
export const path  = "nginx"

beforeEach(() => {
  cy.login();
  cy.visit('/');
  cy.deleteAllFleetRepos();
});

Cypress.config();
describe('Test Fleet deployment on PUBLIC repos',  { tags: '@p0' }, () => {
  qase(62,
    it('FLEET-62: Deploy application to local cluster', { tags: '@fleet-62' }, () => {

      const repoName = "local-cluster-fleet-62"
      const branch = "master"
      const path = "simple"
      const repoUrl = "https://github.com/rancher/fleet-examples"

      cy.fleetNamespaceToggle('fleet-local');
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      // Adding check validate "Edit as Yaml" works
      cy.clickButton('Edit as YAML');
      cy.contains('apiVersion: fleet.cattle.io/v1alpha1').should('be.visible');
      cy.clickButton('Create')
      cy.checkGitRepoStatus(repoName, '1 / 1', '6 / 6');
      cy.verifyTableRow(1, 'Service', 'frontend');
      cy.verifyTableRow(3, 'Service', 'redis-master');
      cy.verifyTableRow(5, 'Service', 'redis-slave');
      cy.deleteAllFleetRepos();
    })
  );
});

describe('Test Fleet deployment on PRIVATE repos with HTTP auth', { tags: '@p0' }, () => {

  const gitAuthType = "http"
  const repoTestData: testData[] = [
    {qase_id: 6, provider: 'GitLab',  repoUrl: 'https://gitlab.com/fleetqa/fleet-qa-examples.git'},
    {qase_id: 7, provider: 'Gh',  repoUrl: 'https://github.com/fleetqa/fleet-qa-examples.git'},
    {qase_id: 8, provider: 'Bitbucket', repoUrl: 'https://bitbucket.org/fleetqa-bb/fleet-qa-examples.git'},
    {qase_id: 98, provider: 'Azure',  repoUrl: 'https://dev.azure.com/fleetqateam/fleet-qa-examples/_git/fleet-qa-examples'}
  ]

  repoTestData.forEach(({ qase_id, provider, repoUrl }) => {
    qase(qase_id,
      it(`FLEET-${qase_id}: Test to install "NGINX" app using "HTTP" auth on "${provider}" PRIVATE repository`, { tags: `@fleet-${qase_id}`, retries: 1 }, () => {

        const repoName = `default-cluster-fleet-${qase_id}`
        const userOrPublicKey = Cypress.env(`${provider.toLowerCase()}_private_user`)
        const pwdOrPrivateKey = Cypress.env(`${provider.toLowerCase()}_private_pwd`)

        cy.fleetNamespaceToggle('fleet-default')
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey });
        cy.clickButton('Create');
        cy.checkGitRepoStatus(repoName, '1 / 1');
        cy.checkApplicationStatus(appName, clusterName);
        cy.deleteAllFleetRepos();
      })
    );
  });
});

describe('Test Fleet deployment on PRIVATE repos with SSH auth', { tags: '@p0' }, () => {
  
  const gitAuthType = "ssh"
  const userOrPublicKey = Cypress.env("rsa_public_key_qa")
  const pwdOrPrivateKey = Cypress.env("rsa_private_key_qa")
  const repoTestData: testData[] = [
    {qase_id: 2, provider: 'GitLab', repoUrl: 'git@gitlab.com:fleetqa/fleet-qa-examples.git'},
    {qase_id: 3, provider: 'Bitbucket', repoUrl: 'git@bitbucket.org:fleetqa-bb/fleet-qa-examples.git'},
    {qase_id: 4, provider: 'Github', repoUrl: 'git@github.com:fleetqa/fleet-qa-examples.git'},
    {qase_id: 97, provider: 'Azure', repoUrl: 'git@ssh.dev.azure.com:v3/fleetqateam/fleet-qa-examples/fleet-qa-examples'}
  ]
  
  repoTestData.forEach(({ qase_id, provider, repoUrl }) => {
    qase(qase_id,
      it(`FLEET-${qase_id}: Test to install "NGINX" app using "SSH" auth on "${provider}" PRIVATE repository`, { tags: `@fleet-${qase_id}`, retries: 1 }, () => {
        
        const repoName = `default-cluster-fleet-${qase_id}`

        cy.fleetNamespaceToggle('fleet-default')
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path, gitAuthType, userOrPublicKey, pwdOrPrivateKey });
        cy.clickButton('Create');
        cy.verifyTableRow(0, 'Active'); // Implicit wait due to https://github.corancher/dashboard/issues/12502
        cy.contains('0/0', { timeout: 20000 }).should('not.exist');
        cy.checkGitRepoStatus(repoName, '1 / 1');
        cy.checkApplicationStatus(appName, clusterName);
        cy.deleteAllFleetRepos();
      })
    );
  });
});

describe('Test Fleet deployment on PRIVATE repos using KNOWN HOSTS', { tags: '@p0' }, () => {
  const repoUrl = 'git@github.com:fleetqa/fleet-qa-examples.git';
  const secretKnownHostsKeys = ['assets/known-host.yaml', 'assets/known-host-missmatch.yaml'];

  before('Preparing known hosts secrets via UI', () => {
    // Create known hosts from yaml file
    cy.exec(`bash assets/add-known-host.sh`).then((result) => {
      cy.log(result.stdout, result.stderr);
    });

    // Create secret via UI
    cy.login();
    cy.accesMenuSelection('local', 'Storage', 'Secrets');

    // Creating both known host keys in one loop
    secretKnownHostsKeys.forEach((secretKnownHostsKeys) => {
      cy.clickButton('Create');
      cy.contains('Public key and private key for SSH').should('be.visible').click();
      cy.clickButton('Edit as YAML');
      cy.addYamlFile(secretKnownHostsKeys);
      cy.clickButton('Create');
    });
  });

  qase(141,
    it('FLEET-141  Test to install "NGINX" app using "KNOWN HOSTS" auth on PRIVATE repository', { tags: '@fleet-141' }, () => {
      const repoName = 'local-cluster-fleet-141';
      const gitAuthType = 'ssh-key-knownhost';

      // Create private repo using known host
      cy.fleetNamespaceToggle('fleet-local');
      cy.addFleetGitRepo({ repoName, repoUrl, gitAuthType, branch, path });
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1');
    })
  );

  qase(143,
    it('FLEET-143  Test apps cannot be installed when using missmatched "KNOWN HOSTS" auth on PRIVATE repository',
      { tags: '@fleet-143' }, () => {
        const repoName = 'local-cluster-fleet-143';
        const gitAuthType = 'ssh-key-knownhost-missmatch';

        // Create private repo using known host
        cy.fleetNamespaceToggle('fleet-local');
        cy.addFleetGitRepo({ repoName, repoUrl, gitAuthType, branch, path });
        cy.clickButton('Create');

        // Enrure that apps cannot be installed && error appears
        cy.verifyTableRow(0, /Error|Git Updating/, '0/0');
        cy.contains('Ssh: handshake failed: knownhosts: key mismatch').should('be.visible');
    })
  );
});

describe('Test gitrepos with cabundle', { tags: '@p0' }, () => {
  qase(142,
    it("Fleet-142: Test Fleet can create cabundle secrets", { tags: '@fleet-142' }, () => {;
      
      const repoName = 'local-142-test-bundle-secrets'
      const repoUrl = 'https://github.com/rancher/fleet-examples'
      const branch = 'master'
      const path = 'simple'
      const tlsOption = "Specify additional certificates to be accepted"
      const tlsCertificate = "assets/cabundle-file.pem"
  
      cy.fleetNamespaceToggle('fleet-local');
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path, tlsOption, tlsCertificate });
      cy.clickButton('Create');
      cy.verifyTableRow(0, 'Active', '1/1');
      cy.accesMenuSelection('local', 'Storage', 'Secrets');
  
      // Confirm cabundle secret is created
      cy.nameSpaceMenuToggle('All Namespaces');
      cy.filterInSearchBox(repoName+'-cabundle');
      cy.verifyTableRow(0, 'Active', repoName+'-cabundle');
  
      // Delete repo and confirm secret is deleted
      cy.deleteAllFleetRepos();
      cy.accesMenuSelection('local', 'Storage', 'Secrets');
      cy.contains('-cabundle').should('not.exist');
    })
  );  

  qase(144,
    it("Fleet-144 Test cabundle secrets are not created without TLS certificate", { tags: '@fleet-144' }, () => {;
      
      const repoName = 'local-144-test-cabundle-secrets-not-created'
      const repoUrl = 'https://github.com/rancher/fleet-examples'
      const branch = 'master'
      const path = 'simple'
  
      cy.fleetNamespaceToggle('fleet-local');
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.clickButton('Create');
      cy.verifyTableRow(0, 'Active', '1/1');
      cy.accesMenuSelection('local', 'Storage', 'Secrets');
  
      // Confirm cabundle secret is NOT created for the specified gitrepo
      cy.nameSpaceMenuToggle('All Namespaces');
      cy.filterInSearchBox(repoName+'-cabundle');
      cy.contains('There are no rows which match your search query.').should('be.visible');
    })
  );  

});

if (!/\/2\.7/.test(Cypress.env('rancher_version')) && !/\/2\.8/.test(Cypress.env('rancher_version'))) {
  // New tests for jobs cleanup
  describe('Test Fleet job cleanup', { tags: '@p0' }, () => {
    
    const repoUrl = 'https://github.com/rancher/fleet-test-data/';
    const branch = 'master';
    const path = 'qa-test-apps/nginx-app';

    qase(145,
      it('Fleet-145: Test Fleet job cleanup', { tags: '@fleet-145' }, () => {

        const repoName = 'local-145-test-job-cleanup';
  
        cy.fleetNamespaceToggle('fleet-local');
        cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
        cy.clickButton('Create');
        cy.verifyTableRow(0, 'Active', '1/1');

        // Check jobs on recent events tab
        cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
        cy.verifyJobDeleted(repoName); 
      })
    );

  qase(146,
    it('Fleet-146: Test Fleet job clean-up works with Force Update', { tags: '@fleet-146' }, () => {

      const repoName = 'local-146-test-job-cleanup';

      cy.fleetNamespaceToggle('fleet-local');
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.clickButton('Create');
      cy.verifyTableRow(0, 'Active', '1/1');

      // Force update
      cy.open3dotsMenu(repoName, 'Force Update');
      cy.verifyTableRow(0, 'Active', '1/1');
      cy.wait(2000); // Wait to let time for Update to take effect.
    
      // Check job deletion on recent events tab
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
      cy.verifyJobDeleted(repoName);

    })
  );

  qase(147,
    it('Fleet-147: Test Fleet job clean-up works upon commit change', { tags: '@fleet-147' }, () => {

      const gh_private_pwd = Cypress.env('gh_private_pwd');
      const repoName = 'test-disable-polling';

      cy.exec('bash assets/disable_polling_reset_2_replicas.sh', { env: { gh_private_pwd } }).then((result) => {
        cy.log(result.stdout, result.stderr);
      });

      // Gitrepo adddition via YAML
      cy.fleetNamespaceToggle('fleet-local');
      cy.clickButton('Add Repository');
      cy.clickButton('Edit as YAML');
      cy.addYamlFile('assets/disable_polling.yaml');
      cy.clickButton('Create');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

      // Verify event deletion on recent events tab and job deletion 
      cy.verifyJobDeleted(repoName);    

      // Change replicas to 5
      cy.exec('bash assets/disable_polling_setting_5_replicas.sh').then((result) => {
        cy.log(result.stdout, result.stderr);
      });
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.fleetNamespaceToggle('fleet-local');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');

      // Verify event deletion on recent events tab and job deletion
      cy.verifyJobDeleted(repoName);
    })
  );

  qase(148,
    it('Fleet-148: Test Fleet job clean-up with unsuccessful job is not deleted', { tags: '@fleet-148' }, () => {
  
      const repoName = 'local-148-test-unsuscessful-job-is-not-deleted';
      const path = 'qa-test-apps/nginx-app-bad-path';
  
      cy.fleetNamespaceToggle('fleet-local');
      cy.addFleetGitRepo({ repoName, repoUrl, branch, path });
      cy.clickButton('Create');
      cy.verifyTableRow(0, /Git Updating|Error/, '0/0');
      
      cy.contains(repoName).click();
      cy.get('ul[role="tablist"]').contains('Recent Events').click();
      cy.get('section#events > div > table > tbody > tr.main-row').should('have.length', 2).then(() => {
         cy.contains('GotNewCommit', { timeout: 20000 }).should('be.visible');
         cy.contains('GitJob was created', { timeout: 20000 }).should('be.visible');
         cy.contains('job deletion triggered because job succeeded', { timeout: 20000 }).should('not.exist');
      });
      
      // Check job exists and it is NOT deleted
      // Confirm job disappears
      cy.accesMenuSelection('local', 'Workloads', 'Jobs');
      cy.nameSpaceMenuToggle('All Namespaces');
      cy.filterInSearchBox(repoName);
      cy.get('table > tbody > tr').contains(repoName).should('be.visible');
    })
  )});
};

describe('Test Fleet with Webhook', { tags: '@p0' }, () => {
  qase(152,
    it('Fleet-152: Test Fleet with Webhook and disable polling ', { tags: '@fleet-152' }, () => {

      const repoName = 'webhook-test-disable-polling';
      const gh_private_pwd = Cypress.env('gh_private_pwd');
      
      // Prepare webhook in Github
      cy.exec('bash assets/webhook-tests/webhook_setup.sh', { env: { gh_private_pwd } }).then((result) => {
        cy.log(result.stdout, result.stderr);
      })

      // Open local terminal in Rancher UI
      cy.accesMenuSelection('local');
      cy.get('#btn-kubectl').click();
      cy.contains('Connected').should('be.visible');

      // Add yaml file to the terminal to create ad-hoc ingress
      cy.get('button > i.icon.icon-upload.icon-lg').click();
      cy.addYamlFile('assets/webhook-tests/webhook_ingress.yaml');
      cy.clickButton('Import');
      cy.clickButton('Close');

      // Create webhook secret via terminal to be used in webhook
      // Workaround for 2.7 and 2.8. TODO: remove once decommissioned.
      if (/\/2\.7/.test(Cypress.env('rancher_version')) && /\/2\.8/.test(Cypress.env('rancher_version'))) {
        cy.get('.xterm-rows').then(() => {
          cy.type('kubectl create secret generic gitjob-webhook -n fleet-local --from-literal=github=webhooksecretvalue{enter}');
        });
      }

      else {
        cy.typeIntoCanvasTermnal('\
          kubectl create secret generic gitjob-webhook -n cattle-fleet-system --from-literal=github=webhooksecretvalue{enter}');
      };

      // Ensure webhook repo starts with 2 replicas
      cy.exec('bash assets/webhook-tests/webhook_test_2_replicas.sh', { env: { gh_private_pwd } }).then((result) => {
        cy.log(result.stdout, result.stderr);
      });

      // Gitrepo creation via YAML
      cy.accesMenuSelection('Continuous Delivery', 'Git Repos');
      cy.fleetNamespaceToggle('fleet-local');
      cy.clickButton('Add Repository');
      cy.clickButton('Edit as YAML');
      cy.addYamlFile('assets/webhook-tests/webhook_test_disable_polling.yaml');
      cy.clickButton('Create');
      cy.verifyTableRow(0, 'Active', '1/1');
      cy.checkGitRepoStatus(repoName, '1 / 1', '1 / 1');
      cy.verifyJobDeleted(repoName, false);

      // Verify deployments has 2 replicas only
      cy.accesMenuSelection('local', 'Workloads', 'Deployments');
      cy.filterInSearchBox(repoName);
      cy.wait(500);
      cy.contains('tr.main-row', repoName, { timeout: 20000 }).should('be.visible');
      cy.verifyTableRow(0, 'Active', '2/2');

      // Give extra time for job to finsih. 
      // TODO: remove this wait once https://github.com/rancher/fleet/issues/3067  is fixed
      // or find a way to wait for the job to finish
      cy.wait(10000);

      // Change replicas to 5
      cy.exec('bash assets/webhook-tests/webhook_test_5_replicas.sh').then((result) => {
        cy.log(result.stdout, result.stderr);
      });

      // Verify deployments has 5 replicas
      cy.verifyTableRow(0, 'Active', '5/5');
    })
  );
})
