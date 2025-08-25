terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-east1"
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "compute.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "containerregistry.googleapis.com",
    "cloudresourcemanager.googleapis.com"
  ])
  
  service = each.value
  disable_on_destroy = false
}

# Cloud Run service for Python app
resource "google_cloud_run_service" "python_app" {
  name     = "python-app"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/python-app:latest"
        
        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }
        
        resources {
          limits = {
            memory = "512Mi"
            cpu    = "1"
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# IAM policy for Cloud Run
resource "google_cloud_run_service_iam_member" "public" {
  service  = google_cloud_run_service.python_app.name
  location = google_cloud_run_service.python_app.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Compute instance for N8n
resource "google_compute_instance" "n8n" {
  name         = "n8n-instance"
  machine_type = "e2-medium"
  zone         = "${var.region}-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
      size  = 20
    }
  }

  network_interface {
    network = "default"
    access_config {} # External IP
  }

  metadata_startup_script = file("../startup-script.sh")
  
  metadata = {
    n8n-user        = "admin"
    n8n-password    = random_password.n8n_password.result
    n8n-host        = google_compute_instance.n8n.network_interface[0].access_config[0].nat_ip
    n8n-webhook-url = "https://${google_compute_instance.n8n.network_interface[0].access_config[0].nat_ip}/"
  }

  tags = ["http-server", "https-server"]
}

# Generate random password for N8n
resource "random_password" "n8n_password" {
  length  = 16
  special = true
}

# Firewall rules
resource "google_compute_firewall" "n8n_http" {
  name    = "allow-n8n-http"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["5678"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["http-server"]
}

# Outputs
output "python_app_url" {
  value = google_cloud_run_service.python_app.status[0].url
}

output "n8n_url" {
  value = "http://${google_compute_instance.n8n.network_interface[0].access_config[0].nat_ip}:5678"
}

output "n8n_password" {
  value     = random_password.n8n_password.result
  sensitive = true
}