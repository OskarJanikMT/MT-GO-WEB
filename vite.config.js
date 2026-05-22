import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const productsDir = path.join(__dirname, 'Produkty');
const recipesFilePath = path.join(__dirname, 'receptury.json');
const configFilePath = path.join(__dirname, 'config.json');
const execFileAsync = promisify(execFile);
const defaultAppConfig = {
  stations: [],
  activeMachineId: 'machine-1',
  machines: [
    {
      id: 'machine-1',
      name: 'Maszyna 1',
      rowLimit: 500,
    },
  ],
  favoriteElements: [],
};

const editableColumnAliases = {
  Kod: ['Kod', 'Nadruk'],
  Nazwa: ['Nazwa', 'TYTUŁ', 'Nazwa mebla'],
  ilość: ['Ilość', 'ILOŚĆ', 'Ilosc'],
  Materiał: ['Materiał', 'MATERIAŁ', 'OPIS', 'gatunek drewna'],
  Długość: ['DŁ', 'DŁ. [mm]', 'Dł', 'Dł. [mm]', 'Dlugosc'],
  Grubość: ['GR.', 'GR. [mm]', 'Grubosc'],
  Szerokość: ['Sz', 'SZER. [mm]', 'Szerokosc'],
  Grupa: ['Grupa', 'GRUPA'],
  Priorytet: ['Priorytet', 'PRIORYTET'],
  Wybijak: ['Wybijak'],
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function normalizeCellValue(_column, value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function resolveHeaderName(headers, aliases) {
  return headers.find((header) => aliases.includes(header));
}

function buildSheetMatrix(headers, rows) {
  const nextHeaders = [...headers];

  for (const aliases of Object.values(editableColumnAliases)) {
    const hasMatchingHeader = nextHeaders.some((header) => aliases.includes(header));
    if (!hasMatchingHeader && aliases[0]) {
      nextHeaders.push(aliases[0]);
    }
  }

  return [
    nextHeaders,
    ...rows.map((row) => {
      const baseRow = row._originalRowData && typeof row._originalRowData === 'object' ? { ...row._originalRowData } : {};

      for (const [column, aliases] of Object.entries(editableColumnAliases)) {
        const headerName = resolveHeaderName(nextHeaders, aliases);
        if (!headerName) continue;
        baseRow[headerName] = normalizeCellValue(column, row[column]);
      }

      return nextHeaders.map((header) => baseRow[header] ?? '');
    }),
  ];
}

async function resolveUniqueProductFilePath(fileName) {
  const parsed = path.parse(fileName);
  const extension = parsed.ext || '.xlsx';
  const baseName = parsed.name || 'Produkt';
  let candidate = `${baseName}${extension}`;
  let counter = 1;

  while (true) {
    const filePath = path.join(productsDir, candidate);
    try {
      await fs.access(filePath);
      candidate = `${baseName} (${counter})${extension}`;
      counter += 1;
    } catch {
      return filePath;
    }
  }
}

function createSqlLogPrefix(kind, sqlServer, sqlDatabase) {
  return `[MTGO SQL ${new Date().toISOString()}] [${kind}] [${sqlServer}/${sqlDatabase}]`;
}

function padDateTimePart(value) {
  return String(value).padStart(2, '0');
}

function formatRecipeTimestamp(date = new Date()) {
  return `${date.getFullYear()}-${padDateTimePart(date.getMonth() + 1)}-${padDateTimePart(date.getDate())} ${padDateTimePart(date.getHours())}:${padDateTimePart(date.getMinutes())}:${padDateTimePart(date.getSeconds())}`;
}

function normalizeRecipeTimestamp(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }

  const polishMatch = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (polishMatch) {
    const [, day, month, year, hours, minutes, seconds = '00'] = polishMatch;
    return `${year}-${padDateTimePart(month)}-${padDateTimePart(day)} ${padDateTimePart(hours)}:${padDateTimePart(minutes)}:${padDateTimePart(seconds)}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return formatRecipeTimestamp(parsed);
  }

  return raw;
}

function normalizeRecipeEntry(entry) {
  const createdAt = normalizeRecipeTimestamp(entry?.createdAt || entry?.CzasOdloz || '') || formatRecipeTimestamp(new Date());
  const lastUsedAt = normalizeRecipeTimestamp(entry?.lastUsedAt || '');
  return {
    ...entry,
    idRap: entry?.idRap ?? Date.now(),
    nazwaReceptury: String(entry?.nazwaReceptury || '').trim(),
    CzasOdloz: createdAt,
    createdAt,
    lastUsedAt,
    Usr: entry?.Usr ?? 'Default',
    rows: Array.isArray(entry?.rows) ? entry.rows : [],
  };
}

async function readRecipeCatalog() {
  try {
    const content = await fs.readFile(recipesFilePath, 'utf8');
    const payload = JSON.parse(content);
    return Array.isArray(payload?.recipes) ? payload.recipes.map((entry) => normalizeRecipeEntry(entry)) : [];
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeRecipeCatalog(recipes) {
  await fs.writeFile(
    recipesFilePath,
    JSON.stringify({ recipes: Array.isArray(recipes) ? recipes.map((entry) => normalizeRecipeEntry(entry)) : [] }, null, 2),
    'utf8',
  );
}

async function readAppConfig() {
  try {
    const content = await fs.readFile(configFilePath, 'utf8');
    const payload = JSON.parse(content);
    return payload && typeof payload === 'object' ? payload : defaultAppConfig;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return defaultAppConfig;
    }
    throw error;
  }
}

async function writeAppConfig(config) {
  await fs.writeFile(
    configFilePath,
    JSON.stringify(config && typeof config === 'object' ? config : defaultAppConfig, null, 2),
    'utf8',
  );
}

function toSqlLiteral(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `N'${String(value).replace(/'/g, "''")}'`;
}

function toSqlNumber(value, fallback = 0) {
  const normalized = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(normalized) ? normalized : fallback;
}

