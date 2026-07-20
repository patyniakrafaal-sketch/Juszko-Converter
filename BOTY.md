# JuszkoReps — boty Discord

Dwa osobne boty i strona. Ten dokument opisuje, **co każdy z nich robi**, **jakich uprawnień
potrzebuje** i **kto może używać których komend**.

| Element | Repozytorium | Gdzie stoi |
|---|---|---|
| Strona | `patyniakrafaal-sketch/juszkoreps` | Render |
| Bot nagród i konwertera | `patyniakrafaal-sketch/Juszko-Converter` | Railway |
| Bot zaproszeń | `patyniakrafaal-sketch/JuszkoReps---Bot-INV` | osobny hosting |

Wszystkie trzy korzystają z **tej samej bazy PostgreSQL**. To ważne: boty nie muszą się
nawzajem widzieć po sieci, bo wymieniają się danymi przez bazę.

---

## Bot 1 — nagrody i konwerter linków

Repozytorium: `Juszko-Converter`, plik `bot.js`.

### Rola A: konwerter linków

Nasłuchuje na jednym kanale (`DISCORD_CHANNEL_ID`). Gdy ktoś wrzuci link do produktu,
bot odpowiada wiadomością z przyciskami do **USFans**, **Kakobuy**, **LitBuy** i **Raw Link**.
Do każdego linku dokleja `affcode` (domyślnie `juszko20`).

### Rola B: wydawanie nagród za Juszko Coins

Użytkownik zamawia nagrodę na stronie, dostaje kod odbioru w formacie
`JR-XXXX-XXXX-XXXX-XXXX` i realizuje go komendą na Discordzie.

| Komenda | Kto może użyć | Co robi |
|---|---|---|
| `/nagroda kod:` | **każdy** | Odbiera nagrodę kupioną na stronie |
| `/saldo` | **każdy** | Pokazuje własne saldo (odpowiedź widzi tylko pytający) |
| `/saldo uzytkownik:` | tylko obsługa | Pokazuje cudze saldo |
| `/nagrodazrealizowana kod: [notatka:]` | tylko obsługa | Oznacza nagrodę jako wydaną, wysyła DM do klienta |
| `/nagrodaanuluj kod:` | tylko obsługa | Anuluje zamówienie i **zwraca** coiny |
| `/dodajcoins uzytkownik: ilosc: [powod:]` | tylko obsługa | Dodaje coiny |
| `/zabierzcoins uzytkownik: ilosc: [powod:]` | tylko obsługa | Odejmuje coiny |

**Kto liczy się jako „obsługa":** każdy, kto ma uprawnienie **Zarządzanie serwerem**, albo
rolę wskazaną w `STAFF_ROLE_ID`. Można podać kilka ról po przecinku. Jeśli komenda odmówi,
bot napisze **dlaczego** — czy brakuje roli, czy zmiennej `STAFF_ROLE_ID`.

### Uprawnienia bota na Discordzie

- **Wyświetlanie kanałów** i **Wysyłanie wiadomości** — na kanale konwertera i tam, gdzie
  używane są komendy nagród
- **Osadzanie linków** — bez tego karty nagród nie wyświetlą się poprawnie
- **Message Content Intent** — w Discord Developer Portal, potrzebny do czytania linków
  wrzucanych na kanał konwertera

### Uprawnienia dla użytkowników — najczęstszy problem

Rola klientów musi mieć **„Używanie komend aplikacji"**, inaczej zwykli użytkownicy nie
zobaczą `/nagroda` ani `/saldo`. Ustawia się to w:

> Ustawienia serwera → Integracje → Juszko Converter

Tam da się ustawić dostęp **per komenda**: `/nagroda` i `/saldo` dla `@everyone`, a
`/dodajcoins`, `/zabierzcoins`, `/nagrodazrealizowana`, `/nagrodaanuluj` tylko dla roli
obsługi.

### Zmienne środowiskowe

| Zmienna | Wymagana | Opis |
|---|---|---|
| `DISCORD_BOT_TOKEN` | tak | Token bota |
| `DISCORD_GUILD_ID` | tak | ID serwera (komendy rejestrowane są per serwer) |
| `DISCORD_CHANNEL_ID` | tak | Kanał konwertera linków |
| `SITE_URL` | tak | Adres strony |
| `INTERNAL_API_KEY` | tak | **Musi być identyczny** z kluczem na stronie |
| `STAFF_ROLE_ID` | zalecana | Rola obsługi, kilka po przecinku |
| `AFFCODE` | nie | Kod afiliacyjny, domyślnie `juszko20` |
| `ICON_BASE_URL` | nie | Skąd brać ikony, domyślnie `SITE_URL/bot-icons` |
| `BRAND_LOGO_URL` | nie | Logo przy nazwie w embedach |

Jeśli `INTERNAL_API_KEY` nie zgadza się ze stroną, bot wstanie normalnie, ale **każda
komenda nagród zwróci błąd autoryzacji**. Bot mówi to wprost w odpowiedzi i w logach.

---

## Bot 2 — zaproszenia i naliczanie coinów

Repozytorium: `JuszkoReps---Bot-INV`.

### Rola: przypisywanie wejść do osoby, która zaprosiła

