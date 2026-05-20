---
name: bash-scripting
description: Shell scripting patterns — loops, error handling, cron, argument parsing, process management
category: system
triggers: [bash, shell, script, cron, loop, pipe, sed, awk, grep, find, process, background, daemon]
---

## Bash Scripting — Patterns and Idioms

### Script header (always use these)

```bash
#!/usr/bin/env bash
set -euo pipefail          # exit on error, unset vars, pipe failures
IFS=$'\n\t'               # safer word splitting
```

### Variables and quoting

```bash
NAME="world"
echo "Hello, ${NAME}"     # always quote variables
echo "${NAME:-default}"   # default if unset
echo "${NAME:?'NAME required'}"  # error if unset

# Arrays
FILES=("a.txt" "b.txt")
for f in "${FILES[@]}"; do echo "$f"; done
```

### Control flow

```bash
# If / else
if [[ -f "$file" ]]; then
    echo "exists"
elif [[ -d "$file" ]]; then
    echo "is directory"
else
    echo "not found"
fi

# String comparison
[[ "$x" == "yes" ]]
[[ "$x" =~ ^[0-9]+$ ]]   # regex match

# Numeric
(( count > 5 ))
```

### Loops

```bash
# For loop
for i in {1..10}; do echo "$i"; done

# While loop
while IFS= read -r line; do
    echo "$line"
done < file.txt

# Until condition
until nc -z localhost 8080; do sleep 0.5; done
```

### Functions

```bash
log() { echo "[$(date '+%H:%M:%S')] $*" >&2; }
die() { log "ERROR: $*"; exit 1; }

require() {
    command -v "$1" >/dev/null 2>&1 || die "$1 not found"
}
```

### Argument parsing

```bash
usage() { echo "Usage: $0 [-v] [-o output] <input>"; exit 1; }

VERBOSE=false
OUTPUT=""
while getopts "vo:h" opt; do
    case $opt in
        v) VERBOSE=true ;;
        o) OUTPUT="$OPTARG" ;;
        h) usage ;;
        *) usage ;;
    esac
done
shift $((OPTIND-1))
INPUT="${1:?$(usage)}"
```

### Process management

```bash
# Background process with PID tracking
myprocess &
PID=$!
wait $PID     # wait for it
kill -0 $PID  # check if running

# Trap for cleanup
cleanup() { rm -f "$tmpfile"; }
trap cleanup EXIT INT TERM
tmpfile=$(mktemp)

# Timeout a command
timeout 30 bash -c "slow_command" || echo "timed out"
```

### Text processing

```bash
grep -E "pattern" file             # extended regex
grep -r "pattern" dir/             # recursive
sed 's/old/new/g' file             # replace globally
awk '{print $2, $1}' file          # rearrange fields
awk -F: '{print $1}' /etc/passwd   # custom delimiter
sort -k2 -n file                   # sort by column 2 numerically
sort -u file                       # unique lines
```

### Cron syntax

```bash
# ┌─ minute (0-59)
# │ ┌─ hour (0-23)
# │ │ ┌─ day of month (1-31)
# │ │ │ ┌─ month (1-12)
# │ │ │ │ ┌─ day of week (0-7, 0=Sun)
# │ │ │ │ │
  0 2 * * 1 /path/to/script.sh >> /var/log/script.log 2>&1  # Mon 2am

# Redirect cron output
* * * * * command >> /var/log/cron.log 2>&1
```

### File operations

```bash
find . -name "*.log" -mtime +7 -delete   # delete logs older than 7 days
find . -name "*.py" -exec wc -l {} +     # count lines in all .py files
rsync -av --delete src/ dest/            # sync directories
```
