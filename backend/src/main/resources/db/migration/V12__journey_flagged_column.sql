-- Journey.flagged is mapped by the entity but was never added to a migration, so a schema
-- built from these files alone was one column short of what Hibernate's ddl-auto: validate
-- expects. The local H2 database already has it because Hibernate created the column there.
ALTER TABLE journeys
    ADD COLUMN flagged BOOLEAN NOT NULL DEFAULT FALSE;
