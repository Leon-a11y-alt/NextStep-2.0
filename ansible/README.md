# NextStep Ansible Infrastructure as Code

## Author

**Name:** Lee Wei Keat  
**Role:** Infrastructure as Code / Ansible Engineer

## Purpose

This Ansible configuration prepares an Ubuntu AWS EC2 server for the NextStep Continuous Deployment pipeline.

The CD workflow is responsible for copying `docker-compose.prod.yml`, pulling the published Docker images and starting the containers.

The Ansible playbook is responsible for preparing the server before deployment.

## Automated Configuration

The playbook performs the following tasks:

- Updates the Ubuntu package cache
- Installs required system packages
- Installs Docker Engine
- Installs Docker Compose
- Starts and enables Docker
- Adds the deployment user to the Docker group
- Creates the production deployment directory
- Creates the production `.env` file with secure permissions
- Verifies Docker and Docker Compose
- Validates that the server is ready for the CD pipeline

## Folder Structure

```text
ansible/
├── ansible.cfg
├── inventory.ini.example
├── site.yml
├── README.md
├── group_vars/
│   ├── all.yml
│   └── vault.yml.example
└── templates/
    └── backend.env.j2