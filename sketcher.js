
function fitCircleToPolylineInit(points) {
    const A = math.concat(
        points.map(point => [point.x, point.y, 1]),
        0
    );
    const B = math.add(
        math.dotPow(points.map(point => point.x), 2),
        math.dotPow(points.map(point => point.y), 2)
    );
    const X = math.multiply(math.inv(math.multiply(math.transpose(A), A)), math.transpose(A), B);
    const cx = X[0] / 2;
    const cy = X[1] / 2;
    const r = math.sqrt(4 * X[2] + X[0] ** 2 + X[1] ** 2) / 2;
    return { cx, cy, r };
}


function fitCircleToPolyline(polyline) {
    const initialGuess = fitCircleToPolylineInit(polyline)
    // Define the objective function to minimize
    const residuals_fun = params => {
        const [cx, cy, R] = params;
        // Compute the residuals (distances) for each point
        residuals = polyline.map(point => {

            return Math.sqrt((point.x - cx) ** 2 + (point.y - cy) ** 2) - R;
        });
        return residuals
    };


    // Options for the Levenberg-Marquardt algorithm
    const options = {
        damping: 1.5,  // Adjust as needed
        maxIterations: 100,
        errorTolerance: 1e-6,
    };

    // Perform the optimization
    initialGuess_vec = [initialGuess.cx, initialGuess.cy, initialGuess.r]
    const result = levenbergMarquardt(residuals_fun, initialGuess_vec, options);


    // Extract the optimized circle parameters
    const [cx, cy, r] = result.x_opt;

    return { cx, cy, r };
}

function fitSquareToPoints(points) {
    const xValues = points.map(point => point.x);
    const yValues = points.map(point => point.y);

    const initialGuess = [
        math.mean(xValues),
        math.mean(yValues),
        math.max(math.abs(xValues - math.mean(xValues))) / 2
    ];

    const result = math.nlp.optimize({
        objective: function (params) {
            const [cx, cy, halfSide] = params;
            const residuals = points.map(point => Math.abs(point.x - cx) - halfSide).concat(
                points.map(point => Math.abs(point.y - cy) - halfSide)
            );
            return math.norm(residuals, 2); // L2 norm (Euclidean norm)
        },
        x0: initialGuess,
        method: 'levenberg-marquardt'
    });

    const [cx, cy, halfSide] = result.x;
    return { cx, cy, sideLength: 2 * halfSide };
}



function calculateNonCenteredMoments(polygon) {
    const n = polygon.length;

    let m00 = 0;
    let m10 = 0;
    let m01 = 0;
    let mu20 = 0;
    let mu02 = 0;
    let mu11 = 0;

    for (let i = 0; i < n; i++) {
        const point1 = polygon[i];
        const point2 = polygon[(i + 1) % n]; // Connects the last point to the first point

        // Analytical calculation of line segment moments
        const dx = point2[0] - point1[0];
        const dy = point2[1] - point1[1];
        const length = Math.sqrt(dx * dx + dy * dy);

        // Centroid of the line segment
        const cx = (point1[0] + point2[0]) / 2;
        const cy = (point1[1] + point2[1]) / 2;

        m00 += length;
        m10 += length * cx;
        m01 += length * cy;

        mu20 += length * (dx * dx);
        mu02 += length * (dy * dy);
        mu11 += length * (dx * dy);
    }

    return { m00, m10, m01, mu20, mu02, mu11 };
}

function calculateCenteredMoments(polygon) {
    const n = polygon.length;

    const { m00, m10, m01, mu20, mu02, mu11 } = calculateNonCenteredMoments(polygon);

    const centerX = m10 / m00;
    const centerY = m01 / m00;

    // Convert non-centered moments to centered moments
    const centeredMu20 = mu20 - m00 * (centerY ** 2);
    const centeredMu02 = mu02 - m00 * (centerX ** 2);
    const centeredMu11 = mu11 - m00 * centerX * centerY;

    return { centerX, centerY, mu20: centeredMu20, mu02: centeredMu02, mu11: centeredMu11 };
}







