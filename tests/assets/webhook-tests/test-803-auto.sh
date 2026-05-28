#!/bin/bash
set -euo pipefail

# Webhook Regex Escaping Test
# Auto-detects webhook URL from cluster ingress

# Redirect all output to log file
exec > >(tee -i $PWD/assets/webhook-tests/test-803-auto.log)
exec 2>&1

TEST_NAMESPACE="fleet-local"

echo "Webhook Regex Escaping Test"

# Auto-detect webhook URL
WEBHOOK_HOST=$(kubectl get ingress -n cattle-fleet-system webhook-ingress -o jsonpath='{.spec.rules[0].host}' 2>/dev/null || echo "")

if [ -z "$WEBHOOK_HOST" ]; then
    echo "ERROR: Cannot find webhook-ingress"
    kubectl get ingress -A
    exit 1
fi

WEBHOOK_URL="http://${WEBHOOK_HOST}/"
echo "Webhook URL: $WEBHOOK_URL"

# Check Fleet version
FLEET_VERSION=$(kubectl get deployment -n cattle-fleet-system fleet-controller -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null | grep -oP '(?<=:).*' || echo "unknown")
echo "Fleet version: $FLEET_VERSION"

# Check/remove webhook secret
if kubectl get secret -n cattle-fleet-system gitjob-webhook &>/dev/null; then
    kubectl delete secret -n cattle-fleet-system gitjob-webhook
    sleep 10
fi

# Create test GitRepos
echo "Creating test GitRepos..."
kubectl apply -f - <<'EOF'
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: test-regex-1
  namespace: fleet-local
spec:
  repo: https://github.com/rancher/fleet-examples.git
  branch: master
  disablePolling: true
  paths:
  - single-cluster/helm
---
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: test-regex-2
  namespace: fleet-local
spec:
  repo: https://github.com/rancher/fleet-examples.git
  branch: master
  disablePolling: true
  paths:
  - single-cluster/manifests
---
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: test-regex-3
  namespace: fleet-local
spec:
  repo: https://github.com/rancher/fleet.git
  branch: main
  disablePolling: true
  paths:
  - dev/helm
EOF

sleep 15

kubectl get gitrepo -n fleet-local test-regex-1 test-regex-2 test-regex-3 \
  -o custom-columns=NAME:.metadata.name,REPO:.spec.repo,WEBHOOK_COMMIT:.status.webhookCommit

echo "TEST 1: Wildcard Pattern - https://.*/.*"

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" \
  -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"ref":"refs/heads/master","after":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","repository":{"html_url":"https://.*/.*"}}')

echo "Response:"
echo "$RESPONSE"

sleep 5

echo "Checking if GitRepos were affected by wildcard..."
AFFECTED1=0
for repo in test-regex-1 test-regex-2 test-regex-3; do
    commit=$(kubectl get gitrepo -n fleet-local $repo -o jsonpath='{.status.webhookCommit}' 2>/dev/null || echo "")

    if [ "$commit" = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" ]; then
        echo "  ✗ $repo: AFFECTED - webhookCommit=${commit}"
        AFFECTED1=$((AFFECTED1 + 1))
    else
        echo "  ✓ $repo: Not affected (webhookCommit=${commit})"
    fi
done

if [ $AFFECTED1 -eq 3 ]; then
    echo "RESULT: All 3 GitRepos matched wildcard"
    RESULT1="AFFECTED"
elif [ $AFFECTED1 -gt 0 ]; then
    echo "RESULT: ${AFFECTED1}/3 GitRepos matched wildcard"
    RESULT1="AFFECTED"
else
    echo "RESULT: 0/3 GitRepos matched wildcard"
    RESULT1="NOT_AFFECTED"
fi

echo "TEST 2: Wildcard Hostname"
echo "Sending: https://.*/rancher/fleet-examples.git"

RESPONSE2=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" \
  -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"ref":"refs/heads/master","after":"cccccccccccccccccccccccccccccccccccccccc","repository":{"html_url":"https://.*/rancher/fleet-examples.git"}}')

echo "Response:"
echo "$RESPONSE2"

sleep 5

echo "Checking GitRepos..."
AFFECTED2=0
for repo in test-regex-1 test-regex-2 test-regex-3; do
    commit=$(kubectl get gitrepo -n fleet-local $repo -o jsonpath='{.status.webhookCommit}' 2>/dev/null || echo "")
    repo_url=$(kubectl get gitrepo -n fleet-local $repo -o jsonpath='{.spec.repo}')

    if [ "$commit" = "cccccccccccccccccccccccccccccccccccccccc" ]; then
        echo "  ✗ $repo ($repo_url): MATCHED"
        AFFECTED2=$((AFFECTED2 + 1))
    else
        echo "  ✓ $repo: Not affected"
    fi
done

if [ $AFFECTED2 -gt 0 ]; then
    echo "RESULT: ${AFFECTED2} repos matched wildcard hostname"
    RESULT2="AFFECTED"
else
    echo "RESULT: Wildcard hostname blocked"
    RESULT2="NOT_AFFECTED"
fi

echo "Cleanup"
kubectl delete gitrepo -n fleet-local test-regex-1 test-regex-2 test-regex-3 --ignore-not-found=true

echo "Final Results"
echo "Environment: $WEBHOOK_HOST"
echo "Fleet Version: $FLEET_VERSION"
echo "Test 1 (wildcard): $RESULT1"
echo "Test 2 (hostname): $RESULT2"

if [ "$RESULT1" = "AFFECTED" ] || [ "$RESULT2" = "AFFECTED" ]; then
    echo "AFFECTED - REGEX NOT ESCAPED"
    exit 1
else
    echo "NOT AFFECTED - REGEX ESCAPED"
    exit 0
fi
