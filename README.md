# Biometric Security System

CSE 2410 team project: facial-recognition access control. A camera captures a face, the
recognition engine (Raspberry Pi) identifies the person, the access control system grants
or denies access, and a Java controller operates the physical lock. Administrators manage
users and review access logs through a web dashboard.

## Running the demo

To get FastAPI running, first install the dependencies, then run the command to start FastAPI. All of the following steps can be done with **GNU Make**. 

The first step is to create a virtual environment:
```sh
make venv
```

Make can't activate the terminal. Activate the environment with the command:

| Shell | Activate |
|---|---|
| macOS/Linux bash or zsh | `source .venv/bin/activate` |
| Windows PowerShell | `.\.venv\Scripts\Activate.ps1` |
| Windows Command Prompt | `.venv\Scripts\activate.bat` |

Then install the dependencies and start FastAPI:

```sh
make deps
make run
```

To exit the virtual environment, use the command `deactivate`.

Other Makefile commands can be found by using `make help`. 

## Dashboard

By default, when the `make run` command is used, the server is set up at `127.0.0.1:8000`.

...