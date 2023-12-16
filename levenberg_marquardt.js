function levenbergMarquardt(residuals_func, initialGuess, options) {
    options = options || {};
    damping = options.damping || 1e-2;
    const maxIterations = options.maxIterations || 100;
    const errorTolerance = options.errorTolerance || 1e-6;

    let parameters = math.clone(initialGuess);
    let iteration = 0;

    while (iteration < maxIterations) {
        const residuals = residuals_func(parameters);
        const jacobian = computeJacobian(residuals_func, parameters);
        const error = computeError(residuals);

        if (error < errorTolerance) {
            break; // Converged
        }

        const lhs = math.add(math.multiply(math.transpose(jacobian), jacobian), math.multiply(damping, math.identity(parameters.length)));
        const rhs = math.multiply(math.transpose(jacobian), residuals);

        const step = math.lusolve(lhs, rhs);

        const newParameters = math.subtract(parameters, math.flatten(step)).toArray();

        const newResiduals = residuals_func(newParameters);
        const newError = computeError(newResiduals);
        console.log("newError: ", newError);

        if (newError < error) {
            damping /= 10; // Decrease damping for better convergence
            parameters = newParameters;
        } else {
            damping *= 10; // Increase damping for stability
        }

        iteration++;
    }

    return {
        x_opt: parameters,
        iterations: iteration,
    };
}

function computeJacobian(residuals_func, parameters) {
    const epsilon = 1e-6;
    const numParameters = parameters.length;
    residuals =  residuals_func(parameters)
    const numResiduals = residuals.length;

    const jacobian = math.zeros(numResiduals, numParameters);

    for (let i = 0; i < numParameters; i++) {
        const perturbation = math.zeros(numParameters);
        perturbation.set([i], epsilon);

        const perturbedParams = math.add(parameters, perturbation).toArray();
        const perturbedResiduals = residuals_func(perturbedParams);

        const column = math.divide(math.subtract(perturbedResiduals, residuals_func(parameters)), epsilon);

        for (let j = 0; j < numResiduals; j++) {
            jacobian.set([j, i], column[j]);
        }
    }

    return jacobian;
}

function computeError(residuals) {
    return math.norm(residuals, 2); // L2 norm (Euclidean norm)
}