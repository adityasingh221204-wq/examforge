// EXAMFORGE — official syllabus database.
// Primary source of truth: the four uploaded university syllabus PDFs.
// Topic names preserve official syllabus terminology exactly.

import type { Subject, SubjectId, Topic, Unit } from './types';

type Entry = [name: string, subtopics: string[], numerical?: boolean];

function makeTopics(subjectId: SubjectId, unitId: string, entries: Entry[]): Topic[] {
  return entries.map(([name, subtopics, numerical], i) => ({
    id: `${unitId}-t${i + 1}`,
    subjectId,
    unitId,
    name,
    subtopics,
    numerical: numerical ?? false,
  }));
}

function makeUnit(
  subjectId: SubjectId,
  order: number,
  name: string,
  hours: number,
  entries: Entry[],
): Unit {
  const unitId = `${subjectId}-u${order}`;
  return { id: unitId, subjectId, order, name, hours, topics: makeTopics(subjectId, unitId, entries) };
}

// ============================================================ A. DEEP LEARNING (TE7753)

const dlUnits: Unit[] = [
  makeUnit('dl', 1, 'Introduction to Deep Learning', 10, [
    ['Neural Networks', ['Biological motivation', 'Nodes, weights, bias', 'Network topology']],
    ['Artificial Neural Networks', ['Perceptron to multilayer networks', 'Training vs inference']],
    ['Why Deep Learning', ['Hierarchy of features', 'Representation learning vs feature engineering']],
    ['Brief History of AI', ['Dartmouth workshop 1956', 'AI winters', 'Machine learning era']],
    ['Deep Learning: Successes Last Decade', ['ImageNet 2012 (AlexNet)', 'AlphaGo', 'LLMs and transformers']],
    ['Reasons to Go Deep', ['Compositionality', 'Parameter efficiency', 'Generic feature learning']],
    ['Applications of Deep Learning', ['Vision', 'NLP and speech', 'Healthcare, robotics, generative AI']],
    ['Challenges of Deep Learning', ['Data hunger', 'Compute cost', 'Interpretability', 'Adversarial fragility']],
  ]),
  makeUnit('dl', 2, 'Advances in Neural Networks and Deep Learning', 8, [
    ['Biological Neuron vs Perceptron', ['Dendrites, soma, axon vs weights, activation, output', 'McCulloch–Pitts model']],
    ['Shallow Neural Network', ['Single hidden layer', 'Universal approximation']],
    ['Training a Perceptron', ['Perceptron learning rule', 'Convergence for linearly separable data']],
    ['Linear Classification', ['Decision boundary', 'Linearly separable vs not']],
    ['Backpropagation', ['Chain rule', 'Forward pass and backward pass', 'Weight update']],
    ['Role of Activation Functions and Backpropagation', ['Non-linearity', 'Gradient flow']],
    ['Activation Functions', ['Sigmoid, Tanh, ReLU, Leaky ReLU, Softmax', 'Derivatives and range']],
    ['Backpropagation Illustration', ['Worked gradient example', 'Layer-wise error propagation']],
    ['Optimization', ['Gradient descent variants', 'Learning rate', 'Loss surface']],
    ['Regularization', ['L1 / L2', 'Early stopping', 'Data augmentation']],
    ['Dropout Layer', ['Random unit removal', 'Ensemble interpretation']],
    ['Classification Kaggle Dataset', ['Workflow: load, clean, split, train, evaluate', 'Confusion matrix']],
    ['Feedforward Neural Networks', ['FFNN architecture', 'Forward propagation equations']],
  ]),
  makeUnit('dl', 3, 'Deep Neural Network', 10, [
    ['Why Deep Neural Networks', ['Hierarchical feature learning', 'Depth vs width']],
    ['Applications', ['Image recognition', 'Speech and language', 'Recommendation systems']],
    ['Designing a Deep Neural Network', ['Layer choices', 'Width, depth, activation selection']],
    ['How to Choose Your Loss Function', ['MSE, cross-entropy, hinge loss', 'Task-to-loss mapping']],
    ['Tools for Deep Learning Models', ['Frameworks comparison', 'GPU/TPU acceleration']],
    ['Keras and Its Elements', ['Sequential and Functional API', 'Layers, models, optimizers, callbacks']],
    ['TensorFlow and Its Ecosystem', ['Tensors, tf.data, TF Hub, TensorBoard', 'Deployment tools']],
    ['Build a Deep Learning Model Using TensorFlow', ['Model definition, compile, fit, evaluate']],
    ['TFlearn', ['High-level wrapper over TensorFlow', 'Scope, layers, estimators']],
  ]),
  makeUnit('dl', 4, 'Optimization, Tuning and Interpretability', 9, [
    ['Optimization Algorithms', ['Batch, stochastic and mini-batch gradient descent', 'Convex vs non-convex loss']],
    ['SGD', ['Stochastic gradient descent update rule', 'Noise and convergence']],
    ['Momentum', ['Velocity accumulation', 'Damping oscillations']],
    ['NAG', ['Nesterov accelerated gradient', 'Lookahead update']],
    ['Adagrad', ['Per-parameter learning rates', 'Sparse feature handling']],
    ['Adadelta', ['Adaptive denominator without manual lr', 'Windowed accumulation']],
    ['RMSprop', ['Moving average of squared gradients', 'Fixing Adagrad decay']],
    ['Adam', ['Momentum + RMSprop', 'Bias correction']],
    ['Batch Normalization', ['Normalizing layer inputs', 'Training vs inference statistics']],
    ['Exploding Gradients', ['Symptoms', 'Gradient clipping', 'Normalization remedies']],
    ['Vanishing Gradients', ['Saturated activations', 'Residual/skip connections', 'ReLU and initialization']],
    ['Hyperparameter Tuning', ['Grid, random, Bayesian search', 'Learning rate, batch size, depth']],
    ['Interpretability', ['Saliency maps', 'LIME / SHAP', 'Feature attribution']],
  ]),
  makeUnit('dl', 5, 'Convolutional Neural Networks', 8, [
    ['CNN Success and History', ['LeNet', 'ImageNet 2012 breakthrough', 'Why CNNs beat MLPs on images']],
    ['CNN Network Design and Architecture', ['Convolution, pooling, fully connected layers', 'Filter, stride, padding']],
    ['Image Type Classification (Kaggle)', ['CNN on image dataset pipeline', 'Data augmentation and evaluation']],
    ['Deep Convolutional Models', ['AlexNet, VGG, GoogLeNet, ResNet', 'Depth-wise design patterns']],
    ['Introduction to Recurrent Neural Networks', ['Sequence modelling need', 'RNN unrolling and hidden state']],
  ]),
];

