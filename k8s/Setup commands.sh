#!/usr/bin/env bash
#
# setup-commands.sh
# -----------------
# The exact steps used to provision the GCP VM and deploy NextStep on k3s.
# This is a REFERENCE of the manual steps — it's what the Ansible playbook
# should automate (idempotently). Run on a fresh Ubuntu 22.04 GCP VM.
#
# NOTE: firewall rules (opening TCP 30080 / 30081) are configured on the
# GCP side (VPC > Firewall), NOT on the VM, so they are not included here.

set -e

# 1. Update the operating system
sudo apt update && sudo apt upgrade -y

# 2. Install k3s (lightweight Kubernetes). Installs and starts as a service.
curl -sfL https://get.k3s.io | sh -

# 3. Set up kubectl access for the current user (so you don't need sudo k3s)
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown "$(whoami)" ~/.kube/config
export KUBECONFIG=~/.kube/config
# (add the export line to ~/.bashrc to make it permanent)

# 4. Verify the cluster is up (should show one node, STATUS Ready)
kubectl get nodes

# 5. Create the Secret with the Supabase connection string.
#    Replace the placeholder with the real value (shared securely, never committed).
kubectl create secret generic backend-secrets \
  --from-literal=DATABASE_URL='<supabase-connection-string>'

# 6. Apply the manifests (backend first — it owns the Secret dependency)
kubectl apply -f backend.yaml
kubectl apply -f frontend.yaml

# 7. Confirm the deployment
kubectl get pods       # both should be Running, READY 1/1
kubectl get services   # confirms NodePorts 30080 (frontend) / 30081 (backend)

echo "Done. Frontend: http://<VM-PUBLIC-IP>:30080"