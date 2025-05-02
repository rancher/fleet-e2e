#!/bin/bash

# Sctript to deploy RKE2 hardened
# It assumes clean enviornment with no RKE2 installed or 
# other Kubernetes distributions (k3s, K3D, etc.)

set -E -x

#Node Setup
sudo bash -c 'cat << EOF > /etc/sysctl.d/90-kubelet.conf
vm.panic_on_oom=0
vm.overcommit_memory=1
kernel.panic=10
kernel.panic_on_oops=1
EOF'

#Enable above options by executing below commands.
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

#Deploy RKE2
curl -sfL https://get.rke2.io | sudo -E sh -
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
export PATH=$PATH:/opt/rke2/bin
sleep 5

# Start RKE2
sudo systemctl enable --now rke2-server.service
sleep 90

# Configure default Service account
sudo bash -c 'cat << EOF > service_account_update.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
     name: default
automountServiceAccountToken: false
EOF'

# Update Service Account
for namespace in $(kubectl get namespaces -A -o=jsonpath="{.items[*]['metadata.name']}"); do
  echo -n "Patching namespace $namespace - "
  kubectl patch serviceaccount default -n ${namespace} -p "$(cat service_account_update.yaml)"
done

# Patch ingress class to make it default
kubectl patch ingressClass nginx -p '{"metadata": {"annotations":{"ingressclass.kubernetes.io/is-default-class": "true"}}}'

