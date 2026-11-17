#!/bin/sh

set -euo pipefail

# This script is used to provision a RKE2 cluster with hardened configuration for testing purposes.
# Function to get the newest RKE2 version accepted by a given Rancher minor
# (upper bound of the Rancher chart and Fleet chart kube-version constraints)
get_rke2_for_rancher() {
  local minor
  minor=$(printf '%s' "$1" | grep -oE '2\.[0-9]+' | head -1 | cut -d. -f2 || true)
  case "$minor" in
    12) echo "v1.33.13+rke2r2" ;;
    13) echo "v1.34.13+rke2r1" ;;
    14) echo "v1.35.10+rke2r1" ;;
    15) echo "v1.36.6+rke2r1" ;;
    16) echo "v1.37.2+rke2r1" ;;
    *)
      echo "ERROR: No RKE2 version known for Rancher version: '$1'" >&2
      exit 1
      ;;
  esac
}

# Function to get the k3s version for downstream clusters, same K8s minor as the upstream RKE2
# (same versions used by the ui-rm_head_2.XX workflows)
get_k3s_for_rancher() {
  local minor
  minor=$(printf '%s' "$1" | grep -oE '2\.[0-9]+' | head -1 | cut -d. -f2 || true)
  case "$minor" in
    12) echo "v1.33.7+k3s1" ;;
    13) echo "v1.34.3+k3s1" ;;
    14) echo "v1.35.2+k3s1" ;;
    15) echo "v1.36.1+k3s1" ;;
    16) echo "v1.37.1+k3s1" ;;
    *)
      echo "ERROR: No k3s version known for Rancher version: '$1'" >&2
      exit 1
      ;;
  esac
}

# Get version from environment variable or use default;
# "auto" picks the newest accepted RKE2 version for RANCHER_VERSION
HARDENED_VERSION="${HARDENING_CLUSTER_VERSION:-auto}"
if [ "$HARDENED_VERSION" = "auto" ]; then
  HARDENED_VERSION=$(get_rke2_for_rancher "${RANCHER_VERSION:-}")
fi
if [ "${1:-}" = "resolve" ]; then
  echo "$HARDENED_VERSION"
  exit 0
fi
if [ "${1:-}" = "resolve-k3s" ]; then
  get_k3s_for_rancher "${RANCHER_VERSION:-}"
  exit 0
fi

# Function to get the RKE2 tarball checksum for a given version
get_checksum_for_version() {
  local version="$1"
  case "$version" in
    "v1.37.2+rke2r1")
      echo "0568f48d772c7feff7056062225d5ba82fb3f73ea7acaea63862fe601dae6d92"
      ;;
    "v1.36.6+rke2r1")
      echo "e111ac6333ddb2b819d133a413914d4456dd2195a3d694865cb7acda5bf81ae4"
      ;;
    "v1.35.10+rke2r1")
      echo "4685cdac99b2288668b7f00b69e6848412949fbdc71ba065de7688b6b1647a70"
      ;;
    "v1.34.13+rke2r1")
      echo "d4a4aadbdf0e998c217e24537e8cd0b31e4e9b699e66f405148c9001a160d3b1"
      ;;
    "v1.33.13+rke2r2")
      echo "faece2b8e8a574c16a2e65df12c94cc1c6d48006c17fc2e2ac8290b5f922f9fe"
      ;;
    *)
      echo "ERROR: Unknown RKE2 version: $version" >&2
      echo "Supported versions:" >&2
      echo "  - v1.37.2+rke2r1" >&2
      echo "  - v1.36.6+rke2r1" >&2
      echo "  - v1.35.10+rke2r1" >&2
      echo "  - v1.34.13+rke2r1" >&2
      echo "  - v1.33.13+rke2r2" >&2
      exit 1
      ;;
  esac
}

