// Check the Cypress tags
// Implemented but not used yet
export const isCypressTag = (tag: string) => {
  return (new RegExp(tag)).test(cy.expose("cypress_tags"));
}

// Check the K8s version
export const isK8sVersion = (version: string) => {
  version = version.toLowerCase();
  return (new RegExp(version)).test(cy.expose("k8s_version"));
}

// Check Rancher Manager version
export const isRancherManagerVersion = (version: string) => {
  return (new RegExp(version)).test(cy.expose("rancher_version"));
}
