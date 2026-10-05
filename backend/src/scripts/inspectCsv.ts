import fs from 'fs';
import path from 'path';

const csvPath = path.resolve('pharmasync_forecasting_dataset_6_months.csv');
const lines = fs.readFileSync(csvPath, 'utf-8').split('\n').filter(Boolean);
const header = lines[0].split(',');
console.log('Header:', header);

const medMap = new Map<string, { id: string; name: string; count: number; minDate: string; maxDate: string }>();

for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(',');
  if (parts.length < 13) continue;
  const date = parts[0].trim();
  const medId = parts[1].trim();
  const medName = parts[2].trim();

  if (!medMap.has(medId)) {
    medMap.set(medId, { id: medId, name: medName, count: 0, minDate: date, maxDate: date });
  }
  const entry = medMap.get(medId)!;
  entry.count++;
  if (date < entry.minDate) entry.minDate = date;
  if (date > entry.maxDate) entry.maxDate = date;
}

console.log(`\nTotal unique medicines in CSV: ${medMap.size}`);
console.log(`Total rows parsed: ${lines.length - 1}`);

const sortedMeds = Array.from(medMap.values()).sort((a, b) => a.id.localeCompare(b.id));
sortedMeds.forEach((m) => {
  console.log(`${m.id.padEnd(8)} | ${m.name.padEnd(32)} | count: ${m.count} | ${m.minDate} -> ${m.maxDate}`);
});
