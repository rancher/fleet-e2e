#!/bin/bash
// This script is used to install git and helm 4.okay

set -euo pipefail

# Install git
sudo zypper -n install --no-recommends git

# Install Helm 4
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-4 | bash
