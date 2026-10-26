# Mijoli 2.2.0 verification

26 October 2026. Technical review and browser walkthrough; no human participant study.

## Completed browser checks

- Phone layouts at 320 and 390 CSS pixels and tablet around 768 pixels: no document horizontal overflow. Wide desktop layout reviewed. Tablet catalog has two columns; mobile defaults to grid.
- `vitamin` returns 18 matches. Search overlay initially previews eight, then its full-result action exposes all 18 in the catalog. Query survives reload through the URL.
- Category `other` displays both items; the unavailable item cannot be added. Elixirs with stock enabled produce five results and both removable filter chips.
- Product detail opens and closes while preserving catalog context.
- Cart quantity increase preserves keyboard focus and updates two Beauty of Cleopatra items to 2,222 CZK. Quantity hit areas measure approximately 44 CSS pixels.
- Three demo checkout steps complete with fictitious data. Summary is 2,222 + 99 = 2,321 CZK; completion explicitly says no order or payment occurred.
- Design manual reviewed on desktop and phone, with no document overflow. Its isolated add-to-demo interaction updates its own status.
- Shared code review found and fixed the active mobile view icon specificity conflict. Direct catalog hashes now scroll after the dynamic product section renders.

## Static checks

JavaScript syntax, diff whitespace, local references, product assets and unique static IDs checked before publication. Contrast values in the manual refer to specified opaque color pairs; this is not a full accessibility certification.

## Research still to perform

The manual defines five moderated customer tasks, recruitment by shopping behavior, metrics and acceptance thresholds. Personas are hypotheses. No observed conversion change, customer preference or task-success rate is claimed. Real device screen-reader, OS text-scaling and moderated participant testing remain follow-up validation.
