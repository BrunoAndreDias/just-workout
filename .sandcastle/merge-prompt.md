# TASK

Merge the following branches into the current branch:

{{BRANCHES}}

# STARTING WORKTREE

The host worktree status when this merge phase started was:

```text
{{STARTING_WORKTREE_STATUS}}
```

The worktree may already contain uncommitted local changes. Treat dirty-worktree
overlap as part of the merge job, not as a reason to stop. If `git merge` is
blocked because local changes would be overwritten, preserve those changes with
a named stash or binary patch, run the merge, then reapply the preserved changes.

If conflicts occur, use the global `resolving-merge-conflicts` skill. Never
discard pre-existing local changes.

For each branch:

1. Run `git merge <branch> --no-edit`
2. If there are merge conflicts, resolve them intelligently by reading both sides and choosing the correct resolution
3. After resolving conflicts, run `npm run typecheck` and `npm run test` to verify everything works
4. If tests fail, fix the issues before proceeding to the next branch

After all branches are merged, make a single commit summarizing the merge.

# ISSUE CLOSURE

Do not close GitHub issues from this prompt. The Sandcastle runner closes issues
after it verifies that this merger emitted the completion signal.

Here are all the issues:

{{ISSUES}}

Only output <promise>COMPLETE</promise> after every listed branch has been
merged, verification has passed, and the merge commit has been created. If any
branch cannot be merged, explain the blocker and do not output the completion
signal.
