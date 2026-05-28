# Instacart Export Integration

## What this feature does

PlatePlan can export a user's weekly shopping list to Instacart using the Instacart Developer
Platform Shopping List API (`POST /idp/v1/products/products_link`).

The app:

- Filters shopping list items to exportable items (unchecked, non-empty, non-zero quantity)
- Builds Instacart-compatible line items
- Sends the payload server-side only (API key is never exposed to the client)
- Receives a shoppable Instacart URL and shows it to the user
- Logs export attempts in `shopping_list_exports`

## Required environment variables

Add these server-side variables:

```bash
INSTACART_API_KEY=your_instacart_api_key
INSTACART_API_BASE_URL=https://connect.dev.instacart.tools
```

Development base URL:

- `https://connect.dev.instacart.tools`

Production base URL:

- `https://connect.instacart.com`

## Getting an Instacart Developer Platform API key

1. Create or sign in to your Instacart Developer account.
2. Create an app in the Instacart Developer Platform.
3. Enable Shopping List / Product Link access for the app.
4. Copy the server API key and store it as `INSTACART_API_KEY`.

## Woodman's store preference behavior

PlatePlan does **not** integrate with Woodman's APIs directly.

Instead:

- User preference is saved as `preferred_grocery_store_name` in `profiles`
- Default preference is `Woodman's`
- Export is always created through Instacart
- Instacart handles product matching, store selection, substitutions, pricing, availability,
  and checkout

UI label example:

- `Preferred store: Woodman's via Instacart`

## Known limitations

- This does not place an order automatically.
- User must review item matches on Instacart.
- Store availability and prices are controlled by Instacart.
- Checkout happens on Instacart.
- Some items may need manual substitution.
