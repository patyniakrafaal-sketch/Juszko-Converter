# Juszko Converter — bot Discord

Bot robi dwie rzeczy: **zamienia linki produktów na linki agentów** i **obsługuje
wydawanie nagród kupionych za Juszko Coins**.

Opis obu botów naraz (ten + bot zaproszeń) jest w [BOTY.md](BOTY.md).

---

## Komendy — pełna lista

### `/nagroda kod:`

**Kto może użyć:** każdy użytkownik serwera.

Realizuje nagrodę kupioną wcześniej na stronie. Klient kupuje nagrodę w zakładce
„Zarabiaj z nami" i dostaje kod odbioru.

```
/nagroda kod: JR-89Y4-GMVP-BBWG-D9BL
```

Bot pokazuje kartę z nazwą nagrody, ceną i kupującym oraz oznacza zamówienie jako
zgłoszone do odbioru, pingując obsługę.

> **Uwaga:** strona **nie każe** klientom używać tej komendy. Po zakupie instrukcja mówi,
> żeby założyć ticket, oznaczyć **@juszko11** i wkleić kod. Powód: komendy wymagają
> uprawnienia „Używanie komend aplikacji", którego część osób nie ma, a wtedy komenda po
> prostu się nie pokazuje i klient zostaje z kodem bez pomocy. **Komendę wykonuje wtedy
> obsługa w tickecie.**

**Co dalej:** obsługa wydaje nagrodę i zamyka sprawę przez `/nagrodazrealizowana` z tym
samym kodem.

**Gdy nie działa:**

| Komunikat | Przyczyna |
|---|---|
| „Nie znaleziono kodu" | Literówka — kody mają format `JR-XXXX-XXXX-XXXX-XXXX` |
| „To nie jest Twój kod" | Kod należy do kogoś innego; realizuje go tylko kupujący |
| „Bot nie ma autoryzacji do strony" | `INTERNAL_API_KEY` różni się między botem a stroną |

---

### `/saldo [uzytkownik:]`

**Kto może użyć:** bez argumentu — **każdy**. Z argumentem — tylko obsługa.

```
/saldo                      → Twoje saldo
/saldo uzytkownik: @rafx    → cudze saldo (obsługa)
```

Odpowiedź widzi **tylko osoba, która wpisała komendę**, więc nikt nie podejrzy cudzego
stanu konta.

Komunikat „Nie masz jeszcze konta afiliacyjnego" znaczy, że ktoś nie logował się jeszcze
na stronie przez Discord — konto zakłada się przy pierwszym logowaniu.

---

### `/nagrodazrealizowana kod: [notatka:]`

**Kto może użyć:** tylko obsługa.

Oznacza nagrodę jako wydaną i **wysyła klientowi wiadomość prywatną**.

```
/nagrodazrealizowana kod: JR-89Y4-GMVP-BBWG-D9BL notatka: kod vouchera ABC-123
```

Treść z `notatka` trafia do DM klienta — tam wpisuje się kod vouchera, numer zamówienia
albo instrukcję. Jeśli klient ma zamknięte DM, bot o tym powie; status i tak jest
widoczny w panelu admina.

---

### `/nagrodaanuluj kod:`

**Kto może użyć:** tylko obsługa.

Anuluje zamówienie i **automatycznie zwraca coiny**. Klient dostaje DM z informacją o
anulowaniu i kwocie zwrotu.

```
/nagrodaanuluj kod: JR-89Y4-GMVP-BBWG-D9BL
```

Używać, gdy nagroda jest niedostępna albo klient zamówił przez pomyłkę. **Nie trzeba**
osobno oddawać coinów przez `/dodajcoins`.

---

### `/dodajcoins uzytkownik: ilosc: [powod:]`

**Kto może użyć:** tylko obsługa.

```
/dodajcoins uzytkownik: @rafx ilosc: 50 powod: konkurs na Discordzie
```

Zakres 1–1 000 000. `powod` zapisuje się w historii i trafia do klienta w DM — warto go
wypełniać, bo po miesiącu nikt nie pamięta, skąd wzięły się coiny.

---

### `/zabierzcoins uzytkownik: ilosc: [powod:]`

**Kto może użyć:** tylko obsługa.

Jak wyżej, tylko odejmuje. Jeśli użytkownik ma mniej coinów niż podana kwota, bot
**odmówi** i napisze, ile faktycznie ma — saldo nie zejdzie poniżej zera.

---

## Kto liczy się jako „obsługa"

Sprawdzane w tej kolejności:

1. Każdy z uprawnieniem **Zarządzanie serwerem** — przechodzi zawsze, żeby błędne ID roli
   nie zablokowało dostępu wszystkim
