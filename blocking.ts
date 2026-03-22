import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

// за допомогою модулю crypto згенеруємо три великих (2gb+) файли із псевдорандомними байтам
function generateRandomFile(fileName: string, sizeInBytes: number): void {
  const data = randomBytes(sizeInBytes);
  writeFileSync(fileName, data);
}

// запустимо блокуючі операції та відслідкуємо час старту та завершення
const start = performance.now();
generateRandomFile('text_1.txt', 1024 * 1024 * 2030);
generateRandomFile('text_2.txt', 1024 * 1024 * 2030);
generateRandomFile('text_3.txt', 1024 * 1024 * 2030);
console.log(`Files written in ${performance.now() - start} ms`);

// тепер прочитаємо створені файли також синхронно, відслідкуємо час та виведемо розміри файлів як індикатор, що вони були успішно прочитані
function blockingFileReading(): void {
  const start = performance.now();

  const t1 = readFileSync('text_1.txt');
  const t2 = readFileSync('text_2.txt');
  const t3 = readFileSync('text_3.txt');

  const toGb = (bytes: number) => {
    return (bytes / 10 ** 9).toFixed(2);
  };

  console.log(toGb(t1.length), toGb(t2.length), toGb(t3.length));

  console.log(`Files read in ${performance.now() - start} ms`);
}

blockingFileReading();

// виведемо щось у консоль у самому кінці для індикації заврешення виконання синхронного коду
console.log('Blocking operation executed');
