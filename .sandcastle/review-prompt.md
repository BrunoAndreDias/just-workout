# TASK

Review the code changes on branch `{{BRANCH}}` and improve code clarity, consistency, and maintainability while preserving exact functionality.

# CONTEXT

## Branch diff

!`git diff {{TARGET_BRANCH}}...{{BRANCH}}`

## Commits on this branch

!`git log {{TARGET_BRANCH}}..{{BRANCH}} --oneline`

# REVIEW PROCESS

## 1. Read the diff carefully

For anything that looks suspicious — fragile logic, unchecked assumptions, tricky conditions, implicit type coercions, missing guards — write a test that exercises it. Try to actually break it. If you can break it, fix it.

## 2. Verify the change matches the spec

The linked issue (above, in `<linked-issue>`) is the spec. Read it carefully and check:

- **Coverage:** does the diff actually do what the issue asked for? Walk through the issue's stated outcomes and find each one in the code. Note any stated outcome you can't locate.
- **Scope:** does the diff do anything the issue didn't ask for? Unrequested refactors, drive-by changes, scope creep — flag them.
- **Interpretation:** does the implementation interpret the spec sensibly? If a requirement was ambiguous, did it pick a reasonable reading? If you'd have implemented it differently in a way that better serves the stated goal, say so.

If the linked issue is a **PRD** (it has sub-issues), treat the PRD body as the overall intent and each sub-issue as a sub-requirement. Pull the sub-issues with `gh api repos/$GH_REPO/issues/{{ISSUE_NUMBER}}/sub_issues` and verify every closed sub-issue is reflected in the diff. Open sub-issues should _not_ be implemented in this PR — if you see code for an open sub-issue, that's a scope violation.

Findings here go into the `summary` and (where line-anchored) the inline comments. Don't silently "fix" missing spec coverage by adding code yourself — call it out for the human reviewer to decide whether to fold it in or open a follow-up.

## 3. Stress-test edge cases

- Empty arrays, empty strings, zero, negative numbers
- Missing optional fields, null values, undefined properties
- Rapid repeated calls, race conditions, state that changes mid-operation
- Off-by-one errors in loops or slice/substring operations
- Regressions in adjacent functionality

Write tests for anything that isn't already covered.

## 4. Improve code quality

- Reduce nesting and unnecessary complexity
- Eliminate redundant code and abstractions
- Improve names
- Consolidate related logic
- Remove comments that describe obvious code
- Avoid nested ternaries — prefer if/else chains or switch
- Choose clarity over brevity

## 5. Preserve functionality

Never change what the code does — only how it does it. All original features, outputs, and behaviors must remain intact.

## 6. Apply project standards

Follow `.sandcastle/CODING_STANDARDS.md`.


# EXECUTION

If you find improvements to make:

1. Make the changes directly on this branch
2. Run tests and type checking to ensure nothing is broken
3. Commit describing the refinements

If the code is already clean and well-structured, do nothing.

Once complete, output <promise>COMPLETE</promise>.
