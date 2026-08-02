# NextStep GCP K3s Infrastructure as Code

## Author

**Name:** Lee Wei Keat  
**Role:** Infrastructure as Code

## Purpose

This playbook automates the manual provisioning and deployment steps documented
in `k8s/setup-commands.sh`.

It configures a Google Compute Engine Ubuntu VM, installs K3s, creates the
backend Kubernetes Secret, applies the backend and frontend manifests, and
validates the deployed application.

## Target Environment

- Google Compute Engine VM
- Ubuntu 22.04 LTS
- K3s Kubernetes
- Frontend NodePort: 30080
- Backend NodePort: 30081

## Automated Tasks

1. Validate Ubuntu
2. Update and upgrade Ubuntu packages
3. Install required packages
4. Install K3s when missing
5. Start and enable K3s
6. Wait for the Kubernetes node to become Ready
7. Configure kubectl for the SSH user
8. Copy the Kubernetes manifests
9. Create or update `backend-secrets`
10. Apply `backend.yaml`
11. Apply `frontend.yaml`
12. Wait for both deployments
13. Verify NodePorts
14. Test backend and frontend health
15. Display final Kubernetes status

## SSH Access

Generate a personal SSH key:

```bash
ssh-keygen -t ed25519 -C "weikeat-nextstep-ansible"
