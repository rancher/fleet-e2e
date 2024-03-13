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

import * as cypressLib from '@rancher-ecp-qa/cypress-library';


Cypress.config();
describe('First login on Rancher', () => {
    it('Log in and accept terms and conditions', () => {
    cypressLib.firstLogin();
    })

    it('Check ready state of local cluster after Rancher login', () => {
        cy.login();
        cy.visit('/');
        cypressLib.burgerMenuToggle();
        cypressLib.accesMenu('Continuous Delivery');
        cy.contains('Dashboard').should('be.visible')
        cypressLib.accesMenu('Clusters');
        cy.fleetNamespaceToggle('fleet-local')
        cy.verifyTableRow(0, 'Active', ' ')
        cy.get("td[data-testid='sortable-cell-0-2']", { timeout: 300000 }).should('not.contain', '0')
    })
})
