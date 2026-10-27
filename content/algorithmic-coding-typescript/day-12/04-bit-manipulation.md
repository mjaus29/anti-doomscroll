# Bit Manipulation

## T — TL;DR

Every integer is stored as **bits** (binary digits, 0 or 1). Bitwise operators work on all the bits at once, so a few tricks — like `n & (n - 1)` and XOR — answer counting and "find the odd one out" questions in `O(1)` extra space.

**Reach for it when:**

- The problem says "without extra memory" and involves pairs or duplicates (XOR cancels them).
- You need to count 1 bits, test powers of two, or flip a specific bit.
- The input is a set of up to ~20 yes/no flags (one bit per flag).
- The problem literally talks about binary representation.

## K — Key Concepts

### Picture it

Think of a row of light switches. `&` (AND) keeps a light on only if it is on in both rows. `|` (OR) turns it on if either row has it on. `^` (XOR) turns it on if exactly one row has it on — so flipping the same switch twice puts it back. Shifts slide the whole row left or right.

### The operators in JavaScript

JS numbers are 64-bit floats, but bitwise operators first convert to a **32-bit signed integer** (the top bit means negative).

| Expression | Result | Why |
| :--------- | :----- | :-- |
| `5 & 3` | `1` | `101 & 011 = 001` |
| `5 \| 3` | `7` | `101 \| 011 = 111` |
| `5 ^ 3` | `6` | `101 ^ 011 = 110` |
| `1 << 3` | `8` | slide left 3 places = multiply by 8 |
| `-8 >> 1` | `-4` | keeps the sign bit |
| `-8 >>> 1` | `2147483644` | `>>>` fills with 0, treats the value as unsigned |
| `(n >> k) & 1` | bit `k` of `n` | shift it down, keep the last bit |
| `x ^ x` and `x ^ 0` | `0` and `x` | XOR cancels pairs |

### Walk through it

`n & (n - 1)` removes the **lowest** 1 bit. Count bits in `n = 12` (`1100`):

| Step | n (binary) | n - 1 | n & (n - 1) | count |
| :--- | :--------- | :---- | :---------- | :---- |
| 1 | `1100` | `1011` | `1000` | 1 |
| 2 | `1000` | `0111` | `0000` | 2 |
| — | `0000` | — | stop | **2** |

Subtracting 1 flips the lowest 1 bit to 0 and every 0 below it to 1, so AND clears exactly that bit.

### The template

**Number of 1 Bits:** count the 1s in a 32-bit unsigned integer.

```ts
function hammingWeight(n: number): number {
  let count = 0;
  let bits = n >>> 0; // read as unsigned 32-bit, so negative inputs work too
  while (bits !== 0) {
    bits = (bits & (bits - 1)) >>> 0; // drop the lowest 1 bit
    count++;
  }
  return count;
}
```

**Time:** `O(number of 1 bits)`, at most 32 · **Space:** `O(1)` — the loop runs once per 1 bit, not once per bit.

### Interview classic: Single Number

Every value in the array appears twice except one. Find it in `O(n)` time and `O(1)` extra space.
Example: `[4, 1, 2, 1, 2]` → `4`.

- **Brute force:** count with a `Map` — `O(n)` time but `O(n)` space.
- **Key insight:** `a ^ a = 0` and `a ^ 0 = a`, and order does not matter. XOR everything: each pair cancels to `0`, leaving the single value.

```ts
function singleNumber(values: readonly number[]): number {
  let result = 0;
  for (const value of values) result ^= value; // pairs cancel out
  return result;
}
```

`4 ^ 1 ^ 2 ^ 1 ^ 2` regroups to `4 ^ (1 ^ 1) ^ (2 ^ 2) = 4 ^ 0 ^ 0 = 4`.

## W — Why It Matters

- Single Number, Missing Number, and Power of Two are common warm-up questions.
- Bitmasks store a set of small flags in one number: permissions, feature toggles, visited sets in small searches.
- Interviewers listen for the 32-bit caveat in JS and for why `n & (n - 1)` works.

## I — Interview Q&A

### Q: How do you check if `n` is a power of two?

`n > 0 && (n & (n - 1)) === 0`. A power of two has exactly one 1 bit, and the trick clears it.

### Q: Why use `>>>` instead of `>>`?

`>>` copies the sign bit, so shifting a negative number never reaches `0` and a loop can run forever. `>>>` fills with zeros and reads the value as unsigned.

### Q: What if every number appears three times except one?

XOR no longer cancels. Count how many numbers have each of the 32 bits set; any count not divisible by 3 belongs to the single number. That is `O(32n)` time, `O(1)` space.

## C — Common Pitfalls + Fix

### ❌ Forgetting operator precedence

`===` binds tighter than `&`, so the check runs before the AND.

```ts
if (n & (n - 1) === 0)   // ❌ means n & ((n - 1) === 0)
if ((n & (n - 1)) === 0) // ✅
```

### ❌ Using bitwise tricks on values above 32 bits

`2 ** 32 | 0` is `0`. For big values use normal math or `BigInt`.

### ❌ Looping with `>>` on negative input

```ts
while (bits !== 0) bits >>= 1;  // ❌ -1 stays -1 forever
while (bits !== 0) bits >>>= 1; // ✅ shifts in zeros
```

### ❌ Using `^` as "power"

In JS, `2 ^ 3` is `1` (XOR). Power is `2 ** 3`.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Counting Bits:** given `n`, return an array `counts` of length `n + 1` where `counts[i]` is the number of 1 bits in `i`. Aim for `O(n)` total.

`5` → `[0, 1, 1, 2, 1, 2]`

<details><summary>Hint</summary>

`i & (i - 1)` is a smaller number you already computed, with exactly one fewer 1 bit.

</details>

### Solution

```ts
function countBits(n: number): number[] {
  const counts = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    // i has exactly one more 1 bit than i with its lowest 1 bit cleared.
    counts[i] = counts[i & (i - 1)] + 1;
  }
  return counts;
}
```

**Time:** `O(n)` · **Space:** `O(n)` for the output. It is a tiny DP: each answer reuses a smaller answer that the bit trick points to.

**Right now:** Without running code, predict `hammingWeight(255)` and `singleNumber([7, 3, 7])`, then check with the walkthrough rules.