1. Każdy użytkownik ma **własne, unikalne zaproszenie** na serwer
2. Gdy ktoś dołącza, bot porównuje liczniki użyć wszystkich zaproszeń i wykrywa, które
   zostało użyte
3. Sprawdza w bazie, do kogo należy ten kod
4. Dolicza właścicielowi **1 Juszko Coin**

Bot **nie ma żadnych komend**. Działa w tle i wystawia lokalne API HTTP
(`/health`, `GET /invites`, `POST /invites`, `GET /db/users`), chronione kluczem.

### Uprawnienia bota na Discordzie

- **Tworzenie zaproszeń** (Create Instant Invite)
- **Zarządzanie kanałami** (Manage Channels) **na kanale zaproszeń** — bez tego bot nie
  odczyta liczników użyć i nic się nie naliczy. Sprawdza to przy starcie i wypisuje
  w logach wyraźny błąd, jeśli uprawnienia brakuje.
- **Server Members Intent** — w Developer Portal, potrzebny do wykrywania dołączeń

### Zabezpieczenie przed nadużyciami

Konta młodsze niż `MIN_DISCORD_ACCOUNT_AGE_DAYS` (domyślnie 30 dni) **nie generują
nagrody**. To blokuje zakładanie kont pod farmienie coinów.

### Zmienne środowiskowe

| Zmienna | Wymagana | Opis |
|---|---|---|
| `DISCORD_BOT_TOKEN` | tak | Token bota |
| `DISCORD_GUILD_ID` | tak | ID serwera |
| `DISCORD_INVITE_CHANNEL_ID` | tak | Kanał, do którego prowadzą zaproszenia |
| `DATABASE_URL` | tak | Ta sama baza co strona |
| `DISCORD_INVITE_BOT_API_KEY` | tak | Klucz do lokalnego API |
| `REWARD_COINS` | nie | Ile coinów za zaproszenie, **domyślnie 1** |
| `MIN_DISCORD_ACCOUNT_AGE_DAYS` | nie | Minimalny wiek konta, domyślnie 30 |

> **Uwaga:** jeśli `REWARD_COINS` jest ustawione w panelu hostingu, ta wartość wygrywa nad
> domyślną. Kiedyś było tam 50 — sprawdź i usuń albo ustaw na 1.

---

## Skąd biorą się zaproszenia

Zaproszenie może powstać na **dwa sposoby** i oba są poprawne:

1. **Strona tworzy je sama** przez API Discorda, używając `DISCORD_BOT_TOKEN`, który już ma
   na potrzeby logowania. To ścieżka domyślna i nie wymaga, żeby bot zaproszeń był
   osiągalny po sieci.
2. **Bot zaproszeń tworzy je** na żądanie strony, jeśli w Render ustawiono
   `DISCORD_INVITE_BOT_URL` i `DISCORD_INVITE_BOT_API_KEY`.

Niezależnie od tego, **kto** utworzył zaproszenie, kod trafia do wspólnej bazy, a bot
zaproszeń rozpoznaje właściciela właśnie po bazie. Dlatego bot **musi działać**, żeby
naliczać wejścia — ale **nie musi być dostępny po HTTP**.

> **Najważniejsze ustawienie w całym systemie zaproszeń:** `DISCORD_INVITE_CHANNEL_ID`
> musi mieć **tę samą wartość na stronie i w bocie zaproszeń**. Bot odczytuje liczniki
> użyć tylko z jednego, swojego kanału — jeśli strona utworzy zaproszenie gdzie indziej,
> link będzie działał, ludzie będą dołączać, a **nikomu nic się nie naliczy**. Gdy strona
> nie ma tej zmiennej, wybiera kanał sama i zapisuje o tym ostrzeżenie w logach.

Jeśli obie ścieżki zawiodą, użytkownik zobaczy w panelu żółte ostrzeżenie, że jego link
jest wspólny i wejścia się nie policzą. To celowe: wcześniej dostawał taki link po cichu
i nie miał jak się o tym dowiedzieć.

---

## Ikony w embedach

13 ikon w folderze `icons/`. Bot bierze je **ze strony** (`SITE_URL/bot-icons/*.png`), więc
nie trzeba nic wgrywać jako emotki serwera. Przebudowa po zmianie kształtu:

```
npm run build:icons
```

Szczegóły w `icons/README.md`.

---

## Najczęstsze problemy

| Objaw | Przyczyna |
|---|---|
| „Ta komenda jest tylko dla obsługi" u właściciela | Brak roli z `STAFF_ROLE_ID` — bot napisze, której roli brakuje |
| Zwykli użytkownicy nie widzą komend | Brak uprawnienia „Używanie komend aplikacji" dla ich roli |
| „Bot nie ma autoryzacji do strony" | `INTERNAL_API_KEY` różni się między botem a Render |
| Coiny nie naliczają się za zaproszenia | Bot nie działa, nie ma „Zarządzanie kanałami" na kanale zaproszeń, albo zaproszenie powstało w **innym** kanale niż ten, który bot śledzi |
| W panelu żółte ostrzeżenie o wspólnym linku | Ani strona, ani bot nie zdołały utworzyć osobistego zaproszenia — sprawdź, czy bot ma „Tworzenie zaproszeń" |
| Ikony w embedach się nie ładują | Strona nie serwuje `/bot-icons/` albo `ICON_BASE_URL` wskazuje w złe miejsce |