// ============================================================ B. COMPUTER NETWORKS (T7908)

const cnUnits: Unit[] = [
  makeUnit('cn', 1, 'Computer Networks and the Internet', 5, [
    ['Internet Basics', ['Hosts, routers, links', 'Internet as network of networks', 'Switching vs routing']],
    ['Protocols', ['Protocol definition', 'Request/response, headers', 'Layered protocol stack']],
    ['Network edge', ['Clients and servers', 'Access networks', 'Physical media']],
    ['Network core', ['Packet switching', 'Circuit switching', 'Store-and-forward']],
    ['Delay', ['Four components of delay', 'Nodal vs transmission delay', 'Queuing delay']],
    ['Packet Loss', ['Buffer overflow', 'Loss probability', 'Effect on throughput']],
    ['Throughput', ['Instantaneous vs average throughput', 'Bottleneck link', 'Bandwidth vs throughput']],
  ]),
  makeUnit('cn', 2, 'Application Layer', 8, [
    ['Principles of Network Applications', ['Client-server and P2P models', 'Socket programming interface', 'Paradigms of communication']],
    ['HTTP', ['Persistent and non-persistent connections', 'Request/response methods', 'Status codes']],
    ['HTTP Message Format', ['Request line and headers', 'Body formats', 'Header fields']],
    ['Web Caching', ['Proxy cache', 'Cache hit ratio', 'Conditional GET']],
    ['File Transfer Protocol (FTP)', ['Control and data connections', 'Commands and responses']],
    ['SMTP', ['Mail submission and delivery', 'Push protocol', 'MIME']],
    ['DNS basics', ['Hierarchical name space', 'Recursive and iterative query', 'Resource records']],
    ['Peer-to-Peer file distribution', ['Tracker and swarms', 'Distributed hash tables', 'Scalability']],
    ['Socket programming with TCP and UDP', ['Socket API calls', 'Connection-oriented vs connectionless', 'Client/server flow']],
  ]),
  makeUnit('cn', 3, 'Transport Layer', 12, [
    ['Overview of the Transport Layer in the Internet', ['Segmentation and reassembly', 'Multiplexing/demultiplexing', 'Transport services']],
    ['Transport and Network Layer Relationship', ['Layering and encapsulation', 'IP vs transport responsibilities']],
    ['UDP', ['Connectionless datagrams', 'Fields and header', 'When to use UDP']],
    ['UDP checksum', ['One\'s complement sum', 'Error detection computation', 'Worked example']],
    ['Concept of Reliable Data Transfer', ['rdt protocols', 'ACK/NAK, timeouts, retransmission', 'Stop-and-wait']],
    ['Go-Back-N', ['Sender window', 'Cumulative ACK', 'Re-transmission of all outstanding']],
    ['Selective-Repeat', ['Individual ACKs', 'Receiver buffering', 'Only lost packets re-sent']],
    ['TCP Flow control', ['Receive window', 'Sender pacing', 'Zero-window handling']],
    ['TCP Congestion control', ['Slow start', 'Congestion avoidance', 'Fast recovery, TCP Reno/CUBIC']],
  ]),
  makeUnit('cn', 4, 'The Network Layer', 15, [
    ['Virtual Circuit and Datagram Networks', ['VC setup and teardown', 'Datagram forwarding', 'Comparison']],
    ['Internet Protocol', ['Best-effort delivery', 'IP datagram format', 'Fragmentation']],
    ['IPv4 Addressing', ['Dotted decimal', 'Subnetting', 'CIDR and NAT']],
    ['IPv6', ['128-bit addresses', 'Header simplification', 'Transition from IPv4']],
    ['ICMP', ['Error reporting', 'Ping and traceroute', 'ICMP messages']],
    ['Routing', ['Forwarding vs routing', 'Routing tables', 'Flat vs hierarchical addressing']],
    ['Link-State routing algorithm', ['Dijkstra\'s algorithm', 'Link-state broadcast', 'Convergence']],
    ['Distance-Vector routing algorithm', ['Bellman–Ford equation', 'Count-to-infinity', 'Split horizon']],
    ['Routing in the Internet', ['Autonomous systems', 'Intra-AS and inter-AS routing', 'Hierarchy of routers']],
    ['RIP', ['Distance-vector AS-internal protocol', 'Hop count limit of 16', 'Advertisements']],
    ['OSPF', ['Link-state AS-internal protocol', 'Areas and metrics', 'Authentication']],
    ['BGP', ['Path-vector inter-AS protocol', 'eBGP / iBGP', 'Policy and route selection']],
  ]),
  makeUnit('cn', 5, 'The Link Layer', 5, [
    ['Link Layer Basics', ['Framing', 'Link-layer addressing (MAC)', 'Error handling and flow control']],
    ['Error Detection and Correction', ['Parity-based methods', 'FEC vs error detection', 'Hamming distance']],
    ['Parity', ['Even/odd parity', 'Two-dimensional parity']],
    ['Checksum', ['Internet checksum', 'One\'s complement arithmetic']],
    ['CRC', ['Polynomial division', 'Generator polynomial', 'Remainder as FCS']],
    ['Random access control protocols', ['ALOHA', 'Slotted ALOHA', 'CSMA, CSMA/CD, CSMA/CA']],
    ['Taking-turns protocols', ['Token passing', 'Polling']],
    ['DOCSIS', ['Cable access standard', 'Upstream/downstream channels', 'Request-grant cycle']],
    ['Link Virtualization', ['ATM', 'Multiplexing and emulation']],
    ['Multiprotocol Label Switching (MPLS)', ['Label switching', 'Forwarding equivalence classes', 'Traffic engineering']],
  ]),
];

