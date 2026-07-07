# Juszko Discord Converter Bot

Bot nasłuchuje tylko na:

- serwerze `1386023301092081925`
- kanale `1396866948687462482`

Gdy ktoś wrzuci link, bot odpisuje wiadomością z przyciskami:

- `USFans`
- `Kakobuy`
- `LitBuy`
- `Raw Link`

Każdy link dostaje `affcode=juszko20`.

## Start

1. Skopiuj `.env.example` do `.env`
2. Wklej token do `DISCORD_BOT_TOKEN`
3. Zainstaluj paczki:

```bash
npm install
```

4. Uruchom:

```bash
npm start
```

## Ważne

- Bot musi być dodany na serwer.
- W panelu Discord Developer Portal trzeba mieć włączony `Message Content Intent`.
