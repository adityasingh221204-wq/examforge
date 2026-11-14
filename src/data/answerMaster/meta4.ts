// Answer Master — questions 181–234.

export const META_4: Record<string, { topicId: string; focus: string }> = {
  '181': {
    topicId: 'dl-u2-t12',
    focus:
      'One-vs-rest trains one binary classifier per class against all others and predicts the class with the highest score; it works for algorithms that are inherently binary but is less calibrated than softmax.',
  },
  '182': {
    topicId: 'dl-u2-t12',
    focus:
      'Classification predicts a discrete label and is scored by accuracy, precision/recall and cross-entropy; regression predicts a continuous value and is scored by MSE/MAE.',
  },
  '183': {
    topicId: 'dl-u2-t12',
    focus:
      'Precision = TP/(TP+FP), recall = TP/(TP+FN), F1 = 2PR/(P+R) and accuracy = (TP+TN)/all; precision asks how many positives were right, recall how many positives were found.',
  },
  '184': {
    topicId: 'dl-u2-t12',
    focus:
      'Accuracy is misleading when classes are imbalanced: predicting the majority class always gives high accuracy while detecting none of the minority cases.',
  },
  '185': {
    topicId: 'dl-u2-t12',
    focus:
      'A confusion matrix tabulates predicted versus actual classes (TP, FP, FN, TN), and every classification metric can be derived from its four cells.',
  },
  '186': {
    topicId: 'dl-u2-t12',
    focus:
      'Class imbalance means one class has far fewer examples, so the loss is dominated by the majority and the minority is under-learned.',
  },
  '187': {
    topicId: 'dl-u2-t12',
    focus:
      'Handle imbalance with resampling (oversample minority, undersample majority, SMOTE), class-weighted losses, threshold tuning and metrics such as F1, recall or AUC.',
  },
  '188': {
    topicId: 'dl-u2-t12',
    focus:
      'The ROC curve plots true-positive rate against false-positive rate over all thresholds, and AUC is the probability that a random positive is ranked above a random negative.',
  },
  '189': {
    topicId: 'dl-u2-t12',
    focus:
      'Macro averaging computes each class metric and then the unweighted mean, micro averaging pools all counts before computing the metric, so frequent classes dominate micro scores.',
  },
  '190': {
    topicId: 'dl-u1-t7',
    focus:
      'Build an MLP over normalised attendance, marks, study hours and backlogs, with a sigmoid output and BCE; evaluate with F1 and recall on a held-out split, not accuracy alone.',
  },
  '191': {
    topicId: 'dl-u2-t12',
    focus:
      'The pipeline is load → clean → encode/scale → split → baseline → MLP with dropout → train with early stopping → evaluate on the test split → error analysis, with preprocessing fitted on training data only.',
  },
  '192': {
    topicId: 'dl-u2-t12',
    focus:
      'Split 100,000 rows into roughly 70% train, 15% validation and 15% test (70,000/15,000/15,000), stratified on the target, fitting all preprocessing on the training portion alone.',
  },
  '193': {
    topicId: 'dl-u2-t12',
    focus:
      'A no-skill model that predicts class 0 scores 95% accuracy, so accuracy hides total failure on class 1; use precision, recall, F1, balanced accuracy and PR-AUC.',
  },
  '194': {
    topicId: 'dl-u2-t10',
    focus:
      'The 99% versus 72% gap is overfitting; add data/augmentation, dropout or weight decay, reduce capacity, apply early stopping, and check for leakage or distribution shift.',
  },
  '195': {
    topicId: 'dl-u2-t10',
    focus:
      'Both losses high means underfitting: the model, features or training procedure is too weak — increase capacity, train longer, fix the learning rate, improve features or check for label noise.',
  },
  '196': {
    topicId: 'dl-u2-t10',
    focus:
      'The validation loss turning upward while training loss keeps falling is the signature of overfitting, and the best checkpoint is at the validation minimum.',
  },
  '197': {
    topicId: 'dl-u2-t10',
    focus:
      'That is memorisation without generalisation: regularise, augment, simplify, stop earlier and validate the split to rule out leakage.',
  },
  '198': {
    topicId: 'dl-u4-t11',
    focus:
      'Early layers learn slowly because their gradients are products of many small derivatives (vanishing), are poorly scaled by initialisation, or are starved by a bad learning rate.',
  },
  '199': {
    topicId: 'dl-u2-t7',
    focus:
      'A nonlinear activation bends the layer’s output surface, so composing layers creates curved decision boundaries instead of a single hyperplane.',
  },
  '200': {
    topicId: 'dl-u2-t7',
    focus:
      'Because the composition of linear maps is itself linear: W₂(W₁x) = (W₂W₁)x, so depth without nonlinearity adds no representational power at all.',
  },
  '201': {
    topicId: 'dl-u1-t6',
    focus:
      'Depth multiplies gradient factors, worsens conditioning and creates longer dependency chains, so optimisation becomes harder even though the representable function class grows.',
  },
  '202': {
    topicId: 'dl-u4-t11',
    focus:
      'Sigmoid saturates because e^(−z) dominates for large |z|, flattening the curve so its derivative σ(1 − σ) approaches zero at both extremes.',
  },
  '203': {
    topicId: 'dl-u4-t11',
    focus:
      'With L layers the gradient contains Π f′(z⁽ˡ⁾); if each factor is at most 0.25 (sigmoid), the product decays like 0.25ᴸ and vanishes exponentially.',
  },
  '204': {
    topicId: 'dl-u4-t11',
    focus:
      'ReLU’s derivative is exactly 1 for positive pre-activations, so the backward product does not shrink layer after layer; only inactive units block it.',
  },
  '205': {
    topicId: 'dl-u2-t7',
    focus:
      'A ReLU dies when a large negative gradient pushes its bias so low that no input activates it; its gradient is then always zero and it never recovers.',
  },
  '206': {
    topicId: 'dl-u4-t11',
    focus:
      'Initialisation sets the scale of activations and gradients: too small and the signal vanishes layer by layer, too large and it explodes, so variance-preserving schemes keep both stable.',
  },
  '207': {
    topicId: 'dl-u4-t11',
    focus:
      'Identical initial weights give every unit the same output and the same gradient, so they stay identical forever and the layer behaves like a single neuron.',
  },
  '208': {
    topicId: 'dl-u4-t11',
    focus:
      'Symmetry breaking is the use of random, differently scaled initial weights so that units in a layer learn different features instead of remaining copies.',
  },
  '209': {
    topicId: 'dl-u4-t11',
    focus:
      'Random initialisation breaks symmetry and sets a gradient scale that allows stable propagation; deterministic identical values would make the network untrainable as a population of units.',
  },
  '210': {
    topicId: 'dl-u4-t2',
    focus:
      'Small batches give noisy, high-variance gradient estimates; large batches average the noise away, so gradient noise falls roughly as 1/√B.',
  },
  '211': {
    topicId: 'dl-u4-t2',
    focus:
      'Noise acts like a perturbation that can escape sharp or saddle regions and explore flatter minima, which often generalise better.',
  },
  '212': {
    topicId: 'dl-u2-t10',
    focus:
      'Optimisation error is the gap between the best achievable training loss and the loss actually reached; generalisation error is the gap between training and unseen-data performance.',
  },
  '213': {
    topicId: 'dl-u2-t10',
    focus:
      'Larger networks have many parameter settings that fit the data, and gradient descent tends to find flatter, simpler ones; capacity plus regularisation can therefore generalise better than a small model.',
  },
  '214': {
    topicId: 'dl-u2-t11',
    focus:
      'Each dropout mask defines a different thinned subnetwork, and training shares weights across all of them, so inference approximates an ensemble average over exponentially many subnetworks.',
  },
  '215': {
    topicId: 'dl-u2-t10',
    focus:
      'Regularisation deliberately restricts effective model complexity, trading a little training fit for a smaller gap to unseen data.',
  },
  '216': {
    topicId: 'dl-u3-t4',
    focus:
      'Cross-entropy is the negative log-likelihood of the true label under the predicted distribution, so minimising it maximises the probability the model assigns to correct answers.',
  },
  '217': {
    topicId: 'dl-u2-t7',
    focus:
      'Softmax outputs are non-negative and sum to one by construction, so each value satisfies the axioms of a categorical probability distribution.',
  },
  '218': {
    topicId: 'dl-u2-t7',
    focus:
      'Softmax is a smooth, shift-invariant normalisation of the logits: it exponentiates them and divides by their sum, preserving their ordering and ratios as probabilities.',
  },
  '219': {
    topicId: 'dl-u2-t8',
    focus:
      'z = 0.5, ŷ = 0.6225, L = 0.4741, ∂L/∂z = −0.3775, so w becomes 0.3133 and b becomes −0.0622; the new prediction is σ(0.8775) = 0.7063 and the loss falls to 0.3477.',
  },
  '220': {
    topicId: 'dl-u2-t8',
    focus:
      'No numerical values are supplied, so the gradients cannot be evaluated; the method is forward through the two ReLUs to L, then backward with the ReLU masks and ∂L/∂ŷ = ŷ − y.',
  },
  '221': {
    topicId: 'dl-u2-t8',
    focus:
      'Again the parameter values are missing; the derivation is δ₂ = ŷ − y, ∂L/∂w2 = δ₂h, ∂L/∂w1 = δ₂w2·h(1 − h)·x, with bias gradients δ₂ and δ₂w2·h(1 − h).',
  },
  '222': {
    topicId: 'dl-u4-t8',
    focus:
      'On L = w² from w = 10 with η = 0.1, SGD shrinks by 20% per step, momentum accelerates and overshoots past the minimum, RMSProp takes cautious decreasing steps, and Adam normalises to small steady steps.',
  },
  '223': {
    topicId: 'dl-u2-t10',
    focus:
      'Overfitting begins around epoch 10–20, where validation loss reaches its minimum of 0.60 and then rises while training loss keeps falling; stop at that minimum and add augmentation, dropout or weight decay.',
  },
  '224': {
    topicId: 'dl-u1-t7',
    focus:
      'Use a 30→32→16→1 MLP with ReLU and dropout, BCE with class weighting, Adam at 1e-3, batches of 256, early stopping on PR-AUC, and a stratified 70/15/15 split.',
  },
  '225': {
    topicId: 'dl-u2-t8',
    focus:
      'The question omits the architecture and values, so the answer gives the full forward/backward procedure and a clearly labelled worked example (x = 1, W1 = 0.5, b1 = 0, W2 = 2, b2 = 0, y = 1).',
  },
  '226': {
    topicId: 'dl-u4-t8',
    focus:
      'SGD is a scaled gradient, momentum accumulates it, RMSProp scales it by recent magnitude, and Adam does both with bias correction; choose by data size, sparsity, memory and tuning budget.',
  },
  '227': {
    topicId: 'dl-u2-t8',
    focus:
      'Walk the graph forward to evaluate and store every node, then go backward multiplying each local derivative by the upstream gradient, summing at branches.',
  },
  '228': {
    topicId: 'dl-u2-t13',
    focus:
      'Parameters follow Σ(nᵢ₋₁ + 1)nᵢ and a forward pass costs about Σ 2nᵢ₋₁nᵢ multiply-accumulates per example; the question gives no concrete architecture, so a labelled 784→256→10 example is worked.',
  },
  '229': {
    topicId: 'dl-u2-t10',
    focus:
      'Both curves high = underfitting; training low and validation rising = overfitting; both low and close = good fit; erratic or NaN curves = optimisation or learning-rate failure.',
  },
  '230': {
    topicId: 'dl-u1-t7',
    focus:
      'For a binary tabular problem an MLP with two hidden ReLU layers, dropout, one sigmoid output, BCE and Adam is the defensible default, justified by nonlinearity, calibration and stable optimisation.',
  },
  '231': {
    topicId: 'dl-u2-t5',
    focus:
      'Backpropagation is the chain rule applied to the computational graph in reverse; the answer derives δ for each layer and demonstrates it numerically on a 2→2→1 network with stated values.',
  },
  '232': {
    topicId: 'dl-u2-t7',
    focus:
      'Sigmoid and tanh saturate, ReLU is fast but one-sided, Leaky ReLU keeps a negative slope; choose ReLU-family for hidden layers and sigmoid/softmax only at the output.',
  },
  '233': {
    topicId: 'dl-u2-t10',
    focus:
      'L1 sparsifies, L2 shrinks smoothly, dropout injects structural noise, early stopping limits training time, and augmentation enlarges the data; they attack overfitting from different directions and combine well.',
  },
  '234': {
    topicId: 'dl-u4-t11',
    focus:
      'Fix vanishing gradients with ReLU-family activations, He initialisation, batch normalisation and residual connections, and fix overfitting with dropout, weight decay, augmentation and early stopping — then verify both on validation curves.',
  },
};
