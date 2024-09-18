#!/bin/bash

set -ex

# Get yq tool and install it
echo "Downloading yq tool and installing it"
wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/bin/yq && chmod +x /usr/bin/yq

echo "Adding private key"
yq eval ".stringData.ssh-privatekey = strenv(RSA_PRIVATE_KEY_QA)" -i assets/known-host.yaml

echo "Adding known host key"
yq eval ".stringData.known_hosts = strenv(RSA_KNOWN_HOSTS_KEY_QA)" -i assets/known-host.yaml