function buildWorkMainUploadSql(rows) {
  const valuesSql = rows
    .map((row, index) => `(
${index + 1},
${toSqlLiteral(row.Material)},
${toSqlLiteral(row.Przekroj)},
${toSqlNumber(row.Grubosc)},
${toSqlNumber(row.Szerokosc)},
${toSqlNumber(row.Dlugosc)},
${toSqlNumber(row.Sztuk)},
${toSqlNumber(row.Wybijaki)},
${toSqlLiteral(row.TekstDoDruku)},
${toSqlLiteral(row.Grupa)},
${toSqlLiteral(row.Priorytet)},
${toSqlNumber(row.Klasa)},
${toSqlLiteral(row.Nazwa)},
${toSqlLiteral(row.NazwaRec)},
${toSqlLiteral(row.Usr || 'Default')},
${toSqlNumber(row.Stanowisko)},
${toSqlNumber(row.zliczonaIloscIn)}
)`)
    .join(',\n');

  return `SET NOCOUNT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  CREATE TABLE #WorkMainUpload (
    id INT NOT NULL,
    Material NVARCHAR(255) NULL,
    Przekroj NVARCHAR(255) NULL,
    Grubosc INT NULL,
    Szerokosc INT NULL,
    Dlugosc INT NULL,
    Sztuk INT NULL,
    Wybijak INT NULL,
    TekstDoDruku NVARCHAR(255) NULL,
    Grupa NVARCHAR(255) NULL,
    Priorytet NVARCHAR(255) NULL,
    Klasa INT NULL,
    Nazwa NVARCHAR(255) NULL,
    NazwaRec NVARCHAR(255) NULL,
    Usr NVARCHAR(255) NULL,
    Stanowisko INT NULL,
    zliczonaIloscIn INT NULL
  );

  INSERT INTO #WorkMainUpload (
    id,
    Material,
    Przekroj,
    Grubosc,
    Szerokosc,
    Dlugosc,
    Sztuk,
    Wybijak,
    TekstDoDruku,
    Grupa,
    Priorytet,
    Klasa,
    Nazwa,
    NazwaRec,
    Usr,
    Stanowisko,
    zliczonaIloscIn
  )
  VALUES
  ${valuesSql};

  DELETE FROM dbo.WorkMain;

  DECLARE @countColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'zliczonaIloscIn') IS NOT NULL THEN 'zliczonaIloscIn'
      WHEN COL_LENGTH('dbo.WorkMain', 'zliczIloscWej') IS NOT NULL THEN 'zliczIloscWej'
      ELSE NULL
    END;

  DECLARE @classColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'Klasa') IS NOT NULL THEN 'Klasa'
      ELSE NULL
    END;

  DECLARE @groupColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'Grupa') IS NOT NULL THEN 'Grupa'
      ELSE NULL
    END;

  DECLARE @priorityColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'Priorytet') IS NOT NULL THEN 'Priorytet'
      ELSE NULL
    END;

  DECLARE @gruboscColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'gr') IS NOT NULL THEN 'gr'
      ELSE NULL
    END;

  DECLARE @szerokoscColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'szer') IS NOT NULL THEN 'szer'
      ELSE NULL
    END;

  DECLARE @stationColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'Stanowisko') IS NOT NULL THEN 'Stanowisko'
      ELSE NULL
    END;

  DECLARE @recipeNameColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'NazwaRec') IS NOT NULL THEN 'NazwaRec'
      ELSE NULL
    END;

  DECLARE @userColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'Usr') IS NOT NULL THEN 'Usr'
      ELSE NULL
    END;

  DECLARE @createdAtColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'CzasUtw') IS NOT NULL THEN 'CzasUtw'
      ELSE NULL
    END;

  DECLARE @sql NVARCHAR(MAX) = N'
    INSERT INTO dbo.WorkMain (
      id,
      Material,
      Przekroj,
      ' + CASE WHEN @gruboscColumn IS NOT NULL THEN QUOTENAME(@gruboscColumn) + N',
      ' ELSE N'' END + CASE WHEN @szerokoscColumn IS NOT NULL THEN QUOTENAME(@szerokoscColumn) + N',
      ' ELSE N'' END + N'
      Dlugosc,
      Sztuk,
      Wybijak,
      TekstDoDruku' + CASE WHEN @groupColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@groupColumn) ELSE N'' END + CASE WHEN @priorityColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@priorityColumn) ELSE N'' END + CASE WHEN @classColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@classColumn) ELSE N'' END + N',
      Nazwa' + CASE WHEN @recipeNameColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@recipeNameColumn) ELSE N'' END + CASE WHEN @userColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@userColumn) ELSE N'' END + CASE WHEN @createdAtColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@createdAtColumn) ELSE N'' END + CASE WHEN @stationColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@stationColumn) ELSE N'' END + CASE WHEN @countColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@countColumn) ELSE N'' END + N'
    )
    SELECT
      id,
      Material,
      Przekroj,
      ' + CASE WHEN @gruboscColumn IS NOT NULL THEN N'Grubosc,
      ' ELSE N'' END + CASE WHEN @szerokoscColumn IS NOT NULL THEN N'Szerokosc,
      ' ELSE N'' END + N'
      Dlugosc,
      Sztuk,
      Wybijak,
      TekstDoDruku' + CASE WHEN @groupColumn IS NOT NULL THEN N',
      Grupa' ELSE N'' END + CASE WHEN @priorityColumn IS NOT NULL THEN N',
      Priorytet' ELSE N'' END + CASE WHEN @classColumn IS NOT NULL THEN N',
      Klasa' ELSE N'' END + N',
      Nazwa' + CASE WHEN @recipeNameColumn IS NOT NULL THEN N',
      NazwaRec' ELSE N'' END + CASE WHEN @userColumn IS NOT NULL THEN N',
      Usr' ELSE N'' END + CASE WHEN @createdAtColumn IS NOT NULL THEN N',
      CONVERT(VARCHAR(19), GETDATE(), 120)' ELSE N'' END + CASE WHEN @stationColumn IS NOT NULL THEN N',
      Stanowisko' ELSE N'' END + CASE WHEN @countColumn IS NOT NULL THEN N',
      zliczonaIloscIn' ELSE N'' END + N'
    FROM #WorkMainUpload;
  ';

  IF EXISTS (
    SELECT 1
    FROM sys.identity_columns
    WHERE object_id = OBJECT_ID(N'dbo.WorkMain')
      AND name = 'id'
  )
    SET IDENTITY_INSERT dbo.WorkMain ON;

  EXEC sp_executesql @sql;

  IF EXISTS (
    SELECT 1
    FROM sys.identity_columns
    WHERE object_id = OBJECT_ID(N'dbo.WorkMain')
      AND name = 'id'
  )
    SET IDENTITY_INSERT dbo.WorkMain OFF;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
    ROLLBACK TRANSACTION;

  DECLARE @message NVARCHAR(4000) = ERROR_MESSAGE();
  THROW 50000, @message, 1;
END CATCH;`;
}

