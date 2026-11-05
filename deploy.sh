#!/bin/bash
# Deploys the reCAPTCHA signup function. Needs the RECAPTCHA_SECRET secret to exist in Secret Manager.
set -e
gcloud config set project regiegospel
gcloud services enable cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
PN=$(gcloud projects describe regiegospel --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding RECAPTCHA_SECRET \
  --member="serviceAccount:${PN}-compute@developer.gserviceaccount.com" \
  --role=roles/secretmanager.secretAccessor
gcloud functions deploy submitSignup \
  --gen2 --runtime=nodejs20 --region=europe-west1 --source=. \
  --entry-point=submitSignup --trigger-http --allow-unauthenticated \
  --set-secrets=RECAPTCHA_SECRET=RECAPTCHA_SECRET:latest
