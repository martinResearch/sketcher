
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
    const cx = X[0] / 2 ;
    const cy = X[1] / 2 ;
    const r = math.sqrt(4 * X[2] + X[0]**2 + X[1]**2) / 2 ;
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

// Constraints on line segments:
//TODO function that detect candidates for parallel line constraints  //
//TODO function that detect candidates for perpendicular line constraints |-
//TODO function that detect candidates for verticality constraints |
//TODO function that detect candidates for horizontality constraints - 
//TODO function that detect candidates for 45 degrees constraints /
// constrain on points:
//TODO function that detect candidates for point/line contact constraints |*
//TODO function that detect candidates for point/point contact constraints **
//TODO function that detect candidates for segment length equality constraints 

//TODO function to try to impose the constraints using levenberg marquardt
//TODO function to detect symmetry axis on last curve

//Acceleration:
//compute the jacobian of each constraint independently using only points that have an influence on the constraint
//and then combine them. Use Gaussian BP for solving the sparse linear system?

function detect_constraints(polygon) {

    const n = polygon.length;


    angles = []
    for (let i = 0; i < n; i++) {
      const point1 = polygon[i];
      const point2 = polygon[(i + 1) % n]; 
      angle = Math.atan2(point2[1] - point1[1], point2[0] - point1[0]) * 180 / Math.PI;
      // add angle to list of angles
      angles.push(angle);
    }
    // find the most similar angles
    // sort the angles and keep indices
    argosort_angles = argsort(angles)
    // find the difference between successive angles
    angle_differences = []


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
    let isTranslating = false;
    let showControlPoints = false;
    let curves = [];
    let colors = [];
    let radii = [];
    let currentCurve = [];
    let zoomFactor = 1;
    let translateX = 0;
    let translateY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let selectedControlPoint = null;
    let currentColor = "#000000";  // Default color
    let currentRadius = 5;  // Default radius
    let centerX = 400;
    let centerY = 300;
    let radius = 200;
    let tolerance=3;

    function startDrawing(e) {
        e.preventDefault();
        const x = (e.clientX || e.touches[0].clientX) - canvas.offsetLeft - translateX;
        const y = (e.clientY || e.touches[0].clientY) - canvas.offsetTop - translateY;

        if ((e.button === 0 || e.touches) && !showControlPoints) {  // Left mouse button or touch
            isDrawing = true;
            currentCurve = [];
            addPoint(x, y);
        } else if (e.button === 2 && showControlPoints) {  // Right mouse button and control points are visible
            // Find the nearest control point
            selectedControlPoint = findNearestControlPoint(x, y);
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
            for (let point_idx = 1; point_idx < curve.length - 1; point_idx += 3) {
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

        for (let i = 1; i < curve.length ; i += 1) {
            context.lineTo(
                curve[i].x, curve[i].y                        
            );
        }

        context.stroke();

        if (showControlPoints) {
            for (let i = 1; i < curve.length - 1; i += 1) {
                context.beginPath();
                if (selectedControlPoint && selectedControlPoint.curve_idx === curves.indexOf(curve) && selectedControlPoint.point_idx === i) {
                    context.arc(curve[i].x, curve[i].y, radius, 0, 2 * Math.PI);
                    context.fillStyle = "green";  // Draw selected control point in green
                } else {
                    context.arc(curve[i].x, curve[i].y, radius, 0, 2 * Math.PI);
                    context.fillStyle = color;
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
        context.lineWidth = 1;
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        context.stroke();

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

    function stopDrawing() {
        isDrawing = false;
        
        highestQuality = true;
        circle=fitCircleToPolyline(currentCurve)
        centerX=circle.cx;
        centerY=circle.cy;
        radius=circle.r;
        console.log(circle);
        console.log(centerX);
        currentCurve = simplify(currentCurve,tolerance, highestQuality)
        
        if (currentCurve.length > 1) {
            curves.push(currentCurve);
            colors.push(currentColor);
            radii.push(currentRadius);
            currentCurve = [];
        }
        draw();
    }

    function stopTranslating() {
        isTranslating = false;
        canvas.style.cursor = "grab";
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
        draw();
    }

    // Event listeners for both mouse and touch events
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mouseup", function(e) {
        if ((e.button === 0 || e.touches) && !showControlPoints) {  // Left mouse button or touch
            stopDrawing();
        } else if (e.button === 2) {  // Right mouse button
            stopTranslating();
        }
    });
    canvas.addEventListener("mousemove", function(e) {
        const x = (e.clientX || e.touches[0].clientX) - canvas.offsetLeft - translateX;
        const y = (e.clientY || e.touches[0].clientY) - canvas.offsetTop - translateY;

        if (isDrawing) {
            addPoint(x, y);
            draw();
        } else if (isTranslating) {
            handleMouseMove(x, y);
        }
    });
    canvas.addEventListener("contextmenu", function(e) {
        e.preventDefault();  // Prevent the context menu from appearing on right-click
    });
    canvas.addEventListener("wheel", handleWheel);
    canvas.addEventListener("touchstart", startDrawing);
    canvas.addEventListener("touchend", function(e) {
        if (e.touches.length === 0) {  // No more touches
            stopDrawing();
        }
    });
    canvas.addEventListener("touchmove", function(e) {
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
    colorSelector.addEventListener("input", function() {
        currentColor = colorSelector.value;
    });

    // Event listener for the radius selector
    radiusSelector.addEventListener("input", function() {
        currentRadius = parseInt(radiusSelector.value, 10);
    });

    // Event listener for the export button
    exportButton.addEventListener("click", exportSVG);

    // Event listener for the control points toggle button
    controlPointsToggle.addEventListener("click", toggleControlPoints);
});