# Function to get the kubectl version (kept within the supported skew of the RKE2 minor)
# and the SHA256 of the extracted kubectl binary
get_kubectl_for_version() {
  local version="$1"
  case "$version" in
    "v1.37."*)
      KUBECTL_VERSION="1.37.0"
      KUBECTL_SHA256="6129359f4e1f3848a5572ccb0b26cf28b8ca08cef38c95a765b2f64a2c961a2f"
      ;;
    "v1.36."*)
      KUBECTL_VERSION="1.36.0"
      KUBECTL_SHA256="123d8c8844f46b1244c547fffb3c17180c0c26dac9890589fe7e67763298748e"
      ;;
    "v1.35."*)
      KUBECTL_VERSION="1.35.0"
      KUBECTL_SHA256="a2e984a18a0c063279d692533031c1eff93a262afcc0afdc517375432d060989"
      ;;
    "v1.34."*)
      KUBECTL_VERSION="1.34.0"
      KUBECTL_SHA256="cfda68cba5848bc3b6c6135ae2f20ba2c78de20059f68789c090166d6abc3e2c"
      ;;
    "v1.33."*)
      KUBECTL_VERSION="1.33.0"
      # renovate: datasource=github-releases depName=kubernetes/kubernetes digestVersion="1.33.0"
      KUBECTL_SHA256="9efe8d3facb23e1618cba36fb1c4e15ac9dc3ed5a2c2e18109e4a66b2bac12dc"
      ;;
    *)
      echo "ERROR: No kubectl known for RKE2 version: $version" >&2
      exit 1
      ;;
  esac
}

# Get the checksums for the requested version
HARDENED_SHA256=$(get_checksum_for_version "$HARDENED_VERSION")
get_kubectl_for_version "$HARDENED_VERSION"

### Deploy Kubectl && alias

### Deploy Kubectl && alias
echo "Downloading kubectl"
curl -sSfL "https://dl.k8s.io/release/v${KUBECTL_VERSION}/kubernetes-client-linux-amd64.tar.gz" -o kubernetes-client-linux-amd64.tar.gz
tar -xzf kubernetes-client-linux-amd64.tar.gz kubernetes/client/bin/kubectl
echo "${KUBECTL_SHA256}  kubernetes/client/bin/kubectl" | sha256sum -c -
sudo install -o root -g root -m 0755 kubernetes/client/bin/kubectl /usr/local/bin/kubectl
rm -rf kubernetes kubernetes-client-linux-amd64.tar.gz
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
echo "Downloading RKE2 version: ${HARDENED_VERSION}"
curl -sSfL "https://github.com/rancher/rke2/releases/download/${HARDENED_VERSION}/rke2.linux-amd64.tar.gz" -o rke2.tar.gz
echo "Validating SHA256: ${HARDENED_SHA256}"
echo "${HARDENED_SHA256}  rke2.tar.gz" | sha256sum -c -
curl -sSfL "https://get.rke2.io" -o install.sh
chmod 700 install.sh

# Use HARDENED_VERSION as the Kubernetes version if set, otherwise default to latest
if [ -n "${HARDENED_VERSION:-}" ]; then
  if [ "$(id -u)" -eq 0 ]; then
    INSTALL_RKE2_VERSION="${HARDENED_VERSION}" INSTALL_RKE2_TAR_PREFIX="$PWD" sh install.sh
  else
    sudo INSTALL_RKE2_VERSION="${HARDENED_VERSION}" INSTALL_RKE2_TAR_PREFIX="$PWD" sh install.sh
  fi
else
  if [ "$(id -u)" -eq 0 ]; then
    sh install.sh
  else
    sudo sh install.sh
  fi
fi

rm -f rke2.tar.gz install.sh

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

# Patch ingress class to make it default (newer RKE2 ships traefik, already the default, instead of nginx)
if kubectl get ingressClass nginx > /dev/null 2>&1; then
  kubectl patch ingressClass nginx -p '{"metadata": {"annotations":{"ingressclass.kubernetes.io/is-default-class": "true"}}}'
fi
