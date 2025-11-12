CREATE TABLE STORE_INDENT (
    TIMESTAMP          DATE,
    INDENT_NUMBER      VARCHAR2(50),
    INDENTER_NAME      VARCHAR2(100),
    DEPARTMENT         VARCHAR2(100),
    GROUP_HEAD         VARCHAR2(100),
    ITEM_CODE          VARCHAR2(50),
    PRODUCT_NAME       VARCHAR2(200),
    QUANTITY           NUMBER(10,2),
    UOM                VARCHAR2(20),
    SPECIFICATIONS     VARCHAR2(500),
    INDENT_APPROVED_BY VARCHAR2(100),
    INDENT_TYPE        VARCHAR2(50),
    ATTACHMENT         VARCHAR2(255)
);


ALTER TABLE STORE_INDENT
ADD (
    PLANNED_1          DATE,
    ACTUAL_1           DATE,
    TIME_DELAY_1       NUMBER(10,2),
    VENDOR_TYPE        VARCHAR2(100),
    APPROVED_QUANTITY  NUMBER(10,2)
);


ALTER TABLE STORE_INDENT
ADD (
    PLANNED_2           DATE,
    ACTUAL_2            DATE,
    TIME_DELAY_2        NUMBER(10,2),

    VENDOR_NAME_1       VARCHAR2(200),
    RATE_1              NUMBER(12,2),
    PAYMENT_TERM_1      VARCHAR2(200),

    VENDOR_NAME_2       VARCHAR2(200),
    RATE_2              NUMBER(12,2),
    PAYMENT_TERM_2      VARCHAR2(200),

    VENDOR_NAME_3       VARCHAR2(200),
    RATE_3              NUMBER(12,2),
    PAYMENT_TERM_3      VARCHAR2(200),

    VENDOR_NAME_4       VARCHAR2(200),
    RATE_4              NUMBER(12,2),
    PAYMENT_TERM_4      VARCHAR2(200),

    VENDOR_NAME_5       VARCHAR2(200),
    RATE_5              NUMBER(12,2),
    PAYMENT_TERM_5      VARCHAR2(200),

    VENDOR_NAME_6       VARCHAR2(200),
    RATE_6              NUMBER(12,2),
    PAYMENT_TERM_6      VARCHAR2(200),

    VENDOR_NAME_7       VARCHAR2(200),
    RATE_7              NUMBER(12,2),
    PAYMENT_TERM_7      VARCHAR2(200),

    VENDOR_NAME_8       VARCHAR2(200),
    RATE_8              NUMBER(12,2),
    PAYMENT_TERM_8      VARCHAR2(200),

    VENDOR_NAME_9       VARCHAR2(200),
    RATE_9              NUMBER(12,2),
    PAYMENT_TERM_9      VARCHAR2(200),

    VENDOR_NAME_10      VARCHAR2(200),
    RATE_10             NUMBER(12,2),
    PAYMENT_TERM_10     VARCHAR2(200),

    VENDOR_NAME_11      VARCHAR2(200),
    RATE_11             NUMBER(12,2),
    PAYMENT_TERM_11     VARCHAR2(200),

    VENDOR_NAME_12      VARCHAR2(200),
    RATE_12             NUMBER(12,2),
    PAYMENT_TERM_12     VARCHAR2(200),

    VENDOR_NAME_13      VARCHAR2(200),
    RATE_13             NUMBER(12,2),
    PAYMENT_TERM_13     VARCHAR2(200),

    VENDOR_NAME_14      VARCHAR2(200),
    RATE_14             NUMBER(12,2),
    PAYMENT_TERM_14     VARCHAR2(200),

    VENDOR_NAME_15      VARCHAR2(200),
    RATE_15             NUMBER(12,2),
    PAYMENT_TERM_15     VARCHAR2(200),

    COMPARISON_SHEET    VARCHAR2(255)
);




CREATE OR REPLACE TRIGGER trg_set_planned1
BEFORE INSERT ON STORE_INDENT
FOR EACH ROW
BEGIN
  -- If PLANNED_1 is not provided, set it equal to TIMESTAMP
  IF :NEW.PLANNED_1 IS NULL THEN
    :NEW.PLANNED_1 := :NEW.TIMESTAMP;
  END IF;
