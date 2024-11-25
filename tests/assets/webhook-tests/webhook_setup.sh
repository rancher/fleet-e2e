#!/bin/bash

set -exo pipefail

# Redirect all output to a log file
exec > >(tee -i $PWD/assets/webhook-tests/webhook_setup.log)
exec 2>&1

# Set the environment variables
export REPO_OWNER="fleetqa"
export REPO_NAME="webhook-github-test"
export SECRET_VALUE="webhooksecretvalue"
# Get the external IP of the Google Cloud instance
export EXTERNAL_IP=$(wget --quiet --header="Metadata-Flavor: Google" -O - http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip) 
echo "External IP: ${EXTERNAL_IP}"

# Confirm the external IP is not empty
if [ -z "$EXTERNAL_IP" ]; then
  echo "Failed to get external IP"
  exit 1
fi

# Log the current directory and PATH
echo "Current directory: $(pwd)"
echo "PATH: $PATH"

# Delete any previous webhook
# 1 - Get all webhooks
webhooks=$(wget --quiet --header="Authorization: Bearer ${GH_PRIVATE_PWD}" \
 -O - https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/hooks)

# 2- Extract webhook IDs and delete each one
echo "$webhooks" | grep -o '"id": *[0-9]*' | awk -F ': ' '{print $2}' | while read webhook_id; do
  echo "Deleting webhook ID: $webhook_id"
  wget --quiet --method=DELETE --header="Authorization: Bearer ${GH_PRIVATE_PWD}" \
  -O - https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/hooks/${webhook_id}
done

echo "All webhooks deleted."

# Create new adhock webhook with the specific Google External IP
wget --quiet \
     --method=POST \
     --header="Authorization: Bearer ${GH_PRIVATE_PWD}" \
     --header="Content-Type: application/json" \
     --body-data='{"name":"web","active":true,"events":["push"],"config":{"url":"https://'"${EXTERNAL_IP}"'.nip.io/","content_type":"json","secret":"'"${SECRET_VALUE}"'","insecure_ssl":"1"}}' \
     -O - https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/hooks

# Add webhook secret 
# kubectl create secret generic gitjob-webhook -n cattle-fleet-system --from-literal=github=$SECRET_VALUE

## Create an ingress for the webhook service
## It will use the External IP of the Google Cloud instance + nip.io domain
# cat <<EOF > webhook-ingress.yaml
# apiVersion: networking.k8s.io/v1
# kind: Ingress
# metadata:
#   name: webhook-ingress
#   namespace: cattle-fleet-system
# spec:
#   rules:
#   - host: ${EXTERNAL_IP}.nip.io
#     http:
#       paths:
#         - path: /
#           pathType: Prefix
#           backend:
#             service:
#               name: gitjob
#               port:
#                 number: 80
# EOF

# kubectl apply -f webhook-ingress.yaml

# Validate the ingress response (manually use: curl -kv https://${EXTERNAL_IP}.nip.io)
# HTTP_STATUS=$(wget --server-response --spider --no-check-certificate https://${EXTERNAL_IP}.nip.io 2>&1 | awk '/^  HTTP/{print $2}')
# if [ "$HTTP_STATUS" -eq 200 ]; then
#     echo "## Webhook ingress correctly created. All good! ##"
# else
#     echo "## Error status is $HTTP_STATUS ##"
# fi
