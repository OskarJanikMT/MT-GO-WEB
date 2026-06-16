import fs from 'node:fs/promises';
import path from 'node:path';
import XLSX from 'xlsx';

const outputDir = path.resolve('outputs', 'sample-product-import');
const outputPath = path.join(outputDir, 'przykladowy-import-produktow.xlsx');

const headers = ['Nazwa', 'Kod', 'Długość', 'Grubość', 'Szerokość', 'Materiał', 'ilość', 'Wybijak', 'Klasa'];
const rows = [
  ['Szafka RTV Milano', 'RTV-MIL-001', 1200, 18, 450, 'Płyta laminowana dąb sonoma', 4, 'WB-01', 'A'],
  ['Komoda Oslo', 'KOM-OSL-014', 800, 18, 400, 'Płyta laminowana biały mat', 6, 'WB-02', 'B'],
  ['Biurko Nova', 'BIU-NOV-022', 1400, 25, 600, 'MDF grafit', 2, 'WB-03', 'A'],
  ['Półka Simple', 'POL-SIM-007', 600, 18, 250, 'Sklejka brzozowa', 8, '', 'C'],
  ['Stół Loft', 'STL-LOF-031', 1600, 36, 800, 'Dąb lity', 1, 'WB-04', ''],
];

const helpRows = [
  ['Kolumna', 'Wymagana', 'Opis'],
  ['Nazwa', 'Nie', 'Nazwa produktu lub elementu.'],
  ['Kod', 'Tak', 'Tekst do druku / identyfikator elementu.'],
  ['Długość', 'Tak', 'Długość w mm.'],
  ['Grubość', 'Tak', 'Grubość w mm.'],
  ['Szerokość', 'Tak', 'Szerokość w mm.'],
  ['Materiał', 'Tak', 'Materiał elementu.'],
  ['ilość', 'Tak', 'Liczba sztuk.'],
  ['Wybijak', 'Nie', 'Opcjonalny wybijak.'],
  ['Klasa', 'Nie', 'Opcjonalna klasa elementu.'],
];

await fs.mkdir(outputDir, { recursive: true });

const workbook = XLSX.utils.book_new();
const productsSheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
const helpSheet = XLSX.utils.aoa_to_sheet(helpRows);

productsSheet['!cols'] = [
  { wch: 24 },
  { wch: 18 },
  { wch: 12 },
  { wch: 12 },
  { wch: 12 },
  { wch: 30 },
  { wch: 10 },
  { wch: 12 },
  { wch: 10 },
];

helpSheet['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 42 }];

XLSX.utils.book_append_sheet(workbook, productsSheet, 'Produkty');
XLSX.utils.book_append_sheet(workbook, helpSheet, 'Instrukcja');

XLSX.writeFile(workbook, outputPath);

console.log(outputPath);
