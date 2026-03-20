#!/usr/bin/env bash
set -e

apt-get update -qq && apt-get install -y -qq \
  libcairo2 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libgdk-pixbuf2.0-0 \
  libffi-dev \
  shared-mime-info \
  fonts-liberation

pip install -r requirements.txt
