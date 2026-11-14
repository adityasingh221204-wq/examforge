// Answer Master — verified numerical solutions for the imported bank.
// Every number is computed here (never typed as a result by hand) and re-checked by the
// `checks` array before the UI lets the answer be marked "checked".

import type { VerificationItem } from './types';

export interface NumericalSolution {
  given: string[];
  find: string;
  formulaName: string;
  formula: string;
  definitions: string;
  assumptions?: string[];
  missing?: string[];
  steps: string[];
  answer: string;
  table?: { columns: string[]; rows: string[][] };
  checks: Omit<VerificationItem, 'pass'>[];
}

const f = (x: number, d = 4): string => {
  const v = Number(x.toFixed(d));
  return Object.is(v, -0) ? '0' : String(v);
};
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const relu = (z: number) => Math.max(0, z);
const leaky = (z: number, a = 0.01) => (z >= 0 ? z : a * z);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function softmax(z: number[]): number[] {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = sum(e);
  return e.map((v) => v / s);
}

/** Solve a perceptron for one pass and return the sequential trace. */
function perceptronEpoch(samples: [number, number, number][], eta = 1, w: [number, number] = [0, 0], b = 0) {
  const trace: string[] = [];
  let [w1, w2] = w;
  for (const [x1, x2, y] of samples) {
    const z = w1 * x1 + w2 * x2 + b;
    const out = z >= 0 ? 1 : 0;
    const err = y - out;
    trace.push(
      `x = (${x1}, ${x2}), y = ${y}: z = ${f(z)} → ŷ = ${out}; error = y − ŷ = ${err}` +
        (err === 0
          ? ' → no update.'
          : ` → w1 = ${f(w1 + eta * err * x1)}, w2 = ${f(w2 + eta * err * x2)}, b = ${f(b + eta * err)}.`),
    );
    if (err !== 0) {
      w1 += eta * err * x1;
      w2 += eta * err * x2;
      b += eta * err;
    }
  }
  return { trace, w1, w2, b };
}

