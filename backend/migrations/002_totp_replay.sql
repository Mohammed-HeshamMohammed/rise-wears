-- Remember the last accepted 30-second TOTP step so a captured code can't be replayed.
ALTER TABLE users ADD COLUMN totp_last_step BIGINT NOT NULL DEFAULT 0;
