// Answer Master — questions 121–180.

export const META_3: Record<string, { topicId: string; focus: string }> = {
  '121': {
    topicId: 'dl-u4-t5',
    focus:
      'AdaGrad divides each parameter’s step by the square root of its accumulated squared gradients, so frequently updated parameters slow down and rare ones keep learning.',
  },
  '122': {
    topicId: 'dl-u4-t7',
    focus:
      'RMSProp fixes AdaGrad’s shrinking step by keeping an exponentially decaying average of squared gradients and dividing by its square root.',
  },
  '123': {
    topicId: 'dl-u4-t8',
    focus:
      'Adam combines momentum on the gradient with RMSProp-style scaling of squared gradients, plus bias correction for the first steps.',
  },
  '124': {
    topicId: 'dl-u4-t8',
    focus:
      'SGD is simple and general, Momentum adds inertia, RMSProp adapts per-parameter step sizes, and Adam combines both with bias correction — at the cost of more memory and hyperparameters.',
  },
  '125': {
    topicId: 'dl-u4-t5',
    focus:
      'Adaptive methods (AdaGrad, RMSProp, Adam) set a different effective learning rate per parameter from gradient history instead of one global scalar.',
  },
  '126': {
    topicId: 'dl-u4-t1',
    focus:
      'Learning-rate scheduling changes η during training — usually large early for fast progress and small late for stable convergence.',
  },
  '127': {
    topicId: 'dl-u4-t1',
    focus:
      'Exponential decay multiplies the rate by γ every epoch: η_t = η₀γᵗ with γ < 1, giving smooth predictable annealing.',
  },
  '128': {
    topicId: 'dl-u4-t1',
    focus:
      'Cosine decay follows η_t = η_min + ½(η_max − η_min)(1 + cos(πt/T)), staying high initially and annealing gently, often with warm restarts.',
  },
  '129': {
    topicId: 'dl-u4-t1',
    focus:
      'A local minimum is a parameter setting lower than all nearby points but not necessarily the global lowest loss.',
  },
  '130': {
    topicId: 'dl-u4-t1',
    focus:
      'A saddle point is stationary but not extremal: the loss curves upward in some directions and downward in others, so the gradient is zero while progress is still possible.',
  },
  '131': {
    topicId: 'dl-u4-t1',
    focus:
      'In high dimensions random critical points are overwhelmingly saddles rather than local minima, so training stalls at plateaus and saddle neighbourhoods, not at traps.',
  },
  '132': {
    topicId: 'dl-u4-t1',
    focus:
      'The loss landscape is the surface of loss values over parameter space; its curvature, valleys and plateaus determine how easily an optimiser can descend.',
  },
  '133': {
    topicId: 'dl-u4-t2',
    focus:
      'The iterates are 1 → 1.8 → 2.44 → 2.952 → 3.3616 → 3.68928, converging toward the minimum at w = 5 without overshooting.',
  },
  '134': {
    topicId: 'dl-u4-t2',
    focus:
      'f′(w) = 6w − 4, giving the iterates 2 → 1.6 → 1.32 → 1.124 toward the minimum at w = 2/3.',
  },
  '135': {
    topicId: 'dl-u4-t2',
    focus:
      'The iterates are (4,3) → (3.2,1.8) → (2.56,1.08) → (2.048,0.648), with the w2 coordinate falling faster because its gradient is twice as steep.',
  },
  '136': {
    topicId: 'dl-u4-t3',
    focus:
      'Using v_t = βv_{t−1} + g_t, the new velocity is 5.8 and the update is Δw = −ηv_t = −0.58 (the EMA convention would give v_t = 2.2 and Δw = −0.22).',
  },
  '137': {
    topicId: 'dl-u4-t8',
    focus:
      'With t = 1: m = 0.13, v = 0.05011, m̂ = 1.3, v̂ = 50.11, so Δw = 0.1 × 1.3/(√50.11 + 1e−8) ≈ 0.01836.',
  },
  '138': {
    topicId: 'dl-u2-t10',
    focus:
      'Regularisation is any constraint or penalty added to training that discourages memorisation and improves generalisation to unseen data.',
  },
  '139': {
    topicId: 'dl-u2-t10',
    focus:
      'Networks have far more parameters than constraints in the data, so without a penalty they fit noise; regularisation narrows the hypothesis space toward simpler, smoother functions.',
  },
  '140': {
    topicId: 'dl-u2-t10',
    focus:
      'L1 adds λΣ|w| to the loss, penalising the absolute size of weights and driving many of them exactly to zero.',
  },
  '141': {
    topicId: 'dl-u2-t10',
    focus:
      'L2 adds (λ/2)Σw² to the loss, shrinking all weights smoothly toward zero without eliminating them entirely.',
  },
  '142': {
    topicId: 'dl-u2-t10',
    focus:
      'L1 produces sparse solutions and is robust to outliers, while L2 produces small but dense weights, is smooth and is the default weight-decay penalty.',
  },
  '143': {
    topicId: 'dl-u2-t10',
    focus:
      'The L1 penalty has a constant gradient ±λ, so even tiny weights receive a push toward exactly zero, and its diamond-shaped constraint region favours axes-aligned sparse solutions.',
  },
  '144': {
    topicId: 'dl-u2-t10',
    focus:
      'Weight decay multiplies every weight by (1 − ηλ) on each step, an explicit shrinking that implements L2 regularisation in the update rule.',
  },
  '145': {
    topicId: 'dl-u2-t10',
    focus:
      'In adaptive optimisers, adding λw to the gradient is not the same as decay because the penalty is scaled by the adaptivity; decoupled weight decay (AdamW) applies the shrink directly.',
  },
  '146': {
    topicId: 'dl-u2-t10',
    focus:
      'Early stopping monitors validation loss and halts training at its minimum, keeping the parameters from before they began to overfit.',
  },
  '147': {
    topicId: 'dl-u2-t10',
    focus:
      'Stopping early limits how far the parameters can travel into low-training-loss, high-variance regions, which is equivalent to constraining the effective capacity of the model.',
  },
  '148': {
    topicId: 'dl-u2-t10',
    focus:
      'Data augmentation creates label-preserving variations of each training example (flips, crops, noise), enlarging the effective dataset and teaching invariance.',
  },
  '149': {
    topicId: 'dl-u2-t11',
    focus:
      'Dropout randomly zeroes a fraction p of units during each training step, forcing the network to work without any single unit.',
  },
  '150': {
    topicId: 'dl-u2-t11',
    focus:
      'Dropping units prevents co-adaptation and injects noise, so the model cannot rely on specific neurons and behaves like an ensemble of thinned subnetworks.',
  },
  '151': {
    topicId: 'dl-u2-t11',
    focus:
      'Inverted dropout scales the surviving activations by 1/(1 − p) during training, so inference can use the full network unchanged.',
  },
  '152': {
    topicId: 'dl-u2-t11',
    focus:
      'At inference dropout is disabled: all units are active and their outputs are already on the right scale because of inverted dropout.',
  },
  '153': {
    topicId: 'dl-u2-t11',
    focus:
      'Increasing p regularises more strongly but removes capacity; very high p underfits and slows convergence, so it is tuned on validation data.',
  },
  '154': {
    topicId: 'dl-u2-t10',
    focus: 'Σw² = 14, so L = 2.5 + 0.05 × 14 = 3.2.',
  },
  '155': {
    topicId: 'dl-u2-t10',
    focus: 'Σ|w| = 7, so L = 1.5 + 0.2 × 7 = 2.9.',
  },
  '156': {
    topicId: 'dl-u2-t10',
    focus: '∂L/∂w = 3 + λw = 3 + 0.2 × 4 = 3.8.',
  },
  '157': {
    topicId: 'dl-u2-t11',
    focus:
      'With p = 0.4, 4 of the 10 units are dropped and 6 remain active on average; at inference all 10 are used without dropping.',
  },
  '158': {
    topicId: 'dl-u2-t11',
    focus: 'Inverted dropout scales survivors by 2, giving [4, 0, 12, 0].',
  },
  '159': {
    topicId: 'dl-u2-t13',
    focus:
      'A feed-forward neural network is a directed acyclic stack of layers in which information moves only from input to output, with no recurrent connections.',
  },
  '160': {
    topicId: 'dl-u2-t13',
    focus:
      'The network is input layer (4 units) → hidden layer (5 units) → output layer (3 units), fully connected between consecutive layers, giving 20 + 5 + 15 + 3 = 43 parameters.',
  },
  '161': {
    topicId: 'dl-u2-t13',
    focus:
      'No architecture is specified, so only the formula can be given: total = Σ(nᵢ₋₁ + 1)nᵢ; for 784 → 128 → 10 that is 101,770 parameters.',
  },
  '162': {
    topicId: 'dl-u2-t13',
    focus:
      'For layers n₀ → n₁ → … → n_L, the number of trainable parameters is Σᵢ₌₁ᴸ (nᵢ₋₁ + 1)nᵢ, i.e. weights nᵢ₋₁nᵢ plus nᵢ biases per layer.',
  },
  '163': {
    topicId: 'dl-u2-t13',
    focus:
      'A bias is a learnable additive constant that shifts each unit’s activation threshold; it is trained by the same gradient as the weights, so it is a parameter.',
  },
  '164': {
    topicId: 'dl-u4-t12',
    focus:
      'Parameters are learned from data (weights and biases); hyperparameters are chosen before training (learning rate, layer sizes, dropout, batch size) and control how learning happens.',
  },
  '165': {
    topicId: 'dl-u4-t12',
    focus:
      'Important hyperparameters include learning rate and schedule, batch size, number of epochs, layer and unit counts, activation choice, dropout rate, weight decay, initialisation and optimiser settings.',
  },
  '166': {
    topicId: 'dl-u4-t12',
    focus:
      'Batch size is the number of examples per gradient step, an epoch is one full pass over the training set, and an iteration is one parameter update — so iterations per epoch = N / batch size.',
  },
  '167': {
    topicId: 'dl-u4-t12',
    focus:
      'An epoch is one complete pass of the training algorithm over every example in the training set.',
  },
  '168': {
    topicId: 'dl-u4-t12',
    focus:
      'A mini-batch is a small group of training examples processed together to compute one averaged gradient update.',
  },
  '169': {
    topicId: 'dl-u4-t12',
    focus:
      'Training parameters are updated by the optimiser inside the model, while hyperparameters are fixed settings chosen outside training and only adjusted by search or scheduling.',
  },
  '170': {
    topicId: 'dl-u2-t13',
    focus:
      '10→8: 88; 8→5: 45; 5→3: 18 — the network has 151 trainable parameters including all biases.',
  },
  '171': {
    topicId: 'dl-u2-t13',
    focus:
      '20→50→100→10 has 1000 + 5000 + 1000 = 7000 weights and 50 + 100 + 10 = 160 biases, so 7160 parameters.',
  },
  '172': {
    topicId: 'dl-u3-t3',
    focus:
      'A 784 → 256 → 128 → 10 network has 200,704 + 32,768 + 1280 = 234,752 weights and 394 biases, i.e. 235,146 parameters — enough capacity without excessive memorisation for this input size.',
  },
  '173': {
    topicId: 'dl-u2-t13',
    focus:
      'A fully connected layer costs one matrix multiplication plus a bias add and activation per example, so time grows linearly with batch size and with the product of input and output widths.',
  },
  '174': {
    topicId: 'dl-u2-t13',
    focus:
      'A dense layer with n inputs and m outputs performs about 2nm multiply-accumulate operations per example (nm multiplications and nm additions), plus O(m) for bias and activation.',
  },
  '175': {
    topicId: 'dl-u2-t13',
    focus:
      'Cost grows quadratically with width in a single layer (nm products) and with the sum of adjacent width products across layers, so doubling units roughly quadruples that layer’s compute.',
  },
  '176': {
    topicId: 'dl-u2-t13',
    focus:
      'Larger batches increase per-step compute proportionally but improve hardware utilisation, and they halve gradient noise only slowly (by 1/√B).',
  },
  '177': {
    topicId: 'dl-u2-t13',
    focus:
      'Every layer computes a matrix of dot products, so the whole network is a sequence of GEMMs that map perfectly onto vectorised hardware and batched linear algebra.',
  },
  '178': {
    topicId: 'dl-u1-t5',
    focus:
      'GPUs run thousands of threads over the same matrix operations with high memory bandwidth, while CPUs devote most silicon to control and caching, so GPUs deliver far higher throughput for training.',
  },
  '179': {
    topicId: 'dl-u2-t12',
    focus:
      'Binary classification has one sigmoid output and BCE over two classes; multiclass has one output per class with softmax and categorical cross-entropy.',
  },
  '180': {
    topicId: 'dl-u2-t12',
    focus:
      'Softmax exponentiates the logits, normalises them to sum to one and the argmax class is predicted, while cross-entropy trains the whole distribution.',
  },
};
