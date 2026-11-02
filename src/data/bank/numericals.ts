// EXAMFORGE — Numerical Solving Lab specs.
// Every spec shows given values, required values, formula, why it applies, substitution,
// step-by-step working, final answer and common mistakes. Practice mode randomises values.

import type { NumericalParam, NumericalSpec } from '../types';

const p = (
  name: string,
  label: string,
  value: number,
  range: [number, number],
  unit?: string,
  decimals = 0,
): NumericalParam => ({ name, label, value, range, unit, decimals });

const f = (n: number, d = 2) => {
  const r = Number(n.toFixed(d));
  return String(r);
};

export const NUMERICALS: NumericalSpec[] = [
  // ============================================================ DEEP LEARNING
  {
    id: 'dl-perceptron',
    subjectId: 'dl',
    unitId: 'dl-u2',
    topicId: 'dl-u2-t3',
    category: 'Perceptron',
    problemTemplate:
      'A perceptron has weights w1={w1}, w2={w2}, bias b={b}. For input x1={x1}, x2={x2}, compute the weighted sum and the output with a step activation (threshold 0).',
    params: [p('w1', 'w1', 0.5, [-2, 2], '', 2), p('w2', 'w2', -1.5, [-2, 2], '', 2), p('b', 'bias b', 0.5, [-2, 2], '', 2), p('x1', 'x1', 2, [-3, 3], '', 1), p('x2', 'x2', 1, [-3, 3], '', 1)],
    required: ['Weighted sum z', 'Step output ŷ'],
    formula: 'z = w1·x1 + w2·x2 + b;  ŷ = 1 if z ≥ 0 else 0',
    why: 'A perceptron is a linear threshold unit: it computes a weighted sum and fires when that sum crosses the bias-shifted threshold.',
    solve: (v) => {
      const z = v.w1 * v.x1 + v.w2 * v.x2 + v.b;
      const y = z >= 0 ? 1 : 0;
      return {
        steps: [
          { title: 'Product 1', expr: `w1·x1 = ${f(v.w1)} × ${f(v.x1)} = ${f(v.w1 * v.x1, 3)}` },
          { title: 'Product 2', expr: `w2·x2 = ${f(v.w2)} × ${f(v.x2)} = ${f(v.w2 * v.x2, 3)}` },
          { title: 'Add bias', expr: `z = ${f(v.w1 * v.x1, 3)} + ${f(v.w2 * v.x2, 3)} + ${f(v.b)} = ${f(z, 3)}` },
          { title: 'Apply step activation', expr: `ŷ = 1 if z ≥ 0 else 0 → ŷ = ${y}`, note: z >= 0 ? 'z is non-negative, so the unit fires.' : 'z is negative, so the unit stays off.' },
        ],
        answer: `z = ${f(z, 3)}, ŷ = ${y}`,
      };
    },
    mistakes: ['Forgetting to add the bias term.', 'Using the sign of z instead of comparing with the threshold: the threshold is z ≥ 0 (bias already shifts it).'],
  },
  {
    id: 'dl-sigmoid',
    subjectId: 'dl',
    unitId: 'dl-u2',
    topicId: 'dl-u2-t7',
    category: 'Activation function',
    problemTemplate: 'Compute the sigmoid activation σ(z) for z = {z} and state the derivative at that point.',
    params: [p('z', 'z', 1.5, [-4, 4], '', 2)],
    required: ['σ(z)', "σ'(z)"],
    formula: 'σ(z) = 1/(1+e^(−z));  σ\u2032(z) = σ(z)(1 − σ(z))',
    why: 'Sigmoid squashes any real number into (0,1) and its derivative is expressible through its own output, which makes backpropagation cheap.',
    solve: (v) => {
      const s = 1 / (1 + Math.exp(-v.z));
      const d = s * (1 - s);
      return {
        steps: [
          { title: 'Exponential', expr: `e^(−z) = e^(${f(-v.z)}) = ${f(Math.exp(-v.z), 5)}` },
          { title: 'Denominator', expr: `1 + e^(−z) = ${f(1 + Math.exp(-v.z), 5)}` },
          { title: 'Activation', expr: `σ = 1 / ${f(1 + Math.exp(-v.z), 5)} = ${f(s, 5)}` },
          { title: 'Derivative', expr: `σ\u2032 = ${f(s, 5)} × (1 − ${f(s, 5)}) = ${f(d, 5)}` },
        ],
        answer: `σ(${f(v.z)}) = ${f(s, 4)}, σ\u2032 = ${f(d, 4)}`,
      };
    },
    mistakes: ['Using log base 10 instead of the natural exponential.', 'Reporting the derivative as σ(z) instead of σ(z)(1−σ(z)).', 'Ignoring the vanishing-gradient implication when |z| is large.'],
  },
  {
    id: 'dl-mse',
    subjectId: 'dl',
    unitId: 'dl-u2',
    topicId: 'dl-u2-t9',
    category: 'Loss function',
    problemTemplate: 'For targets y = {y} and predictions ŷ = {yh}, compute the mean squared error for a single output and the gradient with respect to ŷ.',
    params: [p('y', 'target y', 1, [0, 1], '', 0), p('yh', 'prediction ŷ', 0.7, [0, 1], '', 2)],
    required: ['MSE loss', '∂L/∂ŷ'],
    formula: 'L = (ŷ − y)²;  ∂L/∂ŷ = 2(ŷ − y)',
    why: 'MSE penalises squared deviation, so the gradient is linear in the error — the standard regression loss.',
    solve: (v) => {
      const e = v.yh - v.y;
      return {
        steps: [
          { title: 'Error', expr: `ŷ − y = ${f(v.yh)} − ${f(v.y)} = ${f(e, 3)}` },
          { title: 'Square', expr: `L = (${f(e, 3)})² = ${f(e * e, 4)}` },
          { title: 'Gradient', expr: `∂L/∂ŷ = 2 × ${f(e, 3)} = ${f(2 * e, 4)}` },
        ],
        answer: `L = ${f(e * e, 4)}, ∂L/∂ŷ = ${f(2 * e, 4)}`,
      };
    },
    mistakes: ['Forgetting to square the error.', 'Dropping the factor 2 in the derivative.', 'Dividing by batch size when the question asks for a single sample.'],
  },
  {
    id: 'dl-ce',
    subjectId: 'dl',
    unitId: 'dl-u3',
    topicId: 'dl-u3-t4',
    category: 'Loss function',
    problemTemplate: 'A binary classifier outputs probability ŷ = {yh} for the true class y = 1. Compute the binary cross-entropy loss.',
    params: [p('yh', 'predicted probability', 0.8, [0.05, 0.95], '', 2)],
    required: ['Cross-entropy loss L'],
    formula: 'L = −[y·log ŷ + (1−y)·log(1−ŷ)]; with y=1: L = −log ŷ',
    why: 'Cross-entropy is the negative log-likelihood of the true label under the predicted distribution; it punishes confident wrong answers heavily.',
    solve: (v) => {
      const L = -Math.log(v.yh);
      return {
        steps: [
          { title: 'Identify the active term', expr: 'y = 1 → only −log ŷ contributes' },
          { title: 'Substitute', expr: `−log(${f(v.yh)}) = −(${f(Math.log(v.yh), 4)})` },
          { title: 'Evaluate', expr: `L = ${f(L, 4)}` },
        ],
        answer: `L = ${f(L, 4)} nats`,
      };
    },
    mistakes: ['Using log base 10 and calling the result nats.', 'Computing −log(1−ŷ) when the true label is 1.', 'Reporting a negative loss (forgetting the minus sign).'],
  },
  {
    id: 'dl-gd-update',
    subjectId: 'dl',
    unitId: 'dl-u4',
    topicId: 'dl-u4-t1',
    category: 'Optimisation',
    problemTemplate: 'Gradient descent with learning rate η = {lr} updates weight w = {w} using gradient ∂L/∂w = {g}. Compute the new weight after one step.',
    params: [p('lr', 'learning rate η', 0.1, [0.01, 0.5], '', 2), p('w', 'weight w', 2, [-3, 3], '', 2), p('g', 'gradient', 0.5, [-2, 2], '', 2)],
    required: ['Updated weight w_new'],
    formula: 'w_new = w − η · ∂L/∂w',
    why: 'SGD moves parameters opposite the gradient, scaled by the learning rate, to reduce the loss.',
    solve: (v) => {
      const step = v.lr * v.g;
      return {
        steps: [
          { title: 'Scaled gradient', expr: `η·g = ${f(v.lr)} × ${f(v.g)} = ${f(step, 4)}` },
          { title: 'Update rule', expr: `w_new = ${f(v.w)} − ${f(step, 4)} = ${f(v.w - step, 4)}` },
          { title: 'Interpretation', expr: v.g > 0 ? 'Positive gradient → weight decreases.' : 'Negative gradient → weight increases.' },
        ],
        answer: `w_new = ${f(v.w - step, 4)}`,
      };
    },
    mistakes: ['Adding the gradient instead of subtracting it.', 'Forgetting to multiply by the learning rate.', 'Using the loss value instead of the gradient.'],
  },
  {
    id: 'dl-conv-shape',
    subjectId: 'dl',
    unitId: 'dl-u5',
    topicId: 'dl-u5-t2',
    category: 'CNN',
    problemTemplate:
      'A convolutional layer receives an input of {W}×{W} with kernel size K={K}, padding P={P} and stride S={S}. Compute the output spatial size and the number of parameters for C_in={Cin} and C_out={Cout} channels.',
    params: [p('W', 'input size W', 32, [16, 128], 'px'), p('K', 'kernel K', 3, [3, 7]), p('P', 'padding P', 1, [0, 3]), p('S', 'stride S', 1, [1, 3]), p('Cin', 'input channels', 3, [1, 8]), p('Cout', 'output filters', 32, [8, 128])],
    required: ['Output size O', 'Parameter count'],
    formula: 'O = (W − K + 2P)/S + 1;  params = K·K·C_in·C_out + C_out',
    why: 'The output size formula counts valid filter placements; parameter count ignores spatial size because filters are shared across positions.',
    solve: (v) => {
      const O = Math.floor((v.W - v.K + 2 * v.P) / v.S) + 1;
      const params = v.K * v.K * v.Cin * v.Cout + v.Cout;
      return {
        steps: [
          { title: 'Effective input', expr: `W + 2P = ${f(v.W)} + 2(${f(v.P)}) = ${f(v.W + 2 * v.P)}` },
          { title: 'Numerator', expr: `(W + 2P) − K = ${f(v.W + 2 * v.P - v.K)}` },
          { title: 'Divide by stride', expr: `${f(v.W + 2 * v.P - v.K)} / ${f(v.S)} = ${f((v.W + 2 * v.P - v.K) / v.S, 3)}` },
          { title: 'Output size', expr: `O = floor(${f((v.W + 2 * v.P - v.K) / v.S, 3)}) + 1 = ${O}` },
          { title: 'Parameters', expr: `K·K·C_in·C_out + C_out = ${v.K}·${v.K}·${v.Cin}·${v.Cout} + ${v.Cout} = ${params}` },
        ],
        answer: `Output ${O}×${O}×${v.Cout}, parameters = ${params}`,
      };
    },
    mistakes: ['Applying padding twice.', 'Forgetting the +1 in the output-size formula.', 'Multiplying parameters by the output size (weights are shared spatially).'],
  },
  {
    id: 'dl-pool',
    subjectId: 'dl',
    unitId: 'dl-u5',
    topicId: 'dl-u5-t2',
    category: 'CNN',
    problemTemplate: 'A max-pooling layer with window F={F} and stride S={S} follows a {W}×{W} feature map. Compute the pooled output size.',
    params: [p('W', 'feature map size', 26, [8, 64]), p('F', 'pool window', 2, [2, 3]), p('S', 'stride', 2, [1, 3])],
    required: ['Pooled output size'],
    formula: 'O = floor((W − F)/S) + 1',
    why: 'Pooling has no padding by default, so only fully contained windows count.',
    solve: (v) => {
      const O = Math.floor((v.W - v.F) / v.S) + 1;
      return {
        steps: [
          { title: 'Subtract window', expr: `W − F = ${f(v.W)} − ${f(v.F)} = ${f(v.W - v.F)}` },
          { title: 'Divide by stride', expr: `${f(v.W - v.F)} / ${f(v.S)} = ${f((v.W - v.F) / v.S, 3)}` },
          { title: 'Output', expr: `O = floor(...) + 1 = ${O}` },
        ],
        answer: `O = ${O}×${O}`,
      };
    },
    mistakes: ['Adding padding that pooling does not use.', 'Forgetting the +1 term.', 'Confusing pooling with convolution parameter counts (pooling has none).'],
  },
  {
    id: 'dl-rnn-params',
    subjectId: 'dl',
    unitId: 'dl-u5',
    topicId: 'dl-u5-t5',
    category: 'RNN',
    problemTemplate: 'An RNN has input size {I}, hidden size {H} and output size {O} (single layer, bias included). Compute the total trainable parameters.',
    params: [p('I', 'input dim', 100, [10, 300]), p('H', 'hidden dim', 128, [16, 512]), p('O', 'output dim', 10, [2, 100])],
    required: ['Total parameters'],
    formula: 'params = (H·I + H·H + H) + (H·O + O)',
    why: 'Weights are shared across time, so the count is independent of sequence length: one input matrix, one recurrent matrix, one output matrix plus biases.',
    solve: (v) => {
      const rec = v.H * v.I + v.H * v.H + v.H;
      const out = v.H * v.O + v.O;
      return {
        steps: [
          { title: 'Input→hidden', expr: `H·I + H = ${v.H}×${v.I} + ${v.H} = ${v.H * v.I + v.H}` },
          { title: 'Hidden→hidden', expr: `H·H = ${v.H}×${v.H} = ${v.H * v.H}` },
          { title: 'Hidden→output', expr: `H·O + O = ${v.H}×${v.O} + ${v.O} = ${out}` },
          { title: 'Total', expr: `${rec} + ${out} = ${rec + out}` },
        ],
        answer: `${rec + out} parameters (independent of sequence length)`,
      };
    },
    mistakes: ['Multiplying the recurrent weights by the number of time steps.', 'Omitting biases.', 'Forgetting the output layer entirely.'],
  },

  // ============================================================ COMPUTER NETWORKS
  {
    id: 'cn-trans-delay',
    subjectId: 'cn',
    unitId: 'cn-u1',
    topicId: 'cn-u1-t5',
    category: 'Delay',
    problemTemplate: 'A packet of L = {L} bits is transmitted over a link of rate R = {R} Mbps. Compute the transmission delay in milliseconds.',
    params: [p('L', 'packet size L', 1500, [500, 12000], 'bits'), p('R', 'link rate R', 10, [1, 1000], 'Mbps')],
    required: ['Transmission delay d_trans (ms)'],
    formula: 'd_trans = L / R  (R in bits per second)',
    why: 'Transmission (serialisation) delay is the time to push all bits onto the link; it does not depend on distance.',
    solve: (v) => {
      const R = v.R * 1e6;
      const d = (v.L / R) * 1000;
      return {
        steps: [
          { title: 'Convert rate', expr: `R = ${f(v.R)} Mbps = ${R.toExponential(2)} bps` },
          { title: 'Apply formula', expr: `d_trans = ${f(v.L)} / ${R.toExponential(2)} = ${(v.L / R).toExponential(3)} s` },
          { title: 'Convert to ms', expr: `${(v.L / R).toExponential(3)} × 1000 = ${f(d, 4)} ms` },
        ],
        answer: `d_trans = ${f(d, 4)} ms`,
      };
    },
    mistakes: ['Using Mbps directly without converting to bps (off by 10⁶).', 'Confusing transmission delay with propagation delay.', 'Reporting seconds when milliseconds are asked.'],
  },
  {
    id: 'cn-prop-delay',
    subjectId: 'cn',
    unitId: 'cn-u1',
    topicId: 'cn-u1-t5',
    category: 'Delay',
    problemTemplate: 'A signal travels d = {d} km over fibre at propagation speed s = {s} × 10⁸ m/s. Compute the propagation delay in milliseconds.',
    params: [p('d', 'distance d', 1000, [100, 12000], 'km'), p('s', 'speed factor s', 2, [1.5, 3], '×10⁸ m/s', 1)],
    required: ['Propagation delay d_prop (ms)'],
    formula: 'd_prop = d / s  (metres ÷ m/s)',
    why: 'Propagation delay depends only on physical distance and medium speed, never on packet size or link rate.',
    solve: (v) => {
      const metres = v.d * 1000;
      const speed = v.s * 1e8;
      const d = (metres / speed) * 1000;
      return {
        steps: [
          { title: 'Convert distance', expr: `${f(v.d)} km = ${metres.toExponential(3)} m` },
          { title: 'Apply formula', expr: `d_prop = ${metres.toExponential(3)} / ${speed.toExponential(2)} = ${(metres / speed).toExponential(3)} s` },
          { title: 'Convert to ms', expr: `${(metres / speed).toExponential(3)} × 1000 = ${f(d, 4)} ms` },
        ],
        answer: `d_prop = ${f(d, 4)} ms`,
      };
    },
    mistakes: ['Forgetting to convert km to metres.', 'Using 3×10⁸ for fibre (light in glass is ~2×10⁸).', 'Mixing this with transmission delay in a total-delay question.'],
  },
  {
    id: 'cn-nodal-delay',
    subjectId: 'cn',
    unitId: 'cn-u1',
    topicId: 'cn-u1-t5',
    category: 'Delay',
    problemTemplate:
      'A packet of L = {L} bits crosses N = {N} hops, each of rate R = {R} Mbps and length {d} km, with processing {proc} ms and queueing {q} ms per hop (speed 2×10⁸ m/s). Compute the total delay.',
    params: [p('L', 'packet size', 1500, [500, 12000], 'bits'), p('N', 'hops', 3, [1, 8]), p('R', 'rate', 100, [1, 1000], 'Mbps'), p('d', 'distance per hop', 500, [100, 5000], 'km'), p('proc', 'processing per hop', 1, [0.1, 5], 'ms', 1), p('q', 'queueing per hop', 2, [0, 20], 'ms', 1)],
    required: ['Total end-to-end delay (ms)'],
    formula: 'd_total = N × (d_proc + d_queue + L/R + d/s)',
    why: 'Every hop contributes processing, queueing, transmission and propagation delay; the packet crosses all N hops.',
    solve: (v) => {
      const trans = (v.L / (v.R * 1e6)) * 1000;
      const prop = ((v.d * 1000) / 2e8) * 1000;
      const per = v.proc + v.q + trans + prop;
      return {
        steps: [
          { title: 'Transmission per hop', expr: `L/R = ${f(v.L)} / ${(v.R * 1e6).toExponential(2)} = ${f(trans, 4)} ms` },
          { title: 'Propagation per hop', expr: `d/s = ${f(v.d * 1000)} / 2×10⁸ = ${f(prop, 4)} ms` },
          { title: 'Per-hop total', expr: `${f(v.proc, 1)} + ${f(v.q, 1)} + ${f(trans, 4)} + ${f(prop, 4)} = ${f(per, 4)} ms` },
          { title: 'All hops', expr: `${f(v.N)} × ${f(per, 4)} = ${f(per * v.N, 4)} ms` },
        ],
        answer: `d_total ≈ ${f(per * v.N, 3)} ms`,
      };
    },
    mistakes: ['Counting transmission/propagation once instead of per hop.', 'Omitting queueing and processing because they are "small".', 'Unit slips between µs and ms.'],
  },
  {
    id: 'cn-throughput',
    subjectId: 'cn',
    unitId: 'cn-u1',
    topicId: 'cn-u1-t7',
    category: 'Throughput',
    problemTemplate: 'A path has link rates {R1}, {R2} and {R3} Mbps in series. Compute the end-to-end throughput for a single flow, and the time to transfer a file of {F} MB.',
    params: [p('R1', 'link 1', 100, [10, 10000], 'Mbps'), p('R2', 'link 2', 50, [10, 10000], 'Mbps'), p('R3', 'link 3', 200, [10, 10000], 'Mbps'), p('F', 'file size', 100, [1, 5000], 'MB')],
    required: ['Bottleneck throughput', 'Transfer time'],
    formula: 'Throughput = min(R1, R2, R3);  T = (F × 8) / Throughput',
    why: 'A flow cannot exceed the slowest link on its path — the bottleneck link sets the rate.',
    solve: (v) => {
      const tput = Math.min(v.R1, v.R2, v.R3);
      const bits = v.F * 8 * 1e6;
      const T = bits / (tput * 1e6);
      return {
        steps: [
          { title: 'Find bottleneck', expr: `min(${f(v.R1)}, ${f(v.R2)}, ${f(v.R3)}) = ${f(tput)} Mbps` },
          { title: 'File in bits', expr: `${f(v.F)} MB × 8 = ${bits.toExponential(3)} bits` },
          { title: 'Transfer time', expr: `${bits.toExponential(3)} / ${(tput * 1e6).toExponential(2)} = ${f(T, 3)} s` },
        ],
        answer: `Throughput = ${f(tput)} Mbps; T ≈ ${f(T, 3)} s`,
      };
    },
    mistakes: ['Averaging link rates instead of taking the minimum.', 'Confusing MB (bytes) with Mb (bits).', 'Adding delays of the links sequentially without pipelining.'],
  },
  {
    id: 'cn-udp-checksum',
    subjectId: 'cn',
    unitId: 'cn-u3',
    topicId: 'cn-u3-t4',
    category: 'Checksum',
    problemTemplate: 'Two 16-bit words of a UDP segment are 0x{A} and 0x{B}, and the checksum field is zero during computation. Compute the 16-bit one’s complement checksum.',
    params: [p('A', 'word 1', 4500, [0, 65535]), p('B', 'word 2', 12000, [0, 65535])],
    required: ['Checksum field value (hex)'],
    formula: 'sum = A + B with end-around carry; checksum = ~sum (16-bit one’s complement)',
    why: 'UDP uses the internet checksum: one’s complement addition is order-independent and the receiver can verify by summing to 0xFFFF.',
    solve: (v) => {
      let s = v.A + v.B;
      const carry = s > 0xffff ? 1 : 0;
      if (carry) s = (s & 0xffff) + 1;
      const cs = ~s & 0xffff;
      const hex = (n: number) => '0x' + n.toString(16).toUpperCase().padStart(4, '0');
      return {
        steps: [
          { title: 'Add words', expr: `${hex(v.A)} + ${hex(v.B)} = 0x${(v.A + v.B).toString(16).toUpperCase()}` },
          { title: 'End-around carry', expr: carry ? `carry detected → (0x${(v.A + v.B).toString(16).toUpperCase()} & 0xFFFF) + 1 = ${hex(s)}` : 'no carry → sum unchanged' },
          { title: 'One’s complement', expr: `~${hex(s)} = ${hex(cs)}` },
          { title: 'Verify', expr: `${hex(v.A)} + ${hex(v.B)} + ${hex(cs)} = 0xFFFF (valid)` },
        ],
        answer: `checksum = ${hex(cs)}`,
      };
    },
    mistakes: ['Forgetting the end-around carry.', 'Using two’s complement (adding 1) instead of one’s complement.', 'Omitting the pseudo-header when the question asks for the full UDP checksum.'],
  },
  {
    id: 'cn-gbn-window',
    subjectId: 'cn',
    unitId: 'cn-u3',
    topicId: 'cn-u3-t6',
    category: 'Sliding window',
    problemTemplate:
      'A Go-Back-N sender uses m = {m} sequence-number bits with a {ms} ms RTT and {L} byte frames on a {R} Mbps link. Compute the maximum window and the link utilisation with continuous transmission.',
    params: [p('m', 'sequence bits m', 3, [2, 8]), p('ms', 'RTT', 40, [5, 300], 'ms'), p('L', 'frame size', 1000, [200, 4000], 'bytes'), p('R', 'link rate', 10, [1, 100], 'Mbps')],
    required: ['Max window size', 'Transmission time per frame', 'Utilisation'],
    formula: 'N_max = 2^m − 1;  Tt = L·8/R;  U = min(1, N·Tt / RTT)',
    why: 'GBN uses a sender window only, capped at 2^m−1 so sequence numbers stay unambiguous; utilisation grows with how many frames fit in one RTT.',
    solve: (v) => {
      const N = 2 ** v.m - 1;
      const Tt = (v.L * 8) / (v.R * 1e6);
      const rtt = v.ms / 1000;
      const U = Math.min(1, (N * Tt) / rtt);
      return {
        steps: [
          { title: 'Max window', expr: `2^${v.m} − 1 = ${N} frames` },
          { title: 'Transmission time', expr: `Tt = ${f(v.L * 8)} bits / ${(v.R * 1e6).toExponential(2)} = ${f(Tt * 1000, 4)} ms` },
          { title: 'Window coverage', expr: `N × Tt = ${N} × ${f(Tt * 1000, 4)} ms = ${f(N * Tt * 1000, 3)} ms` },
          { title: 'Utilisation', expr: `min(1, ${f(N * Tt * 1000, 3)} / ${f(v.ms)}) = ${f(U * 100, 2)}%` },
        ],
        answer: `N = ${N}, Tt = ${f(Tt * 1000, 4)} ms, U = ${f(U * 100, 2)}%`,
      };
    },
    mistakes: ['Using 2^m instead of 2^m−1.', 'Using one-way delay rather than RTT.', 'Assuming utilisation above 100% is possible.'],
  },
  {
    id: 'cn-subnet',
    subjectId: 'cn',
    unitId: 'cn-u4',
    topicId: 'cn-u4-t3',
    category: 'Subnetting',
    problemTemplate: 'A network 192.168.{X}.0/{prefix} must be split into {S} equal subnets. Find the new prefix, usable hosts per subnet, and the first two subnet addresses.',
    params: [p('X', 'third octet', 10, [0, 254]), p('prefix', 'original prefix', 24, [16, 28]), p('S', 'subnets needed', 4, [2, 16])],
    required: ['New prefix', 'Hosts per subnet', 'First two subnet network addresses'],
    formula: 'bits = ceil(log2(S)); newPrefix = prefix + bits; hosts = 2^(32−newPrefix) − 2; step = 2^(32−newPrefix)',
    why: 'Subnetting borrows host bits; borrowing b bits yields 2^b subnets and splits the address space into equally sized blocks.',
    solve: (v) => {
      const bits = Math.ceil(Math.log2(v.S));
      const np = Math.min(30, v.prefix + bits);
      const hosts = 2 ** (32 - np) - 2;
      const step = 2 ** (32 - np);
      const addrs = [0, 1, 2].map((k) => `192.168.${v.X}.${k * step}`);
      return {
        steps: [
          { title: 'Borrowed bits', expr: `ceil(log2(${v.S})) = ${bits}` },
          { title: 'New prefix', expr: `${v.prefix} + ${bits} = /${np}` },
          { title: 'Hosts per subnet', expr: `2^${32 - np} − 2 = ${hosts}` },
          { title: 'Subnet step', expr: `2^${32 - np} = ${step} addresses per subnet` },
          { title: 'First subnets', expr: addrs.join(', ') },
        ],
        answer: `/${np}, ${hosts} usable hosts, subnets start at ${addrs.slice(0, 2).join(' and ')}`,
      };
    },
    mistakes: ['Forgetting to subtract 2 for network and broadcast addresses.', 'Rounding the borrowed-bit count down instead of up.', 'Listing the broadcast address as a usable host.'],
  },
  {
    id: 'cn-parity',
    subjectId: 'cn',
    unitId: 'cn-u5',
    topicId: 'cn-u5-t3',
    category: 'Error detection',
    problemTemplate: 'A data byte is 0b{bits} (decimal {dec}). Compute the even-parity bit and then the odd-parity bit.',
    params: [p('bits', 'data bits (decimal 0-255)', 1011001 % 256, [0, 255])],
    required: ['Even parity bit', 'Odd parity bit'],
    formula: 'even: p = (count of 1s) mod 2; odd: p = 1 − (count mod 2)',
    why: 'Parity enforces a fixed parity of ones so any single-bit flip breaks the rule and is detected.',
    solve: (v) => {
      const dec = Math.floor(v.bits) % 256;
      const ones = dec.toString(2).split('').filter((b) => b === '1').length;
      const even = ones % 2;
      const odd = 1 - even;
      return {
        steps: [
          { title: 'Binary form', expr: `${dec} = 0b${dec.toString(2).padStart(8, '0')}` },
          { title: 'Count ones', expr: `number of 1s = ${ones}` },
          { title: 'Even parity', expr: `${ones} is ${ones % 2 === 0 ? 'even' : 'odd'} → p_even = ${even}` },
          { title: 'Odd parity', expr: `p_odd = 1 − ${even} = ${odd}` },
        ],
        answer: `even parity bit = ${even}, odd parity bit = ${odd}`,
      };
    },
    mistakes: ['Counting zeros instead of ones.', 'Swapping the even/odd rules.', 'Claiming parity detects two-bit errors (it does not).'],
  },
  {
    id: 'cn-crc-bits',
    subjectId: 'cn',
    unitId: 'cn-u5',
    topicId: 'cn-u5-t5',
    category: 'CRC',
    problemTemplate:
      'A CRC generator polynomial has degree n = {n} and the data is {D} bits. State how many redundant bits are appended and the length of the transmitted frame.',
    params: [p('n', 'polynomial degree n', 4, [3, 32]), p('D', 'data length', 16, [8, 1024], 'bits')],
    required: ['Redundant bits', 'Transmitted frame length'],
    formula: 'redundant bits = n (degree of G(x)); frame = D + n',
    why: 'CRC appends a remainder of the same width as the generator degree, making the whole frame divisible by G(x).',
    solve: (v) => {
      const frame = v.D + v.n;
      return {
        steps: [
          { title: 'Append zeros', expr: `data × 2^${v.n} → ${v.D + v.n} bits before division` },
          { title: 'Remainder width', expr: `degree ${v.n} → ${v.n}-bit remainder` },
          { title: 'Frame length', expr: `${v.D} + ${v.n} = ${frame} bits` },
        ],
        answer: `${v.n} redundant bits; frame = ${frame} bits`,
      };
    },
    mistakes: ['Appending n+1 bits instead of n.', 'Forgetting that the remainder replaces the appended zeros.', 'Using the number of terms in G(x) as the degree.'],
  },
  {
    id: 'cn-avail',
    subjectId: 'cn',
    unitId: 'cn-u1',
    topicId: 'cn-u1-t2',
    category: 'Performance',
    problemTemplate:
      'A TCP connection sends {N} segments of {L} bytes over a {R} Mbps link with {ms} ms RTT, using a window of {W} segments. Compute the throughput achieved and whether the link is saturated.',
    params: [p('N', 'segments', 100, [10, 1000]), p('L', 'segment size', 1460, [500, 1460], 'bytes'), p('R', 'link rate', 100, [1, 1000], 'Mbps'), p('ms', 'RTT', 50, [5, 500], 'ms'), p('W', 'window', 4, [1, 64], 'segments')],
    required: ['Bytes per window', 'Time for N segments', 'Achieved throughput'],
    formula: 'windowBytes = W × L; rounds = ceil(N/W); T = rounds × RTT; tput = (N × L × 8)/T',
    why: 'With a window-limited sender, throughput is bounded by window size ÷ RTT (the bandwidth-delay product constraint).',
    solve: (v) => {
      const rounds = Math.ceil(v.N / v.W);
      const T = (rounds * v.ms) / 1000;
      const bits = v.N * v.L * 8;
      const tput = bits / T;
      const sat = (tput / (v.R * 1e6)) * 100;
      return {
        steps: [
          { title: 'Window payload', expr: `W × L = ${v.W} × ${v.L} = ${v.W * v.L} bytes` },
          { title: 'Rounds', expr: `ceil(${v.N}/${v.W}) = ${rounds}` },
          { title: 'Total time', expr: `${rounds} × ${v.ms} ms = ${f(T, 3)} s` },
          { title: 'Throughput', expr: `${bits.toExponential(3)} bits / ${f(T, 3)} s = ${f(tput / 1e6, 3)} Mbps` },
          { title: 'Link usage', expr: `${f(tput / 1e6, 3)} / ${f(v.R)} × 100 = ${f(sat, 2)}%` },
        ],
        answer: `≈ ${f(tput / 1e6, 3)} Mbps (${f(sat, 2)}% of ${f(v.R)} Mbps)`,
      };
    },
    mistakes: ['Ignoring the window and assuming line rate.', 'Using one-way delay instead of RTT.', 'Mixing bits and bytes in the throughput calculation.'],
  },

  // ============================================================ NLP
  {
    id: 'nlp-tfidf',
    subjectId: 'nlp',
    unitId: 'nlp-u2',
    topicId: 'nlp-u2-t5',
    category: 'TF-IDF',
    problemTemplate:
      'A term appears tf = {tf} times in a document. The corpus has N = {N} documents and the term appears in df = {df} of them. Compute TF-IDF using idf = log(N/df).',
    params: [p('tf', 'term frequency tf', 3, [1, 20]), p('N', 'documents N', 1000, [10, 10000]), p('df', 'document frequency df', 10, [1, 500])],
    required: ['IDF', 'TF-IDF weight'],
    formula: 'idf = log10(N/df); weight = tf × idf',
    why: 'IDF rewards terms that are rare across the corpus; multiplying by local frequency keeps terms that are also important in this document.',
    solve: (v) => {
      const df = Math.min(v.df, v.N);
      const idf = Math.log10(v.N / df);
      const w = v.tf * idf;
      return {
        steps: [
          { title: 'Ratio', expr: `N/df = ${v.N}/${df} = ${f(v.N / df, 3)}` },
          { title: 'IDF', expr: `log10(${f(v.N / df, 3)}) = ${f(idf, 4)}` },
          { title: 'Weight', expr: `tf × idf = ${v.tf} × ${f(idf, 4)} = ${f(w, 4)}` },
        ],
        answer: `IDF = ${f(idf, 4)}, TF-IDF = ${f(w, 4)}`,
      };
    },
    mistakes: ['Using natural log when the question specifies log10.', 'Inverting the ratio as df/N.', 'Adding tf and idf instead of multiplying.'],
  },
  {
    id: 'nlp-bigram',
    subjectId: 'nlp',
    unitId: 'nlp-u2',
    topicId: 'nlp-u2-t9',
    category: 'N-gram probability',
    problemTemplate:
      'In a corpus, the word "the" occurs {c1} times and the bigram "the cat" occurs {c2} times. Compute P(cat | the) by maximum likelihood, and the probability of the sentence "the cat" given P(the) = {p1}.',
    params: [p('c1', 'count(the)', 500, [50, 5000]), p('c2', 'count(the cat)', 20, [1, 500]), p('p1', 'P(the)', 0.05, [0.001, 0.2], '', 3)],
    required: ['P(cat|the)', 'P(the cat)'],
    formula: 'P(cat|the) = C(the cat)/C(the);  P(the cat) = P(the) × P(cat|the)',
    why: 'The bigram MLE is a conditional relative frequency; the chain rule turns conditionals into a sentence probability.',
    solve: (v) => {
      const c2 = Math.min(v.c2, v.c1);
      const cond = c2 / v.c1;
      const joint = v.p1 * cond;
      return {
        steps: [
          { title: 'Conditional MLE', expr: `P(cat|the) = ${c2}/${v.c1} = ${f(cond, 5)}` },
          { title: 'Chain rule', expr: `P(the cat) = ${f(v.p1, 3)} × ${f(cond, 5)}` },
          { title: 'Evaluate', expr: `= ${joint.toExponential(3)}` },
        ],
        answer: `P(cat|the) = ${f(cond, 4)}, P(the cat) = ${joint.toExponential(3)}`,
      };
    },
    mistakes: ['Dividing by the total token count instead of the context count.', 'Multiplying the wrong direction (P(the|cat)).', 'Forgetting the chain rule for sentence probability.'],
  },
  {
    id: 'nlp-laplace',
    subjectId: 'nlp',
    unitId: 'nlp-u2',
    topicId: 'nlp-u2-t11',
    category: 'Smoothing',
    problemTemplate:
      'With vocabulary size V = {V}, the context occurs {c} times and the bigram (context, word) occurs {cw} times. Compute the unsmoothed MLE and the add-one (Laplace) estimate.',
    params: [p('V', 'vocabulary size', 1000, [10, 50000]), p('c', 'context count', 40, [1, 1000]), p('cw', 'bigram count', 0, [0, 40])],
    required: ['MLE estimate', 'Laplace estimate'],
    formula: 'MLE = c(w,h)/c(h);  Laplace = (c(w,h)+1)/(c(h)+V)',
    why: 'Add-one smoothing reserves probability mass for unseen events so no n-gram gets probability zero.',
    solve: (v) => {
      const cw = Math.min(v.cw, v.c);
      const mle = cw / v.c;
      const lap = (cw + 1) / (v.c + v.V);
      return {
        steps: [
          { title: 'MLE', expr: `${cw}/${v.c} = ${f(mle, 5)}` },
          { title: 'Numerator', expr: `${cw} + 1 = ${cw + 1}` },
          { title: 'Denominator', expr: `${v.c} + ${v.V} = ${v.c + v.V}` },
          { title: 'Laplace', expr: `${cw + 1}/${v.c + v.V} = ${lap.toExponential(3)}` },
        ],
        answer: `MLE = ${f(mle, 4)}, Laplace = ${lap.toExponential(3)}`,
      };
    },
    mistakes: ['Adding 1 to the denominator only.', 'Adding V to the numerator.', 'Claiming MLE is "wrong" — it is unbiased but zero for unseen events.'],
  },
  {
    id: 'nlp-nb',
    subjectId: 'nlp',
    unitId: 'nlp-u2',
    topicId: 'nlp-u2-t7',
    category: 'Naive Bayes',
    problemTemplate:
      'Two classes have priors P(spam) = {ps} and P(ham) = {ph}. The word "free" has likelihoods P(free|spam) = {ls} and P(free|ham) = {lh}. Classify a document containing only "free".',
    params: [p('ps', 'P(spam)', 0.4, [0.1, 0.9], '', 2), p('ph', 'P(ham)', 0.6, [0.1, 0.9], '', 2), p('ls', 'P(free|spam)', 0.3, [0.01, 0.9], '', 2), p('lh', 'P(free|ham)', 0.05, [0.01, 0.5], '', 3)],
    required: ['Posterior scores', 'Predicted class'],
    formula: 'P(c|d) ∝ P(c) × Π P(wᵢ|c); compare in log space',
    why: 'Naive Bayes multiplies class priors by conditionally independent word likelihoods; the largest score wins.',
    solve: (v) => {
      const s = v.ps * v.ls;
      const h = v.ph * v.lh;
      const cls = s >= h ? 'spam' : 'ham';
      return {
        steps: [
          { title: 'Spam score', expr: `${f(v.ps)} × ${f(v.ls, 2)} = ${f(s, 5)}` },
          { title: 'Ham score', expr: `${f(v.ph)} × ${f(v.lh, 3)} = ${f(h, 5)}` },
          { title: 'Normalise (optional)', expr: `P(spam|free) = ${f(s, 5)}/(${f(s, 5)}+${f(h, 5)}) = ${f(s / (s + h), 4)}` },
          { title: 'Decision', expr: `argmax = ${cls}` },
        ],
        answer: `Predicted ${cls} (spam score ${f(s, 5)} vs ham ${f(h, 5)})`,
      };
    },
    mistakes: ['Ignoring the class priors.', 'Normalising by dividing by the wrong total.', 'Adding likelihoods instead of multiplying them.'],
  },
  {
    id: 'nlp-cosine',
    subjectId: 'nlp',
    unitId: 'nlp-u3',
    topicId: 'nlp-u3-t1',
    category: 'Word vectors',
    problemTemplate: 'Two 2-dimensional word vectors are a = ({a1}, {a2}) and b = ({b1}, {b2}). Compute their dot product and cosine similarity.',
    params: [p('a1', 'a1', 1, [-5, 5], '', 2), p('a2', 'a2', 2, [-5, 5], '', 2), p('b1', 'b1', 2, [-5, 5], '', 2), p('b2', 'b2', 1, [-5, 5], '', 2)],
    required: ['Dot product', 'Cosine similarity'],
    formula: 'a·b = a1b1 + a2b2;  cos = (a·b)/(‖a‖‖b‖)',
    why: 'Cosine similarity compares direction only, so vectors of different magnitude (word frequency) still match semantically.',
    solve: (v) => {
      const dot = v.a1 * v.b1 + v.a2 * v.b2;
      const na = Math.hypot(v.a1, v.a2);
      const nb = Math.hypot(v.b1, v.b2);
      const cos = na && nb ? dot / (na * nb) : 0;
      return {
        steps: [
          { title: 'Dot product', expr: `${f(v.a1)}×${f(v.b1)} + ${f(v.a2)}×${f(v.b2)} = ${f(dot, 3)}` },
          { title: 'Norm a', expr: `√(${f(v.a1)}² + ${f(v.a2)}²) = ${f(na, 4)}` },
          { title: 'Norm b', expr: `√(${f(v.b1)}² + ${f(v.b2)}²) = ${f(nb, 4)}` },
          { title: 'Cosine', expr: `${f(dot, 3)} / (${f(na, 4)} × ${f(nb, 4)}) = ${f(cos, 4)}` },
        ],
        answer: `a·b = ${f(dot, 3)}, cos = ${f(cos, 4)}`,
      };
    },
    mistakes: ['Forgetting to divide by both norms.', 'Using Euclidean distance when cosine is asked.', 'Assuming a large dot product always means high similarity (magnitude matters).'],
  },
  {
    id: 'nlp-onehot',
    subjectId: 'nlp',
    unitId: 'nlp-u2',
    topicId: 'nlp-u2-t1',
    category: 'Encoding',
    problemTemplate:
      'A vocabulary of V = {V} words is one-hot encoded. State the vector dimension, the number of non-zero entries and the dot product between two different word vectors.',
    params: [p('V', 'vocabulary size', 5000, [10, 50000])],
    required: ['Vector dimension', 'Non-zero entries', 'Dot product of distinct words'],
    formula: 'dim = |V|; non-zeros = 1; u·v = 0 for u ≠ v',
    why: 'One-hot vectors place each word on its own axis, so distinct words are orthogonal and carry no similarity information.',
    solve: (v) => ({
      steps: [
        { title: 'Dimension', expr: `one vector per vocabulary entry → ${v.V} dimensions` },
        { title: 'Sparsity', expr: `1 non-zero entry, ${v.V - 1} zeros (${f((1 / v.V) * 100, 3)}% dense)` },
        { title: 'Similarity', expr: 'u·v = 0 for u ≠ v → orthogonal, cosine similarity 0' },
      ],
      answer: `dim = ${v.V}, 1 non-zero, dot product = 0`,
    }),
    mistakes: ['Claiming similar words get similar one-hot vectors.', 'Reporting the dimension as the number of documents.', 'Assuming one-hot encodes frequency.'],
  },

  // ============================================================ CLOUD
  {
    id: 'cloud-util',
    subjectId: 'cloud',
    unitId: 'cloud-u5',
    topicId: 'cloud-u5-t3',
    category: 'Resource utilization',
    problemTemplate:
      'A fleet has {N} virtual machines, each provisioned with {C} vCPUs. Average busy vCPU count per VM is {B}. Compute the CPU utilisation and the number of VMs needed to consolidate the load at 70% target utilisation.',
    params: [p('N', 'VMs', 20, [2, 200]), p('C', 'vCPUs per VM', 8, [2, 64]), p('B', 'busy vCPUs per VM', 1.6, [0.1, 8], '', 2)],
    required: ['Current utilisation', 'VMs needed at 70% target'],
    formula: 'U = Σbusy / Σprovisioned;  N_target = totalBusy / (0.7 × C)',
    why: 'Utilisation compares used to provisioned capacity; consolidating raises utilisation and cuts cost while keeping headroom.',
    solve: (v) => {
      const totalBusy = v.N * v.B;
      const totalCap = v.N * v.C;
      const U = totalBusy / totalCap;
      const need = Math.ceil(totalBusy / (0.7 * v.C));
      return {
        steps: [
          { title: 'Busy vCPUs', expr: `${v.N} × ${f(v.B, 2)} = ${f(totalBusy, 2)}` },
          { title: 'Provisioned vCPUs', expr: `${v.N} × ${f(v.C)} = ${f(totalCap)}` },
          { title: 'Utilisation', expr: `${f(totalBusy, 2)} / ${f(totalCap)} = ${f(U * 100, 2)}%` },
          { title: 'Consolidated fleet', expr: `ceil(${f(totalBusy, 2)} / (0.7 × ${v.C})) = ${need} VMs` },
        ],
        answer: `U = ${f(U * 100, 2)}%, consolidation target = ${need} VMs`,
      };
    },
    mistakes: ['Averaging per-VM percentages instead of summing capacity.', 'Forgetting to round up VM counts.', 'Treating 70% target as 70 vCPUs.'],
  },
  {
    id: 'cloud-lb',
    subjectId: 'cloud',
    unitId: 'cloud-u5',
    topicId: 'cloud-u5-t2',
    category: 'Load balancing',
    problemTemplate:
      'A service receives {R} requests per second at peak. Each backend handles {C} rps at 60% CPU. Compute the minimum number of backends and the number with N+1 redundancy.',
    params: [p('R', 'peak rps', 12000, [100, 100000]), p('C', 'capacity per backend', 2000, [50, 20000], 'rps')],
    required: ['Minimum backends', 'Backends with N+1'],
    formula: 'N = ceil(R / C);  N+1 redundancy = N + 1',
    why: 'Each backend has a hard throughput ceiling; one spare keeps the service available during a single failure or deploy.',
    solve: (v) => {
      const N = Math.ceil(v.R / v.C);
      return {
        steps: [
          { title: 'Per-backend demand', expr: `${f(v.R)} / ${f(v.C)} = ${f(v.R / v.C, 2)}` },
          { title: 'Round up', expr: `ceil(${f(v.R / v.C, 2)}) = ${N} backends` },
          { title: 'N+1', expr: `${N} + 1 = ${N + 1} backends` },
          { title: 'Per-node load', expr: `with ${N + 1} nodes: ${f(v.R / (N + 1), 1)} rps each` },
        ],
        answer: `N = ${N}, deploy ${N + 1} for N+1 redundancy`,
      };
    },
    mistakes: ['Rounding down and overloading backends.', 'Ignoring headroom during rolling deploys.', 'Dividing by 60% twice.'],
  },
  {
    id: 'cloud-avail',
    subjectId: 'cloud',
    unitId: 'cloud-u3',
    topicId: 'cloud-u3-t2',
    category: 'Availability',
    problemTemplate:
      'A service targets {A}% availability. Compute the allowed downtime per month (30 days). Then compute the availability of two such components in series and in parallel.',
    params: [p('A', 'target availability %', 99.9, [99, 99.999], '%', 3)],
    required: ['Monthly downtime budget', 'Series availability', 'Parallel availability'],
    formula: 'downtime = (1 − A/100) × 43,200 min; series = A₁·A₂; parallel = 1 − (1−A₁)(1−A₂)',
    why: 'Availability composes multiplicatively in series and improves with redundancy in parallel.',
    solve: (v) => {
      const a = v.A / 100;
      const down = (1 - a) * 43200;
      const series = a * a;
      const par = 1 - (1 - a) ** 2;
      return {
        steps: [
          { title: 'Minutes per month', expr: '30 × 24 × 60 = 43,200 min' },
          { title: 'Downtime budget', expr: `(1 − ${f(a, 5)}) × 43,200 = ${f(down, 2)} min` },
          { title: 'Two in series', expr: `${f(a, 5)} × ${f(a, 5)} = ${f(series * 100, 4)}%` },
          { title: 'Two in parallel', expr: `1 − (1−${f(a, 5)})² = ${f(par * 100, 5)}%` },
        ],
        answer: `${f(down, 2)} min/month; series ${f(series * 100, 4)}%, parallel ${f(par * 100, 5)}%`,
      };
    },
    mistakes: ['Using 31 days for the month.', 'Adding availabilities in series instead of multiplying.', 'Forgetting that redundancy raises availability above the single-component value.'],
  },
  {
    id: 'cloud-cost',
    subjectId: 'cloud',
    unitId: 'cloud-u1',
    topicId: 'cloud-u1-t1',
    category: 'Capacity & cost',
    problemTemplate:
      'A workload needs {N} instances of {C} vCPUs for {H} hours per day for {D} days. Compute total vCPU-hours and the cost at $0.04 per vCPU-hour.',
    params: [p('N', 'instances', 8, [1, 100]), p('C', 'vCPUs each', 4, [1, 64]), p('H', 'hours per day', 10, [1, 24]), p('D', 'days', 30, [1, 90])],
    required: ['Total vCPU-hours', 'Total cost'],
    formula: 'vCPU-hours = N × C × H × D;  cost = vCPU-hours × rate',
    why: 'Cloud billing is metered by resource-time, so cost scales linearly with instances, size, hours and days.',
    solve: (v) => {
      const hours = v.N * v.C * v.H * v.D;
      const cost = hours * 0.04;
      const alwaysOn = v.N * v.C * 24 * v.D * 0.04;
      return {
        steps: [
          { title: 'Daily vCPU-hours', expr: `${v.N} × ${v.C} × ${f(v.H)} = ${f(v.N * v.C * v.H)}` },
          { title: 'Total', expr: `${f(v.N * v.C * v.H)} × ${f(v.D)} = ${f(hours)} vCPU-hours` },
          { title: 'Cost', expr: `${f(hours)} × $0.04 = $${f(cost, 2)}` },
          { title: 'Saving vs 24×7', expr: `24×7 would cost $${f(alwaysOn, 2)} → saving $${f(alwaysOn - cost, 2)}` },
        ],
        answer: `${f(hours)} vCPU-hours, $${f(cost, 2)}`,
      };
    },
    mistakes: ['Forgetting to multiply by vCPUs per instance.', 'Mixing hourly and monthly rates.', 'Ignoring idle hours when comparing with on-demand 24×7 cost.'],
  },
  {
    id: 'cloud-autoscale',
    subjectId: 'cloud',
    unitId: 'cloud-u5',
    topicId: 'cloud-u5-t3',
    category: 'Autoscaling',
    problemTemplate:
      'An autoscaler targets {T}% average CPU. Current fleet is {N} instances at {U}% average CPU. Compute the instance count that achieves the target.',
    params: [p('T', 'target utilisation %', 60, [30, 85]), p('N', 'current instances', 10, [2, 100]), p('U', 'current utilisation %', 90, [10, 99])],
    required: ['Instances needed at target'],
    formula: 'N_target = ceil(N × U / T)',
    why: 'Total work stays constant, so instances × utilisation is invariant; dividing by the target utilisation gives the required fleet size.',
    solve: (v) => {
      const work = v.N * v.U;
      const need = Math.ceil(work / v.T);
      return {
        steps: [
          { title: 'Total work units', expr: `${v.N} × ${f(v.U)}% = ${f(work)}` },
          { title: 'Divide by target', expr: `${f(work)} / ${f(v.T)} = ${f(work / v.T, 2)}` },
          { title: 'Round up', expr: `ceil(...) = ${need} instances` },
          { title: 'Check', expr: `${f(work)} / ${need} = ${f(work / need, 2)}% ≈ target ${f(v.T)}%` },
        ],
        answer: `${need} instances`,
      };
    },
    mistakes: ['Applying the target as a percentage of the current count.', 'Rounding down, which leaves CPU above target.', 'Ignoring scale-in cooldowns that would cause thrash.'],
  },
];

export const NUMERICALS_BY_SUBJECT = NUMERICALS.reduce(
  (acc, n) => {
    (acc[n.subjectId] ??= []).push(n);
    return acc;
  },
  {} as Record<string, NumericalSpec[]>,
);