// ============================================================ C. NATURAL LANGUAGE PROCESSING (TEE7101)

const nlpUnits: Unit[] = [
  makeUnit('nlp', 1, 'Introduction to Language', 7, [
    ['Evolution of Natural Language', ['Written and spoken language history', 'From rules to statistics to neural NLP']],
    ['Introduction to NLP', ['What NLP is', 'NLP inside ML and AI', 'Human language vs formal language']],
    ['Need of NLP', ['Volume of unstructured text', 'Human-computer interaction', 'Automation of language tasks']],
    ['Applications of NLP', ['Translation, summarisation, search', 'Chatbots and assistants']],
    ['Discourse analysis', ['Coherence and cohesion', 'Text structure beyond the sentence']],
    ['Dialog analysis', ['Turn taking', 'Intent and dialogue state']],
    ['Opinion mining', ['Sentiment polarity', 'Aspect-level sentiment', 'Review analytics']],
    ['Phases of NLP', ['Lexical, syntactic, semantic, pragmatic analysis']],
    ['Data Preprocessing techniques', ['Cleaning, lowercasing, stopword removal', 'Why preprocessing matters']],
    ['Tokenization', ['Word and subword tokens', 'Sentence splitting', 'Vocabulary building']],
    ['Embedding', ['Dense vector representation', 'Idea of semantic proximity']],
    ['Stemming', ['Suffix stripping', 'Porter stemmer']],
    ['Parts of speech tagging', ['Tagsets (NN, VB, JJ)', 'Hidden Markov tagging']],
    ['Normalization', ['Case folding', 'Lemmatization', 'Unicode and spelling normalization']],
    ['Named entity recognition', ['Person, org, location tags', 'Sequence labelling']],
  ]),
  makeUnit('nlp', 2, 'Feature Extraction', 10, [
    ['One-hot encoding methods', ['Binary vocabulary vectors', 'Sparsity and dimensionality']],
    ['Bag of Words (BoW)', ['Count-based vectors', 'Order ignored']],
    ['Skip-grams', ['Context-target pairs', 'Window size']],
    ['CountVectorizer', ['Scikit-learn counts', 'n-gram range']],
    ['TF-IDF', ['Term frequency', 'Inverse document frequency', 'Weighting formula']],
    ['Probabilistic language modeling', ['Chain rule of probability', 'Next-word prediction', 'Perplexity']],
    ['Naive Bayes and its applications', ['Bayes theorem', 'Conditional independence', 'Spam filtering']],
    ['Markov models', ['Markov assumption', 'State transitions']],
    ['N-grams', ['Unigram, bigram, trigram', 'Sequence probability estimation']],
    ['Estimating the probability of a word', ['Maximum likelihood', 'Count-based estimation']],
    ['Smoothing', ['Laplace add-one', 'Good–Turing', 'Backoff']],
    ['Generative models of language', ['Naive Bayes generator', 'From probabilities to samples']],
  ]),
  makeUnit('nlp', 3, 'Word Embeddings', 10, [
    ['Word Embeddings', ['Dense distributed vectors', 'Semantic similarity']],
    ['Word Vectors (Word2Vec)', ['CBOW and Skip-gram architectures', 'Training objective']],
    ['Gensim word vectors example', ['Loading and training in Gensim', 'Similarity queries']],
    ['Word Vectors 2 and Word Senses (GloVe)', ['Global co-occurrence matrix', 'Weighted least squares']],
    ['Word Window Classification', ['Context window features', 'Window-based text classification']],
    ['Neural Networks', ['MLP as classifier', 'Softmax output']],
    ['Matrix Calculus and Backpropagation', ['Jacobian and gradients', 'Vectorized backprop']],
    ['Dependency Parsing (Linguistic Structure)', ['Dependency arcs', 'Head and dependent', 'Parsing algorithms']],
    ['Negative Sampling', ['Sampling negatives', 'Why full softmax is expensive']],
  ]),
  makeUnit('nlp', 4, 'Recurrent Neural Networks', 8, [
    ['Recurrent Neural Networks and Language Models', ['RNN unrolling', 'Hidden state as memory', 'RNN language model']],
    ['N-Gram', ['N-gram model as RNN baseline', 'Perplexity comparison']],
    ['Vanishing Gradients', ['Long-range dependency failure', 'Gradient products through time']],
    ['LSTM', ['Gates: input, forget, output', 'Cell state', 'Peephole connections']],
    ['GRU', ['Reset and update gates', 'Simplified gating']],
  ]),
  makeUnit('nlp', 5, 'Machine Translation', 10, [
    ['Machine Translation (Seq2Seq)', ['Encoder–decoder architecture', 'Teacher forcing', 'Beam search']],
    ['Paradigm shift in NLP', ['From pipelines to pretraining', 'Transfer learning']],
    ['BERT', ['Bidirectional pretraining', 'MLM and NSP', 'Fine-tuning']],
    ['LaMDA', ['Dialogue-focused transformer', 'Safety and groundedness']],
    ['GPT', ['Autoregressive pretraining', 'Few-shot prompting']],
    ['NLP in AI (Conversational AI)', ['Dialog systems', 'Question answering', 'Assistants']],
    ['Current research papers in NLP', ['Reading and critiquing papers', 'Evaluating benchmarks']],
  ]),
];

