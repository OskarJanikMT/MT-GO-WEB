# Worklog

## Zmiany w aplikacji

- Dodano kolumny `Grupa` i `Priorytet` do obsługi produktów oraz receptur scalania.
- Dodano odczyt `Grupa` / `GRUPA` oraz `Priorytet` / `PRIORYTET` z plików Excel.
- Dodano zapis tych pól z powrotem do plików `.xlsx`.
- Dodano dropdowny dla `Grupa` i `Priorytet` zamiast ręcznego wpisywania.
- Dodano automatyczne nadawanie najniższego wolnego priorytetu po wyborze grupy.
- Dodano unikalność priorytetów w obrębie grup.
- Dodano globalne liczenie grup i priorytetów między wszystkimi produktami w scalaniu.
- Ukryto grupy w dropdownie, jeśli mają już zajęte wszystkie priorytety `0-9`.
- Dodano walidację zapisu receptury:
  - grupy są opcjonalne,
  - jeśli grupa jest ustawiona, priorytet też musi być ustawiony,
  - grupy muszą być ciągłe od `A`,
  - priorytety w grupie muszą być ciągłe od `0`.
- Dodano sortowanie po kliknięciu nagłówka:
  - w podglądzie produktu w scalaniu,
  - w tabelach receptury scalania.
- Dodano filtrowanie w nagłówku `Podgląd scalonej receptury` po wybranej grupie.
- Dodano zapis scalonych receptur do pliku `receptury.json`.
- Dodano odczyt zapisanych receptur przy starcie aplikacji.
- Dodano plik `.env.example`.
- Dodano obsługę `.env` w `vite.config.js`.

## Zmiany backend/API

- Dodano endpoint `GET /api/recipes` do odczytu zapisanych receptur.
- Dodano endpoint `POST /api/recipes/save` do zapisu receptury do pliku.
- Dodano endpoint `POST /api/workmain/upload` do czyszczenia i wgrywania danych do `dbo.WorkMain`.
- Upload do `WorkMain` używa `sqlcmd`.
- Dla `WorkMain` wgrywane są kolumny:
  - `id`
  - `Material`
  - `Przekroj`
  - `Dlugosc`
  - `Sztuk`
  - `Wybijak`
  - `TekstDoDruku`
  - `Klasa`
  - `Nazwa`
  - `zliczonaIloscIn` lub `zliczIloscWej` zależnie od tego, która kolumna istnieje w tabeli.

## Zakładka 3

- Przycisk `Wgraj do bazy danych` korzysta z wybranej zapisanej receptury.
- Przed insertem tabela `dbo.WorkMain` jest czyszczona.
- Dodano komunikaty sukcesu i błędu dla uploadu do `WorkMain`.
- Dodano kolumny `Grupa` i `Priorytet` do widoku `Aktualnie cięte`.

## Konfiguracja SQL

- Dla Windows auth wymagane są:

```env
MTGO_SQL_SERVER=localhost\MTDB
MTGO_SQL_DATABASE=msm
```

- Nie trzeba ustawiać `MTGO_SQL_USER` ani `MTGO_SQL_PASSWORD`, jeśli używany jest Windows auth.
## Dalsze zmiany 2026-05-14

- Dodano odczyt `WorkMain` z bazy przez `GET /api/workmain`.
- Dodano odświeżanie zakładki `3. Aktualnie cięte` z bazy co 5 sekund.
- Dodano edycję `WykonaneSztuki` w zakładce `3. Aktualnie cięte`.
- Dodano zapis korekt `WykonaneSztuki` przez `POST /api/workmain/corrections`.
- Przebudowano widok `Aktualnie cięte`:
  - zamiast osobnych kolumn `Sztuk` i `WykonaneSztuki` jest kolumna `Progress`,
  - licznik `wykonane/ilość` jest osadzony w środku progress bara,
  - progress bar jest pomarańczowy, a po osiągnięciu `100%` zmienia się na zielony.
- Dodano odczyt statusu maszyny z `dbo.StatusMain` przez `GET /api/machine-status`.
- Status maszyny w headerze odświeża się co 3 sekundy.
- Dodano panel `Config` jako modal nad całą aplikacją.
- Dodano plik `config.json`.
- Dodano endpointy `GET /api/config` oraz `POST /api/config`.
- Dodano zapis konfiguracji panelu `Config` do `config.json`.
- Dodano ochronę przed utratą niezapisanych zmian w panelu `Config`:
  - przy zmianie zakładki,
  - przy zamykaniu panelu,
  - przy `Esc`.
- W panelu `Config` dodano zakładkę `Stanowiska`:
  - dodawanie stanowisk,
  - dodawanie wybijaków i ich numerów.
- W panelu `Config` dodano zakładkę `Odległości`:
  - odległości są budowane automatycznie z kolejnych wybijaków przypisanych do stanowiska,
  - układ pokazuje sekwencję `wybijak -> odległość -> wybijak`.
- Dopracowano UI panelu `Config`:
  - scroll wewnątrz zakładek,
  - poprawione warstwy modali,
  - komunikat zapisu z odstępem od zakładek.
## Dalsze zmiany 2026-05-22 20:47

- Zakładka `1. Twoje Produkty`:
  - dopracowano import Excel bez pełnego przeładowania aplikacji,
  - dodano import wielu plików `.xlsx` naraz,
  - naprawiono zapis plików po błędzie `maxProductRows is not defined`,
  - dodano edycję `Stanowisko` przez dropdown,
  - poprawiono szerokość dropdownu `Stanowisko`,
  - dodano automatyczne przeliczanie `Wybijak` po zmianie `Stanowisko` lub `Długość`,
  - rozszerzono obsługę nagłówków importu o `Długość`, `Grubość`, `Szerokość` i `Klasa`,
  - dodano kolumnę `Klasa` do widoku i edycji produktu.

- Zakładka `2. Scal produkty`:
  - dodano animację rozwijania produktu do listy elementów,
  - dodano animację fade przy dodawaniu i usuwaniu produktów, także dla przejścia `0 <-> 1` element,
  - dodano animację przy zmianie ilości produktu,
  - poprawiono ręczną edycję ilości:
    - wyczyszczenie pola nie usuwa już od razu produktu,
    - `Enter` zatwierdza wpisaną wartość.

- Zakładka `3. Aktualnie cięte`:
  - dodano potwierdzenie przy `Wczytaj` odłożoną pracę,
  - użytkownik może wybrać porzucenie aktualnego stanu albo jego odłożenie przed wczytaniem,
  - poprawiono zamykanie i responsywność tego dialogu.

- Ustawienia i UI:
  - dodano ikonę zębatki w headerze,
  - dodano osobny panel `Ustawienia` jako overlay,
  - dodano opcję włączania i wyłączania animacji interfejsu z zapisem do `localStorage`,
  - dodano wspólną animację wejścia dla paneli i modali overlay.

- Repo:
  - uzupełniono `.gitignore` o `node_modules`, `dist`, `.env`, logi i lokalne pliki debug.
