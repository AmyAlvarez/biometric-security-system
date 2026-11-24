################################################################################
# Biometric Security System
################################################################################

TITLE         := Biometric Security System
DESCRIPTION   := Facial-recognition access control system
AUTHOR        := Computer Engineers

.DEFAULT_GOAL := help

ifeq ($(OS),Windows_NT)
PYTHON ?= python
else
PYTHON ?= python3
endif

HOST ?= 127.0.0.1
PORT ?= 8000

define N # To add blank line


endef

# Command list
.PHONY: help
help:
	$(info Command syntax:$N)
	$(info make [<TARGET1> ... <TARGETn>])
	$(info $NAvailable targets:$N)
	$(info help     Displays this help menu)
	$(info venv     Creates a virtual environment)
	$(info deps     Installs necessary dependencies from requirements.txt)
	$(info run      Runs FastAPI with reload. HOST=127.0.0.1 PORT=8000)
	$(info test     Run pytest with the selected python)
	$(info clean    Removes cache folders, such as pycache or pytest_cache)
	$(info $NSetup order: make venv -> activate venv -> make deps -> make run)
	$(info $NVenv activation:) 
	$(info Mac/Linux bash or zsh:     source .venv/bin/activate)
	$(info Windows Powershell:        .\.venv\Scripts\Activate.ps1)
	$(info Windows Command Prompt:    .\.venv\Scripts\activate.bat)
	$(info To leave the environment:  deactivate)
	-@cd .


# Creates a virtual environment
.PHONY: venv
venv:
	$(PYTHON) -m venv .venv


# Install dependencies
.PHONY: deps
deps: 
	$(PYTHON) -m pip install --upgrade pip
	$(PYTHON) -m pip install -r requirements.txt


# Start FastAPI
.PHONY: run
run:
	$(PYTHON) -m uvicorn backend.app.main:app --reload --host $(HOST) --port $(PORT)


# Run pytest
.PHONY: test
test:
	$(PYTHON) -m pytest


# Clean pycache files
.PHONY: clean
clean:
ifeq ($(OS),Windows_NT)
	powershell -NoProfile -Command "Get-ChildItem -Path . -Include __pycache__,.pytest_cache -Recurse -Directory -Force | Where-Object { $$_.FullName -notmatch '[\\/]\.venv([\\/]|$$)' } | Remove-Item -Recurse -Force"
else
	find . -path './.venv' -prune -o -type d \( -name '__pycache__' -o -name '.pytest_cache' \) -prune -exec rm -rf {} +
endif