// ============================================================ D. CLOUD COMPUTING (TE7948)

const cloudUnits: Unit[] = [
  makeUnit('cloud', 1, 'Overview of Cloud Computing', 10, [
    ['Overview of Cloud Computing', ['On-demand self-service', 'Elasticity, pay-as-you-go', 'Service models overview']],
    ['Cloud Architecture', ['Reference architecture components', 'Data centre building blocks']],
    ['Layers in Cloud Architecture', ['Hardware, virtualization, management, service layers']],
    ['Software as a Service (SaaS)', ['Browser-delivered applications', 'Multi-tenancy']],
    ['Features and Benefits of SaaS', ['Automatic updates', 'Any-device access', 'Cost benefits']],
    ['Platform as a Service (PaaS)', ['Deploy-and-go runtime', 'Managed middleware']],
    ['Features and Benefits of PaaS', ['Faster development', 'Scalable runtimes', 'Focus on code']],
    ['Infrastructure as a Service (IaaS)', ['VMs, storage, networks', 'Raw compute as a service']],
  ]),
  makeUnit('cloud', 2, 'Virtualization', 10, [
    ['Implementation Levels of Virtualization', ['Hardware, OS, library, application-level virtualization']],
    ['Virtualization Structure, Tools and Mechanisms', ['VMM structure', 'Trap-and-emulate', 'Resource control']],
    ['Hypervisor', ['Type 1 vs Type 2', 'Guest isolation', 'Scheduling']],
    ['Xen Architecture', ['Dom0 and DomU', 'Paravirtualized guest interface', 'Xen hypervisor design']],
    ['Binary Translation with Full Virtualization', ['Dynamic code rewriting', 'Privileged instruction handling']],
    ['Para Virtualization', ['Guest kernel modification', 'Hypercalls', 'Performance trade-off']],
    ['Cloud Programming', ['Programming models for virtualized infrastructures']],
    ['Open Source Cloud Implementation', ['OpenStack and KVM', 'Community cloud platforms']],
  ]),
  makeUnit('cloud', 3, 'Cloud Architecture and Models', 10, [
    ['Architecture for Cloud Applications', ['Cloud-native building blocks', 'Reference application architecture']],
    ['Cloud Application Requirements', ['Scalability, availability, multi-tenancy', 'Stateless design']],
    ['SOA for Cloud Applications', ['Services and contracts', 'Loose coupling', 'ESB and APIs']],
    ['Parallelization within Cloud Applications', ['Task and data parallelism', 'MapReduce-style workloads']],
    ['Multi-tier Application Architecture', ['Presentation, business, data tiers', 'Horizontal scaling']],
    ['Study of Cloud Tools and Platforms', ['AWS, Azure, GCP', 'Containers and serverless', 'Cloud simulation tools']],
  ]),
  makeUnit('cloud', 4, 'Cloud Security', 10, [
    ['Introduction to Cloud Security', ['Shared responsibility model', 'CIA triad in the cloud', 'Threat landscape']],
    ['Cloud Security Posture Management (CSPM)', ['Misconfiguration detection', 'Continuous compliance', 'Policy automation']],
    ['Single Sign-On (SSO) Authentication', ['One login, many services', 'SAML, OAuth, OIDC flows', 'Identity providers']],
  ]),
  makeUnit('cloud', 5, 'High Performance Computing', 5, [
    ['High Performance Computing on Cloud', ['HPC workloads on cloud', 'Burst computing', 'Interconnects']],
    ['Load Balancing', ['L4/L7 balancing', 'Round-robin, least connections', 'Health checks']],
    ['Resource Utilization', ['CPU, memory, I/O metrics', 'Right-sizing and autoscaling']],
    ['Mini Project on Implementation of Cloud', ['Plan, provision, deploy, evaluate a cloud application']],
  ]),
];

