# Known current Censimento behavior

Navigation: Censimento → Nuovo Contatto, Contatti, Zone (Elenco/Nuova), Complessi.

A zone is created through cascading country, region, province and municipality selections, then name and assignee. Existing municipality streets can be associated and new streets can be created explicitly. Streets belong to zones through a many-to-many relationship. Civics are managed from a zone street as a single value, an inclusive range (all/even/odd) or a manual list; number and extension remain separate and normalized duplicates are rejected.

A Subject is an authoritative registry entry, either a private person or company. A CensusRecord is a property context with required zone/street/civic location, optional complex, whole/part building choice, manual cadastral fields, property characteristics and responsible operator. Subjects and records are many-to-many with a Proprietario/Inquilino role. During creation the operator can select an existing subject; matching CF/P.IVA is suggested, while names never merge automatically. Contact types confirmed are Generico, Informatore, Informazione and Notizia. Appraisal is manual and defaults false even for Notizia.

Interviews remain historical children of one property context. Creating a CensusRecord never creates an interview or synthetic event. The subject sheet aggregates linked properties and their interview counts without changing interview ownership. “Non ancora contattati” remains derived from zero real interview rows on the context.

Civic number and extension are separate. `Intero edificio` stores the number of levels; `Parte di edificio` stores a controlled floor code, optional total floors and an independent top-floor flag. Qualification is controlled to Proprietario/Inquilino; occupancy uses the five confirmed values. A complex has a zone, name, sheet/parcel and description and may link to many civics/extensions. The contact form only offers complexes already associated with its selected civic and never creates territory implicitly.