function buildWorkMainCorrectionsSql(rows) {
  const valuesSql = rows
    .map((row) => `(${toSqlNumber(row.id)}, ${toSqlNumber(row.WykonaneSztuki)})`)
    .join(',\n');

  return `SET NOCOUNT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH('dbo.WorkMain', 'WykonaneSztuki') IS NULL
    THROW 50000, 'Brak kolumny WykonaneSztuki w dbo.WorkMain.', 1;

  CREATE TABLE #WorkMainCorrections (
    id INT NOT NULL,
    WykonaneSztuki INT NOT NULL
  );

  INSERT INTO #WorkMainCorrections (id, WykonaneSztuki)
  VALUES
  ${valuesSql};

  UPDATE workmain
  SET workmain.WykonaneSztuki = corrections.WykonaneSztuki
  FROM dbo.WorkMain AS workmain
  INNER JOIN #WorkMainCorrections AS corrections ON corrections.id = workmain.id;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
    ROLLBACK TRANSACTION;

  DECLARE @message NVARCHAR(4000) = ERROR_MESSAGE();
  THROW 50000, @message, 1;
END CATCH;`;
}

function buildWorkMainSaveSql(rows) {
  const valuesSql = rows
    .map((row, index) => `(
${toSqlNumber(row.id, index + 1)},
${toSqlLiteral(row.Material)},
${toSqlLiteral(row.Przekroj)},
${toSqlNumber(row.Grubosc)},
${toSqlNumber(row.Szerokosc)},
${toSqlNumber(row.Dlugosc)},
${toSqlNumber(row.Sztuk)},
${toSqlNumber(row.WykonaneSztuki)},
${toSqlNumber(row.Wybijak)},
${toSqlLiteral(row.TekstDoDruku)},
${toSqlLiteral(row.Grupa)},
${toSqlLiteral(row.Priorytet)},
${toSqlNumber(row.Klasa)},
${toSqlLiteral(row.Nazwa)},
${toSqlLiteral(row.NazwaRec)},
${toSqlLiteral(row.Usr || 'Default')},
${toSqlNumber(row.Stanowisko)},
${toSqlNumber(row.zliczonaIloscIn)}
)`)
    .join(',\n');
  const insertRowsSql = valuesSql
    ? `  INSERT INTO #WorkMainSave (
    id,
    Material,
    Przekroj,
    Grubosc,
    Szerokosc,
    Dlugosc,
    Sztuk,
    WykonaneSztuki,
    Wybijak,
    TekstDoDruku,
    Grupa,
    Priorytet,
    Klasa,
    Nazwa,
    NazwaRec,
    Usr,
    Stanowisko,
    zliczonaIloscIn
  )
  VALUES
  ${valuesSql};

`
    : '';

  return `SET NOCOUNT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  CREATE TABLE #WorkMainSave (
    id INT NOT NULL,
    Material NVARCHAR(255) NULL,
    Przekroj NVARCHAR(255) NULL,
    Grubosc INT NULL,
    Szerokosc INT NULL,
    Dlugosc INT NULL,
    Sztuk INT NULL,
    WykonaneSztuki INT NULL,
    Wybijak INT NULL,
    TekstDoDruku NVARCHAR(255) NULL,
    Grupa NVARCHAR(255) NULL,
    Priorytet NVARCHAR(255) NULL,
    Klasa INT NULL,
    Nazwa NVARCHAR(255) NULL,
    NazwaRec NVARCHAR(255) NULL,
    Usr NVARCHAR(255) NULL,
    Stanowisko INT NULL,
    zliczonaIloscIn INT NULL
  );

${insertRowsSql}  
  DELETE FROM dbo.WorkMain;

  DECLARE @countColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'zliczonaIloscIn') IS NOT NULL THEN 'zliczonaIloscIn'
      WHEN COL_LENGTH('dbo.WorkMain', 'zliczIloscWej') IS NOT NULL THEN 'zliczIloscWej'
      ELSE NULL
    END;

  DECLARE @classColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'Klasa') IS NOT NULL THEN 'Klasa'
      ELSE NULL
    END;

  DECLARE @groupColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'Grupa') IS NOT NULL THEN 'Grupa'
      ELSE NULL
    END;

  DECLARE @priorityColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'Priorytet') IS NOT NULL THEN 'Priorytet'
      ELSE NULL
    END;

  DECLARE @gruboscColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'gr') IS NOT NULL THEN 'gr'
      ELSE NULL
    END;

  DECLARE @szerokoscColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'szer') IS NOT NULL THEN 'szer'
      ELSE NULL
    END;

  DECLARE @stationColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'Stanowisko') IS NOT NULL THEN 'Stanowisko'
      ELSE NULL
    END;

  DECLARE @recipeNameColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'NazwaRec') IS NOT NULL THEN 'NazwaRec'
      ELSE NULL
    END;

  DECLARE @userColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'Usr') IS NOT NULL THEN 'Usr'
      ELSE NULL
    END;

  DECLARE @createdAtColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'CzasUtw') IS NOT NULL THEN 'CzasUtw'
      ELSE NULL
    END;

  DECLARE @doneColumn SYSNAME =
    CASE
      WHEN COL_LENGTH('dbo.WorkMain', 'WykonaneSztuki') IS NOT NULL THEN 'WykonaneSztuki'
      ELSE NULL
    END;

  DECLARE @sql NVARCHAR(MAX) = N'
    INSERT INTO dbo.WorkMain (
      id,
      Material,
      Przekroj,
      ' + CASE WHEN @gruboscColumn IS NOT NULL THEN QUOTENAME(@gruboscColumn) + N',
      ' ELSE N'' END + CASE WHEN @szerokoscColumn IS NOT NULL THEN QUOTENAME(@szerokoscColumn) + N',
      ' ELSE N'' END + N'
      Dlugosc,
      Sztuk,
      Wybijak,
      TekstDoDruku' + CASE WHEN @groupColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@groupColumn) ELSE N'' END + CASE WHEN @priorityColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@priorityColumn) ELSE N'' END + CASE WHEN @classColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@classColumn) ELSE N'' END + N',
      Nazwa' + CASE WHEN @recipeNameColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@recipeNameColumn) ELSE N'' END + CASE WHEN @userColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@userColumn) ELSE N'' END + CASE WHEN @createdAtColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@createdAtColumn) ELSE N'' END + CASE WHEN @stationColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@stationColumn) ELSE N'' END + CASE WHEN @countColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@countColumn) ELSE N'' END + N'' + CASE WHEN @doneColumn IS NOT NULL THEN N',
      ' + QUOTENAME(@doneColumn) ELSE N'' END + N'
    )
    SELECT
      id,
      Material,
      Przekroj,
      ' + CASE WHEN @gruboscColumn IS NOT NULL THEN N'Grubosc,
      ' ELSE N'' END + CASE WHEN @szerokoscColumn IS NOT NULL THEN N'Szerokosc,
      ' ELSE N'' END + N'
      Dlugosc,
      Sztuk,
      Wybijak,
      TekstDoDruku' + CASE WHEN @groupColumn IS NOT NULL THEN N',
      Grupa' ELSE N'' END + CASE WHEN @priorityColumn IS NOT NULL THEN N',
      Priorytet' ELSE N'' END + CASE WHEN @classColumn IS NOT NULL THEN N',
      Klasa' ELSE N'' END + N',
      Nazwa' + CASE WHEN @recipeNameColumn IS NOT NULL THEN N',
      NazwaRec' ELSE N'' END + CASE WHEN @userColumn IS NOT NULL THEN N',
      Usr' ELSE N'' END + CASE WHEN @createdAtColumn IS NOT NULL THEN N',
      CONVERT(VARCHAR(19), GETDATE(), 120)' ELSE N'' END + CASE WHEN @stationColumn IS NOT NULL THEN N',
      Stanowisko' ELSE N'' END + CASE WHEN @countColumn IS NOT NULL THEN N',
      zliczonaIloscIn' ELSE N'' END + CASE WHEN @doneColumn IS NOT NULL THEN N',
      WykonaneSztuki' ELSE N'' END + N'
    FROM #WorkMainSave;
  ';

  IF EXISTS (
    SELECT 1
    FROM sys.identity_columns
    WHERE object_id = OBJECT_ID(N'dbo.WorkMain')
      AND name = 'id'
  )
    SET IDENTITY_INSERT dbo.WorkMain ON;

  EXEC sp_executesql @sql;

  IF EXISTS (
    SELECT 1
    FROM sys.identity_columns
    WHERE object_id = OBJECT_ID(N'dbo.WorkMain')
      AND name = 'id'
  )
    SET IDENTITY_INSERT dbo.WorkMain OFF;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
    ROLLBACK TRANSACTION;

  DECLARE @message NVARCHAR(4000) = ERROR_MESSAGE();
  THROW 50000, @message, 1;
END CATCH;`;
}