// ============================================================ subjects

export const SUBJECTS: Subject[] = [
  {
    id: 'dl',
    name: 'Deep Learning',
    code: 'TE7753',
    credits: 3,
    level: 2,
    hours: 45,
    examDate: '2026-11-17',
    examStart: '09:30',
    examEnd: '11:30',
    objectives: [
      'Discuss various Deep Learning concepts, principles and algorithms',
      'Describe all concepts related to NN useful for DL applications',
      'Summarize various DL models and deep NN',
      'Give examples of various optimization algorithms',
      'Discuss and extend CNN and RNN concepts',
    ],
    books: [
      { title: 'Introduction to Deep Learning', author: 'Eugene Charniak', publisher: 'MIT Press' },
      { title: 'Deep Learning with Keras', author: 'Antonio Gulli, Sujit Pal', publisher: 'Packt.com' },
    ],
    units: dlUnits,
  },
  {
    id: 'cn',
    name: 'Computer Networks',
    code: 'T7908',
    credits: 3,
    level: 4,
    hours: 45,
    examDate: '2026-11-19',
    examStart: '09:30',
    examEnd: '11:30',
    objectives: [
      'Get familiar with the basics of networking, Internet, protocols and layered architecture',
      'Learn application layer protocols: DNS, HTTP, FTP and SMTP',
      'Learn transport layer protocols TCP and UDP, flow and congestion control',
      'Learn network layer protocol Internet Protocol and routing protocols/algorithms',
      'Learn error detection, error correction and reliable transmission algorithms',
      'Study various IEEE standards for wired and wireless networks',
    ],
    books: [
      { title: 'An Engineering Approach to Computer Networking', author: 'S. Keshav', publisher: 'Pearson Education' },
      { title: 'Computer Networks, 4th Edition', author: 'Tanenbaum', publisher: 'PHI' },
      { title: 'Data Communications and Networking, 3rd Edition', author: 'Behrouz Forouzan', publisher: 'Tata McGraw Hill' },
      { title: 'Network Security Essentials, 3rd Edition', author: 'William Stallings', publisher: 'Pearson' },
    ],
    units: cnUnits,
  },
  {
    id: 'nlp',
    name: 'Natural Language Processing',
    code: 'TEE7101',
    credits: 3,
    level: 4,
    hours: 45,
    examDate: '2026-11-24',
    examStart: '09:30',
    examEnd: '11:30',
    objectives: [
      'Learn the fundamental concepts associated with NLP from an ML perspective',
      'Learn how to parse or analyse the input given using natural language',
      'Implement and validate NLP methods and their variants for specific applications',
      'Compare and contrast approaches to NLP',
    ],
    books: [
      { title: 'Natural Language Understanding, 2nd Edition', author: 'James Allen', publisher: 'Benjamin/Cumming, 1995' },
      { title: 'Statistical Language Learning', author: 'Eugene Charniak', publisher: 'MIT Press, 1993' },
      { title: 'Speech and Language Processing, 2nd Edition', author: 'Dan Jurafsky, James Martin', publisher: 'Prentice Hall, 2008' },
      { title: 'Foundations of Statistical Natural Language Processing', author: 'Christopher Manning, Hinrich Schütze', publisher: 'MIT Press, 1999' },
      { title: 'Linguistics: An Introduction', author: 'Andrew Radford et al.', publisher: 'Cambridge University Press, 1999' },
    ],
    units: nlpUnits,
  },
  {
    id: 'cloud',
    name: 'Introduction to Cloud Computing',
    code: 'TE7948',
    credits: 3,
    level: 3,
    hours: 45,
    examDate: '2026-11-26',
    examStart: '09:30',
    examEnd: '11:30',
    objectives: [
      'Explain the core concepts of the cloud computing paradigm',
      'Learn characteristics, advantages and challenges in virtualization of cloud computing',
      'Apply fundamental concepts in cloud implementation to understand tradeoffs in power, efficiency and cost',
      'Explore the cloud simulation tools available in cloud programming',
    ],
    books: [
      { title: 'Cloud Computing: Principles and Paradigms', author: 'Rajkumar Buyya', publisher: 'Wiley' },
      { title: 'Cloud Computing: Methodology, Systems, and Applications', author: 'Lizhe Wang, Rajiv Ranjan, Jinjun Chen, Boualem Benatallah', publisher: 'CRC Press' },
      { title: 'Novel Practices and Trends in Grid and Cloud Computing', author: 'Pethuru Raj, S. Koteeswaran', publisher: 'IGI Global' },
      { title: 'Programming Amazon EC2', author: 'Jurg van Vliet, Flavia Paganelli', publisher: "O'Reilly" },
      { title: 'The Cloud Computing Book', author: 'D. Comer', publisher: 'CRC Press' },
    ],
    units: cloudUnits,
  },
];

export const SUBJECT_MAP: Record<SubjectId, Subject> = Object.fromEntries(
  SUBJECTS.map((s) => [s.id, s]),
) as Record<SubjectId, Subject>;

export const ALL_TOPICS: Topic[] = SUBJECTS.flatMap((s) => s.units.flatMap((u) => u.topics));

export const TOPIC_MAP: Record<string, Topic> = Object.fromEntries(ALL_TOPICS.map((t) => [t.id, t]));

export const UNIT_COUNT = SUBJECTS.reduce((n, s) => n + s.units.length, 0);
export const TOPIC_COUNT = ALL_TOPICS.length;

const UNIT_MAP: Record<string, Unit> = Object.fromEntries(
  SUBJECTS.flatMap((s) => s.units.map((u) => [u.id, u])),
);

/** Accepts either a unit id (`dl-u2`) or a topic id (`dl-u2-t3`) and returns the owning unit. */
export function unitOf(id: string): Unit | undefined {
  const byTopic = TOPIC_MAP[id];
  if (byTopic) return UNIT_MAP[byTopic.unitId];
  return UNIT_MAP[id];
}

export function topicName(topicId: string): string {
  return TOPIC_MAP[topicId]?.name ?? topicId;
}
