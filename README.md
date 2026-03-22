# Event Loop, однопоточність та блокування операцій

## Локальний запуск

### Клонування та підготовка

```bash
git clone https://github.com/olyaprykhodko/evoverse
cd evoverse
git checkout event-loop
```

### Запуск у контейнері

```bash
docker compose up --build -d
docker compose exec app sh
node <назва_файлу.ts>
```

## Опис та превʼю

### 1. Приклад блокуючих операцій - запис та читання файлів

Запустимо `blocking.ts` для демонстрації блокуючого читання та запису файлів:

```bash
node blocking.ts
```

```bash
console.log(`Files written in ${performance.now() - start} ms`);
```

Наприклад, цей рядок коду виведе у консоль час, який забрало виконання блокуючої операції запису трьох великих файлів, і покаже, що I/O був заблокований мінімум на 4 секунди поки виконувався запис.

```bash
console.log(`Files read in ${performance.now() - start} ms`);
```

Аналогічно і синхронне читання файлів заблокувало потік приблизно на 1-2 секунди.

### 2. Порядок виконання: Event Loop, microtasks та macrotasks

Два файли з ідентичним кодом - `execution-order.cjs` (CommonJS) та `execution-order.ts` (ESM) - демонструють як тип модуля впливає на порядок виконання асинхронного коду.

```bash
node execution-order.cjs
node execution-order.ts
```

**Різниця:** у ESM Node загортає top-level код модуля у async функцію, через що promise microtasks від ESM loader вже в черзі, і `nextTick` виконується після них. У CJS обгортки немає, тому стандартний порядок: `nextTick` → `promise` → `queueMicrotask`.

### 3. Блокуючий setTimeout

Запустимо `count-primes.ts`:

```bash
node count-primes.ts
```

У консолі можемо побачити, як після низки пінгів (інтервалів) синхронна важка операція блокує основний потік до завершення свого виконання.

```bash
// console ouput
ping
ping
...
ping
Blocking calculation started at 1062.211791
// BLOCKED
Blocking calculation ended at 8215.756669, result: 8589934591
ping
ping
...
```