function calculateAngleBetweenSegments(segment1, segment2) {
    const vector1 = [segment1[1].x - segment1[0].x, segment1[1].y - segment1[0].y];
    const vector2 = [segment2[1].x - segment2[0].x, segment2[1].y - segment2[0].y];

    const dotProduct = vector1[0] * vector2[0] + vector1[1] * vector2[1];
    const magnitude1 = Math.sqrt(vector1[0] ** 2 + vector1[1] ** 2);
    const magnitude2 = Math.sqrt(vector2[0] ** 2 + vector2[1] ** 2);

    const cosineTheta = dotProduct / (magnitude1 * magnitude2);

    // Handle potential numerical precision issues
    const clampedCosineTheta = Math.max(-1, Math.min(1, cosineTheta));

    const angleRadians = Math.acos(clampedCosineTheta);

    // Convert radians to degrees
    const angleDegrees = (angleRadians * 180) / Math.PI;

    return angleDegrees;
}
function calculatePointToLineDistance(point, lineStart, lineEnd) {

    const numerator = Math.abs((lineEnd.x - lineStart.x) * (lineStart.y - point.y) - (lineStart.x - point.x) * (lineEnd.y - lineStart.y));
    const denominator = Math.sqrt((lineEnd.x - lineStart.x) ** 2 + (lineEnd.y - lineStart.y) ** 2);

    const distance = numerator / denominator;
    return distance;
}

function calculatePointToPointDistance(point1, point2) {
    const distance = Math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2);
    return distance;
}



function detectConstraintsCandidates(polygon) {

    const numVertices = polygon.length;
    angle_tolerance = 10
    distance_tolerance = 10
    detected_constraints = []

    // detect horizontal and vertical constraints
    vertical_vector = [{ x: 0, y: 0 }, { x: 0, y: 1 }]
    for (let i = 0; i < numVertices - 1; i++) {
        const segment = [polygon[i], polygon[i + 1]];
        angle = calculateAngleBetweenSegments(segment, vertical_vector)
        cost = Math.min(Math.abs(angle), Math.abs(angle - 180))
        if (cost < angle_tolerance) {
            detected_constraints.push({ type: "vertical", cost, i })
        }
        cost = Math.abs(Math.abs(angle) - 90)
        if (cost < angle_tolerance) {
            detected_constraints.push({ type: "horizontal", cost, i })
        }
    }

    // detect constraints between pairs of segments
    for (let i = 0; i < numVertices - 2; i++) {
        for (let j = i + 1; j < numVertices - 1; j++) {

            const segment_1 = [polygon[i], polygon[i + 1]];
            const segment_2 = [polygon[j], polygon[j + 1]];

            angle = calculateAngleBetweenSegments(segment_1, segment_2)

            cost = Math.min(Math.abs(angle), Math.abs(angle - 180)) / angle_tolerance
            if (cost < 1) {
                detected_constraints.push({ type: "parallel", cost, i, j })
            }
            cost = Math.abs(Math.abs(angle) - 90)
            if (cost < 1) {
                detected_constraints.push({ type: "orthogonal", cost, i, j })
            }

            d1=calculatePointToPointDistance(polygon[i], polygon[i + 1])
            d2=calculatePointToPointDistance(polygon[j], polygon[j + 1])
            cost = Math.abs(Math.abs(d1-d2))/distance_tolerance
            if (cost < 1) {
                detected_constraints.push({ type: "equal_length", cost, i, j })
            }
        }
    }

    // detect point to line contact constrains
    for (let i = 0; i < numVertices; i++) {
        for (let j = 0; j < numVertices - 1; j++) {
            if (!((i == j) || (i == j + 1))) {
                distance = calculatePointToLineDistance(polygon[i], polygon[j], polygon[j + 1])
                cost = distance / distance_tolerance
                if (cost < 1) {
                    detected_constraints.push({ type: "point_line_contact", cost, i, j })
                }
            }
        }
    }

    // detect point to point contact constrains
    for (let i = 0; i < numVertices; i++) {
        for (let j = 0; j < numVertices; j++) {
            if (!(i == j)) {
                distance = calculatePointToPointDistance(polygon[i], polygon[j])
                cost = distance / distance_tolerance
                if (cost < 1) {
                    detected_constraints.push({ type: "point_point_contact", cost, i, j })
                }
            }
        }
    }

    return detected_constraints
}