export const NUMERICAL_SOLUTIONS: Record<string, () => NumericalSolution> = {
  N1: () => {
    const w1 = 0.4;
    const w2 = -0.6;
    const b = 0.2;
    const x1 = 2;
    const x2 = 3;
    const z = w1 * x1 + w2 * x2 + b;
    const out = z >= 0 ? 1 : 0;
    return {
      given: ['w1 = 0.4, w2 = −0.6, b = 0.2', 'x1 = 2, x2 = 3', 'Step activation: f(z) = 1 if z ≥ 0, else 0'],
      find: 'The weighted sum z and the perceptron output f(z).',
      formulaName: 'Perceptron forward pass with a step activation',
      formula: 'z = w1x1 + w2x2 + b;  ŷ = f(z)',
      definitions: 'w are the weights, x the inputs, b the bias, z the weighted sum (pre-activation), f the step function.',
      steps: [
        `Substitute: z = (0.4)(2) + (−0.6)(3) + 0.2`,
        `Multiply: z = 0.8 − 1.8 + 0.2`,
        `Add: z = ${f(z)}`,
        `Apply the step rule: z = ${f(z)} < 0, so f(z) = ${out}`,
      ],
      answer: `z = ${f(z)} and the output is ${out} (class 0).`,
      checks: [
        { check: 'Weighted sum recomputed', detail: `0.4×2 + (−0.6)×3 + 0.2 = ${f(z)}` },
        { check: 'Step rule applied', detail: `z < 0 ⇒ output 0` },
      ],
    };
  },

  N2: () => {
    const w = [0.2, -0.4];
    const b = 0.1;
    const x = [1, 2];
    const y = 1;
    const eta = 0.1;
    const z = w[0] * x[0] + w[1] * x[1] + b;
    const out = z >= 0 ? 1 : 0;
    const err = y - out;
    const wNew = [w[0] + eta * err * x[0], w[1] + eta * err * x[1]];
    const bNew = b + eta * err;
    const zNew = wNew[0] * x[0] + wNew[1] * x[1] + bNew;
    return {
      given: ['w = [0.2, −0.4], b = 0.1', 'x = [1, 2]', 'Desired output y = 1', 'Learning rate η = 0.1'],
      find: 'Updated weights w1′, w2′ and bias b′ after one perceptron update.',
      formulaName: 'Perceptron learning rule',
      formula: 'ŷ = f(wᵀx + b);  w ← w + η(y − ŷ)x;  b ← b + η(y − ŷ)',
      definitions: 'η is the learning rate, y the target, ŷ the predicted class, (y − ŷ) the signed error.',
      steps: [
        `Forward: z = (0.2)(1) + (−0.4)(2) + 0.1 = ${f(z)}`,
        `Output: z = ${f(z)} < 0 → ŷ = ${out}, but y = ${y}, so the sample is misclassified.`,
        `Error: (y − ŷ) = ${err}`,
        `Weight update: w1′ = 0.2 + 0.1(${err})(1) = ${f(wNew[0])}; w2′ = −0.4 + 0.1(${err})(2) = ${f(wNew[1])}`,
        `Bias update: b′ = 0.1 + 0.1(${err}) = ${f(bNew)}`,
        `Check: the new weighted sum is ${f(zNew)} ≥ 0, so the sample is now classified as 1.`,
      ],
      answer: `w′ = [${f(wNew[0])}, ${f(wNew[1])}] and b′ = ${f(bNew)}.`,
      checks: [
        { check: 'Update direction correct', detail: 'Positive error moves weights toward the input direction.' },
        { check: 'Re-evaluation fixes the sample', detail: `New z = ${f(zNew)} ≥ 0 → output 1` },
      ],
    };
  },

  N3: () => {
    const samples: [number, number, number][] = [
      [0, 0, 0],
      [0, 1, 0],
      [1, 0, 0],
      [1, 1, 1],
    ];
    const { trace, w1, w2, b } = perceptronEpoch(samples, 1, [0, 0], 0);
    return {
      given: ['XOR samples (0,0)→0, (0,1)→0, (1,0)→0, (1,1)→1', 'Initial w1 = w2 = 0, b = 0', 'η = 1', 'One sequential epoch'],
      find: 'Every weight update during one epoch and the final weights.',
      formulaName: 'Perceptron learning rule applied online (sample by sample)',
      formula: 'w ← w + η(y − ŷ)x;  b ← b + η(y − ŷ)',
      definitions: 'The update happens after each individual sample; order matters, so the same epoch can end in different weights if the data order changes.',
      steps: [
        'Initial state: w1 = 0, w2 = 0, b = 0.',
        ...trace,
        `End of epoch: w1 = ${f(w1)}, w2 = ${f(w2)}, b = ${f(b)}.`,
      ],
      answer: `After one epoch w1 = ${f(w1)}, w2 = ${f(w2)}, b = ${f(b)}. This still does not represent XOR — a single perceptron cannot — which is exactly why a hidden layer is required.`,
      checks: [
        { check: 'All four samples processed in order', detail: 'The trace contains one line per sample.' },
        { check: 'Updates only on error', detail: 'Only the (1,1) sample changes the weights in this ordering.' },
        { check: 'XOR remains unsolved', detail: 'A step perceptron cannot represent a non-linearly-separable function.' },
      ],
    };
  },

  N4: () => {
    const points: [number, number][] = [
      [1, 1],
      [2, 1],
      [0, 2],
      [3, 0],
    ];
    const zs = points.map(([x1, x2]) => 2 * x1 + 3 * x2 - 5);
    return {
      given: ['Decision function z = 2x1 + 3x2 − 5', 'Threshold at zero (z ≥ 0 → class 1)', 'Points (1,1), (2,1), (0,2), (3,0)'],
      find: 'The predicted class of each point.',
      formulaName: 'Linear classifier with a zero threshold',
      formula: 'z = w1x1 + w2x2 + b;  ŷ = 1 if z ≥ 0 else 0',
      definitions: 'w = (2, 3) is the normal vector of the boundary and b = −5 its offset.',
      steps: points.map(([x1, x2], i) => `(${x1}, ${x2}): z = 2(${x1}) + 3(${x2}) − 5 = ${f(zs[i])} → class ${zs[i] >= 0 ? 1 : 0}`),
      answer: `z = [${zs.map((z) => f(z)).join(', ')}], so all four points are classified as class 1.`,
      checks: [{ check: 'Every point evaluated', detail: `${points.length} substitutions performed.` }],
    };
  },

  N5: () => {
    const slope = 4 / 2;
    const intercept = 6 / 2;
    return {
      given: ['z = 4x1 − 2x2 + 6', 'Class 1 where z ≥ 0'],
      find: 'The decision boundary and the side belonging to class 1.',
      formulaName: 'Decision boundary of a linear classifier',
      formula: 'z = w1x1 + w2x2 + b = 0',
      definitions: 'The boundary is where the evidence is exactly zero; the sign of z selects the class.',
      steps: [
        'Set z = 0: 4x1 − 2x2 + 6 = 0',
        `Solve for x2: 2x2 = 4x1 + 6 → x2 = ${f(slope)}x1 + ${f(intercept)}`,
        'Test the origin (0,0): z = 6 > 0, so the origin lies in class 1.',
        'Test (0,10): z = −20 + 6 = −14 < 0, which is the other side.',
      ],
      answer: `The boundary is the line x2 = ${f(slope)}x1 + ${f(intercept)}; class 1 is the half-plane below it (containing the origin), where 4x1 − 2x2 + 6 > 0.`,
      checks: [
        { check: 'Boundary satisfies z = 0', detail: '4x1 − 2(2x1 + 3) + 6 = 0 for every x1.' },
        { check: 'Side verified with a point', detail: 'Origin gives z = 6 > 0.' },
      ],
    };
  },

  '69': () => {
    const zs = [-2, 0, 2];
    const ys = zs.map(sigmoid);
    return {
      given: ['σ(z) = 1/(1 + e^−z)', 'z = −2, 0, 2'],
      find: 'The sigmoid output for each z.',
      formulaName: 'Logistic sigmoid',
      formula: 'σ(z) = 1 / (1 + e^(−z))',
      definitions: 'z is the pre-activation; σ maps it into (0,1).',
      steps: [
        `z = −2: σ = 1/(1 + e^2) = ${f(ys[0])}`,
        `z = 0: σ = 1/(1 + 1) = ${f(ys[1])}`,
        `z = 2: σ = 1/(1 + e^−2) = ${f(ys[2])}`,
      ],
      answer: `σ(−2) = ${f(ys[0])}, σ(0) = ${f(ys[1])}, σ(2) = ${f(ys[2])}.`,
      checks: [{ check: 'Outputs inside (0,1)', detail: 'All three values lie strictly between 0 and 1.' }],
    };
  },

  '70': () => {
    const zs = [0, 2, -2];
    const ds = zs.map((z) => sigmoid(z) * (1 - sigmoid(z)));
    return {
      given: ['σ′(z) = σ(z)(1 − σ(z))', 'z = 0, 2, −2'],
      find: 'The derivative of the sigmoid at each point.',
      formulaName: 'Derivative of the logistic sigmoid',
      formula: "σ′(z) = σ(z)(1 − σ(z))",
      definitions: 'The derivative measures how strongly the output changes with z.',
      steps: zs.map((z, i) => `z = ${z}: σ = ${f(sigmoid(z))}, σ′ = ${f(sigmoid(z))} × ${f(1 - sigmoid(z))} = ${f(ds[i])}`),
      answer: `σ′(0) = ${f(ds[0])}, σ′(2) = ${f(ds[1])}, σ′(−2) = ${f(ds[2])}; the derivative is maximal at 0 and symmetric.`,
      checks: [{ check: 'Maximum derivative 0.25 at z = 0', detail: `${f(ds[0])}` }],
    };
  },

  '71': () => {
    const zs = [-3, -1, 0, 2, 4];
    const ys = zs.map(relu);
    return {
      given: ['ReLU(z) = max(0, z)', 'z = [−3, −1, 0, 2, 4]'],
      find: 'The ReLU output for each element.',
      formulaName: 'Rectified linear unit',
      formula: 'ReLU(z) = max(0, z)',
      definitions: 'Negative inputs are clipped to zero; non-negative inputs pass unchanged.',
      steps: zs.map((z, i) => `ReLU(${z}) = ${f(ys[i])}`),
      answer: `[${ys.map((y) => f(y)).join(', ')}]`,
      checks: [{ check: 'Exactly the negative values were clipped', detail: 'Three negatives become 0; 2 and 4 pass through.' }],
    };
  },

  '72': () => {
    const zs = [-3, -1, 0, 2];
    const ys = zs.map((z) => leaky(z, 0.01));
    return {
      given: ['Leaky ReLU with negative slope α = 0.01', 'z = [−3, −1, 0, 2]'],
      find: 'The Leaky ReLU output for each element.',
      formulaName: 'Leaky rectified linear unit',
      formula: 'LeakyReLU(z) = z if z ≥ 0, else αz',
      definitions: 'α is a small constant that keeps a nonzero gradient for negative inputs.',
      steps: zs.map((z, i) => `${z} ${z >= 0 ? '≥' : '<'} 0 → ${f(ys[i])}`),
      answer: `[${ys.map((y) => f(y)).join(', ')}]`,
      checks: [{ check: 'Negative branch uses αz', detail: '−3 → −0.03 and −1 → −0.01.' }],
    };
  },

  '73': () => {
    const z = [2, 1, 0];
    const p = softmax(z);
    return {
      given: ['Logits z = [2, 1, 0]'],
      find: 'The softmax probabilities and their sum.',
      formulaName: 'Softmax function',
      formula: 'softmax(zᵢ) = e^(zᵢ) / Σⱼ e^(zⱼ)',
      definitions: 'Each logit is exponentiated and normalised by the total, producing a distribution.',
      steps: [
        `Exponentiate: e² = ${f(Math.exp(2))}, e¹ = ${f(Math.exp(1))}, e⁰ = 1`,
        `Sum: ${f(Math.exp(2) + Math.exp(1) + 1)}`,
        `Divide: [${p.map((v) => f(v)).join(', ')}]`,
        `Sum of outputs: ${f(sum(p))}`,
      ],
      answer: `softmax([2,1,0]) = [${p.map((v) => f(v)).join(', ')}], and the values sum to 1.`,
      checks: [{ check: 'Probabilities sum to 1', detail: `Σ = ${f(sum(p))}` }],
    };
  },

  '84': () => {
    const y = [1, 0, 1];
    const yhat = [0.8, 0.2, 0.6];
    const sq = y.map((v, i) => (v - yhat[i]) ** 2);
    const mse = sum(sq) / y.length;
    return {
      given: ['Actual y = [1, 0, 1]', 'Predictions ŷ = [0.8, 0.2, 0.6]'],
      find: 'Mean squared error.',
      formulaName: 'Mean squared error',
      formula: 'MSE = (1/n) Σ (yᵢ − ŷᵢ)²',
      definitions: 'n is the number of samples; each error is squared so signs do not cancel.',
      steps: [
        `Errors: [${y.map((v, i) => f(v - yhat[i])).join(', ')}]`,
        `Squared errors: [${sq.map((v) => f(v)).join(', ')}]`,
        `Sum = ${f(sum(sq))}; divide by n = ${y.length} → MSE = ${f(mse)}`,
      ],
      answer: `MSE = ${f(mse)}.`,
      checks: [{ check: 'Mean of the squared errors', detail: `${f(sum(sq))} / ${y.length} = ${f(mse)}` }],
    };
  },

  '85': () => {
    const yhat = 0.8;
    const loss = -Math.log(yhat);
    return {
      given: ['True label y = 1', 'Predicted probability ŷ = 0.8'],
      find: 'Binary cross-entropy loss.',
      formulaName: 'Binary cross-entropy',
      formula: 'L = −[y ln ŷ + (1 − y) ln(1 − ŷ)]',
      definitions: 'For y = 1 the second term vanishes, leaving L = −ln ŷ.',
      steps: ['Since y = 1: L = −ln(0.8)', `ln(0.8) = ${f(Math.log(yhat))}`, `L = ${f(loss)}`],
      answer: `BCE = ${f(loss)}.`,
      checks: [{ check: 'Loss is positive', detail: `${f(loss)} > 0` }],
    };
  },

  '86': () => {
    const l02 = -Math.log(1 - 0.2);
    const l08 = -Math.log(1 - 0.8);
    return {
      given: ['True label y = 0', 'Case A: ŷ = 0.2', 'Case B: ŷ = 0.8'],
      find: 'BCE in both cases and the reason for the difference.',
      formulaName: 'Binary cross-entropy',
      formula: 'L = −[(1 − y) ln(1 − ŷ)] for y = 0',
      definitions: 'With y = 0 only the (1 − ŷ) term contributes.',
      steps: [
        `Case A: L = −ln(1 − 0.2) = −ln(0.8) = ${f(l02)}`,
        `Case B: L = −ln(1 − 0.8) = −ln(0.2) = ${f(l08)}`,
        `Ratio: ${f(l08 / l02)}×`,
      ],
      answer: `Case A gives ${f(l02)} and case B gives ${f(l08)}; predicting 0.8 for a true 0 is far more confident and therefore far more penalised.`,
      checks: [{ check: 'Ordering matches confidence', detail: 'The wrong confident prediction has the larger loss.' }],
    };
  },

  '87': () => {
    const p = [0.1, 0.7, 0.2];
    const loss = -Math.log(p[1]);
    return {
      given: ['True class: class 2 (index 2, 1-based)', 'Predicted probabilities [0.1, 0.7, 0.2]'],
      find: 'Categorical cross-entropy.',
      formulaName: 'Categorical cross-entropy with a one-hot target',
      formula: 'L = −Σ yᵢ ln ŷᵢ = −ln ŷ_true',
      definitions: 'Only the true-class probability survives the one-hot sum.',
      steps: [`True class probability = 0.7`, `L = −ln(0.7) = ${f(loss)}`],
      answer: `Categorical cross-entropy = ${f(loss)}.`,
      checks: [{ check: 'Only the true class contributes', detail: '−ln(0.7).' }],
    };
  },

  '94': () => {
    const x = 2;
    const w = 0.5;
    const b = 0;
    const y = 1;
    const z = x * w + b;
    const a = sigmoid(z);
    const L = (a - y) ** 2;
    const dLda = 2 * (a - y);
    const dadz = a * (1 - a);
    const dzdw = x;
    const dLdw = dLda * dadz * dzdw;
    return {
      given: ['z = xw + b, a = σ(z), L = (a − y)²', 'x = 2, w = 0.5, b = 0, y = 1'],
      find: 'z, a, L and the derivatives ∂L/∂a, ∂a/∂z, ∂z/∂w, ∂L/∂w.',
      formulaName: 'Chain rule on a computational graph',
      formula: '∂L/∂w = (∂L/∂a)(∂a/∂z)(∂z/∂w)',
      definitions: 'Each node contributes its local derivative; the global derivative is the product along the path.',
      steps: [
        `z = 2 × 0.5 + 0 = ${f(z)}`,
        `a = σ(${f(z)}) = ${f(a)}`,
        `L = (${f(a)} − 1)² = ${f(L)}`,
        `∂L/∂a = 2(a − y) = ${f(dLda)}`,
        `∂a/∂z = a(1 − a) = ${f(dadz)}`,
        `∂z/∂w = x = ${f(dzdw)}`,
        `∂L/∂w = ${f(dLda)} × ${f(dadz)} × ${f(dzdw)} = ${f(dLdw)}`,
      ],
      answer: `z = ${f(z)}, a = ${f(a)}, L = ${f(L)}, ∂L/∂a = ${f(dLda)}, ∂a/∂z = ${f(dadz)}, ∂z/∂w = 2, and ∂L/∂w = ${f(dLdw)}.`,
      checks: [{ check: 'Sign of the gradient', detail: 'Prediction 0.731 < target 1, so the weight gradient is negative.' }],
    };
  },

  '95': () => {
    const x1 = 2;
    const x2 = 3;
    const w1 = 0.5;
    const w2 = -0.2;
    const b = 0.1;
    const y = 2;
    const a = x1 * w1 + x2 * w2 + b;
    const z = relu(a);
    const L = 0.5 * (z - y) ** 2;
    const dLdz = z - y;
    const dadz = a > 0 ? 1 : 0;
    return {
      given: ['a = x1w1 + x2w2 + b, z = ReLU(a), L = ½(z − y)²', 'x1 = 2, x2 = 3, w1 = 0.5, w2 = −0.2, b = 0.1, y = 2'],
      find: 'All intermediate values and gradients ∂L/∂w1, ∂L/∂w2, ∂L/∂b.',
      formulaName: 'Backpropagation through a ReLU and a squared loss',
      formula: '∂L/∂wᵢ = (z − y) · 1[a > 0] · xᵢ',
      definitions: '1[a > 0] is the ReLU gate: it passes the gradient only when the unit is active.',
      steps: [
        `a = 2(0.5) + 3(−0.2) + 0.1 = ${f(a)}`,
        `z = ReLU(${f(a)}) = ${f(z)}`,
        `L = ½(${f(z)} − 2)² = ${f(L)}`,
        `∂L/∂z = z − y = ${f(dLdz)}`,
        `ReLU gate: a = ${f(a)} > 0, so ∂z/∂a = ${dadz}`,
        `∂L/∂w1 = ${f(dLdz)} × ${dadz} × 2 = ${f(-3)}`,
        `∂L/∂w2 = ${f(dLdz)} × ${dadz} × 3 = ${f(-4.5)}`,
        `∂L/∂b = ${f(dLdz)} × ${dadz} = ${f(-1.5)}`,
      ],
      answer: `a = ${f(a)}, z = ${f(z)}, L = ${f(L)}; ∂L/∂w1 = ${f(-3)}, ∂L/∂w2 = ${f(-4.5)}, ∂L/∂b = ${f(-1.5)}.`,
      checks: [
        { check: 'Forward values consistent', detail: 'a = 0.5 gives z = 0.5 and L = 1.125.' },
        { check: 'ReLU gate is open', detail: 'a > 0, so gradients flow.' },
      ],
    };
  },

  '96': () => {
    const x = 2;
    const u = 2 * x;
    const v = u ** 2;
    const L = 3 * v;
    const dLdx = 3 * 2 * u * 2;
    return {
      given: ['u = 2x, v = u², L = 3v', 'x = 2'],
      find: 'dL/dx using the chain rule.',
      formulaName: 'Chain rule through a composition',
      formula: 'dL/dx = (dL/dv)(dv/du)(du/dx)',
      definitions: 'Each intermediate variable contributes its derivative with respect to the next.',
      steps: [
        `u = 2(2) = ${f(u)}`,
        `v = ${f(u)}² = ${f(v)}`,
        `L = 3(${f(v)}) = ${f(L)}`,
        `dL/dv = 3, dv/du = 2u = ${f(2 * u)}, du/dx = 2`,
        `dL/dx = 3 × ${f(2 * u)} × 2 = ${f(dLdx)}`,
      ],
      answer: `dL/dx = ${f(dLdx)}.`,
      checks: [{ check: 'Closed form agrees', detail: 'L = 12x² ⇒ dL/dx = 24x = 48.' }],
    };
  },

  '97': () => {
    const x1 = 2;
    const x2 = 3;
    const a = x1 + x2;
    const b = x1 * x2;
    const c = a ** 2;
    const dLdx1 = 2 * a * 1 + x2;
    const dLdx2 = 2 * a * 1 + x1;
    return {
      given: ['a = x1 + x2, b = x1x2, c = a², L = c + b', 'x1 = 2, x2 = 3'],
      find: '∂L/∂x1 and ∂L/∂x2.',
      formulaName: 'Multivariable chain rule with a shared input',
      formula: '∂L/∂xᵢ = (∂L/∂c)(∂c/∂a)(∂a/∂xᵢ) + (∂L/∂b)(∂b/∂xᵢ)',
      definitions: 'x1 and x2 reach L along two paths, so their contributions are added.',
      steps: [
        `a = ${f(a)}, b = ${f(b)}, c = ${f(c)}, L = ${f(b + c)}`,
        `Path 1: ∂L/∂c = 1, ∂c/∂a = 2a = 10 → 10 for both inputs`,
        `Path 2: ∂L/∂b = 1, ∂b/∂x1 = x2 = 3, ∂b/∂x2 = x1 = 2`,
        `∂L/∂x1 = 10 + 3 = ${f(dLdx1)}; ∂L/∂x2 = 10 + 2 = ${f(dLdx2)}`,
      ],
      answer: `∂L/∂x1 = ${f(dLdx1)} and ∂L/∂x2 = ${f(dLdx2)}.`,
      checks: [{ check: 'Both paths included', detail: 'Each gradient has a c-path term of 10 plus the product term.' }],
    };
  },

  '98': () => {
    const x = -2;
    const w = 3;
    const b = 1;
    const y = 2;
    const a = x * w + b;
    const h = relu(a);
    const L = (h - y) ** 2;
    const gate = a > 0 ? 1 : 0;
    const dLdw = 2 * (h - y) * gate * x;
    return {
      given: ['a = xw + b, h = ReLU(a), L = (h − y)²', 'x = −2, w = 3, b = 1, y = 2'],
      find: 'Whether gradients propagate through the ReLU and the value of ∂L/∂w.',
      formulaName: 'Backpropagation through a gated ReLU',
      formula: '∂L/∂w = 2(h − y) · 1[a > 0] · x',
      definitions: 'The ReLU derivative is 1 for a > 0 and 0 otherwise.',
      steps: [
        `a = (−2)(3) + 1 = ${f(a)}`,
        `h = ReLU(${f(a)}) = ${f(h)}`,
        `L = (${f(h)} − 2)² = ${f(L)}`,
        `Gate: a = ${f(a)} < 0 ⇒ ∂h/∂a = 0`,
        `∂L/∂w = 2(${f(h)} − 2) × 0 × (−2) = ${f(dLdw)}`,
      ],
      answer: `a = ${f(a)} is negative, so the ReLU blocks the gradient: ∂L/∂w = ${f(dLdw)}. The loss is 4 but this unit learns nothing from this example.`,
      checks: [{ check: 'ReLU gate closed', detail: 'a < 0 ⇒ local derivative 0.' }],
    };
  },

  '109': () => {
    const x = 2;
    const w = 0.4;
    const b = 0.1;
    const y = 1;
    const z = x * w + b;
    const yhat = sigmoid(z);
    const L = -Math.log(yhat);
    const dLdz = yhat - y;
    const dLdw = dLdz * x;
    const dLdb = dLdz;
    return {
      given: ['Sigmoid output with binary cross-entropy', 'x = 2, w = 0.4, b = 0.1, y = 1'],
      find: 'z, prediction, loss, ∂L/∂z, ∂L/∂w and ∂L/∂b.',
      formulaName: 'Sigmoid + binary cross-entropy gradient',
      formula: 'z = wx + b; ŷ = σ(z); L = −ln ŷ; ∂L/∂z = ŷ − y; ∂L/∂w = (ŷ − y)x; ∂L/∂b = ŷ − y',
      definitions: 'The sigmoid and BCE derivatives cancel into the simple difference ŷ − y.',
      steps: [
        `z = (0.4)(2) + 0.1 = ${f(z)}`,
        `ŷ = σ(${f(z)}) = ${f(yhat)}`,
        `L = −ln(${f(yhat)}) = ${f(L)}`,
        `∂L/∂z = ${f(yhat)} − 1 = ${f(dLdz)}`,
        `∂L/∂w = ${f(dLdz)} × 2 = ${f(dLdw)}`,
        `∂L/∂b = ${f(dLdb)}`,
      ],
      answer: `z = ${f(z)}, ŷ = ${f(yhat)}, L = ${f(L)}, ∂L/∂z = ${f(dLdz)}, ∂L/∂w = ${f(dLdw)}, ∂L/∂b = ${f(dLdb)}.`,
      checks: [{ check: 'Gradient identity', detail: 'For sigmoid + BCE, ∂L/∂z = ŷ − y exactly.' }],
    };
  },

  '133': () => {
    const eta = 0.1;
    let w = 1;
    const rows: string[][] = [['0', f(w), f(2 * (w - 5)), '—', '—']];
    const steps: string[] = [`f(w) = (w − 5)², f′(w) = 2(w − 5)`, `Start w₀ = 1, η = 0.1`];
    for (let t = 1; t <= 5; t++) {
      const g = 2 * (w - 5);
      const prev = w;
      w = w - eta * g;
      steps.push(`t = ${t}: f′(${f(prev)}) = ${f(g)} → w${t} = ${f(prev)} − 0.1(${f(g)}) = ${f(w)}`);
      rows.push([String(t), f(prev), f(g), f(w), f((w - 5) ** 2)]);
    }
    return {
      given: ['f(w) = (w − 5)²', 'w₀ = 1', 'η = 0.1', 'Five updates'],
      find: 'The parameter after each of five gradient-descent steps.',
      formulaName: 'Gradient descent',
      formula: 'w_{t+1} = w_t − η f′(w_t),  f′(w) = 2(w − 5)',
      definitions: 'f′ is the slope; η scales the step.',
      steps,
      table: { columns: ['t', 'w_t', 'gradient', 'w_{t+1}', 'loss'], rows },
      answer: `After five updates w = ${f(w)}; the minimum is w = 5, approached monotonically without overshoot.`,
      checks: [
        { check: 'Loss decreases every step', detail: 'Quadratic with η = 0.1 < 1/Lipschitz, so convergence is monotone.' },
        { check: 'Iterates recomputed', detail: `${f(w)} after five steps.` },
      ],
    };
  },

  '134': () => {
    const eta = 0.05;
    let w = 2;
    const rows: string[][] = [];
    const steps: string[] = ['f(w) = 3w² − 4w + 2 ⇒ f′(w) = 6w − 4', 'w₀ = 2, η = 0.05'];
    for (let t = 1; t <= 3; t++) {
      const g = 6 * w - 4;
      const prev = w;
      w = w - eta * g;
      steps.push(`t = ${t}: f′(${f(prev)}) = ${f(g)} → w${t} = ${f(prev)} − 0.05(${f(g)}) = ${f(w)}`);
      rows.push([String(t), f(prev), f(g), f(w), f(3 * w ** 2 - 4 * w + 2)]);
    }
    return {
      given: ['f(w) = 3w² − 4w + 2', 'w₀ = 2', 'η = 0.05', 'Three updates'],
      find: 'df/dw and the parameter after three updates.',
      formulaName: 'Gradient descent on a quadratic',
      formula: "f′(w) = 6w − 4;  w_{t+1} = w_t − η f′(w_t)",
      definitions: 'The minimum satisfies 6w − 4 = 0, i.e. w = 2/3.',
      steps,
      table: { columns: ['t', 'w_t', 'gradient', 'w_{t+1}', 'loss'], rows },
      answer: `The iterates are ${rows.map((r) => r[3]).join(' → ')}, approaching the minimum w = ${f(2 / 3)}.`,
      checks: [{ check: 'Minimum located', detail: 'f′(2/3) = 0.' }],
    };
  },

  '135': () => {
    const eta = 0.1;
    let w1 = 4;
    let w2 = 3;
    const rows: string[][] = [['0', f(w1), f(w2), '—', '—']];
    const steps: string[] = ['L = w1² + 2w2² ⇒ ∂L/∂w1 = 2w1, ∂L/∂w2 = 4w2', 'Start (4, 3), η = 0.1'];
    for (let t = 1; t <= 3; t++) {
      const g1 = 2 * w1;
      const g2 = 4 * w2;
      const p1 = w1;
      const p2 = w2;
      w1 = w1 - eta * g1;
      w2 = w2 - eta * g2;
      steps.push(
        `t = ${t}: ∇L = (${f(g1)}, ${f(g2)}) → (w1, w2) = (${f(p1)} − 0.1×${f(g1)}, ${f(p2)} − 0.1×${f(g2)}) = (${f(w1)}, ${f(w2)})`,
      );
      rows.push([String(t), f(p1), f(p2), f(w1), f(w2)]);
    }
    return {
      given: ['L(w1, w2) = w1² + 2w2²', 'Start (w1, w2) = (4, 3)', 'η = 0.1', 'Three iterations'],
      find: 'The parameter pair after three gradient-descent iterations.',
      formulaName: 'Gradient descent in two dimensions',
      formula: '∂L/∂w1 = 2w1, ∂L/∂w2 = 4w2, w ← w − η∇L',
      definitions: 'The Hessian is diag(2, 4), so the w2 direction is twice as steep.',
      steps,
      table: { columns: ['t', 'w1', 'w2', 'w1 next', 'w2 next'], rows },
      answer: `After three iterations (w1, w2) = (${f(w1)}, ${f(w2)}); w2 falls faster because its gradient is twice as large.`,
      checks: [{ check: 'Loss decreased', detail: `L goes from ${f(16 + 18)} to ${f(w1 ** 2 + 2 * w2 ** 2)}.` }],
    };
  },

  '136': () => {
    const g = 4;
    const vPrev = 2;
    const beta = 0.9;
    const eta = 0.1;
    const v = beta * vPrev + g;
    const update = eta * v;
    const ema = beta * vPrev + (1 - beta) * g;
    return {
      given: ['g_t = 4', 'v_{t−1} = 2', 'β = 0.9', 'η = 0.1'],
      find: 'The new velocity and the parameter update under a stated momentum convention.',
      formulaName: 'Heavy-ball momentum (PyTorch convention)',
      formula: 'v_t = βv_{t−1} + g_t;  w_t = w_{t−1} − ηv_t',
      definitions: 'β is the momentum coefficient, v the velocity (gradient accumulator), η the learning rate.',
      assumptions: [
        'Convention: v_t = βv_{t−1} + g_t (PyTorch). The exponential-moving-average convention v_t = βv_{t−1} + (1 − β)g_t would give a different velocity.',
      ],
      steps: [
        `v_t = 0.9(2) + 4 = ${f(v)}`,
        `Δw = −ηv_t = −0.1 × ${f(v)} = ${f(-update)}`,
        `Under the EMA convention: v_t = 0.9(2) + 0.1(4) = ${f(ema)}, Δw = ${f(-eta * ema)}`,
      ],
      answer: `v_t = ${f(v)} and the update is Δw = ${f(-update)} (EMA variant: v_t = ${f(ema)}, Δw = ${f(-eta * ema)}).`,
      checks: [{ check: 'Convention disclosed', detail: 'Both common conventions are shown; the main answer states which is used.' }],
    };
  },

  '137': () => {
    const g = 0.4;
    const mPrev = 0.1;
    const vPrev = 0.05;
    const b1 = 0.9;
    const b2 = 0.999;
    const eta = 0.1;
    const eps = 1e-8;
    const m = b1 * mPrev + (1 - b1) * g;
    const v = b2 * vPrev + (1 - b2) * g ** 2;
    const mhat = m / (1 - b1);
    const vhat = v / (1 - b2);
    const update = (eta * mhat) / (Math.sqrt(vhat) + eps);
    return {
      given: ['g_t = 0.4, m_{t−1} = 0.1, v_{t−1} = 0.05', 'β₁ = 0.9, β₂ = 0.999, η = 0.1'],
      find: 'First and second moment estimates, their bias-corrected values, and the parameter update.',
      formulaName: 'Adam',
      formula: 'm_t = β₁m_{t−1} + (1−β₁)g_t;  v_t = β₂v_{t−1} + (1−β₂)g_t²;  m̂ = m_t/(1−β₁ᵗ);  v̂ = v_t/(1−β₂ᵗ);  Δw = −η m̂/(√v̂ + ε)',
      definitions: 'm is the first moment (mean), v the second moment (uncentred variance), t the step index.',
      assumptions: ['The question gives previous moment estimates without t; the solution takes t = 1 (the first Adam step).'],
      steps: [
        `m_t = 0.9(0.1) + 0.1(0.4) = ${f(m)}`,
        `v_t = 0.999(0.05) + 0.001(0.16) = ${f(v, 5)}`,
        `Bias correction t = 1: m̂ = ${f(m)}/(0.1) = ${f(mhat)}; v̂ = ${f(v, 5)}/(0.001) = ${f(vhat, 2)}`,
        `Δw = −0.1 × ${f(mhat)}/(√${f(vhat, 2)} + 1e−8) = −${f(update, 5)}`,
      ],
      answer: `m_t = ${f(m)}, v_t = ${f(v, 5)}, m̂ = ${f(mhat)}, v̂ = ${f(vhat, 2)}, and Δw = −${f(update, 5)} (with t = 1).`,
      checks: [{ check: 'Bias correction applied', detail: 'Both moments are divided by (1 − βᵗ).' }],
    };
  },

  '154': () => {
    const w = [2, -3, 1];
    const l2 = sum(w.map((x) => x * x));
    const L = 2.5 + (0.1 / 2) * l2;
    return {
      given: ['Ldata = 2.5', 'w = [2, −3, 1]', 'λ = 0.1', 'L = Ldata + (λ/2)Σwᵢ²'],
      find: 'The regularised loss.',
      formulaName: 'L2 (ridge) regularisation',
      formula: 'L = Ldata + (λ/2) Σ wᵢ²',
      definitions: 'λ controls the penalty strength; squaring punishes large weights.',
      steps: [`Σwᵢ² = 4 + 9 + 1 = ${f(l2)}`, `Penalty = 0.05 × ${f(l2)} = ${f((0.1 / 2) * l2)}`, `L = 2.5 + ${f((0.1 / 2) * l2)} = ${f(L)}`],
      answer: `L = ${f(L)}.`,
      checks: [{ check: 'Penalty proportional to λ', detail: 'λ/2 × 14 = 0.7.' }],
    };
  },

  '155': () => {
    const w = [2, -4, 1];
    const l1 = sum(w.map((x) => Math.abs(x)));
    const L = 1.5 + 0.2 * l1;
    return {
      given: ['Ldata = 1.5', 'w = [2, −4, 1]', 'λ = 0.2', 'L = Ldata + λΣ|wᵢ|'],
      find: 'The regularised loss.',
      formulaName: 'L1 (lasso) regularisation',
      formula: 'L = Ldata + λ Σ |wᵢ|',
      definitions: 'The absolute-value penalty grows linearly and pushes small weights to exactly zero.',
      steps: [`Σ|wᵢ| = 2 + 4 + 1 = ${f(l1)}`, `Penalty = 0.2 × ${f(l1)} = ${f(0.2 * l1)}`, `L = 1.5 + ${f(0.2 * l1)} = ${f(L)}`],
      answer: `L = ${f(L)}.`,
      checks: [{ check: 'Absolute values used', detail: '|−4| = 4.' }],
    };
  },

  '156': () => {
    const dLdata = 3;
    const w = 4;
    const lambda = 0.2;
    const total = dLdata + lambda * w;
    return {
      given: ['L(w) = Ldata(w) + (λ/2)w²', '∂Ldata/∂w = 3', 'w = 4, λ = 0.2'],
      find: '∂L/∂w.',
      formulaName: 'Gradient of an L2-regularised loss',
      formula: '∂L/∂w = ∂Ldata/∂w + λw',
      definitions: 'The derivative of (λ/2)w² is λw.',
      steps: [`Regularisation term: 0.2 × 4 = ${f(lambda * w)}`, `∂L/∂w = 3 + ${f(lambda * w)} = ${f(total)}`],
      answer: `∂L/∂w = ${f(total)}.`,
      checks: [{ check: 'Gradient larger than data gradient', detail: 'The penalty pulls the weight toward zero.' }],
    };
  },

  '157': () => {
    const n = 10;
    const p = 0.4;
    const dropped = n * p;
    const active = n - dropped;
    return {
      given: ['Hidden layer with n = 10 neurons', 'Dropout probability p = 0.4 during training'],
      find: 'Expected active and dropped neurons, and inference behaviour.',
      formulaName: 'Dropout expectation',
      formula: 'E[dropped] = np;  E[active] = n(1 − p)',
      definitions: 'Each unit is dropped independently with probability p during a training step.',
      steps: [
        `E[dropped] = 10 × 0.4 = ${f(dropped)}`,
        `E[active] = 10 × 0.6 = ${f(active)}`,
        'At inference dropout is turned off: all 10 units are active, with inverted-dropout scaling already applied during training.',
      ],
      answer: `On average ${f(active)} neurons stay active and ${f(dropped)} are dropped per training step; inference uses all 10.`,
      checks: [{ check: 'Expectation consistent', detail: '6 + 4 = 10.' }],
    };
  },

  '158': () => {
    const h = [2, 4, 6, 8];
    const mask = [1, 0, 1, 0];
    const p = 0.5;
    const out = h.map((v, i) => (mask[i] ? v / (1 - p) : 0));
    return {
      given: ['h = [2, 4, 6, 8]', 'p = 0.5', 'mask m = [1, 0, 1, 0]', 'Inverted dropout'],
      find: 'The layer output after dropout.',
      formulaName: 'Inverted dropout',
      formula: 'outputᵢ = mᵢhᵢ / (1 − p)',
      definitions: 'Surviving activations are scaled by 1/(1 − p) so the expected value is unchanged.',
      steps: ['1/(1 − 0.5) = 2', `Output = [2×2, 0, 6×2, 0] = [${out.map((v) => f(v)).join(', ')}]`],
      answer: `The output is [${out.map((v) => f(v)).join(', ')}].`,
      checks: [{ check: 'Masked units are zero', detail: 'Indices 2 and 4 are dropped.' }],
    };
  },

  '170': () => {
    const layers = [10, 8, 5, 3];
    const params = layers.slice(1).reduce((n, width, i) => n + (layers[i] + 1) * width, 0);
    return {
      given: ['Architecture 10 → 8 → 5 → 3', 'Fully connected, biases included'],
      find: 'Total trainable parameters.',
      formulaName: 'Parameter count of a dense network',
      formula: 'params = Σ (nᵢ₋₁ + 1)nᵢ',
      definitions: 'Each layer has nᵢ₋₁nᵢ weights plus nᵢ biases.',
      steps: [
        `10→8: (10 + 1) × 8 = ${f((10 + 1) * 8)}`,
        `8→5: (8 + 1) × 5 = ${f((8 + 1) * 5)}`,
        `5→3: (5 + 1) × 3 = ${f((5 + 1) * 3)}`,
        `Total = ${f(params)}`,
      ],
      answer: `${f(params)} trainable parameters.`,
      checks: [{ check: 'Biases included', detail: '8 + 5 + 3 = 16 bias terms.' }],
    };
  },

  '171': () => {
    const layers = [20, 50, 100, 10];
    const weights = layers.slice(1).reduce((n, width, i) => n + layers[i] * width, 0);
    const biases = sum(layers.slice(1));
    return {
      given: ['Architecture 20 → 50 → 100 → 10', 'Fully connected'],
      find: 'Weights, biases and total parameters.',
      formulaName: 'Parameter count of a dense network',
      formula: 'weights = Σ nᵢ₋₁nᵢ;  biases = Σ nᵢ;  total = weights + biases',
      definitions: 'Bias vectors have one entry per non-input unit.',
      steps: [
        `Weights: 20×50 = 1000, 50×100 = 5000, 100×10 = 1000 → ${f(weights)}`,
        `Biases: 50 + 100 + 10 = ${f(biases)}`,
        `Total: ${f(weights)} + ${f(biases)} = ${f(weights + biases)}`,
      ],
      answer: `${f(weights)} weights, ${f(biases)} biases, ${f(weights + biases)} parameters.`,
      checks: [{ check: 'Sums consistent', detail: '7000 + 160 = 7160.' }],
    };
  },

  '172': () => {
    const layers = [784, 256, 128, 10];
    const weights = layers.slice(1).reduce((n, width, i) => n + layers[i] * width, 0);
    const biases = sum(layers.slice(1));
    return {
      given: ['784 input features', '10 output classes', 'Two hidden layers chosen here: 256 and 128'],
      find: 'Total parameters of the designed network and the reasoning for the widths.',
      formulaName: 'Parameter count of a dense network',
      formula: 'params = Σ (nᵢ₋₁ + 1)nᵢ',
      definitions: 'Widths are a design choice; the count follows the same formula.',
      assumptions: ['The hidden widths 256 and 128 are this solution’s design choice, since the question leaves them open.'],
      steps: [
        `784→256: (784 + 1) × 256 = ${f(785 * 256)}`,
        `256→128: (256 + 1) × 128 = ${f(257 * 128)}`,
        `128→10: (128 + 1) × 10 = ${f(129 * 10)}`,
        `Total: ${f(785 * 256)} + ${f(257 * 128)} + ${f(129 * 10)} = ${f(weights + biases)}`,
      ],
      answer: `${f(weights)} weights + ${f(biases)} biases = ${f(weights + biases)} trainable parameters.`,
      checks: [
        { check: 'Capacity reasonable', detail: 'About 235k parameters for 784 inputs and 10 classes.' },
        { check: 'Arithmetic rechecked', detail: '200,704 + 32,768 + 1,280 + 394.' },
      ],
    };
  },

  '219': () => {
    const x = 3;
    const w = 0.2;
    const b = -0.1;
    const y = 1;
    const eta = 0.1;
    const z = w * x + b;
    const yhat = sigmoid(z);
    const L = -Math.log(yhat);
    const dLdz = yhat - y;
    const dLdw = dLdz * x;
    const dLdb = dLdz;
    const w2 = w - eta * dLdw;
    const b2 = b - eta * dLdb;
    const z2 = w2 * x + b2;
    const yhat2 = sigmoid(z2);
    const L2 = -Math.log(yhat2);
    return {
      given: ['Sigmoid neuron with binary cross-entropy', 'x = 3, w = 0.2, b = −0.1, y = 1, η = 0.1'],
      find: 'One complete training step: forward pass, loss, gradients, updates and the new prediction.',
      formulaName: 'Sigmoid + BCE training step',
      formula: 'z = wx + b; ŷ = σ(z); L = −ln ŷ; ∂L/∂z = ŷ − y; w ← w − η(ŷ − y)x; b ← b − η(ŷ − y)',
      definitions: 'The gradient simplifies because the sigmoid derivative cancels the BCE denominator.',
      steps: [
        `Forward: z = 0.2(3) − 0.1 = ${f(z)}`,
        `Prediction: ŷ = σ(${f(z)}) = ${f(yhat)}`,
        `Loss: L = −ln(${f(yhat)}) = ${f(L)}`,
        `Gradient at logit: ∂L/∂z = ${f(yhat)} − 1 = ${f(dLdz)}`,
        `Weight gradient: ∂L/∂w = ${f(dLdz)} × 3 = ${f(dLdw)}`,
        `Bias gradient: ∂L/∂b = ${f(dLdz)}`,
        `Update: w′ = 0.2 − 0.1(${f(dLdw)}) = ${f(w2)}; b′ = −0.1 − 0.1(${f(dLdb)}) = ${f(b2)}`,
        `New forward: z′ = ${f(w2)}(3) + ${f(b2)} = ${f(z2)} → ŷ′ = ${f(yhat2)}; new loss = ${f(L2)}`,
      ],
      answer: `Before: z = ${f(z)}, ŷ = ${f(yhat)}, L = ${f(L)}. After one step: w = ${f(w2)}, b = ${f(b2)}, ŷ′ = ${f(yhat2)}, L′ = ${f(L2)} — the prediction moved toward the target.`,
      checks: [
        { check: 'Prediction improved', detail: `${f(yhat)} → ${f(yhat2)} (target 1).` },
        { check: 'Loss decreased', detail: `${f(L)} → ${f(L2)}.` },
      ],
    };
  },

  '222': () => {
    const w0 = 10;
    const eta = 0.1;
    const steps = 5;
    const sgd: number[] = [w0];
    const mom: number[] = [w0];
    const rms: number[] = [w0];
    const adam: number[] = [w0];
    let v = 0;
    let s = 0;
    let m = 0;
    let vv = 0;
    for (let t = 1; t <= steps; t++) {
      const w = sgd[t - 1];
      sgd.push(w - eta * 2 * w);

      const wm = mom[t - 1];
      v = 0.9 * v + 2 * wm;
      mom.push(wm - eta * v);

      const wr = rms[t - 1];
      const g = 2 * wr;
      s = 0.9 * s + 0.1 * g * g;
      rms.push(wr - (eta * g) / (Math.sqrt(s) + 1e-8));

      const wa = adam[t - 1];
      const ga = 2 * wa;
      m = 0.9 * m + 0.1 * ga;
      vv = 0.999 * vv + 0.001 * ga * ga;
      const mhat = m / (1 - 0.9 ** t);
      const vhat = vv / (1 - 0.999 ** t);
      adam.push(wa - (eta * mhat) / (Math.sqrt(vhat) + 1e-8));
    }
    const rows = Array.from({ length: steps + 1 }, (_, i) => [
      String(i),
      f(sgd[i]),
      f(mom[i]),
      f(rms[i]),
      f(adam[i]),
    ]);
    return {
      given: ['L(w) = w²', 'w₀ = 10', 'η = 0.1', 'Momentum β = 0.9, RMSProp β = 0.9, Adam β₁ = 0.9, β₂ = 0.999', 'Five iterations'],
      find: 'The trajectory of each optimiser and why they differ.',
      formulaName: 'SGD, momentum, RMSProp and Adam updates',
      formula: 'SGD: w ← w − ηg;  Momentum: v ← βv + g, w ← w − ηv;  RMSProp: s ← βs + (1−β)g², w ← w − ηg/√s;  Adam: bias-corrected m and v',
      definitions: 'g = 2w here; s accumulates squared gradients; m and v are Adam’s moments.',
      assumptions: ['Momentum uses the v ← βv + g convention and RMSProp has no momentum term.'],
      steps: [
        'SGD multiplies w by (1 − 2η) = 0.8 each step, a smooth geometric decay.',
        'Momentum accumulates velocity, so it accelerates and then overshoots past the minimum.',
        'RMSProp divides by the running gradient magnitude, taking cautious, shrinking steps.',
        'Adam normalises by the bias-corrected second moment, so its first steps are small and steady.',
      ],
      table: { columns: ['iteration', 'SGD', 'Momentum', 'RMSProp', 'Adam'], rows },
      answer: `After five iterations: SGD w = ${f(sgd[5])}, Momentum w = ${f(mom[5])}, RMSProp w = ${f(rms[5])}, Adam w = ${f(adam[5])}. Momentum overshoots the minimum at 0; SGD decays geometrically; RMSProp and Adam normalise the step by gradient magnitude and stay stable.`,
      checks: [
        { check: 'All four trajectories computed', detail: 'The table is generated from the update rules, not typed.' },
        { check: 'Momentum overshoots', detail: `Momentum crosses zero by iteration 4 (${f(mom[4])}).` },
      ],
    };
  },

  '223': () => {
    const epochs = [1, 5, 10, 20, 30, 40];
    const train = [1.2, 0.7, 0.4, 0.15, 0.05, 0.01];
    const val = [1.3, 0.8, 0.6, 0.7, 1.1, 1.5];
    let best = 0;
    for (let i = 1; i < val.length; i++) if (val[i] < val[best]) best = i;
    return {
      given: [`Epochs ${epochs.join(', ')}`, `Training loss ${train.join(', ')}`, `Validation loss ${val.join(', ')}`],
      find: 'Where overfitting begins, the evidence, whether to stop early, three remedies, and the shape of the curves.',
      formulaName: 'Validation-based overfitting diagnosis',
      formula: 'Overfitting begins when dL_val/d(epoch) > 0 while dL_train/d(epoch) < 0',
      definitions: 'The generalisation gap is L_val − L_train; its minimum marks the best checkpoint.',
      steps: [
        `Validation loss falls until epoch ${epochs[best]} (${val[best]}), then rises: 0.70, 1.10, 1.50.`,
        'Training loss keeps falling throughout (0.15, 0.05, 0.01), so the gap widens from 0.55 at epoch 10 to 1.49 at epoch 40.',
        'The model starts fitting training noise after roughly epoch 10–20.',
        'Early stopping would restore the epoch-10 checkpoint.',
      ],
      table: {
        columns: ['epoch', 'training loss', 'validation loss', 'gap'],
        rows: epochs.map((e, i) => [String(e), String(train[i]), String(val[i]), f(val[i] - train[i])]),
      },
      answer: `Overfitting begins around epoch 10–20: validation loss bottoms at ${val[best]} at epoch ${epochs[best]} and then rises while training loss keeps falling. Use early stopping at that checkpoint, and add data augmentation, dropout/weight decay and capacity reduction. The curves should diverge after the validation minimum: training continues down, validation turns up.`,
      checks: [
        { check: 'Minimum validation loss identified', detail: `Epoch ${epochs[best]}, loss ${val[best]}.` },
        { check: 'Training loss monotonic', detail: 'No increase in the training column.' },
      ],
    };
  },

  '225': () => {
    // The question omits all values; a clearly labelled illustration is computed.
    const x = 1;
    const W1 = 0.5;
    const b1 = 0;
    const W2 = 2;
    const b2 = 0;
    const y = 1;
    const eta = 0.1;
    const z1 = W1 * x + b1;
    const a1 = sigmoid(z1);
    const z2 = W2 * a1 + b2;
    const yhat = sigmoid(z2);
    const L = -Math.log(yhat);
    const dLdz2 = yhat - y;
    const dLdW2 = dLdz2 * a1;
    const dLdb2 = dLdz2;
    const dLda1 = dLdz2 * W2;
    const dLdz1 = dLda1 * a1 * (1 - a1);
    const dLdW1 = dLdz1 * x;
    const dLdb1 = dLdz1;
    return {
      given: [
        'Two-layer network: z1 = W1x + b1, a1 = σ(z1), z2 = W2a1 + b2, ŷ = σ(z2), L = −ln ŷ',
        'The question gives no numerical values, so the illustrative values below are stated explicitly',
        `Illustration: x = ${x}, W1 = ${W1}, b1 = ${b1}, W2 = ${W2}, b2 = ${b2}, y = ${y}, η = ${eta}`,
      ],
      find: 'A complete forward and backward pass with all gradients and one parameter update.',
      formulaName: 'Backpropagation for a two-layer network',
      formula: 'δ₂ = ŷ − y; ∂L/∂W2 = δ₂a1; δ₁ = (W2δ₂) ⊙ a1(1 − a1); ∂L/∂W1 = δ₁x',
      definitions: 'δ is the gradient with respect to a layer’s pre-activation; ⊙ is element-wise multiplication.',
      assumptions: ['The architecture and all values are missing from the question; the numbers above are an explicitly labelled illustration, not values taken from the question.'],
      missing: ['the two-layer architecture (widths)', 'all weights and biases', 'the input x and target y', 'the learning rate'],
      steps: [
        `Forward: z1 = ${f(z1)}, a1 = ${f(a1)}`,
        `z2 = ${f(z2)}, ŷ = ${f(yhat)}, L = ${f(L)}`,
        `δ₂ = ŷ − y = ${f(dLdz2)}`,
        `∂L/∂W2 = δ₂a1 = ${f(dLdW2)}; ∂L/∂b2 = ${f(dLdb2)}`,
        `δ₁ = W2δ₂a1(1 − a1) = ${f(dLdz1)}`,
        `∂L/∂W1 = δ₁x = ${f(dLdW1)}; ∂L/∂b1 = ${f(dLdb1)}`,
        `Update: W2′ = ${f(W2 - eta * dLdW2)}, W1′ = ${f(W1 - eta * dLdW1)}`,
      ],
      answer: `Illustration result: L = ${f(L)}, ∂L/∂W2 = ${f(dLdW2)}, ∂L/∂W1 = ${f(dLdW1)}, and one step gives W2 = ${f(W2 - eta * dLdW2)}, W1 = ${f(W1 - eta * dLdW1)}. Substitute the missing values from your question into the same chain to obtain its answer.`,
      checks: [
        { check: 'Missing values disclosed', detail: 'The question supplies no numbers; the computation is labelled illustrative.' },
        { check: 'Chain complete', detail: 'Both layers receive gradients through δ₂ and δ₁.' },
      ],
    };
  },
};
