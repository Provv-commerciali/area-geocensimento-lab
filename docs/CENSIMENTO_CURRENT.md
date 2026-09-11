# Known current Censimento behavior

Navigation: Censimento → Nuovo Contatto, Contatti, Zone (Elenco/Nuova), Complessi.

A zone includes nation, region, province, municipality, name and assignee. Streets belong to zones through an explicit many-to-many relationship. The current zone list contains Zona, Comune, Operatore, Censiti, Notizia, In valutazione, Altre agenzie, Esclusive and actions; the final three aggregate meanings are TBD.

A CensusRecord includes required zone/street/civic location, optional complex, whole/part building choice, levels, person fields, manual cadastral fields, property characteristics, responsible operator and notes. Contact types confirmed are Generico, Informatore, Informazione and Notizia. Appraisal is manual and defaults false even for Notizia.

Interviews are historical child records with operator, interview date, recall date, response, reason and outcome. Contacts can be filtered across person, territory, property, cadastre, management, dates and qualification. The contextual street page does not ask again for zone or street.

Civic number and extension are separate. Floor is text because observed values include `1°`, `Intero edificio` and `3° di 10`. A complex has a zone, name, sheet/parcel and description and may link to many civics/extensions. “Mostra interni” displays linked CensusRecords without introducing `PropertyUnit`.
