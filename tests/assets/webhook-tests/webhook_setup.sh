#!/bin/bash

set -exo pipefail

# Redirect all output to a log file
exec > >(tee -i webhook_setup.log)
exec 2>&1

# Set the environment variables
export REPO_OWNER="fleetqa"
export REPO_NAME="webhook-github-test"
export SECRET_VALUE="webhooksecretvalue"
# Get the external IP of the Google Cloud instance
## Troubleshooting: see if the curl command responds:
curl -s -v -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip ## Delete this when done

export EXTERNAL_IP=$(curl -s -v -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip)

sleep 5
echo "External IP: ${EXTERNAL_IP}"

# Confirm the external IP is not empty
if [ -z "$EXTERNAL_IP" ]; then
  echo "Failed to get external IP"
  exit 1
fi

# Delete any previous webhook
# 1 - Get all webhooks
webhooks=$(curl -s -X GET \
  https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/hooks \
  -H 'authorization: Bearer '${GH_PRIVATE_PWD})

# 2- Extract webhook IDs and delete each one
echo $webhooks | jq -r '.[].id' | while read webhook_id; do
  echo "Deleting webhook ID: $webhook_id"
  curl -s -X DELETE \
    https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/hooks/${webhook_id} \
    -H 'authorization: Bearer '${GH_PRIVATE_PWD}
done

echo "All webhooks deleted."

# Create new adhock webhook with the specific Google External IP
curl -X POST \
  https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/hooks \
  -H 'authorization: Bearer '${GH_PRIVATE_PWD} \
  -H 'content-type: application/json' \
  -d '{"name":"web","active":true,"events":["push"],"config":{"url":"https://'"${EXTERNAL_IP}"'.nip.io/","content_type":"json","secret":"'"${SECRET_VALUE}"'","insecure_ssl":"1"}}'

# Add webhook secret 
kubectl create secret generic gitjob-webhook -n cattle-fleet-system --from-literal=github=$SECRET_VALUE

## Create an ingress for the webhook service
## It will use the External IP of the Google Cloud instance + nip.io domain
cat <<EOF > webhook-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webhook-ingress
  namespace: cattle-fleet-system
spec:
  rules:
  - host: ${EXTERNAL_IP}.nip.io
    http:
      paths:
        - path: /
          pathType: Prefix
          backend:
            service:
              name: gitjob
              port:
                number: 80
EOF

echo "\$PWD" # echo the current path
kubectl apply -f webhook-ingress.yaml

# Validate the ingress response (manually use: curl -kv https://${EXTERNAL_IP}.nip.io)
HTTP_STATUS=$(curl -o /dev/null -k -s -w "%{http_code}" https://${EXTERNAL_IP}.nip.io)
if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "## Webhook ingress correctly created. All good! ##"
else
    echo "## Error status is $HTTP_STATUS ##"
fi
