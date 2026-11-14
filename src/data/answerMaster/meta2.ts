// Answer Master — questions 61–120.

export const META_2: Record<string, { topicId: string; focus: string }> = {
  '61': {
    topicId: 'dl-u2-t7',
    focus:
      'ReLU is max(0, z): it is cheap, does not saturate for positive inputs, and has gradient 1 there and 0 for negative inputs, which is why it became the default hidden-layer activation.',
  },
  '62': {
    topicId: 'dl-u2-t7',
    focus:
      'Leaky ReLU is max(αz, z) with a small α (typically 0.01), so negative inputs keep a small nonzero gradient instead of dying completely.',
  },
  '63': {
    topicId: 'dl-u2-t7',
    focus:
      'Sigmoid and tanh saturate and are expensive, tanh is zero-centred; ReLU is fast and non-saturating but can die; Leaky ReLU keeps a negative slope to avoid dead units.',
  },
  '64': {
    topicId: 'dl-u4-t11',
    focus:
      'The vanishing-gradient problem is the exponential shrinkage of back-propagated gradients through saturating activations or many layers, so early layers learn almost nothing.',
  },
  '65': {
    topicId: 'dl-u4-t11',
    focus:
      'ReLU has derivative exactly 1 for positive pre-activations, so gradients do not shrink multiplicatively the way σ′ ≤ 0.25 does; it also computes faster and induces sparse activations.',
  },
  '66': {
    topicId: 'dl-u2-t7',
    focus:
      'A ReLU unit dies when its pre-activation stays negative for all inputs, making its gradient permanently zero and its weights unrecoverable without a different activation or a positive bias shift.',
  },
  '67': {
    topicId: 'dl-u2-t7',
    focus:
      'Sigmoid suits binary output layers that need probabilities and gate-like units, not deep hidden stacks where its saturation kills gradients.',
  },
  '68': {
    topicId: 'dl-u2-t7',
    focus:
      'Softmax converts a vector of logits into a normalised probability distribution, so multiclass outputs are positive, sum to one and can be scored by categorical cross-entropy.',
  },
  '69': {
    topicId: 'dl-u2-t7',
    focus: 'σ(−2) = 0.1192, σ(0) = 0.5 and σ(2) = 0.8808.',
  },
  '70': {
    topicId: 'dl-u2-t7',
    focus: 'σ′(0) = 0.25 and σ′(±2) = 0.1050, showing how the derivative shrinks away from the origin.',
  },
  '71': {
    topicId: 'dl-u2-t7',
    focus: 'ReLU maps the vector to [0, 0, 0, 2, 4]: everything negative is clipped to zero.',
  },
  '72': {
    topicId: 'dl-u2-t7',
    focus: 'With slope 0.01 the outputs are [−0.03, −0.01, 0, 2].',
  },
  '73': {
    topicId: 'dl-u2-t7',
    focus: 'The softmax of [2,1,0] is [0.6652, 0.2447, 0.0900], and the three values sum to 1.',
  },
  '74': {
    topicId: 'dl-u3-t4',
    focus:
      'A loss function maps a prediction and the target to a scalar penalty that measures how wrong the model is on one example; training minimises its average.',
  },
  '75': {
    topicId: 'dl-u3-t4',
    focus:
      'The loss defines the optimisation objective: its gradient with respect to the parameters is what backpropagation computes and the optimiser descends.',
  },
  '76': {
    topicId: 'dl-u3-t4',
    focus:
      'Mean squared error is L = (1/n)Σ(yᵢ − ŷᵢ)²; it penalises large errors quadratically and is the standard regression loss.',
  },
  '77': {
    topicId: 'dl-u3-t4',
    focus:
      'Binary cross-entropy is L = −[y log ŷ + (1 − y) log(1 − ŷ)], the negative log-likelihood of a Bernoulli target with sigmoid output.',
  },
  '78': {
    topicId: 'dl-u3-t4',
    focus:
      'Categorical cross-entropy is L = −Σ yᵢ log ŷᵢ, which for one-hot targets reduces to −log ŷ of the true class.',
  },
  '79': {
    topicId: 'dl-u3-t4',
    focus:
      'Cross-entropy penalises confident wrong predictions logarithmically and, with sigmoid/softmax, has a clean gradient ŷ − y; MSE saturates and learns slowly on classification.',
  },
  '80': {
    topicId: 'dl-u3-t4',
    focus:
      'Binary classification uses binary cross-entropy with a sigmoid output, multiclass uses categorical cross-entropy with softmax, and regression uses MSE or MAE.',
  },
  '81': {
    topicId: 'dl-u3-t4',
    focus:
      'Logits are the raw layer outputs; sigmoid or softmax turns them into probabilities, and cross-entropy scores those probabilities, so the gradient at the logits is simply ŷ − y.',
  },
  '82': {
    topicId: 'dl-u3-t4',
    focus:
      'Loss is the per-example penalty, while the cost is the aggregate (mean or sum) over a batch or the whole dataset that the optimiser minimises.',
  },
  '83': {
    topicId: 'dl-u3-t4',
    focus:
      'Empirical risk minimisation means choosing parameters that minimise the average loss on the observed training sample as a proxy for the true expected risk.',
  },
  '84': {
    topicId: 'dl-u3-t4',
    focus: 'Squared errors are 0.04, 0.04 and 0.16, so MSE = 0.24/3 = 0.08.',
  },
  '85': {
    topicId: 'dl-u3-t4',
    focus: 'BCE = −ln(0.8) = 0.2231.',
  },
  '86': {
    topicId: 'dl-u3-t4',
    focus:
      'For y = 0, ŷ = 0.2 gives −ln(0.8) = 0.2231, while ŷ = 0.8 gives −ln(0.2) = 1.6094: a confident wrong prediction is punished roughly seven times more.',
  },
  '87': {
    topicId: 'dl-u3-t4',
    focus: 'The true class is index 2, so CE = −ln(0.7) = 0.3567.',
  },
  '88': {
    topicId: 'dl-u2-t5',
    focus:
      'Forward propagation evaluates the network layer by layer, storing each weighted sum and activation so the output and the backward pass can use them.',
  },
  '89': {
    topicId: 'dl-u2-t5',
    focus:
      'For one hidden layer: z1 = W1x + b1, a1 = f1(z1), z2 = W2a1 + b2 and ŷ = f2(z2), with the loss computed from ŷ and y.',
  },
  '90': {
    topicId: 'dl-u2-t2',
    focus:
      'Weights scale how strongly one unit influences another and carry the learned pattern; biases shift each unit’s activation threshold independently of the input.',
  },
  '91': {
    topicId: 'dl-u2-t13',
    focus:
      'Each layer applies an affine transform then a nonlinearity, so the representation is rotated, scaled, shifted and folded until classes become separable at the output.',
  },
  '92': {
    topicId: 'dl-u2-t5',
    focus:
      'A logit is the unnormalised real-valued output of the last linear layer, before sigmoid or softmax converts it into a probability.',
  },
  '93': {
    topicId: 'dl-u2-t2',
    focus:
      'The weighted sum z = wᵀx + b is the neuron’s linear evidence; the activated output a = f(z) is that evidence after the nonlinearity, and it is what the next layer receives.',
  },
  '94': {
    topicId: 'dl-u2-t8',
    focus:
      'z = 1, a = σ(1) = 0.7311, L = 0.0723, ∂L/∂a = −0.5379, ∂a/∂z = 0.1966, ∂z/∂w = 2, so ∂L/∂w = −0.2115.',
  },
  '95': {
    topicId: 'dl-u2-t8',
    focus:
      'a = 0.5, z = 0.5, L = 1.125; the ReLU passes the gradient, so ∂L/∂z = −1.5, ∂L/∂w1 = −3, ∂L/∂w2 = −4.5 and ∂L/∂b = −1.5.',
  },
  '96': {
    topicId: 'dl-u2-t8',
    focus:
      'u = 4, v = 16, L = 48; dL/dx = (dL/dv)(dv/du)(du/dx) = 3 × 8 × 2 = 48.',
  },
  '97': {
    topicId: 'dl-u2-t8',
    focus:
      'a = 5, b = 6, c = 25, L = 31; ∂L/∂x1 = 2a + x2 = 13 and ∂L/∂x2 = 2a + x1 = 12.',
  },
  '98': {
    topicId: 'dl-u2-t8',
    focus:
      'a = −5, so ReLU outputs 0 and blocks the gradient: ∂L/∂w = 0 even though the loss is 4 — the unit is inactive for this input.',
  },
  '99': {
    topicId: 'dl-u2-t5',
    focus:
      'Backpropagation computes the gradient of the loss with respect to every parameter by applying the chain rule backwards through the network, reusing intermediate gradients.',
  },
  '100': {
    topicId: 'dl-u2-t5',
    focus:
      'The loss depends on the parameters only through nested functions, so the chain rule is what decomposes that dependency into local derivatives multiplied along each path.',
  },
  '101': {
    topicId: 'dl-u2-t8',
    focus:
      'In the forward pass each node computes and stores its value; in the backward pass each node receives the upstream gradient, multiplies it by its local derivative and passes the result to its inputs.',
  },
  '102': {
    topicId: 'dl-u2-t5',
    focus:
      'For a = f(wx + b) and loss L, ∂L/∂w = (∂L/∂a) f′(z) x and ∂L/∂b = (∂L/∂a) f′(z), derived by chaining loss → activation → weighted sum → weight.',
  },
  '103': {
    topicId: 'dl-u2-t5',
    focus:
      'With z1 = W1x + b1, a1 = f(z1), z2 = W2a1 + b2: δ2 = ∂L/∂z2, δ1 = (W2ᵀδ2) ⊙ f′(z1), then ∂L/∂W2 = δ2a1ᵀ, ∂L/∂b2 = δ2, ∂L/∂W1 = δ1xᵀ, ∂L/∂b1 = δ1.',
  },
  '104': {
    topicId: 'dl-u2-t5',
    focus:
      'A local gradient is one node’s derivative with respect to its own input; the global gradient is the product of all downstream local gradients, i.e. the full derivative of the loss.',
  },
  '105': {
    topicId: 'dl-u4-t11',
    focus:
      'Gradient flow is the path and magnitude of the error signal as it travels back through layers; healthy flow keeps magnitudes stable, while repeated multiplication drives them to zero or infinity.',
  },
  '106': {
    topicId: 'dl-u4-t10',
    focus:
      'Exploding gradients are the opposite failure: repeated multiplication by large weights or derivatives makes the backward signal grow exponentially, causing unstable or NaN updates.',
  },
  '107': {
    topicId: 'dl-u2-t7',
    focus:
      'The activation’s derivative is a factor in every backward step: saturating functions shrink it (≤ 0.25 for sigmoid), ReLU keeps it at 1 or 0, and unbounded functions can amplify it.',
  },
  '108': {
    topicId: 'dl-u4-t2',
    focus:
      'The learning rate scales each gradient step: with a good rate the loss decreases smoothly, too small wastes time, too large overshoots and diverges.',
  },
  '109': {
    topicId: 'dl-u2-t8',
    focus:
      'z = 0.9, ŷ = 0.7109, L = 0.3412; ∂L/∂z = ŷ − y = −0.2891, ∂L/∂w = −0.5781 and ∂L/∂b = −0.2891.',
  },
  '110': {
    topicId: 'dl-u2-t8',
    focus:
      'No numerical values are given, so the exact gradient cannot be computed; the method is δ2 = (ŷ − y), ∂L/∂W1 = ((W2ᵀδ2) ⊙ h ⊙ (1 − h)) xᵀ, and the missing values must be supplied.',
  },
  '111': {
    topicId: 'dl-u4-t1',
    focus:
      'Optimisation is the search for parameters that minimise the loss; it is necessary because the network’s weights start random and only training can discover the values that fit the data.',
  },
  '112': {
    topicId: 'dl-u4-t2',
    focus:
      'Gradient descent repeatedly steps opposite the gradient: w ← w − η∇L(w), with η the learning rate and the gradient computed over the chosen batch.',
  },
  '113': {
    topicId: 'dl-u4-t2',
    focus:
      'Batch gradient descent computes the gradient over the entire training set before each update, giving a stable direction but expensive steps and slow progress on large data.',
  },
  '114': {
    topicId: 'dl-u4-t2',
    focus:
      'Stochastic gradient descent updates after every single example, so steps are cheap and noisy, and the noise can help escape shallow regions but slows final convergence.',
  },
  '115': {
    topicId: 'dl-u4-t2',
    focus:
      'Mini-batch gradient descent averages the gradient over a small batch (typically 32–512), balancing gradient quality, hardware parallelism and step frequency.',
  },
  '116': {
    topicId: 'dl-u4-t2',
    focus:
      'Batch GD is accurate but slow per step, SGD is fast but noisy, and mini-batch GD is the practical compromise that also exploits vectorised hardware.',
  },
  '117': {
    topicId: 'dl-u4-t1',
    focus:
      'The learning rate η is the step size multiplying the gradient; it controls how far each update moves the parameters and therefore stability and speed.',
  },
  '118': {
    topicId: 'dl-u4-t2',
    focus:
      'Too small and training crawls or stalls in flat regions; too large and the parameters oscillate, overshoot minima or diverge to NaN.',
  },
  '119': {
    topicId: 'dl-u4-t3',
    focus:
      'Momentum accumulates an exponentially weighted average of past gradients, v ← βv + g and w ← w − ηv, so consistent directions accelerate and zig-zag cancels.',
  },
  '120': {
    topicId: 'dl-u4-t3',
    focus:
      'Think of a ball rolling downhill: it builds speed along a consistent slope and is not stopped by small bumps, which smooths oscillation across a narrow valley.',
  },
};
