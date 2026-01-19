#!/bin/bash
# WIP: This script is a work in progress and not yet ready for production use.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run the Ruby script that handles everything
ruby "$SCRIPT_DIR/ensure-review-account.rb" "$@"