END;
/



CREATE OR REPLACE TRIGGER trg_time_delay_update
BEFORE INSERT OR UPDATE ON STORE_INDENT
FOR EACH ROW
BEGIN
  IF INSERTING AND :NEW.PLANNED_1 IS NULL THEN
    :NEW.PLANNED_1 := :NEW.TIMESTAMP;
  END IF;

  IF :NEW.ACTUAL_1 IS NOT NULL THEN
    :NEW.TIME_DELAY_1 := (:NEW.ACTUAL_1 - :NEW.PLANNED_1);
  END IF;
END;
/





CREATE OR REPLACE TRIGGER trg_set_planned2_time_delay2
BEFORE INSERT OR UPDATE ON STORE_INDENT
FOR EACH ROW
BEGIN
  -- 🟢 If PLANNED_2 is null and ACTUAL_1 is provided,
  -- set PLANNED_2 = ACTUAL_1 + 2 days
  IF :NEW.PLANNED_2 IS NULL AND :NEW.ACTUAL_1 IS NOT NULL THEN
    :NEW.PLANNED_2 := :NEW.ACTUAL_1 + 2;
  END IF;

  -- 🟠 If ACTUAL_2 is provided, calculate TIME_DELAY_2
  IF :NEW.ACTUAL_2 IS NOT NULL AND :NEW.PLANNED_2 IS NOT NULL THEN
    :NEW.TIME_DELAY_2 := (:NEW.ACTUAL_2 - :NEW.PLANNED_2);
  END IF;
END;
/


ALTER TABLE STORE_INDENT
DROP COLUMN COMPARISON_SHEET;


ALTER TABLE STORE_INDENT
  ADD (
    PLANNED_3            DATE,
    ACTUAL_3             DATE,
    TIME_DELAY_3         NUMBER,
    APPROVED_VENDOR_NAME VARCHAR2(200),
    APPROVED_RATE        NUMBER(10,2),
    APPROVED_PAYMENT_TERM VARCHAR2(200),
    APPROVED_DATE        DATE,
    PLANNED_4            DATE,
    ACTUAL_4             DATE,
    TIME_DELAY_4         NUMBER,
    PO_NUMBER            VARCHAR2(100),
    PO_COPY              VARCHAR2(255),
    PLANNED_5            DATE,
    ACTUAL_5             DATE,
    TIME_DELAY_5         NUMBER,
    RECEIVE_STATUS       VARCHAR2(50),
    PLANNED_6            DATE,
    ACTUAL_6             DATE,
    TIME_DELAY_6         NUMBER,
    ISSUE_APPROVED_BY    VARCHAR2(150),
    ISSUE_STATUS         VARCHAR2(50),
    ISSUED_QUANTITY      NUMBER
  );


-- for add the trigger in planned 3 and for time delay 3

CREATE OR REPLACE TRIGGER trg_set_planned3_timedelay3
BEFORE INSERT OR UPDATE ON STORE_INDENT
FOR EACH ROW
BEGIN
  -- 🟢 1. Automatically set PLANNED_3 = ACTUAL_1 + 1 day (for Three Party)
  IF :NEW.VENDOR_TYPE = 'Three Party' AND :NEW.ACTUAL_1 IS NOT NULL THEN
    :NEW.PLANNED_3 := :NEW.ACTUAL_1 + 1;
  ELSE
    :NEW.PLANNED_3 := NULL;
  END IF;

  -- 🟣 2. Automatically set TIME_DELAY_3 = ACTUAL_3 - PLANNED_3
  IF :NEW.ACTUAL_3 IS NOT NULL AND :NEW.PLANNED_3 IS NOT NULL THEN
    -- Oracle date subtraction returns number of days (can be fractional if includes time)
    :NEW.TIME_DELAY_3 := :NEW.ACTUAL_3 - :NEW.PLANNED_3;
  ELSE
    :NEW.TIME_DELAY_3 := NULL;
  END IF;
END;
/



-- Trigger for setting PLANNED_4 and calculating TIME_DELAY_4


