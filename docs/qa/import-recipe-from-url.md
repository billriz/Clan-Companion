# Import Recipe from URL - Manual QA

1. Sign in and open `/recipes/import`.
2. Paste a valid Allrecipes recipe URL and click `Import Recipe`.
3. Confirm review screen appears with extracted title, ingredients, and instructions.
4. Paste a valid Food Network recipe URL and repeat import.
5. Paste a recipe blog URL with JSON-LD and confirm fallback import works.
6. Paste an invalid URL (e.g. `not-a-url`) and confirm friendly validation error.
7. Paste a non-recipe URL and confirm a friendly "couldn't import" message.
8. Force a partial import (missing title/ingredients/instructions) and confirm save is blocked until fixed.
9. Edit ingredients (add/remove/update) and confirm values are preserved.
10. Edit instructions (add/remove/update) and confirm values are preserved.
11. Click `Save Recipe` and confirm redirect to the recipe detail page.
12. Confirm saved recipe appears in `/recipes` list.
13. Confirm recipe detail page shows source site + source URL link.
14. Confirm unauthenticated requests to `/api/recipes/import-url` and `/api/recipes/save-imported` return 401.
15. On mobile viewport, verify URL input, ingredient/instruction editing, and save actions are comfortable and accessible.
