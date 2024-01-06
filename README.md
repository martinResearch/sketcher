# Sketcher

A minimalist 2D vector drawing app with automatic geometric constraints detection.
try it [here](https://martinresearch.github.io/sketcher/)

## Inspirations

* https://github.com/AntonEvmenenko/2d_geometric_constraint_solver
* [https://web-cad.org/sketcher.htm](https://web-cad.org/sketcher.html)

## TODO

* add polygon tool beside free drawing, where the user click on the polygon corners
* add the possibility to undo the last actions.
* add colinear line segments constraints.
* use a smaller tolerance for the point-on-line constraint detection.
* expose the tolerance parameters in the UI.
* add a button next to each constraint to delete the constraint.
* add a mode where each new detected constraint needs to be validated by the user before it gets added to the set of constraints.
* add code to compute the number of degree of freedom based on the constraints Jacobian matrix.
* try to keep the last edited points fixed and remove a few of these these fixed point constraints until there is enough degrees of freedom when move a control point.
* add the possibility to add constraints manually like in [here](https://github.com/AntonEvmenenko/2d_geometric_constraint_solver).
* fix the SVG export.
* fix the problem with canvas scaling and translation 
* accelerate the geometric constraints solver by using the Jacobian sparsity when computing the jacobian with finite differences. We could compute the jacobian of each constraint independently.
* use the jacobian sparsity when solving the linear system in Levenberg-Marquardt. We could use the conjugate gradient algorithm or a gaussian message passing linear system solver.
* add circle arc detection and corresponding constraint (tangency, concentricity).
* add method to detect basic shapes (square, parallelogram, circle, ellipse, arrow etc).
* add symmetry detection.