function constraintsResiduals(polygon, constraints) {
    numconstraints = constraints.length
    residuals = []
    for (let constraint_idx = 0; constraint_idx < numconstraints; constraint_idx++) {
        const constraint = constraints[constraint_idx]

        switch (constraint.type) {
            case "vertical":
                {
                    const i = constraint.i
                    const segment = [polygon[i], polygon[i + 1]];
                    angle = calculateAngleBetweenSegments(segment, vertical_vector);
                    cost = Math.min(Math.abs(angle), Math.abs(angle - 180));
                }
                break;
            case "horizontal":
                {
                    const i = constraint.i
                    const segment = [polygon[i], polygon[i + 1]];
                    angle = calculateAngleBetweenSegments(segment, vertical_vector)
                    cost = Math.abs(Math.abs(angle) - 90)
                }
                break;

            case "parallel":
                {
                    const i = constraint.i
                    const j = constraint.j
                    const segment_1 = [polygon[i], polygon[i + 1]];
                    const segment_2 = [polygon[j], polygon[j + 1]];
                    angle = calculateAngleBetweenSegments(segment_1, segment_2)
                    cost = Math.min(Math.abs(angle), Math.abs(angle - 180)) / angle_tolerance
                }
                break;
            case "orthogonal":
                {
                    const i = constraint.i
                    const j = constraint.j
                    const segment_1 = [polygon[i], polygon[i + 1]];
                    const segment_2 = [polygon[j], polygon[j + 1]];
                    angle = calculateAngleBetweenSegments(segment_1, segment_2)
                    cost = Math.abs(Math.abs(angle) - 90)
                }
                break;
            case "point_line_contact":
                {
                    const i = constraint.i
                    const j = constraint.j
                    distance = calculatePointToLineDistance(polygon[i], polygon[j], polygon[j + 1])
                    cost = distance / distance_tolerance
                }
                break;

            case "point_point_contact":
                {
                    const i = constraint.i
                    const j = constraint.j
                    distance = calculatePointToPointDistance(polygon[i], polygon[j])
                    cost = distance / distance_tolerance;
                }
                break;

                case "equal_length":
                    {
                        const i = constraint.i
                        const j = constraint.j
                        d1=calculatePointToPointDistance(polygon[i], polygon[i + 1])
                        d2=calculatePointToPointDistance(polygon[j], polygon[j + 1])
                        cost = Math.abs(Math.abs(d1-d2))/distance_tolerance
                    }
                    break;              
            default:
                throw "unknown constraint type";

        }
        residuals.push(cost)
    }
    return residuals
}

function enforceConstraints(polygon, constraints) {
    //Possible Acceleration:
    //compute the jacobian of each constraint independently using only points that have an influence on the constraint
    //and then combine them. Use Gaussian BP for solving the sparse linear system?

    const numVertices = polygon.length;
    points_vec = []
    for (let i = 0; i < numVertices; i++) {
        points_vec.push(polygon[i].x)
        points_vec.push(polygon[i].y)
    }
    const residuals_fun = p => {
        new_polygon = []
        for (let i = 0; i < numVertices; i++) {
            new_polygon.push({ x: p[2 * i], y: p[2 * i + 1] })
        }
        // Compute the residuals (distances) for each point
        residuals = constraintsResiduals(new_polygon, constraints)
        return residuals
    };

    // Options for the Levenberg-Marquardt algorithm
    const options = {
        damping: 1.5,  // Adjust as needed
        maxIterations: 100,
        errorTolerance: 1e-6,
    };

    // Perform the optimization

    const result = levenbergMarquardt(residuals_fun, points_vec, options);
    new_polygon = []
    for (let i = 0; i < numVertices; i++) {
        new_polygon.push({ x: result.x_opt[2 * i], y: result.x_opt[2 * i + 1] })
    }
    return new_polygon
}

