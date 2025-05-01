# Jotai Tips

Copyright 2025 Daishi Kato. All Rights Reserved.

## Tip 1: Primitive-like atoms

You can derive a primitive atom that behaves exactly the same, and you can add some side effects.

```js
// Primitive atom
const atom1 = atom(1);

// Primitive-like atom
const atom2 = atom(
  (get) => get(atom1),
  (get, set, arg) => set(atom1, arg)
);

// Primitive-like atom with logging
const atom3 = atom(
  (get) => get(atom1),
  (get, set, arg) => {
    console.log('setting atom1:', arg);
    return set(atom1, arg);
  }
);
```

## Tip 2: Early return

Unlike React hooks, Jotai atoms have no limitations regarding early return.

```js
const countAtom = atom(0);
const greetAtom = atom("Hello");

const fooAtom = atom((get) => {
  const count = get(countAtom);
  if (count > 9) return "Bye";
  return get(greetAtom);
});
```

## Tip 3: Promise value

Can you imagine how useful this is?

```js
// atom value can be a promise
const numberAtom = atom(Promise.resolve(0));

  // in component/hook
  const setNumber = useSetAtom(numberAtom);
  setNumber(new Promise((resolve) => {
    setTimeout(() => resolve(1), 1000);
  }));
```

## Tip 4: Store API

You can get/set atom values outside React since Jotai v2.

```js
const store = createStore();
const countAtom = atom(0);

setInterval(() => {
  store.set(countAtom, (c) => c + 1);
}, 1000);

const App = () => (
  <Provider store={store}>
    ...
  </Provider>
);
```

## Tip 5: useAtom

Implementation-wise, it's a simple function combining two other functions.

```js
// useAtom is a simple function
// Ref: https://unpkg.com/browse/jotai@2.4.0/react.js
function useAtom(a) {
  return [useAtomValue(a), useSetAtom(a)];
}
```

## Tip 6: Derived-like atoms

Sometimes, we can't derive atoms as usual (ex. atomWithStorage). We can use `write` to do something similar.

```js
const baseCountAtom = atom(0);
export const doubleCountAtom = atom(0);
export const countAtom = atom(
  (get) => get(baseCountAtom),
  (get, set, arg) => {
    set(baseCountAtom, arg);
    set(doubleCountAtom, get(baseCountAtom) * 2);
  }
);
```

## Tip 7: Atom depending on props

If you want to create a derived atom with props, useMemo should do.

```js
const objAtom = atom({ foo: 'hello', bar: 'jotai' });

const useObjAtom = (prop) => useAtom(
  useMemo(() => atom(
    (get) => get(objAtom)[prop],
    (get, set, arg) =>
      set(objAtom, { ...get(objAtom), [prop]: arg })
  ), [prop])
);
```

## Tip 8: Atom with local storage

The simple version of it is pretty readable and it just works. You can modify it for your requirements.

```js
const atomWithLocalStorage = (key) => {
  const baseAtom = atom(localStorage.getItem(key));
  return atom(
    (get) => get(baseAtom),
    (get, set, arg) => {
      set(baseAtom, arg);
      localStorage.setItem(key, get(baseAtom));
    }
  );
};
```

## Tip 9: Swap atom

Jotai atom can hold another atom. It's called atoms-in-atom pattern, which opens up various usage. For example, we can swap two atoms. How would it be useful?

```js
const twoAtomsAtom = atom([atom(1), atom(2)]);

const swapAtom = atom(null, (get, set) => {
  const prev = get(twoAtomsAtom);
  set(twoAtomsAtom, [prev[1], prev[0]]);
});
```

## Tip 10: Write chain

Jotai atom's write function can invoke write function of another atom. It behaves like normal function call.

```js
const countAtom = atom(0);

const addDoubleAtom = atom(null, (get, set, arg) => {
  set(countAtom, arg * 2);
});

const updateAtom = atom(null, (get, set, arg) => {
  set(addDoubleAtom, arg + 1);
});
```

## Tip 11: Promise.all in async atoms

