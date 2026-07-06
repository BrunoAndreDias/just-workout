# Prototype: Training Block automation UX

## Question

Where should the user configure and review automated `Training Block` progression, and what is the minimum interaction for previewing, editing, accepting, skipping, or undoing the next block?

## Run

1. Start the app with `pnpm dev`.
2. Open `/dev/training-cycle-seeds` and create the cycle test plans.
3. Open `/training-plans/dev-cycle-week-6?variant=A`.
4. Switch variants with the bottom prototype bar or the left and right arrow keys.

Variants:

- `A` - Inline checklist on the existing `Active Training Plan` surface.
- `B` - Focused transition workspace launched from the same surface.
- `C` - Automation-first prepared block with an undo window.

## Recommendation

Use the `Active Training Plan` surface as the canonical transition home. The first version should be confirm-and-accept, not fully automatic: show a compact next-block readiness signal in the block progress area, open an inline review panel from there, and let the user accept the reviewed `Training Block`.

Minimum interactions:

- Preview: show the compact readiness card at the end of week 6, with full review available inline.
- Edit: keep exercise swaps and load fields inside the transition review; detailed `Training Block Exercise Swap` behavior remains owned by its separate Wayfinder ticket.
- Accept: one primary action creates the next active `Training Block` after review.
- Skip: allow skipping the rotation proposal while still creating the next block with current exercises and week-one effort targets.
- Undo: allow undo only until the first `Training Session` starts in the new block; after that, changes should happen through swaps rather than reverting the block.

Variant `A` is the preferred shape. Variant `B` is useful if the review grows too dense, but it makes the transition feel heavier than the first version needs. Variant `C` hides too much behind automation for a flow that can include unknown first-time loads and user-confirmed exercise rotations.
