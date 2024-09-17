#!/bin/bash

yq eval ".stringData.ssh-privatekey = strenv(RSA_PRIVATE_KEY_QA)" -i assets/known-host.yaml
kubectl -n fleet-local apply -f assets/known-host.yaml