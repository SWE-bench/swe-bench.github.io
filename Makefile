# Simple Makefile for SWE-bench website

.PHONY: help venv install build serve clean

# Default target: show help
default: help

help:
	@echo "Available commands:"
	@echo "  make venv      - Create and activate a virtual environment"
	@echo "  make install   - Install Python dependencies from requirements.txt"
	@echo "  make build     - Generate all HTML pages from templates"
	@echo "  make serve     - Start a local development server (http://localhost:8000)"
	@echo "  make clean     - Remove generated HTML files"

venv:
	@echo "Creating virtual environment..."
	python3 -m venv venv
	@echo "Virtual environment created. Activate with 'source venv/bin/activate'"

install:
	@echo "Installing dependencies..."
	pip install -r requirements.txt

build:
	@echo "Building HTML pages..."
	python3 build.py
	@echo "Build complete."

serve:
	make build
	@echo "Starting local server at http://localhost:8000 ... Press Ctrl+C to stop."
	cd dist && python3 -m http.server 8000

clean:
	@echo "Cleaning generated files..."
	rm -rf dist
	@echo "Clean complete." 