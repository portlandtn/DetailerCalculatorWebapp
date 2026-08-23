# Detailer Calculator Web App

A mobile-first web version of the original Windows Detailer Calculator. It keeps the original reverse Polish notation (RPN) workflow, detailing-format dimensions, triangle functions, conversions, rounding, keyboard controls, and steel-weight calculation.

## What is preserved

- Detailing math using `feet.inchesSixteenths` notation (`12.0608` means 12′–6 8/16″)
- Standard decimal math
- RPN stack order and Enter-to-duplicate behavior
- Add, subtract, multiply, and divide from buttons or keyboard
- Drop, swap, clear, plus/minus, undo, and redo
- Four stored angles and all six base/rise/slope conversions
- Roof-slope and base/rise angle builders
- Decimal-foot and decimal-inch conversions
- Steel weight at 0.2904 lb per cubic inch
- Configurable display rounding without changing stored precision

## Persistence and privacy

The full working state is saved automatically in browser `localStorage`: stack values, unfinished entry, angles, mode, rounding, tool inputs, and selected units. Closing the browser and returning later on the same device and browser restores the screen.

No login or database is required, and no calculator data leaves the device. Browser storage is device-specific; it does not sync between phones or browsers and is removed if the user clears site data.

## Keyboard controls

| Key | Action |
| --- | --- |
| `Enter` | Push the entry; with a blank entry, duplicate the top stack value |
| `+`, `-`, `*`, `/` | Apply an operation to the top two stack values |
| `Escape` | Clear the entry field |
| `Delete` | Drop the top stack value |

## Local development

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Linux hosting with Docker

Set the public URL so social-preview links are generated correctly, then start the app:

```bash
cp .env.example .env
# Edit NEXT_PUBLIC_SITE_URL in .env
docker compose up -d --build
```

The app listens on port 3000. Put Caddy, Nginx, or another HTTPS reverse proxy in front of it for production use.

## Direct Node hosting

```bash
npm ci
NEXT_PUBLIC_SITE_URL=https://calculator.example.com npm run build
PORT=3000 npm run start
```

## Verification

```bash
npm test
npm run lint
npm run build
```

The automated cases mirror the expected values in the original C# project.
