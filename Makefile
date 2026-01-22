# Simple Makefile for SWE-bench website

.PHONY: help install build serve clean

# Default target: show help
default: help

help:
	@echo "Available commands:"
	@echo "  make install   - Install Python dependencies using uv"
	@echo "  make build     - Generate all HTML pages from templates"
	@echo "  make serve     - Start a local development server (http://localhost:8000)"
	@echo "  make clean     - Remove generated HTML files"

install:
	@echo "Installing dependencies with uv..."
	uv sync

build:
	@echo "Building HTML pages..."
	uv run python build.py
	@echo "Build complete."

serve:
	make build
	@echo "Starting local server at http://localhost:9000 ... Press Ctrl+C to stop."
	cd dist && uv run python -m http.server 9000

clean:
	@echo "Cleaning generated files..."
	rm -rf dist
	@echo "Removing virtual environment..."
	rm -rf .venv
	@echo "Clean complete."
