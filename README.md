# Mijoli — e-shop preview

Animated, responsive Czech storefront with 46 products, catalog search, filters, product details, favorites, a persistent cart, and a three-step demo checkout.

**Website:** https://majkpowa.github.io/mijoli/

This is a design preview. Checkout does not submit orders or process payments. Product prices and availability are a snapshot of the source catalog, not a live inventory feed.

## Run locally

```sh
python -m http.server 4173 --directory dist
```

Then open http://localhost:4173/.

## Deploy

Push changes to `main`. GitHub Actions checks the JavaScript and publishes `dist/` to GitHub Pages. No build step or package installation is required.

The repository contains the website, its image assets and publishing configuration. Botanical campaign photographs were created with ImageGen. Product thumbnails are ImageGen edits of the source store's real packaging, with a consistent square composition and natural light. Catalog content describes the source store's products; campaign jars do not represent a specific product package.

## Mobile experience

Version 1.1 adds a portrait hero, native swipeable product gallery with a grid alternative, thumb-friendly bottom navigation, category/availability/sort filters, and full-height product details with a fixed purchase bar. Modal navigation preserves search context and keyboard focus. Inputs use 16px text, controls account for safe areas, and motion respects reduced-motion preferences.

All 35 SVG icons are original Mijoli artwork. The shared sprite is `dist/icons.svg`; the [icon gallery](https://majkpowa.github.io/mijoli/iconography.html) shows every symbol at multiple sizes.

## Version 2.0 — October 2026

The storefront now uses the supplied Refero style as its visual direction: forest green and warm white, light Inter headings, monospaced labels, pill controls, flat surfaces and restrained motion. The new layout includes featured products, interactive editorial tabs, a three-step catalog finder, botanical imagery, a daily ritual section and an oversized wordmark footer. Product selection, favorites, search, cart and demo checkout remain functional.

Four original ImageGen campaign photographs live in `dist/assets/seed/` with optimized WebP versions for the website and PNG masters. The hero uses separate landscape and portrait compositions. Prompts are recorded in `image-prompts-seed.txt`.

Verification covered desktop, narrow mobile and tablet layouts, menu closing, keyboard tabs, finder results including unavailable stock, search, product paging, cart quantity totals and all three demo checkout steps. All local references and 46 catalog image paths were checked. Directional icons remain inline SVG paths to avoid emoji rendering on phones.

## Version 2.1 — square product photography

All 46 catalog items now have their own ImageGen edit using the real package as a visual reference. The new photographs use warm stone surfaces, natural light and a close 1:1 composition. Card images fill the square without extra padding or a multiply blend; product details, search and cart use the same photographs. Source images are preserved through each item's `sourceImage` field.

PNG masters and optimized WebP files live in `dist/assets/products-editorial/`. Three previously missing package photographs (CBD, Chlap and Paměť) and a sharper Synbiotika source were supplied by the user. The additional Queen Bee and Oči photographs are prepared as image assets; these two items are not added to the catalog without product records or prices.

The complete prompt set and image lineage are recorded in `image-prompts-products.json`. Product identity, label names and unusual package forms were reviewed against the inputs. Prices, stock and checkout behavior are unchanged.

The [photography review page](https://majkpowa.github.io/mijoli/product-photos.html) shows all 48 images, offers PNG downloads and switches between the new photographs and source images. Every output is 1254 × 1254; the optimized WebP collection totals approximately 5.24 MB.
