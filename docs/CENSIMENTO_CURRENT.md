# Known current Censimento behavior

Navigation: Censimento → Nuovo Contatto, Contatti, Zone (Elenco/Nuova), Complessi.

A zone is created through cascading country, region, province and municipality selections, then name and assignee. Existing municipality streets can be associated and new streets can be created explicitly. Streets belong to zones through a many-to-many relationship. Civics are managed from a zone street as a single value, an inclusive range (all/even/odd) or a manual list; number and extension remain separate and normalized duplicates are rejected.

A CensusRecord includes required zone/street/civic location, optional complex, whole/part building choice, levels, person fields, manual cadastral fields, property characteristics, responsible operator and notes. Contact types confirmed are Generico, Informatore, Informazione and Notizia. Appraisal is manual and defaults false even for Notizia.

Interviews are historical child records with operator, interview date, recall date, response, reason and outcome. Creating a CensusRecord never creates an interview or synthetic event: a first interview is recorded only by an explicit action on the contact sheet. “Non ancora contattati” is derived from zero real interview rows. Contacts can be filtered across person, territory, property, cadastre, management, dates and qualification. The contextual street page does not ask again for zone or street.

Civic number and extension are separate. `Intero edificio` stores the number of levels; `Parte di edificio` stores a controlled floor code, optional total floors and an independent top-floor flag. Qualification is controlled to Proprietario/Inquilino; occupancy uses the five confirmed values. A complex has a zone, name, sheet/parcel and description and may link to many civics/extensions. The contact form only offers complexes already associated with its selected civic and never creates territory implicitly.
