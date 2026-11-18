#!/bin/bash
# Deploy (default) or delete the plain HTTP Helm repository used by the Fleet User-Agent test.
set -euo pipefail

MANIFEST="$PWD/assets/helm-server-user-agent.yaml"

if [ "${1:-apply}" = "delete" ]; then
  echo "Deleting the user-agent Helm repository"
  kubectl delete namespace fleet-ua-test --ignore-not-found --wait=false
  exit 0
fi

echo "Deploying the user-agent Helm repository"
kubectl apply -f "$MANIFEST"
kubectl -n fleet-ua-test rollout status deployment/nginx-ua-helm-repo --timeout=180s