async function executeSqlFile(sqlText) {
  const sqlServer = process.env.MTGO_SQL_SERVER || process.env.SQL_SERVER || '';
  const sqlDatabase = process.env.MTGO_SQL_DATABASE || process.env.SQL_DATABASE || '';
  const sqlUser = process.env.MTGO_SQL_USER || process.env.SQL_USER || '';
  const sqlPassword = process.env.MTGO_SQL_PASSWORD || process.env.SQL_PASSWORD || '';
  const logPrefix = createSqlLogPrefix('EXEC', sqlServer, sqlDatabase);

  if (!sqlServer || !sqlDatabase) {
    throw new Error('Brak konfiguracji bazy. Ustaw MTGO_SQL_SERVER oraz MTGO_SQL_DATABASE.');
  }

  const tempFilePath = path.join(os.tmpdir(), `mt-go-web-workmain-${Date.now()}.sql`);
  await fs.writeFile(tempFilePath, sqlText, 'utf8');

  try {
    console.log(`${logPrefix} start połączenia przez sqlcmd`);
    const args = ['-b', '-S', sqlServer, '-d', sqlDatabase, '-i', tempFilePath];
    if (sqlUser && sqlPassword) {
      args.push('-U', sqlUser, '-P', sqlPassword);
    } else {
      args.push('-E');
    }

    await execFileAsync('sqlcmd', args, { windowsHide: true });
    console.log(`${logPrefix} połączenie OK, wykonanie zakończone sukcesem`);
  } catch (error) {
    const stderr = String(error?.stderr || '').trim();
    const stdout = String(error?.stdout || '').trim();
    console.error(`${logPrefix} błąd połączenia lub wykonania: ${stderr || stdout || error.message || 'Nieznany błąd'}`);
    throw new Error(stderr || stdout || error.message || 'Błąd wykonania sqlcmd.');
  } finally {
    await fs.unlink(tempFilePath).catch(() => {});
  }
}