document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("vectorCanvas");
    const context = canvas.getContext("2d");
    const scaleIndicator = document.getElementById("scaleIndicator");
    const exportButton = document.getElementById("exportButton");
    const controlPointsToggle = document.getElementById("controlPointsToggle");
    const colorSelector = document.getElementById("colorSelector");
    const radiusSelector = document.getElementById("radiusSelector");
    let isDrawing = false;
    let isEditing = false;
    let isTranslating = false;
    let showControlPoints = false;
    let curves = [];
    let colors = [];
    let radii = [];
    let constraints = [];
    let currentConstraints = [];
    let zoomFactor = 1;
    let translateX = 0;
    let translateY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let selectedControlPoint = null;
    let currentColor = "#000000";  // Default color
    let currentRadius = 5;  // Default radius
    // let centerX = 400;
    // let centerY = 300;
    // let radius = 200;
    let tolerance = 3;

    canvas.style.cursor = "crosshair"

    function startDrawing(e) {
        e.preventDefault();
        const x = (e.clientX || e.touches[0].clientX) - canvas.offsetLeft - translateX;
        const y = (e.clientY || e.touches[0].clientY) - canvas.offsetTop - translateY;

        if ((e.button === 0 || e.touches) && !showControlPoints) {  // Left mouse button or touch
            isDrawing = true;
            currentCurve = [];
            addPoint(x, y);
        } else if (e.button === 0 && showControlPoints) {  // Right mouse button and control points are visible
            // Find the nearest control point
            isEditing = true
            selectedControlPoint = findNearestControlPoint(x, y);
            draw();
        } else if (e.button === 2) {  // Right mouse button
            isTranslating = true;
            mouseX = x;
            mouseY = y;
            canvas.style.cursor = "grabbing";
        }
    }

    function findNearestControlPoint(x, y) {
        let nearestControlPoint = null;
        let minDistance = Infinity;

        for (let curve_idx = 0; curve_idx < curves.length; curve_idx++) {
            const curve = curves[curve_idx];
            for (let point_idx = 0; point_idx < curve.length; point_idx += 1) {
                const distance = Math.sqrt((curve[point_idx].x - x) ** 2 + (curve[point_idx].y - y) ** 2);

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestControlPoint = { curve_idx, point_idx };
                }
            }
        }

        return nearestControlPoint;
    }



    function addPoint(x, y) {
        const scaledX = x / zoomFactor;
        const scaledY = y / zoomFactor;
        currentCurve.push({ x: scaledX, y: scaledY });
    }

    function drawCurve(curve, color, radius) {
        if (curve.length < 4) return;
        context.beginPath();
        context.moveTo(curve[0].x, curve[0].y);

        context.strokeStyle = color;
        context.lineWidth = radius * 2;

        for (let i = 1; i < curve.length; i += 1) {
            context.lineTo(
                curve[i].x, curve[i].y
            );
        }

        context.stroke();

        if (showControlPoints) {
            length = curve.length
            for (let i = 0; i < length; i += 1) {
                context.beginPath();
                //selectedControlPoint.curve_idx === curves.indexOf(curve)
                if (selectedControlPoint) {
                    console.log(selectedControlPoint.point_idx);
                }
                selected = (selectedControlPoint && selectedControlPoint.curve_idx === curves.indexOf(curve) && selectedControlPoint.point_idx === i)
                if (selected) {
                    context.strokeStyle = "green";
                    context.arc(curve[i].x, curve[i].y, radius, 0, 2 * Math.PI);
                } else {
                    context.strokeStyle = color;
                    context.arc(curve[i].x, curve[i].y, radius, 0, 2 * Math.PI);
                }
                context.fill();
                context.stroke();
            }
        }
    }

    function draw() {
        context.clearRect(0, 0, canvas.width, canvas.height);

        context.save();

        if (isTranslating) {
            const deltaX = (mouseX - canvas.offsetLeft - translateX) / zoomFactor;
            const deltaY = (mouseY - canvas.offsetTop - translateY) / zoomFactor;

            // Clear the canvas if translating to avoid overlapping
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Apply translation
            context.translate(deltaX, deltaY);
        }

        // Apply scaling
        context.scale(zoomFactor, zoomFactor);

        for (let i = 0; i < curves.length; i++) {
            drawCurve(curves[i], colors[i], radii[i]);
        }
        //context.lineWidth = 1;
        //context.beginPath();
        //context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        //context.stroke();

        if (isDrawing) {
            drawCurve(currentCurve, currentColor, currentRadius);
        }


        context.restore();

        // Update the scale indicator
        scaleIndicator.textContent = `Scale: ${zoomFactor.toFixed(2)}`;
    }

    function handleWheel(e) {
        e.preventDefault();
        const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;
        zoomFactor *= scaleFactor;
        draw();
    }

    function handleMouseMove(x, y) {
        const deltaX = (x - mouseX) / zoomFactor;
        const deltaY = (y - mouseY) / zoomFactor;
        translateX += deltaX;
        translateY += deltaY;
        mouseX = x;
        mouseY = y;
        draw();
    }

    function handleMouseMoveEditing(x, y) {
        const deltaX = (x - mouseX) / zoomFactor;
        const deltaY = (y - mouseY) / zoomFactor;
        mouseX = x;
        mouseY = y;
        point = curves[selectedControlPoint.curve_idx][selectedControlPoint.point_idx]
        point.x = x
        point.y = y
        currentConstraints = constraints[selectedControlPoint.curve_idx]
        curves[selectedControlPoint.curve_idx][selectedControlPoint.point_idx] = point
        curves[selectedControlPoint.curve_idx] = enforceConstraints(curves[selectedControlPoint.curve_idx], currentConstraints)
        draw();
    }

    function stopDrawing() {
        isDrawing = false;

        highestQuality = true;
        // circle = fitCircleToPolyline(currentCurve)
        // centerX = circle.cx;
        // centerY = circle.cy;
        // radius = circle.r;
        //console.log(circle);
        // console.log(centerX);
        currentCurve = simplify(currentCurve, tolerance, highestQuality)
        currentConstraints = detectConstraintsCandidates(currentCurve)
        currentCurve = enforceConstraints(currentCurve, currentConstraints)
        currentCurve = simplify(currentCurve, tolerance, highestQuality)
        currentConstraints = detectConstraintsCandidates(currentCurve)
        currentCurve = enforceConstraints(currentCurve, currentConstraints)
        console.log(currentConstraints)
        if (currentCurve.length > 1) {
            curves.push(currentCurve);
            colors.push(currentColor);
            radii.push(currentRadius);
            constraints.push(currentConstraints)
            currentCurve = [];
        }
        draw();
    }

    function stopTranslating() {
        isTranslating = false;
        canvas.style.cursor = "grab";
    }
    function stopEditing() {
        isEditing = false;
        canvas.style.cursor = "grab";

        currentCurve = curves[selectedControlPoint.curve_idx];
        currentCurve = simplify(currentCurve, tolerance, highestQuality);
        currentConstraints = detectConstraintsCandidates(currentCurve);
        currentCurve = enforceConstraints(currentCurve, currentConstraints);
        curves[selectedControlPoint.curve_idx] = currentCurve;
        constraints[selectedControlPoint.curve_idx] = currentConstraints;
        draw()
    }

    function exportSVG() {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">' +
            curves.map(curve =>
                `<path d="M${curve[0].x} ${curve[0].y} C${curve.slice(1).map(point => `${point.x} ${point.y}`).join(', ')}" fill="none" stroke="${currentColor}" stroke-width="${currentRadius * 2}" />`
            ).join('') +
            '</svg>';

        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'drawing.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function toggleControlPoints() {
        showControlPoints = !showControlPoints;
        if (showControlPoints) {
            canvas.style.cursor = "grabbing";
        }
        else {
            canvas.style.cursor = "crosshair";
        }
        draw();
    }

    // Event listeners for both mouse and touch events
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mouseup", function (e) {
        if ((e.button === 0 || e.touches)) {  // Left mouse button or touch
            if (isDrawing) { stopDrawing(); }
            else if (isEditing) {
                stopEditing();
            }
        } else if (e.button === 2) {  // Right mouse button
            stopTranslating();
        }

    });
    canvas.addEventListener("mousemove", function (e) {
        const x = (e.clientX || e.touches[0].clientX) - canvas.offsetLeft - translateX;
        const y = (e.clientY || e.touches[0].clientY) - canvas.offsetTop - translateY;

        if (isDrawing) {
            addPoint(x, y);
            draw();
        } else if (isTranslating) {
            handleMouseMove(x, y);
        }
        else if (isEditing) {
            handleMouseMoveEditing(x, y);
        }
    });
    canvas.addEventListener("contextmenu", function (e) {
        e.preventDefault();  // Prevent the context menu from appearing on right-click
    });
    canvas.addEventListener("wheel", handleWheel);
    canvas.addEventListener("touchstart", startDrawing);
    canvas.addEventListener("touchend", function (e) {
        if (e.touches.length === 0) {  // No more touches
            stopDrawing();
            stopEditing();
        }
    });
    canvas.addEventListener("touchmove", function (e) {
        const x = e.touches[0].clientX - canvas.offsetLeft - translateX;
        const y = e.touches[0].clientY - canvas.offsetTop - translateY;

        if (isDrawing) {
            addPoint(x, y);
            draw();
        } else if (isTranslating) {
            handleMouseMove(x, y);
        }
    });

    // Event listener for the color selector
    colorSelector.addEventListener("input", function () {
        currentColor = colorSelector.value;
    });

    // Event listener for the radius selector
    radiusSelector.addEventListener("input", function () {
        currentRadius = parseInt(radiusSelector.value, 10);
    });

    // Event listener for the export button
    exportButton.addEventListener("click", exportSVG);

    // Event listener for the control points toggle button
    controlPointsToggle.addEventListener("click", toggleControlPoints);
});