If you read two or more atoms in an async atom, it's probably better to use Promise.all.

```js
const fooAtom = atom(async (get) => ...);
const barAtom = atom(async (get) => ...);

const fooPlusBarAtom = atom(async (get) => {
  const [foo, bar] = await Promise.all([
    get(fooAtom),
    get(barAtom)
  ]);
  return foo + bar;
});
```

## Tip 12: Toggle atom

Let's learn the simple one too. The point is we don't export the base atom.

```js
const baseAtom = atom(false);
export const toggleAtom = atom(
  (get) => get(baseAtom),
  (get, set) => set(baseAtom, !get(baseAtom))
);
```

## Tip 13: Two args

Jotai v1 only accepts one argument for write function. Since v2, the write function can take two or more arguments. (Also, better TS support for zero arguments.)

```js
const baseAtom = atom(0);

// This is possible since v1
const oneArgAtom = atom(
  (get) => get(baseAtom),
  (get, set, [val1, val2]) => set(baseAtom, val1 + val2)
);

// This is possible since v2
const twoArgsAtom = atom(
  (get) => get(baseAtom),
  (get, set, arg1, arg2) => set(baseAtom, arg1 + arg2)
);
```

## Tip 14: Selected item atom

It's a simple one. I'm not sure if it's worth a tip, though. Is it?

```js
const arrayAtom = atom(['a', 'b', 'c']);
const selectedIndexAtom = atom(0);
const selectedItemAtom = atom(
  (get) => get(arrayAtom)[get(selectedIndexAtom)]
);
```

## Tip 15: Optimize rendering with two atoms

Here's an advanced tip to optimize React rendering with Jotai. Can you guess why the behavior of the second atom is different from the first one?

```js
const countAtom = atom(0);

// This can cause extra re-render
const firstAtom = atom((get) => {
  const isEven = get(countAtom) % 2 === 0;
  return [isEven]; // creates a new array
});

// This is render optimized
const isEvenAtom = atom((get) => get(countAtom) % 2 === 0);
const secondAtom = atom((get) => [get(isEvenAtom)]);
```

## Tip 16: Use atom conditionally

Passing atoms conditionally to useAtom hook is totally supported.

```js
const [val, setVal] = useAtom(cond ? fooAtom : barAtom);
```

## Tip 17: Atom creator

It's useful to hide a base atom in a function. We could do the same with module, but atom creator is more reusable.

```js
const createCountUpAtom = (initialCount) => {
  const baseAtom = atom(initialCount); // hidden in a closure
  const countUpAtom = atom(
    (get) => get(baseAtom),
    (get, set) => set(baseAtom, (prev) => prev + 1)
  );
  return countUpAtom; // can never set the base atom directly
};
```

## Tip 18: Refresh atom

While it's not a declarative model, it's sometimes handy to do force refresh. We can use the same technique as we do with React hooks.

```js
const refreshAtom = atom(0);

const dateNowAtom = atom((get) => {
  get(refreshAtom); // dependency
  return Date.now();
});

const refresherAtom = atom(
  null,
  (_get, set) => set(refreshAtom, (c) => c + 1)
);
```

## Tip 19: Default atom

If you define an atom with a read function, it will be read-only. But, we can combine it with another atom holding the default value, to make it writable.

```js
const asyncAtom = atom(async (get) => {
  const res = await fetch('...');
  const data = await res.json();
  return data;
});

const defaultAtom = atom(undefined);

const finalAtom = atom(
  (get) => get(defaultAtom) ?? get(asyncAtom),
  (get, set, value) => set(defaultAtom, value)
);
```

## Tip 20: Async only initially

`unwrap` is a new util in Jotai to make an async atom sync, and combining it with the original atom becomes an async-only-initially atom. Enjoy Jotai puzzle.

```js
const baseAtom = atom(async (get) => ...);
const syncAtom = unwrap(baseAtom, (prev) => prev);
export const finalAtom = atom((get) => get(syncAtom) ?? get(baseAtom));
```
