#!/bin/sh

set -E -x

# Export Kubeconfig in case it has failed
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml

helm repo add jetstack https://charts.jetstack.io
helm repo update
helm upgrade --install cert-manager --namespace cert-manager jetstack/cert-manager \
    --create-namespace \
    --set crds.enabled=true \
    --set "extraArgs[0]=--enable-certificate-owner-ref=true" \
    --wait

sleep 8

# Rancher installation (using PUBLIC_DNS as hostanme for GCP)
export RANCHER_USER=admin RANCHER_PASSWORD=rancherpassword


helm repo add rancher-head-2.12 https://charts.optimus.rancher.io/server-charts/release-2.12
helm repo update

helm upgrade --install rancher rancher-head-2.12/rancher \
  --devel \
  --namespace cattle-system --create-namespace \
  --set hostname=$PUBLIC_DNS \
  --set bootstrapPassword=rancherpassword \
  --set replicas=1 \
 \
  --wait