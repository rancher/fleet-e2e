#!/bin/bash

set -ex

export KNOWN_HOSTS=$(ssh-keyscan -H github.com 2>/dev/null)

# renovate: datasource=github-releases depName=mikefarah/yq
YQ_VERSION="4.52.5"
# renovate: datasource=github-releases depName=mikefarah/yq digestVersion="4.52.5"
YQ_SHA256="75d893a0d5940d1019cb7cdc60001d9e876623852c31cfc6267047bc31149fa9"

# Get yq tool and install it
echo "Downloading yq tool and installing it"
wget --no-verbose https://github.com/mikefarah/yq/releases/download/v$YQ_VERSION/yq_linux_amd64 -O /tmp/yq
echo "$YQ_SHA256  /tmp/yq" | sha256sum -c
chmod +x /tmp/yq

echo "Adding private key"
yq eval ".stringData.ssh-privatekey = strenv(RSA_PRIVATE_KEY_QA)" -i assets/known-host.yaml

echo "Adding known host key"
yq eval ".stringData.known_hosts = strenv(KNOWN_HOSTS)" -i assets/known-host.yaml

echo "Adding private key to missmatched yaml"
yq eval ".stringData.ssh-privatekey = strenv(RSA_PRIVATE_KEY_QA)" -i assets/known-host-missmatch.yaml
