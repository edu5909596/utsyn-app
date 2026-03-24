# Restaurant Utsyn

Bestillingssystem for Restaurant Utsyn ved Tangen videregående skole.
Online reservation system for Restaurant Utsyn at Tangen Upper Secondary School.

# Roller

- Iusup
    - utvikler, drift, optimismer, database, design, deploy, feilretting, frontend, backend

- Nell
    - prototype design, brukerstøtte, tidlig figma-utvikler i prosjektet, kundemøter

- Helle    
    - prototype design, brukerstøtte, tidlig figma-utvikler i prosjektet, kundemøter

Hvorfor disse rollene

Isusp
-Han kom in etter vi var hadde komme opp med hoved ideen, han er god på å kode og lage databaser som hjalp oss med og effektivisere arbeidet

Nell
-Han hjalp med design og dokumentere og tidlig design av system/ database system

Helle
-Hun har hjalp med tidligere design og tidlige løsninger til database samt ideer på videre utvikling.

Typer av teknologi brukt

Slutt produktet

    -typescript
    -html
    -css

prototype

    -figma
    
## Forutsetninger

- Node.js 18 eller nyere: https://nodejs.org/
- npm (følger med Node.js)
- En PostgreSQL-database (f.eks. fra Supabase, Neon, eller lokalt)

## Installasjon

1. Klon prosjektet:

```bash
git clone https://github.com/y114git/utsyn-app.git
cd utsyn-app
```

2. Installer avhengigheter:

```bash
npm install
```

3. Sett miljøvariabler. Opprett `.env.local`:

```
DATABASE_URL=postgres://bruker:passord@host:port/database?sslmode=require
JWT_SECRET=en-lang-tilfeldig-tekst-her
```

**Viktig:** `DATABASE_URL` er påkrevd for at applikasjonen skal fungere.

## Kjoring

### Utviklingsmodus

```bash
npm run dev
```

Apne http://localhost:3000 i nettleseren.

### Produksjon

```bash
npm run build
npm start
```

Serveren starter pa port 3000 som standard. For a endre port:

```bash
PORT=8080 npm start
```

## Forstegangsoppsett

1. Sørg for at `DATABASE_URL` er satt i `.env.local`
2. Start serveren med `npm run dev`
3. Gå til http://localhost:3000/admin
4. Første gang du besøker denne siden, opprettes tabellene automatisk, og du ser et oppsettskjema
5. Skriv inn brukernavn og passord for den første administratoren
6. Logg inn med den nye kontoen

## Struktur

```
src/
  app/
    api/                  Backend (API-ruter)
      auth/               Innlogging og utlogging
      availability/       Sjekk ledige tider
      closures/           Spesielle stengte dager
      open-days/          Apningstider per ukedag
      reservations/       Reservasjoner (opprett, list, oppdater)
      settings/           Innstillinger for nettsiden
      setup/              Forstegangsoppsett
      users/              Brukeradministrasjon
    admin/                Admin-sider
      (dashboard)/
        brukere/          Administrer brukere
        dashboard/        Oversikt (reservasjoner i dag)
        innstillinger/    Rediger innhold, timer, priser
        reservasjoner/    Haandter reservasjoner
    bestill/              Bestillingswizard for gjester
    globals.css           Designsystem (CSS-variabler)
    layout.tsx            Rot-layout
    page.tsx              Forsiden
  components/             React-komponenter
    A11yToolbar.tsx        Tilgjengelighetsverktoy (skriftstorrelse, kontrast)
    Footer.tsx             Bunntekst
    Header.tsx             Toppnavigasjon
    Icons.tsx              SVG-ikoner (tilgjengelige, universell utforming)
    LocaleProvider.tsx     Sprakstotte (norsk/engelsk)
  lib/                    Hjelpefunksjoner
    auth.ts               JWT og passord-hashing
    db.ts                 PostgreSQL database og skjema (postgres.js)
    i18n.ts               Oversettelser (norsk og engelsk)
    utils.ts              Validering, formatering, hjelpefunksjoner
```

## Funksjoner

### For gjester

