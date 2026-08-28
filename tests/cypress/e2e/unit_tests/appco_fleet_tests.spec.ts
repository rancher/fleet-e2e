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

beforeEach(() => {
  cy.login();
  cy.visit('/');
  // deleteAllFleetRepos() (shared command) only reaches App Bundles when
  // continuousDeliveryMenuSelection() resolves to the App Bundles nav (Rancher 2.12+ AND
  // rancher_version detected correctly) - it silently no-ops on App Bundles otherwise, since
  // an App Bundle isn't a GitRepo. Clean the App Bundles page directly so leftovers from a
  // previous run never carry into this one, regardless of version detection.
  cy.accesMenuSelection('Continuous Delivery', 'App Bundles');
  cy.fleetNamespaceToggle('fleet-default');
  // CI can take longer than the 30s default to fully remove a bundle - give it more headroom
  // so a slow leftover doesn't fail this hook and skip every remaining test in the suite.
  cy.deleteAll(true, 60000);
  cy.fleetNamespaceToggle('fleet-local');
  cy.deleteAll(true, 60000);
});

describe('Test Appco - Fleet integration', { tags: '@appco' }, () => {
  it(qase(468, 'Fleet-468: Verify AppCo connection with Fleet'), { tags: '@fleet-468' }, () => {
    const appcoUsername = Cypress.expose('appco_username');
    const appcoAccessToken = Cypress.expose('appco_access_token');
    const namespaces = ['fleet-local', 'fleet-default'];

    namespaces.forEach((namespace) => {
      cy.connectAppcoForNamespace(namespace, appcoUsername, appcoAccessToken);
    });
  });

  it(
    qase(469, 'Fleet-469: Test AppCo charts can be installed in local cluster - batch-1'),
    { tags: '@fleet-469' },
    () => {
      // Batch 1 - controllers/operators, no PV. Lightest charts, kept small on purpose to stay
      // under the local cluster pod cap.
      const charts = [
        'argo-rollouts',
        'cert-manager-approver-policy',
        'cloudnative-pg',
        'coredns',
        'external-dns',
        'external-secrets-operator',
      ];

      cy.accesMenuSelection('Continuous Delivery', 'App Bundles');
      cy.fleetNamespaceToggle('fleet-local');

      // Fire off every install first so Fleet reconciles them concurrently on the cluster, instead of
      // waiting for each chart to reach Active before starting the next one.
      charts.forEach((chartName) => {
        cy.createAppBundleFromAppco(chartName);
        // Stagger installs so Fleet doesn't burst-pull several charts from the OCI registry at once (429s).
        cy.wait(3000);
      });

      // Then check every row reached Active/N-of-N.
      charts.forEach((chartName) => {
        cy.verifyChartActiveFromAppco(chartName, 120000);
      });
    },
  );

  it(
    qase('TBD-469-2', 'Fleet-469: Test AppCo charts can be installed in local cluster - batch-2'),
    { tags: '@fleet-469-batch2' },
    () => {
      // Batch 2 - daemonsets/small controllers, no PV.
      const charts = [
        'jaeger-operator',
        'kube-state-metrics',
        'kubernetes-cluster-autoscaler',
        'kubernetes-csi-driver-nfs',
        'kured',
        'metacontroller',
        'metallb',
      ];

      cy.accesMenuSelection('Continuous Delivery', 'App Bundles');
      cy.fleetNamespaceToggle('fleet-local');

      charts.forEach((chartName) => {
        cy.createAppBundleFromAppco(chartName);
        cy.wait(3000);
      });

      charts.forEach((chartName) => {
        cy.verifyChartActiveFromAppco(chartName, 120000);
      });
    },
  );

  it(
    qase('TBD-469-3', 'Fleet-469: Test AppCo charts can be installed in local cluster - batch-3'),
    { tags: '@fleet-469-batch3' },
    () => {
      // Batch 3 - single-pod charts, no PV.
      const charts = [
        'node-exporter',
        'oauth2-proxy',
        'open-webui-mcpo',
        'open-webui-pipelines',
        'opentelemetry-operator',
        'prometheus-blackbox-exporter',
      ];

      cy.accesMenuSelection('Continuous Delivery', 'App Bundles');
      cy.fleetNamespaceToggle('fleet-local');

      charts.forEach((chartName) => {
        cy.createAppBundleFromAppco(chartName);
        cy.wait(3000);
      });

      charts.forEach((chartName) => {
        cy.verifyChartActiveFromAppco(chartName, 180000);
      });
    },
  );

  it(
    qase('TBD-469-4', 'Fleet-469: Test AppCo charts can be installed in local cluster - batch-4'),
    { tags: '@fleet-469-batch4' },
    () => {
      // Batch 4 - remaining single-pod charts, no PV (split out of batch 3, which had too many
      // concurrent installs firing in one window).
      const charts = [
        'prometheus-pushgateway',
        'prometheus-statsd-exporter',
        'suse-security-admission-controller',
        'apache-tika',
        'fluent-bit',
        'fluentd',
      ];

      cy.accesMenuSelection('Continuous Delivery', 'App Bundles');
      cy.fleetNamespaceToggle('fleet-local');

      charts.forEach((chartName) => {
        cy.createAppBundleFromAppco(chartName);
        cy.wait(3000);
      });

      charts.forEach((chartName) => {
        cy.verifyChartActiveFromAppco(chartName, 180000);
      });
    },
  );

  it(
    qase('TBD-469-5', 'Fleet-469: Test AppCo charts can be installed in local cluster - batch-5'),
    { tags: '@fleet-469-batch5' },
    () => {
      // Batch 5 - medium weight, multi-pod, no PV by default.
      const charts = ['argo-cd', 'argo-workflows', 'grafana', 'thanos', 'pytorch', 'ollama'];

      cy.accesMenuSelection('Continuous Delivery', 'App Bundles');
      cy.fleetNamespaceToggle('fleet-local');

      charts.forEach((chartName) => {
        cy.createAppBundleFromAppco(chartName);
        cy.wait(3000);
      });

      charts.forEach((chartName) => {
        cy.verifyChartActiveFromAppco(chartName, 180000);
      });
    },
  );

  it(
    qase(470, 'Fleet-470: Test AppCo charts can be installed in downstream cluster - batch-6'),
    { tags: '@fleet-470' },
    () => {
      // cert-manager installed here specifically due to conflict with the cert-manager already existing
      // in fleet-local.
      const charts = ['tika', 'coredns', 'cert-manager'];

      cy.accesMenuSelection('Continuous Delivery', 'App Bundles');
      cy.fleetNamespaceToggle('fleet-default');

      charts.forEach((chartName) => {
        cy.createAppBundleFromAppco(chartName);
        cy.wait(3000);
      });

      charts.forEach((chartName) => {
        cy.verifyChartActiveFromAppco(chartName, 180000, /([1-9]\d*)\/\1/);
      });
    },
  );
});

