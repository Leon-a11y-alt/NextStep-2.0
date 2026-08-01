# NextStep Ansible Configuration

This folder contains the Infrastructure as Code configuration used to prepare the NextStep AWS EC2 production server.

## Purpose

The Ansible playbook automates the following server configuration:

- Updates the Ubuntu package cache
- Installs required system packages
- Installs Docker
- Installs Docker Compose
- Starts and enables Docker
- Adds the Ubuntu deployment user to the Docker group
- Creates the NextStep deployment directory
- Copies the production Docker Compose file
- Verifies the Docker installation

## Folder Structure

```text
ansible/
├── inventory.ini
├── site.yml
├── group_vars/
│   └── all.yml
├── files/
│   └── docker-compose.prod.yml
└── README.md