- Bestilling av bord direkte på nettsiden, 24/7
- Flerstegs wizard: antall gjester, dato, tidspunkt, kontaktinfo, bekreftelse
- Se tilgjengelige og opptatte tidspunkter
- Bekreftelseskode etter bestilling
- Norsk og engelsk
- Universell utforming (WCAG 2.1)

### For ansatte

- Oversikt over dagens og kommende reservasjoner
- Marker reservasjoner som fullført, kansellert eller ikke-møtt
- Interaktivt bordkart for å manuelt tildele og bekrefte bord med SMS-varsling

### For administratorer

- Rediger åpningstider og stengte dager
- Endre priser, kontaktinfo og innhold på forsiden
- Brukeradministrasjon (admin/ansatt)
- Konfigurer SMS-leverandør (Twilio eller Webhook)

## Database

Applikasjonen bruker **PostgreSQL** som database. Tabellene opprettes automatisk ved første oppstart via `src/lib/db.ts`.

Tabeller:
- `users` - Kontoer
- `settings` - Konfigurasjon
- `open_days` - Åpningstider
- `special_closures` - Stengte dager
- `reservations` - Bestillinger
- `tables_config` - Bordoppsett
- `table_assignments` - Tildelte bord

## Sikkerhet

- Passord hashes med bcrypt
- Autentisering via JWT i httpOnly-cookies
- Parameteriserte SQL-spørringer (postgres.js tagged templates)
- CORS og Input-validering

## SMS-oppsett (valgfritt)

Restaurant Utsyn har to måter å sende SMS-bekreftelser på, som kan konfigureres under admin-innstillingene ved å endre "SMS Leverandør":

### 1. Twilio (Direkte integrasjon - Anbefalt)
Fyll inn dine API-detaljer rett i innstillingene, så sender systemet SMS helt automatisk uten noen mellomledd:
- **Twilio Account SID**
- **Twilio Auth Token**
- **Twilio Sender Number**

### 2. Webhook (Make.com, Zapier, etc.)
Ved å bruke Webhook sender systemet en POST-forespørsel til en gitt URL. Perfekt hvis du vil koble SMS opp mot et annet system eller bruke en annen SMS-leverandør enn Twilio.
Forespørselen inneholder følgende JSON:
```json
{
  "phone": "+4712345678",
  "message": "Meldingen generert fra malene dine..."
}
```

### SMS-Maler og Utsendelse
Du kan fritt redigere innholdet på SMS-meldingene direkte i admin-panelet via to maler (med hjelp av hendige variabler som {kode}, {dato}, {tid} og {antall}):
- **SMS Mal - Ny booking:** Sendes umiddelbart og automatisk når en gjest oppretter en ny bestilling.
- **SMS Mal - Bekreftelse/Bord tildelt:** Sendes manuelt av personalet når de har tildelt nok bordplasser til gjesten via "Bordkart"-siden og deretter trykker "Bekreft & Send SMS".

## Bordkart

For å endre plassering av bordene, eller andre objekter, gå til src\app\admin\(dashboard)\bord\page.tsx og endre koordinatene i tablePositions, pillarPositions, floorPlan osv.

## Tilgjengelighet

Nettsiden folger WCAG 2.1 AA:

- Stotte for skjermlesere (ARIA-labels)
- Full tastaturnavigasjon
- Justerbar skriftstorrelse
- Hoykontrastmodus
- Minimale trykkmaal pa 44x44px
- Respekterer brukerens preferanser for redusert bevegelse
- SVG-ikoner med tilgjengelighetsstotte

## Teknologier

- **Framework:** Next.js (App Router, TypeScript)
- **Database:** PostgreSQL via `postgres.js`
- **Autentisering:** JWT + bcrypt
- **Styling:** Vanilla CSS med moderne designsystem
- **Språk:** Norsk og engelsk (i18n)

## Feilsoking

**Tilkoblingsfeil mot database:**
- Sjekk at `DATABASE_URL` i `.env.local` er korrekt
- Sjekk at databasen tillater tilkoblinger og at SSL er konfigurert hvis nødvendig (`?sslmode=require`)

**Build-feil:**
- Prøv å slette `.next`-mappen: `rm -rf .next && npm run build`

Lock-feil ved `npm run dev`:

- En annen instans kjorer. Stopp den forst, eller slett `.next/dev/lock`

## Lisens

Laget for Tangen videregående skole.