CREATE OR REPLACE TRIGGER trg_set_planned4_timedelay4
BEFORE INSERT OR UPDATE ON STORE_INDENT
FOR EACH ROW
BEGIN
  -- 🟢 Set PLANNED_4 based on ACTUAL_3 when vendor type is 'Three Party'
  IF :NEW.VENDOR_TYPE = 'Three Party' THEN
    IF :NEW.ACTUAL_2 IS NOT NULL THEN
      IF :NEW.ACTUAL_3 IS NOT NULL THEN
        -- 🟣 Same date as ACTUAL_3
        :NEW.PLANNED_4 := :NEW.ACTUAL_3;
      ELSE
        -- 🟠 No ACTUAL_3 yet → keep PLANNED_4 blank
        :NEW.PLANNED_4 := NULL;
      END IF;
    END IF;
  END IF;

  -- 🔵 Calculate TIME_DELAY_4 when ACTUAL_4 is provided
  IF :NEW.ACTUAL_4 IS NOT NULL AND :NEW.PLANNED_4 IS NOT NULL THEN
    :NEW.TIME_DELAY_4 := (:NEW.ACTUAL_4 - :NEW.PLANNED_4);
  ELSE
    :NEW.TIME_DELAY_4 := NULL;
  END IF;
END;
/



-- Trigger for setting planned 5 and calculating time delay 5


CREATE OR REPLACE TRIGGER trg_set_planned5_timedelay5
BEFORE INSERT OR UPDATE ON STORE_INDENT
FOR EACH ROW
BEGIN
  -- 🟢 Set PLANNED_5 when vendor type is Three Party and ACTUAL_4 exists
  IF :NEW.VENDOR_TYPE = 'Three Party' THEN
    IF :NEW.ACTUAL_4 IS NOT NULL THEN
      -- 🟣 Add 2 days to ACTUAL_4
      :NEW.PLANNED_5 := :NEW.ACTUAL_4 + 2;
    ELSE
      -- 🟠 No ACTUAL_4 yet → keep PLANNED_5 blank
      :NEW.PLANNED_5 := NULL;
    END IF;
  END IF;

  -- 🔵 Calculate TIME_DELAY_5 automatically when ACTUAL_5 is provided
  IF :NEW.ACTUAL_5 IS NOT NULL AND :NEW.PLANNED_5 IS NOT NULL THEN
    :NEW.TIME_DELAY_5 := (:NEW.ACTUAL_5 - :NEW.PLANNED_5);
  ELSE
    :NEW.TIME_DELAY_5 := NULL;
  END IF;
END;
/




-- Trigger for setting planned 6 and calculating time delay 6



-- VENDOR_TYPE	ACTUAL_5	→ PLANNED_6	ACTUAL_6	→ TIME_DELAY_6
-- Purchase	10-Oct-2025	NULL	—	NULL
-- Three Party	10-Oct-2025	11-Oct-2025	12-Oct-2025	1 day
-- Regular	15-Oct-2025	16-Oct-2025	17-Oct-2025	1 day


CREATE OR REPLACE TRIGGER trg_set_planned6_timedelay6
BEFORE INSERT OR UPDATE ON STORE_INDENT
FOR EACH ROW
BEGIN
  -- 🟢 If vendor type is "Purchase", keep PLANNED_6 blank
  IF :NEW.VENDOR_TYPE = 'Purchase' THEN
    :NEW.PLANNED_6 := NULL;
  
  -- 🟣 Otherwise, calculate PLANNED_6 based on ACTUAL_5
  ELSE
    IF :NEW.ACTUAL_5 IS NOT NULL THEN
      -- Add 1 day to ACTUAL_5
      :NEW.PLANNED_6 := :NEW.ACTUAL_5 + 1;
    ELSE
      :NEW.PLANNED_6 := NULL;
    END IF;
  END IF;

  -- 🔵 Calculate TIME_DELAY_6 if ACTUAL_6 exists
  IF :NEW.ACTUAL_6 IS NOT NULL AND :NEW.PLANNED_6 IS NOT NULL THEN
    :NEW.TIME_DELAY_6 := (:NEW.ACTUAL_6 - :NEW.PLANNED_6);
  ELSE
    :NEW.TIME_DELAY_6 := NULL;
  END IF;
END;
/