describe('Test Appco - Fleet integration (PV-backed charts)', { tags: '@appco-pv' }, () => {
  it(qase(468, 'Fleet-468: Verify AppCo connection with Fleet'), { tags: '@fleet-468' }, () => {
    // Establish the AppCo connection for this describe's own dedicated cluster - this runs as a
    // separate CI invocation from the @appco describe above, so its cluster never gets the
    // connection set up by that describe's own Fleet-468 test.
    const appcoUsername = Cypress.expose('appco_username');
    const appcoAccessToken = Cypress.expose('appco_access_token');
    const namespaces = ['fleet-local', 'fleet-default'];

    namespaces.forEach((namespace) => {
      cy.connectAppcoForNamespace(namespace, appcoUsername, appcoAccessToken);
    });
  });

  it(
    qase('TBD-469-7', 'Fleet-469: Test AppCo charts can be installed in local cluster - batch-7'),
    { tags: '@fleet-469-batch7' },
    () => {
      // Batch 7 - prometheus-operator alone, first in this describe so it starts on an otherwise-empty
      // cluster. Full kube-prometheus-stack (115 resources) was still at 112/115 after 10 minutes in a
      // real run - isolated here so its long timeout doesn't gate batch 10.
      const chartName = 'prometheus-operator';

      // beforeEach already ends on App Bundles/fleet-local.
      cy.createAppBundleFromAppco(chartName);
      cy.verifyChartActiveFromAppco(chartName, 1200000);
      cy.deleteBundleAndPvc();
    },
  );

  it(
    qase('TBD-469-8', 'Fleet-469: Test AppCo charts can be installed in local cluster - batch-8'),
    { tags: '@fleet-469-batch8' },
    () => {
      // Batch 8 - PV-backed databases. Each chart's bundle+PV is torn down before the next install
      // so several DB charts' storage never coexists (that's the actual exhaustion risk).
      const charts = ['mariadb', 'postgresql', 'redis', 'valkey', 'influxdb', 'etcd'];

      charts.forEach((chartName) => {
        cy.accesMenuSelection('Continuous Delivery', 'App Bundles');
        cy.fleetNamespaceToggle('fleet-local');
        cy.createAppBundleFromAppco(chartName);
        cy.verifyChartActiveFromAppco(chartName, 300000);
        // Delete the bundle first (frees the StatefulSet), then the now-orphaned PV it leaves behind.
        cy.deleteBundleAndPvc();
      });
    },
  );

  it(
    qase('TBD-469-9', 'Fleet-469: Test AppCo charts can be installed in local cluster - batch-9'),
    { tags: '@fleet-469-batch9' },
    () => {
      // Batch 9 - PV-backed, multi-component charts. Same per-chart teardown as batch 8.
      const charts = ['nats', 'harbor', 'vault', 'suse-virtual-cluster-engine'];

      charts.forEach((chartName) => {
        cy.accesMenuSelection('Continuous Delivery', 'App Bundles');
        cy.fleetNamespaceToggle('fleet-local');
        cy.createAppBundleFromAppco(chartName);
        cy.verifyChartActiveFromAppco(chartName, 600000);
        cy.deleteBundleAndPvc();
      });
    },
  );

  it(
    qase('TBD-469-10', 'Fleet-469: Test AppCo charts can be installed in local cluster - batch-10'),
    { tags: '@fleet-469-batch10' },
    () => {
      // Batch 10 - heaviest full stacks. Longest timeout; same per-chart teardown as batch 8/9.
      // prometheus-operator lives in its own it() above (batch 7) - it's a much heavier outlier
      // (115 resources) than the rest of this batch and needs a far longer timeout on its own.
      const charts = ['apache-kafka', 'milvus', 'prometheus'];

      charts.forEach((chartName) => {
        cy.accesMenuSelection('Continuous Delivery', 'App Bundles');
        cy.fleetNamespaceToggle('fleet-local');
        cy.createAppBundleFromAppco(chartName);
        cy.verifyChartActiveFromAppco(chartName, 600000);
        cy.deleteBundleAndPvc();
      });
    },
  );

  it(
    qase('TBD-469-11', 'Fleet-469: Test AppCo charts can be installed in local cluster - batch-11'),
    { tags: '@fleet-469-batch11' },
    () => {
      // Batch 11 - charts that either misbehaved when installed alongside others, or are confirmed
      // PV-backed and need the individual create-verify-delete-PVC treatment. Run one at a time so a
      // noisy neighbor can't be the cause. Each entry declares whether it's PV-backed so the right
      // teardown runs afterwards.
      const charts = [
        { name: 'kiali', hasPv: false }, // repeatedly "Not Ready" (partial resource count) in batch 3/4.
        // metallb-fips owns the same cluster-scoped CRDs (e.g. bfdprofiles.metallb.io) as metallb
        // (batch 2, @appco). Helm/Fleet never delete CRDs on uninstall, so this only works because
        // @appco-pv is run as a separate CI invocation (fresh cluster) from @appco - metallb never
        // gets installed on this cluster. Running both tags in the same invocation breaks this again.
        { name: 'metallb-fips', hasPv: false },
        { name: 'apache-airflow', hasPv: true },
        { name: 'apache-apisix', hasPv: true }, // bundles an embedded etcd StatefulSet - has its own PVCs.
        { name: 'alertmanager', hasPv: true }, // has a small default PVC.
      ];

      charts.forEach(({ name: chartName, hasPv }) => {
        cy.accesMenuSelection('Continuous Delivery', 'App Bundles');
        cy.fleetNamespaceToggle('fleet-local');
        cy.createAppBundleFromAppco(chartName);
        cy.verifyChartActiveFromAppco(chartName, 600000);
        cy.deleteBundleAndPvc(hasPv);
      });
    },
  );
});
