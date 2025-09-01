#!/bin/sh

set -E -x

helm repo add jetstack https://charts.jetstack.io
helm repo update
helm upgrade --install cert-manager --namespace cert-manager jetstack/cert-manager \
    --create-namespace \
    --set crds.enabled=true \
    --set "extraArgs[0]=--enable-certificate-owner-ref=true" \
    --wait

sleep 8

# Getting Google IP
export GCP_EXTRENAL_IP=$(wget --quiet --header="Metadata-Flavor: Google" -O - http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip) 
echo "External IP: ${GCP_EXTRENAL_IP}"

# Rancher installation
export MY_IP=${GCP_EXTRENAL_IP}
export SYSTEM_DOMAIN="${MY_IP}.bc.googleusercontent.com"
export RANCHER_USER=admin RANCHER_PASSWORD=rancherpassword
export RANCHER_URL=https://${MY_IP}.bc.googleusercontent.com/dashboard


helm repo add rancher-head-2.12 https://charts.optimus.rancher.io/server-charts/release-2.12
helm repo update

helm upgrade --install rancher rancher-head-2.12/rancher \
  --devel \
  --namespace cattle-system --create-namespace \
  --set hostname=$SYSTEM_DOMAIN \
  --set bootstrapPassword=password \
  --set replicas=1 \
 \
  --wait