# Analisi tecnica integrazione ANNCSU nel Censimento A.R.E.A.

**Stato:** dataset analysis approved; the conservative mapping proposal is superseded by the greenfield direction in `ANNCSU_GREENFIELD_DOMAIN.md`
**Dataset esaminati:** Toscana, estrazione `20260915`
**Ambito:** analisi soltanto; nessuna migration o modifica applicativa

## Sintesi esecutiva

ANNCSU non deve essere importato direttamente nelle tabelle operative `streets` e `civics`. Lo Stradario regionale è un catalogo ufficiale completo, mentre `Street` rappresenta oggi una via che un operatore ha scelto di usare nel Censimento. Le due responsabilità sono diverse.

La soluzione minima raccomandata è:

1. mantenere un catalogo ANNCSU regionale aggiornabile, indicizzato con gli identificativi nazionali;
2. collegare le `Street` A.R.E.A. esistenti alle entità ufficiali tramite una tabella di mapping esplicita;
3. lasciare invariati `census_zone_streets`, `civics`, `census_records` e tutti i loro identificativi;
4. non creare, rinominare, fondere o eliminare automaticamente una `Street` operativa durante la sincronizzazione;
5. usare il nome solo per proporre un collegamento, mai come identità ANNCSU.

Il dataset reale dimostra perché un semplice campo ANNCSU su `streets` non è sempre sufficiente: in Toscana ci sono 413 gruppi in cui lo stesso Comune contiene più progressivi ANNCSU con lo stesso odonimo normalizzato. Nella maggior parte dei casi la `LOCALITA'` li distingue, ma 15 gruppi hanno anche la stessa località. Il `PROGRESSIVO_NAZIONALE` è quindi la sola chiave affidabile dell'area di circolazione.

## 1. Struttura ANNCSU trovata

### 1.1 Contenitori e formato

| Dataset | ZIP | Contenuto | Dimensione CSV | Righe dati |
|---|---|---|---:|---:|
| Stradario Toscana | `stradarioToscana20260915.zip` | `STRAD_TOSC_20260915.csv` | 4.492.171 byte | 87.147 |
| Indirizzario Toscana | `indirizzarioToscana20260915.zip` | `INDIR_TOSC_20260915.csv` | 160.202.399 byte | 1.901.458 |

Caratteristiche verificate sui file completi:

- CSV testuale dentro ZIP;
- codifica UTF-8 valida, senza BOM;
- terminatore di riga LF;
- separatore `;`;
- decimali delle coordinate con virgola, per esempio `11,0094693`;
- nessuna riga con un numero di colonne incoerente;
- lo Stradario termina ogni riga con un `;`, quindi il parser vede una colonna finale vuota senza intestazione. L'importatore deve ignorarla esplicitamente;
- i valori sono prevalentemente maiuscoli, ma questo è un dato di presentazione e non una chiave.

