-- Precious metals tracker: gold, silver, platinum and palladium, as raw metal (bars, coins) or jewellery.

CREATE TABLE IF NOT EXISTS precious_metal_items (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id         UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    owner_user_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_by           UUID REFERENCES users(id) ON DELETE SET NULL,

    name                 VARCHAR(255) NOT NULL,
    metal                VARCHAR(20) NOT NULL CHECK (metal IN ('GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM')),
    form                 VARCHAR(20) NOT NULL CHECK (form IN ('RAW', 'JEWELLERY')),
    item_type            VARCHAR(30) NOT NULL DEFAULT 'OTHER',
    purity_label         VARCHAR(30),
    fineness             NUMERIC(6,2) NOT NULL CHECK (fineness >= 100 AND fineness <= 1000),  -- parts per 1000 (999, 916, 925 ...)
    pieces               INTEGER NOT NULL DEFAULT 1 CHECK (pieces >= 1),

    gross_weight_g       NUMERIC(14,3) NOT NULL CHECK (gross_weight_g > 0),
    stone_weight_g       NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (stone_weight_g >= 0),
    net_weight_g         NUMERIC(14,3) NOT NULL CHECK (net_weight_g > 0),

    acquired_via         VARCHAR(20) NOT NULL DEFAULT 'PURCHASE' CHECK (acquired_via IN ('PURCHASE', 'GIFT', 'INHERITANCE', 'OTHER')),
    purchase_date        DATE,
    purchase_rate_per_g  NUMERIC(14,2),            -- reference-purity (999) rate per gram on the day of purchase
    metal_cost           NUMERIC(16,2),
    making_charge_type   VARCHAR(10) CHECK (making_charge_type IN ('PER_GRAM', 'PERCENT', 'FLAT')),
    making_charge_value  NUMERIC(14,2),
    making_charges       NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (making_charges >= 0),
    wastage_percent      NUMERIC(5,2),
    stone_charges        NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (stone_charges >= 0),
    gst_amount           NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (gst_amount >= 0),
    other_charges        NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (other_charges >= 0),
    total_cost           NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
    seller_name          VARCHAR(255),
    invoice_number       VARCHAR(100),

    hallmarked           BOOLEAN NOT NULL DEFAULT FALSE,
    huid                 VARCHAR(20),
    storage_location     VARCHAR(20) NOT NULL DEFAULT 'HOME' CHECK (storage_location IN ('HOME', 'BANK_LOCKER', 'JEWELLER', 'FAMILY', 'OTHER')),
    storage_details      VARCHAR(255),
    insured              BOOLEAN NOT NULL DEFAULT FALSE,
    insurance_details    VARCHAR(255),
    notes                TEXT,

    status               VARCHAR(10) NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'SOLD')),
    sale_date            DATE,
    sale_amount          NUMERIC(16,2) CHECK (sale_amount IS NULL OR sale_amount >= 0),
    sale_notes           VARCHAR(255),

    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pm_net_le_gross CHECK (net_weight_g <= gross_weight_g)
);

CREATE INDEX IF NOT EXISTS idx_pm_items_household ON precious_metal_items (household_id, status);
CREATE INDEX IF NOT EXISTS idx_pm_items_owner ON precious_metal_items (household_id, owner_user_id);

-- Rates are entered by the household (no public price feed is wired in). Per gram of reference purity (999).
CREATE TABLE IF NOT EXISTS precious_metal_rates (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    metal          VARCHAR(20) NOT NULL CHECK (metal IN ('GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM')),
    rate_per_gram  NUMERIC(14,2) NOT NULL CHECK (rate_per_gram > 0),
    rate_date      DATE NOT NULL,
    note           VARCHAR(255),
    created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pm_rate_day UNIQUE (household_id, metal, rate_date)
);

CREATE INDEX IF NOT EXISTS idx_pm_rates_lookup ON precious_metal_rates (household_id, metal, rate_date DESC);
