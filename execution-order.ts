console.log('A — sync'); // 1

setTimeout(() => console.log('B — setTimeout'), 0); // 6

setImmediate(() => console.log('C — setImmediate')); // 7

process.nextTick(() => console.log('D — nextTick')); // 5 (а не 3 як у CJS!)

Promise.resolve().then(() => console.log('E — promise.then')); // 3

queueMicrotask(() => console.log('F — queueMicrotask')); // 4

console.log('G — sync'); // 2

// ESM порядок:
// A — sync
// G — sync
// E — promise.then
// F — queueMicrotask
// D — nextTick
// B — setTimeout
// C — setImmediate

// Чому nextTick тут після промісів?
// У ESM (.ts або .mjs) Node загортає весь top-level код модуля у async функцію. Це означає що process.nextTick() реєструється в контексті, де промісові microtasks (від завантаження модуля) вже в черзі. Node спочатку дренить promise queue від ESM loader, і лише потім — nextTick.

// У CJS (execution-order.cjs) порядок стандартний:
// nextTick → promise → queueMicrotask, тому що код виконується синхронно без обгортки, і nextTick queue завжди першa.
