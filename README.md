# Juszko Discord Converter Bot

Bot nasluchuje tylko na:

- serwerze `1386023301092081925`
- kanale `1396866948687462482`

Gdy ktos wrzuci link, bot odpisuje wiadomoscia z przyciskami:

- `USFans`
- `Kakobuy`
- `LitBuy`
- `Raw Link`

Kazdy link dostaje `affcode=juszko20`.

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

## Wazne

- Bot musi byc dodany na serwer.
- W panelu Discord Developer Portal trzeba miec wlaczony `Message Content Intent`.
- Sciezka: `Applications > Your Bot > Bot > Privileged Gateway Intents > Message Content Intent`.
