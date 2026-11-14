// EXAMFORGE — Deep Learning Answer Master source text.
// Verbatim extracted text of `Deep_Learning_Question_Bank(2).docx` (20,798 characters).
// It is parsed at runtime by `parse.ts` so numbering, wording and order are preserved exactly.
// Do not edit the questions here: the document is the source of truth.

export const QUESTION_BANK_SOURCE = `**DEEP LEARNING QUESTION BANK**

_Comprehensive Question Bank_

**Numerical Problem 1 — Perceptron Output**

A perceptron has:

w1 = 0.4, w2 = -0.6, b = 0.2.

For input x1 = 2, x2 = 3, calculate the weighted sum and output using the step activation function:

f(z) = 1 if z ≥ 0, and 0 otherwise.

**Numerical Problem 2 — Perceptron Weight Update**

Consider a perceptron with w = [0.2, -0.4], b = 0.1, input x = [1, 2], desired output y = 1, and learning rate η = 0.1. Calculate the updated weights and bias using the perceptron learning rule.

**Numerical Problem 3 — Multiple Perceptron Updates**

Train the following perceptron for one epoch.

x1 x2 Target

0 0 0

0 1 0

1 0 0

1 1 1

Use w1 = w2 = 0, b = 0, η = 1. Perform all weight updates.

**Numerical Problem 4 — Linear Classification**

Given z = 2x1 + 3x2 - 5, determine the predicted class for:

(1,1), (2,1), (0,2), and (3,0), using a threshold at zero.

**Numerical Problem 5 — Decision Boundary**

For a perceptron z = 4x1 - 2x2 + 6, derive its decision boundary and determine which side corresponds to class 1.

1. Define Artificial Intelligence, Machine Learning, and Deep Learning. Explain the relationship among them.

2. What is an Artificial Neural Network (ANN)?

3. Why are neural networks called "neural" networks?

4. Differentiate between AI, ML, and DL with suitable examples.

5. What are the major differences between traditional machine learning and deep learning?

6. Why has deep learning become successful primarily during the last decade?

7. Explain the role of big data, GPUs, improved optimization algorithms, better activation functions, and improved hardware in the success of deep learning.

8. Explain the concept of representation learning.

9. What does it mean to "go deep" in neural networks?

10. Why can a deep neural network learn more complex functions than a shallow network?

11. Explain hierarchical feature learning.

12. Explain the evolution of neural networks from perceptrons to modern deep neural networks.

13. Briefly discuss the major milestones in the history of AI and neural networks.

14. What led to the decline of neural-network research during the AI winters?

15. What factors contributed to the resurgence of neural networks?

16. Explain why GPUs are particularly useful for deep learning.

17. List at least five real-world applications of deep learning.

18. Explain how deep learning is used in computer vision.

19. Explain how deep learning is used in natural language processing.

20. Explain how deep learning is used in speech recognition.

21. Explain the role of deep learning in recommendation systems.

22. What are the major challenges associated with deep learning?

23. Why does deep learning generally require large amounts of training data?

24. Why are deep neural networks computationally expensive?

25. What is the interpretability problem in deep learning?

26. Explain the difference between training, validation, and test data.

27. What is overfitting? Why is it particularly important in deep learning?

28. What is underfitting?

29. Explain the bias-variance trade-off in the context of neural networks.

30. What is an end-to-end learning system?

31. Draw and explain the structure of a biological neuron.

32. Explain the functions of dendrites, cell body, axon, and synapse.

33. Compare a biological neuron with an artificial neuron.

34. What are the limitations of the biological-neuron analogy in ANN design?

35. Explain the mathematical model of an artificial neuron.

36. Define a perceptron.

37. Explain the architecture of a single-layer perceptron.

38. Derive the mathematical equation of a perceptron.

39. What is the role of the bias term?

40. Explain the perceptron learning algorithm.

41. State and explain the perceptron convergence theorem.

42. What type of problems can a single-layer perceptron solve?

43. Why can't a single-layer perceptron solve XOR?

44. Explain linear separability with an example.

45. Differentiate between a perceptron and a modern neuron using differentiable activation functions.

46. Define a shallow neural network.

47. Explain the architecture of a single-hidden-layer neural network.

48. What is the difference between a single-layer network and a single-hidden-layer network?

49. Explain the universal approximation theorem.

50. Does the universal approximation theorem imply that deep networks are unnecessary? Explain.

51. Explain why depth can be preferable to width.

52. What is a feed-forward neural network?

53. Explain information flow in a feed-forward neural network.

54. Differentiate between feed-forward and recurrent neural networks.

55. Explain the role of hidden layers.

56. What is an activation function?

57. Why are activation functions necessary in neural networks?

58. What would happen if every layer used only a linear activation function?

59. Explain the sigmoid function.

60. Explain the tanh function.

61. Explain ReLU.

62. Explain Leaky ReLU.

63. Compare sigmoid, tanh, ReLU and Leaky ReLU.

64. What is the vanishing-gradient problem?

65. Why does ReLU generally perform better than sigmoid in hidden layers?

66. What is the dying-ReLU problem?

67. When would sigmoid be appropriate?

68. Why is softmax commonly used in multiclass classification?

69. Calculate the sigmoid output for z = -2, 0, and 2 using σ(z)=1/(1+e^-z).

70. Calculate the derivative of sigmoid at z = 0, 2, and -2 using σ'(z)=σ(z)(1-σ(z)).

71. For z = [-3,-1,0,2,4], calculate the ReLU outputs.

72. Calculate Leaky ReLU outputs for z = [-3,-1,0,2] with negative slope 0.01.

73. Calculate the softmax probabilities for z = [2,1,0] and verify that the probabilities sum to 1.

74. What is a loss function?

75. Why is a loss function necessary for training a neural network?

76. Explain Mean Squared Error.

77. Explain Binary Cross-Entropy.

78. Explain Categorical Cross-Entropy.

79. Explain why cross-entropy is preferred over MSE for classification.

80. What loss function would you select for binary classification, multiclass classification, and regression?

81. Explain the relationship between logits, sigmoid, softmax and cross-entropy.

82. Differentiate between loss and cost function.

83. What is empirical risk minimization?

84. Calculate MSE for actual values y=[1,0,1] and predictions ŷ=[0.8,0.2,0.6].

85. For y=1 and ŷ=0.8, calculate binary cross-entropy.

86. Calculate BCE for y=0, ŷ=0.2 and compare it with y=0, ŷ=0.8. Explain the difference.

87. The true class is class 2 and predicted probabilities are [0.1,0.7,0.2]. Calculate categorical cross-entropy.

88. Explain forward propagation.

89. Write the mathematical equations for forward propagation through a two-layer network.

90. Explain the role of weights and biases.

91. Explain how a neural network transforms input data through successive layers.

92. What is a logit?

93. What is the difference between a neuron's weighted sum and activated output?

94. Computational Graph Problem 1: Consider z=xw+b, a=σ(z), and L=(a-y)^2. Given x=2, w=0.5, b=0, y=1, calculate z, a, L, ∂L/∂a, ∂a/∂z, ∂z/∂w, and ∂L/∂w.

95. Computational Graph Problem 2: Consider a=x1w1+x2w2+b, z=ReLU(a), and L=1/2(z-y)^2. Given x1=2, x2=3, w1=0.5, w2=-0.2, b=0.1, and y=2, draw the computational graph and calculate all intermediate values and gradients.

96. Computational Graph Problem 3: Given u=2x, v=u^2, and L=3v for x=2, calculate dL/dx using the chain rule.

97. Computational Graph Problem 4: Given a=x1+x2, b=x1x2, c=a^2, and L=c+b, calculate ∂L/∂x1 and ∂L/∂x2 for x1=2 and x2=3.

98. Computational Graph Problem 5: Given a=xw+b, h=ReLU(a), and L=(h-y)^2, with x=-2, w=3, b=1, y=2, determine whether gradients propagate through the ReLU and calculate ∂L/∂w.

99. What is backpropagation?

100. Why is the chain rule fundamental to backpropagation?

101. Explain forward propagation and backpropagation using a computational graph.

102. Derive the gradient of a single neuron with respect to its weight.

103. Derive the backpropagation equations for a two-layer network.

104. Explain the difference between local gradients and global gradients.

105. What is gradient flow?

106. What is the exploding-gradient problem?

107. How do activation functions affect gradient propagation?

108. Explain the role of the learning rate in backpropagation.

109. Backpropagation Numerical Problem 1: A neuron uses sigmoid activation and binary cross-entropy. Given x=2, w=0.4, b=0.1, y=1, calculate z, prediction, loss, ∂L/∂z, ∂L/∂w, and ∂L/∂b.

110. Backpropagation Numerical Problem 2: Consider h=σ(W1x+b1) and ŷ=σ(W2h+b2). Given numerical values for x, W1, b1, W2, b2, and y, calculate ∂L/∂W1 using the chain rule.

111. What is optimization and why is it necessary in neural networks?

112. Explain gradient descent.

113. Explain batch gradient descent.

114. Explain stochastic gradient descent.

115. Explain mini-batch gradient descent.

116. Compare batch GD, SGD and mini-batch GD.

117. What is the learning rate?

118. What happens when the learning rate is too small or too large?

119. Explain momentum-based gradient descent.

120. Explain the intuition behind momentum.

121. Explain AdaGrad.

122. Explain RMSProp.

123. Explain Adam.

124. Compare SGD, Momentum, RMSProp and Adam.

125. What are adaptive learning-rate methods?

126. What is learning-rate scheduling?

127. Explain exponential learning-rate decay.

128. Explain cosine learning-rate decay.

129. What is a local minimum?

130. What is a saddle point?

131. Why are saddle points important in high-dimensional optimization?

132. What is a loss landscape?

133. Optimization Numerical Problem 1: Given f(w)=(w-5)^2, starting with w0=1 and learning rate η=0.1, perform five gradient-descent updates.

134. Optimization Numerical Problem 2: Given f(w)=3w^2-4w+2, derive df/dw and perform three gradient descent updates starting from w0=2 with η=0.05.

135. Optimization Numerical Problem 3: L(w1,w2)=w1^2+2w2^2. Starting from (w1,w2)=(4,3) with learning rate 0.1, perform three gradient-descent iterations.

136. Optimization Numerical Problem 4: Given gt=4, vt-1=2, momentum coefficient β=0.9 and learning rate η=0.1, calculate the new velocity and parameter update using a specified momentum convention.

137. Optimization Numerical Problem 5: Given gt=0.4, mt-1=0.1, vt-1=0.05, β1=0.9, β2=0.999, calculate the first-moment estimate, second-moment estimate, bias-corrected estimates, and parameter update for Adam.

138. What is regularization?

139. Why is regularization necessary?

140. Explain L1 regularization.

141. Explain L2 regularization.

142. Compare L1 and L2 regularization.

143. Why does L1 regularization encourage sparsity?

144. Explain weight decay.

145. What is the difference between L2 regularization and weight decay in modern optimizers?

146. Explain early stopping.

147. How does early stopping act as a form of regularization?

148. Explain data augmentation as a regularization technique.

149. Explain dropout.

150. Why does dropout reduce overfitting?

151. Explain inverted dropout.

152. What happens to dropout during inference?

153. What is the effect of increasing dropout probability?

154. Regularization Numerical Problem 1: Given Ldata=2.5, w=[2,-3,1], and λ=0.1, calculate L=Ldata+(λ/2)Σwi².

155. Regularization Numerical Problem 2: Given Ldata=1.5, w=[2,-4,1], and λ=0.2, calculate L=Ldata+λΣ|wi|.

156. Regularization Numerical Problem 3: Given L(w)=Ldata(w)+(λ/2)w², ∂Ldata/∂w=3, w=4, and λ=0.2, calculate ∂L/∂w.

157. Dropout Problem 1: A neural network has 10 neurons in a hidden layer. During training, dropout probability is p=0.4. What is the expected number of active neurons, expected number of dropped neurons, and what happens during inference?

158. Dropout Problem 2: A hidden layer produces h=[2,4,6,8]. Dropout probability is p=0.5 and mask m=[1,0,1,0]. Calculate the output after inverted dropout.

159. Define a feed-forward neural network.

160. Draw a fully connected feed-forward neural network with 4 input neurons, 5 hidden neurons, and 3 output neurons.

161. Calculate the total number of trainable parameters in a fully connected network.

162. Derive a general formula for the number of parameters in a fully connected network.

163. Explain why biases are trainable parameters.

164. What is the difference between parameters and hyperparameters?

165. List important hyperparameters of a neural network.

166. Explain batch size, epochs and iterations.

167. What is an epoch?

168. What is a mini-batch?

169. What is the difference between training parameters and hyperparameters?

170. Parameter-Count Numerical Problem 1: A network has 10 input neurons, 8 hidden neurons, 5 hidden neurons, and 3 output neurons. All layers are fully connected and include biases. Calculate the total number of trainable parameters.

171. Parameter-Count Numerical Problem 2: A network has architecture 20→50→100→10. Calculate the number of weights, biases, and total trainable parameters.

172. Parameter-Count Numerical Problem 3: You need to classify images into 10 classes, with 784 input features. Design a fully connected network with two hidden layers of your choice, calculate total parameters, and explain your choice.

173. Explain the computational cost of a fully connected layer.

174. Derive the approximate number of multiplication operations required for a dense layer.

175. How does increasing the number of neurons affect computational cost?

176. How does batch size affect computational cost?

177. Explain why matrix multiplication is central to deep learning.

178. Explain why GPUs accelerate neural-network training.

179. Differentiate binary and multiclass classification.

180. Explain multiclass classification using softmax.

181. Explain one-vs-rest classification.

182. Explain the difference between classification and regression.

183. Explain precision, recall, F1-score and accuracy.

184. When is accuracy a poor evaluation metric?

185. Explain the confusion matrix.

186. What is class imbalance?

187. How can class imbalance be handled?

188. Explain the ROC curve and AUC.

189. Explain the difference between macro and micro averaging.

190. Application Problem 1: You are given a dataset containing student information and the objective is to predict whether a student will pass or fail. Design an ANN-based solution and discuss input features, network architecture, activation functions, loss function, optimizer, and evaluation metrics.

191. Application Problem 2: You are given a Kaggle binary-classification dataset. Design a complete deep-learning pipeline from raw dataset to final evaluation.

192. Application Problem 3: A Kaggle dataset has 100,000 samples and 50 features. Explain how you would divide the dataset into training, validation, and test sets.

193. Application Problem 4: A dataset has 95% class-0 samples and 5% class-1 samples. Explain why accuracy is misleading and propose suitable evaluation metrics.

194. Application Problem 5: Your training accuracy is 99%, while validation accuracy is 72%. Identify the likely problem and propose at least five possible solutions.

195. Application Problem 6: Training and validation losses are both high. What could be the reasons?

196. Application Problem 7: Training loss decreases while validation loss initially decreases and then increases. Explain what is happening.

197. Application Problem 8: A network performs extremely well on training data but poorly on unseen data. Explain the problem and suggest remedies.

198. Application Problem 9: A deep network has very slow learning in its early layers. Explain possible causes.

199. Why can a neural network with nonlinear activation functions represent nonlinear decision boundaries?

200. Explain why stacking linear layers without nonlinear activations does not increase representational power.

201. Why does increasing depth sometimes make optimization more difficult?

202. Why does sigmoid suffer from saturation?

203. Explain vanishing gradients mathematically.

204. Explain why ReLU partially addresses the vanishing-gradient problem.

205. Why can ReLU neurons die?

206. Explain the relationship between initialization and gradient propagation.

207. Why should weights generally not be initialized to the same value?

208. Explain symmetry breaking in neural networks.

209. Why is random initialization necessary?

210. Explain the relationship between batch size and gradient noise.

211. Why can noisy gradients sometimes help optimization?

212. Explain the difference between optimization error and generalization error.

213. Explain why a larger network can sometimes generalize better despite having more parameters.

214. Why does dropout approximately correspond to training an ensemble of subnetworks?

215. Explain the relationship between regularization and model complexity.

216. Why is cross-entropy particularly suitable for probabilistic classification?

217. Explain why softmax outputs can be interpreted as probabilities.

218. Explain the relationship between logits and softmax probabilities.

219. Comprehensive Problem 1: A neuron uses sigmoid activation and binary cross-entropy. Given x=3, w=0.2, b=-0.1, y=1, and η=0.1, perform one complete training step: forward pass, prediction, loss, gradients, weight and bias updates, and new prediction.

220. Comprehensive Problem 2: Consider h1=ReLU(w1x+b1), h2=ReLU(w2h1+b2), ŷ=w3h2+b3, and L=1/2(ŷ-y)^2. Given numerical values for all parameters and x,y, draw the computational graph, perform forward propagation, calculate loss, calculate every parameter gradient, and perform one gradient-descent update.

221. Comprehensive Problem 3: Consider a=w1x+b1, h=σ(a), z=w2h+b2, ŷ=σ(z), and L=-[y log ŷ+(1-y)log(1-ŷ)]. For given numerical values, draw the computational graph, calculate all intermediate variables, calculate L, calculate all local derivatives, derive ∂L/∂w2 and ∂L/∂w1, and update both weights.

222. Comprehensive Problem 4: Consider L(w)=w² starting with w=10. Compare the behavior of SGD, Momentum, RMSProp, and Adam for several iterations. Discuss why their trajectories may differ.

223. Comprehensive Problem 5: A neural network produces:

Epoch: 1,5,10,20,30,40

Training loss: 1.20,0.70,0.40,0.15,0.05,0.01

Validation loss: 1.30,0.80,0.60,0.70,1.10,1.50.

Answer: at approximately which epoch does overfitting begin, what evidence supports it, would you use early stopping, suggest three other techniques to improve generalization, and sketch the expected training and validation loss curves.

224. Comprehensive Problem 6: A company wants to predict whether a customer will purchase a product. The dataset contains 50,000 customers, 30 numerical features, a binary target, and approximately 15% positive samples. Design a complete ANN solution specifying data preprocessing, train/validation/test split, architecture, activation functions, output layer, loss function, optimizer, learning rate, batch size, regularization, dropout, evaluation metrics, overfitting strategy, and hyperparameter tuning strategy.

225. Long-Answer Problem 1: Given a two-layer neural network, perform a complete forward and backward pass, including calculation of all gradients and one parameter update.

226. Long-Answer Problem 2: Compare SGD, Momentum, RMSProp, and Adam mathematically and explain when each optimizer is useful.

227. Long-Answer Problem 3: Given a computational graph containing multiplication, addition, activation, and loss operations, calculate the gradient of the loss with respect to every parameter.

228. Long-Answer Problem 4: Given a neural network architecture, calculate the number of trainable parameters and estimate the computational complexity of a forward pass.

229. Long-Answer Problem 5: Given training and validation loss curves, diagnose underfitting, overfitting, good fitting, and optimization problems.

230. Long-Answer Problem 6: For a given binary-classification dataset, design an ANN and justify the choice of architecture, activation function, loss function, and optimizer.

231. Long-Answer Problem 7: Explain backpropagation from first principles using the chain rule and demonstrate it numerically on a two-layer network.

232. Long-Answer Problem 8: Compare sigmoid, tanh, ReLU, and Leaky ReLU mathematically, including their derivatives, advantages, disadvantages, and suitability for different layers.

233. Long-Answer Problem 9: Explain regularization comprehensively by comparing L1, L2, dropout, early stopping, and data augmentation.

234. Long-Answer Problem 10: A neural network is suffering from vanishing gradients and overfitting simultaneously. Propose a systematic strategy to address both problems and justify each modification.
`;
