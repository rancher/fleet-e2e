# k3s Install
# export K3S_VERSION=v1.26.10+k3s2
# export K3S_VERSION=v1.27.10+k3s1
export K3S_VERSION=v1.28.8+k3s1
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=${K3S_VERSION} sh -s - --write-kubeconfig-mode 644
sleep 8

# Cert manager install
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

helm repo add jetstack https://charts.jetstack.io
helm repo update
helm upgrade --install cert-manager --namespace cert-manager jetstack/cert-manager \
    --create-namespace \
    --set installCRDs=true \
    --set "extraArgs[0]=--enable-certificate-owner-ref=true" \
    --wait
sleep 8

# Rancher env vars
export MY_IP=$(kubectl get svc -A -o jsonpath="{.items[*].status.loadBalancer.ingress[*].ip}")
# export RANCHER_VERSION=2.9.3-alpha6
export SYSTEM_DOMAIN="${MY_IP}.nip.io"
export RANCHER_USER=admin RANCHER_PASSWORD=password
export RANCHER_URL=https://${MY_IP}.nip.io/dashboard


# helm repo add rancher-alpha "https://releases.rancher.com/server-charts/alpha"
# helm repo update

# helm upgrade --install rancher rancher-alpha/rancher \
#  --version $RANCHER_VERSION \
#  --namespace cattle-system --create-namespace \
#  --set hostname=$SYSTEM_DOMAIN  \
#  --set global.cattle.psp.enabled=false \
#  --set rancherImageTag=v$RANCHER_VERSION  \
#  --set bootstrapPassword=$RANCHER_PASSWORD \
#  --set replicas=1 \
#  --wait

helm repo add rancher-latest https://releases.rancher.com/server-charts/latest
helm repo update

helm upgrade --install rancher rancher-latest/rancher \
  --namespace cattle-system --create-namespace \
  --set rancherImageTag=head \
  --set hostname=$SYSTEM_DOMAIN \
  --set bootstrapPassword=password \
  --set agentTLSMode=system-store \
  --set replicas=1 \
  --wait