2. Każdy z rolą wskazaną w `STAFF_ROLE_ID`

Można podać **kilka ról** po przecinku lub spacji:

```
STAFF_ROLE_ID=1528671195304693870,1400000000000000000
```

Gdy komenda odmówi, bot napisze **dlaczego** — wymienia wymaganą rolę i Twoje role, albo
mówi wprost, że `STAFF_ROLE_ID` nie jest ustawione. Nie trzeba zgadywać.

---

## Żeby zwykli użytkownicy widzieli komendy

Najczęstszy problem przy wdrożeniu. Rola klientów musi mieć **„Używanie komend
aplikacji"**, inaczej `/nagroda` i `/saldo` po prostu się im nie pokażą.

> Ustawienia serwera → **Integracje** → *Juszko Converter*

Tam ustawia się dostęp **osobno dla każdej komendy**:

| Komenda | Zalecany dostęp |
|---|---|
| `/nagroda`, `/saldo` | `@everyone` |
| pozostałe cztery | tylko rola obsługi |

---

## Konwerter linków

Na kanale z `DISCORD_CHANNEL_ID` bot czyta wiadomości. Gdy ktoś wrzuci link do produktu
(Taobao, Weidian, 1688, Kakobuy), odpowiada wiadomością z przyciskami **USFans**,
**Kakobuy**, **LitBuy**, **Raw Link**. Do każdego dokleja `affcode` (domyślnie
`juszko20`).

Wymaga **Message Content Intent** w Developer Portal:
`Applications → Twój bot → Bot → Privileged Gateway Intents`. Bez tego bot nie widzi
treści wiadomości i nic nie odpowie.

---

## Uruchomienie

```bash
npm install
cp .env.example .env      # uzupełnij wartości
npm start
```

Komendy rejestrują się same przy starcie, dla serwera z `DISCORD_GUILD_ID`. Rejestracja
per serwer działa natychmiast — nie trzeba czekać godziny jak przy komendach globalnych.

### Zmienne środowiskowe

| Zmienna | Wymagana | Opis |
|---|---|---|
| `DISCORD_BOT_TOKEN` | tak | Token bota z Developer Portal |
| `DISCORD_GUILD_ID` | tak | ID serwera |
| `DISCORD_CHANNEL_ID` | tak | Kanał konwertera linków |
| `SITE_URL` | tak | Adres strony |
| `INTERNAL_API_KEY` | tak | **Musi być identyczny** z kluczem na stronie |
| `STAFF_ROLE_ID` | zalecana | Rola obsługi, można kilka po przecinku |
| `AFFCODE` | nie | Kod afiliacyjny, domyślnie `juszko20` |
| `ICON_BASE_URL` | nie | Skąd brać ikony, domyślnie `SITE_URL/bot-icons` |
| `BRAND_LOGO_URL` | nie | Logo przy nazwie w kartach |

### Uprawnienia bota na serwerze

- **Wyświetlanie kanałów** i **Wysyłanie wiadomości**
- **Osadzanie linków** — bez tego karty nagród się nie wyświetlą

---

## Wygląd odpowiedzi

Wszystkie odpowiedzi to karty z jednolitą kolorystyką, linią autora i znacznikiem czasu.
Ikony pobierane są **ze strony** (`SITE_URL/bot-icons/*.png`), więc nie trzeba niczego
wgrywać jako emotki serwera.

Zmiana ikon: edytuj `icons/build-icons.mjs`, potem `npm run build:icons`. Szczegóły w
[icons/README.md](icons/README.md).

---

## Najczęstsze problemy

| Objaw | Przyczyna i rozwiązanie |
|---|---|
| Komendy w ogóle się nie pokazują | Bot nie wystartował albo `DISCORD_GUILD_ID` wskazuje inny serwer — sprawdź logi startu |
| Widzi je tylko obsługa | Brak „Używanie komend aplikacji" dla roli klientów (Integracje) |
| „Ta komenda jest tylko dla obsługi" u właściciela | Bot napisze, której roli brakuje — dodaj ją do `STAFF_ROLE_ID` |
| „Bot nie ma autoryzacji do strony" | `INTERNAL_API_KEY` różni się między botem a Render |
| „Strona nie odpowiada" | Instancja Render się wybudza — spróbuj ponownie za chwilę |
| Ikony w kartach się nie ładują | Strona nie serwuje `/bot-icons/` albo `ICON_BASE_URL` wskazuje w złe miejsce |
| Konwerter nie reaguje na linki | Brak Message Content Intent albo zły `DISCORD_CHANNEL_ID` |
