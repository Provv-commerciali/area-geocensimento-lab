# Censimento UX operativa — profiling LAB (2026-09-25)

## Metodo e limiti

Database dedicato `fomluksjubzimkfnzouf`, 4 Zone, 10.426 Street e 250.604 AddressAccess nella Provincia di Lucca. Le query sono state eseguite in transazioni di sola lettura; i tempi DB provengono da `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` e non includono la latenza Supabase/PostgREST, il rendering Next.js o il browser. La latenza di un singolo round trip diretto PostgreSQL osservata era circa 50–54 ms; non equivale alla latenza HTTP di produzione. I campioni di payload sono JSON delle proiezioni SQL indicate, non payload HTTP. I tempi variano con cache/carico; nessun numero è dichiarato come benchmark stabile. L'account applicativo Auth LAB è stato infine verificato, distinto dal login della dashboard Supabase.

## Diagnosi prima

| Pagina | Query applicative dal codice | Dati caricati / problema | Evidenza SQL campionata |
|---|---:|---|---:|
| Elenco Zone | 3 di base + 1 conteggio per Zona = 7; con ricerca fino a 19 | `zone_access_counts_lab` ripetuta; per ricerca fino a 200 Access per Zona, quindi risultati incompleti | un conteggio: 175,552 ms (Bagni di Lucca), 435,068 ms (Piano di Mommio); piano `Function Scan`, fino a 2.812 buffer hit |
| Dettaglio Zona | 6 | 2 query per tutte le Street associate + conteggio con osservazioni geografiche non usate dalla pagina | stesso conteggio Piano di Mommio: 435,068 ms |
| Dettaglio Via (Via Francesca) | 6 | 164 Access restituiti, ordinati per progressivo ANNCSU anziché numero; limite rigido 200 per Vie più grandi; DOM con 8 colonne spesso a zero | SELECT campione 164 righe / 20.788 B / 1,029 ms DB |
| Dettaglio Civico (Via Francesca, 59) | 8 | recupera fino a 200 Access della Via e cerca localmente l'UUID; oltre il limite genera 404 | SELECT campione 164 ID / 7.545 B / 0,288 ms DB |
| Scheda Contatto | almeno 6 più chiamate catastali condizionali | letture già vincolate a Record, Civic e Subject; intervista/storico nel record | tempo/payload end-to-end storico non misurato prima delle modifiche |

Le 4 RPC di conteggio dell'Elenco Zone sono parallele, quindi i singoli tempi non vanno sommati. Le query della stessa pagina possono anch'esse sovrapporsi. Nessuna navigazione operativa analizzata scaricava l'intera provincia nel browser; il problema osservato era N+1 sui conteggi, ricerca incompleta, molte righe DOM e query contestuali troppo ampie.

## Dopo, a parità di database

| Pagina | Query applicative dal codice | Righe / payload campione | Evidenza SQL campionata |
|---|---:|---|---:|
| Elenco Zone | 3 anche con ricerca | 4 riepiloghi / 443 B | `zone_overview_lab`: 7,821 ms DB, 444 buffer hit; ricerca civico sull'intero scope, non sui primi 200 |
| Dettaglio Zona | 5 | massimo 30 Street per pagina; campione 30 / 11.065 B | `zone_street_page_lab`: 1,7–2,5 ms DB dopo warm-up |
| Dettaglio Via (Via Francesca) | 8 (include 2 query Complessi e 2 di verifica Zone↔Street) | 40 Access / 10.971 B con tutti i campi RPC, 40 righe DOM | `street_access_page_lab` ordinamento civico: 2,5–3,1 ms DB dopo warm-up; ordinamenti operativi 2,7–3,5 ms |
| Dettaglio Civico | 8 | 1 Access per UUID / 47 B nella proiezione ID campione; Record vincolati ad Access | SELECT campione 1 ID / 2,638 ms DB; la tabella Access non ha più il limite 200 |
| Scheda Contatto | invariato | invariato; solo ritmo CSS condiviso | nessuna modifica alle query; tempo storico comparabile non disponibile |

Il dettaglio Via esegue più chiamate rispetto a prima per mostrare Complessi e verificare l'associazione, e la funzione SQL di paging costa più della SELECT sequenziale semplice. Il guadagno osservabile è nel conteggio Zone, nella correttezza di ricerca/ordinamento, nel minor payload/DOM per pagina e nel recupero puntuale del Civico; non si rivendica una riduzione del tempo server totale finché la sessione Auth non consente il profiling HTTP. Gli indici territoriali esistenti (`address_accesses_street_idx`, `census_records_address_access_idx`) sono riutilizzati; la migration aggiunge solo `census_interviews_record_date_idx` per l'ordinamento per attività/ricontatto.

## Gap funzionali, senza dati inventati

I filtri disponibili sono civico da/a, nominativo, telefono, tipologia, qualifica, Complesso, piano, locali, superficie minima, occupazione, incarico, categoria catastale, foglio, particella, subalterno, date da (inserimento/intervista/ricontatto), risposta, ascensore, probabile incarico, immobile ereditato e perizia. La ricerca/ordinamento usa i campi persistiti; la paginazione avviene nel database. Non esistono qui unità immobiliari autonome: Scala/Interno sono etichette del CensusRecord. L'ordinamento per ultima modifica usa `census_records.updated_at` nel database; la UI non presenta una data di modifica se non è necessaria alla riga. Il vecchio filtro per “storico” indeterminato resta TBD-CENSUS-002.

## Verifica browser autenticata (campione singolo, 2026-09-28)

Playwright sulla build production locale con rete abilitata verso il solo LAB ha verificato login, 4 Zone, ricerca Zona→Via per contatto, Via Francesca con 164 Access paginati a 40, pagina 2, ordinamento, filtro avanzato per nominativo, ricerca civico, apertura diretta del Contatto unico e Civico senza Contatti. Nessun errore console o overflow della pagina. Il titolo calcolato misura 25,92 px a 1440 px e 24 px a 390 px; le card della scheda Contatto sono separate da almeno 16 px. La fixture demo isolata copre anche più Contatti, Complesso e interni, non presenti nel campione reale selezionato.

Tempi `page.goto()` sulla build production locale, un solo campione con browser e database remoti: Elenco Zone **812 ms**, Dettaglio Zona **467 ms**, Dettaglio Via **424 ms**, Via filtrata **462 ms**. In sviluppo, il campione più recente era rispettivamente 493, 1.045, 1.368 e 629 ms; include compilazione on-demand e non è un confronto prima/dopo. Un tempo browser storico prima della modifica non era stato misurato: **non misurabile retroattivamente**. I confronti prima/dopo validi sono quelli SQL/payload/righe sopra, non questi tempi isolati. La build production inizialmente non completava il login perché il processo locale era avviato senza accesso rete; una volta riavviato con il perimetro LAB, il test è passato senza modifica applicativa.
