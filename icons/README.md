# Ikonki bota

13 emotek w jednym stylu, gotowych do wgrania na serwer Discord.

Pliki `.png` (128×128, przezroczyste tło) to te do wgrania. Pliki `.svg` to źródła —
jeśli chcesz zmienić kształt lub kolor, edytuj `build-icons.mjs` i przebuduj:

```
npm run build:icons
```


## Dwa sposoby uzycia

**1. Hosting ze strony (domyslny, nic nie musisz robic).** Te same PNG-i leza w repo strony
w `apps/web/public/bot-icons/` i sa serwowane pod `https://TWOJA-STRONA/bot-icons/coin.png`.
Bot bierze je stamtad automatycznie i wstawia jako miniatury embedow. Zadnego wgrywania,
zadnych zajetych slotow emotek na serwerze, a podmiana ikonki to deploy strony.
Adres mozna nadpisac zmienna `ICON_BASE_URL`.

**2. Emotki serwera (opcjonalnie).** Discord przyjmuje obrazek tylko tam, gdzie jest
miejsce na obrazek: miniatura, ikona autora, ikona stopki. Tekst w tytule i w polach to
zwykly tekst — tam ikona **musi** byc emotka, nie ma skladni na wstawienie hostowanego
obrazka w linie tekstu. Dlatego jesli chcesz ikonki takze przy nazwach pol, wgraj je jako
emotki i ustaw `ICON_*` wedlug tabelki nizej.

## Jak je wgrać (tylko dla wariantu 2)

1. **Ustawienia serwera → Emoji → Prześlij emoji**, wybierz plik.
2. Nazwij emotkę dokładnie tak jak plik (`coin`, `gift`, `done`, ...) — nie jest to
   wymagane, ale dzięki temu nazwa w zmiennej środowiskowej zgadza się z plikiem.
3. Na dowolnym kanale wpisz `\:coin:` (z ukośnikiem z przodu) i wyślij. Discord odpowie
   surową postacią, np. `<:coin:1234567890123456>`.
4. Wklej to jako wartość zmiennej w Railway.

## Zmienne w Railway

| Plik | Zmienna | Gdzie się pojawia |
|---|---|---|
| `coin.png` | `ICON_COIN` | kwoty JC, pole „Zapłacono" |
| `wallet.png` | `ICON_WALLET` | `/saldo`, pole „Saldo" |
| `gift.png` | `ICON_GIFT` | domyślna ikona nagrody |
| `pending.png` | `ICON_PENDING` | nagroda czeka na wydanie |
| `done.png` | `ICON_DONE` | nagroda wydana |
| `cancelled.png` | `ICON_CANCELLED` | zamówienie anulowane |
| `error.png` | `ICON_ERROR` | każdy błąd |
| `info.png` | `ICON_INFO` | komunikaty informacyjne, pole „Powód" |
| `plus.png` | `ICON_PLUS` | `/dodajcoins` |
| `minus.png` | `ICON_MINUS` | `/zabierzcoins` |
| `user.png` | `ICON_USER` | pole „Użytkownik" / „Kupujący" |
| `code.png` | `ICON_CODE` | pole „Kod odbioru" |
| `staff.png` | `ICON_STAFF` | odmowa dostępu do komendy |

Żadna z nich nie jest wymagana — bez ustawienia bot używa zwykłej emotki unicode.
Można wgrać część i dokładać resztę później.

## Uwaga

Bot musi mieć dostęp do serwera, z którego pochodzi emotka. Jeśli wstawisz ID emotki
z innego serwera, Discord pokaże surowy tekst `<:coin:123...>` zamiast obrazka.

## Dlaczego tak wyglądają

Discord renderuje emotki w około 22 px w wiadomości. Wszystko cieńsze niż ~8 px w tym
kartonie 128 px znika przy tej skali, dlatego kształty są grube, a głębia pochodzi
z gradientów i cieni biegnących przez cały kształt, a nie z drobnych detali.

Kształt to zaokrąglony kwadrat, nie koło — wypełnia kwadratowe pole emotki znacznie
lepiej, dlatego tak wygląda każda nowoczesna ikona aplikacji. Przy 22 px ta dodatkowa
powierzchnia robi całą różnicę.

Kolory, promienie zaokrągleń i cienie pochodzą z systemu projektowego **Tailwind CSS**
(amber-400/500/600, emerald, red, indigo, slate; rounded-3xl). Sam Tailwind nie działa
na emotkach — to obrazki PNG, nie HTML, więc żadna klasa CSS się do nich nie stosuje —
ale jego palety i skale są tym, co sprawia, że zestaw wygląda spójnie zamiast
ręcznie mieszanego.

Klucz jest pionowy, a nie po skosie, bo obrócony rozpadał się przy małym rozmiarze
na trzy nieczytelne plamki.