async function executeSqlQuery(sqlText) {
  const sqlServer = process.env.MTGO_SQL_SERVER || process.env.SQL_SERVER || '';
  const sqlDatabase = process.env.MTGO_SQL_DATABASE || process.env.SQL_DATABASE || '';
  const sqlUser = process.env.MTGO_SQL_USER || process.env.SQL_USER || '';
  const sqlPassword = process.env.MTGO_SQL_PASSWORD || process.env.SQL_PASSWORD || '';
  const logPrefix = createSqlLogPrefix('QUERY', sqlServer, sqlDatabase);

  if (!sqlServer || !sqlDatabase) {
    throw new Error('Brak konfiguracji bazy. Ustaw MTGO_SQL_SERVER oraz MTGO_SQL_DATABASE.');
  }

  const tempFilePath = path.join(os.tmpdir(), `mt-go-web-workmain-query-${Date.now()}.sql`);
  await fs.writeFile(tempFilePath, sqlText, 'utf8');

  try {
    console.log(`${logPrefix} start połączenia przez sqlcmd`);
    const args = ['-w', '65535', '-y', '0', '-Y', '0', '-S', sqlServer, '-d', sqlDatabase, '-i', tempFilePath];
    if (sqlUser && sqlPassword) {
      args.push('-U', sqlUser, '-P', sqlPassword);
    } else {
      args.push('-E');
    }

    const { stdout } = await execFileAsync('sqlcmd', args, { windowsHide: true, maxBuffer: 1024 * 1024 * 10 });
    console.log(`${logPrefix} połączenie OK, zapytanie zakończone sukcesem`);
    return String(stdout || '').trim();
  } catch (error) {
    const stderr = String(error?.stderr || '').trim();
    const stdout = String(error?.stdout || '').trim();
    console.error(`${logPrefix} błąd połączenia lub zapytania: ${stderr || stdout || error.message || 'Nieznany błąd'}`);
    throw new Error(stderr || stdout || error.message || 'Błąd wykonania sqlcmd.');
  } finally {
    await fs.unlink(tempFilePath).catch(() => {});
  }
}

