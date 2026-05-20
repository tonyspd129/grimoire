---
name: debug-python
description: Systematic Python error debugging — tracebacks, exceptions, environment issues
category: coding
triggers: [python, error, traceback, exception, bug, import, modulenotfound, attributeerror, typeerror]
---

## Python Debugging — Systematic Approach

### Step 1: Read the traceback literally

Read the LAST frame in the traceback — that is where the error actually occurred. The frames above it show how you got there.

```
Traceback (most recent call last):
  File "app.py", line 42, in process_data   ← entry point
    result = transform(data)
  File "utils.py", line 17, in transform    ← actual error location
    return data["key"]
KeyError: 'key'                             ← error type + value
```

**Common errors and their causes:**

| Error | First thing to check |
|---|---|
| `ModuleNotFoundError` | Wrong virtualenv? `which python` / `which pip` |
| `AttributeError` | Object is None, or wrong type |
| `TypeError` | Wrong argument count or type |
| `KeyError` | Dict key doesn't exist — use `.get()` or check first |
| `ImportError` | Circular import, or missing `__init__.py` |
| `RecursionError` | Base case missing or wrong |

### Step 2: Reproduce minimally

```bash
# Isolate the failure
python -c "from module import Thing; t = Thing(); t.method()"
```

### Step 3: Check the environment

```bash
which python           # are you in the right venv?
pip show <package>     # is the package installed?
python --version       # right version?
env | grep PYTHON      # check env vars
```

### Step 4: Add targeted prints / pdb

```python
import pdb; pdb.set_trace()  # drop into debugger at this line
print(type(x), repr(x))      # check actual type and value
```

### Step 5: Check for common async pitfalls

- `RuntimeError: This event loop is already running` → use `asyncio.run()` in a new thread or `nest_asyncio`
- `coroutine was never awaited` → missing `await` keyword
- `SyntaxError` in async code → check Python version (3.10+ for `match`)

### Package management

Always use `uv` for package management:
```bash
uv pip install package    # install
uv pip list               # what's installed
uv run python script.py   # run in managed env
```
