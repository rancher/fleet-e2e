<img src="https://www.rancher.com/assets/img/brand-guidelines/project-logos/fleet/logo-horizontal-fleet.svg" width="150" alt="Fleet"> 

# fleet-e2e
Automation Repository for Fleet i.e. Rancher Continuous Delivery.

# CI status

|Lint| Rancher v2.9-Head | Rancher v2.8-head | Rancher v2.7-head|
|---|---|---|---|
|TBA|[![Rancher-2.9-head_CI](https://github.com/rancher/fleet-e2e/actions/workflows/ui-rm_head_2.9.yaml/badge.svg?branch=main)](https://github.com/rancher/fleet-e2e/actions/workflows/ui-rm_head_2.9.yaml) |[![Rancher-2.8-head_CI](https://github.com/rancher/fleet-e2e/actions/workflows/ui-rm_head_2.8.yaml/badge.svg?branch=main)](https://github.com/rancher/fleet-e2e/actions/workflows/ui-rm_head_2.8.yaml) |[![Rancher-2.7-head_CI](https://github.com/rancher/fleet-e2e/actions/workflows/ui-rm_head_2.7.yaml/badge.svg?branch=main)](https://github.com/rancher/fleet-e2e/actions/workflows/ui-rm_head_2.7.yaml)|
---
# What is Fleet?

- **Cluster engine:** Fleet is a container management and deployment engine designed to offer users more control on the local cluster and constant monitoring through GitOps. Fleet focuses not only on the ability to scale, but it also gives users a high degree of control and visibility to monitor exactly what is installed on the cluster.

- **Deployment management:** Fleet can manage deployments from git of raw Kubernetes YAML, Helm charts, Kustomize, or any combination of the three. Regardless of the source, all resources are dynamically turned into Helm charts, and Helm is used as the engine to deploy all resources in the cluster. As a result, users have a high degree of control, consistency, and auditability.

For information read it here: [Fleet Documentation](https://fleet.rancher.io/)

---