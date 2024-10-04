
// Seeded random number generator for repeatability
export function seededRandom(seed: number) {
    let m = 0x80000000; // 2**31;
    let a = 1103515245;
    let c = 12345;

    return function () {
        seed = (a * seed + c) % m;
        return seed / m;
    };
}

export const createRandomizer = () => {
    let r = seededRandom(12345);
    return {
        next: () => r(),
        reset: (seed: number = 12345) => r = seededRandom(seed),
    }
};

export const random = createRandomizer();
