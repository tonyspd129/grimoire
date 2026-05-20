---
name: git-workflow
description: Git branching, merging, conflict resolution, history recovery, and cleanup
category: coding
triggers: [git, commit, branch, merge, rebase, conflict, stash, reset, reflog, cherry-pick]
---

## Git Workflow — Patterns and Recovery

### Branching strategy

```bash
git checkout -b feature/my-feature main   # branch from main
git push -u origin feature/my-feature     # push and track
git checkout main && git pull             # update main
git merge --no-ff feature/my-feature     # merge with merge commit
```

### Conflict resolution

```bash
git status                   # shows conflicted files
git diff                     # shows conflict markers
# Edit files to resolve conflicts
git add <resolved-file>
git commit                   # completes the merge
```

Conflict marker anatomy:
```
<<<<<<< HEAD          ← your changes
your version
=======
their version
>>>>>>> branch-name   ← incoming changes
```

### Recovering lost work

```bash
git reflog                        # shows every HEAD movement
git checkout <sha>                # go back to any point
git cherry-pick <sha>             # apply a specific commit
git stash list                    # find stashed work
git stash pop stash@{2}           # restore specific stash
```

### Undoing things safely

```bash
git revert <sha>                  # safe: creates new commit
git reset --soft HEAD~1           # undo commit, keep staged
git reset --mixed HEAD~1          # undo commit, keep unstaged
git restore <file>                # discard working dir changes
```

Never use `git reset --hard` on pushed commits — use `git revert` instead.

### History cleanup (before push only)

```bash
git rebase -i HEAD~5              # interactive rebase last 5 commits
# In editor: pick/squash/reword/drop
git push --force-with-lease       # safer than --force
```

### Useful diagnostics

```bash
git log --oneline --graph --all   # visual branch graph
git log --author="name" --since="1 week"
git blame -L 10,20 file.py        # who changed these lines
git bisect start && git bisect bad && git bisect good <sha>  # find regression
```

### Submodules

```bash
git submodule update --init --recursive   # initialize after clone
git submodule foreach git pull            # update all submodules
```
