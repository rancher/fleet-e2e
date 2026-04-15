#!/bin/sh

set -euo pipefail

# This script is used to provision a RKE2 cluster with hardened configuration for testing purposes.
KUBECTL_VERSION="1.33.0"
# renovate: datasource=github-releases depName=kubernetes/kubernetes digestVersion="1.33.0"
KUBECTL_SHA256="9efe8d3facb23e1618cba36fb1c4e15ac9dc3ed5a2c2e18109e4a66b2bac12dc"


### Deploy Kubectl && alias
echo "Downloading kubectl"
curl -LO "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
echo "${KUBECTL_SHA256}  kubectl" | sha256sum -c
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
alias k=kubectl


# Node Setup
sudo bash -c 'cat << EOF > /etc/sysctl.d/90-kubelet.conf
vm.panic_on_oom=0
vm.overcommit_memory=1
kernel.panic=10
kernel.panic_on_oops=1
EOF'

# Enable the above options by executing the below commands.
sudo sysctl -p /etc/sysctl.d/90-kubelet.conf

# ETCD configuration creating its group
sudo useradd -r -c "etcd user" -s /sbin/nologin -M etcd -U

# Create RKE2 Config PodSecurityAdmission policy yaml: 
# https://ranchermanager.docs.rancher.com/reference-guides/rancher-security/psa-restricted-exemptions
cat << EOF > psa.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
  - name: PodSecurity
    configuration:
      apiVersion: pod-security.admission.config.k8s.io/v1
      kind: PodSecurityConfiguration
      defaults:
        enforce: "restricted"
        enforce-version: "latest"
        audit: "restricted"
        audit-version: "latest"
        warn: "restricted"
        warn-version: "latest"
      exemptions:
        usernames: []
        runtimeClasses: []
        namespaces: [calico-apiserver,
                     calico-system,
                     cattle-alerting,
                     cattle-csp-adapter-system,
                     cattle-elemental-system,
                     cattle-epinio-system,
                     cattle-externalip-system,
                     cattle-fleet-local-system,
                     cattle-fleet-system,
                     cattle-gatekeeper-system,
                     cattle-global-data,
                     cattle-global-nt,
                     cattle-impersonation-system,
                     cattle-istio,
                     cattle-istio-system,
                     cattle-logging,
                     cattle-logging-system,
                     cattle-monitoring-system,
                     cattle-neuvector-system,
                     cattle-prometheus,
                     cattle-provisioning-capi-system,
                     cattle-resources-system,
                     cattle-sriov-system,
                     cattle-system,
                     cattle-ui-plugin-system,
                     cattle-windows-gmsa-system,
                     cert-manager,
                     cis-operator-system,
                     fleet-default,
                     ingress-nginx,
                     istio-system,
                     kube-node-lease,
                     kube-public,
                     kube-system,
                     longhorn-system,
                     rancher-alerting-drivers,
                     security-scan,
                     tigera-operator]
EOF

# Add special permissions 
# Bear in mind cis must be in sync with deployed k8s version
sudo mkdir -p /etc/rancher/rke2
echo "write-kubeconfig-mode: 644" | sudo tee /etc/rancher/rke2/config.yaml
echo "pod-security-admission-config-file: $PWD/psa.yaml" | sudo tee -a /etc/rancher/rke2/config.yaml > /dev/null
echo "profile: cis" | sudo tee -a /etc/rancher/rke2/config.yaml > /dev/null

# Deploy RKE2
echo "Downloading RKE2"
# renovate: datasource=github-releases depName=rancher/rke2
RKE2_INSTALLER=$(mktemp)
wget --no-verbose https://get.rke2.io -O "${RKE2_INSTALLER}"
chmod 700 "${RKE2_INSTALLER}"

# Use INSTALL_HARDENED_VERSION as the Kubernetes version if set, otherwise default to latest
if [ -n "${INSTALL_HARDENED_VERSION:-}" ]; then
  if [ "$(id -u)" -eq 0 ]; then
    INSTALL_RKE2_VERSION="${INSTALL_HARDENED_VERSION}" sh "${RKE2_INSTALLER}"
  else
    sudo INSTALL_RKE2_VERSION="${INSTALL_HARDENED_VERSION}" sh "${RKE2_INSTALLER}"
  fi
else
  if [ "$(id -u)" -eq 0 ]; then
    sh "${RKE2_INSTALLER}"
  else
    sudo sh "${RKE2_INSTALLER}"
  fi
fi

sleep 40
export PATH=$PATH:/opt/rke2/bin
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
sleep 5

# Start RKE2
echo "Starting RKE2 service"
sudo systemctl enable --now rke2-server.service
sleep 180

# Configure default Service account
echo "Configuring default Service account"
sudo bash -c 'cat << EOF > service_account_update.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
     name: default
automountServiceAccountToken: false
EOF'
sleep 5

# Update Service Account to the default namespace
for namespace in $(kubectl get namespaces -A -o=jsonpath="{.items[*]['metadata.name']}"); do
  echo -n "Patching namespace $namespace - "
  kubectl patch serviceaccount default -n ${namespace} -p "$(cat service_account_update.yaml)"
done

# Patch ingress class to make it default
kubectl patch ingressClass nginx -p '{"metadata": {"annotations":{"ingressclass.kubernetes.io/is-default-class": "true"}}}'
