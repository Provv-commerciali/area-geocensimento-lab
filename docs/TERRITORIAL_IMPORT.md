# Archivio territoriale ISTAT/SITUAS

## Fonte e versione verificata

La fonte è ISTAT, pagina “Codici statistici delle unità amministrative territoriali: comuni, città metropolitane, province e regioni”, dataset permanente `Elenco-comuni-italiani.xlsx`. Il workbook verificato contiene il foglio `CODICI al 21_02_2026`: 20 Regioni, 110 unità territoriali sovracomunali e 7.894 Comuni vigenti. SHA-256 verificato: `83842076860450f7e482daecea6b7a769f5f93d0bf5b0d48802b44896d7a26d5`.

URL pagina: <https://www.istat.it/classificazione/codici-dei-comuni-delle-province-e-delle-regioni/>

Permalink XLSX: <https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xlsx>

L'import usa il codice Regione, il codice dell'unità territoriale sovracomunale valida a fini statistici, il codice Comune alfanumerico, le denominazioni ufficiali, la tipologia dell'unità, la sigla automobilistica, il codice catastale e NUTS3 2024. Le tipologie ISTAT 1–5 coprono Provincia, Provincia autonoma, Città metropolitana, Libero consorzio ed ex Provincia FVG valida a fini statistici.

## Prima applicazione nel Supabase LAB

1. Nel SQL Editor del solo progetto `AREA GeoCensimento Lab`, eseguire integralmente `supabase/migrations/202609110007_official_istat_territories.sql` dopo la migration `006`.
2. Dal pannello Supabase **Connect**, copiare la connection string PostgreSQL del progetto LAB (Session pooler se la connessione diretta IPv6 non è disponibile) e sostituire il placeholder password come indicato dal pannello. Non usare URL/key pubbliche e non salvare la password nel repository o in Vercel.
3. In PowerShell, dalla root del repository, impostare la connection string soltanto nella sessione corrente:

   ```powershell
   $env:SUPABASE_DB_URL = 'postgresql://...connection-string-del-solo-LAB...'
   ```

4. Validare il workbook ufficiale senza scrivere nel database:

   ```powershell
   npm run territories:sync
   ```

   L'output atteso per questa release è `2026-02-21: 20 Regioni, 110 unità territoriali, 7894 Comuni`.

5. Eseguire la sincronizzazione transazionale e idempotente:

   ```powershell
   npm run territories:sync -- --apply
   ```

6. Rimuovere subito il segreto dalla sessione:

   ```powershell
   Remove-Item Env:SUPABASE_DB_URL
   ```

Se la connessione è a PostgreSQL locale senza TLS, impostare temporaneamente anche `SUPABASE_DB_SSL=false`; sul Supabase LAB non è necessario.

È possibile validare/importare un file già scaricato e conservato per audit con `npm run territories:sync -- --source-file C:\percorso\Elenco-comuni-italiani.xlsx` e aggiungere `--apply` soltanto dopo il controllo.

## Verifiche post-import

Eseguire nel SQL Editor:

```sql
select count(*) as regioni_attive
from public.regions
where source = 'ISTAT_SITUAS' and is_active;

select count(*) as unita_territoriali_attive
from public.provinces
where source = 'ISTAT_SITUAS' and is_active;

select count(*) as comuni_attivi
from public.municipalities
where source = 'ISTAT_SITUAS' and is_active;

select c.name as nazione, r.name as regione, p.name as provincia, m.name as comune
from public.municipalities m
join public.provinces p on p.id = m.province_id
join public.regions r on r.id = p.region_id
join public.countries c on c.id = r.country_id
where m.istat_code = '046005';

select source_updated_on, region_count, province_count, municipality_count, imported_at
from public.territorial_dataset_imports
order by imported_at desc
limit 1;
```

I risultati attesi sono `20`, `110`, `7894`, il percorso `Italia → Toscana → Lucca → Camaiore`, e una riga audit datata `2026-02-21`. Verificare infine in **Zone → Nuova zona** che le select seguano lo stesso percorso e che scegliendo Toscana non compaiano province di altre Regioni.

## Aggiornamenti futuri

Lo script scarica sempre il permalink ufficiale ISTAT, valida struttura, tutti i codici Regione e soglie di completezza, poi applica tutto in una singola transazione. Prima del commit rilegge dallo stesso database i conteggi persistiti e annulla la transazione se non corrispondono al workbook. Gli upsert usano i codici ISTAT e riconciliano in place i record demo già referenziati. Le entità non più presenti non vengono cancellate: diventano `is_active = false`, preservando FK e storico LAB. Ogni esecuzione registra data del foglio, URL, SHA-256 e conteggi in `territorial_dataset_imports`.

Per una nuova release: eseguire prima il dry-run, verificare data e variazioni di conteggio contro la comunicazione ISTAT, archiviare il file/hash se richiesto, quindi rieseguire con `--apply` e ripetere le query post-import. L'app legge esclusivamente le righe attive persistite in Supabase e non contatta ISTAT durante l'apertura del form.
