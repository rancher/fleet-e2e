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

// In this file you can write your custom commands and overwrite existing commands.

import 'cypress-file-upload';

// Generic commands
// ////////////////

Cypress.Commands.overwrite('type', (originalFn, subject, text, options = {}) => {
  options.delay = 100;
  return originalFn(subject, text, options);
});

// Add a delay between command without using cy.wait()
// https://github.com/cypress-io/cypress/issues/249#issuecomment-443021084
const COMMAND_DELAY = 1000;

for (const command of ['visit', 'click', 'trigger', 'type', 'clear', 'reload', 'contains']) {
  Cypress.Commands.overwrite(command, (originalFn, ...args) => {
    const origVal = originalFn(...args);

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(origVal);
      }, COMMAND_DELAY);
    });
  });
}; 

// Fleet commands

// Add path on "Git Repo:Create"
Cypress.Commands.add('addPathOnGitRepoCreate', (path) => {
  cy.get("input[data-testid='input-0'][placeholder='e.g. /directory/in/your/repo']").
    type(path);
})

// WIP To be improved
// It should return value given a coluname and another row parameter.
// It should be possible find multiple columnames and rowvalues.
// Cypress.Commands.add('searchInTable', (columnName, textToMatch) => {
//   cy.get("table > thead > tr > th")
//     .each(($e1, index, $) => { //iterating through array of elements
//       const StoreText = $e1.text().trim(); //storing iterated element in text
//       if (StoreText.includes(columnName)) {
//         //If text found, iteration stops and checks textToMatch is present
//         cy.get('tbody tr td')
//           .eq(index)
//           .then(($td) => {
//             const Assigneetext = $td.text().trim();
//             // cy.wrap(`Column "${columnName}" value is ` + Assigneetext, { timeout: 25000 }).should('contain', textToMatch);
//             cy.wrap(`Column "${columnName}" value is ` + Assigneetext, { timeout: 25000 }).should('contain', textToMatch);
//           });
//       }
//     })
// })




