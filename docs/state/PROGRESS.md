# Postęp implementacji (handoff)

**Aktualizacja:** 2026-09-30 (sesja 1, w toku)

## Stan

Zintegrowana gra działa w przeglądarce: generator świata → symulacja → rendering → UI desktop/mobile → zapis/odczyt.
Scenariusz odbioru §9: desktop 15/15, mobile 6/6 (`scripts/e2e/*.mjs`, headless Chrome + SwiftShader).

## Komendy

```bash
pnpm dev --port 5199            # gra: http://localhost:5199/?seed=1337
pnpm test                       # vitest (reguły symulacji, determinizm, zapis)
pnpm type-check && pnpm lint
node scripts/e2e/smoke.mjs      # wymagają uruchomionego dev servera na :5199
node scripts/e2e/acceptance.mjs
node scripts/e2e/mobile.mjs
node scripts/assets/build-assets.mjs   # tylko gdy _temp/extracted jest dostępny
```

## W toku / następne kroki

Patrz sekcja „Następny krok” na końcu (aktualizowana przy zakończeniu sesji).