function productSavePlugin() {
  return {
    name: 'product-save-api',
    configureServer(server) {
      server.middlewares.use('/api/products/list', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const entries = await fs.readdir(productsDir, { withFileTypes: true });
          const files = entries
            .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.xlsx'))
            .map((entry) => entry.name)
            .sort((left, right) => left.localeCompare(right, 'pl'));
          sendJson(res, 200, { files });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd odczytu listy plików.' });
        }
      });

      server.middlewares.use('/api/products/file', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const requestUrl = new URL(req.url || '', 'http://127.0.0.1');
          const fileName = path.basename(requestUrl.searchParams.get('fileName') || '');

          if (!fileName.endsWith('.xlsx')) {
            sendJson(res, 400, { error: 'Nieprawidłowa nazwa pliku.' });
            return;
          }

          const filePath = path.join(productsDir, fileName);
          const content = await fs.readFile(filePath);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Cache-Control', 'no-store');
          res.end(content);
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd odczytu pliku.' });
        }
      });

      server.middlewares.use('/api/products/save', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const fileName = path.basename(body.fileName || '');
          const rows = Array.isArray(body.rows) ? body.rows : [];

          if (!fileName.endsWith('.xlsx')) {
            sendJson(res, 400, { error: 'Nieprawidłowa nazwa pliku.' });
            return;
          }

          if (rows.length > maxProductRows) {
            sendJson(res, 400, { error: `Maksymalnie ${maxProductRows} pozycji w pliku.` });
            return;
          }

          const filePath = path.join(productsDir, fileName);
          const workbook = XLSX.read(await fs.readFile(filePath));
          const firstSheetName = workbook.SheetNames[0];
          const currentSheet = workbook.Sheets[firstSheetName];
          const matrix = XLSX.utils.sheet_to_json(currentSheet, { header: 1, defval: '' });
          const headers = matrix[0] || [];

          if (!headers.length) {
            sendJson(res, 400, { error: 'Nie udało się odczytać nagłówków arkusza.' });
            return;
          }

          const nextSheet = XLSX.utils.aoa_to_sheet(buildSheetMatrix(headers, rows));

          for (let rowIndex = 1; rowIndex <= rows.length; rowIndex += 1) {
            for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
              const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
              const cell = nextSheet[cellRef];
              if (!cell) continue;
              cell.t = 's';
              if (cell.v === null || cell.v === undefined) {
                cell.v = '';
              } else {
                cell.v = String(cell.v);
              }
            }
          }

          if (currentSheet['!cols']) nextSheet['!cols'] = currentSheet['!cols'];
          if (currentSheet['!autofilter']) nextSheet['!autofilter'] = currentSheet['!autofilter'];

          workbook.Sheets[firstSheetName] = nextSheet;
          XLSX.writeFile(workbook, filePath);
          sendJson(res, 200, { ok: true });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd zapisu pliku.' });
        }
      });

      server.middlewares.use('/api/products/import', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const fileName = path.basename(body.fileName || '');
          const contentBase64 = String(body.contentBase64 || '');

          if (!fileName.endsWith('.xlsx')) {
            sendJson(res, 400, { error: 'Możesz importować tylko pliki .xlsx.' });
            return;
          }

          if (!contentBase64) {
            sendJson(res, 400, { error: 'Brak zawartości pliku do importu.' });
            return;
          }

          const targetPath = await resolveUniqueProductFilePath(fileName);
          await fs.writeFile(targetPath, Buffer.from(contentBase64, 'base64'));
          sendJson(res, 200, { ok: true, fileName: path.basename(targetPath) });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd importu pliku.' });
        }
      });

      server.middlewares.use('/api/products/duplicate', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const fileName = path.basename(body.fileName || '');

          if (!fileName.endsWith('.xlsx')) {
            sendJson(res, 400, { error: 'Możesz duplikować tylko pliki .xlsx.' });
            return;
          }

          const sourcePath = path.join(productsDir, fileName);
          const targetPath = await resolveUniqueProductFilePath(path.join(path.parse(fileName).name + ' kopia.xlsx'));
          await fs.copyFile(sourcePath, targetPath);
          sendJson(res, 200, { ok: true, fileName: path.basename(targetPath) });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd duplikowania pliku.' });
        }
      });

      server.middlewares.use('/api/products/rename', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const fileName = path.basename(body.fileName || '');
          const nextFileName = path.basename(body.nextFileName || '');

          if (!fileName.endsWith('.xlsx') || !nextFileName.endsWith('.xlsx')) {
            sendJson(res, 400, { error: 'Nazwa pliku musi kończyć się na .xlsx.' });
            return;
          }

          if (fileName === nextFileName) {
            sendJson(res, 400, { error: 'Nowa nazwa pliku musi być inna.' });
            return;
          }

          const sourcePath = path.join(productsDir, fileName);
          const targetPath = path.join(productsDir, nextFileName);

          try {
            await fs.access(targetPath);
            sendJson(res, 400, { error: 'Plik o takiej nazwie już istnieje.' });
            return;
          } catch {
            // free name
          }

          await fs.rename(sourcePath, targetPath);
          sendJson(res, 200, { ok: true, fileName: nextFileName });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd zmiany nazwy pliku.' });
        }
      });

      server.middlewares.use('/api/products/delete', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const fileName = path.basename(body.fileName || '');

          if (!fileName.endsWith('.xlsx')) {
            sendJson(res, 400, { error: 'Możesz usuwać tylko pliki .xlsx.' });
            return;
          }

          await fs.unlink(path.join(productsDir, fileName));
          sendJson(res, 200, { ok: true });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd usuwania pliku.' });
        }
      });

      server.middlewares.use('/api/recipes/save', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const recipe = body?.recipe;

          if (!recipe || typeof recipe !== 'object') {
            sendJson(res, 400, { error: 'Brak danych receptury do zapisu.' });
            return;
          }

          const recipeName = String(recipe.nazwaReceptury || '').trim();
          const rows = Array.isArray(recipe.rows) ? recipe.rows : [];

          if (!recipeName) {
            sendJson(res, 400, { error: 'Nazwa receptury jest wymagana.' });
            return;
          }

          const recipes = await readRecipeCatalog();
          if (recipes.some((entry) => entry?.nazwaReceptury === recipeName)) {
            sendJson(res, 400, { error: 'Receptura o tej nazwie już istnieje.' });
            return;
          }

          const createdAt = normalizeRecipeTimestamp(recipe.createdAt) || formatRecipeTimestamp(new Date());

          const nextRecipe = {
            idRap: recipe.idRap ?? Date.now(),
            nazwaReceptury: recipeName,
            CzasOdloz: createdAt,
            createdAt,
            lastUsedAt: normalizeRecipeTimestamp(recipe.lastUsedAt),
            Usr: recipe.Usr ?? 'Default',
            rows,
          };

          await writeRecipeCatalog([...recipes, nextRecipe]);
          sendJson(res, 200, { ok: true, recipe: nextRecipe });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd zapisu receptury.' });
        }
      });

      server.middlewares.use('/api/recipes/update', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const recipe = body?.recipe;

          if (!recipe || typeof recipe !== 'object') {
            sendJson(res, 400, { error: 'Brak danych receptury do aktualizacji.' });
            return;
          }

          const recipeName = String(recipe.nazwaReceptury || '').trim();
          const rows = Array.isArray(recipe.rows) ? recipe.rows : [];

          if (!recipeName) {
            sendJson(res, 400, { error: 'Nazwa receptury jest wymagana.' });
            return;
          }

          const recipes = await readRecipeCatalog();
          const recipeIndex = recipes.findIndex((entry) => entry?.nazwaReceptury === recipeName);
          if (recipeIndex === -1) {
            sendJson(res, 404, { error: 'Nie znaleziono receptury do aktualizacji.' });
            return;
          }

          const currentRecipe = recipes[recipeIndex];
          const nextRecipe = {
            ...currentRecipe,
            CzasOdloz: normalizeRecipeTimestamp(currentRecipe.CzasOdloz || currentRecipe.createdAt) || formatRecipeTimestamp(new Date()),
            createdAt: normalizeRecipeTimestamp(currentRecipe.createdAt || currentRecipe.CzasOdloz) || formatRecipeTimestamp(new Date()),
            lastUsedAt: normalizeRecipeTimestamp(currentRecipe.lastUsedAt),
            rows,
          };

          recipes[recipeIndex] = nextRecipe;
          await writeRecipeCatalog(recipes);
          sendJson(res, 200, { ok: true, recipe: nextRecipe });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd aktualizacji receptury.' });
        }
      });

      server.middlewares.use('/api/recipes/delete', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const recipeName = String(body?.recipeName || '').trim();

          if (!recipeName) {
            sendJson(res, 400, { error: 'Nazwa receptury jest wymagana.' });
            return;
          }

          const recipes = await readRecipeCatalog();
          const nextRecipes = recipes.filter((entry) => entry?.nazwaReceptury !== recipeName);

          if (nextRecipes.length === recipes.length) {
            sendJson(res, 404, { error: 'Nie znaleziono receptury do usunięcia.' });
            return;
          }

          await writeRecipeCatalog(nextRecipes);
          sendJson(res, 200, { ok: true });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd usuwania receptury.' });
        }
      });

      server.middlewares.use('/api/recipes/mark-used', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const recipeName = String(body?.recipeName || '').trim();

          if (!recipeName) {
            sendJson(res, 400, { error: 'Nazwa receptury jest wymagana.' });
            return;
          }

          const recipes = await readRecipeCatalog();
          const recipeIndex = recipes.findIndex((entry) => entry?.nazwaReceptury === recipeName);
          if (recipeIndex === -1) {
            sendJson(res, 404, { error: 'Nie znaleziono receptury do aktualizacji użycia.' });
            return;
          }

          const nextRecipe = {
            ...recipes[recipeIndex],
            lastUsedAt: formatRecipeTimestamp(new Date()),
          };

          recipes[recipeIndex] = nextRecipe;
          await writeRecipeCatalog(recipes);
          sendJson(res, 200, { ok: true, recipe: nextRecipe });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd aktualizacji użycia receptury.' });
        }
      });

      server.middlewares.use('/api/recipes', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const recipes = await readRecipeCatalog();
          sendJson(res, 200, { recipes });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd odczytu receptur.' });
        }
      });

      server.middlewares.use('/api/config', async (req, res) => {
        if (req.method === 'GET') {
          try {
            const config = await readAppConfig();
            sendJson(res, 200, { config });
          } catch (error) {
            sendJson(res, 500, { error: error.message || 'Błąd odczytu konfiguracji.' });
          }
          return;
        }

        if (req.method === 'POST') {
          try {
            const body = await readJsonBody(req);
            const config = body?.config;

            if (!config || typeof config !== 'object') {
              sendJson(res, 400, { error: 'Brak konfiguracji do zapisu.' });
              return;
            }

            await writeAppConfig(config);
            sendJson(res, 200, { ok: true, config });
          } catch (error) {
            sendJson(res, 500, { error: error.message || 'Błąd zapisu konfiguracji.' });
          }
          return;
        }

        sendJson(res, 405, { error: 'Method not allowed' });
      });

      server.middlewares.use('/api/workmain/upload', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const rows = Array.isArray(body.rows) ? body.rows : [];

          if (!rows.length) {
            sendJson(res, 400, { error: 'Brak wierszy do wgrania do WorkMain.' });
            return;
          }

          const sqlText = buildWorkMainUploadSql(rows);
          await executeSqlFile(sqlText);
          sendJson(res, 200, { ok: true, insertedRows: rows.length });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd wgrywania danych do WorkMain.' });
        }
      });

      server.middlewares.use('/api/workmain/corrections', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const rows = Array.isArray(body.rows) ? body.rows : [];

          if (!rows.length) {
            sendJson(res, 400, { error: 'Brak korekt do zapisania.' });
            return;
          }

          const sqlText = buildWorkMainCorrectionsSql(rows);
          await executeSqlFile(sqlText);
          sendJson(res, 200, { ok: true, updatedRows: rows.length });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd zapisu korekt WorkMain.' });
        }
      });

      server.middlewares.use('/api/workmain/save', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const rows = Array.isArray(body.rows) ? body.rows : [];

          const sqlText = buildWorkMainSaveSql(rows);
          await executeSqlFile(sqlText);
          sendJson(res, 200, { ok: true, updatedRows: rows.length });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd zapisu zmian WorkMain.' });
        }
      });

      server.middlewares.use('/api/workmain', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const sqlText = `SET NOCOUNT ON;
DECLARE @countColumn SYSNAME =
  CASE
    WHEN COL_LENGTH('dbo.WorkMain', 'zliczonaIloscIn') IS NOT NULL THEN 'zliczonaIloscIn'
    WHEN COL_LENGTH('dbo.WorkMain', 'zliczIloscWej') IS NOT NULL THEN 'zliczIloscWej'
    ELSE NULL
  END;

DECLARE @stanowiskoExpr NVARCHAR(200) =
  CASE
    WHEN COL_LENGTH('dbo.WorkMain', 'Stanowisko') IS NOT NULL THEN N'Stanowisko'
    ELSE N'CAST(NULL AS INT)'
  END;

DECLARE @klasaExpr NVARCHAR(200) =
  CASE
    WHEN COL_LENGTH('dbo.WorkMain', 'Klasa') IS NOT NULL THEN N'Klasa'
    ELSE N'CAST(NULL AS INT)'
  END;

DECLARE @grupaExpr NVARCHAR(200) =
  CASE
    WHEN COL_LENGTH('dbo.WorkMain', 'Grupa') IS NOT NULL THEN N'Grupa'
    ELSE N'CAST(NULL AS NVARCHAR(255))'
  END;

DECLARE @priorytetExpr NVARCHAR(200) =
  CASE
    WHEN COL_LENGTH('dbo.WorkMain', 'Priorytet') IS NOT NULL THEN N'Priorytet'
    ELSE N'CAST(NULL AS NVARCHAR(255))'
  END;

DECLARE @gruboscExpr NVARCHAR(200) =
  CASE
    WHEN COL_LENGTH('dbo.WorkMain', 'gr') IS NOT NULL THEN N'gr'
    ELSE N'CAST(NULL AS INT)'
  END;

DECLARE @szerokoscExpr NVARCHAR(200) =
  CASE
    WHEN COL_LENGTH('dbo.WorkMain', 'szer') IS NOT NULL THEN N'szer'
    ELSE N'CAST(NULL AS INT)'
  END;

DECLARE @wykonaneExpr NVARCHAR(200) =
  CASE
    WHEN COL_LENGTH('dbo.WorkMain', 'WykonaneSztuki') IS NOT NULL THEN N'WykonaneSztuki'
    ELSE N'CAST(NULL AS INT)'
  END;

DECLARE @sql NVARCHAR(MAX) = N'
  SELECT
    id,
    Material,
    Przekroj,
    ' + @gruboscExpr + N' AS Grubosc,
    ' + @szerokoscExpr + N' AS Szerokosc,
    Dlugosc,
    Sztuk,
    Wybijak,
    TekstDoDruku,
    ' + @grupaExpr + N' AS Grupa,
    ' + @priorytetExpr + N' AS Priorytet,
    ' + @klasaExpr + N' AS Klasa,
    Nazwa,
    ' + CASE
      WHEN @countColumn IS NOT NULL THEN QUOTENAME(@countColumn) + N' AS zliczonaIloscIn'
      ELSE N'CAST(NULL AS INT) AS zliczonaIloscIn'
    END + N',
    ' + @stanowiskoExpr + N' AS Stanowisko,
    ' + @wykonaneExpr + N' AS WykonaneSztuki
  FROM dbo.WorkMain
  ORDER BY id
  FOR JSON PATH, INCLUDE_NULL_VALUES;
';

EXEC sp_executesql @sql;`;

          const output = await executeSqlQuery(sqlText);
          const startIndex = output.indexOf('[');
          const endIndex = output.lastIndexOf(']');
          const normalizedOutput =
            startIndex >= 0 && endIndex >= startIndex ? output.slice(startIndex, endIndex + 1).replace(/\r?\n/g, '').trim() : '';
          const rows = normalizedOutput ? JSON.parse(normalizedOutput) : [];
          let normalizedRows = Array.isArray(rows) ? rows : [];

          if (!normalizedRows.length) {
            console.warn('[MTGO SQL] /api/workmain: endpoint zwrócił 0 wierszy. Uruchamiam diagnostykę dbo.WorkMain.');
            try {
              const debugSqlText = `SET NOCOUNT ON;
SELECT COUNT(*) AS totalRows FROM dbo.WorkMain;
SELECT TOP (5) * FROM dbo.WorkMain ORDER BY id;`;
              const debugOutput = await executeSqlQuery(debugSqlText);
              console.warn(`[MTGO SQL] /api/workmain: diagnostyka dbo.WorkMain:\n${debugOutput}`);
            } catch (debugError) {
              console.warn(`[MTGO SQL] /api/workmain: diagnostyka nieudana: ${debugError.message || debugError}`);
            }

            try {
              const fallbackSqlText = `SET NOCOUNT ON;
SELECT TOP (500) *
FROM dbo.WorkMain
ORDER BY id
FOR JSON PATH, INCLUDE_NULL_VALUES;`;
              const fallbackOutput = await executeSqlQuery(fallbackSqlText);
              const fallbackStartIndex = fallbackOutput.indexOf('[');
              const fallbackEndIndex = fallbackOutput.lastIndexOf(']');
              const fallbackNormalizedOutput =
                fallbackStartIndex >= 0 && fallbackEndIndex >= fallbackStartIndex
                  ? fallbackOutput.slice(fallbackStartIndex, fallbackEndIndex + 1).replace(/\r?\n/g, '').trim()
                  : '';
              const fallbackRows = fallbackNormalizedOutput ? JSON.parse(fallbackNormalizedOutput) : [];
              if (Array.isArray(fallbackRows) && fallbackRows.length) {
                normalizedRows = fallbackRows;
                console.warn(`[MTGO SQL] /api/workmain: fallback SELECT * zwrócił ${fallbackRows.length} wierszy.`);
              }
            } catch (fallbackError) {
              console.warn(`[MTGO SQL] /api/workmain: fallback SELECT * nieudany: ${fallbackError.message || fallbackError}`);
            }
          }
          sendJson(res, 200, { rows: normalizedRows });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd odczytu WorkMain.' });
        }
      });

      server.middlewares.use('/api/machine-status', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const sqlText = `SET NOCOUNT ON;
DECLARE @valueColumn SYSNAME =
  CASE
    WHEN COL_LENGTH('dbo.StatusMain', 'Wartosc') IS NOT NULL THEN 'Wartosc'
    WHEN COL_LENGTH('dbo.StatusMain', 'Wartość') IS NOT NULL THEN 'Wartość'
    WHEN COL_LENGTH('dbo.StatusMain', 'Waartość') IS NOT NULL THEN 'Waartość'
    ELSE NULL
  END;

IF @valueColumn IS NULL
  THROW 50000, 'Brak kolumny Wartosc/Wartość/Waartość w dbo.StatusMain.', 1;

DECLARE @sql NVARCHAR(MAX) = N'
  SELECT TOP (1)
    id,
    Komenda,
    ' + QUOTENAME(@valueColumn) + N' AS Wartosc
  FROM dbo.StatusMain
  WHERE LTRIM(RTRIM(COALESCE(Komenda, ''''))) = N''statusPracy''
  FOR JSON PATH, INCLUDE_NULL_VALUES;
';

EXEC sp_executesql @sql;`;

          const output = await executeSqlQuery(sqlText);
          const startIndex = output.indexOf('[');
          const endIndex = output.lastIndexOf(']');
          const normalizedOutput =
            startIndex >= 0 && endIndex >= startIndex ? output.slice(startIndex, endIndex + 1).replace(/\r?\n/g, '').trim() : '';
          const rows = normalizedOutput ? JSON.parse(normalizedOutput) : [];
          const statusRow = Array.isArray(rows) ? rows[0] ?? null : null;

          if (!statusRow) {
            console.warn('[MTGO SQL] /api/machine-status: brak wiersza dla Komenda = "statusPracy". Uruchamiam diagnostykę.');
            try {
              const debugSqlText = `SET NOCOUNT ON;
DECLARE @valueColumn SYSNAME =
  CASE
    WHEN COL_LENGTH('dbo.StatusMain', 'Wartosc') IS NOT NULL THEN 'Wartosc'
    WHEN COL_LENGTH('dbo.StatusMain', 'Wartość') IS NOT NULL THEN 'Wartość'
    WHEN COL_LENGTH('dbo.StatusMain', 'Waartość') IS NOT NULL THEN 'Waartość'
    ELSE NULL
  END;

IF @valueColumn IS NULL
  THROW 50000, 'Brak kolumny Wartosc/Wartość/Waartość w dbo.StatusMain.', 1;

DECLARE @sql NVARCHAR(MAX) = N'
  SELECT TOP (10)
    id,
    Komenda,
    ' + QUOTENAME(@valueColumn) + N' AS Wartosc
  FROM dbo.StatusMain
  ORDER BY id;
  ';

EXEC sp_executesql @sql;`;
              const debugOutput = await executeSqlQuery(debugSqlText);
              console.warn(`[MTGO SQL] /api/machine-status: podgląd pierwszych rekordów StatusMain:\n${debugOutput}`);
            } catch (debugError) {
              console.warn(`[MTGO SQL] /api/machine-status: diagnostyka nieudana: ${debugError.message || debugError}`);
            }
          }
          sendJson(res, 200, { status: statusRow });
        } catch (error) {
          sendJson(res, 500, { error: error.message || 'Błąd odczytu statusu maszyny.' });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, __dirname, ''));

  return {
    plugins: [vue(), productSavePlugin()],
    server: {
      host: '127.0.0.1',
      port: 5174,
    },
  };
});
