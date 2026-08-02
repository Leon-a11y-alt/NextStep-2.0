# Kubernetes Deployment (GCP + k3s)

This folder contains the Kubernetes manifests and setup steps for deploying
NextStep to a Google Compute Engine VM running k3s (lightweight Kubernetes).

## What's here

| File | Purpose |
|------|---------|
| `backend.yaml`  | Deployment + NodePort Service for the Node/Express API |
| `frontend.yaml` | Deployment + NodePort Service for the Next.js frontend |
| `setup-commands.sh` | The exact commands used to provision the server (reference for Ansible) |

## Architecture

- **Platform:** Google Compute Engine VM (Ubuntu 22.04, amd64)
- **Kubernetes:** k3s (self-installed, not GKE)
- **Images:** pulled from public GHCR
  - `ghcr.io/lauzhengxian/nextstep-backend:latest`
  - `ghcr.io/lauzhengxian/nextstep-frontend:latest`
- **Database:** Supabase (managed PostgreSQL) — not containerised; the backend
  connects to it server-side via `DATABASE_URL`
- **Exposure:** NodePort
  - Frontend: `http://<VM-PUBLIC-IP>:30080`  ← public entry point
  - Backend:  `http://<VM-PUBLIC-IP>:30081/api/health`

## Prerequisites

1. A GCP VM with k3s installed (see `setup-commands.sh`)
2. GCP firewall rules allowing TCP `30080` and `30081` from `0.0.0.0/0`
3. The `backend-secrets` Secret created (see below) — **this must exist before
   applying `backend.yaml`, or the backend pod will fail to start**

## Deploy order

The order matters. The Secret must be created first.

```bash
# 1. Create the Secret holding the Supabase connection string.
#    (Value shared securely, NOT committed to the repo.)
kubectl create secret generic backend-secrets \
  --from-literal=DATABASE_URL='<supabase-connection-string>'

# 2. Apply the backend (Deployment + Service)
kubectl apply -f backend.yaml

# 3. Apply the frontend (Deployment + Service)
kubectl apply -f frontend.yaml

# 4. Check everything is running
kubectl get pods       # both pods should reach STATUS: Running, READY 1/1
kubectl get services   # confirms NodePorts 30080 / 30081
```

## Important: the frontend's backend URL is baked in at BUILD time

The frontend talks to the backend using `NEXT_PUBLIC_API_URL`. In Next.js,
`NEXT_PUBLIC_*` variables are compiled into the JavaScript bundle when the
image is **built** — they are NOT read at runtime.

The currently deployed frontend image was built with:

```
NEXT_PUBLIC_API_URL=http://<VM-PUBLIC-IP>:30081
```

This means: **if the backend's public IP or port changes, the frontend image
must be rebuilt and pushed again.** Editing `frontend.yaml` will not fix it.

Rebuild command (run on a machine with Docker, from the repo root):

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://<VM-PUBLIC-IP>:30081 \
  -t ghcr.io/lauzhengxian/nextstep-frontend:latest ./frontend
docker push ghcr.io/lauzhengxian/nextstep-frontend:latest

# then tell the cluster to pull the new image:
kubectl rollout restart deployment/frontend
```

A reserved **static IP** is used for the VM so the address does not change on
restart — this keeps the baked-in URL valid.

## Useful commands

```bash
kubectl get pods                      # status of all pods
kubectl logs -l app=backend           # backend logs (by label, no pod name needed)
kubectl logs -l app=frontend          # frontend logs
kubectl rollout restart deployment/backend   # force a fresh image pull
kubectl describe pod <pod-name>       # debug a pod that won't start
```

## Notes for automation (Ansible / CD)

- The manual provisioning steps in `setup-commands.sh` are what an Ansible
  playbook should automate: OS update, k3s install, secret creation, manifest apply.
- Store `DATABASE_URL` with **Ansible Vault** (encrypted), not in plaintext.
- A CD pipeline should deploy by updating the image / re-applying manifests
  (e.g. `kubectl set image ...` or `kubectl apply -f k8s/`), not by copying files.
