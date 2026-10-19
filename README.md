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

The repository contains only the website and its publishing configuration. Botanical campaign photographs were created with ImageGen. Product photographs and catalog content describe the source store's products; the generated campaign photography does not represent a specific product package.

## Mobile experience

Version 1.1 adds a portrait hero, native swipeable product gallery with a grid alternative, thumb-friendly bottom navigation, category/availability/sort filters, and full-height product details with a fixed purchase bar. Modal navigation preserves search context and keyboard focus. Inputs use 16px text, controls account for safe areas, and motion respects reduced-motion preferences.

All 35 SVG icons are original Mijoli artwork. The shared sprite is `dist/icons.svg`; the [icon gallery](https://majkpowa.github.io/mijoli/iconography.html) shows every symbol at multiple sizes.