La pubblicazione ufficiale conferma che i dataset sono CSV compressi in ZIP e aggiornati mensilmente: [Open data ANNCSU](https://anncsu.gov.it/it/consultazione-dellarchivio/open-data/index.html).

### 1.2 Stradario

Intestazione reale:

```text
CODICE_COMUNE;CODICE_ISTAT;PROGRESSIVO_NAZIONALE;CODICE_COMUNALE;ODONIMO;LOCALITA';TOTALE_ACCESSI;DIZIONE_LINGUA1;DIZIONE_LINGUA2;
```

| Campo | Significato e riscontro nel file |
|---|---|
| `CODICE_COMUNE` | Codice catastale/Agenzia delle Entrate del Comune, 4 caratteri; sempre presente. |
| `CODICE_ISTAT` | Codice ISTAT del Comune, 6 cifre; sempre presente. |
| `PROGRESSIVO_NAZIONALE` | Identificativo nazionale dell'area di circolazione; sempre presente e unico nelle 87.147 righe. |
| `CODICE_COMUNALE` | Identificativo locale dell'odonimo; facoltativo, presente in 38.072 righe. Non è utilizzabile come chiave primaria: sono stati rilevati 93 gruppi duplicati all'interno dello stesso Comune. |
| `ODONIMO` | Etichetta pubblicata già composta da DUG + DUF, per esempio `VIA ROMA`, `VIALE ROMA`, `PIAZZA ROMA`, `LOCALITA' ...`; sempre presente. |
| `LOCALITA'` | Località/frazione facoltativa; presente in 23.075 righe. |
| `TOTALE_ACCESSI` | Numero di accessi dell'area di circolazione; sempre presente, anche con valore `0`. |
| `DIZIONE_LINGUA1`, `DIZIONE_LINGUA2` | Denominazioni in altre lingue; previste dal tracciato, ma vuote in tutta l'estrazione Toscana esaminata. |

Il metadata ufficiale definisce `ODONIMO` come DUG+DUF e conferma tipo e lunghezza dei campi: [metadata Stradario](https://anncsu.gov.it/.allegati/metadata_stradario.json).

#### Identità e omonimie

- 273 codici Comune catastali corrispondono in modo uno-a-uno a 273 codici ISTAT nell'estrazione.
- `PROGRESSIVO_NAZIONALE` è globalmente unico nel file e deve essere trattato come stringa numerica, non come numero applicativo, per evitare conversioni e limiti futuri.
- 10.965 strade hanno `TOTALE_ACCESSI = 0` e non compaiono nell'Indirizzario.
- 413 gruppi hanno lo stesso `(CODICE_COMUNE, odonimo normalizzato)` ma progressivi nazionali diversi, per 925 righe complessive.
- 15 gruppi restano duplicati anche includendo la località normalizzata. Alcuni sono coppie di cui una riga ha zero accessi; altri hanno accessi su entrambi i progressivi.

Esempi reali:

- Comune `A560`: nove progressivi distinti denominati `VIA CHIESA`, differenziati soprattutto dalla località;
- Comune `L833`: due `VIA ALESSANDRO VOLTA` nella stessa località `TORRE DEL LAGO PUCCINI`, entrambi con accessi;
- Comune `A560`: due `VIALE ROMA`, uno senza località e uno in `PONTE A SERRAGLIO`.

Conclusione: né nome, né nome+località, né `CODICE_COMUNALE` sono sostituti sicuri del progressivo nazionale.

### 1.3 Struttura dell'odonimo

L'open dataset non separa DUG e DUF, anche se il modello completo ANNCSU li distingue. Espone una sola stringa `ODONIMO` già composta.

Nel campione Toscana i primi termini più frequenti includono `VIA`, `LOCALITA'`, `PODERE`, `PIAZZA`, `STRADA`, `VICOLO`, `VIALE`, `LARGO`, `TRAVERSA`, `CORTE` e numerose tipologie locali. Sono presenti sia apostrofo ASCII (`LOCALITA'`) sia lettere accentate (`LOCALITÀ`). Queste varianti non devono essere eliminate dalla denominazione ufficiale.

Per ricerca e proposta di match è utile una chiave derivata non autorevole con:

- normalizzazione Unicode NFC;
- case-folding italiano;
- trim e compressione degli spazi;
- normalizzazione dei soli caratteri di apostrofo equivalenti.

Non è sicuro rimuovere DUG, accenti o punteggiatura per decidere automaticamente l'identità. `VIA ROMA`, `VIALE ROMA` e `PIAZZA ROMA` sono entità diverse.

### 1.4 Indirizzario

Intestazione reale:

```text
CODICE_COMUNE;CODICE_ISTAT;PROGRESSIVO_NAZIONALE;CODICE_COMUNALE;ODONIMO;LOCALITA';DIZIONE_LINGUA1;DIZIONE_LINGUA2;PROGRESSIVO_ACCESSO;CODICE_COMUNALE_ACCESSO;CIVICO;ESPONENTE;SPECIFICITA;METRICO;PROGRESSIVO_SNC;COORD_X_COMUNE;COORD_Y_COMUNE;QUOTA;METODO
```

I primi otto campi ripetono l'identità e la descrizione della strada. I campi propri dell'accesso sono:

| Campo | Significato e riscontro nel file |
|---|---|
| `PROGRESSIVO_ACCESSO` | Identificativo nazionale dell'accesso esterno; 1.901.458 valori, tutti unici. |
| `CODICE_COMUNALE_ACCESSO` | Identificativo locale facoltativo; presente in 49.730 righe. |
| `CIVICO` | Numero nella successione naturale; presente in 1.831.049 righe. |
| `ESPONENTE` | Parte letterale o suffisso del civico; presente in 355.512 righe. |
| `SPECIFICITA` | Classificazione locale, per esempio Rosso/Nero; presente in 111.569 righe. |
| `METRICO` | Numero metrico alternativo a `CIVICO`; presente in 70.409 righe. Tutte le righe senza `CIVICO` esaminate usano il metrico. |
| `PROGRESSIVO_SNC` | Indicatore/ordine degli accessi senza numero civico standard; presente in 47.499 righe. Non è l'identificativo dell'accesso: quello resta `PROGRESSIVO_ACCESSO`. |
| `COORD_X_COMUNE` | Longitudine in gradi decimali ETRF2000/ETRS89; presente in 1.555.651 righe. |
| `COORD_Y_COMUNE` | Latitudine nello stesso sistema; sempre presente insieme alla longitudine. |
| `QUOTA` | Altezza ortometrica; presente in 1.185.483 righe. |
| `METODO` | Metodo di acquisizione 1–5; presente esattamente quando sono presenti le coordinate. |

Le specifiche ufficiali descrivono l'accesso esterno, il civico, l'esponente, la specificità, il metrico e il sistema geodetico: [Specifiche tecniche ANNCSU 2024](https://www.istat.it/wp-content/uploads/2022/05/Specifiche-tecniche-anccsu-2024.pdf). Il dettaglio del tracciato open data è nel [metadata Indirizzario](https://anncsu.gov.it/.allegati/metadata_indirizzario.json).

#### Coordinate

- copertura nell'estrazione: 1.555.651 su 1.901.458 accessi, circa 81,8%;
- metodo 1: 286.333; metodo 2: 17.344; metodo 3: 464.041; metodo 4: 695.066; metodo 5: 92.867;
- le coordinate sono punti dell'accesso, non geometrie della strada;
- il sistema dichiarato è ETRF2000, epoca 2008.0, realizzazione nazionale di ETRS89; A.R.E.A. usa oggi `geography(Point,4326)` sui civici, quindi un'eventuale importazione richiederà una decisione esplicita sulla trasformazione/compatibilità, non un'assegnazione silenziosa;
- sono stati rilevati tre punti fuori da un bounding box volutamente largo della Toscana. Due sono chiaramente in altre regioni. La validazione geografica deve quindi produrre warning e quarantena, non fidarsi ciecamente del codice Regione del file.

ANNCSU precisa inoltre che l'identificativo dell'accesso resta stabile anche quando cambiano civico od odonimo, mentre le coordinate possono essere corrette ma non sono storicizzate: [Georeferenziazione numeri civici](https://www.anncsu.gov.it/it/consultazione-dellarchivio/georeferenziazione-numeri-civici/).

#### Compatibilità con `Civic`

Il modello attuale A.R.E.A. `number + extension` può rappresentare bene casi semplici come `12/A`, ma non è lossless per:

- numerazione metrica alternativa al civico;
- specificità Rosso/Nero;
- accessi SNC ordinati;
- distinzione tra più accessi fisici con la stessa etichetta civica;
- identificativo nazionale e metodo/qualità delle coordinate.

Per questo l'Indirizzario non deve essere riversato direttamente in `civics` nella prima fase. La struttura civici richiede una successiva decisione di dominio e una migration dedicata.

### 1.5 Relazione Stradario → Indirizzario

La relazione verificata è:

```text
Stradario.PROGRESSIVO_NAZIONALE (1) → (N) Indirizzario.PROGRESSIVO_NAZIONALE
Indirizzario.PROGRESSIVO_ACCESSO = identità univoca del singolo accesso
```

Nell'estrazione reale:

- tutti i 1.901.458 accessi trovano la propria strada;
- Comune, codice ISTAT, odonimo e località ripetuti nell'Indirizzario coincidono con lo Stradario;
- `TOTALE_ACCESSI` coincide per tutte le 87.147 strade con il conteggio effettivo delle righe dell'Indirizzario;
- le 10.965 strade non referenziate hanno tutte `TOTALE_ACCESSI = 0`.

Questi controlli devono diventare validation gate dell'importatore.

## 2. Struttura A.R.E.A. attuale

### 2.1 Comune

Tabella `municipalities`:

- `id uuid` PK;
- `province_id` FK;
- `name`, `italian_name`, `other_language_name`;
- `cadastral_code` nullable;
- `istat_code` nullable ma UNIQUE quando valorizzato e vincolato a sei cifre;
- metadati fonte/data e `is_active`;
- vincolo legacy `UNIQUE(province_id, name)`.

Il repository espone sia `istatCode` sia `cadastralCode`. Il collegamento ANNCSU deve richiedere la concordanza di entrambi quando disponibili; una discordanza va in quarantena.

### 2.2 Zona di censimento

Tabella `census_zones`:

- `id uuid` PK;
- `municipality_id` FK obbligatoria;
- `name`;
- `assignee_operator_id`;
- `UNIQUE(municipality_id, name)`.

Regione e Provincia sono derivate dal Comune. La Zona non duplica il territorio amministrativo.

### 2.3 Via e relazione Zona → Via

Tabella `streets`:

- `id uuid` PK;
- `municipality_id` FK obbligatoria;
- `name` e `normalized_name` generato;
- `normalized_name = lower(trim + compressione spazi)`;
- `UNIQUE(municipality_id, name)` iniziale;
- indice UNIQUE `(municipality_id, normalized_name)`.

Tabella ponte `census_zone_streets`:

- PK `(census_zone_id, street_id)`;
- stessa `Street` associabile a più Zone;
- l'associazione duplicata è ignorata con `ON CONFLICT DO NOTHING`.

`Street` è quindi l'identità condivisa a livello comunale. Rinominare una Via da una Zona aggiorna la stessa riga e cambia la denominazione visibile in tutte le Zone e in tutti i Contatti che la referenziano.

### 2.4 Creazione e associazione attuali

Una Via viene creata in due flussi:

1. `create_census_zone_lab`: durante la creazione della Zona può associare `street_id` già presenti nello stesso Comune e/o inserire una nuova Via;
2. `attach_street_to_zone_lab`: dalla gestione Zona seleziona una Via già esistente nel Comune oppure ne inserisce una nuova.

In entrambi i casi la nuova denominazione usa un upsert su `(municipality_id, normalized_name)`. Una differenza di sole maiuscole o spazi non crea una seconda riga; l'upsert può però aggiornare la forma visualizzata del nome.

L'associazione alla Zona resta sempre una riga di `census_zone_streets`; non viene copiata la Via.

### 2.5 Civici e Contatti di censimento

`civics` appartiene a `streets` e ha:

- `number` obbligatorio;
- `extension` facoltativa;
- chiavi generate normalizzate;
- UNIQUE `(street_id, normalized_number, normalized_extension)`.

`census_records` contiene contemporaneamente:

- `census_zone_id`;
- `street_id`;
- `civic_id`;
- eventuale `complex_id`.

Le RPC di creazione e modifica verificano che:

- la Via sia associata alla Zona tramite `census_zone_streets`;
- il Civico appartenga a quella Via;
- l'eventuale Complesso sia associato al Civico.

Le liste e i dettagli dei Contatti leggono direttamente i nomi da `census_zones`, `streets` e `civics`. Nessun dato ANNCSU deve quindi cambiare questi FK o sostituire le righe esistenti.

### 2.6 Multi-tenancy attuale

Il LAB non ha un'entità tenant/agenzia/organizzazione. Le policy RLS permettono l'accesso condiviso a tutti gli utenti autenticati del LAB; la migration dei permessi lo dichiara esplicitamente. Di conseguenza, il requisito “multi-tenant” non può essere completato correttamente inventando ora un `tenant_id`.

La progettazione deve separare:

- **catalogo ANNCSU globale**, condivisibile e read-only a runtime;
- **dati operativi A.R.E.A. tenant-scoped**, usando la chiave tenant reale quando verrà indicata dall'architettura A.R.E.A.

La chiave di tenant e le relative policy restano `TBD-ANNCSU-001`.

## 3. Mapping ANNCSU → A.R.E.A.

| ANNCSU | A.R.E.A. | Regola |
|---|---|---|
| `CODICE_ISTAT` | `municipalities.istat_code` | Match primario del Comune. |
| `CODICE_COMUNE` | `municipalities.cadastral_code` | Controllo incrociato obbligatorio quando valorizzato. |
| `PROGRESSIVO_NAZIONALE` | catalogo ANNCSU + mapping a `streets.id` | Identità ufficiale della strada; mai derivata dal nome. |
| `CODICE_COMUNALE` | catalogo ANNCSU | Metadato facoltativo, non chiave. |
| `ODONIMO` | `streets.name` solo dopo scelta operatore | Il valore ufficiale resta nel catalogo; il nome A.R.E.A. non viene sovrascritto dalla sync. |
| `LOCALITA'` | catalogo ANNCSU | Disambiguatore e dato di presentazione; A.R.E.A. non lo modella oggi su `Street`. |
| `TOTALE_ACCESSI` | catalogo ANNCSU | Conteggio informativo e validation check. |
| `PROGRESSIVO_ACCESSO` | futuro catalogo accessi | Identità ufficiale del punto di accesso. |
| `CIVICO` + `ESPONENTE` | possibile `Civic.number` + `extension` | Solo per casi compatibili e dopo approvazione; non basta per metrico/specificità/SNC. |
| coordinate/metodo/quota | futuro catalogo accessi; eventuale conferma su `Civic` | Non sovrascrivere automaticamente un punto A.R.E.A. verificato. |

### 3.1 “Via Roma” già presente manualmente

1. si cerca il Comune tramite codici ufficiali;
2. se la `Street` è già collegata, il progressivo decide l'identità;
3. se non è collegata, il nome normalizzato produce solo candidati;
4. un solo candidato ANNCSU e una sola `Street` non collegata possono generare una proposta ad alta confidenza, ma il primo collegamento legacy deve comunque essere confermato dall'operatore;
5. se esistono più `VIA ROMA`/località/progressivi, l'operatore deve scegliere usando località, numero di accessi e campione civici;
6. dopo la conferma si crea il mapping, non una nuova `Street`.

### 3.2 Stessa Via associata a più Zone

Non cambia nulla: il mapping ANNCSU appartiene alla `Street`, mentre le associazioni alle Zone restano in `census_zone_streets`. Un solo collegamento ufficiale serve tutte le Zone e tutti i Contatti già referenti quella Via.

### 3.3 Maiuscole/minuscole, accenti e apostrofi

- la normalizzazione corrente A.R.E.A. copre case e spazi, ma non accenti o apostrofi equivalenti;
- si propone una chiave di ricerca ANNCSU più robusta, separata dai vincoli autorevoli;
- `VIA DELL'UNITÀ`, `Via dell’Unità` e varianti simili possono essere candidati;
- nessuna normalizzazione “aggressiva” deve creare automaticamente il link o cambiare il nome mostrato.

### 3.4 VIA / Viale / Piazza / Località

La DUG fa parte dell'odonimo ufficiale. Non va rimossa per deduplicare. Un confronto senza DUG è ammesso solo come suggerimento a bassa confidenza per dati legacy incompleti.

### 3.5 Vie rinominate

Se lo stesso `PROGRESSIVO_NAZIONALE` cambia odonimo in una release successiva:

- il catalogo aggiorna la denominazione ufficiale;
- il mapping alla `Street` resta invariato;
- `streets.name` resta invariato;
- la UI segnala “denominazione A.R.E.A. diversa da ANNCSU” e offre un'eventuale azione esplicita di allineamento, chiarendo che la rinomina è globale per tutte le Zone e i Contatti.

Se un progressivo scompare e ne compare uno nuovo simile, non si presume una rinomina: il vecchio viene marcato non presente nella release corrente e il successore richiede revisione.

### 3.6 Record legacy e vie non presenti in ANNCSU

- restano validi con mapping assente;
- continuano a essere usabili in Zone, Civici, Contatti e Complessi;
- non vengono nascosti, cancellati o rinominati;
- ricevono uno stato operativo “manuale/non collegata”, non “errore”;
- un'assenza ANNCSU può dipendere da dati comunali incompleti, denominazione storica, strada privata, aggregazione legacy o granularità diversa.

### 3.7 Stesso odonimo ANNCSU in più località

Questo è il principale punto aperto. Il modello A.R.E.A. impedisce due `Street` con lo stesso nome normalizzato nello stesso Comune, mentre ANNCSU le considera talvolta aree di circolazione distinte.

La prima integrazione può collegare più progressivi ANNCSU a una sola `Street` tramite tabella ponte, preservando i dati esistenti. Tuttavia Zona e Civici restano allora alla granularità aggregata A.R.E.A. Se il requisito futuro richiede assegnare separatamente, per esempio, due `VIA CHIESA` di località diverse a Zone diverse, sarà necessaria un'esplicita evoluzione di `Street` con località/disambiguatore e una migrazione assistita. Non va anticipata senza decisione di dominio.

## 4. Modifiche DB proposte

### 4.1 Minimo raccomandato per le Vie

#### `anncsu_import_runs`

Audit di ogni snapshot:

- id;
- tipo dataset (`STRADARIO`, in futuro `INDIRIZZARIO`);
- ambito Regione e data release;
- nome file, SHA-256, dimensione;
- stato (`STARTED`, `VALIDATED`, `APPLIED`, `FAILED`);
- conteggi letti/inseriti/aggiornati/non più presenti/quarantena;
- timestamp e versione parser;
- errore sintetico sicuro.

#### `anncsu_streets`

Catalogo ufficiale corrente:

- `progressivo_nazionale` PK testuale;
- FK `municipality_id`;
- `codice_comune`, `codice_istat`, `codice_comunale`;
- `odonimo`, `localita`, dizioni lingua;
- `totale_accessi`;
- chiave di ricerca derivata non autorevole;
- `first_seen_run_id`, `last_seen_run_id`;
- `is_present_in_latest_snapshot`;
- timestamp di sincronizzazione.

Il catalogo è reference data: RLS abilitata, SELECT runtime autenticata secondo il tenant applicativo, nessuna scrittura dal browser. L'importer scrive tramite connessione server/offline privilegiata come l'import ISTAT.

#### `street_anncsu_links`

Mapping esplicito, senza duplicare `Street`:

- `street_id` FK;
- `anncsu_progressivo_nazionale` FK;
- `link_status` (`CONFIRMED`, eventualmente `PROPOSED` se le proposte devono persistere);
- `match_method` (`OPERATOR`, `EXACT_NORMALIZED_NAME`, ecc. come audit, non come verità);
- `linked_at`, `linked_by`;
- PK `(street_id, anncsu_progressivo_nazionale)`.

Vincoli necessari:

- trigger/check applicativo: Comune della `Street` uguale al Comune ANNCSU;
- lo stesso progressivo ANNCSU non può essere collegato a due `Street` dello stesso tenant;
- l'unicità deve includere la vera chiave tenant A.R.E.A.; nel LAB single-tenant può essere globale;
- nessuna cascade delete dal catalogo verso `streets` o Contatti.

La tabella ponte è preferibile a una singola colonna su `streets` perché gestisce senza perdita le aggregazioni legacy uno-a-molti emerse nel dataset reale. Non crea una seconda Via operativa: conserva solo la corrispondenza con identità esterne.

### 4.2 Non necessario nella prima migration

- modificare `census_zone_streets`;
- modificare `census_records`;
- copiare progressivi ANNCSU su ogni Zona o Contatto;
- importare tutti gli accessi;
- aggiungere geometrie di strada;
- cambiare il vincolo attuale di unicità delle `Street`;
- creare automaticamente Civici.

### 4.3 Estensione futura per i Civici

Dopo approvazione separata:

- `anncsu_accesses` con PK `PROGRESSIVO_ACCESSO`, FK al progressivo strada e tutti i campi lossless dell'Indirizzario;
- punto geografico nel sistema scelto, quota e metodo;
- mapping esplicito `civic_anncsu_links` o FK solo se verrà dimostrata la cardinalità uno-a-uno;
- regole approvate per civico/esponente, metrico, specificità e SNC;
- precedenza esplicita tra coordinate ANNCSU, automatiche e verificate dall'operatore.

## 5. Strategia di import/sincronizzazione

### 5.1 Boundary infrastrutturale

Usare un importer Node offline/server-side analogo a `scripts/sync-istat-territories.ts`:

- download solo da URL ANNCSU allowlisted oppure file fornito esplicitamente;
- nessun download dal browser e nessuna chiave privilegiata in Vercel/client;
- database URL passato all'esecuzione e non salvato nel repository;
- validazione Zod/runtime dei record esterni;
- staging e applicazione nella stessa transazione PostgreSQL;
- lock per `(dataset, regione)` per impedire due sync concorrenti.

### 5.2 Pipeline mensile idempotente

1. acquisire ZIP e calcolare SHA-256 prima di elaborarlo;
2. se esiste un run `APPLIED` con stesso hash/ambito, terminare senza scritture;
3. validare nome entry, header esatto, UTF-8, separatore, conteggi e tipi;
4. caricare in staging con chiavi testuali, senza conversioni distruttive;
5. validare unicità dei progressivi e coerenza `CODICE_ISTAT`/`CODICE_COMUNE` con `municipalities`;
6. per l'Indirizzario validare FK strada, unicità accesso, `TOTALE_ACCESSI`, coordinate accoppiate e `METODO` 1–5;
7. produrre un report e interrompere tutto se falliscono i gate bloccanti;
8. upsert del catalogo per identificativo nazionale, mai per nome;
9. marcare `is_present_in_latest_snapshot = false` solo per righe dell'ambito regionale assenti da uno snapshot completo e validato;
10. non cancellare righe catalogo, mapping o dati operativi;
11. registrare il run `APPLIED` e i conteggi nello stesso commit;
12. dopo il commit, generare proposte di link separatamente: nessuna proposta modifica `Street` finché non è confermata.

Ripetere lo stesso file o una release già applicata produce quindi lo stesso stato.

### 5.3 Aggiornamenti e conflitti

- **stesso progressivo, attributi cambiati:** aggiornare solo il catalogo e registrare il diff nel run;
- **progressivo non più presente:** marcare assente, conservare mapping e storico operativo;
- **nuovo progressivo:** inserire nel catalogo, non creare una `Street`;
- **Comune sconosciuto o codici discordanti:** quarantena e fallimento/riepilogo secondo soglia approvata;
- **coordinate fuori Regione:** warning/quarantena dell'accesso, mai propagazione automatica su `Civic`;
- **hash diverso con stessa data release:** blocco e revisione, perché può indicare ripubblicazione o file corrotto;
- **errore a metà import:** rollback completo; il run fallito resta auditabile fuori o dentro una transazione di controllo separata.

### 5.4 Multi-tenant

Il catalogo ANNCSU va importato una volta ed è condiviso. Mapping, proposte, conferme e visibilità operativa devono invece rispettare il tenant A.R.E.A.:

- nessuna copia regionale per tenant;
- indice unico del link per `(tenant_id, anncsu_progressivo_nazionale)` quando la chiave sarà nota;
- RLS del catalogo in sola lettura;
- RLS dei mapping basata sull'appartenenza della `Street` al tenant;
- audit `linked_by` legato all'utente autenticato;
- processo di import non impersona un tenant e non modifica dati operativi.

## 6. Rischi e mitigazioni

| Rischio | Impatto | Mitigazione |
|---|---|---|
| Match per solo nome | Collegamento alla strada sbagliata | Identità solo per progressivo; nome usato per proposte. |
| Omonimi nello stesso Comune | Collisione con UNIQUE A.R.E.A. | Catalogo separato e tabella ponte; decisione futura sulla granularità per località. |
| Upsert attuale aggiorna la grafia | Cambio involontario del nome operativo | La sync non usa le RPC di creazione Via e non scrive `streets.name`. |
| Rinomina ANNCSU | Rottura dei riferimenti se il nome fosse la chiave | Mapping stabile per progressivo; mismatch visibile. |
| Vie legacy assenti | Perdita di dati o blocco operativo | Mapping nullable; nessuna eliminazione. |
| `CODICE_COMUNALE` mancante/duplicato | Falso identificativo | Solo metadato. |
| Civici metrici, SNC o Rosso/Nero | Mapping lossless impossibile su `number/extension` | Catalogo accessi separato e fase civici rinviata. |
| Coordinate mancanti o anomale | Marker errati | Validazione, stato/provenienza, nessun overwrite automatico. |
| Snapshot mensile incompleto | Marcatura massiva come assente | Aggiornare `latest` solo dopo gate di completezza e transazione riuscita. |
| File molto grande | Timeout/memoria in runtime | Importer streaming offline e staging bulk, non Server Action. |
| Assenza tenant nel LAB | RLS non realmente multi-tenant | Decisione architetturale obbligatoria prima della produzione. |
| Open data senza date/storia complete | Impossibile ricostruire ogni rinomina | Audit dei propri snapshot; non inventare successioni. |

## 7. Casi limite da testare

- `Via Roma` manuale, un solo candidato ANNCSU;
- più `VIA ROMA` nello stesso Comune con località diverse;
- due progressivi con stesso odonimo e stessa località;
- `VIA ROMA` vs `VIALE ROMA` vs `PIAZZA ROMA`;
- apostrofo ASCII vs tipografico, lettere accentate e decomposizione Unicode;
- Via A.R.E.A. già associata a più Zone;
- stessa release importata due volte;
- release successiva con odonimo cambiato sullo stesso progressivo;
- progressivo scomparso e nuovo progressivo con nome simile;
- `CODICE_COMUNALE` duplicato;
- strada con zero accessi;
- civico con esponente, specificità, metrico e SNC;
- due accessi con stessa etichetta civica ma progressivi diversi;
- coordinate mancanti, parziali, metodo assente o fuori Regione;
- Comune presente per ISTAT ma con codice catastale discordante;
- Via legacy non presente in ANNCSU;
- rollback su errore dopo staging ma prima dell'upsert.

## 8. Piano di implementazione proposto

### Fase 0 — decisioni prima del codice

Approvare:

1. chiave tenant e modello RLS A.R.E.A.;
2. cardinalità ammessa `Street ↔ area ANNCSU`;
3. significato operativo di omonimi distinti per località;
4. policy di conferma dei match legacy;
5. comportamento UI in caso di rinomina ufficiale;
6. retention degli snapshot e del changelog.

### Fase 1 — catalogo Stradario e link Vie

- decision record e aggiornamento Domain Model;
- migration versionata per run, catalogo e mapping;
- importer streaming Toscana con dry-run e report;
- repository read-only per ricerca ANNCSU per Comune;
- UI Zona: elenco catalogo, stato già collegata/non collegata, conferma esplicita;
- nessuna modifica alle FK dei Contatti;
- test di idempotenza, omonimie, RLS, rollback e non-regressione Zone/Vie/Contatti.

### Fase 2 — sincronizzazione mensile

- scheduler/operazione amministrativa server-side;
- hash, lock, alert e metriche di diff;
- gestione `not present in latest snapshot` e rinomine;
- runbook per quarantene e ripubblicazioni.

### Fase 3 — Indirizzario e Civici, solo dopo nuova approvazione

- catalogo accessi lossless;
- decisione sui civici metrici, specificità e SNC;
- mapping ai `Civic` esistenti senza overwrite;
- policy coordinate/provenienza/verifica;
- integrazione GeoCensimento riusando `Civic`, non creando un archivio geografico parallelo.

## 9. Questioni aperte bloccanti

- Qual è la chiave tenant reale di A.R.E.A. e come una `Street` vi appartiene?
- Due aree ANNCSU con stesso odonimo ma località diverse devono essere selezionabili separatamente nelle Zone?
- Una `Street` legacy può rappresentare più progressivi ANNCSU oppure l'operatore dovrà scinderla con una migrazione assistita?
- Il primo exact match legacy può essere confermato in massa o sempre singolarmente?
- Per quanto tempo vanno conservati ZIP, hash e revisioni degli attributi ufficiali?
- In quale fase e con quale regola le coordinate ANNCSU possono diventare `AUTO_GEOLOCATED` o `VERIFIED` su `Civic`?

Fino all'approvazione di queste decisioni, nessuna migration o implementazione ANNCSU deve essere avviata.
