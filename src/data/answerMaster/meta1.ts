// Answer Master — curated topic mapping and answer spine for the standalone numericals
// (N1–N5) and questions 1–60 of the uploaded bank.

export const META_1: Record<string, { topicId: string; focus: string }> = {
  N1: {
    topicId: 'dl-u2-t2',
    focus:
      'z = 0.4(2) + (−0.6)(3) + 0.2 = −0.8. Since z < 0 the step activation returns 0, so the perceptron predicts class 0.',
  },
  N2: {
    topicId: 'dl-u2-t3',
    focus:
      'The initial output is 0 but the target is 1, so the perceptron updates: w ← w + η(y − ŷ)x = [0.3, −0.2] and b ← b + η(y − ŷ) = 0.2.',
  },
  N3: {
    topicId: 'dl-u2-t3',
    focus:
      'Sequential updates over one XOR epoch end with w1 = 1, w2 = 1, b = 0: only the (1,1) sample produces an error, and it moves both weights up by 1 while the earlier (0,0) sample moved the bias to −1.',
  },
  N4: {
    topicId: 'dl-u2-t4',
    focus:
      'z = 2x1 + 3x2 − 5 gives 0, 2, 1 and 1 for the four points; with a zero threshold each z ≥ 0 is class 1, so all four points are predicted class 1.',
  },
  N5: {
    topicId: 'dl-u2-t4',
    focus:
      'Setting z = 0 gives the line x2 = 2x1 + 3. Class 1 is the half-plane 4x1 − 2x2 + 6 > 0, i.e. the side below the line (for example the origin).',
  },

  '1': {
    topicId: 'dl-u1-t3',
    focus:
      'AI is the broad goal of machine intelligence, ML is the subset that learns patterns from data, and DL is ML using deep neural networks; each field is contained in the one before it.',
  },
  '2': {
    topicId: 'dl-u1-t1',
    focus:
      'An ANN is a layered graph of simple units, each computing a weighted sum of its inputs plus a bias and passing it through an activation function, with weights learned from data.',
  },
  '3': {
    topicId: 'dl-u2-t1',
    focus:
      'They are called neural because their units and connections were loosely inspired by biological neurons and synapses — the name marks the analogy, not a claim of biological fidelity.',
  },
  '4': {
    topicId: 'dl-u1-t3',
    focus:
      'AI is the umbrella discipline, ML replaces hand-written rules with learning from examples, and DL replaces hand-engineered features with learned hierarchical representations; a chess engine, a spam filter and an image classifier illustrate the three levels.',
  },
  '5': {
    topicId: 'dl-u1-t3',
    focus:
      'Traditional ML needs hand-engineered features and works with smaller tabular data, whereas DL learns features end-to-end and needs far more data and compute but scales better on perceptual problems.',
  },
  '6': {
    topicId: 'dl-u1-t5',
    focus:
      'Three conditions arrived together after 2012: web-scale labelled data, GPU compute, and algorithmic fixes (ReLU, dropout, batch normalisation, better optimisers) proved on ImageNet.',
  },
  '7': {
    topicId: 'dl-u1-t5',
    focus:
      'Big data supplies the statistical signal, GPUs supply parallel throughput, better optimisers make deep loss surfaces trainable, non-saturating activations preserve gradients, and cheaper hardware makes all of it affordable.',
  },
  '8': {
    topicId: 'dl-u1-t6',
    focus:
      'Representation learning means the network discovers the features it needs from raw input instead of a human defining them, so each layer learns a progressively more abstract description.',
  },
  '9': {
    topicId: 'dl-u1-t6',
    focus:
      'Going deep means composing many learned layers so that later layers operate on features built by earlier ones, producing hierarchy rather than a single wide transformation.',
  },
  '10': {
    topicId: 'dl-u1-t6',
    focus:
      'Depth composes simple nonlinearities into exponentially many linear regions, so a deep network represents highly complex functions with far fewer units than a shallow one would need.',
  },
  '11': {
    topicId: 'dl-u1-t6',
    focus:
      'Hierarchical feature learning builds edges from pixels, motifs from edges, parts from motifs and objects from parts, with each level reusing the level below.',
  },
  '12': {
    topicId: 'dl-u1-t4',
    focus:
      'The path runs perceptron (1958) → XOR limitation and AI winter → multilayer networks with backpropagation (1986) → CNN/LeNet and deep nets → ImageNet/AlexNet 2012 → residual, sequence and transformer models.',
  },
  '13': {
    topicId: 'dl-u1-t4',
    focus:
      'Key milestones are the 1956 Dartmouth workshop, Rosenblatt’s perceptron, the 1969 XOR critique, backpropagation in 1986, LeNet-5, AlexNet in 2012, ResNet in 2015 and the transformer in 2017.',
  },
  '14': {
    topicId: 'dl-u1-t4',
    focus:
      'Research declined because early promises were overstated, Minsky and Papert proved single-layer perceptrons cannot represent XOR, compute was inadequate and funding was withdrawn.',
  },
  '15': {
    topicId: 'dl-u1-t4',
    focus:
      'The resurgence came from large labelled datasets, GPU parallelism, improved activation functions and regularisation, and benchmark wins that made deep models the default.',
  },
  '16': {
    topicId: 'dl-u1-t5',
    focus:
      'GPUs contain thousands of simple cores and high-bandwidth memory, so the dense matrix multiplications that dominate neural-network training run in parallel instead of serially on a CPU.',
  },
  '17': {
    topicId: 'dl-u1-t7',
    focus:
      'Image classification and medical imaging, machine translation and chatbots, speech recognition, recommendation and ranking, fraud detection, and autonomous driving are all deep-learning applications.',
  },
  '18': {
    topicId: 'dl-u1-t7',
    focus:
      'In vision, convolutional layers learn edge, texture and object filters, and the resulting features drive classification, detection, segmentation and generation.',
  },
  '19': {
    topicId: 'dl-u1-t7',
    focus:
      'In NLP, tokens become embeddings and sequence models or transformers learn context, enabling translation, summarisation, sentiment analysis and question answering.',
  },
  '20': {
    topicId: 'dl-u1-t7',
    focus:
      'Speech systems convert audio to spectrogram frames and learn acoustic-to-text mappings with recurrent or convolutional networks trained by CTC or attention.',
  },
  '21': {
    topicId: 'dl-u1-t7',
    focus:
      'Recommenders embed users and items in a shared vector space and learn to rank items by predicted relevance from interaction histories.',
  },
  '22': {
    topicId: 'dl-u1-t8',
    focus:
      'The main challenges are data hunger, computational cost, overfitting, opacity, sensitivity to distribution shift, bias and the difficulty of verification.',
  },
  '23': {
    topicId: 'dl-u1-t8',
    focus:
      'Deep models have millions of parameters and must estimate a high-dimensional function, so they need many examples to constrain those parameters and average out noise.',
  },
  '24': {
    topicId: 'dl-u1-t8',
    focus:
      'Every layer costs a matrix multiplication, activations and stored intermediates, and backpropagation roughly doubles the compute while memory must hold activations for the gradient pass.',
  },
  '25': {
    topicId: 'dl-u4-t13',
    focus:
      'A deep network’s decision depends on millions of interacting weights, so it is hard to state why a specific input received its output; saliency, attribution and attention maps only approximate an explanation.',
  },
  '26': {
    topicId: 'dl-u2-t12',
    focus:
      'Training data fits the weights, validation data tunes hyperparameters and detects overfitting, and test data gives one unbiased final estimate — and they must never overlap.',
  },
  '27': {
    topicId: 'dl-u2-t10',
    focus:
      'Overfitting is fitting training noise instead of the underlying pattern; it matters more in deep learning because high-capacity networks can memorise even random labels.',
  },
  '28': {
    topicId: 'dl-u1-t8',
    focus:
      'Underfitting means the model is too simple or undertrained to capture the pattern, so both training and validation loss stay high.',
  },
  '29': {
    topicId: 'dl-u1-t8',
    focus:
      'Bias is error from an overly simple model, variance is error from sensitivity to the particular training sample; increasing capacity lowers bias but raises variance until regularisation restores the balance.',
  },
  '30': {
    topicId: 'dl-u1-t3',
    focus:
      'An end-to-end system maps raw input directly to the final output and optimises all stages jointly, rather than stitching together separately tuned modules.',
  },
  '31': {
    topicId: 'dl-u2-t1',
    focus:
      'A biological neuron has dendrites that collect signals, a soma that integrates them, and an axon with synapses that transmits a spike when the integrated potential crosses a threshold.',
  },
  '32': {
    topicId: 'dl-u2-t1',
    focus:
      'Dendrites receive, the soma integrates and fires, the axon carries the spike, and synapses convert the spike into a weighted chemical signal at the next neuron.',
  },
  '33': {
    topicId: 'dl-u2-t1',
    focus:
      'Both collect weighted inputs, sum them and fire when a threshold is crossed; the artificial neuron replaces spikes with continuous activations and uses learned weights, and it has no time dynamics or morphology.',
  },
  '34': {
    topicId: 'dl-u2-t1',
    focus:
      'The analogy ignores spikes and timing, dendritic computation, synaptic plasticity and brain topology; an ANN is a mathematical function approximator, not a brain simulation.',
  },
  '35': {
    topicId: 'dl-u2-t1',
    focus:
      'The model is z = Σ wᵢxᵢ + b followed by a = f(z), where w are learned weights, b a learned bias and f a nonlinear activation.',
  },
  '36': {
    topicId: 'dl-u2-t2',
    focus:
      'A perceptron is the simplest trainable neuron: a weighted sum of inputs plus bias passed through a step function, with weights updated by the perceptron learning rule.',
  },
  '37': {
    topicId: 'dl-u2-t2',
    focus:
      'A single-layer perceptron has one input layer feeding one output neuron (or one neuron per class) with no hidden layer; the inputs connect directly to the threshold unit.',
  },
  '38': {
    topicId: 'dl-u2-t2',
    focus:
      'From ŷ = f(Σ wᵢxᵢ + b) with f a step at zero, the decision surface is the hyperplane Σ wᵢxᵢ + b = 0, and the sign of z selects the class.',
  },
  '39': {
    topicId: 'dl-u2-t2',
    focus:
      'The bias shifts the decision boundary away from the origin, so the neuron can fire even when all inputs are zero and can represent thresholds unrelated to the input scale.',
  },
  '40': {
    topicId: 'dl-u2-t3',
    focus:
      'Initialise weights, compute the output for each sample, and on a misclassification update w ← w + η(y − ŷ)x and b ← b + η(y − ŷ), repeating until the data are separated.',
  },
  '41': {
    topicId: 'dl-u2-t3',
    focus:
      'If the training set is linearly separable with margin γ, the perceptron makes at most (R/γ)² mistakes, so the algorithm converges after a finite number of updates.',
  },
  '42': {
    topicId: 'dl-u2-t4',
    focus:
      'A single-layer perceptron solves only linearly separable problems — AND, OR, NAND and thresholded linear decisions — not XOR or any non-separable pattern.',
  },
  '43': {
    topicId: 'dl-u2-t4',
    focus:
      'XOR is not linearly separable: no single line can put (0,0) and (1,1) on one side and (0,1) and (1,0) on the other, so one hyperplane cannot represent it.',
  },
  '44': {
    topicId: 'dl-u2-t4',
    focus:
      'A set is linearly separable when one hyperplane puts all positives on one side and all negatives on the other; AND is separable, XOR is not.',
  },
  '45': {
    topicId: 'dl-u2-t7',
    focus:
      'A perceptron uses a non-differentiable step and the discrete perceptron rule, whereas a modern neuron uses a differentiable activation and is trained by gradient descent.',
  },
  '46': {
    topicId: 'dl-u2-t2',
    focus:
      'A shallow neural network has only one hidden layer (or none) between input and output, so it performs a single learned transformation before the output layer.',
  },
  '47': {
    topicId: 'dl-u2-t2',
    focus:
      'The input layer feeds one hidden layer of nonlinear units, which feeds the output layer; every input connects to every hidden unit and every hidden unit to every output.',
  },
  '48': {
    topicId: 'dl-u2-t2',
    focus:
      'A single-layer network has no hidden layer and can draw only one linear boundary, while a single-hidden-layer network adds nonlinear features and can approximate continuous functions.',
  },
  '49': {
    topicId: 'dl-u1-t6',
    focus:
      'The universal approximation theorem states that a feed-forward network with one sufficiently wide hidden layer and a non-polynomial activation can approximate any continuous function on a compact domain to arbitrary accuracy.',
  },
  '50': {
    topicId: 'dl-u1-t6',
    focus:
      'No: the theorem guarantees existence, not that the required width is learnable, efficient or well-generalising; depth gives the same functions with far fewer units and better sample efficiency.',
  },
  '51': {
    topicId: 'dl-u1-t6',
    focus:
      'Depth composes features hierarchically and creates exponentially many linear regions per unit, so a deep model reaches a target function with fewer parameters and less data than a very wide shallow one.',
  },
  '52': {
    topicId: 'dl-u2-t13',
    focus:
      'A feed-forward network passes data in one direction only — input → hidden layers → output — with no cycles, no recurrence and no feedback connections.',
  },
  '53': {
    topicId: 'dl-u2-t13',
    focus:
      'Each layer computes z = Wx + b and a = f(z); the activation of one layer becomes the input of the next until the output layer produces the prediction.',
  },
  '54': {
    topicId: 'dl-u5-t5',
    focus:
      'Feed-forward networks treat each input independently, while recurrent networks carry a hidden state across time steps, so their output depends on the whole sequence.',
  },
  '55': {
    topicId: 'dl-u2-t13',
    focus:
      'Hidden layers learn intermediate representations that are not directly observed, letting the output layer solve its problem in a better feature space; more hidden layers build more abstract features.',
  },
  '56': {
    topicId: 'dl-u2-t7',
    focus:
      'An activation function is the element-wise nonlinear map applied to a neuron’s weighted sum, deciding its output and shaping the gradient that flows back through it.',
  },
  '57': {
    topicId: 'dl-u2-t7',
    focus:
      'Without a nonlinear activation, stacked layers collapse into a single linear map, so the network could not represent curved decision boundaries or any nonlinear function.',
  },
  '58': {
    topicId: 'dl-u2-t7',
    focus:
      'The composition of linear functions is another linear function, so the whole network reduces to one matrix and can only solve linearly separable problems regardless of depth.',
  },
  '59': {
    topicId: 'dl-u2-t7',
    focus:
      'Sigmoid is σ(z) = 1/(1 + e^(−z)); it squashes any real value into (0,1), is differentiable with σ′ = σ(1 − σ), and saturates at both ends.',
  },
  '60': {
    topicId: 'dl-u2-t7',
    focus:
      'Tanh is tanh(z) = (e^z − e^(−z))/(e^z + e^(−z)); it is zero-centred with range (−1,1) and derivative 1 − tanh²(z), but still saturates.',
  },
};
